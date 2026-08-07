"""Audio emotion analysis service."""

import logging
import os
import threading
from typing import Tuple, Optional, Dict, List

logger = logging.getLogger(__name__)

# Lazy imports
_np = None
_sf = None
_torch = None
_AutoModelForAudioClassification = None
_AutoFeatureExtractor = None
_SF_AVAILABLE = None
_HF_AVAILABLE = None


def _get_np():
    global _np
    if _np is None:
        import numpy as np
        _np = np
    return _np


def _get_soundfile():
    global _sf, _SF_AVAILABLE
    if _SF_AVAILABLE is None:
        try:
            import soundfile as sf
            _sf = sf
            _SF_AVAILABLE = True
        except ImportError:
            _sf = None
            _SF_AVAILABLE = False
            logger.warning("soundfile not available – audio loading limited")
    return _sf, _SF_AVAILABLE


def _get_hf():
    global _torch, _AutoModelForAudioClassification, _AutoFeatureExtractor, _HF_AVAILABLE
    if _HF_AVAILABLE is None:
        try:
            import torch
            from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
            _torch = torch
            _AutoModelForAudioClassification = AutoModelForAudioClassification
            _AutoFeatureExtractor = AutoFeatureExtractor
            _HF_AVAILABLE = True
        except ImportError:
            _torch = _AutoModelForAudioClassification = _AutoFeatureExtractor = None
            _HF_AVAILABLE = False
            logger.info("HuggingFace transformers not available for audio")
    return _torch, _AutoModelForAudioClassification, _AutoFeatureExtractor, _HF_AVAILABLE


