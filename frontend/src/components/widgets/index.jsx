// widgets/index.jsx
// Los 13 widgets — cada uno con vista sm y md
import React from "react";
import { T } from "../../tokens";


// ── Helpers de estilo ─────────────────────────────────────────────────────────

const row = {
  display:       "flex",
  alignItems:    "center",
  gap:           8,
  padding:       "5px 0",
  borderBottom:  `1px solid ${T.cen}`,
};

const label = (opacity = 0.5) => ({
  fontSize:   11,
  color:      `rgba(237,235,230,${opacity})`,
  fontWeight: 300,
  fontFamily: T.sans,
});

const badge = (color) => ({
  fontSize:        9,
  padding:         "2px 6px",
  borderRadius:    4,
  background:      `${color}22`,
  color:           color,
  letterSpacing:   "0.3px",
  flexShrink:      0,
});

const statBig = (color = T.copal) => ({
  fontFamily:  T.mono,
  fontSize:    32,
  color:       color,
  lineHeight:  1,
  fontWeight:  400,
});

const statLabel = {
  fontSize:      10,
  color:         T.muted,
  letterSpacing: "0.5px",
  marginTop:     4,
};

const bar = (pct, color) => (
  <div style={{ height: 3, background: T.mutedLow, borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
  </div>
);

// ── Datos placeholder ─────────────────────────────────────────────────────────

const TAREAS = [
  { id: 1, texto: "Práctica de Física",       prioridad: "Alta",  done: false },
  { id: 2, texto: "Examen Cálculo · jueves",  prioridad: "Alta",  done: false },
  { id: 3, texto: "Leer cap. 4 de SO",        prioridad: "Media", done: false },
  { id: 4, texto: "Notas de Inglés",          prioridad: "Baja",  done: true  },
];

const RECORDATORIOS = [
  { id: 1, texto: "Asesoría Cálculo",    cuando: "Hoy, 17:00",      urgente: true  },
  { id: 2, texto: "Entregar práctica",   cuando: "Mañana, 09:00",   urgente: true  },
  { id: 3, texto: "Reunión de proyecto", cuando: "Viernes, 15:00",  urgente: false },
];

const MATERIAS = [
  { nombre: "Cálculo",      pct: 78, color: T.copal   },
  { nombre: "Programación", pct: 91, color: T.jade     },
  { nombre: "Física",       pct: 54, color: T.turquesa },
  { nombre: "Inglés",       pct: 66, color: T.copal    },
  { nombre: "SO",           pct: 42, color: T.amaranto },
];

const CALIFICACIONES = [
  { materia: "Cálculo",      cal: 8.5 },
  { materia: "Programación", cal: 9.8 },
  { materia: "Física",       cal: 7.2 },
  { materia: "Inglés",       cal: 8.0 },
  { materia: "SO",           cal: 6.9 },
];

const HORARIO = [
  { dia: "LUN", clases: ["Cálculo 07:00", "Física 10:00"] },
  { dia: "MAR", clases: ["Programación 09:00", "Inglés 12:00"] },
  { dia: "MIÉ", clases: ["SO 08:00", "Cálculo 11:00"] },
  { dia: "JUE", clases: ["Física 07:00", "Programación 10:00"] },
  { dia: "VIE", clases: ["Inglés 09:00", "SO 13:00"] },
];

const ARCHIVOS = [
  { nombre: "Proyecto_TONA.pdf",    tipo: "pdf",  hora: "17:45" },
  { nombre: "Notas_reunion.docx",   tipo: "docx", hora: "16:02" },
  { nombre: "Informe_mensual.xlsx", tipo: "xlsx", hora: "Ayer"  },
];

const TIPO_COLOR = {
  pdf:  T.amaranto,
  docx: T.turquesa,
  xlsx: T.jade,
  pptx: T.copal,
  txt:  T.muted,
};

const PRIORIDAD_COLOR = {
  Alta:  T.amaranto,
  Media: T.copal,
  Baja:  T.jade,
};

const ACCIONES = [
  { label: "Ver tareas",      accion: "mostrar_tareas"      },
  { label: "Próximo examen",  accion: "mostrar_examen"      },
  { label: "Mi horario",      accion: "mostrar_horario"     },
  { label: "Notas rápidas",   accion: "mostrar_notas"       },
];

// ── Widgets ───────────────────────────────────────────────────────────────────

export function WidgetTareas() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {TAREAS.map((t) => (
      <div key={t.id} style={{ ...row, opacity: t.done ? 0.35 : 1 }}>
        <div style={{ width: 10, height: 10, border: `1px solid ${PRIORIDAD_COLOR[t.prioridad]}66`, borderRadius: 2, flexShrink: 0, background: t.done ? PRIORIDAD_COLOR[t.prioridad] : "transparent" }} />
        <span style={{ ...label(), flex: 1, textDecoration: t.done ? "line-through" : "none" }}>{t.texto}</span>
        <span style={badge(PRIORIDAD_COLOR[t.prioridad])}>{t.prioridad}</span>
      </div>
    ))}
  </div>;
}

export function WidgetTareasSm() {
  const pendientes = TAREAS.filter((t) => !t.done).length;
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.amaranto)}>{pendientes}</div>
    <div style={statLabel}>tareas pendientes</div>
    <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
      {TAREAS.slice(0, 3).map((t) => (
        <span key={t.id} style={badge(PRIORIDAD_COLOR[t.prioridad])}>{t.prioridad}</span>
      ))}
    </div>
  </div>;
}

