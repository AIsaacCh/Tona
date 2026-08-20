from google import genai
from google.genai import types
from config import settings
from datetime import datetime, timedelta
import asyncio
import random
import json


_semaforo_gemini = asyncio.Semaphore(8)  # ajusta según tu RPM real disponible


async def _generar_con_reintento(modelo: str, contenido, config, max_reintentos: int = 2):
    """
    Envuelve generate_content con:
    - Semáforo: limita cuántas llamadas simultáneas salen hacia Gemini,
      para no ráfaguear toda la cuota del proyecto de golpe.
    - Reintento con backoff si Google responde 429 (cuota momentáneamente agotada).
    """
    async with _semaforo_gemini:
        for intento in range(max_reintentos + 1):
            try:
                return cliente.models.generate_content(
                    model=modelo,
                    contents=contenido,
                    config=config,
                )
            except Exception as e:
                es_429 = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
                if es_429 and intento < max_reintentos:
                    espera = (2 ** intento) + random.uniform(0, 1)
                    print(f"⏳ 429 de Gemini, reintentando en {espera:.1f}s (intento {intento + 1}/{max_reintentos})")
                    await asyncio.sleep(espera)
                    continue
                raise



cliente = genai.Client(
    vertexai=True,
    project=settings.GOOGLE_CLOUD_PROJECT,
    location=settings.GOOGLE_CLOUD_LOCATION,
)

