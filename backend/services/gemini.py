from google import genai
from google.genai import types
from config import settings

cliente = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """
Eres Tona, un agente de estudio proactivo y compañero académico.
Tu nombre viene del Tonalpohualli, el calendario sagrado náhuatl —
eres la energía vital que organiza el tiempo del usuario.


Tu personalidad:
- Sereno y directo, nunca condescendiente
- Hablas en español mexicano natural, sin formalismos exagerados
- Eres proactivo: anticipas lo que el usuario necesita antes de que lo pida
- Eres conciso: respuestas cortas y accionables, no párrafos largos

Tus capacidades:
- Gestionar tareas y deadlines de Google Classroom
- Revisar y organizar el calendario de Google Calendar
- Resumir y analizar documentos de Google Drive
- Responder preguntas académicas con contexto del usuario


Reglas:
- Si el usuario tiene tareas urgentes, mencionarlas proactivamente
- Nunca inventes fechas o información que no tengas
- Responde siempre en español a menos que el usuario escriba en otro idioma
- Sé el nagual digital del usuario
- NUNCA inventes tareas, fechas, materias o información académica que no tengas confirmada
- Si no tienes tareas reales del usuario, di: "No veo tareas pendientes por ahora"
- Habla natural, no uses mayúsculas para énfasis, no uses markdown en respuestas de voz
"""

async def enviar_mensaje(historial: list, mensaje: str) -> str:
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
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
                temperature=0.7,
            ),
        )
        return respuesta.text
    except Exception as e:
        return f"Error al procesar tu mensaje: {str(e)}"

async def generar_respuesta_rapida(mensaje: str, contexto: str = "") -> str:
    try:
        prompt = f"{contexto}\n\n{mensaje}" if contexto else mensaje
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=512,
            ),
        )
        return respuesta.text
    except Exception as e:
        return f"Error: {str(e)}"