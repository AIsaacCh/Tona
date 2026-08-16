import { useEffect, useRef, useState } from "react";
import {
  CheckSquare, GraduationCap, Award, Flame, Timer, StickyNote,
  FolderOpen, CalendarDays, Play, Pause, X,
} from "lucide-react";
import { T } from "../tokens";

const API = import.meta.env.VITE_API_URL;

function formatMinutos(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function PaginaResumen({ userId, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [enfocando, setEnfocando] = useState(false);
  const [segundosSesion, setSegundosSesion] = useState(0);
  const intervaloRef = useRef(null);

  useEffect(() => { cargar(); }, [userId]);

  async function cargar() {
    if (!userId || userId === "demo") { setCargando(false); return; }
    try {
      const r = await fetch(`${API}/agent/resumen`, { credentials: "include" }).then((x) => x.json());
      setDatos(r);
    } catch (e) {
      console.error("Error cargando resumen:", e);
    } finally {
      setCargando(false);
    }
  }

  function toggleEnfoque() {
    if (enfocando) {
      clearInterval(intervaloRef.current);
      const minutos = Math.floor(segundosSesion / 60);
      if (minutos >= 1) {
        fetch(`${API}/agent/enfoque`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutos }),
        }).then(cargar).catch(() => {});
      }
      setSegundosSesion(0);
      setEnfocando(false);
    } else {
      setEnfocando(true);
      intervaloRef.current = setInterval(() => setSegundosSesion((s) => s + 1), 1000);
    }
  }

  useEffect(() => () => clearInterval(intervaloRef.current), []);

  if (cargando || !datos) return null;

  const minutosHoyTotal = datos.enfoque_hoy_minutos + Math.floor(segundosSesion / 60);

  return (
    <div style={{ padding: "32px 36px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "1.5px", color: "rgba(237,235,230,0.3)", fontFamily: T.mono, marginBottom: 6 }}>
            TU PANORAMA
          </div>
          <div style={{ fontSize: 28, fontFamily: T.serif, color: "rgba(237,235,230,0.92)" }}>Resumen</div>
        </div>
        <button onClick={onCerrar} style={s.btnIcono} title="Cerrar">
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard Icono={CheckSquare} color={T.jade} label="Tareas pendientes" valor={datos.tareas_pendientes_total} />
        <StatCard Icono={GraduationCap} color={T.turquesa} label="Materias activas" valor={datos.materias_activas} />
        <StatCard Icono={Award} color={T.copal} label="Exámenes próximos" valor={datos.examenes_proximos.length} />
        <StatCard Icono={Flame} color={T.amaranto} label="Racha de estudio" valor={`${datos.racha_dias}d`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Seccion titulo="TAREAS PENDIENTES" Icono={CheckSquare} color={T.jade}>
            {datos.tareas_pendientes.length === 0 && <VacioTexto texto="Sin pendientes por ahora." />}
            {datos.tareas_pendientes.map((t) => (
              <FilaItem key={t.id} titulo={t.titulo} sub={t.fecha_limite || "sin fecha"} />
            ))}
          </Seccion>

          <Seccion titulo="CLASES PRÓXIMAS" Icono={GraduationCap} color={T.turquesa}>
            {datos.clases_proximas.length === 0 && <VacioTexto texto="No has configurado tu horario." />}
            {datos.clases_proximas.map((c) => (
              <FilaItem key={c.id} titulo={c.materia} sub={`${c.dia} · ${c.hora_inicio || ""}`} />
            ))}
          </Seccion>

          <Seccion titulo="EXÁMENES PRÓXIMOS" Icono={Award} color={T.copal}>
            {datos.examenes_proximos.length === 0 && <VacioTexto texto="Nada detectado por ahora." />}
            {datos.examenes_proximos.map((e) => (
              <FilaItem key={e.id} titulo={e.titulo} sub={e.fecha_limite || "sin fecha"} />
            ))}
          </Seccion>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={s.cardChica}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CalendarDays size={13} strokeWidth={1.8} color={`${T.jade}aa`} />
              <span style={s.tituloSeccion}>AGENDA DE HOY</span>
            </div>
            {datos.agenda_hoy.clases.length === 0 && datos.agenda_hoy.tareas.length === 0 && (
              <VacioTexto texto="Día libre." />
            )}
            {datos.agenda_hoy.clases.map((c) => (
              <FilaItem key={`c-${c.id}`} titulo={c.materia} sub={c.hora_inicio || ""} />
            ))}
            {datos.agenda_hoy.tareas.map((t) => (
              <FilaItem key={`t-${t.id}`} titulo={t.titulo} sub="Vence hoy" />
            ))}
          </div>

          <div style={s.cardChica}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Timer size={13} strokeWidth={1.8} color={`${T.jade}aa`} />
              <span style={s.tituloSeccion}>ENFOQUE DE HOY</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 22, fontFamily: T.serif, color: "rgba(237,235,230,0.9)" }}>
                  {formatMinutos(minutosHoyTotal)}
                </div>
                <div style={{ fontSize: 11, color: "rgba(237,235,230,0.35)", fontFamily: T.sans, marginTop: 2 }}>
                  {datos.completadas_hoy}/{datos.objetivo_diario || 0} tareas de hoy completadas
                </div>
              </div>
              <button onClick={toggleEnfoque} style={{ ...s.btnEnfoque, borderColor: enfocando ? `${T.amaranto}55` : `${T.jade}55` }}>
                {enfocando ? <Pause size={16} color={T.amaranto} /> : <Play size={16} color={T.jade} />}
              </button>
            </div>
          </div>

          <Seccion titulo="NOTAS RECIENTES" Icono={StickyNote} color={T.copal}>
            {datos.notas_recientes.length === 0 && <VacioTexto texto="Sin notas todavía — dile a Tona 'toma nota de...'." />}
            {datos.notas_recientes.map((n) => (
              <FilaItem key={n.id} titulo={n.titulo} sub={n.contenido} />
            ))}
          </Seccion>

          <Seccion titulo="ARCHIVOS RECIENTES" Icono={FolderOpen} color={T.turquesa}>
            {datos.archivos_recientes.length === 0 && <VacioTexto texto="Sin archivos recientes." />}
            {datos.archivos_recientes.map((a) => (
              <FilaItem key={a.id} titulo={a.nombre} sub={a.modificado || ""} />
            ))}
          </Seccion>
        </div>
      </div>
    </div>
  );
}

