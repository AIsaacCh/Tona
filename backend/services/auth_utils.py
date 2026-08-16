import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Request, Response, Depends
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
        samesite="lax",
        max_age=EXPIRACION_HORAS * 3600,
        path="/",
    )


def obtener_user_id_de_cookie(request: Request) -> str:
    """Extrae y valida el user_id desde la cookie de sesión."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    return decodificar_token(token)


# ✅ NUEVA: Dependency que devuelve el user_id de la cookie
async def verificar_identidad(request: Request) -> str:
    """
    Dependency de FastAPI: valida la cookie y devuelve el user_id.
    Úsala en lugar de recibir user_id por URL o body.
    """
    return obtener_user_id_de_cookie(request)


# ⚠️ OBSOLETO: Ya no se usa, pero lo mantengo por compatibilidad
# def verificar_identidad(user_id: str, request: Request) -> str:
#     ...