from pydantic_settings import BaseSettings
from typing import Optional
import os
import secrets

class Settings(BaseSettings):
    # 🔐 SOLO definir variables, NUNCA poner valores por defecto en producción
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str  # Sin valor por defecto
    SECRET_KEY: str  # Sin valor por defecto
    FRONTEND_URL: str  # Sin valor por defecto
    ENVIRONMENT: str = "development"  # ✅ Este sí puede tener default
    GOOGLE_TTS_KEY: Optional[str] = None
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GOOGLE_GENAI_USE_VERTEXAI: bool = True
    SUPABASE_URL: str
    SUPABASE_KEY: str
    ENCRYPTION_KEY: str  # ¡IMPORTANTE! Sin default

    class Config:
        # ✅ Cargar .env SOLO en desarrollo
        env_file = ".env" if os.getenv("ENVIRONMENT") == "development" else None
        env_file_encoding = "utf-8"
        extra = "ignore"
        case_sensitive = False

# ✅ Crear instancia
settings = Settings()

# 🔒 VALIDACIONES DE SEGURIDAD EN PRODUCCIÓN
def validate_security():
    """Validaciones críticas de seguridad"""
    
    # 1. Verificar que todas las claves REQUERIDAS existen
    required_vars = [
        'SUPABASE_URL', 'SUPABASE_KEY', 'SECRET_KEY', 
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 
        'ENCRYPTION_KEY'
    ]
    
    missing = []
    for var in required_vars:
        if not getattr(settings, var, None):
            missing.append(var)
    
    if missing:
        raise ValueError(
            f"❌ Variables de entorno faltantes: {', '.join(missing)}"
        )
    
    # 2. Verificar que SECRET_KEY sea segura en producción
    if settings.ENVIRONMENT == "production":
        if len(settings.SECRET_KEY) < 32:
            raise ValueError(
                "❌ SECRET_KEY debe tener al menos 32 caracteres en producción"
            )
        
        if settings.SECRET_KEY == "tona_dev_secret_2026":
            raise ValueError(
                "❌ SECRET_KEY es la clave por defecto de desarrollo - ¡CAMBIA ESTO!"
            )
    
    # 3. Validar formato de Supabase key
    if settings.SUPABASE_KEY:
        if not (settings.SUPABASE_KEY.startswith("sb_secret_") or 
                settings.SUPABASE_KEY.startswith("eyJ")):
            print("⚠️ ADVERTENCIA: La clave de Supabase tiene formato inusual")
        
        # Verificar que no tenga caracteres ocultos
        if " " in settings.SUPABASE_KEY or "\n" in settings.SUPABASE_KEY:
            raise ValueError(
                "❌ SUPABASE_KEY contiene espacios o saltos de línea"
            )
    
    # 4. Verificar que la URL de Supabase es válida
    if settings.SUPABASE_URL:
        if not settings.SUPABASE_URL.startswith("https://"):
            raise ValueError("❌ SUPABASE_URL debe comenzar con https://")
        
        if not settings.SUPABASE_URL.endswith(".supabase.co"):
            raise ValueError("❌ SUPABASE_URL debe terminar con .supabase.co")
    
    # 5. Validar ENVIRONMENT
    if settings.ENVIRONMENT not in ["development", "staging", "production"]:
        raise ValueError(f"❌ ENVIRONMENT inválido: {settings.ENVIRONMENT}")
    
    print("✅ Validaciones de seguridad completadas")

# 🔒 Ejecutar validaciones
validate_security()

# 📝 Logging seguro (sin exponer claves completas)
def log_config_status():
    """Mostrar estado de configuración sin exponer claves"""
    print("=" * 50)
    print("🔍 CONFIGURACIÓN CARGADA")
    print(f"🌍 Entorno: {settings.ENVIRONMENT}")
    print(f"🔗 Supabase URL: {settings.SUPABASE_URL}")
    
    # Mostrar solo primeros caracteres de las claves
    if settings.SUPABASE_KEY:
        print(f"🔑 Supabase Key: {settings.SUPABASE_KEY[:10]}... (truncado)")
    else:
        print("🔑 Supabase Key: ❌ NO CONFIGURADA")
    
    if settings.SECRET_KEY:
        print(f"🔒 Secret Key: {'*' * 10} (oculta)")
    
    # Otras configuraciones no sensibles
    print(f"📱 Frontend URL: {settings.FRONTEND_URL}")
    print(f"🤖 Gemini: {'✅' if settings.GEMINI_API_KEY else '❌'}")
    print(f"☁️  Google Cloud: {settings.GOOGLE_CLOUD_PROJECT}")
    print("=" * 50)

# ✅ Mostrar estado SOLO si no estamos en un entorno de testing
if not os.getenv("PYTEST_RUNNING"):
    log_config_status()

# 🔐 Función auxiliar para obtener claves de forma segura
def get_supabase_client() -> tuple[str, str]:
    """Obtener credenciales de Supabase de forma segura"""
    return settings.SUPABASE_URL, settings.SUPABASE_KEY

def get_sensitive_config(key_name: str) -> str:
    """Obtener una configuración sensible con validación"""
    value = getattr(settings, key_name, None)
    if not value:
        raise ValueError(f"❌ Configuración {key_name} no encontrada")
    return value