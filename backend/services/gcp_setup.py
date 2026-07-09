import os
import json


def configurar_credenciales_gcp():
    """
    En Railway (u otros entornos sin ADC local), las credenciales de Google Cloud
    se pasan como JSON completo en la variable GOOGLE_APPLICATION_CREDENTIALS_JSON.
    Esta función escribe ese JSON a un archivo temporal y apunta la variable
    estándar GOOGLE_APPLICATION_CREDENTIALS hacia él, que es lo que las librerías
    de Google (google-genai, google-auth, etc.) esperan encontrar.
    """
    creds_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not creds_json:
        print("ℹ️  GOOGLE_APPLICATION_CREDENTIALS_JSON no está configurada (se asume ADC local)")
        return

    try:
        json.loads(creds_json)
    except json.JSONDecodeError as e:
        print(f"❌ GOOGLE_APPLICATION_CREDENTIALS_JSON no es JSON válido: {e}")
        return

    creds_path = "/tmp/gcp_credentials.json"
    with open(creds_path, "w") as f:
        f.write(creds_json)

    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
    print(f"✅ Credenciales de GCP configuradas en {creds_path}")