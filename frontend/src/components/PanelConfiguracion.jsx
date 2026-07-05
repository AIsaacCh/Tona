// components/PanelConfiguracion.jsx
import { useEffect, useState, useRef } from "react";
import anime from "animejs";
import { T } from "../tokens";
import { agenteBus } from "./AgenteTona";

const API = import.meta.env.VITE_API_URL;

export default function PanelConfiguracion({ userId, onCerrar }) {
  const [config,  setConfig]  = useState(null);
  const [sitios,  setSitios]  = useState([]);
  const [tab,     setTab]     = useState("perfil");
  const [guardando, setGuardando] = useState(false);
  const [nuevaUrl,   setNuevaUrl]   = useState("");
  const [nuevoAlias, setNuevoAlias] = useState("");
  const [nuevaPeriodo, setNuevaPeriodo] = useState("semanal");

  const panelRef   = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!panelRef.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 250, easing: "easeOutQuart" });
    anime({ targets: panelRef.current, opacity: [0, 1], translateX: [40, 0], duration: 380, easing: "easeOutQuart" });

    const off = agenteBus.on("abrir_configuracion", cargar);
    return () => off();
  }, []);

  async function cargar() {
    try {
      const [rc, rs] = await Promise.all([
        fetch(`${API}/agent/config/${userId}`).then((r) => r.json()),
        fetch(`${API}/tasks/sitios/${userId}`).then((r) => r.json()),
      ]);
      setConfig(rc);
      setSitios(rs.sitios || []);
    } catch (e) {
      console.error("Error cargando config:", e);
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      await fetch(`${API}/agent/config/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      agenteBus.emit("flash", { mensaje: "Configuración guardada", tipo: "exito" });
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error guardando configuración", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  async function agregarSitio() {
    if (!nuevaUrl.trim() || !nuevoAlias.trim()) return;
    try {
      const resp = await fetch(`${API}/tasks/sitios/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nuevaUrl.trim(), alias: nuevoAlias.trim(), frecuencia: nuevaPeriodo }),
      });
      if (resp.ok) {
        setNuevaUrl(""); setNuevoAlias(""); setNuevaPeriodo("semanal");
        await cargar();
        agenteBus.emit("flash", { mensaje: "Sitio agregado", tipo: "exito" });
      }
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error agregando sitio", tipo: "error" });
    }
  }

  async function eliminarSitio(id) {
    try {
      await fetch(`${API}/tasks/sitios/${userId}/${id}`, { method: "DELETE" });
      setSitios((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error eliminando sitio", tipo: "error" });
    }
  }

  async function revisarSitioAhora(id) {
    agenteBus.emit("flash", { mensaje: "Revisando sitio...", tipo: "info" });
    try {
      const resp = await fetch(`${API}/tasks/sitios/${userId}/${id}/revisar`, { method: "POST" });
      const data = await resp.json();
      if (data.cambio) {
        agenteBus.emit("flash", { mensaje: `Cambio detectado: ${data.resumen?.slice(0, 60)}`, tipo: "urgente" });
      } else {
        agenteBus.emit("flash", { mensaje: "Sin cambios desde la última revisión", tipo: "info" });
      }
      await cargar();
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error al revisar", tipo: "error" });
    }
  }

  function cerrar() {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: panelRef.current, opacity: 0, translateX: 40, duration: 280, complete: onCerrar }, "-=100");
  }

  if (!config) return null;

  const TONO_OPCIONES = [
    { valor: "amigable", label: "Amigable" },
    { valor: "neutral",  label: "Neutral"  },
    { valor: "formal",   label: "Formal"   },
  ];

  const TABS = ["perfil", "sitios"];

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 800,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "flex-end",
      opacity: 0,
    }}>
      <div ref={panelRef} style={{
        width: "min(420px, 92vw)", height: "100%",
        background: "rgba(9,11,13,0.98)",
        borderLeft: `1px solid ${T.copal}22`,
        display: "flex", flexDirection: "column",
        opacity: 0,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: `1px solid ${T.copal}15`,
        }}>
          <div>
            <div style={{ fontSize: 9, color: `${T.copal}66`, letterSpacing: "2px", fontFamily: T.mono }}>
              CONFIGURACIÓN
            </div>
            <div style={{ fontSize: 16, color: "rgba(237,235,230,0.75)", fontFamily: T.serif, marginTop: 4 }}>
              {config.nombre_agente || "Tona"}
            </div>
          </div>
          <button onClick={cerrar} style={{
            background: "transparent", border: "none",
            color: `${T.amaranto}55`, fontSize: 18, cursor: "pointer",
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.copal}12`, padding: "0 24px" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "transparent", border: "none",
              borderBottom: tab === t ? `2px solid ${T.copal}` : "2px solid transparent",
              padding: "12px 16px 10px", marginBottom: -1,
              color: tab === t ? T.copal : "rgba(237,235,230,0.3)",
              fontSize: 11, fontFamily: T.mono, cursor: "pointer",
              letterSpacing: "0.5px", textTransform: "uppercase",
            }}>{t}</button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>

          {tab === "perfil" && (
            <div>
              <Campo
                label="CÓMO TE LLAMA TONA"
                value={config.nombre_usuario || ""}
                onChange={(v) => setConfig({ ...config, nombre_usuario: v })}
                placeholder="Tu nombre preferido"
              />
              <Campo
                label="NOMBRE DEL AGENTE"
                value={config.nombre_agente || "Tona"}
                onChange={(v) => setConfig({ ...config, nombre_agente: v })}
                placeholder="Tona"
              />
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 10, fontFamily: T.mono }}>
                  TONO DE COMUNICACIÓN
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {TONO_OPCIONES.map((op) => (
                    <button
                      key={op.valor}
                      onClick={() => setConfig({ ...config, tono: op.valor })}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8,
                        background: config.tono === op.valor ? `${T.copal}25` : `${T.copal}08`,
                        border: `1px solid ${T.copal}${config.tono === op.valor ? "55" : "20"}`,
                        color: T.copal, fontSize: 11,
                        fontFamily: T.sans, cursor: "pointer",
                      }}
                    >{op.label}</button>
                  ))}
                </div>
              </div>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{
                  width: "100%", background: `${T.jade}18`,
                  border: `1px solid ${T.jade}45`, borderRadius: 10,
                  padding: "12px", color: T.jade, fontSize: 13,
                  fontFamily: T.sans, cursor: guardando ? "wait" : "pointer",
                  opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}

          {tab === "sitios" && (
            <div>
              <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 14, fontFamily: T.mono }}>
                SITIOS MONITOREADOS
              </div>

              {sitios.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(237,235,230,0.25)", textAlign: "center", padding: "20px 0", fontFamily: T.sans }}>
                  No hay sitios configurados
                </div>
              )}

              {sitios.map((s) => (
                <div key={s.id} style={{
                  background: "rgba(237,235,230,0.03)",
                  border: `1px solid ${T.copal}15`,
                  borderRadius: 10, padding: "14px",
                  marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "rgba(237,235,230,0.75)", fontFamily: T.sans }}>{s.alias}</div>
                      <div style={{ fontSize: 10, color: "rgba(237,235,230,0.25)", fontFamily: T.mono, marginTop: 2 }}>
                        {s.url.length > 40 ? s.url.slice(0, 40) + "…" : s.url}
                      </div>
                    </div>
                    <button
                      onClick={() => eliminarSitio(s.id)}
                      style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, cursor: "pointer", fontSize: 12 }}
                    >✕</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 10, color: `${T.copal}66`, fontFamily: T.mono }}>
                      {s.frecuencia} · {s.ultima_revision ? `última: ${s.ultima_revision.slice(0, 10)}` : "sin revisar"}
                    </div>
                    <button
                      onClick={() => revisarSitioAhora(s.id)}
                      style={{
                        background: `${T.turquesa}12`, border: `1px solid ${T.turquesa}25`,
                        borderRadius: 6, padding: "4px 10px",
                        color: T.turquesa, fontSize: 10,
                        fontFamily: T.mono, cursor: "pointer",
                      }}
                    >revisar ahora</button>
                  </div>
                  {s.ultimo_resumen && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, lineHeight: 1.5 }}>
                      {s.ultimo_resumen}
                    </div>
                  )}
                </div>
              ))}

              {/* Agregar nuevo sitio */}
              <div style={{
                marginTop: 16, padding: 16,
                background: `${T.copal}05`,
                border: `1px dashed ${T.copal}20`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 9, color: `${T.copal}55`, letterSpacing: "1px", marginBottom: 12, fontFamily: T.mono }}>
                  AGREGAR SITIO
                </div>
                <input value={nuevaUrl}   onChange={(e) => setNuevaUrl(e.target.value)}   placeholder="https://..." style={{ ...inputStyle, marginBottom: 8 }} />
                <input value={nuevoAlias} onChange={(e) => setNuevoAlias(e.target.value)} placeholder="Nombre descriptivo" style={{ ...inputStyle, marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["diaria", "semanal", "quincenal"].map((f) => (
                    <button key={f} onClick={() => setNuevaPeriodo(f)} style={{
                      flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 10,
                      fontFamily: T.sans, cursor: "pointer",
                      background: nuevaPeriodo === f ? `${T.turquesa}25` : `${T.turquesa}08`,
                      border: `1px solid ${T.turquesa}${nuevaPeriodo === f ? "55" : "18"}`,
                      color: T.turquesa,
                    }}>{f}</button>
                  ))}
                </div>
                <button onClick={agregarSitio} style={{
                  width: "100%", background: `${T.jade}12`,
                  border: `1px solid ${T.jade}30`, borderRadius: 8,
                  padding: "9px", color: T.jade, fontSize: 12,
                  fontFamily: T.sans, cursor: "pointer",
                }}>
                  + Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 8, fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "rgba(237,235,230,0.03)",
  border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8,
  padding: "10px 14px", color: "rgba(237,235,230,0.75)",
  fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 300,
  outline: "none", boxSizing: "border-box",
};