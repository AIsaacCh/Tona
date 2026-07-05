// components/OnboardingTona.jsx
import { useState, useEffect, useRef } from "react";
import anime from "animejs";
import { T } from "../tokens";

const API = "http://localhost:8000";

const PASOS = [
  {
    id: "bienvenida",
    pregunta: (nombre_agente) =>
      `Hola. Soy ${nombre_agente}, tu agente académico personal. Antes de empezar, quiero conocerte un poco. ¿Cómo quieres que te llame?`,
    campo: "nombre_usuario",
    placeholder: "Tu nombre o apodo",
    tipo: "texto",
  },
  {
    id: "nombre_agente",
    pregunta: (_, nombre_usuario) =>
      `Perfecto, ${nombre_usuario}. ¿Cómo quieres llamarme a mí? Por defecto me llamo Tona, pero puedes elegir otro nombre si prefieres.`,
    campo: "nombre_agente",
    placeholder: "Tona, o el nombre que prefieras",
    tipo: "texto",
    default: "Tona",
  },
  {
    id: "tono",
    pregunta: (nombre_agente) =>
      `¿Cómo prefieres que me comunique contigo?`,
    campo: "tono",
    tipo: "opciones",
    opciones: [
      { valor: "amigable", label: "Amigable y casual",    descripcion: "Como un compañero de estudio" },
      { valor: "neutral",  label: "Neutral y directo",    descripcion: "Información precisa, sin rodeos" },
      { valor: "formal",   label: "Formal y profesional", descripcion: "Tono académico estructurado" },
    ],
  },
  {
    id: "sitios",
    pregunta: (nombre_agente, nombre_usuario) =>
      `Casi listo, ${nombre_usuario}. ¿Hay alguna página web que quieras que revise periódicamente? Por ejemplo, el portal de tu escuela, noticias de transporte, o cualquier sitio de consulta. Puedes saltar esto si quieres.`,
    campo: "sitios",
    tipo: "sitios",
    opcional: true,
  },
  {
    id: "listo",
    pregunta: (nombre_agente, nombre_usuario) =>
      `Todo listo. Estoy configurado y listo para ayudarte, ${nombre_usuario}. Puedes ajustar cualquier preferencia más tarde desde el ícono de configuración.`,
    campo: null,
    tipo: "final",
  },
];

