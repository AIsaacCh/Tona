CATALOGO_LABS = {
    "hooke": {
        "palabras_clave": ["ley de hooke", "hooke", "elasticidad", "resorte", "constante elastica", "constante elástica"],
        "nombre_display": "Ley de Hooke — Elasticidad",
    },
    "caida_libre": {
    "palabras_clave": ["caída libre", "caida libre", "gravedad", "movimiento en caída", "velocidad terminal"],
    "nombre_display": "Caída Libre",
},
"optica": {
    "palabras_clave": ["óptica", "optica geometrica", "lente", "lentes", "distancia focal", "imagen real", "imagen virtual"],
    "nombre_display": "Óptica Geométrica",
},
}


def detectar_tema(texto: str) -> str | None:
    texto_low = texto.lower()
    for tema_id, datos in CATALOGO_LABS.items():
        if any(palabra in texto_low for palabra in datos["palabras_clave"]):
            return tema_id
    return None


def info_lab(tema_id: str) -> dict | None:
    return CATALOGO_LABS.get(tema_id)