export function WidgetRecordatorios() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {RECORDATORIOS.map((r) => (
      <div key={r.id} style={row}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.urgente ? T.amaranto : T.muted, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={label()}>{r.texto}</div>
          <div style={{ ...label(0.25), fontSize: 10 }}>{r.cuando}</div>
        </div>
      </div>
    ))}
  </div>;
}

export function WidgetRecordatoriosSm() {
  const urgentes = RECORDATORIOS.filter((r) => r.urgente).length;
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.copal)}>{urgentes}</div>
    <div style={statLabel}>recordatorios urgentes</div>
    <div style={{ ...label(0.3), marginTop: 8, fontSize: 10 }}>{RECORDATORIOS[0].texto} · {RECORDATORIOS[0].cuando}</div>
  </div>;
}

export function WidgetCalendario() {
  const hoy = new Date().getDay();
  const dias = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];
  return <div style={{ display: "flex", gap: 4 }}>
    {dias.map((d, i) => (
      <div key={d} style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        padding: "6px 2px", borderRadius: 6,
        background: i === hoy ? `${T.copal}18` : "transparent",
        border: i === hoy ? `1px solid ${T.copal}33` : "1px solid transparent",
      }}>
        <span style={{ fontSize: 8, color: i === hoy ? T.copal : T.muted, letterSpacing: "0.5px" }}>{d}</span>
        <span style={{ fontSize: 11, color: i === hoy ? T.nixtamal : "rgba(237,235,230,0.35)" }}>
          {new Date(Date.now() + (i - hoy) * 86400000).getDate()}
        </span>
      </div>
    ))}
  </div>;
}

export function WidgetCalendarioSm() {
  const hoy = new Date();
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={{ ...statBig(T.turquesa), fontSize: 42 }}>{hoy.getDate()}</div>
    <div style={statLabel}>{hoy.toLocaleDateString("es-MX", { weekday: "long", month: "long" })}</div>
  </div>;
}

export function WidgetContadorRegresivo() {
  const examen = new Date();
  examen.setDate(examen.getDate() + 3);
  examen.setHours(9, 0, 0, 0);
  const diff   = examen - new Date();
  const dias   = Math.floor(diff / 86400000);
  const horas  = Math.floor((diff % 86400000) / 3600000);
  const mins   = Math.floor((diff % 3600000) / 60000);
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ ...label(0.35), fontSize: 10, letterSpacing: "0.5px" }}>PRÓXIMO EXAMEN · CÁLCULO</div>
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
      {[{ v: dias, l: "días" }, { v: horas, l: "hrs" }, { v: mins, l: "min" }].map(({ v, l }) => (
        <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ ...statBig(T.amaranto), fontSize: 28 }}>{String(v).padStart(2, "0")}</span>
          <span style={{ ...statLabel, fontSize: 9 }}>{l}</span>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 4 }}>{bar(((3 * 86400000 - diff) / (3 * 86400000)) * 100, T.amaranto)}</div>
  </div>;
}

export function WidgetContadorRegresivоSm() {
  const diff = new Date().setDate(new Date().getDate() + 3) - Date.now();
  const dias = Math.floor(diff / 86400000);
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.amaranto)}>{dias}d</div>
    <div style={statLabel}>para examen de Cálculo</div>
  </div>;
}

