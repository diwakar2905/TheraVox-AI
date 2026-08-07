"""
Unit tests for Text Analyzer Service.
"""

import pytest
from unittest.mock import patch
from app.services.text_analyzer import TextAnalyzerService

def test_text_analyzer_fallback():
    analyzer = TextAnalyzerService()
    with patch.object(analyzer, '_analyze_with_transformer', return_value=None):
        emotion, confidence, scores = analyzer.analyze("I feel super happy, excited, and grateful today!")
        assert isinstance(emotion, str)
        assert 0.0 <= confidence <= 1.0
        assert isinstance(scores, dict)
        assert emotion in scores

def test_text_analyzer_empty_input():
    analyzer = TextAnalyzerService()
    with patch.object(analyzer, '_analyze_with_transformer', return_value=None):
        emotion, confidence, scores = analyzer.analyze("")
        assert isinstance(emotion, str)
        assert 0.0 <= confidence <= 1.0
        assert isinstance(scores, dict)
