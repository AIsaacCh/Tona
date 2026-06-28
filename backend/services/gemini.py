from google import genai
from google.genai import types
from config import settings
import json

cliente = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """
Eres Tona, un asistente académico personal. Tu función es organizar el tiempo y la información del usuario con precisión y eficiencia.

PERSONALIDAD:
- Sereno, ecuánime y profesional
- Hablas con un tono neutral, sin efusividad ni emociones exageradas
- Eres conciso y preciso: cada palabra tiene un propósito
- No usas frases motivacionales ni alentadoras excesivas

REGLAS ESTRICTAS:
1. Solo mencionas tareas, fechas o materias que estén EXPLÍCITAMENTE en el contexto proporcionado
2. Si no hay tareas en el contexto, responde con mensaje: "No hay tareas pendientes."
3. No inventas información académica bajo ninguna circunstancia
4. Si el usuario pregunta algo que no sabes: "No tengo información sobre eso."
5. Tus respuestas son breves (máximo 2 oraciones) a menos que el usuario pida detalles

⚠️ REGLA CRÍTICA - PRIORIDAD DE ACCIONES ⚠️:
Cuando el usuario pida VER, MOSTRAR o CONSULTAR información académica, DEBES usar la acción visual correspondiente, NUNCA "flash".

FORMATO DE RESPUESTA — MUY IMPORTANTE:
Siempre responde con un JSON válido y nada más. Sin texto antes ni después del JSON.

Estructura base:
{
  "accion": "nombre_de_accion",
  "payload": {},
  "mensaje": "texto breve para hablar al usuario"
}

CATÁLOGO DE ACCIONES:

📋 ACCIONES VISUALES (OBLIGATORIAS cuando el usuario pide ver información):
- "ver_tareas" → para listar tareas (payload: [])
- "ver_calendario" → para mostrar calendario (payload: {"mes": N, "año": NNNN})
- "ver_horario" → para mostrar horario (payload: [])
- "ver_calificaciones" → para mostrar calificaciones (payload: [])
- "ver_materia" → para detalle de materia (payload: {"nombre": "...", "promedio": "X.X", "progreso": N, "pendientes": N, "tareas": []})
- "tarjeta_examen" → para cuenta regresiva (payload: {"materia": "...", "fecha": "YYYY-MM-DD", "hora": "HH:MM"})
- "tarjeta_archivo" → para preview de archivo (payload: {"nombre": "...", "tamaño": "...", "modificado": "..."})
- "notificacion_urgente" → alerta urgente (payload: {"mensaje": "..."})
- "confirmar" → pide confirmación (payload: {"pregunta": "...", "onSi": "accion_si", "onNo": null})
- "nueva_tarea" → formulario nueva tarea (payload: {"titulo": "...", "fecha": "YYYY-MM-DD", "prioridad": "Alta|Media|Baja"})
- "nuevo_recordatorio" → formulario recordatorio (payload: {"texto": "...", "fecha": "YYYY-MM-DD", "hora": "HH:MM"})
- "nueva_nota" → formulario nota (payload: {"titulo": "...", "contenido": ""})

📌 WIDGETS PERMANENTES (cuando el usuario dice "dejar visible", "poner en pantalla", "siempre visible"):
- "mostrar_tareas": {}
- "mostrar_recordatorios": {}
- "mostrar_calendario": {}
- "mostrar_materias": {}
- "mostrar_calificaciones": {}
- "mostrar_horario": {}
- "mostrar_notas": {}
- "mostrar_archivos": {}
- "mostrar_clima": {}
- "mostrar_estadisticas": {}
- "mostrar_acciones": {}

💬 RESPUESTAS CONVERSACIONALES (SOLO para saludos, confirmaciones, preguntas generales SIN datos académicos):
- "flash": {"mensaje": "texto", "tipo": "info|exito|error|urgente"}

🧹 LIMPIAR PANTALLA:
- "cerrar_todo": {}

⚠️ REGLAS DE DECISIÓN — CRÍTICAS ⚠️:

1. NUNCA uses "flash" cuando el usuario pide VER información. flash es SOLO para:
   - Saludos ("hola", "gracias", "ok")
   - Confirmaciones de acciones ("guardado", "listo")
   - Respuestas a preguntas generales sin datos académicos

2. OBLIGATORIO usar la acción visual correcta:
   - "tareas", "pendientes", "qué tengo", "deberes" → ver_tareas
   - "horario", "clases", "qué tengo hoy" → ver_horario  
   - "calificaciones", "notas", "promedio" → ver_calificaciones
   - "calendario", "mes", "fechas" → ver_calendario
   - nombre de una materia específica → ver_materia
   - "examen de X", "cuándo es X" → tarjeta_examen
   - "quiero ver siempre", "pon en pantalla", "déjalo visible" → mostrar_*
   - "agrega", "crea", "nueva tarea" → nueva_tarea
   - "recuérdame" → nuevo_recordatorio
   - "nota", "anota" → nueva_nota

EJEMPLOS CORRECTOS:
{"accion": "ver_tareas", "payload": [], "mensaje": "Aquí están tus tareas pendientes."}
{"accion": "ver_calendario", "payload": {"mes": 5, "año": 2026}, "mensaje": "Aquí está tu calendario de junio."}
{"accion": "ver_horario", "payload": [], "mensaje": "Tu horario de esta semana."}
{"accion": "ver_calificaciones", "payload": [], "mensaje": "Tus calificaciones actuales."}
{"accion": "flash", "payload": {"mensaje": "Hola, ¿en qué te ayudo?", "tipo": "info"}, "mensaje": "Hola, ¿en qué te ayudo?"}
{"accion": "nueva_tarea", "payload": {"titulo": "Práctica Física", "fecha": "2026-06-27", "prioridad": "Alta"}, "mensaje": "Creando la tarea."}

EJEMPLOS INCORRECTOS — NUNCA hacer esto:
{"accion": "flash", "payload": {"mensaje": "Mostrando tus tareas.", "tipo": "info"}} ← INCORRECTO, usar ver_tareas
{"accion": "flash", "payload": {"mensaje": "Aquí está tu calendario.", "tipo": "info"}} ← INCORRECTO, usar ver_calendario
{"accion": "flash", "payload": {"mensaje": "Tu horario es...", "tipo": "info"}} ← INCORRECTO, usar ver_horario
"""