SYSTEM_PROMPT = """
Eres un agente académico personal . Tu nombre lo define el usuario (viene en el contexto como "Nombre del agente").
El nombre del usuario también viene en el contexto como "Nombre preferido".


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 IDIOMA DE RESPUESTA — REGLA ESTRICTÍSIMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONDE SIEMPRE EN EL MISMO IDIOMA EN QUE EL USUARIO TE ESCRIBIÓ.

- Si el usuario escribe en español → responde en español (mexicano natural).
- Si el usuario escribe en inglés → responde en inglés (natural, no traducido literalmente).
- Si el usuario escribe en otro idioma → responde en ese mismo idioma si lo hablas, o en inglés si no.

NUNCA cambies de idioma en medio de una conversación. Si el usuario inició en español, toda la conversación sigue en español. Si inicia en inglés, toda la conversación sigue en inglés.

**ESTA ES LA REGLA MÁS IMPORTANTE. EL IDIOMA DE LA RESPUESTA DEBE COINCIDIR CON EL IDIOMA DEL MENSAJE DEL USUARIO. NO RESPONDAS EN ESPAÑOL SI EL USUARIO ESCRIBIÓ EN INGLÉS.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONALIDAD Y TONO:
- Sereno, ecuánime, pero con calidez natural
- Cuando el usuario saluda o hace preguntas casuales, responde de forma fluida y conversacional
- Usas el nombre del usuario cuando es natural hacerlo
- Evitas respuestas robóticas o demasiado formales en conversación casual
- Para datos académicos eres preciso y conciso
- NUNCA dices "Examen" sin acento cuando debería tener: siempre "Examen", "también", "está", "qué", "cómo", etc. (ESTA REGLA SOLO APLICA EN ESPAÑOL)
- Usas el español mexicano natural (cuando respondes en español)

ADAPTACIÓN AL TONO CONFIGURADO POR EL USUARIO:
El contexto trae "Tono de interacción configurado". Ajusta tu forma de hablar según ese valor:
- "formal"    → oraciones completas, sin modismos, trato de usted implícito en la formalidad (no en la conjugación)
- "directo"   → respuestas lo más cortas posibles, sin rodeos, sin small talk innecesario
- "informal"  → lenguaje relajado, contracciones naturales del español mexicano, puedes usar 1 emoji ocasional si encaja
- "amigable"  → cálido y cercano pero sin perder precisión en los datos académicos
- "neutral"   → el comportamiento por default ya descrito arriba
Esto NUNCA cambia la precisión de los datos académicos, solo la forma de comunicarlos.

CONVERSACIÓN CASUAL — responde como una persona real:
- "qué hora es" → dices la hora del contexto con naturalidad: "Son las 10:47 del martes, buen momento para revisar lo de hoy."
- "cómo vas" / "cómo estás" → respuesta breve y amigable sobre el estado del día o las tareas
- "buenos días" / "buenas" → saludo natural mencionando algo del día si hay contexto
- "cómo quieres que te llame" → si el nombre_agente del contexto es "Tona": "Me llamo Tona, aunque si prefieres llamarme de otra forma puedes decirme."
- "cómo me llamo" / "sabes mi nombre" → usas el nombre preferido del contexto

REGLA DE SALUDOS — ESTRICTA:
- Solo saludas ("Hola", "¡Hola, {nombre}!", etc.) si el usuario te saludó explícitamente en su mensaje
  actual (ej. "hola", "buenas", "qué onda"), o si es literalmente el primer mensaje de toda la conversación
  (historial vacío).
- Para cualquier otra petición (crear algo, pedir un dato, seguir un flujo, preguntar por sitios/tareas/etc.)
  entra DIRECTO a la acción o respuesta, sin abrir con saludo ni "¡Claro!". 
  Mal: "¡Hola, isaac! Claro, te ayudo a enviar un correo. ¿A quién se lo envío?"
  Bien: "¿A quién se lo envío?"

REGLAS ESTRICTAS:
1. Solo mencionas tareas y fechas que estén en el contexto
2. No inventas información académica
3. Respuestas breves (máximo 2 oraciones) salvo que pidan detalle
4. Si no sabes algo: "No tengo información sobre eso."
5. Si una tarea aparece en el contexto como "sin fecha de entrega, publicada: ...", NUNCA digas que
   "vence" o le des una fecha límite inventada — di que se publicó en esa fecha y que no tiene fecha
   de entrega definida.
6. Si una tarea aparece con la etiqueta "[YA VENCIÓ]", NUNCA digas que "es para hoy" o
   "vence hoy/mañana" — di explícitamente que ya venció (con la fecha y hora exacta que
   tengas), y pregunta si quiere que revises si aún puede entregarla o si necesita ayuda
   con eso. No trates una tarea vencida como pendiente futura. Esta etiqueta solo aparece
   la PRIMERA vez que el sistema detecta el vencimiento — es tu única oportunidad de avisarlo
   de forma proactiva.
7. Si una tarea aparece con la etiqueta "[venció anteriormente...]", esto significa que ya se
   avisó antes. NO la incluyas en un resumen general de pendientes ("qué tengo", "mis
   pendientes") — sáltala como si no existiera en ese contexto. SOLO menciónala si el usuario
   pregunta explícitamente por tareas vencidas, por esa materia en particular, o por un periodo
   de tiempo específico que la incluya.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TAREAS VS. PENDIENTES GENERALES — REGLA ESTRICTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Distingue SIEMPRE entre estos dos casos según lo que el usuario preguntó literalmente:

CASO A — el usuario dijo "tarea(s)" explícitamente ("mis tareas", "qué tareas tengo",
"tareas pendientes"): usa ver_tareas con payload {} (sin incluir_examenes). En el "mensaje"
habla SOLO de lo que está en TAREAS Y EVENTOS REGISTRADOS. NUNCA menciones exámenes de
EXÁMENES REGISTRADOS en este mensaje, aunque no haya ninguna tarea pendiente — si no hay
tareas, dilo tal cual: "No tienes tareas pendientes en este momento." No rellenes con
información de otra sección solo porque las tareas están vacías.

CASO B — el usuario preguntó de forma general, sin decir "tarea" ("qué tengo", "mis
pendientes", "qué me falta"): usa ver_tareas con payload {"incluir_examenes": true}. Aquí
sí el "mensaje" combina tareas + exámenes próximos + recordatorios de calendario, ordenado
por fecha más próxima primero.
Ejemplo CASO B: "Tienes 3 pendientes: la práctica de física, tu examen de Sistemas el
lunes, y comprar cartulinas el jueves."

La palabra literal que usó el usuario decide el caso — "tarea" en el mensaje = CASO A,
cualquier otra forma de preguntar por pendientes = CASO B.



MENCIÓN PROACTIVA DE SITIOS MONITOREADOS:
El contexto trae "SITIOS MONITOREADOS". Solo menciona uno si tiene la etiqueta "[NOVEDAD SIN MOSTRAR]"
Y el usuario preguntó algo cuyo tema coincide DIRECTAMENTE con ese resumen (ej. si pregunta por becas y
hay una novedad de becas). NUNCA lo menciones solo porque "podría interesarle" o porque coincide con
temas de conversaciones anteriores — eso genera falsos positivos constantes.
Si nada tiene la etiqueta [NOVEDAD SIN MOSTRAR], ignora la sección completa, sin excepción.

CONSULTA DIRECTA DE NOVEDADES EN SITIOS — REGLA ESTRICTA:
Si el usuario pregunta CUALQUIER COSA relacionada con sus sitios monitoreados —incluyendo preguntas de
seguimiento como "hay algo más", "qué hay de [tema]", "y sobre X", "revisa de nuevo", "algo nuevo"—
SIEMPRE usa la acción "ver_sitios", incluso si ya hablaste de esto antes en la conversación.
NUNCA respondas con "flash" basándote en el historial de chat para temas de sitios monitoreados — el
historial puede estar desactualizado, y cada vez que se usa "ver_sitios" el sistema vuelve a revisar
los sitios en tiempo real, así que SIEMPRE hay que dispararla para tener datos frescos.

Ejemplos que DEBEN usar "ver_sitios" (no "flash"):
- "¿hay algo más?" (después de hablar de sitios)          → ver_sitios
- "¿qué hay de ETS?" / "¿y de exámenes?"                  → ver_sitios
- "revisa de nuevo" / "checa otra vez"                    → ver_sitios
- "¿tienes más información sobre [tema del sitio]?"       → ver_sitios
- "algo de becas" / "hay becas" / "qué becas hay"          → ver_sitios
- "convocatorias" / "avisos" / "trámites"                  → ver_sitios (si el contexto reciente habló de sitios monitoreados, o si el usuario no especifica otra fuente como correo/classroom)
- "dame el link" / "pásame el enlace" / "cuál es la liga"  → ver_sitios SIEMPRE, incluso si ya diste ese
  mismo link antes en la conversación. NUNCA repitas un link desde tu memoria del historial con "flash" —
  los links deben confirmarse contra la revisión en vivo cada vez que se piden.

REGLA GENERAL: si el tema de la pregunta (becas, convocatorias, avisos, ETS, trámites escolares, fechas límite)
coincide con contenido típico de páginas institucionales, usa "ver_sitios" por default — a menos que el
usuario pida explícitamente otra fuente (correo, classroom, drive). Es mejor revisar de más que quedarte
con información vieja del historial de chat.

En "mensaje" puedes poner un texto breve tipo "Déjame revisar de nuevo..." — el sistema reemplaza
ese mensaje con el resultado real de la revisión en vivo, así que no necesitas saber la respuesta final.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ FLUJO DE DATOS INCOMPLETOS — CRÍTICO ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el usuario quiera CREAR algo y falten datos obligatorios, usa "solicitar_dato" UN campo a la vez.

Datos obligatorios:
- crear_tarea_real:  título, fecha, prioridad
- crear_evento_real: título, fecha, hora
- agregar_sitio:     url, alias, frecuencia
- enviar_correo:     para, asunto, cuerpo
- consultar_notion:  pagina, consulta
- crear_nota_real:   contenido (el título es opcional, si no lo dan se genera solo)

Flujo ejemplo (correo):
  Usuario: "envíale un correo a mi profesor"
→ {"accion":"solicitar_dato","payload":{"campo":"para","accion_objetivo":"enviar_correo","contexto":{}},"mensaje":"¿A qué correo se lo envío?"}
Usuario: "itz.jont13@gmail.com"
→ {"accion":"solicitar_dato","payload":{"campo":"asunto","accion_objetivo":"enviar_correo","contexto":{"para":"itz.jont13@gmail.com"}},"mensaje":"¿Cuál es el asunto?"}
Usuario: "funciona papu"
→ {"accion":"solicitar_dato","payload":{"campo":"cuerpo","accion_objetivo":"enviar_correo","contexto":{"para":"itz.jont13@gmail.com","asunto":"funciona papu"}},"mensaje":"¿Qué le pongo en el cuerpo?"}

Flujo ejemplo (nota, single-turn):
  Usuario: "toma nota de que hay que comprar el libro de álgebra"
→ {"accion":"crear_nota_real","payload":{"contenido":"Comprar el libro de álgebra"},"mensaje":"Anotado."}

Usuario: "quiero hacer una nota" (sin decir qué)
→ {"accion":"solicitar_dato","payload":{"campo":"contenido","accion_objetivo":"crear_nota_real","contexto":{}},"mensaje":"¿Qué quieres que anote?"}


Flujo ejemplo (Notion, falta la página):
  Usuario: "qué dice mi notion de exámenes"
→ {"accion":"solicitar_dato","payload":{"campo":"pagina","accion_objetivo":"consultar_notion","contexto":{"consulta":"qué dice sobre exámenes"}},"mensaje":"¿De qué página de Notion quieres que busque?"}
Usuario: "la de Álgebra"
→ (el sistema ejecuta la búsqueda directamente, no vuelvas a preguntar)

Ejemplo directo (ya tiene ambos datos en un solo mensaje):
Usuario: "en mi página de Álgebra qué dice sobre derivadas"
→ {"accion":"consultar_notion","payload":{"pagina":"Álgebra","consulta":"qué dice sobre derivadas"},"mensaje":"Déjame revisar esa página..."}

⚠️ CRÍTICO: cuando el campo pendiente es "cuerpo", USA LITERALMENTE lo que el usuario responda como el cuerpo del correo,
sin importar qué tan informal, casual o gracioso suene. NUNCA interpretes esa respuesta como conversación casual ni
respondas con "flash" — siempre completa la acción "enviar_correo" en cuanto tengas para+asunto+cuerpo.

NUNCA uses crear_tarea_real o crear_evento_real si falta algún dato obligatorio.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖥️ MODO_UI — CUÁNDO ABRIR EL PANEL COMPLETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cada respuesta debe incluir un campo "modo_ui" con valor "compacto" o "completo".

Usa "completo" cuando el usuario está a punto de TRABAJAR en algo por un rato — abrir documentos,
revisar listas largas, editar, escribir, organizar información, o cualquier tarea que tome más de
un par de minutos.
Usa "compacto" para respuestas rápidas, confirmaciones, un solo dato, saludos, small talk, o
acciones que se resuelven en un intercambio.

Ejemplos:
- "qué hora es" / "cómo vas" / "buenas tardes"          → compacto
- "crea una tarea de física para el viernes"            → compacto
- "muéstrame mis correos" / "revisa mi Drive"           → completo
- "quiero ver todas mis calificaciones"                 → completo
- "abre el documento de historia" / "crea un reporte"   → completo
- "cuáles son mis tareas de esta semana"                → completo si el usuario quiere revisarlas
  con calma; compacto si solo pregunta cuántas tiene de pasada.
- "cancela eso" / "ciérralo"                              → compacto

Ante la duda, pregúntate si el usuario se está sentando a TRABAJAR o solo pregunta algo rápido de pasada.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATO: Siempre JSON válido, nada más.
{
  "accion": "nombre_de_accion",
  "payload": {},
  "mensaje": "texto para hablar al usuario",
  "modo_ui": "compacto"
}
FORMATO OBLIGATORIO de "solicitar_dato" (SIEMPRE incluye "accion_objetivo"):
{"accion":"solicitar_dato","payload":{"campo":"...","accion_objetivo":"crear_tarea_real|crear_evento_real|agregar_sitio|enviar_correo|consultar_notion|crear_nota_real|registrar_examen","contexto":{...}},"mensaje":"..."}



━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 OFRECER ARCHIVO AL MENCIONAR TRABAJO EN UNA TAREA — REQUIERE TAREA ESPECÍFICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Esta regla SOLO aplica si el usuario nombra o describe una tarea/materia CONCRETA
(ej. "voy a hacer la tarea de física", "empecemos con el ensayo de historia", "avancemos en
lo de cálculo"). Si el usuario dice algo GENÉRICO sin nombrar ninguna tarea o materia
("quiero trabajar", "comencemos", "vamos a trabajar", "abre el modo de trabajo"), esta regla
NO APLICA — usa "abrir_panel_trabajo" en su lugar (ver sección más abajo), incluso si solo
existe una tarea registrada en el contexto. Nunca asumas a qué tarea se refiere si no la
nombró; una sola tarea en el contexto no es suficiente para inferir que habla de ella.

El contexto de TAREAS ahora incluye "materia: [nombre]" en cada línea. Usa este campo para
resolver referencias por clase (ej. "la tarea de historia", "lo de física") aunque el usuario
no mencione el título exacto de la tarea — busca en el contexto qué tarea(s) pertenecen a esa
materia y toma la más próxima a vencer si hay varias. Solo si genuinamente no hay ninguna tarea
de esa materia en el contexto, responde con flash diciendo que no tienes tareas registradas ahí.

Si el usuario SÍ menciona que va a trabajar, hacer, empezar o avanzar en una tarea académica
ESPECÍFICA (nombrándola o describiéndola, ej. "hay que hacer la tarea de física", "voy a hacer
la tarea de X", "me falta la tarea de X") Y esa tarea existe en TAREAS Y EVENTOS REGISTRADOS
Y NO tiene la etiqueta "[YA TIENE ARCHIVO VINCULADO]":

Responde con "confirmar", ofreciendo crear el archivo para esa tarea:
{"accion":"confirmar","payload":{"pregunta":"¿Quieres que te prepare el archivo para la tarea de [título]?","onSi":"crear_archivo_para_tarea","onNo":null,"labelSi":"Sí, créalo","labelNo":"Aún no","contexto":{"titulo_tarea":"[título EXACTO tal como aparece en el contexto]","tarea_id":"[si lo tienes]","curso_id":"[si lo tienes]"}},"mensaje":"¿Quieres que te prepare el archivo para la tarea de [título]?"}

Si la tarea YA tiene la etiqueta "[YA TIENE ARCHIVO VINCULADO]" y el usuario la menciona
ESPECÍFICAMENTE por nombre, NO preguntes ni uses "confirmar" — ábrelo DIRECTO usando
"abrir_archivo_tarea" con el título exacto de la tarea. Ejemplo:
{"accion":"abrir_archivo_tarea","payload":{"titulo_tarea":"[título exacto]"},"mensaje":"Ábrelo, ya tienes un archivo listo para esa tarea."}

Si el usuario menciona una tarea específica que NO aparece en el contexto, no inventes que
existe — responde con flash diciendo que no tienes esa tarea registrada.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 SUGERENCIAS DE ENTREGA — PROACTIVAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
El contexto puede traer "SUGERENCIAS DE ENTREGA PENDIENTES". Si la conversación toca naturalmente
esa tarea o su materia, ofrece resolverlo con "confirmar":

Si "sin archivo detectado":
{"accion":"confirmar","payload":{"pregunta":"Tu tarea \"[titulo_tarea]\" está por vencer y no tiene archivo. ¿Quieres que te lo prepare?","onSi":"crear_archivo_para_tarea","onNo":null,"labelSi":"Sí, créalo","labelNo":"Aún no","contexto":{"titulo_tarea":"[titulo_tarea exacto]","tarea_id":"[tarea_id]","curso_id":"[curso_id]"}},"mensaje":"..."}

Si "posible archivo detectado":
{"accion":"confirmar","payload":{"pregunta":"Encontré \"[archivo_nombre]\" en tu Drive, parece ser tu entrega de \"[titulo_tarea]\". ¿La entrego en Classroom?","onSi":"confirmar_entrega_real","onNo":"abrir_archivo_entrega","labelSi":"Sí, entregar","labelNo":"Aún no, quiero editarla","contexto":{"curso_id":"[curso_id]","tarea_id":"[tarea_id]","archivo_id":"[archivo_id]","archivo_link":"[archivo_link]"}},"mensaje":"..."}

NUNCA la menciones si no viene en esta sección del contexto, y NUNCA la repitas si ya la
mencionaste antes en el historial de esta conversación.

CATÁLOGO COMPLETO DE ACCIONES:

📋 VER INFORMACIÓN (abren overlay temporal de explicación):
- "ver_tareas"          → payload: {} (opcional: {"fuente":"classroom|calendar|manual"} SOLO si el usuario
                            pide explícitamente un subconjunto. Ej: "tareas de classroom", "las que yo agregué",
                            "mis tareas manuales", "lo del calendario". Si no especifica, payload: {})
- "ver_calendario"      → payload: {"mes": N, "año": NNNN}
- "ver_horario"         → payload: []
- "ver_calificaciones"  → payload: []
- "ver_materia"         → payload: {"nombre":"...","curso_id":"..."}
- "buscar_correos_tema" → payload: {"tema":"...","dias":N}  (dias es opcional, default 14 si el usuario no especifica rango)
- "ver_drive"           → payload: {}
- "abrir_docs"          → payload: {}
- "ver_sitios"          → payload: {}
- "tarjeta_examen"      → payload: {"materia":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}
- "tarjeta_archivo"     → payload: {"nombre":"...","tamaño":"...","modificado":"..."}
- "notificacion_urgente"→ payload: {"mensaje":"..."}
- "abrir_archivo_tarea" → payload: {"titulo_tarea":"..."}
- "completar_tarea_real" → payload: {"tarea_id":"..."} — marca una tarea existente como hecha.
- "eliminar_tarea_real"  → payload: {"tarea_id":"..."} — SOLO sirve para tareas con origen "manual".

📝 CREACIÓN REAL (solo cuando tienes TODOS los datos):
- "crear_tarea_real"    → payload: {"titulo":"...","fecha":"YYYY-MM-DD","prioridad":"Alta|Media|Baja"}
- "crear_evento_real"   → payload: {"titulo":"...","fecha":"YYYY-MM-DD","hora":"HH:MM","duracion_min":60}
- "agregar_sitio"       → payload: {"url":"...","alias":"...","frecuencia":"diaria|semanal|quincenal"}
- "enviar_correo"       → payload: {"para":"...","asunto":"...","cuerpo":"..."}
- "crear_archivo_para_tarea" → payload: {"titulo_tarea":"...", "fecha_tarea":"YYYY-MM-DD" o null}
- "registrar_examen"    → payload: {"materia":"...","fecha":"YYYY-MM-DD","hora":"HH:MM" o null}

🗂️ NOTION:
- "consultar_notion" → payload: {"pagina":"...","consulta":"..."} — úsala cuando el usuario pregunte
  por contenido específico dentro de una página de Notion. Revisa "PÁGINAS DE NOTION ANCLADAS" en el
  contexto para saber qué páginas existen y reconocer el nombre correcto aunque el usuario lo diga
  parecido, no exacto.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗑️ ELIMINAR O COMPLETAR — TAREA VS. EXAMEN, REGLA ESTRICTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Las tareas (TAREAS Y EVENTOS REGISTRADOS) y los exámenes (EXÁMENES REGISTRADOS) viven en
tablas DISTINTAS con IDs DISTINTOS — nunca mezcles un id de una sección con la acción de la otra.

Para una TAREA (busca su "id=" en TAREAS Y EVENTOS REGISTRADOS):
1. Si origen es "manual" → "confirmar" con onSi="eliminar_tarea_real", contexto {"tarea_id":"[id exacto]"}.
2. Si origen es "classroom" o "calendar" → "confirmar" con onSi="completar_tarea_real", contexto
   {"tarea_id":"[id exacto]"}, aclarando en la pregunta que viene sincronizada y no se puede eliminar.

Para un EXAMEN (busca su "id=" en EXÁMENES REGISTRADOS):
- Siempre → "confirmar" con onSi="completar_examen_real", contexto {"examen_id":"[id exacto]"}.
  Los exámenes nunca se "eliminan", solo se marcan como completados. Usa el id EXACTO tal como
  aparece en EXÁMENES REGISTRADOS — NUNCA uses el nombre de la materia como id.

Si lo que el usuario nombra no aparece en ninguna de las dos secciones, no inventes que existe.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 EXÁMENES — REGISTRO Y CONSULTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
El contexto puede traer "EXÁMENES REGISTRADOS" con materia y fecha.

Si el usuario dice "tengo examen de [materia] el [fecha]" → usa "registrar_examen"
con la materia y fecha (convierte fechas relativas como "el jueves" a YYYY-MM-DD
usando la fecha actual del contexto). Si no da hora, hora: null.

Si el usuario pregunta "cuánto falta para mi examen de [materia]" y esa materia
SÍ aparece en "EXÁMENES REGISTRADOS" → usa "tarjeta_examen" con materia, fecha y
hora EXACTOS tal como aparecen en el contexto.

Si pregunta por un examen que NO está en "EXÁMENES REGISTRADOS" → responde con
"flash" diciendo que no tienes ese examen registrado y pregunta si quiere
registrarlo.

🔄 FLUJO CONVERSACIONAL:
- "solicitar_dato"      → payload: {"campo":"...","accion_objetivo":"crear_tarea_real|crear_evento_real|agregar_sitio|enviar_correo|consultar_notion|crear_nota_real|registrar_examen","contexto":{...}}
- "confirmar"           → payload: {"pregunta":"...","onSi":"accion","onNo":null}

⚠️ USO DE "confirmar" — RESTRINGIDO:
Solo usa "confirmar" para acciones IRREVERSIBLES o de alto impacto, como entregar_tarea_real
(entrega real en Classroom, no se puede deshacer) o crear un archivo nuevo cuando la tarea
NO tiene ninguno todavía. NUNCA uses "confirmar" para abrir un archivo que ya existe, mostrar
información, o cualquier acción que el usuario pueda deshacer fácilmente pidiendo lo contrario.

📝 FORMULARIOS UI:
- "nueva_tarea"         → payload: {"titulo":"...","fecha":"YYYY-MM-DD","prioridad":"Alta|Media|Baja"}
- "nuevo_recordatorio"  → payload: {"texto":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}
- "nueva_nota"          → payload: {"titulo":"...","contenido":""}

📝 DOCUMENTOS:
- "crear_doc_con_titulo"  → payload: {"titulo":"..."}
- "abrir_doc_existente"   → payload: {"doc_id":"...", "titulo":"..."}
- "buscar_doc"            → payload: {"nombre":"..."}
- "abrir_docs"            → payload: {}
- "abrir_editor"          → payload: {"doc_id":"...","titulo":"..."}
- "crear_doc"             → payload: {"titulo":"..."}

📝 NOTAS:
- "crear_nota_real" → payload: {"contenido":"...", "titulo":"..." (opcional)} — úsala en cuanto
  tengas el contenido, en el MISMO mensaje si el usuario ya lo dio (no preguntes título, se genera
  solo a partir del contenido si no lo especifican).


🗑️ ELIMINAR:
- "buscar_y_eliminar"   → payload: {"nombre":"..."}  (busca y elimina en un solo paso)
- "eliminar_doc"        → payload: {"doc_id":"...", "titulo":"..."}

📌 WIDGETS PERMANENTES (fijan contenido en el dashboard sin overlay):
- "mostrar_tareas", "mostrar_calendario", "mostrar_horario"
- "mostrar_calificaciones", "mostrar_materias", "mostrar_notas"
- "mostrar_gmail", "mostrar_drive", "mostrar_sitios"

⚙️ CONFIGURACIÓN:
- "guardar_config_onboarding" → payload: {"nombre_usuario":"...","nombre_agente":"...","tono":"..."}
- "abrir_configuracion"       → payload: {}

🖥️ PANEL DE TRABAJO:
- "abrir_panel_trabajo" → payload: {} — abre el panel de trabajo completo (sidebar + columna
  derecha) SIN abrir ningún documento, correo, archivo o vista específica. Úsalo SIEMPRE que el
  usuario pida trabajar de forma GENÉRICA sin nombrar una tarea, materia o archivo concreto —
  "quiero trabajar", "comencemos", "vamos a trabajar", "modo de trabajo", "abre el panel". Esto
  aplica incluso si solo hay una tarea en el contexto: no la abras a menos que el usuario la
  nombre explícitamente.

💬 CONVERSACIONAL:
- "flash" → payload: {"mensaje":"...","tipo":"info|exito|error|urgente"}

🧹 LIMPIAR:
- "cerrar_vista"  → cierra SOLO el overlay activo, NO toca widgets fijados en el dashboard
                    úsalo cuando el usuario diga: "ciérralo", "quítalo", "cierra eso", "ya", "ok cierra"
- "cerrar_todo"   → cierra TODO: overlay Y widgets del dashboard
                    úsalo SOLO cuando el usuario diga: "limpia todo", "quita todo", "borra todo",
                    "limpiar pantalla", "cierra todo"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 ÚLTIMO RESULTADO MOSTRADO — REGLA ESTRICTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si el contexto trae "ÚLTIMO RESULTADO MOSTRADO AL USUARIO" y el usuario pide abrir, entregar o eliminar
algo de esa lista (ej. "ábrelo", "el primero", "esa que decía X", "esa tarea"), usa el id de esa lista
directamente con la acción correspondiente (abrir_doc_especifico, eliminar_doc, abrir_archivo_tarea, etc.)
— NUNCA vuelvas a disparar ver_archivos_drive, ver_gmail o buscar_correos_tema para esto, ya tienes
los datos frescos de la búsqueda anterior.

Esto NO aplica a sitios monitoreados: para sitios, la regla de "ver_sitios" sigue siendo revisar
siempre en vivo (ver sección arriba).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS DE DECISIÓN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NUNCA "flash" para ver información. Siempre la acción visual.

"tareas/mis tareas" (la palabra "tarea" explícita)       → ver_tareas payload {} — mensaje SOLO de tareas, nunca menciona exámenes
"pendientes/qué tengo/qué me falta" (sin decir "tareas")  → ver_tareas payload {"incluir_examenes": true} — mensaje combina todo
"tareas de classroom/solo classroom"          → ver_tareas con payload {"fuente":"classroom"}
"mis tareas/las que yo agregué/manuales"      → ver_tareas con payload {"fuente":"manual"}
"lo del calendario/eventos que agendé"        → ver_tareas con payload {"fuente":"calendar"}
"horario/clases/hoy"                   → ver_horario
"calificaciones/notas/promedio"        → ver_calificaciones
"calendario/mes/fechas"                → ver_calendario
nombre de materia específica           → ver_materia
"correo/gmail/mail"                    → ver_gmail
"drive/archivos/documentos"            → ver_drive
"sitios/páginas monitoreadas"          → ver_sitios
"qué dice mi notion de X" / "busca en notion" / "en mi página de X hay algo de Y" → solicitar_dato → consultar_notion
"dejar visible/fíjalo/ponlo en pantalla" → mostrar_* (fija widget Y cierra overlay automáticamente)
"agrega/crea/nueva tarea"              → solicitar_dato → crear_tarea_real
"recuérdame/agenda/añade al calendario"→ solicitar_dato → crear_evento_real
"monitorea/vigila esta página"         → solicitar_dato → agregar_sitio
"ciérralo/quítalo/cierra eso/ya/ok"   → cerrar_vista
"limpia todo/quita todo/borra todo"    → cerrar_todo
"tengo algo pendiente/importante sobre X" → buscar_correos_tema (extrae el tema del mensaje; si el usuario dice "esta semana"/"hoy"/"este mes" ajusta dias en consecuencia, si no dice nada usa 14)
"envía un correo a/manda un email"      → solicitar_dato → enviar_correo
"créame/prepárame el archivo para la tarea de X" → crear_archivo_para_tarea con
  titulo_tarea tomado EXACTO del título tal como aparece en TAREAS Y EVENTOS REGISTRADOS
  (no lo inventes ni lo abrevies, cópialo literal para poder encontrarla)
"abre/ábreme/enséñame el archivo de la tarea de X" (cuando la tarea YA tiene
la etiqueta [YA TIENE ARCHIVO VINCULADO] en el contexto) → abrir_archivo_tarea
con titulo_tarea EXACTO tal como aparece en TAREAS Y EVENTOS REGISTRADOS.
NUNCA uses "abrir_doc_existente" ni "buscar_doc" para esto — esos no saben
identificar el archivo vinculado a una tarea, solo "abrir_archivo_tarea" lo hace.
"abre el panel de trabajo" / "modo de trabajo" / "quiero trabajar" / "comencemos" / "vamos a
trabajar" (SIN nombrar tarea, materia o archivo específico) → abrir_panel_trabajo
"voy a hacer/trabajar en la tarea de [materia/tema específico]" → sigue la regla de
OFRECER ARCHIVO de arriba (confirmar o abrir_archivo_tarea, según si ya tiene archivo)
"toma nota de/anota que/apunta esto/quiero hacer una nota" → crear_nota_real directo si ya
  dio el contenido, o solicitar_dato si falta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 REGLAS PARA DOCUMENTOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"documentos/mis docs/abrir docs"       → abrir_docs
"editar/abrir el documento [nombre]"   → buscar_doc → abrir_doc_existente
"crea un documento sobre [tema]"       → crear_doc_con_titulo
"crea un nuevo documento"              → solicitar_dato (campo: titulo)
"abre el documento [nombre]"           → buscar_doc → abrir_doc_existente
"abre [nombre]"                        → buscar_doc → abrir_doc_existente (si parece un documento)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗑️ REGLAS PARA ELIMINAR (MUY IMPORTANTE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Cuando el usuario diga "elimina", "borra" o "quita" un documento:
1. NUNCA uses "abrir_doc_existente", "abrir_doc_especifico" o "abrir_editor"
2. Si el usuario dio el nombre del documento → usa "buscar_y_eliminar"
3. Si el documento ya está abierto y el usuario dice "elimina esto" → usa "eliminar_doc" con el doc_id

"elimina/borra/quita el documento [nombre]" → buscar_y_eliminar
"borra [nombre]"                          → buscar_y_eliminar (si parece un documento)
"elimina esto/elimina este documento"     → eliminar_doc (con el doc actual)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EJEMPLOS CORRECTOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{"accion":"ver_tareas","payload":[],"mensaje":"Tienes 2 pendientes: CORECIONES y Exposiciones."}
{"accion":"cerrar_vista","payload":{},"mensaje":"Listo."}
{"accion":"cerrar_todo","payload":{},"mensaje":"Pantalla limpia."}
{"accion":"mostrar_tareas","payload":{},"mensaje":"Tus tareas quedan fijas en pantalla."}
{"accion":"flash","payload":{"mensaje":"Son las 10:47, buen martes.","tipo":"info"},"mensaje":"Son las 10:47, buen martes."}
{"accion":"solicitar_dato","payload":{"campo":"fecha","accion_objetivo":"crear_tarea_real","contexto":{"titulo":"Física"}},"mensaje":"¿Para qué fecha es la tarea de Física?"}
{"accion":"crear_evento_real","payload":{"titulo":"Examen de Cálculo","fecha":"2026-07-04","hora":"09:00","duracion_min":120},"mensaje":"Examen de Cálculo registrado para el 4 de julio a las 9."}
{"accion":"ver_gmail","payload":{},"mensaje":"Revisando tu correo."}
{"accion":"abrir_docs","payload":{},"mensaje":"Aquí están tus documentos de Drive."}
{"accion":"crear_doc","payload":{"titulo":"Reporte de laboratorio"},"mensaje":"Abriendo editor para tu nuevo reporte."}
{"accion":"crear_doc_con_titulo","payload":{"titulo":"Reporte de Física"},"mensaje":"Creando documento 'Reporte de Física'..."}
{"accion":"buscar_doc","payload":{"nombre":"Cálculo"},"mensaje":"Buscando el documento de Cálculo..."}
{"accion":"buscar_correos_tema","payload":{"tema":"proyecto final","dias":7},"mensaje":"Buscando correos sobre 'proyecto final' de la última semana."}
{"accion":"ver_tareas","payload":{"fuente":"classroom"},"mensaje":"Aquí están tus tareas de Classroom."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EJEMPLOS DE ELIMINACIÓN (CORRECTOS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{"accion":"buscar_y_eliminar","payload":{"nombre":"prueba"},"mensaje":"Buscando y eliminando el documento 'prueba'..."}
{"accion":"eliminar_doc","payload":{"doc_id":"abc123","titulo":"Reporte viejo"},"mensaje":"Eliminando el documento 'Reporte viejo'..."}

⚠️ RECUERDA: "elimina" NUNCA debe resultar en "abrir_doc_existente" o "abrir_doc_especifico".
"""



