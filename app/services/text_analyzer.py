"""Text emotion analysis service."""

import re
import logging
from typing import Tuple, Dict, List, Optional

# Pre-compiled regex for token extraction — avoids recompilation on every call.
_WORD_RE = re.compile(r"[\w']+")

logger = logging.getLogger(__name__)

try:
    from transformers import pipeline
    import torch
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    logger.warning("transformers library not available, using fallback lexicon-based analysis")


class TextAnalyzerService:
    """
    Text emotion analyzer using Hugging Face transformer model with lexicon-based fallback.

    Primary model: j-hartmann/emotion-english-distilroberta-base
      - Trained on 6 diverse datasets, distilled RoBERTa
      - Outputs 7 emotions natively: anger, disgust, fear, joy, neutral, sadness, surprise
      - ~82% accuracy on test benchmarks

    Supports 7 emotions: happy, sad, angry, fear, disgust, surprise, neutral
    """

    # Maps model labels → our canonical emotion names
    _LABEL_MAP = {
        'anger':   'angry',
        'disgust': 'disgust',
        'fear':    'fear',
        'joy':     'happy',
        'neutral': 'neutral',
        'sadness': 'sad',
        'surprise':'surprise',
    }

    def __init__(self):
        self._hf_pipe = None
        self.emotions = ['happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral']
        self._model_name = "j-hartmann/emotion-english-distilroberta-base"

        # Lexicon for fallback analysis
        self.lexicon: Dict[str, set] = {
            'happy':   {'happy', 'joy', 'joyful', 'glad', 'excited', 'love', 'lovely', 'awesome',
                        'great', 'amazing', 'fantastic', 'wonderful', 'delighted', 'pleased',
                        'cheerful', 'proud', 'grateful', 'content', 'elated'},
            'sad':     {'sad', 'unhappy', 'down', 'depressed', 'cry', 'crying', 'tears',
                        'heartbroken', 'miserable', 'sorrow', 'grief', 'lonely', 'hurt',
                        'disappointed', 'hopeless', 'gloomy', 'melancholy'},
            'angry':   {'angry', 'furious', 'annoyed', 'irritated', 'rage', 'mad', 'livid',
                        'outraged', 'resentful', 'hate', 'frustrated', 'offended', 'bitter',
                        'hostile', 'infuriated'},
            'fear':    {'afraid', 'scared', 'terrified', 'anxious', 'anxiety', 'worried', 'worry',
                        'panic', 'nervous', 'fear', 'fearful', 'frightened', 'concerned',
                        'dread', 'terror', 'phobia'},
            'disgust': {'disgust', 'disgusted', 'disgusting', 'gross', 'nasty', 'revolting',
                        'repulsed', 'sickened', 'vomit', 'yuck', 'repulsive', 'loathe',
                        'loathing', 'nausea'},
            'surprise':{'surprise', 'surprised', 'surprising', 'astonished', 'wow', 'shocked',
                        'unbelievable', 'unexpected', 'amazed', 'omg', 'astounding', 'startled'},
        }

        self.emoji_map = {
            ':)': 'happy', '😊': 'happy', '❤️': 'happy', '😄': 'happy', '🥰': 'happy',
            ':(': 'sad',   '😢': 'sad',   '😭': 'sad',
            '>:(': 'angry','😠': 'angry', '😡': 'angry',
            ':o': 'surprise','😮': 'surprise','😲': 'surprise',
            '🤢': 'disgust','🤮': 'disgust',
            '😨': 'fear',  '😱': 'fear',
        }

        self.negations   = {'not', 'no', 'never', 'dont', "don't", 'doesnt', "doesn't",
                            'didnt', "didn't", 'cant', "can't", 'wont', "won't", 'isnt', "isn't"}
        self.intensifiers = {'very': 1.5, 'extremely': 1.8, 'so': 1.4, 'really': 1.3,
                             'super': 1.5, 'incredibly': 1.7, 'absolutely': 1.6}
        self.opposite    = {'happy': 'sad', 'sad': 'happy', 'angry': 'happy', 'fear': 'happy',
                            'disgust': 'happy', 'surprise': 'neutral'}

    # ------------------------------------------------------------------ #
    #  Transformer model                                                   #
    # ------------------------------------------------------------------ #

    def _ensure_hf_model(self) -> bool:
        """Lazy-load the HuggingFace model (thread-safe due to GIL on CPython)."""
        if not HF_AVAILABLE:
            return False
        if self._hf_pipe is not None:
            return True
        try:
            device = 0 if torch.cuda.is_available() else -1
            self._hf_pipe = pipeline(
                "text-classification",
                model=self._model_name,
                top_k=None,        # return full probability distribution
                device=device,
                truncation=True,
                max_length=512,
            )
            logger.info(f"Loaded transformer model: {self._model_name}")
            return True
        except Exception as e:
            logger.warning(f"Failed to load transformer model: {e}")
            return False

    def _analyze_with_transformer(self, text: str) -> Optional[Tuple[str, float, Dict[str, float]]]:
        """Return (emotion, confidence, all_scores) using the HF pipeline, or None on failure."""
        if not self._ensure_hf_model():
            return None
        try:
            outputs = self._hf_pipe(text[:512])
            # outputs is a list of lists when top_k=None: [[{label, score}, ...]]
            scores = outputs[0] if isinstance(outputs[0], list) else outputs

            # Build a dict of canonical_emotion → score
            prob_map: Dict[str, float] = {e: 0.0 for e in self.emotions}
            for item in scores:
                raw_label = item.get('label', '').lower()
                score     = float(item.get('score', 0.0))
                canonical = self._LABEL_MAP.get(raw_label)
                if canonical:
                    prob_map[canonical] = prob_map.get(canonical, 0.0) + score

            if not any(prob_map.values()):
                return None

            best_emotion = max(prob_map, key=prob_map.__getitem__)
            confidence   = min(1.0, max(0.0, prob_map[best_emotion]))
            return best_emotion, confidence, prob_map

        except Exception as e:
            logger.error(f"Transformer analysis failed: {e}")
            return None

    # ------------------------------------------------------------------ #
    #  Lexicon fallback                                                    #
    # ------------------------------------------------------------------ #

    def _analyze_with_lexicon(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        """Rule-based lexicon analysis used when the transformer is unavailable."""
        text_lower = text.lower()
        scores = {k: 0.0 for k in self.lexicon}

        # Emoji signals
        for emoji, emotion in self.emoji_map.items():
            if emoji in text:
                scores[emotion] += 1.0

        # Token-level scoring
        tokens = _WORD_RE.findall(text_lower)
        for i, token in enumerate(tokens):
            base_emotion = next(
                (emo for emo, words in self.lexicon.items() if token in words), None
            )
            if base_emotion is None:
                continue

            weight = 1.0
            window = tokens[max(0, i - 3):i]
            for w in window:
                if w in self.intensifiers:
                    weight *= self.intensifiers[w]
                if w in self.negations:
                    opp = self.opposite.get(base_emotion, 'neutral')
                    if opp != 'neutral':
                        scores[opp] += 0.8 * weight
                    weight *= 0.1
            scores[base_emotion] += weight

        total = sum(scores.values())
        if total <= 0.05:
            all_scores = {e: 0.0 for e in self.emotions}
            all_scores['neutral'] = 1.0
            return 'neutral', 0.5, all_scores

        probs = {k: v / total for k, v in scores.items()}
        # Include neutral (not in lexicon) with remaining probability mass
        all_scores = {e: probs.get(e, 0.0) for e in self.emotions}
        best_emotion = max(all_scores, key=all_scores.__getitem__)

        # Confidence scales with two factors:
        #   dominance  — proportion of evidence pointing at the top emotion (0–1)
        #   evidence   — total matched word weight, saturates at ~4 words
        # This avoids the flat 90% ceiling and gives realistic spread (40–85%).
        dominance = all_scores[best_emotion]
        evidence  = min(1.0, total / 4.0)
        confidence = round(0.25 + (dominance * 0.35) + (evidence * 0.25), 2)
        confidence = min(0.85, max(0.20, confidence))
        return best_emotion, confidence, all_scores

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def analyze(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Analyze text for emotion.

        Args:
            text: Input text to analyze

        Returns:
            tuple: (emotion, confidence, scores)  where confidence ∈ [0, 1]
                   and scores maps each of the 7 emotions to its probability.
        """
        text = (text or '').strip()
        if not text:
            all_scores = {e: 0.0 for e in self.emotions}
            all_scores['neutral'] = 1.0
            return 'neutral', 0.0, all_scores

        result = self._analyze_with_transformer(text)
        if result is not None:
            return result

        return self._analyze_with_lexicon(text)
