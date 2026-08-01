// components/OnboardingTona.jsx
import { useState, useEffect, useRef } from "react";
import anime from "animejs";
import { T } from "../tokens";

const API = import.meta.env.VITE_API_URL;

// ──────────────────────────────────────────────────────────────────────────────
// 🌟 FEATURES MOSTRADAS EN LA BIENVENIDA
// ──────────────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "tareas",
    titulo: "Tareas y calendario",
    texto: "Organizo tus tareas de Classroom, eventos de Calendar y pendientes manuales en un solo lugar.",
    icono: "circulos",
  },
  {
    id: "horario",
    titulo: "Tu horario siempre a la mano",
    texto: "Guarda tu horario de clases y te digo qué sigue, sin que tengas que buscarlo.",
    icono: "grid",
  },
  {
    id: "docs",
    titulo: "Documentos con ayuda de IA",
    texto: "Creo, edito y te sugiero mejoras en documentos directamente desde el chat.",
    icono: "onda",
  },
  {
    id: "correo",
    titulo: "Correo y avisos",
    texto: "Reviso tu Gmail, busco correos por tema y puedo enviar mensajes por ti.",
    icono: "pulso",
  },
  {
    id: "voz",
    titulo: "Habla conmigo",
    texto: "Puedes escribirme o simplemente hablar — te escucho y te respondo con voz.",
    icono: "orbita",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 🎨 ÍCONO ANIMADO (SVG simple, sin dependencias externas)
// ──────────────────────────────────────────────────────────────────────────────
function IconoAnimado({ tipo, playKey }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const targets = ref.current.querySelectorAll("[data-anim]");
    anime.timeline({ easing: "easeOutQuart" })
      .add({
        targets,
        opacity: [0, 1],
        scale: [0.6, 1],
        duration: 600,
        delay: anime.stagger(90),
      })
      .add({
        targets,
        translateY: [0, -4, 0],
        duration: 1400,
        delay: anime.stagger(120),
        loop: true,
        easing: "easeInOutSine",
      }, "-=200");
  }, [tipo, playKey]);

  const color = T.copal;
  const jade = T.jade;
  const turquesa = T.turquesa;

  return (
    <svg ref={ref} viewBox="0 0 120 120" width="96" height="96">
      {tipo === "circulos" && (
        <>
          <circle data-anim cx="35" cy="40" r="10" fill="none" stroke={color} strokeWidth="2" opacity="0" />
          <circle data-anim cx="65" cy="40" r="10" fill="none" stroke={jade} strokeWidth="2" opacity="0" />
          <circle data-anim cx="50" cy="70" r="10" fill={turquesa} opacity="0" />
        </>
      )}
      {tipo === "grid" && (
        <>
          <rect data-anim x="30" y="30" width="24" height="24" rx="4" fill="none" stroke={color} strokeWidth="2" opacity="0" />
          <rect data-anim x="66" y="30" width="24" height="24" rx="4" fill="none" stroke={jade} strokeWidth="2" opacity="0" />
          <rect data-anim x="30" y="66" width="24" height="24" rx="4" fill="none" stroke={turquesa} strokeWidth="2" opacity="0" />
          <rect data-anim x="66" y="66" width="24" height="24" rx="4" fill={color} opacity="0" />
        </>
      )}
      {tipo === "onda" && (
        <>
          <path data-anim d="M25 60 Q40 40 55 60 T85 60" fill="none" stroke={color} strokeWidth="2.5" opacity="0" />
          <path data-anim d="M25 75 Q40 55 55 75 T85 75" fill="none" stroke={jade} strokeWidth="2.5" opacity="0" />
        </>
      )}
      {tipo === "pulso" && (
        <>
          <circle data-anim cx="60" cy="60" r="14" fill="none" stroke={color} strokeWidth="2" opacity="0" />
          <circle data-anim cx="60" cy="60" r="24" fill="none" stroke={jade} strokeWidth="1.5" opacity="0" />
          <circle data-anim cx="60" cy="60" r="34" fill="none" stroke={turquesa} strokeWidth="1" opacity="0" />
        </>
      )}
      {tipo === "orbita" && (
        <>
          <circle data-anim cx="60" cy="60" r="8" fill={color} opacity="0" />
          <circle data-anim cx="60" cy="30" r="5" fill={jade} opacity="0" />
          <circle data-anim cx="88" cy="75" r="5" fill={turquesa} opacity="0" />
          <circle data-anim cx="32" cy="75" r="5" fill={color} opacity="0" />
        </>
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 👋 PANTALLA DE BIENVENIDA — explica features con animación gráfica
// ──────────────────────────────────────────────────────────────────────────────
function BienvenidaTona({ nombreAgente = "Tona", onFinish }) {
  const [idx, setIdx] = useState(-1);
  const cardRef = useRef(null);
  const timerRef = useRef(null);
  const transicionando = useRef(false); // 🔒 evita doble avance


  useEffect(() => {
    if (!cardRef.current) return;
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      easing: "easeOutQuart",
    });
  }, [idx]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      avanzar();
    }, idx === -1 ? 2600 : 4200);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function avanzar() {
  if (transicionando.current) return; // ya hay una transición en curso, ignora

  if (idx >= FEATURES.length - 1) {
    onFinish?.();
    return;
  }
  if (!cardRef.current) {
    setIdx((p) => p + 1);
    return;
  }
  transicionando.current = true;
  anime({
    targets: cardRef.current,
    opacity: [1, 0],
    translateY: [0, -12],
    duration: 260,
    easing: "easeInQuart",
    complete: () => {
      setIdx((p) => p + 1);
      transicionando.current = false;
    },
  });
}

  const esIntro = idx === -1;
const feature = !esIntro ? FEATURES[idx] : null;

useEffect(() => {
  if (!esIntro && !feature) {
    onFinish?.();
  }
}, [esIntro, feature]);

if (!esIntro && !feature) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: T.obs,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 28,
    }}>
      {/* Progreso */}
      <div style={{ display: "flex", gap: 8 }}>
        {[-1, ...FEATURES.map((_, i) => i)].map((v, i) => (
          <div key={i} style={{
            width: v === idx ? 24 : 8, height: 8,
            borderRadius: 4,
            background: v <= idx ? T.jade : `${T.jade}22`,
            transition: "all 0.4s ease",
          }} />
        ))}
      </div>

      <div ref={cardRef} style={{
        width: "min(440px, 90vw)",
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${T.jade}22`,
        borderTop: `1px solid ${T.jade}55`,
        borderRadius: 20,
        padding: "40px 36px",
        boxShadow: `0 8px 64px rgba(0,0,0,0.6), 0 0 60px ${T.jade}06`,
        opacity: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 18,
      }}>
        {esIntro ? (
          <>
            <div style={{ fontSize: 9, color: `${T.jade}66`, letterSpacing: "2px", fontFamily: T.mono }}>
              {nombreAgente.toUpperCase()}
            </div>
            <div style={{ fontSize: 19, color: "rgba(237,235,230,0.9)", fontFamily: T.serif, lineHeight: 1.6 }}>
              Hola, bienvenido a {nombreAgente}, tu agente de estudio personal.
            </div>
            <div style={{ fontSize: 13, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, lineHeight: 1.6 }}>
              Antes de empezar, déjame contarte rápido en qué puedo ayudarte.
            </div>
          </>
        ) : (
          <>
            <IconoAnimado tipo={feature.icono} playKey={idx} />
            <div style={{ fontSize: 16, color: "rgba(237,235,230,0.9)", fontFamily: T.serif, fontWeight: 400 }}>
              {feature.titulo}
            </div>
            <div style={{ fontSize: 13, color: "rgba(237,235,230,0.45)", fontFamily: T.sans, lineHeight: 1.6 }}>
              {feature.texto}
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 8 }}>
          <button
            onClick={onFinish}
            style={{
              flex: 1, background: "transparent",
              border: `1px solid ${T.jade}22`, borderRadius: 8, padding: "10px",
              color: "rgba(237,235,230,0.35)", fontSize: 12,
              fontFamily: T.sans, cursor: "pointer",
            }}
          >
            Saltar introducción
          </button>
          <button
            onClick={avanzar}
            style={{
              flex: 2, background: `${T.jade}18`,
              border: `1px solid ${T.jade}45`, borderRadius: 8, padding: "10px",
              color: T.jade, fontSize: 12,
              fontFamily: T.sans, cursor: "pointer",
            }}
          >
            {idx >= FEATURES.length - 1 ? "Comenzar →" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 🧩 PASOS DEL PANEL DE PERSONALIZACIÓN
// ──────────────────────────────────────────────────────────────────────────────
const PASOS = [
  {
    id: "bienvenida",
    pregunta: (nombre_agente) =>
      `Vamos a personalizar cómo trabajamos juntos. Puedes cambiar esto después cuando quieras desde configuración. Para empezar, ¿cómo quieres que te llame?`,
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
    pregunta: () => `¿Cómo prefieres que me comunique contigo?`,
    campo: "tono",
    tipo: "opciones",
    opciones: [
      { valor: "amigable", label: "Amigable y casual",    descripcion: "Como un compañero de estudio" },
      { valor: "neutral",  label: "Neutral y directo",    descripcion: "Información precisa, sin rodeos" },
      { valor: "formal",   label: "Formal y profesional", descripcion: "Tono académico estructurado" },
      { valor: "directo",  label: "Directo y breve",      descripcion: "Respuestas lo más cortas posible" },
    ],
  },
  {
    id: "sitios",
    pregunta: (_, nombre_usuario) =>
      `Casi listo, ${nombre_usuario}. ¿Hay alguna página web que quieras que revise periódicamente? Por ejemplo, el portal de tu escuela, noticias de transporte, o cualquier sitio de consulta. Puedes saltar esto si quieres.`,
    campo: "sitios",
    tipo: "sitios",
    opcional: true,
  },
  {
    id: "listo",
    pregunta: (_, nombre_usuario) =>
      `Todo listo. Estoy configurado y listo para ayudarte, ${nombre_usuario}. Puedes ajustar cualquier preferencia más tarde desde el ícono de configuración.`,
    campo: null,
    tipo: "final",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// ⚙️ PANEL DE PERSONALIZACIÓN (antes era el componente completo)
// ──────────────────────────────────────────────────────────────────────────────
function PanelPersonalizacion({ userId, esPrimeraVez, onCompletado }) {
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

  const pasoActual     = PASOS[paso];
  const nombre_agente  = config.nombre_agente || "Tona";
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
      // Guardar config en el backend — esto marca onboarding_paso = 2 en el server
      await fetch(`${API}/agent/config/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: config.nombre_usuario,
          nombre_agente: config.nombre_agente,
          tono: config.tono,
        }),
      });

      // Guardar sitios si los hay
      for (const sitio of sitiosAgregados) {
        await fetch(`${API}/tasks/sitios/${userId}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sitio),
        });
      }

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
        <div style={{
          fontSize: 9, color: `${T.copal}66`,
          letterSpacing: "2px", fontFamily: T.mono,
          marginBottom: 20,
        }}>
          {nombre_agente.toUpperCase()} · CONFIGURACIÓN
        </div>

        <div ref={textRef} style={{
          fontSize: 16, color: "rgba(237,235,230,0.85)",
          fontFamily: T.serif, fontWeight: 400,
          lineHeight: 1.6, marginBottom: 28,
          opacity: 0,
        }}>
          {pregunta}
        </div>

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

// ──────────────────────────────────────────────────────────────────────────────
// 🚀 EXPORT PRINCIPAL — decide qué pantalla mostrar según onboarding_paso
// ──────────────────────────────────────────────────────────────────────────────
export default function OnboardingTona({ userId, paso, onAvanzarPaso, onCompletado }) {
  // paso 0 → nunca vio la bienvenida
  // paso 1 → ya vio la bienvenida, falta el panel de personalización
  // paso 2 → falta elegir qué clases de Classroom sincronizar con Drive
  if (paso === 0) {
    return (
      <BienvenidaTona
        nombreAgente="Tona"
        onFinish={() => onAvanzarPaso?.(1)}
      />
    );
  }

  if (paso === 1) {
    return (
      <PanelPersonalizacion
        userId={userId}
        esPrimeraVez={true}
        onCompletado={() => onAvanzarPaso?.(2)}
      />
    );
  }

  return (
    <PanelClasesClassroom
      userId={userId}
      onCompletado={onCompletado}
    />
  );
}

function PanelClasesClassroom({ userId, onCompletado }) {
  const [cursos, setCursos] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/tasks/cursos/${userId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const lista = data.cursos || [];
        setCursos(lista);
        setSeleccionados(new Set(lista.map((c) => c.id)));
      })
      .catch(() => setError("No se pudieron cargar tus clases de Classroom."))
      .finally(() => setCargando(false));
  }, [userId]);

  useEffect(() => {
    if (!cardRef.current) return;
    anime({ targets: cardRef.current, opacity: [0, 1], translateY: [24, 0], duration: 500, easing: "easeOutQuart" });
  }, [cargando]);

  function toggle(id) {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function seleccionarTodas() { setSeleccionados(new Set(cursos.map((c) => c.id))); }
  function quitarTodas() { setSeleccionados(new Set()); }

  async function continuar() {
    const elegidas = cursos.filter((c) => seleccionados.has(c.id));
    if (elegidas.length === 0) {
      onCompletado?.();
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await fetch(`${API}/tasks/drive/estructura/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cursos: elegidas.map((c) => ({ curso_id: c.id, nombre: c.nombre })),
        }),
      });
      onCompletado?.();
    } catch (e) {
      console.error("Error creando estructura de Drive:", e);
      setError("No se pudo crear la estructura en Drive. Puedes intentarlo después desde configuración.");
      setGuardando(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: T.obs,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 24,
    }}>
      <div ref={cardRef} style={{
        width: "min(480px, 90vw)", maxHeight: "80vh", overflow: "auto",
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${T.jade}22`, borderTop: `1px solid ${T.jade}55`,
        borderRadius: 20, padding: "36px 40px",
        boxShadow: `0 8px 64px rgba(0,0,0,0.6), 0 0 60px ${T.jade}06`,
        opacity: 0,
      }}>
        <div style={{ fontSize: 9, color: `${T.jade}66`, letterSpacing: "2px", fontFamily: T.mono, marginBottom: 20 }}>
          TONA · TUS CLASES
        </div>

        <div style={{ fontSize: 16, color: "rgba(237,235,230,0.85)", fontFamily: T.serif, lineHeight: 1.6, marginBottom: 10 }}>
          Puedo crear carpetas en tu Drive para organizar los documentos de cada clase.
        </div>
        <div style={{ fontSize: 12, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, lineHeight: 1.6, marginBottom: 22 }}>
          Selecciona las clases para las que quieres que arme una carpeta. Puedes cambiar esto después.
        </div>

        {cargando && (
          <div style={{ fontSize: 12, color: "rgba(237,235,230,0.3)", textAlign: "center", padding: "20px 0" }}>
            Cargando tus clases...
          </div>
        )}

        {!cargando && cursos.length === 0 && (
          <div style={{ fontSize: 12, color: "rgba(237,235,230,0.3)", textAlign: "center", padding: "20px 0" }}>
            No encontré clases activas en tu Classroom.
          </div>
        )}

        {!cargando && cursos.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={seleccionarTodas} style={{
                background: `${T.jade}12`, border: `1px solid ${T.jade}30`,
                borderRadius: 8, padding: "6px 12px", color: T.jade,
                fontSize: 11, fontFamily: T.sans, cursor: "pointer",
              }}>Seleccionar todas</button>
              <button onClick={quitarTodas} style={{
                background: "transparent", border: `1px solid ${T.amaranto}25`,
                borderRadius: 8, padding: "6px 12px", color: `${T.amaranto}aa`,
                fontSize: 11, fontFamily: T.sans, cursor: "pointer",
              }}>Quitar todas</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
              {cursos.map((c) => {
                const activa = seleccionados.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: activa ? `${T.jade}12` : "rgba(237,235,230,0.02)",
                      border: `1px solid ${activa ? T.jade + "45" : "rgba(237,235,230,0.08)"}`,
                      borderRadius: 8, padding: "10px 14px",
                      textAlign: "left", cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: `1px solid ${activa ? T.jade : "rgba(237,235,230,0.25)"}`,
                      background: activa ? T.jade : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {activa && <span style={{ color: "#000", fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: "rgba(237,235,230,0.8)", fontFamily: T.sans }}>
                      {c.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <div style={{ fontSize: 11, color: T.amaranto, marginBottom: 14 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onCompletado?.()}
            style={{
              flex: 1, background: "transparent",
              border: `1px solid ${T.jade}22`, borderRadius: 8, padding: "12px",
              color: "rgba(237,235,230,0.35)", fontSize: 12,
              fontFamily: T.sans, cursor: "pointer",
            }}
          >
            Saltar por ahora
          </button>
          <button
            onClick={continuar}
            disabled={guardando || cargando}
            style={{
              flex: 2, background: `${T.jade}18`,
              border: `1px solid ${T.jade}45`, borderRadius: 8, padding: "12px",
              color: T.jade, fontSize: 13, fontFamily: T.sans,
              cursor: guardando ? "wait" : "pointer",
              opacity: guardando ? 0.6 : 1,
            }}
          >
            {guardando ? "Creando carpetas..." : "Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}