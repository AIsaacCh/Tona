import { useState } from "react";
import { T } from "../../tokens";

const API = import.meta.env.VITE_API_URL;

export function PanelArchivosSala({ codigo, userId, archivos, onArchivoCompartido, onPreguntaTona }) {
  const [docsPropios, setDocsPropios] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [enviandoPregunta, setEnviandoPregunta] = useState(false);

  async function cargarMisDocs() {
    setCargando(true);
    setMostrarLista(true);
    try {
      const resp = await fetch(`${API}/docs/lista/${userId}`);
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
    try {
      const resp = await fetch(`${API}/colaborar/${codigo}/compartir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, doc_id: doc.id, titulo: doc.titulo }),
      });
      if (resp.ok) {
        const data = await resp.json();
        onArchivoCompartido?.(data.archivo);
        setMostrarLista(false);
      }
    } catch (e) {
      console.error("Error compartiendo:", e);
    }
  }

  async function preguntarATona() {
    if (!pregunta.trim() || enviandoPregunta) return;
    setEnviandoPregunta(true);
    try {
      await fetch(`${API}/colaborar/${codigo}/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, pregunta: pregunta.trim() }),
      });
      onPreguntaTona?.();
      setPregunta("");
    } catch (e) {
      console.error("Error preguntando a Tona:", e);
    } finally {
      setEnviandoPregunta(false);
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
                  padding: "7px 8px", fontSize: 12, color: "rgba(237,235,230,0.65)",
                  cursor: "pointer", borderRadius: 5,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = `${T.copal}10`}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {doc.titulo}
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

      <div style={{ borderTop: `1px solid ${T.copal}12`, paddingTop: 14 }}>
        <div style={{ fontSize: 9, color: `${T.copal}88`, letterSpacing: "1.5px", marginBottom: 8, fontFamily: T.mono }}>
          PREGUNTAR A TONA
        </div>
        <textarea
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Pregunta sobre estructura, contenido, ideas..."
          rows={2}
          style={{
            width: "100%", background: "rgba(237,235,230,0.04)",
            border: "1px solid rgba(237,235,230,0.1)", borderRadius: 8,
            padding: "8px 10px", color: "rgba(237,235,230,0.8)",
            fontSize: 12, fontFamily: T.sans, outline: "none",
            resize: "none", boxSizing: "border-box", marginBottom: 8,
          }}
        />
        <button
          onClick={preguntarATona}
          disabled={!pregunta.trim() || enviandoPregunta}
          style={{
            width: "100%",
            background: pregunta.trim() ? `${T.copal}18` : "transparent",
            border: `1px solid ${T.copal}${pregunta.trim() ? "40" : "15"}`,
            borderRadius: 8, padding: "8px 0",
            color: pregunta.trim() ? T.copal : "rgba(237,235,230,0.2)",
            fontSize: 11, fontFamily: T.mono,
            cursor: pregunta.trim() ? "pointer" : "default",
          }}
        >
          {enviandoPregunta ? "pensando..." : "preguntar"}
        </button>
      </div>
    </div>
  );
}