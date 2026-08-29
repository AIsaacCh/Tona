import { useState, useEffect } from "react";
import { T } from "../tokens";

const API = import.meta.env.VITE_API_URL;

export default function GateTerminos({ onListo }) {
  const [estado, setEstado] = useState("cargando"); // cargando | pendiente | ok
  const [versionActual, setVersionActual] = useState(null);
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.terminos_ok) {
          setEstado("ok");
          onListo?.();
        } else {
          setVersionActual(data.terminos_version_actual);
          setEstado("pendiente");
        }
      })
      .catch(() => {
        setEstado("ok");
        onListo?.();
      });
  }, []);

  async function confirmar() {
    if (!aceptado || !versionActual) return;
    setEnviando(true);
    try {
      await fetch(`${API}/auth/aceptar-terminos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: versionActual, fecha: new Date().toISOString() }),
      });
      setEstado("ok");
      onListo?.();
    } catch (e) {
      setEnviando(false);
    }
  }

  if (estado !== "pendiente") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        maxWidth: 520, width: "100%",
        background: "linear-gradient(165deg, rgba(20,20,18,0.97), rgba(8,8,8,0.98))",
        borderRadius: 24, padding: "32px 36px",
        border: `1px solid ${T.copal}25`,
        boxShadow: "0 40px 100px rgba(0,0,0,0.85)",
      }}>
        <h2 style={{ fontFamily: T.sans, fontSize: 19, color: "rgba(237,235,230,0.92)", marginBottom: 8 }}>
          Actualizamos nuestros Términos
        </h2>
        <p style={{ fontSize: 12.5, color: "rgba(237,235,230,0.45)", fontFamily: T.sans, lineHeight: 1.6, marginBottom: 18 }}>
          Antes de continuar, necesitamos que revises y aceptes la versión más reciente de
          nuestros Términos y Condiciones y nuestro Aviso de Privacidad.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <a href="/legal/terminos" target="_blank" rel="noopener noreferrer"
             style={{ color: T.jade, fontSize: 12.5, fontFamily: T.sans, textDecoration: "none",
                      padding: "7px 16px", border: `1px solid ${T.jade}30`, borderRadius: 20 }}>
            📄 Términos y Condiciones
          </a>
          <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer"
             style={{ color: T.jade, fontSize: 12.5, fontFamily: T.sans, textDecoration: "none",
                      padding: "7px 16px", border: `1px solid ${T.jade}30`, borderRadius: 20 }}>
            🔒 Aviso de Privacidad
          </a>
        </div>

        <label style={{ display: "flex", gap: 12, marginBottom: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={aceptado}
            onChange={(e) => setAceptado(e.target.checked)}
            disabled={enviando}
            style={{ marginTop: 2, accentColor: T.jade, width: 18, height: 18 }}
          />
          <span style={{ fontSize: 13, color: "rgba(237,235,230,0.7)", fontFamily: T.sans, lineHeight: 1.5 }}>
            He leído y acepto los Términos y Condiciones y el Aviso de Privacidad actualizados de Tona.
          </span>
        </label>

        <button
          onClick={confirmar}
          disabled={!aceptado || enviando}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 30,
            background: aceptado ? T.jade : "rgba(237,235,230,0.06)",
            border: "none",
            color: aceptado ? "var(--obsidiana)" : "rgba(237,235,230,0.2)",
            fontFamily: T.sans, fontSize: 13, fontWeight: 600,
            cursor: aceptado && !enviando ? "pointer" : "default",
          }}
        >
          {enviando ? "Guardando..." : "Aceptar y continuar"}
        </button>
      </div>
    </div>
  );
}