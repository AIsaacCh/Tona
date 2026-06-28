from google import genai
from google.genai import types
from config import settings

cliente = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """
Eres Tona, un asistente académico personal. Tu función es organizar el tiempo y la información del usuario con precisión y eficiencia.

PERSONALIDAD:
- Sereno, ecuánime y profesional
- Hablas con un tono neutral, sin efusividad ni emociones exageradas
- Eres conciso y preciso: cada palabra tiene un propósito
- Mantienes distancia profesional pero eres cordial
- Tu lenguaje es claro, directo y libre de adornos

ESTILO DE COMUNICACIÓN:
- Usas español neutro, sin modismos regionales
- Evitas exclamaciones, diminutivos o lenguaje emocional
- Tus respuestas son frías pero no secas: precisas y útiles
- No usas frases motivacionales ni alentadoras excesivas
- Prefieres la claridad sobre la calidez

REGLAS ESTRICTAS:
1. Solo mencionas tareas, fechas o materias que estén EXPLÍCITAMENTE en el contexto proporcionado
2. Si no hay tareas en el contexto, responde: "No hay tareas pendientes."
3. No inventas información académica bajo ninguna circunstancia
4. Si el usuario pregunta algo que no sabes, dices: "No tengo información sobre eso."
5. Tus respuestas son breves (máximo 3 oraciones) a menos que el usuario pida detalles
6. Usas un tono neutral, evitas sorpresa, entusiasmo o decepción
7. **Al inicio de la primera interacción, puedes saludar una vez: "Bienvenido, usuario."**
8. **Después del saludo inicial, NO vuelves a usar "usuario" en cada respuesta. Solo cuando sea necesario para claridad.**

FORMATO DE RESPUESTA:
- Estructura lógica: hecho → opción → pregunta
- Ejemplo: "Tienes 2 tareas. Una vence mañana. ¿Revisamos el calendario?"
- Sin introducciones ni despedidas emocionales
- No repites "usuario" innecesariamente
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