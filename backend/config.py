import os
from supabase import create_client, Client
from config import settings

# 🔍 DEBUG EXTREMO - Ver valores exactos
print("=" * 60)
print("🔍 DEBUG DE SUPABASE")
print(f"SUPABASE_URL: '{settings.SUPABASE_URL}'")
print(f"SUPABASE_KEY: '{settings.SUPABASE_KEY}'")
print(f"Longitud URL: {len(settings.SUPABASE_URL) if settings.SUPABASE_URL else 0}")
print(f"Longitud KEY: {len(settings.SUPABASE_KEY) if settings.SUPABASE_KEY else 0}")
print(f"Caracteres especiales en KEY: {repr(settings.SUPABASE_KEY)}")
print("=" * 60)

# Verificar formato de la clave
if settings.SUPABASE_KEY:
    if settings.SUPABASE_KEY.startswith("sb_"):
        print("✅ Formato de clave NUEVO (sb_)")
    elif settings.SUPABASE_KEY.startswith("eyJ"):
        print("✅ Formato de clave LEGADO (JWT)")
    else:
        print("⚠️ Formato de clave DESCONOCIDO")
        
    # Mostrar primeros y últimos caracteres
    print(f"Primeros 10 chars: {settings.SUPABASE_KEY[:10]}")
    print(f"Últimos 10 chars: {settings.SUPABASE_KEY[-10:]}")
    
    # Verificar espacios
    if " " in settings.SUPABASE_KEY:
        print("❌ ERROR: La clave contiene ESPACIOS!")
    if "\n" in settings.SUPABASE_KEY:
        print("❌ ERROR: La clave contiene SALTOS DE LÍNEA!")
    if "\r" in settings.SUPABASE_KEY:
        print("❌ ERROR: La clave contiene RETORNOS DE CARRO!")

# Intentar crear el cliente con limpieza de caracteres
try:
    # Limpiar posibles espacios o saltos de línea
    clean_url = settings.SUPABASE_URL.strip()
    clean_key = settings.SUPABASE_KEY.strip()
    
    print(f"\n🔄 Intentando con URL limpiada: {clean_url}")
    print(f"🔄 KEY limpiada (primeros 20 chars): {clean_key[:20]}...")
    
    supabase: Client = create_client(clean_url, clean_key)
    print("✅ Cliente Supabase creado exitosamente!")
    
except Exception as e:
    print(f"❌ Error al crear cliente: {e}")
    
    # Intentar con valores hardcodeados para probar
    print("\n🔄 Intentando con valores hardcodeados (SOLO PARA DEBUG)...")
    try:
        # REEMPLAZA ESTOS VALORES CON LOS DE SUPABASE
        test_url = "https://tu-proyecto.supabase.co"
        test_key = "sb_secret_tu_clave_aqui"
        
        supabase_test = create_client(test_url, test_key)
        print("✅ Cliente con valores hardcodeados funcionó!")
        print("👉 El problema es que las variables de entorno tienen caracteres ocultos o están mal escritas")
        
    except Exception as e2:
        print(f"❌ También falló con valores hardcodeados: {e2}")
        print("👉 La clave que estás usando es incorrecta. Verifícala en Supabase Dashboard")
    
    raise