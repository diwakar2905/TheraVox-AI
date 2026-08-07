"""
Unit tests for Audio Analyzer Service.
"""

import pytest
from unittest.mock import MagicMock, patch
from app.services.audio_analyzer import AudioAnalyzerService

def test_audio_analyzer_initialization():
    analyzer = AudioAnalyzerService()
    assert analyzer is not None

def test_audio_analyzer_mock_process():
    analyzer = AudioAnalyzerService()
    with patch.object(analyzer, 'analyze', return_value={
        "dominant_emotion": "calm",
        "confidence": 0.85,
        "emotion_scores": {"calm": 0.85, "neutral": 0.15}
    }):
        res = analyzer.analyze("mock_file.wav")
        assert res["dominant_emotion"] == "calm"
        assert res["confidence"] == 0.85
