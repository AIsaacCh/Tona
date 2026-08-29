import { useState } from "react";
import { T } from "../../tokens";

const API = import.meta.env.VITE_API_URL;

export function PanelArchivosSala({ codigo, userId, archivos, onArchivoCompartido }) {
  const [docsPropios, setDocsPropios] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [compartiendoId, setCompartiendoId] = useState(null);

  async function cargarMisDocs() {
    setCargando(true);
    setMostrarLista(true);
    try {
      const resp = await fetch(`${API}/docs/lista`, { credentials: "include" })
      if (resp.ok) {
        const data = await resp.json();
        setDocsPropios(data.docs || []);
      }
    } catch (e) {
      console.error("Error cargando docs:", e);
    } finally {
      setCargando(false);
    }
  }

  async function compartir(doc) {
    if (compartiendoId) return;
    setCompartiendoId(doc.id);
    try {
      const resp = await fetch(`${API}/colaborar/${codigo}/compartir`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: doc.id, titulo: doc.titulo }),
      });
      if (resp.ok) {
        setMostrarLista(false);
      }
    } catch (e) {
      console.error("Error compartiendo:", e);
    } finally {
      setCompartiendoId(null);
    }
  }

  return (
    <div style={{
      background: "rgba(9,11,13,0.6)",
      border: `1px solid ${T.copal}20`,
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 9, color: `${T.copal}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            ARCHIVOS COMPARTIDOS
          </span>
          <button
            onClick={cargarMisDocs}
            style={{
              background: `${T.copal}12`, border: `1px solid ${T.copal}30`,
              borderRadius: 6, padding: "4px 10px", color: T.copal,
              fontSize: 10, fontFamily: T.mono, cursor: "pointer",
            }}
          >
            + compartir
          </button>
        </div>

        {archivos.length === 0 && (
          <div style={{ fontSize: 11, color: "rgba(237,235,230,0.25)", padding: "8px 0" }}>
            Nadie ha compartido archivos aún
          </div>
        )}

        {archivos.map((a) => (
          <a
            key={a.id}
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 6px", textDecoration: "none",
              borderRadius: 6, marginBottom: 4,
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 5,
              background: `${T.copal}18`, border: `1px solid ${T.copal}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 8, color: T.copal, fontFamily: T.mono,
            }}>
              DOC
            </div>
            <span style={{ fontSize: 12, color: "rgba(237,235,230,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.titulo}
            </span>
          </a>
        ))}

        {mostrarLista && (
          <div style={{
            marginTop: 10, background: "rgba(237,235,230,0.03)",
            border: `1px solid ${T.copal}18`, borderRadius: 8, padding: "10px",
            maxHeight: 200, overflow: "auto",
          }}>
            {cargando && (
              <div style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", textAlign: "center" }}>cargando...</div>
            )}
            {!cargando && docsPropios.length === 0 && (
              <div style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", textAlign: "center" }}>No tienes documentos</div>
            )}
            {!cargando && docsPropios.map((doc) => (
              <div
                key={doc.id}
                onClick={() => compartir(doc)}
                style={{
                  padding: "7px 8px", fontSize: 12,
                  color: compartiendoId === doc.id ? "rgba(237,235,230,0.25)" : "rgba(237,235,230,0.65)",
                  cursor: compartiendoId ? "wait" : "pointer",
                  borderRadius: 5, pointerEvents: compartiendoId ? "none" : "auto",
                }}
                onMouseEnter={(e) => { if (!compartiendoId) e.currentTarget.style.background = `${T.copal}10`; }}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {doc.titulo} {compartiendoId === doc.id && "· compartiendo..."}
              </div>
            ))}
            <button
              onClick={() => setMostrarLista(false)}
              style={{
                marginTop: 6, width: "100%", background: "transparent",
                border: "none", color: "rgba(237,235,230,0.3)",
                fontSize: 10, cursor: "pointer",
              }}
            >
              cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}