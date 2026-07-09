from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # 🔐 Variables sin valores por defecto en producción
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    SECRET_KEY: str
    FRONTEND_URL: str
    ENVIRONMENT: str = "development"  # Default solo para desarrollo
    GOOGLE_TTS_KEY: Optional[str] = None
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GOOGLE_GENAI_USE_VERTEXAI: bool = True
    SUPABASE_URL: str
    SUPABASE_KEY: str
    ENCRYPTION_KEY: str

    class Config:
        # 🧠 Inteligente: carga .env SOLO si existe y estamos en local (no en Railway)
        # En Railway, la variable ENVIRONMENT será "production" y no se cargará .env
        env_file = ".env" if os.path.exists(".env") and os.getenv("ENVIRONMENT") != "production" else None
        env_file_encoding = "utf-8"
        extra = "ignore"
        case_sensitive = False

# ✅ Instancia global de settings
settings = Settings()


# 🔒 VALIDACIONES DE SEGURIDAD (robustas y seguras)
def validate_security():
    """Valida que todas las variables críticas existan y tengan formato seguro."""
    required_vars = [
        'SUPABASE_URL', 'SUPABASE_KEY', 'SECRET_KEY',
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
        'ENCRYPTION_KEY', 'GOOGLE_CLOUD_PROJECT'
    ]
    missing = [var for var in required_vars if not getattr(settings, var, None)]
    if missing:
        raise ValueError(f"❌ Variables de entorno faltantes: {', '.join(missing)}")

    # Validaciones específicas de producción
    if settings.ENVIRONMENT == "production":
        if len(settings.SECRET_KEY) < 32:
            raise ValueError("❌ SECRET_KEY debe tener al menos 32 caracteres en producción")
        if settings.SUPABASE_KEY and (" " in settings.SUPABASE_KEY or "\n" in settings.SUPABASE_KEY):
            raise ValueError("❌ SUPABASE_KEY contiene espacios o saltos de línea")

    print("✅ Validaciones de seguridad completadas")

# 📝 LOGGING SEGURO (sin exponer claves)
def log_config_status():
    """Muestra el estado de la configuración sin exponer ninguna clave."""
    print("=" * 50)
    print("🔍 CONFIGURACIÓN CARGADA")
    print(f"🌍 Entorno: {settings.ENVIRONMENT}")
    print(f"🔗 Supabase URL: {settings.SUPABASE_URL}")
    print(f"🔑 Supabase Key: {'✅ Configurada' if settings.SUPABASE_KEY else '❌ FALTA'}")
    print(f"🔒 Secret Key: {'✅ Configurada' if settings.SECRET_KEY else '❌ FALTA'}")
    print(f"🔐 Encryption Key: {'✅ Configurada' if settings.ENCRYPTION_KEY else '❌ FALTA'}")
    print(f"📱 Frontend URL: {settings.FRONTEND_URL}")
    print(f"🤖 Gemini: {'✅' if settings.GEMINI_API_KEY else '❌'}")
    print(f"☁️  Google Cloud: {settings.GOOGLE_CLOUD_PROJECT}")
    print("=" * 50)

# 🔐 Ejecutar validaciones y logging
validate_security()
if not os.getenv("PYTEST_RUNNING"):
    log_config_status()

# 🔐 Funciones auxiliares seguras
def get_supabase_credentials() -> tuple[str, str]:
    """Devuelve las credenciales de Supabase de forma segura."""
    return settings.SUPABASE_URL, settings.SUPABASE_KEY

def get_sensitive_config(key_name: str) -> str:
    """Obtiene una variable sensible, lanzando error si no existe."""
    value = getattr(settings, key_name, None)
    if not value:
        raise ValueError(f"❌ Configuración {key_name} no encontrada")
    return value