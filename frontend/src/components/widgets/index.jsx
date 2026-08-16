// widgets/index.jsx
// Los 13 widgets — cada uno con vista sm y md
import React, { useState, useEffect } from "react";
import { T } from "../../tokens";
import { agenteBus } from "../AgenteTona";

const API = import.meta.env.VITE_API_URL;

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const row = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "5px 0",
  borderBottom: `1px solid ${T.cen}`,
};

const label = (opacity = 0.5) => ({
  fontSize: 11,
  color: `rgba(237,235,230,${opacity})`,
  fontWeight: 300,
  fontFamily: T.sans,
});

const badge = (color) => ({
  fontSize: 9,
  padding: "2px 6px",
  borderRadius: 4,
  background: `${color}22`,
  color: color,
  letterSpacing: "0.3px",
  flexShrink: 0,
});

const statBig = (color = T.copal) => ({
  fontFamily: T.mono,
  fontSize: 32,
  color: color,
  lineHeight: 1,
  fontWeight: 400,
});

const statLabel = {
  fontSize: 10,
  color: T.muted,
  letterSpacing: "0.5px",
  marginTop: 4,
};

const navBtn = (disabled) => ({
  background: "transparent",
  border: "1px solid rgba(237,235,230,0.1)",
  borderRadius: 4,
  width: 20,
  height: 20,
  color: disabled ? "rgba(237,235,230,0.15)" : "rgba(237,235,230,0.5)",
  fontSize: 12,
  cursor: disabled ? "default" : "pointer",
  lineHeight: 1,
});

const TIPO_COLOR = {
  pdf: T.amaranto,
  docx: T.turquesa,
  xlsx: T.jade,
  pptx: T.copal,
  txt: T.muted,
};

const WMO_LABEL = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  51: "Llovizna",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia fuerte",
  80: "Chubascos",
  95: "Tormenta",
};

// ── Helpers de horario ─────────────────────────────────────────────────────

const ORDEN_DIA_W = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
  sabado: 5,
};

const ABREV_DIA_W = {
  lunes: "LUN",
  martes: "MAR",
  miercoles: "MIÉ",
  jueves: "JUE",
  viernes: "VIE",
  sabado: "SÁB",
};

function agruparHorarioPorDia(clasesPlanas) {
  const agrupado = {};
  for (const c of clasesPlanas) {
    const dia = (c.dia || "").toLowerCase();
    if (!agrupado[dia]) agrupado[dia] = [];
    agrupado[dia].push(c);
  }
  for (const dia in agrupado) {
    agrupado[dia].sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));
  }
  return Object.keys(agrupado)
    .sort((a, b) => (ORDEN_DIA_W[a] ?? 99) - (ORDEN_DIA_W[b] ?? 99))
    .map((dia) => ({ dia, clases: agrupado[dia] }));
}

// ── Hooks de datos reales ────────────────────────────────────────────────────

function useActividadSemana() {
  const [dias, setDias] = useState(null);
  useEffect(() => {
    fetch(`${API}/agent/actividad-semana`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDias(d.dias || []))
      .catch(() => setDias([]));
  }, []);
  return dias;
}

function useTareasClassroom() {
  const [tareas, setTareas] = useState(null);
  useEffect(() => {
    fetch(`${API}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const cr = (d.tareas || [])
          .filter((t) => t.fuente === "classroom" && !t.completada && t.fecha_limite)
          .sort((a, b) => (a.fecha_limite || "9999").localeCompare(b.fecha_limite || "9999"));
        setTareas(cr);
      })
      .catch(() => setTareas([]));
  }, []);
  return tareas;
}

function useHorarioReal() {
  const [dias, setDias] = useState(null);
  useEffect(() => {
    fetch(`${API}/horario/`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDias(agruparHorarioPorDia(d.horario || [])))
      .catch(() => setDias([]));
  }, []);
  return dias;
}

function useClimaReal() {
  const [clima, setClima] = useState(null);
  useEffect(() => {
    const lat = 19.4167,
      lon = -98.95;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max&timezone=America%2FMexico_City&forecast_days=5`
    )
      .then((r) => r.json())
      .then((d) => setClima(d))
      .catch(() => setClima(null));
  }, []);
  return clima;
}

