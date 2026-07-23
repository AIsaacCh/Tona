import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Request, Response
from config import settings

ALGORITHM = "HS256"
EXPIRACION_HORAS = 24 * 7  # 7 días
COOKIE_NAME = "tona_session"


def crear_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=EXPIRACION_HORAS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decodificar_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada, inicia sesión de nuevo")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def establecer_cookie_sesion(response: Response, user_id: str):
    token = crear_token(user_id)
    es_produccion = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=es_produccion,
        samesite="none" if es_produccion else "lax",
        max_age=EXPIRACION_HORAS * 3600,
        path="/",
    )


def obtener_user_id_de_cookie(request: Request) -> str:
    """Extrae y valida el user_id desde la cookie de sesión."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    return decodificar_token(token)


def verificar_identidad(user_id: str, request: Request) -> str:
    """
    Dependency de FastAPI: verifica que la cookie de sesión corresponda
    al mismo user_id que se pide en la ruta.
    """
    user_id_de_cookie = obtener_user_id_de_cookie(request)
    if user_id_de_cookie != user_id:
        raise HTTPException(status_code=403, detail="No autorizado para este usuario")
    return user_id