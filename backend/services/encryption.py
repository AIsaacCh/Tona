from cryptography.fernet import Fernet
from config import settings

_fernet = Fernet(settings.ENCRYPTION_KEY.encode())


def cifrar(valor: str) -> str | None:
    if not valor:
        return None
    return _fernet.encrypt(valor.encode()).decode()


def descifrar(valor: str) -> str | None:
    if not valor:
        return None
    try:
        return _fernet.decrypt(valor.encode()).decode()
    except Exception:
        print("⚠️ No se pudo descifrar un valor — revisa ENCRYPTION_KEY")
        return None