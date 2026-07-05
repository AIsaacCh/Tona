import { useEffect, useState, useRef, useCallback } from "react";
import anime from "animejs";
import { T } from "../../tokens";
import { agenteBus } from "../AgenteTona";
import MicTona from "../MicTona";

const API = import.meta.env.VITE_API_URL;

// ── VistaShell ────────────────────────────────────────────────────────────────

export function VistaShell({
  titulo,
  categoria = "info",
  ancho = 420,
  alto = 480,
  onCerrar,
  onFijar,
  children,
  autoCierreMs = 6000,
}) {
  const ref        = useRef(null);
  const overlayRef = useRef(null);
  const borderRef  = useRef(null);
  const timerRef   = useRef(null);
  const userId     = localStorage.getItem("tona_user_id") || "demo";

  const ACCENT = { productividad: T.copal, academico: T.jade, info: T.turquesa, agente: T.copal };
  const accent = ACCENT[categoria];

  useEffect(() => {
    if (!ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 300, easing: "easeOutQuart" });
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], scaleX: [0.6, 1], scaleY: [0.6, 1], duration: 300 })
      .add({ targets: ref.current.querySelector?.(".vista-content"), opacity: [0, 1], translateY: [8, 0], duration: 280 });
    anime({ targets: borderRef.current, opacity: [0, 1], width: ["0%", "100%"], duration: 500, delay: 150, easing: "easeOutQuart" });
  }, []);

  const cerrar = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!overlayRef.current || !ref.current) {
      onCerrar?.();
      return;
    }
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, scale: 0.92, translateY: 12, duration: 260, complete: onCerrar }, "-=150");
  }, [onCerrar]);

  const fijar = useCallback(() => {
    // ✅ Emitir widget al dashboard y cerrar el overlay inmediatamente
    onFijar?.();
    cerrar();
  }, [onFijar, cerrar]);

  // ✅ cerrar_vista: solo cierra el overlay, no toca widgets del dashboard
  useEffect(() => {
    return agenteBus.on("cerrar_vista", cerrar);
  }, [cerrar]);

  // ✅ cerrar_todo: también cierra el overlay
  useEffect(() => {
    return agenteBus.on("cerrar_todo", cerrar);
  }, [cerrar]);

  // ✅ Auto-cierre tras fin de audio
  useEffect(() => {
    if (!autoCierreMs) return;
    const off = agenteBus.on("tona_habla_fin", () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        cerrar();
      }, autoCierreMs);
    });
    return () => {
      off();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cerrar, autoCierreMs]);

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 400,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", opacity: 0,
    }}>
      <div ref={ref} style={{
        width: ancho, maxHeight: alto,
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${accent}22`, borderTop: `1px solid ${accent}55`,
        borderRadius: 16, backdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: `0 8px 64px rgba(0,0,0,0.7), 0 0 40px ${accent}08`,
        opacity: 0, position: "relative",
      }}>
        <div ref={borderRef} style={{
          position: "absolute", top: 0, left: 0,
          height: 1, width: "0%",
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0,
        }} />
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${accent}18`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: `${accent}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>{titulo}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ transform: "scale(0.42)", transformOrigin: "center", marginRight: -4 }}>
              <MicTona size={48} userId={userId} />
            </div>
            <button onClick={fijar} style={{
              background: `${accent}15`, border: `1px solid ${accent}35`,
              borderRadius: 6, padding: "3px 9px", color: accent,
              fontSize: 9, fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px",
            }}>FIJAR</button>
            <button onClick={cerrar} style={{
              background: "transparent", border: "none",
              color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer",
            }}>✕</button>
          </div>
        </div>
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

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
  anuncios: [],
};

// ── VistaListaTareas ──────────────────────────────────────────────────────────

export function VistaListaTareas() {
  const [data,   setData]   = useState(null);
  const [filtro, setFiltro] = useState("todas");
  const userId = localStorage.getItem("tona_user_id") || "demo";

  useEffect(() => {
    const off1 = agenteBus.on("ver_tareas",   (p) => { setData(p ?? TAREAS_MOCK); });
    const off2 = agenteBus.on("cerrar_todo",  () => setData(null));
    const off3 = agenteBus.on("cerrar_vista", () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  async function completarTarea(id) {
    if (!id) return;
    setData((prev) => prev.map((t) => t.id === id ? { ...t, done: true } : t));
    try {
      await fetch(`${API}/tasks/completar/${userId}/${id}`, { method: "POST" });
    } catch (e) {
      console.error("Error completando tarea:", e);
    }
  }

  if (!data) return null;

  const filtradas = filtro === "todas" ? data : data.filter((t) => t.prioridad === filtro);
  const FUENTE_COLOR = { classroom: T.jade, calendar: T.turquesa, manual: T.copal };

  return (
    <VistaShell
      titulo="TONA · TAREAS PENDIENTES" categoria="productividad"
      ancho={420} alto={520}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "tareas" }); }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["todas", "Alta", "Media", "Baja"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            ...badge(f === "todas" ? T.copal : PRIORIDAD_COLOR[f]),
            background: filtro === f
              ? `${f === "todas" ? T.copal : PRIORIDAD_COLOR[f]}30`
              : `${f === "todas" ? T.copal : PRIORIDAD_COLOR[f]}12`,
            cursor: "pointer", border: "none", fontSize: 10, padding: "4px 10px",
          }}>{f}</button>
        ))}
      </div>

      {filtradas.length === 0 && (
        <div style={{ ...txt(0.3, 12), textAlign: "center", padding: "24px 0" }}>
          No hay tareas en esta categoría
        </div>
      )}

      {filtradas.map((t) => (
        <div
          key={t.id}
          onClick={() => !t.done && completarTarea(t.id)}
          style={{ ...rowStyle, opacity: t.done ? 0.35 : 1, cursor: t.done ? "default" : "pointer" }}
        >
          <div style={{
            width: 14, height: 14,
            border: `1px solid ${PRIORIDAD_COLOR[t.prioridad] || T.copal}66`,
            borderRadius: 3, flexShrink: 0,
            background: t.done ? PRIORIDAD_COLOR[t.prioridad] || T.copal : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {t.done && <span style={{ color: "#000", fontSize: 9, lineHeight: 1 }}>✓</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ ...txt(), textDecoration: t.done ? "line-through" : "none", display: "block" }}>
              {t.texto}
            </span>
            {t.fecha && (
              <span style={{ ...txt(0.25, 10), marginTop: 2, display: "block" }}>{t.fecha}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {t.fuente && (
              <span style={{ ...badge(FUENTE_COLOR[t.fuente] || T.copal), fontSize: 8 }}>{t.fuente}</span>
            )}
            <span style={badge(PRIORIDAD_COLOR[t.prioridad] || T.copal)}>{t.prioridad}</span>
          </div>
        </div>
      ))}

      <button
        onClick={() => agenteBus.emit("nueva_tarea", {})}
        style={{
          marginTop: 14, width: "100%",
          background: `${T.copal}08`, border: `1px dashed ${T.copal}30`,
          borderRadius: 8, padding: "10px",
          color: `${T.copal}66`, fontSize: 11,
          fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px",
        }}
      >
        + agregar tarea
      </button>
    </VistaShell>
  );
}

// ── VistaCalendario ───────────────────────────────────────────────────────────

export function VistaCalendario() {
  const [data,    setData]    = useState(null);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    const off1 = agenteBus.on("ver_calendario", (p) => {
      if (p && p.mes !== undefined) {
        setData({ mes: p.mes, año: p.año });
        if (Array.isArray(p.eventos)) setEventos(p.eventos);
      } else {
        setData({ mes: new Date().getMonth(), año: new Date().getFullYear() });
        setEventos([]);
      }
    });
    const off2 = agenteBus.on("cerrar_todo",  () => setData(null));
    const off3 = agenteBus.on("cerrar_vista", () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  if (!data) return null;

  const { mes, año } = data;
  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes   = new Date(año, mes + 1, 0).getDate();
  const hoy       = new Date().getDate();
  const mesActual = new Date().getMonth() === mes && new Date().getFullYear() === año;

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const celdas = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];

  const eventosPorDia = {};
  eventos.forEach((e) => {
    if (e.mes === mes && e.año === año) {
      if (!eventosPorDia[e.dia]) eventosPorDia[e.dia] = [];
      eventosPorDia[e.dia].push(e);
    }
  });

  const URGENCIA_COLOR = { alta: T.amaranto, media: T.copal, baja: T.jade };

  return (
    <VistaShell
      titulo="TONA · CALENDARIO" categoria="productividad"
      ancho={400} alto={480}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "calendario" }); }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button
          onClick={() => { const d = new Date(año, mes - 1, 1); setData({ mes: d.getMonth(), año: d.getFullYear() }); }}
          style={{ background: "transparent", border: "none", color: `${T.copal}66`, fontSize: 16, cursor: "pointer" }}
        >‹</button>
        <div style={{ ...txt(0.4, 13), fontFamily: T.serif, fontSize: 16 }}>{MESES[mes]} {año}</div>
        <button
          onClick={() => { const d = new Date(año, mes + 1, 1); setData({ mes: d.getMonth(), año: d.getFullYear() }); }}
          style={{ background: "transparent", border: "none", color: `${T.copal}66`, fontSize: 16, cursor: "pointer" }}
        >›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {DIAS.map((d) => (
          <div key={d} style={{ ...txt(0.25, 9), textAlign: "center", paddingBottom: 6, letterSpacing: "0.5px" }}>{d}</div>
        ))}
        {celdas.map((d, i) => {
          const tieneEventos = d && eventosPorDia[d];
          const esHoy = d && mesActual && d === hoy;
          const urgenciaMax = tieneEventos
            ? (eventosPorDia[d].find(e => e.urgencia === "alta") ? "alta"
               : eventosPorDia[d].find(e => e.urgencia === "media") ? "media" : "baja")
            : null;
          const dotColor = urgenciaMax ? URGENCIA_COLOR[urgenciaMax] : T.copal;

          return (
            <div key={i}
              title={tieneEventos ? eventosPorDia[d].map(e => e.titulo).join(" · ") : ""}
              style={{
                height: 38, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", borderRadius: 6,
                cursor: tieneEventos ? "pointer" : "default",
                background: esHoy ? `${T.copal}22` : tieneEventos ? `${dotColor}10` : "transparent",
                border: esHoy ? `1px solid ${T.copal}44` : tieneEventos ? `1px solid ${dotColor}28` : "1px solid transparent",
              }}
            >
              {d && <span style={{ ...txt(esHoy ? 0.9 : 0.45, 12), fontFamily: T.mono }}>{d}</span>}
              {tieneEventos && (
                <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                  {eventosPorDia[d].slice(0, 3).map((e, j) => (
                    <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: URGENCIA_COLOR[e.urgencia] || dotColor }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {eventos.filter(e => e.mes === mes && e.año === año).length > 0 && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${T.cen}`, paddingTop: 12 }}>
          <div style={{ ...txt(0.3, 9), letterSpacing: "1px", marginBottom: 8 }}>ESTE MES</div>
          {eventos
            .filter(e => e.mes === mes && e.año === año)
            .slice(0, 5)
            .map((e, i) => (
              <div key={i} style={{ ...rowStyle, padding: "5px 0" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: URGENCIA_COLOR[e.urgencia] || T.copal, flexShrink: 0 }} />
                <span style={txt(0.6)}>{e.titulo}</span>
                <span style={{ ...txt(0.25, 10), flexShrink: 0 }}>día {e.dia}</span>
              </div>
            ))
          }
        </div>
      )}

      <button
        onClick={() => agenteBus.emit("enviar_texto_usuario", { texto: "quiero agregar un evento al calendario" })}
        style={{
          marginTop: 14, width: "100%",
          background: `${T.turquesa}08`, border: `1px dashed ${T.turquesa}30`,
          borderRadius: 8, padding: "10px",
          color: `${T.turquesa}66`, fontSize: 11,
          fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px",
        }}
      >
        + agregar evento
      </button>
    </VistaShell>
  );
}