function useArchivosReales() {
  const [archivos, setArchivos] = useState(null);
  useEffect(() => {
    fetch(`${API}/tasks/drive`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setArchivos((d.archivos || []).slice(0, 5)))
      .catch(() => setArchivos([]));
  }, []);
  return archivos;
}

function useExamenesReales() {
  const [examenes, setExamenes] = useState(null);
  useEffect(() => {
    fetch(`${API}/agent/examenes`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setExamenes(d.examenes || []))
      .catch(() => setExamenes([]));
  }, []);
  return examenes;
}

function useRecordatoriosReales() {
  const [rec, setRec] = useState(null);
  useEffect(() => {
    fetch(`${API}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const hoy = new Date().toISOString().slice(0, 10);
        const items = (d.tareas || [])
          .filter((t) => t.fuente === "calendar" && !t.completada && t.fecha_limite >= hoy)
          .sort((a, b) => (a.fecha_limite || "9999").localeCompare(b.fecha_limite || "9999"))
          .slice(0, 5);
        setRec(items);
      })
      .catch(() => setRec([]));
  }, []);
  return rec;
}

function useCursosReales() {
  const [cursos, setCursos] = useState(null);
  useEffect(() => {
    fetch(`${API}/tasks/cursos`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCursos(d.cursos || []))
      .catch(() => setCursos([]));
  }, []);
  return cursos;
}

// ── ACCIONES ──────────────────────────────────────────────────────────────────

const ACCIONES = [
  { label: "Ver tareas", accion: "mostrar_tareas" },
  { label: "Mi horario", accion: "mostrar_horario" },
  { label: "Ver calendario", accion: "mostrar_calendario" },
  { label: "Notas rápidas", accion: "mostrar_notas" },
];

// ── Widgets ───────────────────────────────────────────────────────────────────

export function WidgetAcciones() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ACCIONES.map((a) => (
        <button
          key={a.accion}
          onClick={() => agenteBus.emit(a.accion, {})}
          style={{
            background: `${T.copal}10`,
            border: `1px solid ${T.copal}25`,
            borderRadius: 8,
            padding: "8px 12px",
            color: `rgba(237,235,230,0.6)`,
            fontSize: 12,
            fontFamily: T.sans,
            fontWeight: 300,
            textAlign: "left",
            cursor: "pointer",
            letterSpacing: "0.2px",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = `${T.copal}20`;
            e.target.style.borderColor = `${T.copal}50`;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = `${T.copal}10`;
            e.target.style.borderColor = `${T.copal}25`;
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function WidgetAccionesSm() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
      {ACCIONES.map((a) => (
        <button
          key={a.accion}
          onClick={() => agenteBus.emit(a.accion, {})}
          style={{
            background: `${T.copal}15`,
            border: `1px solid ${T.copal}30`,
            borderRadius: 6,
            padding: "5px 8px",
            color: `rgba(237,235,230,0.55)`,
            fontSize: 10,
            fontFamily: T.sans,
            cursor: "pointer",
            letterSpacing: "0.2px",
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── WidgetTareas ─────────────────────────────────────────────────────────────

const PRIORIDAD_COLOR = { Alta: T.amaranto, Media: T.copal, Baja: T.jade };
const FUENTE_COLOR = { classroom: T.jade, calendar: T.turquesa, manual: T.copal };

function useTareasReales() {
  const [tareas, setTareas] = useState(null);
  useEffect(() => {
    fetch(`${API}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTareas(d.tareas || []))
      .catch(() => setTareas([]));
  }, []);
  return tareas;
}

