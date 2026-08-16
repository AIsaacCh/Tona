from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from services.auth_utils import verificar_identidad
from pydantic import BaseModel
from typing import Optional, List
from services.db import obtener_horario, guardar_horario_completo, agregar_clase_horario, eliminar_clase_horario
from config import settings
import base64
import json

router = APIRouter()


class ClaseManual(BaseModel):
    materia: str
    dia: str
    hora_inicio: str
    hora_fin: Optional[str] = None
    aula: Optional[str] = None
    profesor: Optional[str] = None


class HorarioCompleto(BaseModel):
    clases: List[ClaseManual]


# ✅ CORREGIDO - sin {user_id}
@router.get("/")
async def listar_horario(user_id: str = Depends(verificar_identidad)):
    return {"horario": obtener_horario(user_id)}


# ✅ NUEVO ENDPOINT - GET /horario (sin slash)
@router.get("")
async def obtener_horario_endpoint(user_id: str = Depends(verificar_identidad)):
    from services.db import obtener_horario
    clases = obtener_horario(user_id)
    dias_orden = {"lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5}
    agrupado = {}
    for c in clases:
        dia = (c.get("dia") or "").lower()
        agrupado.setdefault(dia, []).append({
            "materia": c.get("materia"),
            "hora_inicio": c.get("hora_inicio"),
            "hora_fin": c.get("hora_fin"),
            "aula": c.get("aula"),
        })
    for dia in agrupado:
        agrupado[dia].sort(key=lambda x: x.get("hora_inicio") or "")
    return [
        {"dia": dia.upper(), "clases": agrupado[dia]}
        for dia in sorted(agrupado.keys(), key=lambda d: dias_orden.get(d, 99))
    ]


# ✅ CORREGIDO - sin {user_id}
@router.post("/manual")
async def agregar_clase(
    body: ClaseManual,
    user_id: str = Depends(verificar_identidad)
):
    clase = agregar_clase_horario(user_id, body.model_dump())
    return {"agregada": True, "clase": clase}


# ✅ CORREGIDO - sin {user_id}
@router.delete("/{clase_id}")
async def eliminar_clase(
    clase_id: str,
    user_id: str = Depends(verificar_identidad)
):
    eliminar_clase_horario(user_id, clase_id)
    return {"eliminada": True}


# ✅ CORREGIDO - sin {user_id}
@router.post("/analizar")
async def analizar_horario_archivo(
    file: UploadFile = File(...),
    user_id: str = Depends(verificar_identidad)
):
    """
    Recibe una imagen o PDF, le pide a Gemini que extraiga el horario.
    Regresa las clases propuestas SIN guardarlas — el usuario debe confirmar.
    """
    try:
        from google import genai
        from google.genai import types

        contenido = await file.read()
        mime_type = file.content_type or "image/jpeg"

        cliente = genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION,
        )

        prompt = """Analiza esta imagen/documento de un horario escolar y extrae todas las clases.

Responde SOLO con un JSON válido con este formato exacto, sin explicaciones ni texto adicional:

{
  "clases": [
    {"materia": "Cálculo", "dia": "lunes", "hora_inicio": "07:00", "hora_fin": "09:00", "aula": "A101", "profesor": ""},
    {"materia": "Física", "dia": "lunes", "hora_inicio": "10:00", "hora_fin": "12:00", "aula": "", "profesor": ""}
  ]
}

Reglas:
- "dia" debe ser uno de: lunes, martes, miercoles, jueves, viernes, sabado
- "hora_inicio" y "hora_fin" en formato HH:MM (24 horas)
- Si no puedes leer el aula o profesor, deja el campo como string vacío ""
- Si una clase se repite varios días, crea una entrada separada por cada día
- Si no puedes identificar claramente algún dato, haz tu mejor esfuerzo basándote en el contexto visual"""

        parte_archivo = types.Part.from_bytes(data=contenido, mime_type=mime_type)

        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=[parte_archivo, prompt],
            config=types.GenerateContentConfig(
                max_output_tokens=8192,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        texto = respuesta.text.strip()
        print(f"📝 Respuesta cruda de Gemini (horario):\n{texto[:500]}")

        if texto.startswith("```json"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
        elif texto.startswith("```"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]

        try:
            resultado = json.loads(texto)
        except json.JSONDecodeError as e:
            print(f"❌ JSONDecodeError en horario: {e}")
            print(f"❌ Texto completo que falló:\n{texto}")
            raise HTTPException(
                status_code=500,
                detail="No se pudo interpretar el horario. Intenta con una imagen más clara o mejor iluminada."
            )

        return {"clases_propuestas": resultado.get("clases", [])}

    except Exception as e:
        print(f"❌ Error analizando horario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ✅ CORREGIDO - sin {user_id}
@router.post("/confirmar")
async def confirmar_horario(
    body: HorarioCompleto,
    reemplazar: bool = True,
    user_id: str = Depends(verificar_identidad)
):
    """
    Guarda las clases confirmadas por el usuario después de revisar la propuesta de la IA.
    reemplazar=True → reemplaza todo el horario existente
    reemplazar=False → solo agrega estas clases nuevas
    """
    if reemplazar:
        guardar_horario_completo(user_id, [c.model_dump() for c in body.clases])
    else:
        for c in body.clases:
            agregar_clase_horario(user_id, c.model_dump())
    return {"guardado": True, "total": len(body.clases)}


# ✅ NUEVO - endpoint para corregir clases con IA
@router.post("/corregir_clase")
async def corregir_clase(
    body: dict,
    user_id: str = Depends(verificar_identidad)
):
    """Reinterpreta UNA clase del horario según una corrección en lenguaje natural."""
    from google import genai
    from google.genai import types

    cliente = genai.Client(
        vertexai=True,
        project=settings.GOOGLE_CLOUD_PROJECT,
        location=settings.GOOGLE_CLOUD_LOCATION,
    )

    prompt = f"""Tienes esta clase de un horario escolar, ya extraída de una imagen:
{json.dumps(body.get('clase'), ensure_ascii=False)}

El usuario dio esta corrección en lenguaje natural: "{body.get('correccion', '')}"

Aplica SOLO el cambio que el usuario pide. Deja los demás campos exactamente igual.
Los horarios van en formato de 24 horas "HH:MM". Los días válidos son:
lunes, martes, miercoles, jueves, viernes, sabado.

Responde SOLO este JSON, nada más, con la clase ya corregida:
{{"materia": "...", "dia": "...", "hora_inicio": "HH:MM", "hora_fin": "HH:MM", "aula": "..."}}"""

    try:
        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=300,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
        texto = respuesta.text.strip()
        if texto.startswith("```"):
            texto = texto.split("\n", 1)[1].rsplit("```", 1)[0]
        clase_corregida = json.loads(texto)
        return {"clase": clase_corregida}
    except Exception as e:
        print(f"❌ Error corrigiendo clase: {e}")
        raise HTTPException(status_code=500, detail="No se pudo interpretar la corrección")