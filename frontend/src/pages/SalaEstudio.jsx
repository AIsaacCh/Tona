import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T } from "../tokens";
import LaboratorioHooke from "../components/laboratorio/LaboratorioHooke";
import { SidebarEstudio } from "../components/estudio/SidebarEstudio";
import { HeaderEstudio } from "../components/estudio/HeaderEstudio";
import { useConfigTona } from "../hooks/useConfigTona";
import CaidaLibre from "../components/laboratorio/CaidaLibre";
import OpticaGeometrica from "../components/laboratorio/OpticaGeometrica";

const API = import.meta.env.VITE_API_URL;

export default function SalaEstudio() {
  const { sesionId } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem("tona_user_id");

  const [sesion, setSesion] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const { nombreUsuario } = useConfigTona(userId);

  const [vista, setVista] = useState("estudio");
  const [laboratorioActivo, setLaboratorioActivo] = useState("hooke");

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    cargarSesion();
  }, []);

  async function cargarSesion() {
    try {
      const resp = await fetch(`${API}/estudio/${sesionId}`, { credentials: "include" });
      if (!resp.ok) {
        setError("No se pudo cargar la sala de estudio");
        setCargando(false);
        return;
      }
      const data = await resp.json();
      setSesion(data.sesion);

      let historial = data.mensajes || [];
      if (historial.length === 0) {
        historial = [{
          rol: "tona",
          texto: "¿Con qué tema comenzamos hoy?",
        }];
      }
      setMensajes(historial);
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, vista]);

  const enviarMensaje = useCallback(async () => {
    if (!input.trim() || enviando) return;
    const texto = input.trim();
    setInput("");
    setEnviando(true);

    setMensajes((prev) => [...prev, { rol: "usuario", texto }]);

    try {
      const resp = await fetch(`${API}/estudio/${sesionId}/mensaje`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await resp.json();
      setMensajes((prev) => [...prev, data.respuesta]);
      if (data.respuesta?.laboratorio_sugerido) {
        setLaboratorioActivo(data.respuesta.laboratorio_sugerido);
      }
    } catch (e) {
      setMensajes((prev) => [...prev, { rol: "tona", texto: "Tuve un error respondiendo, intenta de nuevo." }]);
    } finally {
      setEnviando(false);
    }
  }, [input, enviando, userId, sesionId]);

  if (cargando) {
    return <div style={styles.centrado}><span style={styles.textoTenue}>abriendo sala de estudio...</span></div>;
  }

  if (error) {
    return (
      <div style={styles.centrado}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: T.amaranto, marginBottom: 16 }}>{error}</div>
          <button onClick={() => navigate("/dashboard")} style={styles.botonVolverError}>Volver al dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.fondoCapa1} />
      <div style={styles.fondoCapa2} />

      <SidebarEstudio
        vista={vista}
        setVista={setVista}
        laboratorioActivo={laboratorioActivo}
        setLaboratorioActivo={setLaboratorioActivo}
        onVolverDashboard={() => navigate("/dashboard")}
      />

      <div style={styles.contenido}>
        <HeaderEstudio
          vista={vista}
          sesion={sesion}
          nombreUsuario={nombreUsuario}
          onVolverEstudio={() => setVista("estudio")}
        />

        <div style={styles.areaPrincipal}>
          {vista === "estudio" && (
            <div style={styles.chatContenedor}>
              <div ref={scrollRef} style={styles.chatArea}>
                {mensajes.map((m, i) => (
                  <div key={i} style={{
                    ...styles.burbuja,
                    alignSelf: m.rol === "usuario" ? "flex-end" : "flex-start",
                    background: m.rol === "usuario" ? `${T.turquesa}10` : "rgba(237,235,230,0.035)",
                    borderColor: m.rol === "usuario" ? `${T.turquesa}28` : "rgba(237,235,230,0.08)",
                  }}>
                    <div style={styles.textoBurbuja}>{m.texto}</div>
                    {m.laboratorio_sugerido && (
                      <button
                        onClick={() => {
                          setLaboratorioActivo(m.laboratorio_sugerido);
                          setVista("laboratorio");
                        }}
                        style={styles.chipLab}
                      >
                        ⌁ Abrir laboratorio de pruebas
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={styles.inputBar}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  placeholder="Escribe el tema que quieres estudiar..."
                  style={styles.input}
                  disabled={enviando}
                  autoFocus
                />
                <button onClick={enviarMensaje} disabled={enviando || !input.trim()} style={styles.botonEnviar}>↑</button>
              </div>
            </div>
          )}

          {vista === "laboratorio" && laboratorioActivo === "hooke" && (
            <div style={styles.panelCristal}><LaboratorioHooke userId={userId} /></div>
          )}
          {vista === "laboratorio" && laboratorioActivo === "caida_libre" && (
            <div style={styles.panelCristal}><CaidaLibre userId={userId} /></div>
          )}
          {vista === "laboratorio" && laboratorioActivo === "optica" && (
            <div style={styles.panelCristal}><OpticaGeometrica userId={userId} /></div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    width: "100vw", height: "100vh",
    background: "#0a0c0e",
    display: "flex",
    position: "relative",
    overflow: "hidden",
  },
  fondoCapa1: {
    position: "absolute", inset: 0, zIndex: 0,
    background: `radial-gradient(ellipse at 15% 0%, rgba(46,201,144,0.05) 0%, transparent 55%)`,
    pointerEvents: "none",
  },
  fondoCapa2: {
    position: "absolute", inset: 0, zIndex: 0,
    background: `radial-gradient(ellipse at 85% 100%, rgba(52,211,153,0.04) 0%, transparent 50%)`,
    pointerEvents: "none",
  },
  contenido: {
    flex: 1, display: "flex", flexDirection: "column",
    position: "relative", zIndex: 1, minWidth: 0,
  },
  areaPrincipal: {
    flex: 1, minHeight: 0, padding: "20px 32px 28px",
    display: "flex",
  },
  chatContenedor: {
    flex: 1, display: "flex", flexDirection: "column", gap: 14, minHeight: 0,
    maxWidth: 780, margin: "0 auto", width: "100%",
  },
  chatArea: {
    flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "8px 4px",
  },
  burbuja: {
    maxWidth: "68%", border: "1px solid", borderRadius: 14, padding: "11px 15px",
    backdropFilter: "blur(10px)",
  },
  textoBurbuja: { fontSize: 13, color: "rgba(237,235,230,0.88)", fontFamily: T.sans, lineHeight: 1.55 },
  chipLab: {
    marginTop: 10, background: `${T.jade}14`, border: `1px solid ${T.jade}40`,
    borderRadius: 20, padding: "7px 15px", color: T.jade, fontSize: 11.5, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  inputBar: {
    display: "flex", gap: 8, alignItems: "center",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(237,235,230,0.08)",
    borderRadius: 26, padding: "10px 18px",
    backdropFilter: "blur(14px)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.3)",
  },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "rgba(237,235,230,0.88)", fontSize: 13 },
  botonEnviar: { background: "transparent", border: "none", color: T.jade, fontSize: 17, cursor: "pointer" },
  panelCristal: {
    flex: 1, minHeight: 0, overflowY: "auto",
    background: "rgba(13,17,20,0.5)",
    border: "1px solid rgba(237,235,230,0.06)",
    borderTop: `1px solid ${T.jade}22`,
    borderRadius: 18,
    backdropFilter: "blur(20px)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 16px 48px rgba(0,0,0,0.35)",
  },
  botonVolverError: {
    background: `${T.turquesa}15`, border: `1px solid ${T.turquesa}40`,
    borderRadius: 8, padding: "10px 20px", color: T.turquesa, fontSize: 12, cursor: "pointer",
  },
  centrado: {
    width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0c0e",
  },
  textoTenue: { color: "rgba(237,235,230,0.4)", fontFamily: T.mono, fontSize: 13 },
};