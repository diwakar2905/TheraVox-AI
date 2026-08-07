"""
Unit tests for Crisis Detector Service (edge cases, severity scoring, trigger detection).
"""

import pytest
from app.services.crisis_detector import CrisisDetectorService

def test_crisis_detector_no_crisis():
    detector = CrisisDetectorService()
    result = detector.analyze("I am having a wonderful day relaxing at the park.")
    assert result.flagged is False
    assert result.severity.value in ("none", "low")

def test_crisis_detector_high_severity():
    detector = CrisisDetectorService()
    result = detector.analyze("I want to end my life, I cannot go on anymore suicide")
    assert result.flagged is True
    assert result.severity.value in ("high", "critical")
    assert len(result.signals) > 0

def test_crisis_detector_edge_case_empty():
    detector = CrisisDetectorService()
    result = detector.analyze("")
    assert result.flagged is False
    assert result.severity.value == "none"
