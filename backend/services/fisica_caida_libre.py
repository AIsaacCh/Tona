import math

MEDIOS_CAIDA = {
    "vacio": {"nombre": "Vacío (sin aire)", "coef_arrastre": 0.0},
    "aire": {"nombre": "Aire", "coef_arrastre": 0.02},
    "agua": {"nombre": "Agua", "coef_arrastre": 0.6},
}

ALTURA_MIN, ALTURA_MAX = 0.5, 100.0
MASA_MIN, MASA_MAX = 0.05, 50.0
GRAVEDAD_DEFAULT = 9.81
DT = 0.01
MAX_PASOS = 4000  # tope duro: evita loops infinitos con parámetros raros


class ParametrosInvalidos(Exception):
    pass


def simular_caida(medio_id: str, altura: float, masa: float, gravedad: float = GRAVEDAD_DEFAULT) -> dict:
    medio = MEDIOS_CAIDA.get(medio_id)
    if not medio:
        raise ParametrosInvalidos(f"Medio '{medio_id}' no existe")
    if not (0 < gravedad <= 30):
        raise ParametrosInvalidos("Gravedad fuera de rango permitido")

    altura = max(ALTURA_MIN, min(altura, ALTURA_MAX))
    masa = max(MASA_MIN, min(masa, MASA_MAX))
    c = medio["coef_arrastre"]

    y = altura
    v = 0.0
    t = 0.0
    trayectoria = [{"t": 0.0, "y": round(y, 4), "v": 0.0}]

    pasos = 0
    while y > 0 and pasos < MAX_PASOS:
        aceleracion = gravedad - (c * v * v) / masa
        v += aceleracion * DT
        y -= v * DT
        t += DT
        pasos += 1
        if pasos % 4 == 0:  # muestrea cada ~0.04s para no mandar miles de puntos
            trayectoria.append({"t": round(t, 3), "y": round(max(y, 0), 4), "v": round(v, 3)})

    if trayectoria[-1]["y"] != 0:
        trayectoria.append({"t": round(t, 3), "y": 0.0, "v": round(v, 3)})

    velocidad_terminal = math.sqrt((masa * gravedad) / c) if c > 0 else None

    # Comparación analítica ideal (sin resistencia), siempre calculable exacta
    t_ideal = math.sqrt(2 * altura / gravedad)
    v_ideal = gravedad * t_ideal

    return {
        "medio_id": medio_id,
        "medio_nombre": medio["nombre"],
        "altura_inicial_m": round(altura, 3),
        "masa_kg": round(masa, 3),
        "gravedad": round(gravedad, 3),
        "tiempo_caida_s": round(t, 3),
        "velocidad_impacto_ms": round(abs(v), 3),
        "velocidad_terminal_ms": round(velocidad_terminal, 3) if velocidad_terminal else None,
        "energia_cinetica_impacto_j": round(0.5 * masa * v * v, 3),
        "tiempo_ideal_s": round(t_ideal, 3),
        "velocidad_ideal_ms": round(v_ideal, 3),
        "trayectoria": trayectoria[-80:] if len(trayectoria) > 80 else trayectoria,  # tope de payload
    }