import { T } from "../../tokens";

export function HeaderEstudio({ vista, sesion, nombreUsuario, onVolverEstudio }) {
  const esLab = vista === "laboratorio";

  return (
    <div style={estilos.header}>
      <div style={estilos.izquierda}>
        {esLab && (
          <button onClick={onVolverEstudio} style={estilos.volverBtn}>
            ← Volver al estudio
          </button>
        )}
        <div>
          <div style={estilos.eyebrow}>
            {esLab ? "LABORATORIO DE PRUEBAS · SIMULACIÓN" : `SALA · ${sesion?.materia?.toUpperCase() || ""}`}
          </div>
          <div style={estilos.titulo}>
            {esLab ? "Elasticidad: Ley de Hooke" : (sesion?.titulo || sesion?.materia)}
          </div>
        </div>
      </div>

      <div style={estilos.derecha}>
        <span style={estilos.saludo}>Buenas tardes, {nombreUsuario || "Isaac"}</span>
        <div style={estilos.avatar}>AI</div>
      </div>
    </div>
  );
}

const estilos = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "22px 32px 18px",
    borderBottom: "1px solid rgba(237,235,230,0.05)",
  },
  izquierda: { display: "flex", flexDirection: "column", gap: 10 },
  volverBtn: {
    alignSelf: "flex-start",
    background: "transparent", border: "none",
    color: "rgba(237,235,230,0.4)", fontSize: 12,
    fontFamily: "inherit", cursor: "pointer", padding: 0,
  },
  eyebrow: { fontSize: 10, letterSpacing: "1.5px", color: `${T.jade}88`, fontFamily: T.mono },
  titulo: { fontSize: 22, color: "rgba(237,235,230,0.95)", fontFamily: T.serif, marginTop: 4 },
  derecha: { display: "flex", alignItems: "center", gap: 12 },
  saludo: { fontSize: 12, color: "rgba(237,235,230,0.4)", fontFamily: T.sans },
  avatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "rgba(237,235,230,0.06)", border: "1px solid rgba(237,235,230,0.1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, color: "rgba(237,235,230,0.6)", fontFamily: T.mono,
  },
};