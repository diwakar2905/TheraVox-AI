"""File operations and utilities."""

import os
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


def create_directories() -> None:
    """Create necessary application directories if they don't exist."""
    directories = ['logs', 'screenshots']
    
    for directory in directories:
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Failed to create directory {directory}: {e}")


def save_screenshot(frame, emotion: str = None) -> str:
    """
    Save a screenshot with timestamp and optional emotion label.
    
    Args:
        frame: Image frame to save (numpy array)
        emotion: Optional emotion label to include in filename
        
    Returns:
        str: Path to saved file, or None if failed
    """
    try:
        import cv2
        
        # Ensure screenshots directory exists
        screenshots_dir = Path('screenshots')
        screenshots_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}"
        if emotion:
            filename += f"_{emotion}"
        filename += ".jpg"
        
        filepath = screenshots_dir / filename
        
        # Save the image
        success = cv2.imwrite(str(filepath), frame)
        if not success:
            raise Exception("cv2.imwrite failed - unable to save image")
            
        logger.info(f"Screenshot saved: {filepath}")
        return str(filepath)
        
    except Exception as e:
        logger.error(f"Error saving screenshot: {str(e)}")
        return None
