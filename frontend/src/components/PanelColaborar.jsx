import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { authHeaders } from "../utils/authFetch";


const API = import.meta.env.VITE_API_URL;

export function PanelColaborar({ userId, onCerrar }) {
  const [modo, setModo] = useState("elegir"); // "elegir" | "unirse"
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function crearSesion() {
    setCargando(true);
    setError("");
    try {
     const resp = await fetch(`${API}/colaborar/crear`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders() },
  body: JSON.stringify({ user_id: userId }),
});
      if (resp.ok) {
        const data = await resp.json();
        navigate(`/colaborar/${data.codigo}`);
      } else {
        setError("No se pudo crear la sesión");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  async function unirseSesion() {
    if (!codigo.trim()) {
      setError("Escribe un código");
      return;
    }
    setCargando(true);
    setError("");
    try {
     const resp = await fetch(`${API}/colaborar/unirse`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...authHeaders() },
  body: JSON.stringify({ user_id: userId, codigo: codigo.trim().toUpperCase() }),
});
      if (resp.ok) {
        navigate(`/colaborar/${codigo.trim().toUpperCase()}`);
      } else {
        const err = await resp.json().catch(() => ({}));
        setError(err.detail || "Código inválido");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        width: 360, background: "rgba(9,11,13,0.98)",
        border: `1px solid ${T.amaranto}28`, borderTop: `2px solid ${T.amaranto}`,
        borderRadius: 16, padding: "20px 22px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 9, color: `${T.amaranto}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            TONA · COLABORAR
          </span>
          <button onClick={onCerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>

        {modo === "elegir" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={crearSesion}
              disabled={cargando}
              style={{
                padding: "14px 16px", background: `${T.amaranto}10`,
                border: `1px solid ${T.amaranto}30`, borderRadius: 10,
                color: `${T.amaranto}cc`, fontSize: 12, fontFamily: "inherit",
                cursor: "pointer", textAlign: "left",
              }}
            >
              ✨ Crear nueva sala
              <div style={{ fontSize: 10, color: "rgba(237,235,230,0.35)", marginTop: 4, fontWeight: 300 }}>
                Genera un código para invitar a otros
              </div>
            </button>
            <button
              onClick={() => setModo("unirse")}
              style={{
                padding: "14px 16px", background: `${T.turquesa}08`,
                border: `1px solid ${T.turquesa}30`, borderRadius: 10,
                color: `${T.turquesa}cc`, fontSize: 12, fontFamily: "inherit",
                cursor: "pointer", textAlign: "left",
              }}
            >
              🔑 Unirme con código
              <div style={{ fontSize: 10, color: "rgba(237,235,230,0.35)", marginTop: 4, fontWeight: 300 }}>
                Ingresa el código que te compartieron
              </div>
            </button>
          </div>
        )}

        {modo === "unirse" && (
          <div>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: 6KMYPJ"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && unirseSesion()}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(237,235,230,0.04)",
                border: `1px solid ${T.turquesa}30`, borderRadius: 8,
                padding: "12px 14px", color: T.turquesa,
                fontSize: 20, fontFamily: "monospace", letterSpacing: 4,
                textAlign: "center", outline: "none", marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={unirseSesion}
                disabled={cargando}
                style={{
                  flex: 1, background: `${T.turquesa}18`, border: `1px solid ${T.turquesa}45`,
                  borderRadius: 8, padding: "10px 0", color: T.turquesa,
                  fontSize: 12, cursor: "pointer",
                }}
              >
                {cargando ? "uniendo..." : "unirme"}
              </button>
              <button
                onClick={() => { setModo("elegir"); setError(""); }}
                style={{
                  flex: 1, background: "transparent", border: "1px solid rgba(237,235,230,0.15)",
                  borderRadius: 8, padding: "10px 0", color: "rgba(237,235,230,0.4)",
                  fontSize: 12, cursor: "pointer",
                }}
              >
                volver
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, fontSize: 11, color: T.amaranto }}>{error}</div>
        )}
      </div>
    </div>
  );
}