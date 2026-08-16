// componentes_aislados/agentes/Categoria1.jsx
import { useEffect, useState, useRef } from "react";
import anime from "animejs";
import { T } from "../../tokens";
import { agenteBus } from "../AgenteTona";


// ── FlashMensaje ──────────────────────────────────────────────────────────────

export function FlashMensaje() {
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    return agenteBus.on("flash", ({ mensaje, tipo = "info" }) => {
      const id = Date.now();
      setMsgs((p) => [...p, { id, mensaje, tipo }]);
      setTimeout(() => {
        setMsgs((p) => p.filter((m) => m.id !== id));
      }, 4000);
    });
  }, []);

  const COLOR = {
    info:    T.copal,
    exito:   T.jade,
    error:   T.amaranto,
    urgente: T.turquesa,
  };

  return (
    <div style={{
      position: "fixed", bottom: 120, left: "50%",
      transform: "translateX(-50%)", zIndex: 500,
      display: "flex", flexDirection: "column",
      gap: 8, alignItems: "center", pointerEvents: "none",
    }}>
      {msgs.map((m) => (
        <FlashItem key={m.id} mensaje={m.mensaje} color={COLOR[m.tipo] || T.copal} />
      ))}
    </div>
  );
}

function FlashItem({ mensaje, color }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], translateY: [20, 0], scale: [0.9, 1], duration: 400 })
      .add({ targets: ref.current, translateY: [0, -2, 0], duration: 300, easing: "easeOutElastic(1, 0.5)" })
      .add({ targets: ref.current, opacity: 0, translateY: -10, duration: 350, delay: 2800, easing: "easeInQuart" });
  }, []);

  return (
    <div ref={ref} style={{
      background: "rgba(10,12,14,0.92)",
      border: `1px solid ${color}44`, borderLeft: `3px solid ${color}`,
      borderRadius: 10, padding: "10px 18px",
      fontSize: 12, color: "rgba(237,235,230,0.85)",
      fontFamily: T.sans, fontWeight: 300, letterSpacing: "0.2px",
      backdropFilter: "blur(12px)", whiteSpace: "nowrap",
      opacity: 0, boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 0.5px ${color}18`,
      pointerEvents: "none",
    }}>
      {mensaje}
    </div>
  );
}


// ── SolicitudDato ─────────────────────────────────────────────────────────────

export function SolicitudDato() {
  const [data, setData] = useState(null);
  const ref        = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("solicitar_dato", (p) => setData(p));
    const off2 = agenteBus.on("cerrar_todo",    () => setData(null));
    const off3 = agenteBus.on("flash",          () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 250, easing: "easeOutQuart" });
    anime({ targets: ref.current, opacity: [0, 1], translateY: [16, 0], duration: 300, easing: "easeOutQuart" });
  }, [data]);

  if (!data) return null;

  const CAMPO_LABEL = {
    titulo:    "Título",
    fecha:     "Fecha",
    hora:      "Hora",
    prioridad: "Prioridad",
    texto:     "Descripción",
  };

  const campo = data.campo || "dato";
  const label = CAMPO_LABEL[campo] || campo;

  const OPCIONES = {
    prioridad: ["Alta", "Media", "Baja"],
    hora: ["08:00", "09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
  };

  function enviarRespuesta(valor) {
    agenteBus.emit("enviar_texto_usuario", { texto: valor });
    setData(null);
  }

  function cerrar() {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, translateY: 10, duration: 200, complete: () => setData(null) }, "-=100");
  }

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 550,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      paddingBottom: 160, background: "rgba(0,0,0,0.15)",
      backdropFilter: "blur(2px)", opacity: 0,
    }}>
      <div ref={ref} style={{
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${T.copal}30`, borderTop: `1px solid ${T.copal}55`,
        borderRadius: 14, padding: "16px 20px",
        minWidth: 320, maxWidth: 400,
        boxShadow: `0 -4px 32px rgba(0,0,0,0.4), 0 0 40px ${T.copal}06`,
        opacity: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 9, color: `${T.copal}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            TONA · {label.toUpperCase()}
          </span>
          <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>

        {data.contexto && Object.keys(data.contexto).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(data.contexto).map(([k, v]) => (
              <span key={k} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 4,
                background: `${T.copal}15`, color: `${T.copal}cc`,
                fontFamily: T.mono,
              }}>
                {v}
              </span>
            ))}
          </div>
        )}

        {OPCIONES[campo] ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {OPCIONES[campo].map((op) => (
              <button key={op} onClick={() => enviarRespuesta(op)} style={{
                background: `${T.copal}12`, border: `1px solid ${T.copal}30`,
                borderRadius: 8, padding: "8px 16px",
                color: `rgba(237,235,230,0.75)`, fontSize: 12,
                fontFamily: T.sans, cursor: "pointer",
              }}>
                {op}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: `rgba(237,235,230,0.4)`, fontFamily: T.mono }}>
            Responde con voz o escribe en el chat
          </div>
        )}
      </div>
    </div>
  );
}



// ── ConfirmacionAccion ────────────────────────────────────────────────────────

export function ConfirmacionAccion() {
  const [data, setData]     = useState(null);
  const ref        = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("confirmar",   (payload) => setData(payload));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 300, easing: "easeOutQuart" });
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], scale: [0.85, 1.02], duration: 350 })
      .add({ targets: ref.current, scale: [1.02, 1], duration: 200, easing: "easeOutElastic(1,0.6)" });
  }, [data]);

  if (!data) return null;

  const esDestructiva = /eliminar|borrar/i.test(data.onSi || "");
  const accent = esDestructiva ? T.amaranto : T.jade;

  function responder(accion) {
    if (accion && accion !== "null") agenteBus.emit(accion, data.contexto || {});
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, scale: 0.92, translateY: 10, duration: 250, complete: () => setData(null) }, "-=150");
  }

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 600,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", opacity: 0,
    }}>
      <div ref={ref} style={{
        width: 320, background: "rgba(10,12,14,0.98)",
        border: `1px solid ${accent}30`, borderTop: `2px solid ${accent}`,
        borderRadius: 18, padding: "26px 28px",
        boxShadow: `0 12px 56px rgba(0,0,0,0.65), 0 0 48px ${accent}0a`,
        backdropFilter: "blur(24px)", opacity: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>{esDestructiva ? "⚠️" : "✓"}</span>
          <span style={{ fontSize: 9, color: `${accent}99`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            TONA · CONFIRMAR
          </span>
        </div>
        <div style={{ fontSize: 14.5, color: "rgba(237,235,230,0.85)", fontWeight: 300, lineHeight: 1.55, marginBottom: 24 }}>
          {data.pregunta}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => responder(data.onSi)} style={btnConfirm(accent)}>
            {data.labelSi || "Sí, confirmar"}
          </button>
          <button onClick={() => responder(data.onNo)} style={btnConfirm("rgba(237,235,230,0.3)", true)}>
            {data.labelNo || "Cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}




function btnConfirm(color, sutil = false) {
  return {
    flex: 1, background: sutil ? "transparent" : `${color}18`,
    border: `1px solid ${color}${sutil ? "25" : "45"}`, borderRadius: 10,
    padding: "10px 0", color, fontSize: 12.5,
    fontFamily: T.sans, fontWeight: 300,
    cursor: "pointer", letterSpacing: "0.3px",
    transition: "background 0.15s, border-color 0.15s",
  };
}

// ── IndicadorPensando ─────────────────────────────────────────────────────────

export function IndicadorPensando() {
  const [activo, setActivo] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("pensando_inicio", () => setActivo(true));
    const off2 = agenteBus.on("pensando_fin",    () => setActivo(false));
    return () => { off1(); off2(); };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    anime({
      targets: ref.current,
      opacity:    activo ? [0, 1] : [1, 0],
      translateY: activo ? [10, 0] : [0, -6],
      duration: 350, easing: "easeOutQuart",
    });
  }, [activo]);

  return (
    <div ref={ref} style={{
      position: "fixed", bottom: 170, left: "50%",
      transform: "translateX(-50%)", zIndex: 500,
      display: "flex", alignItems: "center", gap: 10,
      opacity: 0, pointerEvents: "none",
    }}>
      <PuntosAnimados />
      <span style={{ fontSize: 11, color: `${T.copal}88`, fontFamily: T.mono, letterSpacing: "1px" }}>
        tona está procesando
      </span>
    </div>
  );
}

function PuntosAnimados() {
  const r0 = useRef(null), r1 = useRef(null), r2 = useRef(null);

  useEffect(() => {
    [r0, r1, r2].forEach((r, i) => {
      if (!r.current) return;
      anime({
        targets: r.current,
        translateY: [-5, 0, -5], opacity: [0.2, 1, 0.2],
        duration: 800, loop: true, delay: i * 180, easing: "easeInOutSine",
      });
    });
  }, []);

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {[r0, r1, r2].map((r, i) => (
        <div key={i} ref={r} style={{ width: 5, height: 5, borderRadius: "50%", background: T.copal, opacity: 0.2 }} />
      ))}
    </div>
  );
}


// ── TarjetaLinks ──────────────────────────────────────────────────────────────

export function TarjetaLinks() {
  const [links, setLinks] = useState([]);
  const ref        = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("mostrar_links", ({ links: nuevosLinks }) => setLinks(nuevosLinks || []));
    const off2 = agenteBus.on("cerrar_vista",  () => setLinks([]));
    const off3 = agenteBus.on("cerrar_todo",   () => setLinks([]));
    return () => { off1(); off2(); off3(); };
  }, []);

  useEffect(() => {
    if (links.length === 0 || !ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 250, easing: "easeOutQuart" });
    anime({ targets: ref.current, opacity: [0, 1], translateY: [16, 0], duration: 350, easing: "easeOutQuart" });
  }, [links]);

  if (links.length === 0) return null;

  function cerrar() {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, translateY: 10, duration: 220, complete: () => setLinks([]) }, "-=100");
  }

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 560,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      paddingBottom: 160, background: "rgba(0,0,0,0.15)",
      backdropFilter: "blur(2px)", opacity: 0,
    }}>
      <div ref={ref} style={{
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${T.turquesa}30`, borderTop: `1px solid ${T.turquesa}55`,
        borderRadius: 14, padding: "16px 20px",
        minWidth: 300, maxWidth: 420,
        boxShadow: `0 -4px 32px rgba(0,0,0,0.4), 0 0 40px ${T.turquesa}06`,
        opacity: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 9, color: `${T.turquesa}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            TONA · ENLACES
          </span>
          <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((l, i) => (
  <a
    key={i}
    href={l.url}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      gap: 10,
      background: `${T.turquesa}10`, 
      border: `1px solid ${T.turquesa}25`,
      borderRadius: 8, 
      padding: "10px 14px",
      color: "rgba(237,235,230,0.85)", 
      fontSize: 12.5,
      fontFamily: T.sans, 
      textDecoration: "none",
      transition: "all 0.15s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = `${T.turquesa}55`;
      e.currentTarget.style.background  = `${T.turquesa}18`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = `${T.turquesa}25`;
      e.currentTarget.style.background  = `${T.turquesa}10`;
    }}
  >
    <span style={{
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    }}>
      {l.texto}
    </span>
    <span style={{ color: T.turquesa, fontSize: 13, flexShrink: 0 }}>↗</span>
  </a>
))}
        </div>
      </div>
    </div>
  );
}