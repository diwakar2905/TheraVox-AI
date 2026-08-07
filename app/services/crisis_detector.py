"""
Crisis Risk Detection Service.

Real-time detection of high-risk language (self-harm, suicidal ideation, abuse,
severe distress) with graduated severity levels and escalation workflows.

Severity levels:
  - LOW       : mild distress, passive negative ideation
  - MODERATE  : significant distress, indirect references to self-harm
  - HIGH      : explicit self-harm / suicidal language, immediate danger signals
  - CRITICAL  : imminent threat language ("I'm going to end it now")
"""

import re
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


class CrisisSeverity(str, Enum):
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class CrisisSignal:
    """A single matched risk signal found in the text."""
    phrase: str
    category: str          # e.g. 'suicidal_ideation', 'self_harm', 'abuse', 'severe_distress'
    severity: CrisisSeverity
    context_snippet: str   # surrounding words for audit


@dataclass
class CrisisAssessment:
    """Result of a crisis risk scan."""
    flagged: bool
    severity: CrisisSeverity
    signals: List[CrisisSignal] = field(default_factory=list)
    recommended_action: str = ""
    crisis_resources: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "flagged": self.flagged,
            "severity": self.severity.value,
            "signals": [
                {
                    "phrase": s.phrase,
                    "category": s.category,
                    "severity": s.severity.value,
                }
                for s in self.signals
            ],
            "recommended_action": self.recommended_action,
            "crisis_resources": self.crisis_resources,
        }


# ---------------------------------------------------------------------------
# Crisis pattern database — categories × severity
# ---------------------------------------------------------------------------

