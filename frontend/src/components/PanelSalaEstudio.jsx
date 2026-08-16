import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import anime from "animejs";
import { useRef } from "react";
import { T } from "../tokens";

const API = import.meta.env.VITE_API_URL;

export function PanelSalaEstudio({ userId, onCerrar }) {
  const navigate = useNavigate();
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [materiaNueva, setMateriaNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    anime({ targets: cardRef.current, opacity: [0, 1], translateY: [16, 0], duration: 350, easing: "easeOutQuart" });
  }, []);

  useEffect(() => {
    cargarSesiones();
  }, [userId]);

  async function cargarSesiones() {
    setCargando(true);
    try {
      const resp = await fetch(`${API}/estudio`, { credentials: "include" });
      const data = await resp.json();
      setSesiones(data.sesiones || []);
    } catch (e) {
      console.error("Error cargando salas de estudio:", e);
      setError("No se pudieron cargar tus salas de estudio.");
    } finally {
      setCargando(false);
    }
  }

  async function crearSala() {
    const materia = materiaNueva.trim();
    if (!materia) return;
    setCreando(true);
    setError("");
    try {
      const resp = await fetch(`${API}/estudio/crear`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materia }),
      });
      if (!resp.ok) throw new Error("No se pudo crear la sala");
      const data = await resp.json();
      if (data.sesion?.id) navigate(`/estudio/${data.sesion.id}`);
    } catch (e) {
      setError("No se pudo crear la sala de estudio.");
      setCreando(false);
    }
  }

  function entrarASala(sesionId) {
    navigate(`/estudio/${sesionId}`);
  }

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div ref={cardRef} style={{ ...estilos.card, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.header}>
          <span style={estilos.titulo}>SALAS DE ESTUDIO</span>
          <button onClick={onCerrar} style={estilos.cerrarBtn}>✕</button>
        </div>

        <div style={estilos.creacion}>
          <input
            value={materiaNueva}
            onChange={(e) => setMateriaNueva(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crearSala()}
            placeholder="Nueva materia (ej. Estructuras de Datos)"
            style={estilos.input}
            disabled={creando}
          />
          <button onClick={crearSala} disabled={creando || !materiaNueva.trim()} style={estilos.botonCrear}>
            {creando ? "Creando..." : "+ Crear"}
          </button>
        </div>

        {error && <div style={estilos.error}>{error}</div>}

        <div style={estilos.lista}>
          {cargando && (
            <div style={estilos.placeholder}>Cargando tus salas...</div>
          )}
          {!cargando && sesiones.length === 0 && (
            <div style={estilos.placeholder}>Aún no tienes salas de estudio. Crea la primera arriba.</div>
          )}
          {!cargando && sesiones.map((s) => (
            <button key={s.id} onClick={() => entrarASala(s.id)} style={estilos.filaSesion}>
              <span style={estilos.dot} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span style={estilos.tituloSesion}>{s.titulo || s.materia}</span>
                <span style={estilos.subMateria}>{s.materia}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const estilos = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 900,
    background: "rgba(9,11,13,0.75)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  card: {
    width: "min(420px, 90vw)", maxHeight: "70vh",
    background: "rgba(9,11,13,0.97)",
    border: `1px solid ${T.jade}22`, borderTop: `1px solid ${T.jade}55`,
    borderRadius: 18, padding: "28px 26px",
    boxShadow: `0 8px 64px rgba(0,0,0,0.6), 0 0 60px ${T.jade}06`,
    display: "flex", flexDirection: "column", gap: 16,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 10, letterSpacing: "2px", color: `${T.jade}88`, fontFamily: T.mono },
  cerrarBtn: { background: "transparent", border: "none", color: "rgba(237,235,230,0.4)", fontSize: 14, cursor: "pointer" },
  creacion: { display: "flex", gap: 8 },
  input: { flex: 1, background: "rgba(237,235,230,0.04)", border: `1px solid ${T.jade}25`, borderRadius: 8, padding: "9px 12px", color: "rgba(237,235,230,0.85)", fontSize: 12, outline: "none" },
  botonCrear: { background: `${T.jade}18`, border: `1px solid ${T.jade}45`, borderRadius: 8, padding: "9px 14px", color: T.jade, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  error: { fontSize: 11, color: "#E05A5A" },
  lista: { display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" },
  placeholder: { fontSize: 12, color: "rgba(237,235,230,0.3)", padding: "16px 0", textAlign: "center" },
  filaSesion: {
    display: "flex", alignItems: "center", gap: 10, textAlign: "left",
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.06)",
    borderRadius: 10, padding: "10px 14px", cursor: "pointer",
  },
  dot: { width: 6, height: 6, borderRadius: "50%", background: T.jade, flexShrink: 0 },
  tituloSesion: { fontSize: 13, color: "rgba(237,235,230,0.85)", fontFamily: "inherit" },
  subMateria: { fontSize: 10, color: "rgba(237,235,230,0.35)" },
};