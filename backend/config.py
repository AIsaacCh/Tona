from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback"
    SECRET_KEY: str = "tona_dev_secret_2026"
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    GOOGLE_TTS_KEY: str = ""
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GOOGLE_GENAI_USE_VERTEXAI: bool = True
    # Supabase + cifrado
    SUPABASE_URL: str
    SUPABASE_KEY: str
    ENCRYPTION_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()