# Each tuple: (regex_pattern, category, severity)
_CRISIS_PATTERNS: List[Tuple[str, str, CrisisSeverity]] = [
    # ── CRITICAL — imminent threat ──
    (r"\b(i('?m| am) going to (kill|end|hurt) (myself|my life))\b", "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(i('?ve| have) decided to (die|end it|kill myself))\b",   "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(goodbye\s+(everyone|world|forever))\b",                   "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(this is my (suicide|last) note)\b",                       "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(tonight i (will|am going to) (die|end it))\b",            "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(i('?ve| have) (written|left) (a )?(suicide )?note)\b",   "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(i (have|got) (a )?(plan|method) to (kill|end))\b",       "suicidal_ideation", CrisisSeverity.CRITICAL),
    (r"\b(no one will miss me)\b",                                  "suicidal_ideation", CrisisSeverity.CRITICAL),

    # ── HIGH — explicit self-harm / suicidal language ──
    (r"\b(want(ing)? to (kill|end|hurt) myself)\b",                "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(i want to die)\b",                                       "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(wish i (was|were) dead)\b",                              "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(rather (be )?dead)\b",                                   "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(kill(ing)? myself)\b",                                   "self_harm", CrisisSeverity.HIGH),
    (r"\b(cut(ting)? myself)\b",                                   "self_harm", CrisisSeverity.HIGH),
    (r"\b(harm(ing)? myself)\b",                                   "self_harm", CrisisSeverity.HIGH),
    (r"\b(suicid(e|al))\b",                                        "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(self[- ]?harm)\b",                                       "self_harm", CrisisSeverity.HIGH),
    (r"\b(overdose)\b",                                            "self_harm", CrisisSeverity.HIGH),
    (r"\b(slit(ting)? my wrist)\b",                                "self_harm", CrisisSeverity.HIGH),
    (r"\b(end(ing)? my life)\b",                                   "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(don'?t want to (live|be alive|exist))\b",                "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(better off (dead|without me))\b",                        "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(no reason to (live|go on|keep going))\b",                "suicidal_ideation", CrisisSeverity.HIGH),
    (r"\b(jump(ing)? off)\b",                                      "self_harm", CrisisSeverity.HIGH),
    (r"\b(hang(ing)? myself)\b",                                   "self_harm", CrisisSeverity.HIGH),

    # ── MODERATE — significant distress / indirect self-harm references ──
    (r"\b(want(ing)? to disappear)\b",                             "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(can'?t (take|do) (it|this) anymore)\b",                  "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(no (point|purpose) (in|to) (living|life|anything))\b",   "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(everything is hopeless)\b",                               "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(i (feel|am) (so )?(hopeless|worthless|useless))\b",      "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(nobody (cares|loves me|would notice))\b",                "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(the world.{0,15}better.{0,10}without me)\b",            "suicidal_ideation", CrisisSeverity.MODERATE),
    (r"\b(i('?m| am) (a )?burden)\b",                              "severe_distress", CrisisSeverity.MODERATE),
    (r"\b(someone (is )?(hurting|abusing|hitting|beating) me)\b",  "abuse", CrisisSeverity.MODERATE),
    (r"\b(being (abused|beaten|assaulted|molested))\b",            "abuse", CrisisSeverity.MODERATE),
    (r"\b(trapped.{0,15}(in|with).{0,20}(relationship|partner|home))\b", "abuse", CrisisSeverity.MODERATE),
    (r"\b(i('?m| am) (being )?stalked)\b",                         "abuse", CrisisSeverity.MODERATE),
    (r"\b(i('?m| am) in (an )?abusive)\b",                         "abuse", CrisisSeverity.MODERATE),

    # ── LOW — mild distress, passive ideation ──
    (r"\b(i('?m| am) (so )?(depressed|broken|empty|numb))\b",     "distress", CrisisSeverity.LOW),
    (r"\b(life (feels? )?(meaningless|pointless|empty))\b",        "distress", CrisisSeverity.LOW),
    (r"\b(i (can'?t|don'?t) (cope|go on|handle))\b",              "distress", CrisisSeverity.LOW),
    (r"\b(everything (is )?(falling apart|too much))\b",           "distress", CrisisSeverity.LOW),
    (r"\b(i('?m| am) (all )?alone)\b",                             "distress", CrisisSeverity.LOW),
    (r"\b(i (feel|am) (so )?(alone|lonely|isolated))\b",          "distress", CrisisSeverity.LOW),
    (r"\b(crying (all|every) (day|night))\b",                      "distress", CrisisSeverity.LOW),
    (r"\b(i hate (myself|my life))\b",                             "distress", CrisisSeverity.LOW),
    (r"\b(can'?t stop (crying|shaking|panicking))\b",             "distress", CrisisSeverity.LOW),
]

# Pre-compile for performance
_COMPILED_PATTERNS = [
    (re.compile(pattern, re.IGNORECASE), category, severity)
    for pattern, category, severity in _CRISIS_PATTERNS
]


# ---------------------------------------------------------------------------
# Crisis resources database
# ---------------------------------------------------------------------------

CRISIS_RESOURCES = [
    {
        "name": "AASRA (India)",
        "phone": "9152987821",
        "description": "24/7 crisis helpline",
        "region": "India",
    },
    {
        "name": "Tele Manas (India)",
        "phone": "1800-891-4416",
        "description": "Government mental health helpline (toll-free)",
        "region": "India",
    },
    {
        "name": "Vandrevala Foundation (India)",
        "phone": "1860-2662-345",
        "description": "24/7 mental health support",
        "region": "India",
    },
    {
        "name": "988 Suicide & Crisis Lifeline (USA)",
        "phone": "988",
        "description": "Call or text 988 — 24/7 support",
        "region": "USA",
    },
    {
        "name": "Crisis Text Line (USA)",
        "phone": "Text HOME to 741741",
        "description": "Free 24/7 text-based crisis support",
        "region": "USA",
    },
    {
        "name": "International Association for Suicide Prevention",
        "phone": "https://www.iasp.info/resources/Crisis_Centres/",
        "description": "Find a crisis centre near you",
        "region": "International",
    },
    {
        "name": "Find A Helpline",
        "phone": "https://findahelpline.com",
        "description": "Global directory of mental health helplines",
        "region": "International",
    },
]


