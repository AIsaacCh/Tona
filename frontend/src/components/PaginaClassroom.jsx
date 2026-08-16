import { useEffect, useState } from "react";
import { CheckSquare, CalendarDays, X } from "lucide-react";
import { T } from "../tokens";

const API = import.meta.env.VITE_API_URL;

const DIAS_SEMANA = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function PaginaClassroom({ userId, onCerrar }) {
  const [cursos, setCursos] = useState([]);
  const [cursoActivo, setCursoActivo] = useState(null);
  const [datos, setDatos] = useState(null);
  const [filtro, setFiltro] = useState("pendientes");
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [cargandoCurso, setCargandoCurso] = useState(false);

  useEffect(() => {
    if (!userId || userId === "demo") { setCargandoCursos(false); return; }
    fetch(`${API}/tasks/cursos`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const lista = data.cursos || [];
        setCursos(lista);
        if (lista.length > 0) setCursoActivo(lista[0].id);
      })
      .catch(() => {})
      .finally(() => setCargandoCursos(false));
  }, [userId]);

  useEffect(() => {
    if (!cursoActivo || !userId || userId === "demo") return;
    setCargandoCurso(true);
    setFiltro("pendientes");
    fetch(`${API}/tasks/curso/${cursoActivo}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setDatos)
      .catch(() => setDatos(null))
      .finally(() => setCargandoCurso(false));
  }, [cursoActivo, userId]);

  if (cargandoCursos) return null;

  if (cursos.length === 0) {
    return (
      <div style={{ padding: "60px 36px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "rgba(237,235,230,0.4)", fontFamily: T.sans }}>
          No encontré materias activas en tu Classroom todavía.
        </div>
      </div>
    );
  }

  const cursoNombre = cursos.find((c) => c.id === cursoActivo)?.nombre || "";
  const listaFiltrada = datos
    ? (filtro === "pendientes" ? datos.tareas_pendientes
      : filtro === "completadas" ? datos.tareas_completadas
      : datos.tareas_sin_fecha)
    : [];
  const todasLasTareas = datos
    ? [...datos.tareas_pendientes, ...datos.tareas_completadas, ...datos.tareas_sin_fecha]
    : [];

  return (
    <div style={{ padding: "32px 36px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "1.5px", color: "rgba(237,235,230,0.3)", fontFamily: T.mono, marginBottom: 6 }}>
            TUS MATERIAS
          </div>
          <div style={{ fontSize: 28, fontFamily: T.serif, color: "rgba(237,235,230,0.92)" }}>Classroom</div>
        </div>
        <button onClick={onCerrar} style={s.btnIcono} title="Cerrar">
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22, overflowX: "auto", paddingBottom: 4 }}>
        {cursos.map((c) => {
          const activoTab = c.id === cursoActivo;
          return (
            <button
              key={c.id}
              onClick={() => setCursoActivo(c.id)}
              style={{
                padding: "8px 16px", borderRadius: 20, whiteSpace: "nowrap",
                fontSize: 12.5, fontFamily: T.sans, cursor: "pointer",
                background: activoTab ? `${T.jade}16` : "rgba(237,235,230,0.02)",
                border: `1px solid ${activoTab ? `${T.jade}45` : "rgba(237,235,230,0.08)"}`,
                color: activoTab ? T.jade : "rgba(237,235,230,0.55)",
              }}
            >
              {c.nombre}
            </button>
          );
        })}
      </div>

      {(!cargandoCurso && datos) && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 22, fontFamily: T.serif, color: "rgba(237,235,230,0.92)" }}>
              {cursoNombre}
            </div>
            <div style={s.statCardChica}>
              <div style={{ fontSize: 20, fontFamily: T.serif, color: "rgba(237,235,230,0.9)" }}>{datos.conteos.pendientes}</div>
              <div style={{ fontSize: 10.5, color: "rgba(237,235,230,0.4)", fontFamily: T.sans }}>Tareas pendientes</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <FiltroBtn activo={filtro === "pendientes"} onClick={() => setFiltro("pendientes")} label="Pendientes" count={datos.conteos.pendientes} />
                <FiltroBtn activo={filtro === "completadas"} onClick={() => setFiltro("completadas")} label="Completadas" count={datos.conteos.completadas} />
                <FiltroBtn activo={filtro === "sin_fecha"} onClick={() => setFiltro("sin_fecha")} label="Sin fecha de entrega" count={datos.conteos.sin_fecha} />
              </div>

              <div style={s.cardChica}>
                {listaFiltrada.length === 0 && (
                  <div style={{ fontSize: 12, color: "rgba(237,235,230,0.3)", fontFamily: T.sans, padding: "10px 4px" }}>
                    Nada por aquí.
                  </div>
                )}
                {listaFiltrada.map((t, i) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderTop: i === 0 ? "none" : "1px solid rgba(237,235,230,0.05)" }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.08)",
                    }}>
                      <CheckSquare size={15} strokeWidth={1.7} color={t.completada ? T.jade : "rgba(237,235,230,0.45)"} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontFamily: T.sans, color: "rgba(237,235,230,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.titulo}
                      </div>
                      {t.resumen && (
                        <div style={{ fontSize: 11, color: "rgba(237,235,230,0.35)", fontFamily: T.sans, marginTop: 2 }}>
                          {t.resumen}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, textAlign: "right", flexShrink: 0 }}>
                      {t.fecha_limite || "Sin fecha"}
                      {t.hora_limite && <div style={{ fontSize: 10, opacity: 0.7 }}>{t.hora_limite}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {datos.proxima_entrega && (
                <div style={s.cardChica}>
                  <span style={s.tituloSeccion}>PRÓXIMA ENTREGA</span>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${T.copal}14`, border: `1px solid ${T.copal}35`,
                    }}>
                      <CalendarDays size={16} strokeWidth={1.7} color={T.copal} />
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontFamily: T.sans, color: "rgba(237,235,230,0.85)" }}>{datos.proxima_entrega.titulo}</div>
                      <div style={{ fontSize: 11, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, marginTop: 2 }}>
                        {datos.proxima_entrega.fecha_limite}{datos.proxima_entrega.hora_limite ? `, ${datos.proxima_entrega.hora_limite}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <CalendarioCurso tareas={todasLasTareas} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}


  

function FiltroBtn({ activo, onClick, label, count }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "7px 13px", borderRadius: 8, cursor: "pointer",
      fontSize: 12, fontFamily: T.sans,
      background: activo ? `${T.jade}14` : "transparent",
      border: `1px solid ${activo ? `${T.jade}40` : "rgba(237,235,230,0.08)"}`,
      color: activo ? T.jade : "rgba(237,235,230,0.5)",
    }}>
      {label}
      <span style={{
        fontSize: 10, padding: "1px 6px", borderRadius: 10,
        background: activo ? `${T.jade}25` : "rgba(237,235,230,0.06)",
        color: activo ? T.jade : "rgba(237,235,230,0.4)",
      }}>{count}</span>
    </button>
  );
}

function CalendarioCurso({ tareas }) {
  const [mesBase, setMesBase] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const fechasConTarea = new Set(tareas.filter((t) => t.fecha_limite).map((t) => t.fecha_limite));

  const anio = mesBase.getFullYear();
  const mes = mesBase.getMonth();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  function cambiarMes(delta) {
    const d = new Date(mesBase);
    d.setMonth(d.getMonth() + delta);
    setMesBase(d);
  }

  const hoy = new Date();
  const esHoy = (d) => d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
  const tieneTarea = (d) => {
    const f = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return fechasConTarea.has(f);
  };

  return (
    <div style={s.cardChica}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={s.tituloSeccion}>CALENDARIO DEL CURSO</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => cambiarMes(-1)} style={s.btnMesNav}>‹</button>
          <span style={{ fontSize: 11, color: "rgba(237,235,230,0.5)", fontFamily: T.sans, minWidth: 70, textAlign: "center" }}>
            {MESES[mes]} {anio}
          </span>
          <button onClick={() => cambiarMes(1)} style={s.btnMesNav}>›</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ fontSize: 9.5, textAlign: "center", color: "rgba(237,235,230,0.3)", fontFamily: T.mono }}>{d}</div>
        ))}
        {celdas.map((d, i) => (
          <div key={i} style={{
            aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10.5, borderRadius: 6, fontFamily: T.sans, position: "relative",
            color: d ? (esHoy(d) ? T.jade : "rgba(237,235,230,0.55)") : "transparent",
            background: esHoy(d) ? `${T.jade}18` : "transparent",
            border: esHoy(d) ? `1px solid ${T.jade}40` : "1px solid transparent",
          }}>
            {d}
            {d && tieneTarea(d) && (
              <span style={{ position: "absolute", bottom: 2, width: 3, height: 3, borderRadius: "50%", background: T.copal }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  cardChica: {
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)",
    borderRadius: 14, padding: "16px 16px",
  },
  tituloSeccion: {
    fontSize: 10.5, letterSpacing: "1px", color: "rgba(237,235,230,0.5)", fontFamily: T.mono,
  },
  statCardChica: {
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)",
    borderRadius: 12, padding: "10px 14px", minWidth: 90,
  },
  btnMesNav: {
    width: 20, height: 20, borderRadius: 6, background: "rgba(237,235,230,0.04)",
    border: "1px solid rgba(237,235,230,0.08)", color: "rgba(237,235,230,0.5)",
    cursor: "pointer", fontSize: 12, lineHeight: 1,
  },

  btnIcono: {
    width: 32, height: 32, borderRadius: 9,
    background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.1)",
    color: "rgba(237,235,230,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
};