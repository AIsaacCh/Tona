from datetime import datetime
from zoneinfo import ZoneInfo

MX_TZ = ZoneInfo("America/Mexico_City")


def ahora_mx() -> datetime:
    """Fecha y hora actual, siempre en horario de Ciudad de México,
    sin importar en qué zona horaria corra el servidor."""
    return datetime.now(MX_TZ)


def hoy_mx():
    return ahora_mx().date()