# ---------------------------------------------------------------------------
# Recommended actions per severity
# ---------------------------------------------------------------------------

_ACTIONS = {
    CrisisSeverity.NONE: "",
    CrisisSeverity.LOW: (
        "The message contains signs of distress. Consider offering empathetic support "
        "and gently suggesting professional help or wellness resources."
    ),
    CrisisSeverity.MODERATE: (
        "Significant distress detected. Display crisis resources prominently. "
        "Encourage the user to reach out to a trusted person or helpline."
    ),
    CrisisSeverity.HIGH: (
        "High-risk language detected. Immediately show crisis hotline information. "
        "Recommend speaking with a mental health professional as soon as possible."
    ),
    CrisisSeverity.CRITICAL: (
        "IMMINENT RISK DETECTED. Display emergency resources immediately. "
        "Strongly encourage calling a crisis hotline or emergency services (112 / 911) right now. "
        "If configured, notify the user's emergency contact and therapist."
    ),
}


# ---------------------------------------------------------------------------
# Severity ordering helper
# ---------------------------------------------------------------------------

_SEVERITY_ORDER = {
    CrisisSeverity.NONE: 0,
    CrisisSeverity.LOW: 1,
    CrisisSeverity.MODERATE: 2,
    CrisisSeverity.HIGH: 3,
    CrisisSeverity.CRITICAL: 4,
}


def _max_severity(a: CrisisSeverity, b: CrisisSeverity) -> CrisisSeverity:
    return a if _SEVERITY_ORDER[a] >= _SEVERITY_ORDER[b] else b


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------

class CrisisDetectorService:
    """
    Scans text for crisis-level language and returns a structured assessment.

    Thread-safe. Stateless (no model loading), so it can be used as a singleton.
    """

    def __init__(self):
        self.patterns = _COMPILED_PATTERNS
        self.resources = CRISIS_RESOURCES

    def _extract_context(self, text: str, match: re.Match, window: int = 40) -> str:
        """Return a context snippet around the matched region."""
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        snippet = text[start:end].strip()
        if start > 0:
            snippet = "…" + snippet
        if end < len(text):
            snippet = snippet + "…"
        return snippet

    def analyze(self, text: str) -> CrisisAssessment:
        """
        Scan *text* for crisis patterns, de-duplicate, and return a CrisisAssessment.

        Args:
            text: Raw user-supplied text (chat message, journal entry, etc.)

        Returns:
            CrisisAssessment with overall severity, matched signals, and resources.
        """
        if not text or not text.strip():
            return CrisisAssessment(
                flagged=False,
                severity=CrisisSeverity.NONE,
            )

        # Guard against ReDoS: truncate oversized input
        if len(text) > 10_000:
            text = text[:10_000]

        overall_severity = CrisisSeverity.NONE
        signals: List[CrisisSignal] = []
        seen_phrases: set[str] = set()

        for compiled_re, category, severity in self.patterns:
            for match in compiled_re.finditer(text):
                phrase = match.group(0).lower().strip()
                if phrase in seen_phrases:
                    continue
                seen_phrases.add(phrase)

                context_snippet = self._extract_context(text, match)
                signals.append(
                    CrisisSignal(
                        phrase=phrase,
                        category=category,
                        severity=severity,
                        context_snippet=context_snippet,
                    )
                )
                overall_severity = _max_severity(overall_severity, severity)

        flagged = overall_severity != CrisisSeverity.NONE

        # Only include crisis resources when the severity warrants it
        resources = self.resources if _SEVERITY_ORDER[overall_severity] >= 2 else []

        assessment = CrisisAssessment(
            flagged=flagged,
            severity=overall_severity,
            signals=signals,
            recommended_action=_ACTIONS.get(overall_severity, ""),
            crisis_resources=resources,
        )

        if flagged:
            logger.warning(
                "Crisis signal detected — severity=%s signals=%d",
                overall_severity.value,
                len(signals),
            )

        return assessment