export function WidgetMaterias() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {MATERIAS.map((m) => (
      <div key={m.nombre}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={label(0.5)}>{m.nombre}</span>
          <span style={{ ...label(0.35), fontFamily: T.mono }}>{m.pct}%</span>
        </div>
        {bar(m.pct, m.color)}
      </div>
    ))}
  </div>;
}

export function WidgetMateriasSm() {
  const prom = Math.round(MATERIAS.reduce((a, m) => a + m.pct, 0) / MATERIAS.length);
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.jade)}>{prom}%</div>
    <div style={statLabel}>progreso promedio</div>
    <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
      {MATERIAS.map((m) => (
        <div key={m.nombre} style={{ flex: 1, height: 24, borderRadius: 3, background: `${m.color}22`, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
          <div style={{ width: "100%", height: `${m.pct}%`, background: m.color, opacity: 0.7, borderRadius: 3 }} />
        </div>
      ))}
    </div>
  </div>;
}

export function WidgetCalificaciones() {
  const prom = (CALIFICACIONES.reduce((a, c) => a + c.cal, 0) / CALIFICACIONES.length).toFixed(1);
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
      <span style={statBig(T.jade)}>{prom}</span>
      <span style={statLabel}>promedio general</span>
    </div>
    {CALIFICACIONES.map((c) => (
      <div key={c.materia} style={row}>
        <span style={{ ...label(), flex: 1 }}>{c.materia}</span>
        <span style={{ ...label(0.8), fontFamily: T.mono, color: c.cal >= 9 ? T.jade : c.cal >= 7 ? T.copal : T.amaranto }}>
          {c.cal.toFixed(1)}
        </span>
      </div>
    ))}
  </div>;
}

export function WidgetCalificacionesSm() {
  const prom = (CALIFICACIONES.reduce((a, c) => a + c.cal, 0) / CALIFICACIONES.length).toFixed(1);
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.jade)}>{prom}</div>
    <div style={statLabel}>promedio general</div>
  </div>;
}

export function WidgetHorario() {
  const hoyIdx = new Date().getDay();
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {HORARIO.map((d, i) => (
      <div key={d.dia} style={{
        ...row,
        padding: "6px 6px",
        borderRadius: 6,
        background: i + 1 === hoyIdx ? `${T.turquesa}12` : "transparent",
      }}>
        <span style={{ ...label(i + 1 === hoyIdx ? 0.8 : 0.3), fontFamily: T.mono, fontSize: 9, width: 28, flexShrink: 0 }}>{d.dia}</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {d.clases.map((c) => (
            <span key={c} style={badge(T.turquesa)}>{c}</span>
          ))}
        </div>
      </div>
    ))}
  </div>;
}

export function WidgetHorarioSm() {
  const hoyIdx = new Date().getDay();
  const hoy = HORARIO[hoyIdx - 1] || HORARIO[0];
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={{ ...label(0.3), fontSize: 9, letterSpacing: "1px", marginBottom: 8 }}>HOY · {hoy.dia}</div>
    {hoy.clases.map((c) => (
      <div key={c} style={{ ...label(0.6), marginBottom: 4 }}>{c}</div>
    ))}
  </div>;
}

export function WidgetTareaDetalle() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ ...label(0.3), fontSize: 9, letterSpacing: "1px" }}>TAREA · FÍSICA</div>
    <div style={{ ...label(0.8), fontSize: 13, lineHeight: 1.4 }}>Práctica de laboratorio: movimiento armónico simple</div>
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      <span style={badge(T.amaranto)}>Alta prioridad</span>
      <span style={badge(T.copal)}>Mañana 09:00</span>
    </div>
    <div style={{ ...label(0.35), fontSize: 11, lineHeight: 1.6, marginTop: 4 }}>
      Incluir análisis de datos, gráficas y conclusiones. Mínimo 3 páginas.
    </div>
  </div>;
}

export function WidgetTareaDetalleSm() {
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={{ ...label(0.3), fontSize: 9, marginBottom: 4 }}>SIGUIENTE ENTREGA</div>
    <div style={{ ...label(0.7), fontSize: 12 }}>Práctica Física</div>
    <div style={{ marginTop: 6 }}><span style={badge(T.amaranto)}>Mañana 09:00</span></div>
  </div>;
}

