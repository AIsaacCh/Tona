import sys
import secrets
from datetime import datetime, timedelta

from services.db import supabase
from services.encryption import cifrar


def main():
    if len(sys.argv) != 2:
        print("Uso: python -m mcp_alexa.crear_token_prueba <user_id>")
        return

    user_id = sys.argv[1]
    token = secrets.token_urlsafe(32)

    supabase.table("mcp_alexa_tokens").insert({
        "access_token": cifrar(token),
        "refresh_token": None,
        "user_id": user_id,
        "expires_at": (datetime.now() + timedelta(hours=24)).isoformat(),
    }).execute()

    print("Token de prueba (válido 24h):")
    print(token)


if __name__ == "__main__":
    main()