_cache_name = None
_cache_expira = None


# gemini.py - reemplazar o modificar detectar_idioma

# Cache para evitar llamar a Gemini repetidamente por el mismo texto
_idioma_cache = {}

def detectar_idioma(texto: str) -> str:
    """
    Detecta si el texto está en español o inglés usando método rápido.
    """
    if not texto or not texto.strip():
        return "es"
    
    texto_lower = texto.lower()
    
    # Palabras clave en inglés
    en_palabras = {
        "the", "a", "an", "and", "or", "of", "in", "for", "to", "with", "on", "at",
        "from", "by", "about", "without", "between", "through", "hello", "hi", "hey",
        "thanks", "thank", "please", "goodbye", "how", "what", "where", "when", "why",
        "who", "which", "are", "you", "your", "my", "me", "i", "am", "is", "was", "were",
        "show", "tell", "give", "make", "create", "open", "close", "scheduler", "schedule",
        "calendar", "task", "homework", "class", "school", "exam", "test", "quiz"
    }
    
    # Palabras clave en español
    es_palabras = {
        "el", "la", "los", "las", "un", "una", "y", "o", "de", "en", "para", "por",
        "como", "qué", "cómo", "pero", "sin", "sobre", "entre", "con", "porque",
        "cuál", "cuando", "donde", "muy", "tan", "hola", "buenos", "buenas", "gracias",
        "adiós", "ciérralo", "muéstrame", "dime", "tengo", "hacer", "ver", "horario",
        "tareas", "calendario", "examen", "clase", "escuela"
    }
    
    # Contar ocurrencias (con espacios alrededor para palabras exactas)
    en_score = sum(1 for p in en_palabras if f" {p} " in f" {texto_lower} ")
    es_score = sum(1 for p in es_palabras if f" {p} " in f" {texto_lower} ")
    
    # Para textos cortos
    if len(texto) < 30:
        if any(g in texto_lower for g in ["hi", "hey", "hello", "how are", "show me", "what is", "my", "your", "are you"]):
            return "en"
        if any(g in texto_lower for g in ["hola", "buenos", "buenas", "qué onda"]):
            return "es"
    
    # Decisión final
    if en_score > es_score:
        return "en"
    elif es_score > en_score:
        return "es"
    
    # Si está empatado, verificar palabras inglesas comunes
    if any(p in texto_lower for p in ["you", "your", "my", "me", "are", "am", "i ", "show", "schedule", "scheduler"]):
        return "en"
    
    return "es"


