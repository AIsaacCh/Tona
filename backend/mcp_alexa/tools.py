from mcp.server.fastmcp import Context
from mcp_alexa.instance import mcp
from mcp_alexa.auth import verificar_token_desde_headers
from services.db import obtener_tareas, obtener_examenes
from routers.tasks import (
    enviar_correo as _enviar_correo_real, EnviarCorreoRequest,
    crear_tarea_manual as _crear_tarea_real, TareaManual,
    _obtener_calendar,
)



@mcp.tool()
async def consultar_pendientes(ctx: Context) -> str:
    """Consulta las tareas y exámenes pendientes del usuario autenticado."""
    headers = ctx.request_context.request.headers
    user_id = await verificar_token_desde_headers(headers)

    tareas = [t for t in obtener_tareas(user_id) if not t.get("completada")]
    examenes = obtener_examenes(user_id)

    if not tareas and not examenes:
        return "No tienes pendientes registrados."

    partes = [t["titulo"] for t in tareas[:3]]
    partes += [f"examen de {e['materia']}" for e in examenes[:2]]
    return f"Tienes {len(tareas) + len(examenes)} pendiente(s): " + ", ".join(partes)


@mcp.tool()
async def enviar_correo(ctx: Context, para: str, asunto: str, cuerpo: str) -> str:
    """Envía un correo desde la cuenta de Gmail del usuario autenticado.

    Args:
        para: dirección de correo del destinatario
        asunto: asunto del correo
        cuerpo: contenido del correo
    """
    headers = ctx.request_context.request.headers
    user_id = await verificar_token_desde_headers(headers)

    body = EnviarCorreoRequest(para=para, asunto=asunto, cuerpo=cuerpo)
    resultado = await _enviar_correo_real(body=body, user_id=user_id)

    if resultado.get("enviado"):
        return f"Correo enviado a {para} con el asunto '{asunto}'."
    return "No se pudo enviar el correo."

@mcp.tool()
async def crear_tarea(ctx: Context, titulo: str, fecha: str = None, prioridad: str = "media") -> str:
    """Crea una tarea manual para el usuario autenticado.

    Args:
        titulo: título de la tarea
        fecha: fecha límite en formato YYYY-MM-DD (opcional)
        prioridad: 'alta', 'media' o 'baja' (opcional, por defecto 'media')
    """
    headers = ctx.request_context.request.headers
    user_id = await verificar_token_desde_headers(headers)

    body = TareaManual(titulo=titulo, fecha_limite=fecha, prioridad=prioridad)
    resultado = await _crear_tarea_real(body=body, user_id=user_id)

    if resultado.get("creada"):
        return f"Tarea '{titulo}' creada correctamente."
    return "No se pudo crear la tarea."

@mcp.tool()
async def consultar_calendario(ctx: Context) -> str:
    """Consulta los próximos eventos del calendario del usuario autenticado, de los siguientes 7 días."""
    headers = ctx.request_context.request.headers
    user_id = await verificar_token_desde_headers(headers)

    eventos = await _obtener_calendar(user_id)

    if not eventos:
        return "No tienes eventos en tu calendario para los próximos días."

    partes = [f"{e['titulo']} el {e['fecha_limite']}" for e in eventos[:5]]
    return f"Tienes {len(eventos)} evento(s) próximos: " + ", ".join(partes)