"""Vision-based emotion analysis service (face detection + emotion recognition)."""

import logging
from typing import List, Dict, Tuple
from collections import deque

logger = logging.getLogger(__name__)

# Lazy imports
_cv2 = None
_np  = None
_DeepFace = None
_DEEPFACE_AVAILABLE = None


def _get_cv2():
    global _cv2
    if _cv2 is None:
        import cv2
        _cv2 = cv2
    return _cv2


def _get_np():
    global _np
    if _np is None:
        import numpy as np
        _np = np
    return _np


def _get_deepface():
    global _DeepFace, _DEEPFACE_AVAILABLE
    if _DEEPFACE_AVAILABLE is None:
        try:
            from deepface import DeepFace
            _DeepFace = DeepFace
            _DEEPFACE_AVAILABLE = True
        except ImportError:
            _DeepFace = None
            _DEEPFACE_AVAILABLE = False
            logger.warning("DeepFace not available – vision analysis disabled")
    return _DeepFace, _DEEPFACE_AVAILABLE


# Preferred backends in order. mediapipe is more accurate than opencv for most
# webcam conditions; opencv is the fastest reliable fallback.
_DETECTOR_BACKENDS = ["mediapipe", "opencv"]


def _run_deepface(frame, backend: str) -> list:
    """Call DeepFace.analyze; raises on failure."""
    DeepFace, _ = _get_deepface()
    raw = DeepFace.analyze(
        frame,
        actions=["emotion"],
        enforce_detection=False,
        detector_backend=backend,
        align=True,
        silent=True,
    )
    return raw if isinstance(raw, list) else [raw]


class EmotionSmoother:
    """
    Temporal smoother that averages per-emotion probabilities over a short
    window. This gives much more stable output than just taking the latest frame.
    """

    def __init__(self, window: int = 3):
        # Stores full probability dicts
        self._history: deque = deque(maxlen=max(1, window))

    def update(self, emotion_probs: Dict[str, float]) -> Tuple[str, float]:
        """
        Add a new probability dict and return (smoothed_emotion, confidence).

        Args:
            emotion_probs: {emotion_name: score_0_to_1}
        """
        self._history.append(emotion_probs)

        # Average probabilities across the window
        averaged: Dict[str, float] = {}
        for probs in self._history:
            for emo, score in probs.items():
                averaged[emo] = averaged.get(emo, 0.0) + score
        n = len(self._history)
        if n == 0 or not averaged:
            return 'neutral', 0.0
        averaged = {k: v / n for k, v in averaged.items()}

        best_emotion = max(averaged, key=averaged.__getitem__)
        confidence   = min(1.0, averaged[best_emotion])
        return best_emotion, confidence


class VisionAnalyzerService:
    """
    Vision-based emotion analysis using DeepFace.

    Strategy:
      1. Try mediapipe backend first (more accurate, handles partial/tilted faces).
      2. Fall back to opencv if mediapipe fails.
      3. Apply temporal smoothing over a 3-frame window for stability.
      4. Confidence is derived from DeepFace's own per-emotion scores (0-100 → 0-1).
    """

    def __init__(self, settings=None):
        smoothing_window = 3
        if settings:
            try:
                smoothing_window = max(1, int(settings.get("emotion_smoothing", 3)))
            except Exception:
                pass
        self._smoother = EmotionSmoother(window=smoothing_window)

    def _parse_deepface_result(self, r: dict) -> Dict[str, float]:
        """
        Extract a normalised probability dict from a single DeepFace result dict.
        DeepFace returns scores as percentages (0–100); we convert to 0–1.
        """
        raw_emotions = r.get("emotion", {})
        if not raw_emotions:
            return {}

        # Convert percentages → fractions
        probs = {k: v / 100.0 for k, v in raw_emotions.items()}

        # Ensure they sum to ~1 (DeepFace already guarantees this, but be safe)
        total = sum(probs.values()) + 1e-10
        return {k: v / total for k, v in probs.items()}

    def analyze_frame(self, frame) -> List[Dict]:
        """
        Analyze a video frame for faces and emotions.

        Args:
            frame: Input frame (BGR numpy array from OpenCV).

        Returns:
            List of dicts: [{'emotion': str, 'confidence': float}, ...]
            One dict per detected face.
        """
        if frame is None or frame.size == 0:
            return []

        _, available = _get_deepface()
        if not available:
            return []

        cv2 = _get_cv2()

        # Mild preprocessing: equalise histogram on luminance channel for
        # better detection in low-light / high-contrast conditions.
        try:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_ch, a_ch, b_ch = cv2.split(lab)
            clahe   = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l_eq    = clahe.apply(l_ch)
            frame   = cv2.cvtColor(cv2.merge([l_eq, a_ch, b_ch]), cv2.COLOR_LAB2BGR)
        except Exception:
            pass  # use original frame if preprocessing fails

        # Try each backend in priority order
        raw_results = None
        for backend in _DETECTOR_BACKENDS:
            try:
                raw_results = _run_deepface(frame, backend)
                if raw_results:
                    logger.info(f"DeepFace succeeded with backend={backend}, faces={len(raw_results)}")
                    break
            except Exception as e:
                logger.info(f"Backend {backend} failed: {e}")

        if not raw_results:
            logger.info("No faces detected by any backend")
            return []

        output = []
        for r in raw_results:
            probs = self._parse_deepface_result(r)
            if not probs:
                continue

            # Smooth across frames and get dominant emotion
            emotion, confidence = self._smoother.update(probs)

            # Only return results with a minimum confidence so we don't flood
            # the UI with weak detections.
            if confidence < 0.10:
                continue

            output.append({"emotion": emotion, "confidence": confidence})

        return output