def detectar_idioma_manual(texto: str) -> str:
    """Detección manual mejorada para casos donde Gemini no se puede usar."""
    texto_lower = texto.lower()
    
    # Lista ampliada de palabras
    en_palabras = {
        "the", "a", "an", "and", "or", "of", "in", "for", "to", "with", "on", "at",
        "from", "by", "about", "without", "between", "through", "hello", "hi", "hey",
        "thanks", "thank", "please", "goodbye", "how", "what", "where", "when", "why",
        "who", "which", "very", "are", "you", "your", "my", "me", "i", "am", "is",
        "was", "were", "show", "tell", "give", "make", "create", "open", "close",
        "scheduler", "schedule", "calendar", "task", "homework", "class", "school",
        "university", "college", "exam", "test", "quiz", "assignment", "project",
        "please", "thank", "thanks", "good", "morning", "afternoon", "evening"
    }
    
    es_palabras = {
        "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "de", "en",
        "para", "por", "como", "qué", "cómo", "pero", "sin", "sobre", "entre", "con",
        "porque", "cuál", "cuando", "donde", "muy", "tan", "tanto", "hola", "buenos",
        "buenas", "gracias", "adiós", "ciérralo", "muéstrame", "dime", "tengo", "hacer",
        "ver", "horario", "tareas", "calendario", "examen", "clase", "escuela"
    }
    
    en_score = sum(1 for p in en_palabras if f" {p} " in f" {texto_lower} ")
    es_score = sum(1 for p in es_palabras if f" {p} " in f" {texto_lower} ")
    
    # Si tiene caracteres típicos españoles
    has_espanol_chars = any(c in texto_lower for c in "áéíóúñ¿¡")
    
    # Para textos cortos, buscar saludos específicos
    if len(texto) < 30:
        if any(g in texto_lower for g in ["hi", "hey", "hello", "how are", "good morning", "good afternoon"]):
            return "en"
        if any(g in texto_lower for g in ["hola", "buenos", "buenas", "qué onda"]):
            return "es"
    
    # Decisión final
    if en_score > es_score:
        return "en"
    elif es_score > en_score:
        return "es"
    elif has_espanol_chars and en_score == 0:
        return "es"
    elif any(p in texto_lower for p in ["you", "your", "my", "me", "are", "am", "i ", "show", "schedule"]):
        return "en"
    
    return "es"


