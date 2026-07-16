import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Header
from config import settings

ALGORITHM = "HS256"
EXPIRACION_HORAS = 24 * 7  # 7 días


def crear_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=EXPIRACION_HORAS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> str:
    """Regresa el user_id si el token es válido, lanza excepción si no."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada, inicia sesión de nuevo")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def verificar_identidad(user_id: str, authorization: str = Header(None)) -> str:
    """
    Dependency de FastAPI: verifica que el token en el header Authorization
    corresponda al mismo user_id que se está pidiendo en la ruta.
    Úsalo así en cualquier endpoint: user_id: str = Depends(verificar_identidad)
    (FastAPI inyecta automáticamente el user_id del path para comparar)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")

    token = authorization.replace("Bearer ", "", 1)
    user_id_del_token = decodificar_token(token)

    if user_id_del_token != user_id:
        raise HTTPException(status_code=403, detail="No autorizado para este usuario")

    return user_id