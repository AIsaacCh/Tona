from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db import obtener_usuario, guardar_usuario
from datetime import datetime, timedelta
from config import settings
import httpx

router = APIRouter()


class NuevoDoc(BaseModel):
    titulo: str
    contenido: Optional[str] = ""


class ActualizarDoc(BaseModel):
    doc_id: str
    contenido: str


class SugerenciaRequest(BaseModel):
    doc_id: Optional[str] = None
    titulo: Optional[str] = None
    contenido_actual: Optional[str] = ""
    tipo: Optional[str] = "continuar"  # continuar | estructurar | resumir | expandir


# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_headers(user_id: str) -> dict:
    from routers.tasks import get_google_headers
    return await get_google_headers(user_id)


# ── Listar documentos ─────────────────────────────────────────────────────────

@router.get("/lista/{user_id}")
async def listar_docs(user_id: str):
    try:
        headers = await get_headers(user_id)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers=headers,
                params={
                    "q":        "mimeType='application/vnd.google-apps.document' and trashed=false",
                    "pageSize": 20,
                    "orderBy":  "modifiedTime desc",
                    "fields":   "files(id,name,modifiedTime,webViewLink)",
                },
            )

        if resp.status_code != 200:
            print(f"❌ Error listando docs: {resp.status_code} - {resp.text}")
            return {"docs": []}

        docs = []
        for f in resp.json().get("files", []):
            docs.append({
                "id":         f["id"],
                "titulo":     f.get("name", "Sin título"),
                "modificado": f.get("modifiedTime", "")[:10],
                "link":       f.get("webViewLink", ""),
            })

        return {"docs": docs}

    except Exception as e:
        print(f"Error listando docs: {e}")
        return {"docs": []}


# ── Buscar documento por nombre ──────────────────────────────────────────────

@router.get("/buscar/{user_id}")
async def buscar_doc_por_nombre(user_id: str, nombre: str):
    """Busca un documento por su nombre (búsqueda parcial)."""
    try:
        headers = await get_headers(user_id)
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/drive/v3/files",
                headers=headers,
                params={
                    "q": f"mimeType='application/vnd.google-apps.document' and trashed=false and name contains '{nombre}'",
                    "pageSize": 5,
                    "fields": "files(id,name,modifiedTime,webViewLink)",
                },
            )
        
        if resp.status_code != 200:
            return {"docs": []}
        
        docs = []
        for f in resp.json().get("files", []):
            docs.append({
                "id": f["id"],
                "titulo": f.get("name", "Sin título"),
                "modificado": f.get("modifiedTime", "")[:10],
                "link": f.get("webViewLink", ""),
            })
        
        return {"docs": docs}
        
    except Exception as e:
        print(f"Error buscando doc: {e}")
        return {"docs": []}


# ── Leer contenido de un doc ──────────────────────────────────────────────────