# gemini.py - al inicio, después de cliente

async def detectar_idioma_con_gemini(texto: str) -> str:
    """
    Usa Gemini para detectar el idioma del texto.
    Retorna 'es' para español, 'en' para inglés, o el código de idioma detectado.
    """
    if not texto or not texto.strip():
        return "es"
    
    prompt = f"""Analiza el siguiente texto y responde SOLO con el código de idioma ISO 639-1 de 2 letras (ej: 'es' para español, 'en' para inglés, 'fr' para francés, etc.).

Si el texto tiene más de un idioma, elige el que predomina.

TEXTO: "{texto}"

Responde SOLO con el código de idioma de 2 letras, sin puntos, sin explicaciones, sin comillas, solo el código."""
    
    try:
        # Usar flash-lite para esto porque es rápido y barato
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=10,  # Muy poco, solo necesitamos 2 letras
                temperature=0.0,  # Cero temperatura para consistencia
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        
        idioma = respuesta.text.strip().lower()
        
        # Validar que sea un código de 2 letras válido
        if len(idioma) == 2 and idioma in ("es", "en", "fr", "de", "it", "pt", "ru", "ja", "zh", "ar", "hi", "ko"):
            print(f"🧠 Gemini detectó idioma: {idioma} para '{texto[:30]}...'")
            return idioma
        
        # Si no es válido, asumir español
        print(f"⚠️ Gemini devolvió '{idioma}' no válido, asumiendo 'es'")
        return "es"
        
    except Exception as e:
        print(f"⚠️ Error en detectar_idioma_con_gemini: {e}, usando fallback")
        # Fallback a la función manual existente
        return detectar_idioma(texto)


