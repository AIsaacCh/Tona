"""
Módulo de física para el Laboratorio Inteligente.
Beta: Ley de Hooke (resorte / material elástico).
Toda la física se calcula del lado del servidor — el cliente nunca decide
el resultado, solo visualiza lo que el servidor calculó.
"""

MATERIALES_HOOKE = {
    "resorte_acero": {
        "nombre": "Resorte de acero",
        "k_min": 5.0,
        "k_max": 100.0,
        "k_default": 20.0,
        "masa_min": 0.1,
        "masa_max": 10.0,
        "limite_fluencia_N": 40.0,   # a partir de aquí, deformación permanente
        "limite_ruptura_N": 55.0,    # a partir de aquí, falla
    },
    "resorte_bronce": {
        "nombre": "Resorte de bronce",
        "k_min": 3.0,
        "k_max": 60.0,
        "k_default": 12.0,
        "masa_min": 0.1,
        "masa_max": 8.0,
        "limite_fluencia_N": 25.0,
        "limite_ruptura_N": 38.0,
    },
}

GRAVEDAD_DEFAULT = 9.81


class ParametrosInvalidos(Exception):
    pass


def validar_y_clamp(material_id: str, masa: float, k: float, gravedad: float = GRAVEDAD_DEFAULT):
    material = MATERIALES_HOOKE.get(material_id)
    if not material:
        raise ParametrosInvalidos(f"Material '{material_id}' no existe")

    if not (0 < gravedad <= 30):  # evita valores absurdos o negativos
        raise ParametrosInvalidos("Gravedad fuera de rango permitido")

    masa = max(material["masa_min"], min(masa, material["masa_max"]))
    k = max(material["k_min"], min(k, material["k_max"]))
    return material, masa, k


def simular_hooke(material_id: str, masa: float, k: float, gravedad: float = GRAVEDAD_DEFAULT) -> dict:
    material, masa, k = validar_y_clamp(material_id, masa, k, gravedad)

    fuerza = masa * gravedad          # F = m·g (N)
    deformacion_m = fuerza / k        # x = F/k (m)
    deformacion_cm = deformacion_m * 100

    if fuerza < material["limite_fluencia_N"]:
        estado = "segura"
    elif fuerza < material["limite_ruptura_N"]:
        estado = "fluencia"
    else:
        estado = "ruptura"

    return {
        "material_id": material_id,
        "material_nombre": material["nombre"],
        "masa_kg": round(masa, 3),
        "gravedad": round(gravedad, 3),
        "k": round(k, 3),
        "fuerza_N": round(fuerza, 3),
        "deformacion_cm": round(deformacion_cm, 3),
        "estado": estado,
        "limite_fluencia_N": material["limite_fluencia_N"],
        "limite_ruptura_N": material["limite_ruptura_N"],
    }

def evaluar_experimento_real(material_id: str, masa: float, k: float, deformacion_medida_cm: float, gravedad: float = GRAVEDAD_DEFAULT) -> dict:
    """
    Calcula el valor teórico con la misma fórmula de la simulación y lo compara
    contra lo que el usuario midió en su experimento físico. El servidor nunca
    confía en un 'error' que venga calculado del cliente.
    """
    if not (0 <= deformacion_medida_cm <= 500):  # límite físico razonable, evita basura
        raise ParametrosInvalidos("Deformación medida fuera de un rango físico razonable")

    teorico = simular_hooke(material_id, masa, k, gravedad)
    deformacion_teorica = teorico["deformacion_cm"]

    if deformacion_teorica == 0:
        error_pct = 0.0
    else:
        error_pct = abs(deformacion_medida_cm - deformacion_teorica) / deformacion_teorica * 100

    if error_pct <= 5:
        calidad = "excelente"
    elif error_pct <= 15:
        calidad = "aceptable"
    else:
        calidad = "revisar"

    return {
        **teorico,
        "deformacion_medida_cm": round(deformacion_medida_cm, 3),
        "error_porcentual": round(error_pct, 2),
        "calidad": calidad,
    }