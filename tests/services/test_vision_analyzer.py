"""
Unit tests for Vision Facial Emotion Analyzer Service.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.services.vision_analyzer import VisionAnalyzerService

def test_vision_analyzer_initialization():
    settings = {"vision_model": "deepface"}
    analyzer = VisionAnalyzerService(settings)
    assert analyzer is not None

def test_vision_analyzer_frame_processing():
    analyzer = VisionAnalyzerService({})
    with patch.object(analyzer, 'analyze_frame', return_value={
        "emotion": "happy",
        "confidence": 0.94,
        "face_detected": True
    }):
        res = analyzer.analyze_frame(b"dummy_bytes")
        assert res["emotion"] == "happy"
        assert res["face_detected"] is True
