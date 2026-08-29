import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { PanelParticipantes } from "../components/colaborar/PanelParticipantes";
import { ChatSala } from "../components/colaborar/ChatSala";
import { PanelArchivosSala } from "../components/colaborar/PanelArchivosSala";

const API = import.meta.env.VITE_API_URL;
const COMANDO_TONA = /^\s*(\/tona|@tona)[:\s]+([\s\S]+)/i;

function IconoHamburguesa({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Colaborar() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem("tona_user_id");

  const [participantes, setParticipantes] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [esCreador, setEsCreador] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const wsRef = useRef(null);
  const preguntasPendientesRef = useRef(new Set());

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    unirse();
  }, []);

  async function unirse() {
    try {
      const resp = await fetch(`${API}/colaborar/unirse/${codigo}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setError(err.detail || "No se pudo unir a la sesión");
        setCargando(false);
        return;
      }

      const data = await resp.json();
      setParticipantes(data.participantes || []);
      setArchivos(data.archivos || []);
      setEsCreador(data.es_creador || false);

      const mio = (data.participantes || []).find((p) => p.user_id === userId);
      setNombreUsuario(mio?.nombre || "");

      const historialCargado = (data.mensajes || []).map((m) => {
        if (m.tipo === "tona") {
          return { tipo: "tona", texto: m.texto, pregunta: m.pregunta };
        }
        return { nombre: m.nombre, texto: m.texto };
      });
      setMensajes(historialCargado);

      await conectarWebSocket();
      setCargando(false);
    } catch (e) {
      setError("Error de conexión");
      setCargando(false);
    }
  }

  async function reproducirVoz(texto) {
    try {
      const resp = await fetch(`${API}/agent/hablar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play();
    } catch (e) {
      console.error("Error reproduciendo voz:", e);
    }
  }

  async function conectarWebSocket() {
    let token;
    try {
      const resp = await fetch(`${API}/colaborar/ws-token`, { credentials: "include" });
      const data = await resp.json();
      token = data.token;
      console.log("🔑 Token WS obtenido:", token);
    } catch (e) {
      console.error("Error obteniendo ws-token:", e);
      return;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/api/colaborar/ws/${codigo}/${userId}?token=${token}`;

    console.log("🔗 Conectando WebSocket a:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket conectado");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Mensaje WebSocket recibido:", data);

      if (data.tipo === "chat") {
        setMensajes((prev) => [...prev, { nombre: data.nombre, texto: data.texto }]);
      } else if (data.tipo === "tona_respuesta") {
        const yaLaMostreYo = preguntasPendientesRef.current.has(data.pregunta);
        if (yaLaMostreYo) {
          preguntasPendientesRef.current.delete(data.pregunta);
          setMensajes((prev) => [...prev, { tipo: "tona", texto: data.respuesta }]);
        } else {
          setMensajes((prev) => [
            ...prev,
            { nombre: data.nombre_pregunta || "alguien", texto: data.pregunta },
            { tipo: "tona", texto: data.respuesta },
          ]);
        }
        reproducirVoz(data.respuesta);
      } else if (data.tipo === "participante_unido" || data.tipo === "participante_salio") {
        setParticipantes(data.participantes || []);
      } else if (data.tipo === "archivo_compartido") {
        setArchivos((prev) => [...prev, data.archivo]);
      } else if (data.tipo === "sesion_finalizada") {
        alert("La sesión ha finalizado");
        navigate("/dashboard");
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket cerrado");
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("⚠️ Error en WebSocket:", error);
    };
  }

  async function preguntarTona(pregunta) {
    // ✅ Eco inmediato: se muestra al instante, del lado del que la escribió
    preguntasPendientesRef.current.add(pregunta);
    setMensajes((prev) => [...prev, { nombre: nombreUsuario, texto: pregunta }]);

    try {
      await fetch(`${API}/colaborar/${codigo}/preguntar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });
      // la respuesta de Tona llega vía el broadcast "tona_respuesta";
      // como ya mostramos la pregunta, ahí solo se agrega la respuesta
    } catch (e) {
      console.error("Error preguntando a Tona:", e);
      preguntasPendientesRef.current.delete(pregunta);
    }
  }

  const enviarMensajeChat = useCallback((texto) => {
    const match = texto.match(COMANDO_TONA);
    if (match) {
      const pregunta = match[2].trim();
      if (pregunta) preguntarTona(pregunta);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ tipo: "chat", texto }));
    }
  }, [codigo, nombreUsuario]);

  async function cerrarSesion() {
    if (!window.confirm("¿Cerrar la sesión para todos los participantes?")) return;
    try {
      await fetch(`${API}/colaborar/${codigo}/cerrar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Error cerrando sesión:", e);
    }
    navigate("/dashboard");
  }

  async function salirDeSala() {
    try {
      await fetch(`${API}/colaborar/${codigo}/abandonar`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Error saliendo de la sala:", e);
    }
    if (wsRef.current) wsRef.current.close();
    navigate("/dashboard");
  }

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  if (cargando) {
    return (
      <div style={styles.centrado}>
        <span style={{ color: "rgba(237,235,230,0.4)", fontFamily: T.mono, fontSize: 13 }}>
          conectando a la sala...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centrado}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: T.amaranto, fontFamily: T.sans, fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: `${T.turquesa}15`, border: `1px solid ${T.turquesa}40`,
              borderRadius: 8, padding: "10px 20px", color: T.turquesa,
              fontSize: 12, cursor: "pointer",
            }}
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <button
          onClick={() => setMenuAbierto(true)}
          style={styles.botonMenu}
          title="Abrir menú"
        >
          <IconoHamburguesa color={T.turquesa} />
        </button>
        <span style={{ fontFamily: T.serif, fontSize: 22, color: T.turquesa, letterSpacing: 2 }}>
          TONA · COLABORAR
        </span>
      </div>

      <div style={styles.grid}>
        <div style={styles.columnaChat}>
          <ChatSala
            mensajes={mensajes}
            onEnviar={enviarMensajeChat}
            nombreUsuario={nombreUsuario}
          />
        </div>
      </div>

      {menuAbierto && (
        <div
          style={styles.overlay}
          onClick={() => setMenuAbierto(false)}
        >
          <div
            style={styles.drawer}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.drawerHeader}>
              <span style={{ fontSize: 9, color: `${T.turquesa}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
                MENÚ DE LA SALA
              </span>
              <button
                onClick={() => setMenuAbierto(false)}
                style={{ background: "transparent", border: "none", color: `${T.turquesa}66`, fontSize: 16, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "auto", padding: "0 4px" }}>
              <PanelParticipantes
                codigo={codigo}
                participantes={participantes}
                userId={userId}
                onCerrarSesion={cerrarSesion}
                onSalir={salirDeSala}
                esCreador={esCreador}
              />
              <PanelArchivosSala
                codigo={codigo}
                userId={userId}
                archivos={archivos}
                onArchivoCompartido={(archivo) => setArchivos((prev) => [...prev, archivo])}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    width: "100vw", height: "100vh",
    background: "#0a0c0e",
    display: "flex", flexDirection: "column",
    boxSizing: "border-box", padding: "24px 32px",
  },
  header: {
    marginBottom: 20, flexShrink: 0,
    display: "flex", alignItems: "center", gap: 14,
  },
  botonMenu: {
    background: `${T.turquesa}10`, border: `1px solid ${T.turquesa}30`,
    borderRadius: 8, width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
  grid: {
    flex: 1, display: "flex", minHeight: 0,
  },
  columnaChat: {
    flex: 1, minHeight: 0,
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 900,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(2px)",
    display: "flex",
  },
  drawer: {
    width: "min(360px, 88vw)", height: "100vh",
    background: "#0a0c0e",
    borderRight: `1px solid ${T.turquesa}22`,
    boxShadow: "8px 0 40px rgba(0,0,0,0.5)",
    padding: "20px 18px",
    display: "flex", flexDirection: "column", gap: 16,
    overflow: "hidden",
  },
  drawerHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexShrink: 0,
  },
  centrado: {
    width: "100vw", height: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0a0c0e",
  },
};