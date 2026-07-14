import { useState, useRef, useEffect } from "react";
import { T } from "../../tokens";

export function ChatSala({ mensajes, onEnviar, nombreUsuario }) {
  const [texto, setTexto] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  function enviar() {
    if (!texto.trim()) return;
    onEnviar(texto.trim());
    setTexto("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div style={{
      background: "rgba(9,11,13,0.6)",
      border: `1px solid ${T.jade}20`,
      borderRadius: 12,
      display: "flex", flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${T.jade}15`,
        fontSize: 9, color: `${T.jade}88`, letterSpacing: "1.5px", fontFamily: T.mono,
      }}>
        CHAT DE LA SALA
      </div>

      <div ref={scrollRef} style={{
        flex: 1, overflow: "auto", padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {mensajes.length === 0 && (
          <div style={{ fontSize: 11, color: "rgba(237,235,230,0.25)", textAlign: "center", padding: "20px 0" }}>
            Aún no hay mensajes
          </div>
        )}

        {mensajes.map((m, i) => {
          const esTona = m.tipo === "tona";
          const esPropio = m.nombre === nombreUsuario && !esTona;

          if (esTona) {
            return (
              <div key={i} style={{
                background: `${T.copal}0a`, border: `1px solid ${T.copal}22`,
                borderLeft: `3px solid ${T.copal}`, borderRadius: 8,
                padding: "10px 12px",
              }}>
                <div style={{ fontSize: 9, color: `${T.copal}aa`, fontFamily: T.mono, marginBottom: 4, letterSpacing: "0.5px" }}>
                  TONA
                </div>
                <div style={{ fontSize: 12, color: "rgba(237,235,230,0.75)", lineHeight: 1.5 }}>
                  {m.texto}
                </div>
              </div>
            );
          }

          return (
            <div key={i} style={{ alignSelf: esPropio ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <div style={{ fontSize: 9, color: "rgba(237,235,230,0.3)", marginBottom: 3, fontFamily: T.mono }}>
                {esPropio ? "tú" : m.nombre}
              </div>
              <div style={{
                background: esPropio ? `${T.turquesa}12` : "rgba(237,235,230,0.04)",
                border: `1px solid ${esPropio ? T.turquesa + "30" : "rgba(237,235,230,0.08)"}`,
                borderRadius: 10, padding: "8px 12px",
                fontSize: 12, color: "rgba(237,235,230,0.8)",
              }}>
                {m.texto}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: "flex", gap: 8, padding: "12px 14px",
        borderTop: `1px solid ${T.jade}12`,
      }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1, background: "rgba(237,235,230,0.04)",
            border: "1px solid rgba(237,235,230,0.1)", borderRadius: 8,
            padding: "8px 12px", color: "rgba(237,235,230,0.8)",
            fontSize: 12, fontFamily: T.sans, outline: "none",
          }}
        />
        <button
          onClick={enviar}
          disabled={!texto.trim()}
          style={{
            background: texto.trim() ? `${T.jade}18` : "transparent",
            border: `1px solid ${T.jade}${texto.trim() ? "40" : "15"}`,
            borderRadius: 8, padding: "8px 16px",
            color: texto.trim() ? T.jade : "rgba(237,235,230,0.2)",
            fontSize: 12, cursor: texto.trim() ? "pointer" : "default",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}