export default function OnboardingTona({ userId, onCompletado }) {
  const [paso,   setPaso]   = useState(0);
  const [config, setConfig] = useState({ nombre_agente: "Tona", tono: "neutral", sitios: [] });
  const [valor,  setValor]  = useState("");
  const [sitioUrl,   setSitioUrl]   = useState("");
  const [sitioAlias, setSitioAlias] = useState("");
  const [sitioPeriodo, setSitioPeriodo] = useState("semanal");
  const [sitiosAgregados, setSitiosAgregados] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const containerRef = useRef(null);
  const cardRef      = useRef(null);
  const textRef      = useRef(null);

  const pasoActual    = PASOS[paso];
  const nombre_agente = config.nombre_agente || "Tona";
  const nombre_usuario = config.nombre_usuario || "";

  useEffect(() => {
    if (!cardRef.current) return;
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: cardRef.current, opacity: [0, 1], translateY: [24, 0], duration: 500 });
    if (textRef.current) {
      anime({ targets: textRef.current, opacity: [0, 1], translateY: [8, 0], duration: 400, delay: 200, easing: "easeOutQuart" });
    }
  }, [paso]);

  async function avanzar() {
    if (pasoActual.tipo === "final") {
      await guardarConfig();
      return;
    }

    const val = valor.trim() || pasoActual.default || "";
    if (!val && !pasoActual.opcional && pasoActual.tipo !== "opciones") return;

    const nueva_config = { ...config };
    if (pasoActual.campo && val) {
      nueva_config[pasoActual.campo] = val;
    }
    if (pasoActual.campo === "sitios") {
      nueva_config.sitios = sitiosAgregados;
    }
    setConfig(nueva_config);
    setValor("");

    anime({
      targets: cardRef.current,
      opacity: [1, 0], translateX: [0, -30],
      duration: 280, easing: "easeInQuart",
      complete: () => setPaso((p) => p + 1),
    });
  }

  function seleccionarOpcion(opcion) {
    const nueva_config = { ...config, [pasoActual.campo]: opcion.valor };
    setConfig(nueva_config);
    anime({
      targets: cardRef.current,
      opacity: [1, 0], translateX: [0, -30],
      duration: 280, easing: "easeInQuart",
      complete: () => setPaso((p) => p + 1),
    });
  }

  function agregarSitio() {
    if (!sitioUrl.trim() || !sitioAlias.trim()) return;
    setSitiosAgregados((prev) => [
      ...prev,
      { url: sitioUrl.trim(), alias: sitioAlias.trim(), frecuencia: sitioPeriodo },
    ]);
    setSitioUrl("");
    setSitioAlias("");
    setSitioPeriodo("semanal");
  }

  async function guardarConfig() {
    setGuardando(true);
    try {
      // Guardar config en el backend
      await fetch(`${API}/agent/config/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario:        config.nombre_usuario,
          nombre_agente:         config.nombre_agente,
          tono:                  config.tono,
          onboarding_completado: true,
        }),
      });

      // Guardar sitios si los hay
      for (const sitio of sitiosAgregados) {
        await fetch(`${API}/tasks/sitios/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sitio),
        });
      }

      // Animación de salida
      anime({
        targets: containerRef.current,
        opacity: [1, 0], scale: [1, 0.97],
        duration: 500, easing: "easeInQuart",
        complete: () => onCompletado?.(),
      });
    } catch (e) {
      console.error("Error guardando config:", e);
      setGuardando(false);
    }
  }

  const pregunta = pasoActual.pregunta(nombre_agente, nombre_usuario);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: T.obs,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 32,
      }}
    >
      {/* Indicador de progreso */}
      <div style={{ display: "flex", gap: 8 }}>
        {PASOS.map((_, i) => (
          <div key={i} style={{
            width: i === paso ? 24 : 8, height: 8,
            borderRadius: 4,
            background: i <= paso ? T.copal : `${T.copal}22`,
            transition: "all 0.4s ease",
          }} />
        ))}
      </div>

      {/* Card principal */}
      <div ref={cardRef} style={{
        width: "min(480px, 90vw)",
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${T.copal}22`,
        borderTop: `1px solid ${T.copal}55`,
        borderRadius: 20,
        padding: "36px 40px",
        boxShadow: `0 8px 64px rgba(0,0,0,0.6), 0 0 60px ${T.copal}06`,
        opacity: 0,
      }}>
        {/* Nombre del agente */}
        <div style={{
          fontSize: 9, color: `${T.copal}66`,
          letterSpacing: "2px", fontFamily: T.mono,
          marginBottom: 20,
        }}>
          {nombre_agente.toUpperCase()} · CONFIGURACIÓN
        </div>

        {/* Pregunta */}
        <div ref={textRef} style={{
          fontSize: 16, color: "rgba(237,235,230,0.85)",
          fontFamily: T.serif, fontWeight: 400,
          lineHeight: 1.6, marginBottom: 28,
          opacity: 0,
        }}>
          {pregunta}
        </div>

        {/* Input texto */}
        {pasoActual.tipo === "texto" && (
          <div>
            <input
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && avanzar()}
              placeholder={pasoActual.placeholder}
              style={{
                width: "100%", background: "rgba(237,235,230,0.04)",
                border: `1px solid ${T.copal}25`,
                borderBottom: `2px solid ${T.copal}55`,
                borderRadius: "8px 8px 0 0",
                padding: "12px 16px",
                color: "rgba(237,235,230,0.85)",
                fontSize: 15, fontFamily: T.sans,
                outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              onClick={avanzar}
              style={{
                marginTop: 16, width: "100%",
                background: `${T.copal}18`,
                border: `1px solid ${T.copal}45`,
                borderRadius: 10, padding: "12px",
                color: T.copal, fontSize: 13,
                fontFamily: T.sans, cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Opciones */}
        {pasoActual.tipo === "opciones" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pasoActual.opciones.map((op) => (
              <button
                key={op.valor}
                onClick={() => seleccionarOpcion(op)}
                style={{
                  background: `${T.copal}08`,
                  border: `1px solid ${T.copal}22`,
                  borderRadius: 10, padding: "14px 18px",
                  textAlign: "left", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${T.copal}18`;
                  e.currentTarget.style.borderColor = `${T.copal}55`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${T.copal}08`;
                  e.currentTarget.style.borderColor = `${T.copal}22`;
                }}
              >
                <div style={{ fontSize: 13, color: "rgba(237,235,230,0.85)", fontFamily: T.sans, marginBottom: 3 }}>
                  {op.label}
                </div>
                <div style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", fontFamily: T.sans }}>
                  {op.descripcion}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Sitios */}
        {pasoActual.tipo === "sitios" && (
          <div>
            {sitiosAgregados.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {sitiosAgregados.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0", borderBottom: `1px solid ${T.cen}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(237,235,230,0.7)", fontFamily: T.sans }}>{s.alias}</div>
                      <div style={{ fontSize: 10, color: "rgba(237,235,230,0.25)", fontFamily: T.mono }}>{s.url.slice(0, 40)}</div>
                    </div>
                    <button
                      onClick={() => setSitiosAgregados((prev) => prev.filter((_, j) => j !== i))}
                      style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, cursor: "pointer", fontSize: 12 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <input
                value={sitioUrl}
                onChange={(e) => setSitioUrl(e.target.value)}
                placeholder="https://escom.ipn.mx/avisos"
                style={inputStyle}
              />
              <input
                value={sitioAlias}
                onChange={(e) => setSitioAlias(e.target.value)}
                placeholder="Nombre (ej: ESCOM avisos)"
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 8 }}>
                {["diaria", "semanal", "quincenal"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSitioPeriodo(f)}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11,
                      fontFamily: T.sans, cursor: "pointer",
                      background: sitioPeriodo === f ? `${T.turquesa}25` : `${T.turquesa}08`,
                      border: `1px solid ${T.turquesa}${sitioPeriodo === f ? "55" : "20"}`,
                      color: T.turquesa,
                    }}
                  >{f}</button>
                ))}
              </div>
              <button onClick={agregarSitio} style={{
                background: `${T.jade}12`, border: `1px solid ${T.jade}30`,
                borderRadius: 8, padding: "9px",
                color: T.jade, fontSize: 12,
                fontFamily: T.sans, cursor: "pointer",
              }}>
                + Agregar sitio
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPaso((p) => p + 1)} style={{
                flex: 1, background: "transparent",
                border: `1px solid ${T.copal}22`, borderRadius: 8, padding: "10px",
                color: `rgba(237,235,230,0.35)`, fontSize: 12,
                fontFamily: T.sans, cursor: "pointer",
              }}>
                Saltar por ahora
              </button>
              <button onClick={avanzar} style={{
                flex: 2, background: `${T.copal}18`,
                border: `1px solid ${T.copal}45`, borderRadius: 8, padding: "10px",
                color: T.copal, fontSize: 12,
                fontFamily: T.sans, cursor: "pointer",
              }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Final */}
        {pasoActual.tipo === "final" && (
          <button
            onClick={guardarConfig}
            disabled={guardando}
            style={{
              width: "100%",
              background: guardando ? `${T.jade}10` : `${T.jade}20`,
              border: `1px solid ${T.jade}${guardando ? "25" : "55"}`,
              borderRadius: 10, padding: "14px",
              color: T.jade, fontSize: 14,
              fontFamily: T.sans, cursor: guardando ? "wait" : "pointer",
              letterSpacing: "0.5px",
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? "Configurando..." : "Comenzar →"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "rgba(237,235,230,0.03)",
  border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8,
  padding: "9px 12px", color: "rgba(237,235,230,0.7)",
  fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 300,
  outline: "none", boxSizing: "border-box",
};