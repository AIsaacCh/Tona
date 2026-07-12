from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from services.db import obtener_horario, guardar_horario_completo, agregar_clase_horario, eliminar_clase_horario
from config import settings
import base64

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


@router.get("/{user_id}")
async def listar_horario(user_id: str):
    return {"horario": obtener_horario(user_id)}


@router.post("/{user_id}/manual")
async def agregar_clase(user_id: str, body: ClaseManual):
    clase = agregar_clase_horario(user_id, body.model_dump())
    return {"agregada": True, "clase": clase}


@router.delete("/{user_id}/{clase_id}")
async def eliminar_clase(user_id: str, clase_id: str):
    eliminar_clase_horario(user_id, clase_id)
    return {"eliminada": True}


@router.post("/{user_id}/analizar")
async def analizar_horario_archivo(user_id: str, file: UploadFile = File(...)):
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

        # Diagnóstico: por qué se detuvo la generación
        try:
            finish_reason = respuesta.candidates[0].finish_reason
            print(f"🔍 finish_reason: {finish_reason}")
        except Exception:
            pass

        import json
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


@router.post("/{user_id}/confirmar")
async def confirmar_horario(user_id: str, body: HorarioCompleto, reemplazar: bool = True):
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