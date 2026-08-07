"""Application configuration management."""

import os
from functools import lru_cache
from typing import Any, Dict
import json

# Load .env before anything reads os.getenv
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Settings:
    """Application settings with environment-aware configuration."""
    
    def __init__(self, settings_file: str = "settings.json"):
        self.settings_file = settings_file
        
        # Default configuration
        self._config: Dict[str, Any] = {
            # Server settings
            "host": os.getenv("HOST", "127.0.0.1"),
            "port": int(os.getenv("PORT", "8000")),
            
            # Database
            "database_url": os.getenv("DATABASE_URL"),

            # JWT / Auth
            "jwt_secret_key": os.getenv("JWT_SECRET_KEY", ""),
            "jwt_algorithm": os.getenv("JWT_ALGORITHM", "HS256"),
            "jwt_access_token_expire_minutes": int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")),
            "jwt_refresh_token_expire_days": int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7")),

            # Email / SMTP
            "smtp_host": os.getenv("SMTP_HOST", ""),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "smtp_user": os.getenv("SMTP_USER", ""),
            "smtp_password": os.getenv("SMTP_PASSWORD", ""),
            "smtp_from": os.getenv("SMTP_FROM", ""),
            "notify_email": os.getenv("NOTIFY_EMAIL", ""),

            # Model settings
            "emotion_smoothing": 3,
            "detection_quality": "balanced",  # performance, balanced, quality
            "min_face_size": 50,
            
            # Performance settings
            "opencv_threads": int(os.getenv("OPENCV_THREADS", "2")),
            "torch_threads": int(os.getenv("TORCH_NUM_THREADS", "2")),
            
            # Paths
            "logs_dir": "logs",
            "screenshots_dir": "screenshots",
            "static_dir": "static",
            "templates_dir": "templates",
            
            # Feature flags
            "enable_audio": True,
            "enable_vision": True,
            "enable_text": True,

            # Groq AI
            "groq_api_key": os.getenv("GROQ_API_KEY", ""),
            "groq_model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),

            # OAuth / social login
            "google_client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "google_client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "github_client_id": os.getenv("GITHUB_CLIENT_ID", ""),
            "github_client_secret": os.getenv("GITHUB_CLIENT_SECRET", ""),
            # Base URL of the frontend (used to build OAuth redirect URIs via Vite proxy)
            "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:5173"),

            # Deployment environment — set ENVIRONMENT=production in prod to enable secure cookies
            "environment": os.getenv("ENVIRONMENT", "development"),
        }
        
        # Load from file if exists
        self._load_from_file()
    
    def _load_from_file(self) -> None:
        """Load settings from JSON file if it exists."""
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
                    self._config.update(file_config)
            except Exception as e:
                import logging as _logging
                _logging.getLogger(__name__).warning("Failed to load %s: %s", self.settings_file, e)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a configuration value."""
        return self._config.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Set a configuration value."""
        self._config[key] = value
    
    def save(self) -> None:
        """Save current configuration to file."""
        try:
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2)
        except Exception:
            pass
    
    @property
    def all(self) -> Dict[str, Any]:
        """Get all configuration values."""
        return self._config.copy()


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