// ── VistaHorario ──────────────────────────────────────────────────────────────

export function VistaHorario() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const off1 = agenteBus.on("ver_horario",   (p) => { setData(p ?? HORARIO_MOCK); });
    const off2 = agenteBus.on("cerrar_todo",   () => setData(null));
    const off3 = agenteBus.on("cerrar_vista",  () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  if (!data) return null;
  const hoyIdx = new Date().getDay();

  return (
    <VistaShell
      titulo="TONA · HORARIO SEMANAL" categoria="academico"
      ancho={420} alto={460}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "horario" }); }}
    >
      {data.map((d, i) => (
        <div key={d.dia} style={{
          marginBottom: 12,
          background: i + 1 === hoyIdx ? `${T.turquesa}08` : "transparent",
          borderRadius: 8, padding: "8px 10px",
        }}>
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
    const off1 = agenteBus.on("ver_calificaciones", (p) => { setData(p ?? CALS_MOCK); });
    const off2 = agenteBus.on("cerrar_todo",         () => setData(null));
    const off3 = agenteBus.on("cerrar_vista",        () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  if (!data) return null;
  const prom = (data.reduce((a, c) => a + c.cal, 0) / data.length).toFixed(1);

  return (
    <VistaShell
      titulo="TONA · CALIFICACIONES" categoria="academico"
      ancho={380} alto={420}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "calificaciones" }); }}
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
  const [data,     setData]     = useState(null);
  const [cargando, setCargando] = useState(false);
  const [tab,      setTab]      = useState("tareas");
  const [cursos,   setCursos]   = useState([]);
  const userId = localStorage.getItem("tona_user_id") || "demo";

  useEffect(() => {
    const off1 = agenteBus.on("ver_materia", async (p) => {
      if (p && p.curso_id) {
        setCargando(true);
        setData({ nombre: p.nombre || "Cargando...", tareas: [], anuncios: [], pendientes: 0 });
        setTab("tareas");
        try {
          const resp = await fetch(`${API}/tasks/materia/${userId}/${p.curso_id}`);
          if (resp.ok) {
            const det = await resp.json();
            setData({
              nombre: det.nombre,
              curso_id: p.curso_id,
              promedio: "—",
              progreso: 0,
              pendientes: det.pendientes,
              tareas: det.tareas.map(t => ({
                texto: t.titulo,
                fecha: t.fecha || "Sin fecha",
                done: t.completada,
                tipo: t.tipo,
              })),
              anuncios: det.anuncios,
            });
          }
        } catch (e) {
          console.error("Error cargando materia:", e);
        } finally {
          setCargando(false);
        }
      } else if (p && p.nombre) {
        setData({ ...MATERIA_MOCK, nombre: p.nombre });
        setTab("tareas");
        try {
          const resp = await fetch(`${API}/tasks/cursos/${userId}`);
          if (resp.ok) {
            const d = await resp.json();
            setCursos(d.cursos || []);
          }
        } catch {}
      } else {
        setData(MATERIA_MOCK);
        setTab("tareas");
      }
    });
    const off2 = agenteBus.on("cerrar_todo",  () => setData(null));
    const off3 = agenteBus.on("cerrar_vista", () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  if (!data) return null;

  const TIPO_LABEL = { ASSIGNMENT: "Tarea", QUESTION: "Pregunta", MATERIAL: "Material" };

  return (
    <VistaShell
      titulo={`TONA · ${data.nombre.toUpperCase()}`} categoria="academico"
      ancho={400} alto={480}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "materias" }); }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { val: data.promedio || "—",     label: "promedio",   color: T.jade     },
          { val: `${data.progreso ?? 0}%`, label: "avance",     color: T.copal    },
          { val: data.pendientes ?? 0,     label: "pendientes", color: T.amaranto },
        ].map(({ val, label, color }) => (
          <div key={label} style={{ flex: 1, background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontFamily: T.mono, fontSize: 24, color, lineHeight: 1 }}>{val}</div>
            <div style={{ ...txt(0.35, 10), marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {!data.curso_id && cursos.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...txt(0.3, 9), letterSpacing: "1px", marginBottom: 8 }}>SELECCIONAR CURSO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cursos.map((c) => (
              <button
                key={c.id}
                onClick={() => agenteBus.emit("ver_materia", { nombre: c.nombre, curso_id: c.id })}
                style={{
                  background: `${T.jade}08`, border: `1px solid ${T.jade}22`,
                  borderRadius: 8, padding: "8px 12px", textAlign: "left",
                  color: `rgba(237,235,230,0.7)`, fontSize: 12,
                  fontFamily: T.sans, cursor: "pointer",
                }}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.curso_id && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["tareas", "anuncios"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                ...badge(tab === t ? T.jade : T.copal),
                background: tab === t ? `${T.jade}25` : `${T.copal}10`,
                cursor: "pointer", border: "none", fontSize: 10, padding: "4px 12px",
              }}>{t}</button>
            ))}
          </div>

          {cargando && (
            <div style={{ ...txt(0.3, 12), textAlign: "center", padding: "20px 0" }}>cargando...</div>
          )}

          {!cargando && tab === "tareas" && (
            <>
              {data.tareas.length === 0 && (
                <div style={{ ...txt(0.3, 12), textAlign: "center", padding: "20px 0" }}>Sin tareas</div>
              )}
              {data.tareas.map((t, i) => (
                <div key={i} style={{ ...rowStyle, opacity: t.done ? 0.35 : 1 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.done ? T.jade : T.copal, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ ...txt(t.done ? 0.3 : 0.6), textDecoration: t.done ? "line-through" : "none" }}>{t.texto}</span>
                    {t.tipo && t.tipo !== "ASSIGNMENT" && (
                      <span style={{ ...badge(T.turquesa), marginLeft: 6 }}>{TIPO_LABEL[t.tipo] || t.tipo}</span>
                    )}
                  </div>
                  <span style={txt(0.25, 10)}>{t.fecha}</span>
                </div>
              ))}
            </>
          )}

          {!cargando && tab === "anuncios" && (
            <>
              {data.anuncios.length === 0 && (
                <div style={{ ...txt(0.3, 12), textAlign: "center", padding: "20px 0" }}>Sin anuncios recientes</div>
              )}
              {data.anuncios.map((a, i) => (
                <div key={i} style={{ ...rowStyle, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span style={txt(0.25, 9)}>{a.fecha}</span>
                  <span style={txt(0.65, 12)}>{a.texto}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </VistaShell>
  );
}

// ── VistaArchivosDrive ────────────────────────────────────────────────────────

const TIPO_COLOR_DRIVE = {
  pdf: T.amaranto, docx: T.turquesa, doc: T.turquesa,
  xlsx: T.jade, sheet: T.jade, slides: T.copal,
  pptx: T.copal, txt: "rgba(237,235,230,0.3)", archivo: T.turquesa,
};

export function VistaArchivosDrive() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const off1 = agenteBus.on("ver_drive",     (p) => { setData(Array.isArray(p) ? p : []); });
    const off2 = agenteBus.on("cerrar_todo",   () => setData(null));
    const off3 = agenteBus.on("cerrar_vista",  () => setData(null));
    return () => { off1(); off2(); off3(); };
  }, []);

  if (!data) return null;

  return (
    <VistaShell
      titulo="TONA · ARCHIVOS DRIVE" categoria="info"
      ancho={420} alto={480}
      onCerrar={() => setData(null)}
      onFijar={() => { agenteBus.emit("convertir_a_widget", { tipo: "archivos" }); }}
    >
      {data.length === 0 && (
        <div style={{ ...txt(0.3, 12), textAlign: "center", padding: "24px 0" }}>
          No se encontraron archivos
        </div>
      )}

      {data.map((f) => {
  const color = TIPO_COLOR_DRIVE[f.tipo] || T.turquesa;
  return (
    <a
      key={f.id}
      href={f.url || f.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...rowStyle, textDecoration: "none", cursor: "pointer" }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: `${color}20`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, color, fontFamily: T.mono }}>{f.tipo.toUpperCase()}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ ...txt(0.7), display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {f.nombre}
        </span>
        <span style={{ ...txt(0.25, 10), marginTop: 2, display: "block" }}>
          {f.tamaño || "—"} · {f.modificado}
        </span>
      </div>
    </a>
  );
})}
    </VistaShell>
  );
}