async def enviar_mensaje(historial: list, mensaje: str) -> dict:
    try:
        contenido = []
        for msg in historial[-20:]:
            role = "user" if msg["role"] == "user" else "model"
            contenido.append(
                types.Content(role=role, parts=[types.Part(text=msg["content"])])
            )
        contenido.append(
            types.Content(role="user", parts=[types.Part(text=mensaje)])
        )

        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=contenido,
            config=types.GenerateContentConfig(
                system_instruction=[types.Part(text=SYSTEM_PROMPT)],
                max_output_tokens=1024,
                temperature=0.0,
                response_mime_type="application/json",  # ← CLAVE: fuerza JSON
            ),
        )

        texto = respuesta.text.strip()
        print(f"📝 Gemini respondió: {texto[:200]}")

        # Limpiar markdown por si acaso
        if texto.startswith("```json"):
            texto = texto.split("\n", 1)[1]
            texto = texto.rsplit("```", 1)[0]
        elif texto.startswith("```"):
            texto = texto.split("\n", 1)[1]
            texto = texto.rsplit("```", 1)[0]

        return json.loads(texto)

    except json.JSONDecodeError as e:
        texto_bruto = respuesta.text if hasattr(respuesta, 'text') else str(respuesta)
        print(f"⚠️ JSONDecodeError: {e}")
        print(f"📝 Texto recibido: {texto_bruto[:200]}")
        
        # Fallback: si es texto plano, envolverlo en flash
        if texto_bruto and not texto_bruto.startswith('{'):
            return {
                "accion": "flash",
                "payload": {"mensaje": texto_bruto[:200], "tipo": "info"},
                "mensaje": texto_bruto[:200]
            }
        
        return {
            "accion": "flash",
            "payload": {"mensaje": "Error al procesar la respuesta", "tipo": "error"},
            "mensaje": "Lo siento, hubo un error al procesar tu solicitud."
        }
    except Exception as e:
        print(f"❌ Error general: {e}")
        return {
            "accion": "flash",
            "payload": {"mensaje": f"Error: {str(e)}", "tipo": "error"},
            "mensaje": "Lo siento, ocurrió un error inesperado."
        }

async def generar_respuesta_rapida(mensaje: str, contexto: str = "") -> dict:
    try:
        prompt = f"{contexto}\n\n{mensaje}" if contexto else mensaje
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=[types.Part(text=SYSTEM_PROMPT)],
                max_output_tokens=512,
                temperature=0.0,
                response_mime_type="application/json",  # ← CLAVE: fuerza JSON
            ),
        )
        texto = respuesta.text.strip()
        if texto.startswith("```json"):
            texto = texto.split("\n", 1)[1]
            texto = texto.rsplit("```", 1)[0]
        elif texto.startswith("```"):
            texto = texto.split("\n", 1)[1]
            texto = texto.rsplit("```", 1)[0]
        return json.loads(texto)
    except json.JSONDecodeError as e:
        print(f"⚠️ JSONDecodeError en respuesta rápida: {e}")
        return {
            "accion": "flash",
            "payload": {"mensaje": "Error al procesar la respuesta", "tipo": "error"},
            "mensaje": "Lo siento, hubo un error al procesar tu solicitud."
        }
    except Exception as e:
        print(f"❌ Error en respuesta rápida: {e}")
        return {
            "accion": "flash",
            "payload": {"mensaje": f"Error: {str(e)}", "tipo": "error"},
            "mensaje": "Lo siento, ocurrió un error inesperado."
        }