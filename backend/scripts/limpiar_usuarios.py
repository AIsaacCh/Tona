# scripts/limpiar_usuarios.py
from services.db import supabase, eliminar_todos_los_datos_usuario

USER_ID_A_CONSERVAR = "hXHsJbNh6gbEetYiPeGkiw"

resp = supabase.table("users").select("id, email").execute()
usuarios = resp.data or []

a_eliminar = [u for u in usuarios if u["id"] != USER_ID_A_CONSERVAR]

print(f"Se eliminarán {len(a_eliminar)} usuarios:")
for u in a_eliminar:
    print(f"  - {u['id']} ({u.get('email')})")

confirmar = input("\n¿Confirmas? Escribe 'si' para continuar: ")
if confirmar.strip().lower() != "si":
    print("Cancelado.")
    exit()

for u in a_eliminar:
    resultado = eliminar_todos_los_datos_usuario(u["id"])
    if resultado["completado"]:
        print(f"✅ {u['id']} eliminado")
    else:
        print(f"⚠️ {u['id']} con errores en: {resultado['tablas_con_error']}")

print("\nListo.")