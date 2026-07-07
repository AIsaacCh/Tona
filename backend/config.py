from pydantic_settings import BaseSettings
from typing import Optional
import os

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
    SUPABASE_URL: str
    SUPABASE_KEY: str
    ENCRYPTION_KEY: str

    class Config:
        # SOLO cargar .env en desarrollo LOCAL
        env_file = ".env" if os.getenv("ENVIRONMENT") == "development" else None
        env_file_encoding = "utf-8"
        # IMPORTANTE: No permitir variables extra
        extra = "ignore"
        # Prioridad: Variables de entorno del sistema > archivo .env
        case_sensitive = False

# Crear instancia
settings = Settings()

# 🚨 VALIDACIÓN DE SEGURIDAD: Verificar que las claves existen
if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
    raise ValueError(
        "❌ CRITICAL: Variables de Supabase no configuradas en el entorno"
    )

# 🔐 NUNCA imprimir claves completas en producción
if settings.ENVIRONMENT == "development":
    print("🔍 [DEV] Variables cargadas correctamente")
    print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
    print(f"SUPABASE_KEY: {settings.SUPABASE_KEY[:10]}... (truncado por seguridad)")
else:
    # En producción, solo confirmar que existen sin mostrar valores
    print("✅ Configuración de Supabase cargada correctamente")