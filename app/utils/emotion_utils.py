"""Emotion-related utility functions (emoji, colors, descriptions)."""

from typing import Tuple


# Emotion to emoji mapping
EMOTION_EMOJIS = {
    'happy': '😄',
    'sad': '😢',
    'angry': '😡',
    'surprise': '😮',
    'fear': '😨',
    'disgust': '🤢',
    'neutral': '😐',
    'unknown': '❓'
}


# Emotion to color mapping (BGR format for OpenCV)
EMOTION_COLORS = {
    'happy': (0, 255, 255),     # Yellow
    'sad': (255, 128, 0),       # Orange
    'angry': (0, 0, 255),       # Red
    'surprise': (255, 255, 0),   # Cyan
    'fear': (255, 0, 255),      # Magenta
    'disgust': (0, 255, 0),     # Green
    'neutral': (255, 255, 255),  # White
    'unknown': (128, 128, 128)   # Gray
}


def get_emotion_emoji(emotion: str) -> str:
    """
    Get emoji representation for an emotion.
    
    Args:
        emotion: Emotion name
        
    Returns:
        str: Emoji character
    """
    return EMOTION_EMOJIS.get(emotion, EMOTION_EMOJIS['unknown'])


def get_emotion_color(emotion: str) -> Tuple[int, int, int]:
    """
    Get BGR color tuple for emotion visualization.
    
    Args:
        emotion: Emotion name
        
    Returns:
        tuple: BGR color values (for OpenCV)
    """
    return EMOTION_COLORS.get(emotion, EMOTION_COLORS['unknown'])


def get_emotion_description(emotion: str, confidence: float) -> str:
    """
    Get a human-readable description of the emotion.
    
    Args:
        emotion: Emotion name
        confidence: Confidence score (0.0 to 1.0)
        
    Returns:
        str: Description of the emotion with confidence
    """
    descriptions = {
        'happy': f"Happy ({confidence:.0%} confidence)",
        'sad': f"Sad ({confidence:.0%} confidence)",
        'angry': f"Angry ({confidence:.0%} confidence)",
        'surprise': f"Surprised ({confidence:.0%} confidence)",
        'fear': f"Afraid ({confidence:.0%} confidence)",
        'disgust': f"Disgusted ({confidence:.0%} confidence)",
        'neutral': f"Neutral ({confidence:.0%} confidence)",
        'unknown': "Unable to determine emotion"
    }
    return descriptions.get(emotion, "Unable to determine emotion")
