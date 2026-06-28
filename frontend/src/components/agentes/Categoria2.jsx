// componentes_aislados/agentes/Categoria2.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import anime from "animejs";
import { T } from "../../tokens";
import { agenteBus } from "../AgenteTona";


// ── VistaShell ────────────────────────────────────────────────────────────────

export function VistaShell({ titulo, categoria = "info", ancho = 420, alto = 480, onCerrar, onFijar, children }) {
  const ref        = useRef(null);
  const overlayRef = useRef(null);
  const borderRef  = useRef(null);

  const ACCENT = { productividad: T.copal, academico: T.jade, info: T.turquesa, agente: T.copal };
  const accent = ACCENT[categoria];

  useEffect(() => {
    if (!ref.current) return;

    // 1. Overlay entra
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 300, easing: "easeOutQuart" });

    // 2. Borde se dibuja primero
    anime.timeline({ easing: "easeOutQuart" })
      .add({
        targets:  ref.current,
        opacity:  [0, 1],
        scaleX:   [0.6, 1],
        scaleY:   [0.6, 1],
        duration: 300,
      })
      // 3. Contenido aparece después
      .add({
        targets:   ref.current.querySelector?.(".vista-content"),
        opacity:   [0, 1],
        translateY:[8, 0],
        duration:  280,
      });

    // 4. Línea superior se ilumina
    anime({
      targets:  borderRef.current,
      opacity:  [0, 1],
      width:    ["0%", "100%"],
      duration: 500,
      delay:    150,
      easing:   "easeOutQuart",
    });
  }, []);

  const cerrar = useCallback(() => {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, scale: 0.92, translateY: 12, duration: 260, complete: onCerrar }, "-=150");
  }, [onCerrar]);

  const fijar = useCallback(() => {
    // Contrae la vista hacia esquina y desaparece el overlay
    const rect = ref.current?.getBoundingClientRect();
    anime.timeline({ easing: "easeInOutQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 300 })
      .add({
        targets:   ref.current,
        width:     [ancho, 240],
        height:    [alto,  240],
        translateX:[0, (window.innerWidth * 0.3)],
        translateY:[0, -(window.innerHeight * 0.25)],
        opacity:   [1, 0],
        duration:  500,
        complete:  () => onFijar?.(rect),
      }, "-=200");
  }, [onFijar, ancho, alto]);

  // Escucha cerrar_todo
  useEffect(() => {
    return agenteBus.on("cerrar_todo", cerrar);
  }, [cerrar]);

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 400,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
      opacity: 0,
    }}>
      <div ref={ref} style={{
        width: ancho, maxHeight: alto,
        background:     "rgba(9,11,13,0.97)",
        border:         `1px solid ${accent}22`,
        borderTop:      `1px solid ${accent}55`,
        borderRadius:   16,
        backdropFilter: "blur(20px)",
        display:        "flex", flexDirection: "column",
        overflow:       "hidden",
        boxShadow:      `0 8px 64px rgba(0,0,0,0.7), 0 0 40px ${accent}08`,
        opacity:        0,
        position:       "relative",
      }}>
        {/* Línea animada superior */}
        <div ref={borderRef} style={{
          position:   "absolute", top: 0, left: 0,
          height:     1, width:  "0%",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity:    0,
        }} />

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${accent}18`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: `${accent}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            {titulo}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fijar} style={{
              background: `${accent}15`, border: `1px solid ${accent}35`,
              borderRadius: 6, padding: "3px 9px", color: accent,
              fontSize: 9, fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px",
            }}>
              FIJAR
            </button>
            <button onClick={cerrar} style={{
              background: "transparent", border: "none",
              color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer",
            }}>✕</button>
          </div>
        </div>

        {/* Contenido */}
        <div className="vista-content" style={{ flex: 1, overflow: "auto", padding: "16px 18px", opacity: 0 }}>
          {children}
        </div>

        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${accent}33,transparent)`, flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.cen}` };
const txt = (op = 0.55, sz = 12) => ({ fontSize: sz, color: `rgba(237,235,230,${op})`, fontWeight: 300, fontFamily: T.sans });
const badge = (color) => ({ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: `${color}22`, color, letterSpacing: "0.3px" });
const PRIORIDAD_COLOR = { Alta: T.amaranto, Media: T.copal, Baja: T.jade };

