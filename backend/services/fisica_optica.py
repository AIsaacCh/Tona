LENTES_OPTICA = {
    "convergente": {
        "nombre": "Lente convergente (convexa)",
        "tipo": "convergente",
        "f_min": 5.0,
        "f_max": 40.0,
        "f_default": 15.0,
    },
    "divergente": {
        "nombre": "Lente divergente (cóncava)",
        "tipo": "divergente",
        "f_min": -40.0,
        "f_max": -5.0,
        "f_default": -15.0,
    },
}

DO_MIN, DO_MAX = 1.0, 80.0
HO_MIN, HO_MAX = 0.5, 20.0
EPSILON_SINGULARIDAD = 0.5  # separación mínima entre do y f — evita la división por cero física real en do == f


class ParametrosInvalidos(Exception):
    pass


def validar_y_clamp(lente_id: str, f: float, do: float, ho: float):
    lente = LENTES_OPTICA.get(lente_id)
    if not lente:
        raise ParametrosInvalidos(f"Lente '{lente_id}' no existe")

    f = max(lente["f_min"], min(f, lente["f_max"]))
    do = max(DO_MIN, min(do, DO_MAX))
    ho = max(HO_MIN, min(ho, HO_MAX))

    # do == f es la singularidad óptica real (imagen en el infinito). La alejamos
    # un margen mínimo en vez de rechazar la petición, para que el slider nunca
    # se sienta "roto" al pasar por ese punto.
    if abs(do - f) < EPSILON_SINGULARIDAD:
        do = (f + EPSILON_SINGULARIDAD) if do >= f else (f - EPSILON_SINGULARIDAD)
        do = max(DO_MIN, do)

    return lente, f, do, ho


def simular_lente(lente_id: str, f: float, do: float, ho: float) -> dict:
    lente, f, do, ho = validar_y_clamp(lente_id, f, do, ho)

    di = (f * do) / (do - f)
    m = -di / do
    hi = m * ho

    tipo_imagen = "real" if di > 0 else "virtual"
    orientacion = "invertida" if m < 0 else "derecha"
    if abs(m) > 1.05:
        tamano = "amplificada"
    elif abs(m) < 0.95:
        tamano = "reducida"
    else:
        tamano = "mismo tamaño"

    return {
        "lente_id": lente_id,
        "lente_nombre": lente["nombre"],
        "lente_tipo": lente["tipo"],
        "distancia_focal_cm": round(f, 2),
        "distancia_objeto_cm": round(do, 2),
        "altura_objeto_cm": round(ho, 2),
        "distancia_imagen_cm": round(di, 2),
        "altura_imagen_cm": round(hi, 2),
        "aumento": round(m, 3),
        "tipo_imagen": tipo_imagen,
        "orientacion": orientacion,
        "tamano": tamano,
    }