def _resample_audio(audio: 'np.ndarray', orig_sr: int, target_sr: int) -> 'np.ndarray':
    """Resample audio – tries scipy sinc filter first, falls back to linear interpolation."""
    np = _get_np()
    if orig_sr == target_sr:
        return audio

    # Prefer scipy for better anti-aliasing
    try:
        from scipy.signal import resample_poly
        from math import gcd
        g = gcd(int(orig_sr), int(target_sr))
        return resample_poly(audio, target_sr // g, orig_sr // g).astype(np.float32)
    except Exception:
        pass

    # Linear-interpolation fallback (no extra deps)
    duration      = len(audio) / orig_sr
    target_length = int(duration * target_sr)
    if target_length == 0:
        return np.zeros(1, dtype=np.float32)
    x_old = np.linspace(0, 1, len(audio))
    x_new = np.linspace(0, 1, target_length)
    return np.interp(x_new, x_old, audio).astype(np.float32)


class AudioAnalyzerService:
    """
    Audio emotion analyzer.

    Primary model: ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
      - Wav2Vec2 XLS-R large, fine-tuned on RAVDESS
      - 8 emotions: angry, calm, disgust, fearful, happy, neutral, sad, surprised

    Processing pipeline:
      1. Load & resample to model sample rate (scipy sinc or linear fallback)
      2. RMS normalization + pre-emphasis filter
      3. Sliding-window inference for clips > 5 s (50 % overlap, majority-vote)
      4. Acoustic rule-based fallback when HF model is unavailable

    Audio format support:
      - soundfile: WAV, FLAC, OGG, AIFF, AU …
      - stdlib wave: WAV fallback
      - ffmpeg subprocess: WebM, MP4, MP3, OPUS … (if ffmpeg is installed)
    """

    _LABEL_MAP = {
        'angry':    'angry',
        'calm':     'neutral',
        'disgust':  'disgust',
        'fearful':  'fear',
        'happy':    'happy',
        'neutral':  'neutral',
        'sad':      'sad',
        'surprised':'surprise',
        # abbreviated labels (superb-style fallback)
        'neu': 'neutral',
        'hap': 'happy',
        'ang': 'angry',
        'exc': 'happy',
        # generic full-word labels other models may emit
        'fear':     'fear',
        'surprise': 'surprise',
    }

    def __init__(self):
        self.emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

        self._hf_model_id       = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
        self._hf_model          = None
        self._hf_extractor      = None
        self._hf_id2label: Optional[Dict[int, str]] = None
        self._model_loading     = False
        self._model_load_failed = False
        self._load_lock         = threading.Lock()

        self._silence_threshold = 0.005   # RMS below this → return neutral
        self._target_rms        = 0.10    # Normalize all audio to this RMS level
        self._preemphasis_coef  = 0.97   # Pre-emphasis filter coefficient

    # ------------------------------------------------------------------ #
    #  HF model loading                                                   #
    # ------------------------------------------------------------------ #

    def _ensure_hf_model(self) -> bool:
        if self._model_load_failed:
            return False
        if self._hf_model is not None:
            return True

        torch, AutoModelForAudioClassification, AutoFeatureExtractor, hf_available = _get_hf()
        if not hf_available:
            return False

        with self._load_lock:
            if self._model_load_failed:
                return False
            if self._hf_model is not None:
                return True
            if self._model_loading:
                return False
            self._model_loading = True

        try:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

            try:
                model     = AutoModelForAudioClassification.from_pretrained(
                    self._hf_model_id, local_files_only=True)
                extractor = AutoFeatureExtractor.from_pretrained(
                    self._hf_model_id, local_files_only=True)
                logger.info("Loaded audio model from local cache")
            except Exception:
                logger.info(f"Downloading audio model: {self._hf_model_id}")
                model     = AutoModelForAudioClassification.from_pretrained(self._hf_model_id)
                extractor = AutoFeatureExtractor.from_pretrained(self._hf_model_id)

            model.to(device).eval()

            self._hf_model     = model
            self._hf_extractor = extractor
            self._hf_id2label  = getattr(model.config, "id2label", None)

            logger.info(f"Audio SER model ready on {device}. Labels: {self._hf_id2label}")
            self._model_loading = False
            return True

        except Exception as e:
            logger.warning(f"Failed to load HF audio model: {e}")
            self._model_load_failed = True
            self._model_loading     = False
            return False

    # ------------------------------------------------------------------ #
    #  Audio I/O                                                          #
    # ------------------------------------------------------------------ #

    def _convert_with_ffmpeg(self, audio_path: str, target_sr: int = 16000) -> Optional[Tuple['np.ndarray', int]]:
        """Convert audio to WAV via ffmpeg subprocess (handles WebM, MP4, MP3 …)."""
        import subprocess, tempfile
        np = _get_np()

        # Resolve to absolute path and verify the file exists before passing
        # to subprocess — defence against path traversal.
        audio_path = os.path.realpath(audio_path)
        if not os.path.isfile(audio_path):
            logger.debug(f"ffmpeg: source file does not exist: {audio_path}")
            return None

        # mkstemp creates the file atomically; ffmpeg will overwrite it with -y.
        fd, tmp_wav = tempfile.mkstemp(suffix='.wav')
        os.close(fd)
        try:
            proc = subprocess.run(
                [
                    'ffmpeg', '-y', '-i', audio_path,
                    '-ar', str(target_sr),
                    '-ac', '1',
                    '-f', 'wav', tmp_wav,
                ],
                capture_output=True,
                timeout=30,
            )
            if proc.returncode != 0:
                logger.debug(f"ffmpeg returned non-zero: {proc.stderr.decode()[:200]}")
                return None

            sf, sf_available = _get_soundfile()
            if sf_available:
                audio, sr = sf.read(tmp_wav, dtype='float32')
                if audio.ndim > 1:
                    audio = np.mean(audio, axis=1)
                return audio.astype(np.float32), sr
            return None
        except FileNotFoundError:
            logger.debug("ffmpeg not found in PATH")
            return None
        except Exception as e:
            logger.debug(f"ffmpeg conversion failed: {e}")
            return None
        finally:
            try:
                if os.path.exists(tmp_wav):
                    os.unlink(tmp_wav)
            except Exception:
                pass

    def _load_audio(self, audio_path: str, target_sr: int = 16000) -> Optional[Tuple['np.ndarray', int]]:
        """Load audio file → (float32 mono array, sample_rate)."""
        np = _get_np()
        sf, sf_available = _get_soundfile()

        # 1. soundfile (WAV, FLAC, OGG, AIFF …)
        if sf_available:
            try:
                audio, sr = sf.read(audio_path, dtype='float32')
                if audio.ndim > 1:
                    audio = np.mean(audio, axis=1)
                if sr != target_sr:
                    audio = _resample_audio(audio, sr, target_sr)
                return audio.astype(np.float32), target_sr
            except Exception as e:
                logger.debug(f"soundfile failed ({e}), trying next loader")

        # 2. stdlib wave (WAV-only, no deps)
        try:
            import wave as _wave
            with _wave.open(audio_path, 'rb') as wf:
                n_channels = wf.getnchannels()
                sampwidth  = wf.getsampwidth()
                orig_sr    = wf.getframerate()
                raw        = wf.readframes(wf.getnframes())

            if   sampwidth == 1:
                audio = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
            elif sampwidth == 2:
                audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32)  / 32768.0
            elif sampwidth == 4:
                audio = np.frombuffer(raw, dtype=np.int32).astype(np.float32)  / 2147483648.0
            else:
                logger.warning(f"Unsupported WAV sample width: {sampwidth}")
                return None

            if n_channels > 1:
                audio = audio.reshape(-1, n_channels).mean(axis=1).astype(np.float32)
            if orig_sr != target_sr:
                audio = _resample_audio(audio, orig_sr, target_sr)
            return audio.astype(np.float32), target_sr

        except Exception as e:
            logger.debug(f"stdlib wave failed ({e}), trying ffmpeg")

        # 3. ffmpeg (WebM, MP4, MP3, Opus …)
        result = self._convert_with_ffmpeg(audio_path, target_sr)
        if result is not None:
            return result

        logger.error(f"All audio loaders failed for {audio_path}")
        return None

    # ------------------------------------------------------------------ #
    #  Audio preprocessing                                                #
    # ------------------------------------------------------------------ #

    def _preprocess_audio(self, y: 'np.ndarray') -> 'np.ndarray':
        """
        Normalize and apply pre-emphasis filter.

        Steps:
          1. RMS normalization to a consistent target level (0.10)
          2. Pre-emphasis filter (boosts high frequencies carrying emotion cues)
          3. Clamp to [-1, 1] to avoid clipping artefacts
        """
        np = _get_np()

        # RMS normalization
        rms = float(np.sqrt(np.mean(y ** 2)))
        if rms > 1e-8:
            y = y * (self._target_rms / rms)

        # Pre-emphasis: y[n] = x[n] - α * x[n-1]
        y = np.concatenate([[y[0]], y[1:] - self._preemphasis_coef * y[:-1]])

        # Hard-clip to valid range
        y = np.clip(y, -1.0, 1.0)
        return y.astype(np.float32)

    # ------------------------------------------------------------------ #
    #  HF inference helpers                                               #
    # ------------------------------------------------------------------ #

    def _infer_chunk(self, y: 'np.ndarray', sampling_rate: int) -> Tuple[str, float, Dict[str, float]]:
        """Run the HF model on a single audio chunk; return (emotion, confidence, all_scores).

        Temperature scaling (T=1.3) reduces overconfidence from RAVDESS-trained models
        when applied to naturalistic speech.
        """
        torch, _, __, ___ = _get_hf()

        inputs = self._hf_extractor(
            y,
            sampling_rate=sampling_rate,
            return_tensors="pt",
            padding=True,
        )
        device = next(self._hf_model.parameters()).device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = self._hf_model(**inputs).logits
            # Temperature scaling (T=1.3) to calibrate overconfident predictions
            probs  = torch.softmax(logits / 1.3, dim=-1).squeeze(0)

        id2label = self._hf_id2label or {}

        # Build full scores dict merging model labels → 7 target emotions
        raw_scores: Dict[str, float] = {}
        for idx, prob in enumerate(probs.tolist()):
            raw_label = id2label.get(idx, str(idx)).lower()
            mapped    = self._LABEL_MAP.get(raw_label, 'neutral')
            raw_scores[mapped] = raw_scores.get(mapped, 0.0) + prob

        # Normalize over the 7 canonical emotions
        total = sum(raw_scores.get(e, 0.0) for e in self.emotions) or 1.0
        scores = {e: raw_scores.get(e, 0.0) / total for e in self.emotions}

        best_emotion = max(scores, key=scores.__getitem__)
        confidence   = scores[best_emotion]

        logger.debug(f"chunk SER: {best_emotion} ({confidence:.3f}) | {scores}")
        return best_emotion, confidence, scores

    def _sliding_window_inference(
        self,
        y: 'np.ndarray',
        sampling_rate: int,
        window_size: int,
    ) -> Tuple[str, float, Dict[str, float]]:
        """
        Analyze a long recording with overlapping windows.

        Uses 50 % overlap; accumulates the full probability vector across all windows
        and returns the emotion with the highest average score.
        """
        hop_size = window_size // 2

        # Accumulate full probability vectors (not just winner-takes-all)
        emotion_sums: Dict[str, float] = {e: 0.0 for e in self.emotions}
        window_count = 0
        max_windows  = 8   # Cap at 8 windows (~20 s of audio with 2.5 s hop)

        for start in range(0, len(y) - window_size + 1, hop_size):
            chunk = y[start : start + window_size]
            _, _, chunk_scores = self._infer_chunk(chunk, sampling_rate)
            for e, s in chunk_scores.items():
                emotion_sums[e] += s
            window_count += 1
            if window_count >= max_windows:
                break

        if window_count == 0:
            neutral_scores = {e: (1.0 if e == 'neutral' else 0.0) for e in self.emotions}
            return 'neutral', 0.50, neutral_scores

        # Average across windows then re-normalize
        avg_scores = {e: emotion_sums[e] / window_count for e in self.emotions}
        total = sum(avg_scores.values()) or 1.0
        avg_scores = {e: avg_scores[e] / total for e in self.emotions}

        best_emotion = max(avg_scores, key=avg_scores.__getitem__)
        confidence   = min(avg_scores[best_emotion], 0.95)
        avg_scores[best_emotion] = confidence  # keep in sync

        logger.debug(
            f"Sliding-window ({window_count} chunks): {avg_scores} → {best_emotion} ({confidence:.3f})"
        )
        return best_emotion, confidence, avg_scores

    # ------------------------------------------------------------------ #
    #  HF inference                                                       #
    # ------------------------------------------------------------------ #

    def _predict_with_hf(self, audio_path: str) -> Optional[Tuple[str, float, Dict[str, float]]]:
        """Run HF SER pipeline; returns (emotion, confidence, scores) or None on failure."""
        if not self._ensure_hf_model():
            return None

        try:
            np    = _get_np()

            sampling_rate = getattr(self._hf_extractor, "sampling_rate", 16000)
            result        = self._load_audio(audio_path, target_sr=sampling_rate)
            if result is None:
                return None

            y, sr = result
            if y is None or len(y) == 0:
                return None

            # Skip truly silent files
            rms = float(np.sqrt(np.mean(y ** 2)))
            if rms < self._silence_threshold:
                logger.info("Audio is (near) silent – returning neutral")
                silence_scores = {e: (0.60 if e == 'neutral' else 0.0) for e in self.emotions}
                # Normalize
                total = sum(silence_scores.values()) or 1.0
                silence_scores = {e: v / total for e, v in silence_scores.items()}
                return 'neutral', 0.60, silence_scores

            # Normalize + pre-emphasis
            y = self._preprocess_audio(y)

            # Cap to 30 s
            max_samples = int(sampling_rate * 30.0)
            if len(y) > max_samples:
                y = y[:max_samples]

            # Sliding window for clips > 5 s; single pass for shorter clips
            window_size = int(sampling_rate * 5.0)
            if len(y) > window_size:
                emotion, confidence, scores = self._sliding_window_inference(y, sampling_rate, window_size)
            else:
                emotion, confidence, scores = self._infer_chunk(y, sampling_rate)

            logger.debug(f"HF SER final: {emotion} ({confidence:.3f})")
            return emotion, confidence, scores

        except Exception as e:
            logger.warning(f"HF prediction failed: {e}", exc_info=True)
            return None

    # ------------------------------------------------------------------ #
    #  Acoustic fallback                                                  #
    # ------------------------------------------------------------------ #

    def _predict_with_acoustics(self, audio_path: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Lightweight numpy-only acoustic rule engine.
        Used only when the HF model is unavailable.
        Returns (emotion, confidence, scores_dict) with all 7 emotions.
        """
        np = _get_np()

        def _make_scores(top_emotion: str, top_conf: float) -> Dict[str, float]:
            """Distribute remaining probability across other emotions."""
            remaining = max(0.0, 1.0 - top_conf)
            others = [e for e in self.emotions if e != top_emotion]
            per_other = remaining / len(others) if others else 0.0
            return {e: (top_conf if e == top_emotion else per_other) for e in self.emotions}

        result = self._load_audio(audio_path, target_sr=16000)
        if result is None:
            return 'neutral', 0.50, _make_scores('neutral', 0.50)

        y, sr = result
        if y is None or len(y) == 0:
            return 'neutral', 0.50, _make_scores('neutral', 0.50)

        try:
            rms = float(np.sqrt(np.mean(y ** 2)))
            if rms < self._silence_threshold:
                scores = _make_scores('neutral', 0.60)
                return 'neutral', 0.60, scores

            # Zero-crossing rate
            zcr = float(np.sum(np.abs(np.diff(np.sign(y)))) / (2 * len(y)))

            # Spectral centroid
            fft   = np.abs(np.fft.rfft(y))
            freqs = np.fft.rfftfreq(len(y), 1 / sr)
            sc    = float(np.sum(freqs * fft) / (np.sum(fft) + 1e-10))

            # Temporal energy variance (50 ms chunks)
            chunk = sr // 20
            if len(y) >= chunk * 4:
                rms_chunks = [float(np.sqrt(np.mean(y[i:i+chunk] ** 2)))
                              for i in range(0, len(y) - chunk, chunk)]
                mean_e = float(np.mean(rms_chunks)) + 1e-10
                ev     = float(np.var(rms_chunks)) / mean_e
            else:
                ev = 0.0

            # Normalise to [0, 1]
            rms_n = min(rms / 0.12, 1.0)
            zcr_n = min(zcr * 6,    1.0)
            sc_n  = min(sc / 3000,  1.0)

            logger.debug(f"Acoustics – rms={rms_n:.2f} zcr={zcr_n:.2f} sc={sc_n:.2f} ev={ev:.3f}")

            BASE = 0.55

            if rms_n > 0.75 and sc_n > 0.60 and zcr_n > 0.45:
                conf = min(BASE + 0.20, 0.80)
                return 'angry',    conf, _make_scores('angry',    conf)
            if rms_n > 0.55 and sc_n > 0.65:
                conf = min(BASE + 0.10 + (0.08 if ev > 0.08 else 0), 0.75)
                return 'surprise', conf, _make_scores('surprise', conf)
            if rms_n < 0.30 and sc_n < 0.40 and ev < 0.08:
                conf = min(BASE + 0.15, 0.75)
                return 'sad',      conf, _make_scores('sad',      conf)
            if zcr_n > 0.50 and ev > 0.12 and 0.25 < rms_n < 0.60:
                conf = min(BASE + 0.05, 0.65)
                return 'fear',     conf, _make_scores('fear',     conf)
            if 0.35 < rms_n < 0.75 and 0.30 < sc_n < 0.65 and ev > 0.05:
                conf = min(BASE + 0.12, 0.75)
                return 'happy',    conf, _make_scores('happy',    conf)
            if 0.25 < rms_n < 0.45 and 0.25 < sc_n < 0.45 and ev < 0.10:
                conf = min(BASE + 0.10, 0.72)
                return 'neutral',  conf, _make_scores('neutral',  conf)

            if rms_n > 0.50:
                return 'happy',   BASE, _make_scores('happy',   BASE)
            if rms_n > 0.25:
                return 'neutral', BASE, _make_scores('neutral', BASE)
            return 'sad', BASE - 0.05, _make_scores('sad', BASE - 0.05)

        except Exception as e:
            logger.error(f"Acoustic analysis failed: {e}")
            return 'neutral', 0.50, _make_scores('neutral', 0.50)

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def analyze(self, audio_path: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Analyze an audio file for emotion.

        Returns:
            (emotion, confidence, scores)
            - emotion:    top detected emotion label
            - confidence: confidence in [0, 1]
            - scores:     dict mapping all 7 emotions to their probabilities (sums to ~1)
        """
        fallback_scores: Dict[str, float] = {e: (1.0 if e == 'neutral' else 0.0) for e in self.emotions}
        if not audio_path or not os.path.exists(audio_path):
            return 'neutral', 0.50, fallback_scores

        result = self._predict_with_hf(audio_path)
        if result is not None:
            logger.info(f"HF SER result: {result[0]} ({result[1]:.2f})")
            return result

        logger.info("Falling back to acoustic analysis")
        result = self._predict_with_acoustics(audio_path)
        logger.info(f"Acoustic result: {result[0]} ({result[1]:.2f})")
        return result

    def get_status(self) -> Dict:
        _, _, _, hf_available = _get_hf()
        _, sf_available       = _get_soundfile()
        device = None
        if self._hf_model is not None:
            try:
                device = str(next(self._hf_model.parameters()).device)
            except Exception:
                pass
        return {
            "hf_libs_available":   hf_available,
            "hf_model_id":         self._hf_model_id,
            "hf_loaded":           self._hf_model is not None,
            "device":              device,
            "soundfile_available": sf_available,
            "emotions_supported":  self.emotions,
        }