export function WidgetTareas() {
  const tareasApi = useTareasReales();
  const tareas = (tareasApi ?? []).map((t) => ({
    id: t.id,
    texto: t.texto ?? t.titulo,
    prioridad: t.prioridad ?? (
      t.urgencia === "alta" ? "Alta" : t.urgencia === "media" ? "Media" : "Baja"
    ),
    done: t.done ?? t.completada ?? false,
    fuente: t.fuente || "manual",
  }));

  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {tareas.length === 0 && (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>Sin tareas pendientes</div>
    )}
    {tareas.map((t) => (
      <div key={t.id} style={{ ...row, opacity: t.done ? 0.35 : 1 }}>
        <div style={{ width: 10, height: 10, border: `1px solid ${PRIORIDAD_COLOR[t.prioridad]}66`, borderRadius: 2, flexShrink: 0, background: t.done ? PRIORIDAD_COLOR[t.prioridad] : "transparent" }} />
        <span style={{ ...label(), flex: 1, textDecoration: t.done ? "line-through" : "none" }}>{t.texto}</span>
        <span style={{ ...badge(FUENTE_COLOR[t.fuente] || T.copal), fontSize: 8 }}>{t.fuente}</span>
        <span style={badge(PRIORIDAD_COLOR[t.prioridad])}>{t.prioridad}</span>
      </div>
    ))}
  </div>;
}

export function WidgetTareasSm() {
  const tareasApi = useTareasReales();
  const tareas = (tareasApi ?? []).map((t) => ({
    id: t.id,
    prioridad: t.prioridad ?? (
      t.urgencia === "alta" ? "Alta" : t.urgencia === "media" ? "Media" : "Baja"
    ),
    done: t.done ?? t.completada ?? false,
    fuente: t.fuente || "manual",
  }));
  const pendientes = tareas.filter((t) => !t.done).length;
  const porFuente = tareas.reduce((acc, t) => {
    if (!t.done) acc[t.fuente] = (acc[t.fuente] || 0) + 1;
    return acc;
  }, {});

  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={statBig(T.amaranto)}>{pendientes}</div>
    <div style={statLabel}>tareas pendientes</div>
    <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Object.entries(porFuente).map(([fuente, n]) => (
        <span key={fuente} style={badge(FUENTE_COLOR[fuente] || T.copal)}>{fuente} · {n}</span>
      ))}
    </div>
  </div>;
}

// ── WidgetCalendario ─────────────────────────────────────────────────────────

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

// ── WidgetEstadisticas ────────────────────────────────────────────────────────