export function WidgetNotas() {
  return <textarea
    style={{
      width: "100%", height: "100%",
      background: "transparent",
      border: "none", outline: "none", resize: "none",
      fontFamily: T.sans, fontSize: 12, fontWeight: 300,
      color: "rgba(237,235,230,0.55)",
      lineHeight: 1.7,
    }}
    defaultValue={"Ideas para el proyecto:\n- Enfoque en experiencia\n- Integración con IA\n- Diseño minimalista"}
  />;
}

export function WidgetNotasSm() {
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={{ ...label(0.3), fontSize: 9, marginBottom: 6 }}>NOTAS RÁPIDAS</div>
    <div style={{ ...label(0.5), fontSize: 11, lineHeight: 1.6 }}>Ideas para el proyecto...</div>
  </div>;
}

export function WidgetArchivos() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {ARCHIVOS.map((f) => (
      <div key={f.nombre} style={row}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: TIPO_COLOR[f.tipo], flexShrink: 0, opacity: 0.8 }} />
        <span style={{ ...label(), flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nombre}</span>
        <span style={{ ...label(0.25), fontSize: 10 }}>{f.hora}</span>
      </div>
    ))}
  </div>;
}

export function WidgetArchivosSm() {
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.turquesa)}>{ARCHIVOS.length}</div>
    <div style={statLabel}>archivos recientes</div>
  </div>;
}

export function WidgetClima() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span style={{ ...statBig(T.turquesa), fontSize: 42 }}>18°</span>
      <span style={{ ...label(0.4), fontSize: 13 }}>Despejado</span>
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      {["L","M","X","J","V"].map((d, i) => (
        <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 9, color: T.muted }}>{d}</span>
          <span style={{ fontSize: 11, color: "rgba(237,235,230,0.5)", fontFamily: T.mono }}>{16 + i}°</span>
        </div>
      ))}
    </div>
  </div>;
}

export function WidgetClimaSm() {
  return <div style={{ display: "flex", alignItems: "center", gap: 16, height: "100%" }}>
    <span style={{ ...statBig(T.turquesa), fontSize: 38 }}>18°</span>
    <div>
      <div style={label(0.5)}>Despejado</div>
      <div style={{ ...label(0.25), fontSize: 10, marginTop: 2 }}>CDMX · Hoy</div>
    </div>
  </div>;
}

export function WidgetEstadisticas() {
  const datos = [40, 65, 30, 80, 55, 90, 45];
  const dias  = ["L","M","X","J","V","S","D"];
  const max   = Math.max(...datos);
  return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={statBig(T.copal)}>72%</span>
      <span style={statLabel}>actividad semanal</span>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, marginTop: 4 }}>
      {datos.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", height: `${(v / max) * 100}%`, background: `${T.copal}${i === 5 ? "CC" : "55"}`, borderRadius: "2px 2px 0 0", transition: "height 0.6s ease" }} />
          <span style={{ fontSize: 8, color: T.muted }}>{dias[i]}</span>
        </div>
      ))}
    </div>
  </div>;
}

export function WidgetEstadisticasSm() {
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.copal)}>72%</div>
    <div style={statLabel}>actividad esta semana</div>
  </div>;
}

export function WidgetAcciones() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {ACCIONES.map((a) => (
      <button
        key={a.accion}
        style={{
          background:    `${T.copal}10`,
          border:        `1px solid ${T.copal}25`,
          borderRadius:  8,
          padding:       "8px 12px",
          color:         `rgba(237,235,230,0.6)`,
          fontSize:      12,
          fontFamily:    T.sans,
          fontWeight:    300,
          textAlign:     "left",
          cursor:        "pointer",
          letterSpacing: "0.2px",
          transition:    "background 0.2s, border-color 0.2s",
        }}
        onMouseEnter={(e) => { e.target.style.background = `${T.copal}20`; e.target.style.borderColor = `${T.copal}50`; }}
        onMouseLeave={(e) => { e.target.style.background = `${T.copal}10`; e.target.style.borderColor = `${T.copal}25`; }}
      >
        {a.label}
      </button>
    ))}
  </div>;
}

export function WidgetAccionesSm() {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
    {ACCIONES.map((a) => (
      <button key={a.accion} style={{
        background: `${T.copal}15`, border: `1px solid ${T.copal}30`,
        borderRadius: 6, padding: "5px 8px",
        color: `rgba(237,235,230,0.55)`, fontSize: 10, fontFamily: T.sans,
        cursor: "pointer", letterSpacing: "0.2px",
      }}>
        {a.label}
      </button>
    ))}
  </div>;
}