# mcp_alexa/auth.py
from fastapi import APIRouter
import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from fastapi import Form, Request, HTTPException
from fastapi.responses import RedirectResponse
from services.db import supabase
from services.encryption import cifrar, descifrar
from services.auth_utils import obtener_user_id_de_cookie
from config import settings

router = APIRouter()

@router.get("/.well-known/oauth-protected-resource")
async def protected_resource_metadata():
    return {
        "resource": "https://tona-production-2734.up.railway.app/mcp",
        "authorization_servers": ["https://tona-production-2734.up.railway.app"],
        "scopes_supported": ["tareas:leer", "tareas:escribir", "correo:enviar"],
    }

@router.get("/.well-known/oauth-authorization-server")
async def authorization_server_metadata():
    return {
        "issuer": "https://tona-production-2734.up.railway.app",
        "authorization_endpoint": "https://tona-production-2734.up.railway.app/mcp/authorize",
        "token_endpoint": "https://tona-production-2734.up.railway.app/mcp/token",
        "code_challenge_methods_supported": ["S256"],
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
    }

@router.get("/mcp/authorize")
async def authorize(
    client_id: str,
    redirect_uri: str,
    state: str,
    code_challenge: str,
    code_challenge_method: str,
    request: Request,
):
    try:
        user_id = obtener_user_id_de_cookie(request)
    except HTTPException:
        # No hay sesión de Tona activa: mándalo a loguearse con Google primero
        login_url = f"{settings.FRONTEND_URL}/login?volver_a=/mcp/authorize"
        return RedirectResponse(login_url)

    codigo = secrets.token_urlsafe(32)
    supabase.table("mcp_alexa_authorization_codes").insert({
        "code": codigo,
        "user_id": user_id,
        "code_challenge": code_challenge,
        "redirect_uri": redirect_uri,
    }).execute()

    return RedirectResponse(f"{redirect_uri}?code={codigo}&state={state}")

@router.post("/mcp/token")
async def token_endpoint(
    grant_type: str = Form(...),
    code: str = Form(None),
    code_verifier: str = Form(None),
    redirect_uri: str = Form(None),
    refresh_token: str = Form(None),
):
    if grant_type == "authorization_code":
        resp = supabase.table("mcp_alexa_authorization_codes").delete().eq("code", code).execute()
        if not resp.data:
            raise HTTPException(status_code=400, detail="Código inválido o ya usado")

        fila = resp.data[0]

        calculado = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        if calculado != fila["code_challenge"]:
            raise HTTPException(status_code=400, detail="code_verifier inválido")

        access_token = secrets.token_urlsafe(32)
        refresh = secrets.token_urlsafe(32)
        supabase.table("mcp_alexa_tokens").insert({
            "access_token": cifrar(access_token),
            "refresh_token": cifrar(refresh),
            "user_id": fila["user_id"],
            "expires_at": (datetime.now() + timedelta(hours=1)).isoformat(),
        }).execute()

        return {
            "access_token": access_token,
            "refresh_token": refresh,
            "token_type": "Bearer",
            "expires_in": 3600,
        }

    elif grant_type == "refresh_token":
        # Buscar el token cuyo refresh_token cifrado coincida
        todos = supabase.table("mcp_alexa_tokens").select("*").execute()
        fila_encontrada = None
        for fila in (todos.data or []):
            if fila.get("refresh_token") and descifrar(fila["refresh_token"]) == refresh_token:
                fila_encontrada = fila
                break

        if not fila_encontrada:
            raise HTTPException(status_code=400, detail="refresh_token inválido")

        nuevo_access = secrets.token_urlsafe(32)
        supabase.table("mcp_alexa_tokens").update({
            "access_token": cifrar(nuevo_access),
            "expires_at": (datetime.now() + timedelta(hours=1)).isoformat(),
        }).eq("access_token", fila_encontrada["access_token"]).execute()

        return {
            "access_token": nuevo_access,
            "token_type": "Bearer",
            "expires_in": 3600,
        }

    raise HTTPException(status_code=400, detail="grant_type no soportado")

async def verificar_token_desde_headers(headers) -> str:
    """
    Núcleo de la verificación: recibe cualquier objeto tipo-dict de headers
    (funciona tanto con Request.headers de FastAPI como con el de MCP Context)
    y regresa el user_id vinculado al Bearer token, o lanza 401.
    """
    auth_header = headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            headers={
                "WWW-Authenticate": (
                    'Bearer resource_metadata='
                    '"https://tona-production-2734.up.railway.app/.well-known/oauth-protected-resource"'
                )
            },
        )

    token_recibido = auth_header.removeprefix("Bearer ")

    todos = supabase.table("mcp_alexa_tokens").select("*").execute()
    fila_encontrada = None
    for fila in (todos.data or []):
        if fila.get("access_token") and descifrar(fila["access_token"]) == token_recibido:
            fila_encontrada = fila
            break

    if not fila_encontrada:
        raise HTTPException(status_code=401, detail="Token inválido")

    expires_at = fila_encontrada.get("expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at)
            if datetime.now() >= exp:
                raise HTTPException(status_code=401, detail="Token expirado")
        except ValueError:
            pass

    return fila_encontrada["user_id"]


async def verificar_token_alexa(request: Request) -> str:
    """Wrapper para usarse como Depends() en endpoints FastAPI normales."""
    return await verificar_token_desde_headers(request.headers)