@router.get("/contenido/{user_id}/{doc_id}")
async def leer_doc(user_id: str, doc_id: str):
    try:
        headers = await get_headers(user_id)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://docs.googleapis.com/v1/documents/{doc_id}",
                headers=headers,
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=404, detail="Documento no encontrado")

        doc = resp.json()
        titulo = doc.get("title", "Sin título")

        texto = _extraer_texto(doc)

        return {
            "doc_id":   doc_id,
            "titulo":   titulo,
            "contenido": texto,
            "revision": doc.get("revisionId", ""),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error leyendo doc: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _extraer_texto(doc: dict) -> str:
    """Extrae texto plano de la estructura de Google Docs."""
    texto = []
    body = doc.get("body", {})
    for elemento in body.get("content", []):
        parrafo = elemento.get("paragraph")
        if not parrafo:
            continue
        linea = []
        for elem in parrafo.get("elements", []):
            run = elem.get("textRun")
            if run:
                linea.append(run.get("content", ""))
        texto.append("".join(linea))
    return "".join(texto)


# ── Crear nuevo documento ─────────────────────────────────────────────────────

@router.post("/crear/{user_id}")
async def crear_doc(user_id: str, body: NuevoDoc):
    try:
        headers = await get_headers(user_id)
        print(f"📝 Creando documento: {body.titulo}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp_crear = await client.post(
                "https://docs.googleapis.com/v1/documents",
                headers={**headers, "Content-Type": "application/json"},
                json={"title": body.titulo},
            )
            
            print(f"📡 Crear doc status: {resp_crear.status_code}")

            if resp_crear.status_code not in (200, 201):
                print(f"❌ Error creando doc: {resp_crear.text}")
                raise HTTPException(
                    status_code=resp_crear.status_code, 
                    detail=f"Error creando doc: {resp_crear.text}"
                )

        doc_id = resp_crear.json().get("documentId")
        print(f"✅ Documento creado con ID: {doc_id}")

        if body.contenido and body.contenido.strip():
            print(f"📝 Insertando contenido en {doc_id}")
            await _insertar_texto(headers, doc_id, body.contenido)

        return {
            "creado": True,
            "doc_id": doc_id,
            "titulo": body.titulo,
            "link": f"https://docs.google.com/document/d/{doc_id}/edit",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creando doc: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Actualizar contenido de un doc ────────────────────────────────────────────

# ── Actualizar contenido de un doc ────────────────────────────────────────────

# ── Actualizar contenido de un doc ────────────────────────────────────────────

# ── Actualizar contenido de un doc (versión robusta) ──────────────────────────

# ── Actualizar contenido de un doc ────────────────────────────────────────────

@router.post("/actualizar/{user_id}")
async def actualizar_doc(user_id: str, body: ActualizarDoc):
    try:
        headers = await get_headers(user_id)
        print(f"📝 Actualizando documento: {body.doc_id}")
        print(f"📝 Contenido a guardar: {body.contenido[:50] if body.contenido else '(vacío)'}... ({len(body.contenido)} caracteres)")
        
        # 1. Leer el doc actual para saber qué texto tiene
        async with httpx.AsyncClient() as client:
            resp_leer = await client.get(
                f"https://docs.googleapis.com/v1/documents/{body.doc_id}",
                headers=headers,
            )

        if resp_leer.status_code != 200:
            print(f"❌ Error leyendo doc: {resp_leer.status_code}")
            raise HTTPException(status_code=404, detail="Documento no encontrado")

        doc = resp_leer.json()
        
        # Obtener el texto actual del documento
        texto_actual = _extraer_texto(doc)
        print(f"📄 Texto actual: '{texto_actual[:50] if texto_actual else '(vacío)'}'")
        
        # 2. Construir requests usando replaceAllText
        requests = []
        
        # Si hay texto actual, reemplazarlo
        if texto_actual and texto_actual.strip():
            # Usamos replaceAllText con el texto actual
            requests.append({
                "replaceAllText": {
                    "containsText": {
                        "text": texto_actual,
                        "matchCase": True
                    },
                    "replaceText": body.contenido,
                }
            })
            print(f"🔄 Reemplazando texto: '{texto_actual[:20]}...' → '{body.contenido[:20]}...'")
        else:
            # Si no hay texto, simplemente insertar
            requests.append({
                "insertText": {
                    "location": {"index": 1},
                    "text": body.contenido,
                }
            })
            print(f"📝 Insertando nuevo contenido (documento vacío)")

        # 3. Ejecutar la actualización
        if requests:
            async with httpx.AsyncClient() as client:
                resp_update = await client.post(
                    f"https://docs.googleapis.com/v1/documents/{body.doc_id}:batchUpdate",
                    headers={**headers, "Content-Type": "application/json"},
                    json={"requests": requests},
                )

            if resp_update.status_code not in (200, 201):
                print(f"❌ Error actualizando: {resp_update.status_code} - {resp_update.text}")
                raise HTTPException(status_code=500, detail=f"Error actualizando: {resp_update.text}")
            
            print(f"✅ Documento {body.doc_id} actualizado correctamente")
        else:
            print("⚠️ No hay cambios que aplicar")

        return {"actualizado": True, "doc_id": body.doc_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error actualizando doc: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def _insertar_texto(headers: dict, doc_id: str, texto: str):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"https://docs.googleapis.com/v1/documents/{doc_id}:batchUpdate",
                headers={**headers, "Content-Type": "application/json"},
                json={
                    "requests": [{
                        "insertText": {
                            "location": {"index": 1},
                            "text":     texto,
                        }
                    }]
                },
            )
            
            if resp.status_code not in (200, 201):
                print(f"❌ Error insertando texto: {resp.status_code} - {resp.text}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error insertando texto: {resp.text}"
                )
            
            print(f"✅ Texto insertado en {doc_id}")
    except Exception as e:
        print(f"❌ Error en _insertar_texto: {e}")
        raise


# ── Exportar como .docx ───────────────────────────────────────────────────────

@router.get("/exportar/{user_id}/{doc_id}")
async def exportar_docx(user_id: str, doc_id: str):
    from fastapi.responses import StreamingResponse
    import io

    try:
        headers = await get_headers(user_id)

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{doc_id}/export",
                headers=headers,
                params={"mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Error exportando documento")

        return StreamingResponse(
            io.BytesIO(resp.content),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=documento.docx"},
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error exportando: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Sugerencias de contenido con IA ──────────────────────────────────────────

@router.post("/sugerir/{user_id}")
async def sugerir_contenido(user_id: str, body: SugerenciaRequest):
    try:
        from services.db import obtener_tareas
        from google import genai
        from google.genai import types

        usuario = obtener_usuario(user_id)
        nombre  = usuario.get("name", "").split()[0] if usuario else "estudiante"
        tareas  = obtener_tareas(user_id)

        contexto_tareas = ""
        if tareas:
            pendientes = [t for t in tareas if not t.get("completada")][:5]
            if pendientes:
                contexto_tareas = "Tareas pendientes del usuario: " + ", ".join(
                    t.get("titulo", "") for t in pendientes
                )

        TIPOS = {
            "continuar":   "Continúa el texto de forma coherente con el mismo tono y estilo.",
            "estructurar": "Propón una estructura completa para este documento (secciones, subtítulos, índice).",
            "resumir":     "Genera un resumen conciso del contenido.",
            "expandir":    "Expande y desarrolla más el contenido existente con más detalle.",
            "introduccion": "Escribe una introducción profesional para este documento.",
            "conclusion":  "Escribe una conclusión sólida basada en el contenido.",
        }

        instruccion = TIPOS.get(body.tipo, TIPOS["continuar"])

        prompt = f"""Eres un asistente de escritura académica para {nombre}, un estudiante universitario.

{contexto_tareas}

Título del documento: {body.titulo or "Sin título"}

Contenido actual:
{body.contenido_actual or "(documento vacío)"}

Tarea: {instruccion}

Responde SOLO con el texto sugerido, sin explicaciones ni prefacios. 
Usa español formal y académico. Máximo 300 palabras."""

        cliente = genai.Client(
            vertexai=True,
            project=settings.GOOGLE_CLOUD_PROJECT,
            location=settings.GOOGLE_CLOUD_LOCATION,
        )

        respuesta = cliente.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=1024,
                temperature=0.7,
            ),
        )

        return {
            "sugerencia": respuesta.text.strip(),
            "tipo":       body.tipo,
        }

    except Exception as e:
        print(f"Error generando sugerencia: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

# ── Eliminar documento ─────────────────────────────────────────────────────────

@router.delete("/eliminar/{user_id}/{doc_id}")
async def eliminar_doc(user_id: str, doc_id: str):
    """
    Elimina un documento de Google Drive (lo mueve a la papelera).
    """
    try:
        headers = await get_headers(user_id)
        print(f"🗑️ Eliminando documento: {doc_id}")

        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"https://www.googleapis.com/drive/v3/files/{doc_id}",
                headers=headers,
            )

        if resp.status_code == 204:
            print(f"✅ Documento {doc_id} eliminado correctamente")
            return {"eliminado": True, "doc_id": doc_id}
        elif resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        else:
            print(f"❌ Error eliminando: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=500, detail=f"Error eliminando: {resp.text}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error eliminando doc: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Eliminar documento permanentemente (opcional) ─────────────────────────────

@router.delete("/eliminar/permanente/{user_id}/{doc_id}")
async def eliminar_doc_permanente(user_id: str, doc_id: str):
    """
    Elimina un documento de Google Drive permanentemente (sin papelera).
    """
    try:
        headers = await get_headers(user_id)
        print(f"🗑️ Eliminando documento permanentemente: {doc_id}")

        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"https://www.googleapis.com/drive/v3/files/{doc_id}?permanent=true",
                headers=headers,
            )

        if resp.status_code == 204:
            print(f"✅ Documento {doc_id} eliminado permanentemente")
            return {"eliminado": True, "doc_id": doc_id, "permanente": True}
        elif resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        else:
            print(f"❌ Error eliminando: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=500, detail=f"Error eliminando: {resp.text}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error eliminando doc: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Restaurar documento de la papelera ────────────────────────────────────────

@router.post("/restaurar/{user_id}/{doc_id}")
async def restaurar_doc(user_id: str, doc_id: str):
    """
    Restaura un documento de la papelera de Google Drive.
    """
    try:
        headers = await get_headers(user_id)
        print(f"♻️ Restaurando documento: {doc_id}")

        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"https://www.googleapis.com/drive/v3/files/{doc_id}",
                headers={**headers, "Content-Type": "application/json"},
                json={"trashed": False},
            )

        if resp.status_code == 200:
            print(f"✅ Documento {doc_id} restaurado correctamente")
            return {"restaurado": True, "doc_id": doc_id}
        elif resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        else:
            print(f"❌ Error restaurando: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=500, detail=f"Error restaurando: {resp.text}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error restaurando doc: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))