const TAREAS_MOCK = [
  { id: 1, texto: "Práctica de Física",     prioridad: "Alta",  done: false },
  { id: 2, texto: "Examen Cálculo jueves",  prioridad: "Alta",  done: false },
  { id: 3, texto: "Leer capítulo 4 de SO",  prioridad: "Media", done: false },
  { id: 4, texto: "Notas de Inglés",        prioridad: "Baja",  done: true  },
  { id: 5, texto: "Reporte de laboratorio", prioridad: "Media", done: false },
];

const HORARIO_MOCK = [
  { dia: "LUNES",     clases: ["Cálculo 07:00", "Física 10:00"] },
  { dia: "MARTES",    clases: ["Programación 09:00", "Inglés 12:00"] },
  { dia: "MIÉRCOLES", clases: ["SO 08:00", "Cálculo 11:00"] },
  { dia: "JUEVES",    clases: ["Física 07:00", "Programación 10:00"] },
  { dia: "VIERNES",   clases: ["Inglés 09:00", "SO 13:00"] },
];

const CALS_MOCK = [
  { materia: "Cálculo",      cal: 8.5 },
  { materia: "Programación", cal: 9.8 },
  { materia: "Física",       cal: 7.2 },
  { materia: "Inglés",       cal: 8.0 },
  { materia: "SO",           cal: 6.9 },
];

const MATERIA_MOCK = {
  nombre: "Cálculo", promedio: "8.5", progreso: 78, pendientes: 2,
  tareas: [
    { texto: "Tarea 3 — integrales", fecha: "Jun 27", done: false },
    { texto: "Examen parcial",       fecha: "Jun 28", done: false },
    { texto: "Tarea 2 — derivadas",  fecha: "Jun 20", done: true  },
  ],
};

// ── VistaListaTareas ──────────────────────────────────────────────────────────

export function VistaListaTareas() {
  const [data,   setData]   = useState(null);
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    const off1 = agenteBus.on("ver_tareas", (p) => setData(p || TAREAS_MOCK));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;

  const filtradas = filtro === "todas" ? data : data.filter((t) => t.prioridad === filtro);

  return (
    <VistaShell
      titulo="TONA · TAREAS PENDIENTES"
      categoria="productividad"
      ancho={400} alto={500}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "tareas" }); setData(null); }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["todas", "Alta", "Media", "Baja"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            ...badge(f === "todas" ? T.copal : PRIORIDAD_COLOR[f]),
            background: filtro === f ? `${f === "todas" ? T.copal : PRIORIDAD_COLOR[f]}30` : `${f === "todas" ? T.copal : PRIORIDAD_COLOR[f]}12`,
            cursor: "pointer", border: "none", fontSize: 10, padding: "4px 10px",
          }}>{f}</button>
        ))}
      </div>
      {filtradas.map((t) => (
        <div key={t.id} style={{ ...rowStyle, opacity: t.done ? 0.35 : 1 }}>
          <div style={{ width: 10, height: 10, border: `1px solid ${PRIORIDAD_COLOR[t.prioridad]}66`, borderRadius: 2, flexShrink: 0, background: t.done ? PRIORIDAD_COLOR[t.prioridad] : "transparent" }} />
          <span style={{ ...txt(), flex: 1, textDecoration: t.done ? "line-through" : "none" }}>{t.texto}</span>
          <span style={badge(PRIORIDAD_COLOR[t.prioridad])}>{t.prioridad}</span>
        </div>
      ))}
    </VistaShell>
  );
}

// ── VistaCalendario ───────────────────────────────────────────────────────────

export function VistaCalendario() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const off1 = agenteBus.on("ver_calendario", (p) => setData(p || { mes: new Date().getMonth(), año: new Date().getFullYear() }));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;

  const { mes, año } = data;
  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes   = new Date(año, mes + 1, 0).getDate();
  const hoy       = new Date().getDate();
  const mesActual = new Date().getMonth() === mes && new Date().getFullYear() === año;
  const MESES     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DIAS      = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const celdas    = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const EVENTOS   = { 28: "Examen Cálculo", 30: "Entrega práctica" };

  return (
    <VistaShell
      titulo="TONA · CALENDARIO" categoria="productividad"
      ancho={380} alto={440}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "calendario" }); setData(null); }}
    >
      <div style={{ ...txt(0.4, 13), textAlign: "center", marginBottom: 14, fontFamily: T.serif, fontSize: 16 }}>
        {MESES[mes]} {año}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {DIAS.map((d) => (
          <div key={d} style={{ ...txt(0.25, 9), textAlign: "center", paddingBottom: 6, letterSpacing: "0.5px" }}>{d}</div>
        ))}
        {celdas.map((d, i) => (
          <div key={i} style={{
            height: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            borderRadius: 6,
            background: d && mesActual && d === hoy ? `${T.copal}22` : EVENTOS[d] ? `${T.amaranto}12` : "transparent",
            border: d && mesActual && d === hoy ? `1px solid ${T.copal}44` : EVENTOS[d] ? `1px solid ${T.amaranto}30` : "1px solid transparent",
          }}>
            {d && <span style={{ ...txt(d === hoy && mesActual ? 0.9 : 0.45, 12), fontFamily: T.mono }}>{d}</span>}
            {EVENTOS[d] && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.amaranto, marginTop: 1 }} />}
          </div>
        ))}
      </div>
    </VistaShell>
  );
}

