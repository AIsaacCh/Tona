# test_nivel.py — versión con debug
from services.db import supabase, calcular_nivel_uso
from services.tiempo import hoy_mx

user_id = "hYYkoQw3I_8GoHy_XCd6Vg"
mes_str = hoy_mx().strftime("%Y-%m")
print("Buscando user_id:", user_id, "| mes:", mes_str)

resp = supabase.table("uso_mensual").select("*").eq("user_id", user_id).eq("mes", mes_str).execute()
print("Filas encontradas:", resp.data)

print("Nivel de uso:", calcular_nivel_uso(user_id))