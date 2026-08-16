from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from services.auth_utils import verificar_identidad
from services.fisica_lab import MATERIALES_HOOKE, simular_hooke, ParametrosInvalidos, evaluar_experimento_real
from services.db import guardar_experimento_lab, obtener_experimentos_lab, guardar_experimento_real, obtener_experimentos_por_fuente, guardar_experimento_generico
from services.fisica_caida_libre import MEDIOS_CAIDA, simular_caida, ParametrosInvalidos as ParametrosInvalidosCaida
from services.fisica_optica import LENTES_OPTICA, simular_lente, ParametrosInvalidos as ParametrosInvalidosOptica

router = APIRouter()


class SimulacionHookeRequest(BaseModel):
    material_id: str
    masa: float = Field(..., gt=0, le=1000)
    k: float = Field(..., gt=0, le=1000)
    gravedad: float = Field(default=9.81, gt=0, le=30)


class ExperimentoRealRequest(BaseModel):
    material_id: str
    masa: float = Field(..., gt=0, le=1000)
    k: float = Field(..., gt=0, le=1000)
    deformacion_medida_cm: float = Field(..., ge=0, le=500)
    gravedad: float = Field(default=9.81, gt=0, le=30)
    notas: str | None = Field(default=None, max_length=500)


# ✅ CORREGIDO - sin {user_id}
@router.get("/materiales")
async def listar_materiales(user_id: str = Depends(verificar_identidad)):
    return {
        "materiales": [
            {"id": mid, "nombre": m["nombre"], "k_min": m["k_min"], "k_max": m["k_max"],
             "k_default": m["k_default"], "masa_min": m["masa_min"], "masa_max": m["masa_max"]}
            for mid, m in MATERIALES_HOOKE.items()
        ]
    }


# ✅ CORREGIDO - sin {user_id}
@router.post("/hooke/simular")
async def simular_hooke_endpoint(
    body: SimulacionHookeRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        return simular_hooke(body.material_id, body.masa, body.k, body.gravedad)
    except ParametrosInvalidos as e:
        raise HTTPException(status_code=400, detail=str(e))


class GuardarResultadoRequest(BaseModel):
    material_id: str
    masa: float = Field(..., gt=0, le=1000)
    k: float = Field(..., gt=0, le=1000)


# ✅ CORREGIDO - sin {user_id}
@router.post("/hooke/guardar")
async def guardar_resultado(
    body: GuardarResultadoRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        resultado = simular_hooke(body.material_id, body.masa, body.k)
    except ParametrosInvalidos as e:
        raise HTTPException(status_code=400, detail=str(e))

    fila = guardar_experimento_lab(user_id, {
        "tema": "ley_hooke",
        **resultado,
    })
    return {"guardado": True, "experimento": fila}


# ✅ CORREGIDO - sin {user_id}
@router.get("/hooke/historial")
async def historial_hooke(user_id: str = Depends(verificar_identidad)):
    return {"experimentos": obtener_experimentos_lab(user_id, "ley_hooke")}


# ✅ CORREGIDO - sin {user_id}
@router.post("/hooke/experimento-real")
async def registrar_experimento_real(
    body: ExperimentoRealRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        resultado = evaluar_experimento_real(
            body.material_id, body.masa, body.k, body.deformacion_medida_cm, body.gravedad
        )
    except ParametrosInvalidos as e:
        raise HTTPException(status_code=400, detail=str(e))

    fila = guardar_experimento_real(user_id, {
        "tema": "ley_hooke",
        **resultado,
        "notas": body.notas,
    })
    return {"guardado": True, "experimento": fila}


# ✅ CORREGIDO - sin {user_id}
@router.get("/hooke/experimentos-reales")
async def listar_experimentos_reales(user_id: str = Depends(verificar_identidad)):
    return {"experimentos": obtener_experimentos_por_fuente(user_id, "ley_hooke", "real")}


# ── Caída Libre ──────────────────────────────────────────────────────────────


# ✅ CORREGIDO - sin {user_id}
@router.get("/caida/medios")
async def listar_medios_caida(user_id: str = Depends(verificar_identidad)):
    return {
        "medios": [
            {"id": mid, "nombre": m["nombre"], "coef_arrastre": m["coef_arrastre"]}
            for mid, m in MEDIOS_CAIDA.items()
        ]
    }


class SimulacionCaidaRequest(BaseModel):
    medio_id: str
    altura: float = Field(..., gt=0, le=1000)
    masa: float = Field(..., gt=0, le=1000)
    gravedad: float = Field(default=9.81, gt=0, le=30)


# ✅ CORREGIDO - sin {user_id}
@router.post("/caida/simular")
async def simular_caida_libre(
    body: SimulacionCaidaRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        return simular_caida(body.medio_id, body.altura, body.masa, body.gravedad)
    except ParametrosInvalidosCaida as e:
        raise HTTPException(status_code=400, detail=str(e))


class GuardarCaidaRequest(BaseModel):
    medio_id: str
    altura: float = Field(..., gt=0, le=1000)
    masa: float = Field(..., gt=0, le=1000)


# ✅ CORREGIDO - sin {user_id}
@router.post("/caida/guardar")
async def guardar_caida(
    body: GuardarCaidaRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        resultado = simular_caida(body.medio_id, body.altura, body.masa)
    except ParametrosInvalidosCaida as e:
        raise HTTPException(status_code=400, detail=str(e))

    fila = guardar_experimento_generico(user_id, "caida_libre", resultado)
    return {"guardado": True, "experimento": fila}


# ── Óptica ──────────────────────────────────────────────────────────────────


# ✅ CORREGIDO - sin {user_id}
@router.get("/optica/lentes")
async def listar_lentes(user_id: str = Depends(verificar_identidad)):
    return {
        "lentes": [
            {"id": lid, "nombre": l["nombre"], "tipo": l["tipo"], 
             "f_min": l["f_min"], "f_max": l["f_max"], "f_default": l["f_default"]}
            for lid, l in LENTES_OPTICA.items()
        ]
    }


class SimulacionOpticaRequest(BaseModel):
    lente_id: str
    f: float = Field(..., ge=-1000, le=1000)
    distancia_objeto: float = Field(..., gt=0, le=1000)
    altura_objeto: float = Field(..., gt=0, le=1000)


# ✅ CORREGIDO - sin {user_id}
@router.post("/optica/simular")
async def simular_optica(
    body: SimulacionOpticaRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        return simular_lente(body.lente_id, body.f, body.distancia_objeto, body.altura_objeto)
    except ParametrosInvalidosOptica as e:
        raise HTTPException(status_code=400, detail=str(e))


# ✅ CORREGIDO - sin {user_id}
@router.post("/optica/guardar")
async def guardar_optica(
    body: SimulacionOpticaRequest,
    user_id: str = Depends(verificar_identidad)
):
    try:
        resultado = simular_lente(body.lente_id, body.f, body.distancia_objeto, body.altura_objeto)
    except ParametrosInvalidosOptica as e:
        raise HTTPException(status_code=400, detail=str(e))

    fila = guardar_experimento_generico(user_id, "optica_geometrica", resultado)
    return {"guardado": True, "experimento": fila}