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
      position:      "fixed",
      bottom:        120,
      left:          "50%",
      transform:     "translateX(-50%)",
      zIndex:        500,
      display:       "flex",
      flexDirection: "column",
      gap:           8,
      alignItems:    "center",
      pointerEvents: "none",
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
      .add({
        targets:     ref.current,
        opacity:     [0, 1],
        translateY:  [20, 0],
        scale:       [0.9, 1],
        duration:    400,
      })
      .add({
        targets:     ref.current,
        translateY:  [0, -2, 0],
        duration:    300,
        easing:      "easeOutElastic(1, 0.5)",
      })
      .add({
        targets:     ref.current,
        opacity:     0,
        translateY:  -10,
        duration:    350,
        delay:       2800,
        easing:      "easeInQuart",
      });
  }, []);

  return (
    <div ref={ref} style={{
      background:     "rgba(10,12,14,0.92)",
      border:         `1px solid ${color}44`,
      borderLeft:     `3px solid ${color}`,
      borderRadius:   10,
      padding:        "10px 18px",
      fontSize:       12,
      color:          "rgba(237,235,230,0.85)",
      fontFamily:     T.sans,
      fontWeight:     300,
      letterSpacing:  "0.2px",
      backdropFilter: "blur(12px)",
      whiteSpace:     "nowrap",
      opacity:        0,
      boxShadow:      `0 4px 24px rgba(0,0,0,0.4), 0 0 0 0.5px ${color}18`,
      pointerEvents:  "none",
    }}>
      {mensaje}
    </div>
  );
}

// ── ConfirmacionAccion ────────────────────────────────────────────────────────

export function ConfirmacionAccion() {
  const [data, setData] = useState(null);
  const ref      = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("confirmar", (payload) => setData(payload));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    // overlay fade
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 300, easing: "easeOutQuart" });
    // card entra con blur simulado via scale + opacity
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], scale: [0.85, 1.02], duration: 350 })
      .add({ targets: ref.current, scale: [1.02, 1], duration: 200, easing: "easeOutElastic(1,0.6)" });
    // líneas del borde se "dibujan"
    anime({
      targets:          ref.current,
      borderTopColor:   [`${T.copal}00`, `${T.copal}66`],
      borderColor:      [`${T.copal}00`, `${T.copal}33`],
      duration:         500,
      easing:           "easeOutQuart",
    });
  }, [data]);

  if (!data) return null;

  function responder(accion) {
    if (accion && accion !== "null") agenteBus.emit(accion, {});
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, scale: 0.92, translateY: 10, duration: 250, complete: () => setData(null) }, "-=150");
  }

  return (
    <div ref={overlayRef} style={{
      position:       "fixed", inset: 0, zIndex: 600,
      display:        "flex", alignItems: "center", justifyContent: "center",
      background:     "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      opacity:        0,
    }}>
      <div ref={ref} style={{
        width:          300,
        background:     "rgba(10,12,14,0.97)",
        border:         `1px solid ${T.copal}33`,
        borderTop:      `1px solid ${T.copal}66`,
        borderRadius:   16,
        padding:        "24px 28px",
        boxShadow:      `0 8px 48px rgba(0,0,0,0.6), 0 0 40px ${T.copal}08`,
        backdropFilter: "blur(20px)",
        opacity:        0,
      }}>
        <div style={{ fontSize: 9, color: `${T.copal}88`, letterSpacing: "1.5px", marginBottom: 12, fontFamily: T.mono }}>
          TONA · CONFIRMAR
        </div>
        <div style={{ fontSize: 14, color: "rgba(237,235,230,0.8)", fontWeight: 300, lineHeight: 1.5, marginBottom: 20 }}>
          {data.pregunta}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => responder(data.onSi)}  style={btnConfirm(T.jade)}>Sí, confirmar</button>
          <button onClick={() => responder(data.onNo)}  style={btnConfirm(T.amaranto)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function btnConfirm(color) {
  return {
    flex: 1, background: `${color}15`,
    border: `1px solid ${color}40`, borderRadius: 8,
    padding: "9px 0", color, fontSize: 12,
    fontFamily: T.sans, fontWeight: 300,
    cursor: "pointer", letterSpacing: "0.3px",
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
      targets:     ref.current,
      opacity:     activo ? [0, 1] : [1, 0],
      translateY:  activo ? [10, 0] : [0, -6],
      duration:    350,
      easing:      "easeOutQuart",
    });
  }, [activo]);

  return (
    <div ref={ref} style={{
      position:      "fixed", bottom: 170, left: "50%",
      transform:     "translateX(-50%)",
      zIndex:        500, display: "flex",
      alignItems:    "center", gap: 10,
      opacity:       0, pointerEvents: "none",
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
        targets:     r.current,
        translateY:  [-5, 0, -5],
        opacity:     [0.2, 1, 0.2],
        duration:    800,
        loop:        true,
        delay:       i * 180,
        easing:      "easeInOutSine",
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