import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T } from "../tokens";
import { PanelParticipantes } from "../components/colaborar/PanelParticipantes";
import { ChatSala } from "../components/colaborar/ChatSala";
import { PanelArchivosSala } from "../components/colaborar/PanelArchivosSala";

const API = import.meta.env.VITE_API_URL;
const WS_API = API.replace(/^http/, "ws");

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

  const wsRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    unirse();
  }, []);

  async function unirse() {
    try {
      const resp = await fetch(`${API}/colaborar/unirse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, codigo }),
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

      const mio = (data.participantes || []).find((p) => p.user_id === userId);
      setNombreUsuario(mio?.nombre || "");

      conectarWebSocket();
      setCargando(false);
    } catch (e) {
      setError("Error de conexión");
      setCargando(false);
    }
  }

  function conectarWebSocket() {
    const ws = new WebSocket(`${WS_API}/colaborar/ws/${codigo}/${userId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.tipo === "chat") {
        setMensajes((prev) => [...prev, { nombre: data.nombre, texto: data.texto }]);
      } else if (data.tipo === "tona_respuesta") {
        setMensajes((prev) => [
          ...prev,
          { nombre: "tú", texto: data.pregunta, tipo: "usuario_pregunta" },
          { tipo: "tona", texto: data.respuesta },
        ]);
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
      wsRef.current = null;
    };
  }

  const enviarMensajeChat = useCallback((texto) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ tipo: "chat", texto }));
    }
  }, []);

  async function cerrarSesion() {
    if (!window.confirm("¿Cerrar la sesión para todos los participantes?")) return;
    try {
      await fetch(`${API}/colaborar/${codigo}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
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
        <span style={{ fontFamily: T.serif, fontSize: 22, color: T.turquesa, letterSpacing: 2 }}>
          TONA · COLABORAR
        </span>
      </div>

      <div style={styles.grid}>
        <div style={styles.columnaIzquierda}>
          <PanelParticipantes
          codigo={codigo}
          participantes={participantes}
          userId={userId}
          onCerrarSesion={cerrarSesion}
          onSalir={salirDeSala}
          />
          <PanelArchivosSala
            codigo={codigo}
            userId={userId}
            archivos={archivos}
            onArchivoCompartido={(archivo) => setArchivos((prev) => [...prev, archivo])}
            onPreguntaTona={() => {}}
          />
        </div>

        <div style={styles.columnaChat}>
          <ChatSala
            mensajes={mensajes}
            onEnviar={enviarMensajeChat}
            nombreUsuario={nombreUsuario}
          />
        </div>
      </div>
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
  },
  grid: {
    flex: 1, display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 20, minHeight: 0,
  },
  columnaIzquierda: {
    display: "flex", flexDirection: "column", gap: 16,
    overflow: "auto",
  },
  columnaChat: {
    minHeight: 0,
  },
  centrado: {
    width: "100vw", height: "100vh",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0a0c0e",
  },
};