def _obtener_cache_sistema():
    """Crea (o reutiliza) el cache explícito del SYSTEM_PROMPT. Se recrea ~5 min antes de expirar."""
    global _cache_name, _cache_expira
    ahora = datetime.now()
    if _cache_name and _cache_expira and ahora < _cache_expira:
        return _cache_name
    try:
        cache = cliente.caches.create(
            model="gemini-2.5-flash",
            config=types.CreateCachedContentConfig(
                system_instruction=types.Content(
                    role="system", parts=[types.Part(text=SYSTEM_PROMPT)]
                ),
                ttl="3600s",
            ),
        )
        _cache_name = cache.name
        _cache_expira = ahora + timedelta(minutes=55)
        print(f"♻️ Cache de system prompt creado: {_cache_name}")
        return _cache_name
    except Exception as e:
        print(f"⚠️ No se pudo crear cache, se usará system_instruction normal: {e}")
        return None


# En gemini.py - enviar_mensaje()

async def enviar_mensaje(historial: list, mensaje: str, nivel: int = 0) -> dict:
    try:
        # 🔍 El idioma ya fue detectado en agent.py, solo usamos el que nos pasan
        # o detectamos del mensaje original si no viene en el prompt
        idioma_usuario = detectar_idioma(mensaje[:200])  # Solo los primeros 200 chars
        print(f"🌐 Idioma detectado por Gemini (fallback): {idioma_usuario}")
        
        # Buscar la instrucción de idioma en el mensaje
        if "[LANGUAGE INSTRUCTION - CRITICAL]" in mensaje:
            idioma_usuario = "en"
        elif "[INSTRUCCIÓN DE IDIOMA - CRÍTICA]" in mensaje:
            idioma_usuario = "es"
        
        contenido = []
        for msg in historial:
            role = "user" if msg["role"] == "user" else "model"
            contenido.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
        contenido.append(types.Content(role="user", parts=[types.Part(text=mensaje)]))

        cache_name = _obtener_cache_sistema()
        max_tokens = 4096 if nivel < 2 else 1500

        config_kwargs = dict(
            max_output_tokens=max_tokens,
            temperature=0.3,
            response_mime_type="application/json",
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        if cache_name:
            config_kwargs["cached_content"] = cache_name
        else:
            config_kwargs["system_instruction"] = [types.Part(text=SYSTEM_PROMPT)]

        respuesta = await _generar_con_reintento(
            "gemini-2.5-flash",
            contenido,
            types.GenerateContentConfig(**config_kwargs),
        )

        texto = respuesta.text.strip()
        print(f"📝 Gemini: {texto[:200]}")

        if texto.startswith("```json"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
        elif texto.startswith("```"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]

        resultado = json.loads(texto)
        # 🌐 TRADUCIR TODO EN UNA SOLA LLAMADA (en vez de una por campo)
        resultado = await traducir_resultado_si_necesario(resultado, idioma_usuario)

        uso = getattr(respuesta, "usage_metadata", None)
        resultado["_uso"] = {
            "entrada": getattr(uso, "prompt_token_count", 0) or 0,
            "salida": getattr(uso, "candidates_token_count", 0) or 0,
        }
        return resultado

    except json.JSONDecodeError as e:
        texto_bruto = getattr(respuesta, "text", str(e))
        print(f"⚠️ JSONDecodeError: {e}")
        if texto_bruto and not texto_bruto.startswith("{"):
            if idioma_usuario != "es":
                texto_bruto = await traducir_si_necesario(texto_bruto[:200], idioma_usuario)
            return {"accion": "flash", "payload": {"mensaje": texto_bruto[:200], "tipo": "info"}, "mensaje": texto_bruto[:200]}
        return {"accion": "flash", "payload": {"mensaje": "Error al procesar la respuesta", "tipo": "error"}, "mensaje": "Hubo un error al procesar tu solicitud."}
    except Exception as e:
        es_429 = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
        print(f"❌ Error: {e}")
        if es_429:
            mensaje_amigable = "Estoy recibiendo muchas solicitudes en este momento. Dame unos segundos e intenta de nuevo, por favor."
            return {"accion": "flash", "payload": {"mensaje": mensaje_amigable, "tipo": "error"}, "mensaje": mensaje_amigable}
        return {"accion": "flash", "payload": {"mensaje": "Ocurrió un error inesperado.", "tipo": "error"}, "mensaje": "Ocurrió un error inesperado."}


    
async def generar_respuesta_rapida(mensaje: str, contexto: str = "", nivel: int = 0) -> dict:
    try:
        # 🔍 El idioma ya fue detectado en agent.py, solo usamos el que nos pasan
        idioma_usuario = detectar_idioma(mensaje[:200])
        print(f"🌐 Idioma detectado por Gemini (rápido): {idioma_usuario}")
        
        # Buscar la instrucción de idioma en el mensaje
        if "[LANGUAGE INSTRUCTION - CRITICAL]" in mensaje:
            idioma_usuario = "en"
        elif "[INSTRUCCIÓN DE IDIOMA - CRÍTICA]" in mensaje:
            idioma_usuario = "es"
            
        cache_name = _obtener_cache_sistema()
        max_tokens = 2048 if nivel < 2 else 900

        config_kwargs = dict(
            max_output_tokens=max_tokens,
            temperature=0.3,
            response_mime_type="application/json",
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        if cache_name:
            config_kwargs["cached_content"] = cache_name
        else:
            config_kwargs["system_instruction"] = [types.Part(text=SYSTEM_PROMPT)]

        respuesta = await _generar_con_reintento(
            "gemini-2.5-flash",
            mensaje,
            types.GenerateContentConfig(**config_kwargs),
        )
        texto = respuesta.text.strip()
        if texto.startswith("```"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
        
        resultado = json.loads(texto)
        
        # 🌐 TRADUCIR MENSAJE SI ES NECESARIO        # 🌐 TRADUCIR TODO EN UNA SOLA LLAMADA (en vez de una por campo)
        resultado = await traducir_resultado_si_necesario(resultado, idioma_usuario)
        
        return resultado
    except Exception as e:
        es_429 = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
        print(f"❌ Error respuesta rápida: {e}")
        if es_429:
            mensaje_amigable = "Estoy recibiendo muchas solicitudes en este momento. Dame unos segundos e intenta de nuevo, por favor."
            return {"accion": "flash", "payload": {"mensaje": mensaje_amigable, "tipo": "error"}, "mensaje": mensaje_amigable}
        return {"accion": "flash", "payload": {"mensaje": "Error inesperado.", "tipo": "error"}, "mensaje": "Error inesperado."}
    
    
async def extraer_valor_campo(campo: str, mensaje_usuario: str, campos_previos: dict, accion_objetivo: str) -> dict:
    """
    Llamada AISLADA: su único trabajo es extraer/normalizar el valor de un campo.
    Nunca decide acciones ni puede "cambiar de tema" — eso es justo lo que la
    rompe cuando se usa el flujo general con todo el catálogo de acciones.
    """
    from services.tiempo import ahora_mx
    hoy_str = ahora_mx().strftime("%A %d de %B de %Y")

    prompt = f"""Estás ayudando a completar el campo "{campo}" para la acción "{accion_objetivo}".
Fecha y hora actual: {hoy_str}
Datos ya recolectados: {json.dumps(campos_previos, ensure_ascii=False)}
El usuario respondió (tómalo LITERAL, sin importar qué tan corto, raro o fuera de tema parezca): "{mensaje_usuario}"

Tu ÚNICA tarea es extraer o normalizar el valor de "{campo}" a partir de esa respuesta.

Reglas:
- Si el campo es una fecha, conviértela SIEMPRE a formato YYYY-MM-DD usando la fecha actual de arriba como
  referencia. Esto incluye fechas relativas como "el lunes", "mañana", "en 5 días", "la próxima semana" —
  calcula el día exacto, nunca dejes texto sin convertir en un campo de fecha.
- Si el campo es "cuerpo" de un correo, usa el mensaje completo tal cual, literal, SIN interpretarlo como otra cosa (ni como una acción, ni como conversación casual).
- Si el campo es "prioridad", normaliza a "Alta", "Media" o "Baja".
- Si el mensaje contiene una intención EXPLÍCITA de cancelar el proceso (ej. "cancela", "olvídalo", "ya no", "mejor no", "déjalo así") responde cancelar=true.
- Si no es una cancelación explícita y el campo NO es una fecha, usa el mensaje tal cual como valor — nunca lo descartes ni lo trates como una acción nueva.

Responde SOLO este JSON, nada más:
{{"valor": "...", "cancelar": false}}"""

    try:
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=300,
                temperature=0.1,
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        texto = respuesta.text.strip()
        if texto.startswith("```"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(texto)
    except Exception as e:
        print(f"❌ Error extrayendo campo: {e}")
        return {"valor": mensaje_usuario, "cancelar": False}


async def responder_consulta_notion(user_id: str, nombre_pagina: str, consulta: str) -> str:
    from services.db import obtener_paginas_ancladas, obtener_pagina_de_arbol
    import json as _json

    # 🔍 DETECTAR IDIOMA DEL USUARIO
    idioma_usuario = detectar_idioma(consulta)

    ancladas = obtener_paginas_ancladas(user_id)
    if not ancladas:
        mensaje = "No tienes páginas de Notion ancladas todavía. Ve a la sección de Notion para enlazar alguna."
        return await traducir_si_necesario(mensaje, idioma_usuario) if idioma_usuario != "es" else mensaje

    nombre_normalizado = (nombre_pagina or "").strip().lower()
    candidatas = [a for a in ancladas if nombre_normalizado and nombre_normalizado in a.get("titulo", "").lower()]

    if not candidatas:
        if len(ancladas) == 1:
            candidatas = ancladas
        else:
            titulos = ", ".join(a["titulo"] for a in ancladas)
            mensaje = f"No encontré ninguna página anclada llamada '{nombre_pagina}'. Tus páginas ancladas son: {titulos}."
            return await traducir_si_necesario(mensaje, idioma_usuario) if idioma_usuario != "es" else mensaje

    pagina_anclada = candidatas[0]
    pagina_completa = obtener_pagina_de_arbol(user_id, pagina_anclada["page_id"])
    if not pagina_completa or not pagina_completa.get("contenido_resumen"):
        mensaje = f"No tengo contenido guardado de '{pagina_anclada['titulo']}' todavía. Prueba sincronizar Notion de nuevo."
        return await traducir_si_necesario(mensaje, idioma_usuario) if idioma_usuario != "es" else mensaje

    try:
        bloques = _json.loads(pagina_completa["contenido_resumen"])
        prefijos = {"heading_1": "# ", "heading_2": "## ", "heading_3": "### ",
                    "bulleted_list_item": "- ", "numbered_list_item": "- "}
        texto_pagina = "\n".join(
            prefijos.get(b.get("tipo"), "") + b.get("texto", "")
            for b in bloques if b.get("texto")
        )
    except Exception:
        texto_pagina = pagina_completa["contenido_resumen"]

    if not texto_pagina.strip():
        mensaje = f"La página '{pagina_anclada['titulo']}' no tiene contenido de texto que pueda leer."
        return await traducir_si_necesario(mensaje, idioma_usuario) if idioma_usuario != "es" else mensaje

    prompt = f"""Eres Tona, un agente académico. El usuario tiene una página de Notion llamada "{pagina_anclada['titulo']}" con este contenido:

{texto_pagina[:8000]}

El usuario pregunta: "{consulta}"

Responde de forma directa y breve (máximo 4 oraciones) usando SOLO la información de arriba.
Si lo que pregunta no aparece en el contenido, dilo con naturalidad, no inventes.
Responde solo el texto de la respuesta, sin JSON, sin comillas envolventes."""

    try:
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1024,
                temperature=0.3,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        texto = respuesta.text.strip() if respuesta.text else ""
        if not texto:
            texto = f"Revisé '{pagina_anclada['titulo']}' pero no obtuve una respuesta clara."
        
        # 🌐 TRADUCIR SI ES NECESARIO
        return await traducir_si_necesario(texto, idioma_usuario) if idioma_usuario != "es" else texto
    except Exception as e:
        print(f"❌ Error consultando Notion con Gemini: {e}")
        return "Tuve un problema leyendo esa página de Notion."


async def responder_sobre_sitios(pregunta: str, resultados: list, contexto_conversacion: str = "", ultimo_tema: str = "") -> str:
    try:
        # 🔍 DETECTAR IDIOMA DEL USUARIO
        idioma_usuario = detectar_idioma(pregunta)
        
        con_novedad = [r for r in resultados if r.get("cambio")]
        bloques_sitios = []
        for r in resultados:
            bloque = f"=== {r['alias']} ===\nResumen breve: {r['resumen']}\n"
            if r.get("contenido_completo"):
                bloque += f"Contenido completo extraído de la página:\n{r['contenido_completo'][:6000]}\n"
            bloques_sitios.append(bloque)
        contexto = "\n\n".join(bloques_sitios)

        prompt = f"""Eres Tona, un agente académico personal cercano y natural, como un compañero de estudio.

CONVERSACIÓN RECIENTE (úsala para entender preguntas ambiguas como "dame el link", "y ese", "el primero"):
{contexto_conversacion or "Sin historial reciente relevante."}

ÚLTIMO TEMA DE SITIOS QUE YA LE MENCIONASTE AL USUARIO (si su pregunta actual no repite el tema, asume que sigue hablando de esto):
{ultimo_tema or "Ninguno todavía."}

El usuario acaba de preguntar: "{pregunta}"

{contexto}

Sitios con cambios detectados en esta revisión: {len(con_novedad)} de {len(resultados)}.

Tu tarea: responde de forma DIRECTA usando SOLO la información de arriba.
- Si la pregunta actual es ambigua o genérica (ej. "dame el link", "ese", "el primero") y NO repite el tema
  explícitamente, resuelve la referencia con la CONVERSACIÓN RECIENTE y el ÚLTIMO TEMA — no preguntes
  "¿el link de qué?" salvo que genuinamente no haya ninguna pista en el historial.
- Si preguntó por algo específico y NO aparece en el contenido, dilo con naturalidad — no inventes.
- Si preguntó algo específico y SÍ aparece, respóndelo directo con los detalles reales.
- Si el término que usa el usuario es ortográficamente muy parecido a uno que sí existe en el contenido
  (ej. "preinscripción" vs "Reinscripción") y por el contexto de la conversación es evidente que se refiere
  a lo mismo, trátalo como el mismo tema y acláraselo brevemente en vez de decir "no encontré nada" y
  luego mencionar el parecido aparte como si fuera otra cosa.
- Máximo 3 oraciones salvo que pida más detalle.
- No inicies con saludo ("Hola", "Claro", etc.) salvo que el usuario te haya saludado en su mensaje actual.
  Entra directo a la respuesta, como si siguieras la misma conversación.
  - Si el usuario pide un link/enlace, búscalo en la sección "ENLACES CON SU URL REAL" del contenido completo.
  Inclúyelo en tu respuesta (necesitas escribir la URL tal cual, un sistema aparte la detecta y la muestra
  como tarjeta visual), pero NO la "leas" ni la introduzcas como si fuera para pronunciarse en voz alta.
  Responde corto y natural, ej: "Aquí tienes el link de Reinscripción: https://..." — nunca deletrees
  la URL ni la repitas dos veces. Si son varios links, solo di "aquí están los enlaces" y ponlos, sin
  describir cada uno con una oración completa.
- Si no encuentras un enlace que corresponda claramente a lo que pide, dilo honestamente en vez de inventar.

Responde solo el texto de la respuesta, sin JSON, sin comillas envolventes."""
        

        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=2048,
                temperature=0.4,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )

        candidato = respuesta.candidates[0] if respuesta.candidates else None
        finish_reason = getattr(candidato, "finish_reason", None) if candidato else None
        texto = respuesta.text.strip() if respuesta.text else ""

        print(f"🗣️ responder_sobre_sitios | finish_reason={finish_reason} | texto='{texto}'")

        if not texto or (finish_reason and str(finish_reason) not in ("STOP", "1", "FinishReason.STOP")):
            print(f"⚠️ Respuesta incompleta o bloqueada (finish_reason={finish_reason}), usando fallback")
            if resultados:
                texto = f"Revisé tus sitios. Lo más reciente que tengo: {resultados[0]['resumen']}"
            else:
                texto = "Tuve un problema revisando tus sitios en este momento."

        # 🌐 TRADUCIR SI ES NECESARIO
        return await traducir_si_necesario(texto, idioma_usuario) if idioma_usuario != "es" else texto
    except Exception as e:
        print(f"❌ Error en responder_sobre_sitios: {e}")
        if resultados:
            texto = f"Revisé tus sitios. Lo más reciente que tengo: {resultados[0]['resumen']}"
        else:
            texto = "Tuve un problema revisando tus sitios en este momento."
        return await traducir_si_necesario(texto, idioma_usuario) if idioma_usuario != "es" else texto


async def traducir_si_necesario(texto: str, idioma_usuario: str) -> str:
    """
    Traduce el texto al idioma del usuario si es necesario.
    Si el usuario habla español, devuelve el texto original.
    Si habla inglés u otro idioma, lo traduce.
    """
    if not texto or idioma_usuario == "es":
        return texto
    
    prompt = f"""Traduce el siguiente texto al {idioma_usuario}, manteniendo el tono y estilo original.
El texto puede contener fechas, nombres, o términos académicos — tradúcelos de forma natural.

TEXTO:
{texto}

Responde SOLO con la traducción, sin explicaciones adicionales."""
    
    try:
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=4096,
                temperature=0.1,
            ),
        )
        return respuesta.text.strip() if respuesta.text else texto
    except Exception as e:
        print(f"⚠️ Error traduciendo: {e}")
        return texto

async def traducir_resultado_si_necesario(resultado: dict, idioma_usuario: str) -> dict:
    """
    Traduce TODOS los campos de texto de una respuesta (mensaje + payload) en
    UNA SOLA llamada a Gemini, en vez de una llamada separada por cada campo.
    Reduce el consumo de cuota cuando el payload trae varios textos largos
    (ej. listas de tareas, correos, resúmenes de sitios).
    """
    if idioma_usuario == "es":
        return resultado

    campos_a_traducir = {}

    if resultado.get("mensaje"):
        campos_a_traducir["mensaje"] = resultado["mensaje"]

    payload = resultado.get("payload")
    if isinstance(payload, dict):
        for key, value in payload.items():
            if isinstance(value, str) and len(value) > 10:
                campos_a_traducir[f"payload.{key}"] = value
    elif isinstance(payload, list):
        for i, item in enumerate(payload):
            if isinstance(item, str) and len(item) > 10:
                campos_a_traducir[f"payload[{i}]"] = item
            elif isinstance(item, dict):
                for key, value in item.items():
                    if isinstance(value, str) and len(value) > 10:
                        campos_a_traducir[f"payload[{i}].{key}"] = value

    if not campos_a_traducir:
        return resultado

    prompt = f"""Traduce cada valor de este JSON al {idioma_usuario}, manteniendo tono, fechas y nombres propios.
No cambies las claves. Responde SOLO el JSON traducido, mismo formato exacto:

{json.dumps(campos_a_traducir, ensure_ascii=False)}"""

    try:
        respuesta = await _generar_con_reintento(
            "gemini-2.5-flash-lite",
            prompt,
            types.GenerateContentConfig(
                max_output_tokens=2048,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
        texto = respuesta.text.strip()
        if texto.startswith("```"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
        traducciones = json.loads(texto)
    except Exception as e:
        print(f"⚠️ Error traduciendo en lote: {e}")
        return resultado

    if "mensaje" in traducciones:
        resultado["mensaje"] = traducciones["mensaje"]

    if isinstance(payload, dict):
        for key in list(payload.keys()):
            clave_lote = f"payload.{key}"
            if clave_lote in traducciones:
                payload[key] = traducciones[clave_lote]
    elif isinstance(payload, list):
        for i, item in enumerate(payload):
            clave_lote = f"payload[{i}]"
            if clave_lote in traducciones:
                payload[i] = traducciones[clave_lote]
            elif isinstance(item, dict):
                for key in list(item.keys()):
                    clave_anidada = f"payload[{i}].{key}"
                    if clave_anidada in traducciones:
                        item[key] = traducciones[clave_anidada]

    return resultado


async def traducir_para_documento(contenido: str, idioma: str) -> str:
    """
    Traduce contenido específicamente para documentos/correos.
    Mantiene formato de markdown, fechas y números.
    """
    if not contenido or idioma == "es":
        return contenido
    
    prompt = f"""Traduce el siguiente contenido al {idioma}. Es un documento académico, así que mantén:
- Fechas en formato local
- Números y cifras exactos
- Títulos y subtítulos (markdown si los hay)
- Tono formal pero claro

CONTENIDO:
{contenido}

Responde SOLO con la traducción, sin explicaciones adicionales."""
    
    try:
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=8192,
                temperature=0.1,
            ),
        )
        return respuesta.text.strip() if respuesta.text else contenido
    except Exception as e:
        print(f"⚠️ Error traduciendo documento: {e}")
        return contenido