function StatCard({ Icono, color, label, valor }) {
  return (
    <div style={{
      background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)",
      borderRadius: 14, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(237,235,230,0.45)", fontFamily: T.sans }}>{label}</span>
        <Icono size={15} strokeWidth={1.7} color={color} />
      </div>
      <div style={{ fontSize: 22, fontFamily: T.serif, color: "rgba(237,235,230,0.92)" }}>{valor}</div>
    </div>
  );
}

function Seccion({ titulo, Icono, color, children }) {
  return (
    <div style={s.cardChica}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icono size={13} strokeWidth={1.8} color={`${color}aa`} />
        <span style={s.tituloSeccion}>{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function FilaItem({ titulo, sub }) {
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid rgba(237,235,230,0.05)" }}>
      <div style={{ fontSize: 12.5, fontFamily: T.sans, color: "rgba(237,235,230,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {titulo}
      </div>
      {sub && <div style={{ fontSize: 10.5, fontFamily: T.sans, color: "rgba(237,235,230,0.35)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function VacioTexto({ texto }) {
  return <div style={{ fontSize: 12, color: "rgba(237,235,230,0.3)", fontFamily: T.sans, padding: "6px 0" }}>{texto}</div>;
}

const s = {
  cardChica: {
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)",
    borderRadius: 14, padding: "16px 16px 6px",
  },
  tituloSeccion: {
    fontSize: 10.5, letterSpacing: "1px", color: "rgba(237,235,230,0.5)", fontFamily: T.mono,
  },
  btnEnfoque: {
    width: 38, height: 38, borderRadius: "50%",
    background: "rgba(237,235,230,0.03)", border: "1px solid",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },

  btnIcono: {
    width: 32, height: 32, borderRadius: 9,
    background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.1)",
    color: "rgba(237,235,230,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
};