export function WidgetEstadisticas() {
  const dias = useActividadSemana();
  if (!dias)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "20px 0" }}>
        Cargando...
      </div>
    );

  const etiquetas = ["L", "M", "X", "J", "V", "S", "D"];
  const max = Math.max(1, ...dias.map((d) => d.mensajes));
  const totalSemana = dias.reduce((a, d) => a + d.mensajes, 0);
  const hoyIdx = dias.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={statBig(T.copal)}>{totalSemana}</span>
        <span style={statLabel}>interacciones esta semana</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: 60,
          marginTop: 4,
        }}
      >
        {dias.map((d, i) => (
          <div
            key={d.fecha}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${(d.mensajes / max) * 100}%`,
                background: `${T.copal}${i === hoyIdx ? "CC" : "55"}`,
                borderRadius: "2px 2px 0 0",
                transition: "height 0.6s ease",
                minHeight: d.mensajes > 0 ? 3 : 0,
              }}
            />
            <span style={{ fontSize: 8, color: T.muted }}>
              {
                etiquetas[
                  new Date(d.fecha + "T00:00").getDay() === 0
                    ? 6
                    : new Date(d.fecha + "T00:00").getDay() - 1
                ]
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetEstadisticasSm() {
  const dias = useActividadSemana();
  const total = dias ? dias.reduce((a, d) => a + d.mensajes, 0) : 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={statBig(T.copal)}>{total}</div>
      <div style={statLabel}>interacciones esta semana</div>
    </div>
  );
}

// ── WidgetClima ──────────────────────────────────────────────────────────────

export function WidgetClima() {
  const clima = useClimaReal();
  if (!clima)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "20px 0" }}>
        Cargando clima...
      </div>
    );

  const actual = Math.round(clima.current.temperature_2m);
  const desc = WMO_LABEL[clima.current.weather_code] || "—";
  const dias = ["L", "M", "X", "J", "V"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ ...statBig(T.turquesa), fontSize: 42 }}>{actual}°</span>
        <span style={{ ...label(0.4), fontSize: 13 }}>{desc}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {clima.daily.temperature_2m_max.slice(0, 5).map((t, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span style={{ fontSize: 9, color: T.muted }}>{dias[i] || ""}</span>
            <span
              style={{
                fontSize: 11,
                color: "rgba(237,235,230,0.5)",
                fontFamily: T.mono,
              }}
            >
              {Math.round(t)}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetClimaSm() {
  const clima = useClimaReal();
  if (!clima)
    return <div style={{ ...label(0.3) }}>Cargando...</div>;
  const actual = Math.round(clima.current.temperature_2m);
  const desc = WMO_LABEL[clima.current.weather_code] || "—";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, height: "100%" }}>
      <span style={{ ...statBig(T.turquesa), fontSize: 38 }}>{actual}°</span>
      <div>
        <div style={label(0.5)}>{desc}</div>
        <div style={{ ...label(0.25), fontSize: 10, marginTop: 2 }}>Hoy</div>
      </div>
    </div>
  );
}

// ── WidgetArchivos ───────────────────────────────────────────────────────────

export function WidgetArchivos() {
  const archivos = useArchivosReales();
  if (archivos === null)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Cargando...
      </div>
    );
  if (archivos.length === 0)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Sin archivos recientes
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {archivos.map((f) => (
        <a
          key={f.id}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...row, textDecoration: "none", cursor: "pointer" }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: TIPO_COLOR[f.tipo] || T.turquesa,
              flexShrink: 0,
              opacity: 0.8,
            }}
          />
          <span
            style={{
              ...label(),
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {f.nombre}
          </span>
          <span style={{ ...label(0.25), fontSize: 10 }}>{f.modificado}</span>
        </a>
      ))}
    </div>
  );
}

export function WidgetArchivosSm() {
  const archivos = useArchivosReales();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={statBig(T.turquesa)}>{archivos ? archivos.length : "—"}</div>
      <div style={statLabel}>archivos recientes</div>
    </div>
  );
}

// ── WidgetNotas ──────────────────────────────────────────────────────────────

export function WidgetNotas() {
  const [notas, setNotas] = useState(null);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    fetch(`${API}/agent/notas`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setNotas(d.notas || []))
      .catch(() => setNotas([]));
  }, []);

  if (notas === null)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Cargando...
      </div>
    );
  if (notas.length === 0)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Sin notas todavía
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        height: "100%",
        overflow: "auto",
      }}
    >
      {notas.map((n) => {
        const abiertaAqui = abierta === n.id;
        return (
          <div
            key={n.id}
            onClick={() => setAbierta(abiertaAqui ? null : n.id)}
            style={{
              padding: "7px 8px",
              borderRadius: 6,
              cursor: "pointer",
              background: abiertaAqui ? `${T.turquesa}10` : "transparent",
            }}
          >
            <div style={{ ...label(0.6), fontWeight: 400 }}>{n.titulo}</div>
            {abiertaAqui && (
              <div
                style={{
                  ...label(0.35),
                  fontSize: 11,
                  lineHeight: 1.5,
                  marginTop: 4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {n.contenido}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WidgetNotasSm() {
  const [notas, setNotas] = useState(null);
  useEffect(() => {
    fetch(`${API}/agent/notas`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setNotas(d.notas || []))
      .catch(() => setNotas([]));
  }, []);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={{ ...label(0.3), fontSize: 9, marginBottom: 6 }}>
        NOTAS RÁPIDAS
      </div>
      <div style={{ ...label(0.5), fontSize: 11, lineHeight: 1.6 }}>
        {notas === null ? "Cargando..." : notas[0] ? notas[0].titulo : "Sin notas"}
      </div>
    </div>
  );
}

// ── WidgetTareaDetalle ──────────────────────────────────────────────────────

export function WidgetTareaDetalle() {
  const tareas = useTareasClassroom();
  const [idx, setIdx] = useState(0);

  if (tareas === null)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Cargando...
      </div>
    );
  if (tareas.length === 0)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Sin tareas de Classroom próximas
      </div>
    );

  const t = tareas[Math.min(idx, tareas.length - 1)];
  const materia = t.curso || "Classroom";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ ...label(0.3), fontSize: 9, letterSpacing: "1px" }}>
          TAREA · {materia.toUpperCase()}
        </span>
        {tareas.length > 1 && (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              style={navBtn(idx === 0)}
            >
              ‹
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(tareas.length - 1, i + 1))}
              disabled={idx === tareas.length - 1}
              style={navBtn(idx === tareas.length - 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div style={{ ...label(0.8), fontSize: 13, lineHeight: 1.4 }}>
        {t.titulo}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={badge(t.urgencia === "alta" ? T.amaranto : T.copal)}>
          {t.fecha_limite}
        </span>
      </div>
      {tareas.length > 1 && (
        <div style={{ ...label(0.2), fontSize: 9, marginTop: "auto" }}>
          {idx + 1} de {tareas.length}
        </div>
      )}
    </div>
  );
}

export function WidgetTareaDetalleSm() {
  const tareas = useTareasClassroom();
  const t = tareas && tareas[0];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={{ ...label(0.3), fontSize: 9, marginBottom: 4 }}>
        SIGUIENTE ENTREGA
      </div>
      <div style={{ ...label(0.7), fontSize: 12 }}>
        {t ? t.titulo : tareas === null ? "Cargando..." : "Sin pendientes"}
      </div>
      {t && (
        <div style={{ marginTop: 6 }}>
          <span style={badge(T.amaranto)}>{t.fecha_limite}</span>
        </div>
      )}
    </div>
  );
}

// ── WidgetHorario ────────────────────────────────────────────────────────────

export function WidgetHorario() {
  const dias = useHorarioReal();
  const hoyLower = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][new Date().getDay()];

  if (dias === null) return <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>Cargando...</div>;
  if (dias.length === 0) return <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>Sin horario configurado</div>;

  return <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%", overflow: "auto" }}>
    {dias.map((d) => {
      const esHoy = d.dia === hoyLower;
      return (
        <div key={d.dia} style={{
          padding: "6px 8px", borderRadius: 6,
          borderLeft: `2px solid ${esHoy ? T.turquesa : "transparent"}`,
          background: esHoy ? `${T.turquesa}08` : "transparent",
        }}>
          <span style={{ ...label(esHoy ? 0.8 : 0.3), fontFamily: T.mono, fontSize: 9, letterSpacing: "0.5px" }}>
            {ABREV_DIA_W[d.dia] || d.dia.toUpperCase()}
          </span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {d.clases.map((c) => (
              <span key={c.id} style={badge(T.turquesa)}>{c.materia} {c.hora_inicio}</span>
            ))}
          </div>
        </div>
      );
    })}
  </div>;
}

export function WidgetHorarioSm() {
  const dias = useHorarioReal();
  const hoyLower = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"][new Date().getDay()];
  const hoy = dias && dias.find((d) => d.dia === hoyLower);
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
    <div style={{ ...label(0.3), fontSize: 9, letterSpacing: "1px", marginBottom: 8 }}>HOY</div>
    {!hoy && <div style={{ ...label(0.5), fontSize: 11 }}>{dias === null ? "Cargando..." : "Sin clases hoy"}</div>}
    {hoy?.clases.map((c) => (
      <div key={c.id} style={{ ...label(0.6), marginBottom: 4 }}>{c.materia} {c.hora_inicio}</div>
    ))}
  </div>;
}

// ── WidgetMaterias ───────────────────────────────────────────────────────────

export function WidgetMaterias() {
  const cursos = useCursosReales();
  if (cursos === null)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Cargando...
      </div>
    );
  if (cursos.length === 0)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Sin materias sincronizadas
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {cursos.map((c) => (
        <div
          key={c.id}
          onClick={() => agenteBus.emit("ver_materia", { nombre: c.nombre, curso_id: c.id })}
          style={{
            ...row,
            cursor: "pointer",
            borderBottom: `1px solid ${T.cen}`,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.jade,
              flexShrink: 0,
            }}
          />
          <span style={{ ...label(0.6), flex: 1 }}>{c.nombre}</span>
        </div>
      ))}
    </div>
  );
}

export function WidgetMateriasSm() {
  const cursos = useCursosReales();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={statBig(T.jade)}>{cursos ? cursos.length : "—"}</div>
      <div style={statLabel}>materias activas</div>
    </div>
  );
}

// ── WidgetContadorRegresivo ─────────────────────────────────────────────────

export function WidgetContadorRegresivo() {
  const examenes = useExamenesReales();
  const [idx, setIdx] = useState(0);

  if (examenes === null)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Cargando...
      </div>
    );
  if (examenes.length === 0)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Sin exámenes registrados. Dile a Tona "tengo examen de [materia] el [fecha]".
      </div>
    );

  const ex = examenes[Math.min(idx, examenes.length - 1)];
  const fechaExamen = new Date(`${ex.fecha}T${ex.hora || "09:00"}`);
  const diff = fechaExamen - new Date();
  const dias = Math.max(0, Math.floor(diff / 86400000));
  const horas = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  const mins = Math.max(0, Math.floor((diff % 3600000) / 60000));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ ...label(0.35), fontSize: 10, letterSpacing: "0.5px" }}>
          PRÓXIMO EXAMEN · {ex.materia.toUpperCase()}
        </span>
        {examenes.length > 1 && (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              style={navBtn(idx === 0)}
            >
              ‹
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(examenes.length - 1, i + 1))}
              disabled={idx === examenes.length - 1}
              style={navBtn(idx === examenes.length - 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        {[
          { v: dias, l: "días" },
          { v: horas, l: "hrs" },
          { v: mins, l: "min" },
        ].map(({ v, l }) => (
          <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ ...statBig(T.amaranto), fontSize: 28 }}>
              {String(v).padStart(2, "0")}
            </span>
            <span style={{ ...statLabel, fontSize: 9 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetContadorRegresivoSm() {
  const examenes = useExamenesReales();
  const ex = examenes && examenes[0];
  if (!ex)
    return (
      <div style={{ ...label(0.3) }}>
        {examenes === null ? "Cargando..." : "Sin exámenes"}
      </div>
    );
  const dias = Math.max(
    0,
    Math.floor((new Date(`${ex.fecha}T${ex.hora || "09:00"}`) - new Date()) / 86400000)
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={statBig(T.amaranto)}>{dias}d</div>
      <div style={statLabel}>para examen de {ex.materia}</div>
    </div>
  );
}

// ── WidgetRecordatorios ─────────────────────────────────────────────────────

export function WidgetRecordatorios() {
  const rec = useRecordatoriosReales();
  if (rec === null)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Cargando...
      </div>
    );
  if (rec.length === 0)
    return (
      <div style={{ ...label(0.3), textAlign: "center", padding: "12px 0" }}>
        Sin recordatorios. Dile a Tona "recuérdame [algo] el [fecha]".
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rec.map((r) => (
        <div key={r.id} style={row}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: r.urgencia === "alta" ? T.amaranto : T.muted,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={label()}>{r.titulo}</div>
            <div style={{ ...label(0.25), fontSize: 10 }}>{r.fecha_limite}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetRecordatoriosSm() {
  const rec = useRecordatoriosReales();
  const urgentes = rec ? rec.filter((r) => r.urgencia === "alta").length : 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <div style={statBig(T.copal)}>{urgentes}</div>
      <div style={statLabel}>recordatorios urgentes</div>
      {rec && rec[0] && (
        <div style={{ ...label(0.3), marginTop: 8, fontSize: 10 }}>
          {rec[0].titulo} · {rec[0].fecha_limite}
        </div>
      )}
    </div>
  );
}