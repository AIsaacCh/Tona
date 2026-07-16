import { T } from "../../tokens";


export function PanelParticipantes({ codigo, participantes, userId, onCerrarSesion, onSalir, esCreador }) {


  return (
    <div style={{
      background: "rgba(9,11,13,0.6)",
      border: `1px solid ${T.turquesa}20`,
      borderRadius: 12,
      padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 9, color: `${T.turquesa}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
          CÓDIGO DE SESIÓN
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(codigo)}
          title="Copiar código"
          style={{ background: "transparent", border: "none", color: `${T.turquesa}66`, fontSize: 11, cursor: "pointer" }}
        >
          copiar
        </button>
      </div>

      <div style={{
        fontFamily: T.mono, fontSize: 28, letterSpacing: 6,
        color: T.turquesa, textAlign: "center",
        padding: "12px 0", marginBottom: 16,
        background: `${T.turquesa}08`, borderRadius: 8,
      }}>
        {codigo}
      </div>

      <div style={{ fontSize: 9, color: "rgba(237,235,230,0.3)", letterSpacing: "1px", marginBottom: 10, fontFamily: T.mono }}>
        PARTICIPANTES ({participantes.length}/3)
      </div>

      {participantes.map((p) => (
        <div key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.jade, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "rgba(237,235,230,0.7)", fontFamily: T.sans }}>
            {p.nombre || "Alguien"}
            {p.user_id === userId && <span style={{ color: "rgba(237,235,230,0.3)" }}> (tú)</span>}
          </span>
        </div>
      ))}

      <button
        onClick={onSalir}
        style={{
          marginTop: 18, width: "100%",
          background: "transparent", border: `1px solid rgba(237,235,230,0.15)`,
          borderRadius: 8, padding: "9px 0",
          color: "rgba(237,235,230,0.5)", fontSize: 11,
          fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px",
        }}
      >
        salir de la sala
      </button>

      {esCreador && (
  <button
    onClick={onCerrarSesion}
    style={{
      marginTop: 8, width: "100%",
      background: `${T.amaranto}12`, border: `1px solid ${T.amaranto}35`,
      borderRadius: 8, padding: "9px 0",
      color: T.amaranto, fontSize: 11,
      fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px",
    }}
  >
    cerrar sesión para todos
  </button>
)}
    </div>
  );
}