// ── VistaHorario ──────────────────────────────────────────────────────────────

export function VistaHorario() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const off1 = agenteBus.on("ver_horario", (p) => setData(p || HORARIO_MOCK));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;
  const hoyIdx = new Date().getDay();

  return (
    <VistaShell
      titulo="TONA · HORARIO SEMANAL" categoria="academico"
      ancho={420} alto={460}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "horario" }); setData(null); }}
    >
      {data.map((d, i) => (
        <div key={d.dia} style={{ marginBottom: 12, background: i + 1 === hoyIdx ? `${T.turquesa}08` : "transparent", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ ...txt(i + 1 === hoyIdx ? 0.7 : 0.3, 9), letterSpacing: "1px", fontFamily: T.mono, marginBottom: 8 }}>
            {d.dia} {i + 1 === hoyIdx && "· HOY"}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {d.clases.map((c) => (
              <span key={c} style={{ ...badge(T.turquesa), fontSize: 11, padding: "4px 10px" }}>{c}</span>
            ))}
          </div>
        </div>
      ))}
    </VistaShell>
  );
}

// ── VistaCalificaciones ───────────────────────────────────────────────────────

export function VistaCalificaciones() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const off1 = agenteBus.on("ver_calificaciones", (p) => setData(p || CALS_MOCK));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;
  const prom = (data.reduce((a, c) => a + c.cal, 0) / data.length).toFixed(1);

  return (
    <VistaShell
      titulo="TONA · CALIFICACIONES" categoria="academico"
      ancho={380} alto={420}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "calificaciones" }); setData(null); }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20, padding: "0 0 16px", borderBottom: `1px solid ${T.cen}` }}>
        <span style={{ fontFamily: T.mono, fontSize: 40, color: T.jade, lineHeight: 1 }}>{prom}</span>
        <span style={txt(0.35, 12)}>promedio general</span>
      </div>
      {data.map((c) => {
        const color = c.cal >= 9 ? T.jade : c.cal >= 7 ? T.copal : T.amaranto;
        return (
          <div key={c.materia} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={txt(0.6)}>{c.materia}</span>
              <span style={{ ...txt(0.9, 13), fontFamily: T.mono, color }}>{c.cal.toFixed(1)}</span>
            </div>
            <div style={{ height: 3, background: T.mutedLow, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${(c.cal / 10) * 100}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
            </div>
          </div>
        );
      })}
    </VistaShell>
  );
}

// ── VistaMaterias ─────────────────────────────────────────────────────────────

export function VistaMaterias() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const off1 = agenteBus.on("ver_materia", (p) => setData(p || MATERIA_MOCK));
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;

  return (
    <VistaShell
      titulo={`TONA · ${data.nombre.toUpperCase()}`} categoria="academico"
      ancho={380} alto={400}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "materias" }); setData(null); }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { val: data.promedio, label: "promedio",   color: T.jade     },
          { val: `${data.progreso}%`, label: "avance", color: T.copal  },
          { val: data.pendientes, label: "pendientes", color: T.amaranto },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ flex: 1, background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontFamily: T.mono, fontSize: 26, color, lineHeight: 1 }}>{val}</div>
            <div style={{ ...txt(0.35, 10), marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ ...txt(0.3, 9), letterSpacing: "1px", marginBottom: 10 }}>TAREAS</div>
      {data.tareas.map((t, i) => (
        <div key={i} style={rowStyle}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.done ? T.jade : T.copal, flexShrink: 0 }} />
          <span style={{ ...txt(t.done ? 0.3 : 0.6), flex: 1, textDecoration: t.done ? "line-through" : "none" }}>{t.texto}</span>
          <span style={txt(0.25, 10)}>{t.fecha}</span>
        </div>
      ))}
    </VistaShell>
  );
}