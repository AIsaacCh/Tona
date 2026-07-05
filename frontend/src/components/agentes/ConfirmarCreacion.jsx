// components/agentes/ConfirmarCreacion.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import anime from "animejs";
import { T } from "../../tokens";
import { agenteBus } from "../AgenteTona";

const TIPO_CONFIG = {
  crear_tarea_real: {
    titulo:  "CONFIRMAR TAREA",
    acento:  T.copal,
    icono:   "📋",
    campos:  [
      { key: "titulo",    label: "Título"    },
      { key: "fecha",     label: "Fecha"     },
      { key: "prioridad", label: "Prioridad" },
    ],
  },
  crear_evento_real: {
    titulo: "CONFIRMAR EVENTO",
    acento: T.turquesa,
    icono:  "📅",
    campos: [
      { key: "titulo",       label: "Evento"    },
      { key: "fecha",        label: "Fecha"     },
      { key: "hora",         label: "Hora"      },
      { key: "duracion_min", label: "Duración"  },
    ],
  },
  agregar_sitio: {
    titulo: "CONFIRMAR SITIO",
    acento: T.jade,
    icono:  "🔍",
    campos: [
      { key: "alias",      label: "Nombre"     },
      { key: "url",        label: "URL"        },
      { key: "frecuencia", label: "Frecuencia" },
    ],
  },
};

export function ConfirmarCreacion() {
  const [data,   setData]   = useState(null);
  const [accion, setAccion] = useState(null);
  const ref        = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    // Interceptar acciones de creación antes de que lleguen al backend
    // El agente emite primero "pre_crear_*" para pedir confirmación
    const offs = [
      agenteBus.on("pre_crear_tarea_real",  (p) => { setAccion("crear_tarea_real");  setData(p); }),
      agenteBus.on("pre_crear_evento_real", (p) => { setAccion("crear_evento_real"); setData(p); }),
      agenteBus.on("pre_agregar_sitio",     (p) => { setAccion("agregar_sitio");     setData(p); }),
      agenteBus.on("cerrar_todo",           () => { setData(null); setAccion(null); }),
      agenteBus.on("flash",                 (p) => {
        // Si es éxito de creación, cerrar
        if (p?.tipo === "exito") { setData(null); setAccion(null); }
      }),
    ];
    return () => offs.forEach((o) => o());
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 280, easing: "easeOutQuart" });
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], scale: [0.88, 1.02], duration: 320 })
      .add({ targets: ref.current, scale: [1.02, 1], duration: 200, easing: "easeOutElastic(1, 0.6)" });
  }, [data]);

  const cerrar = useCallback(() => {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 180 })
      .add({ targets: ref.current, opacity: 0, scale: 0.93, translateY: 8, duration: 220,
             complete: () => { setData(null); setAccion(null); } }, "-=100");
  }, []);

  function confirmar() {
    if (!accion || !data) return;
    // Emitir la acción real — agente.py la ejecuta
    agenteBus.emit("ejecutar_creacion", { accion, payload: data });
    cerrar();
  }

  if (!data || !accion) return null;

  const cfg    = TIPO_CONFIG[accion];
  if (!cfg) return null;
  const accent = cfg.acento;

  const formatValue = (key, val) => {
    if (key === "duracion_min") return `${val} minutos`;
    return val || "—";
  };

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 620,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
      opacity: 0,
    }}>
      <div ref={ref} style={{
        width: 340,
        background: "rgba(9,11,13,0.98)",
        border: `1px solid ${accent}25`,
        borderTop: `2px solid ${accent}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: `0 12px 64px rgba(0,0,0,0.7), 0 0 40px ${accent}08`,
        opacity: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${accent}15`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>{cfg.icono}</span>
          <span style={{ fontSize: 9, color: `${accent}88`, letterSpacing: "1.5px", fontFamily: T.mono, flex: 1 }}>
            TONA · {cfg.titulo}
          </span>
          <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>

        {/* Datos a confirmar */}
        <div style={{ padding: "18px 20px" }}>
          {cfg.campos.map(({ key, label }) => (
            <div key={key} style={{
              display: "flex", justifyContent: "space-between",
              padding: "7px 0", borderBottom: `1px solid ${T.cen}`,
            }}>
              <span style={{ fontSize: 10, color: "rgba(237,235,230,0.3)", fontFamily: T.mono, letterSpacing: "0.5px" }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: "rgba(237,235,230,0.75)", fontFamily: T.sans }}>
                {formatValue(key, data[key])}
              </span>
            </div>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 10, padding: "12px 20px 20px" }}>
          <button
            onClick={confirmar}
            style={{
              flex: 2, background: `${accent}18`,
              border: `1px solid ${accent}45`,
              borderRadius: 9, padding: "11px 0",
              color: accent, fontSize: 13,
              fontFamily: T.sans, fontWeight: 300,
              cursor: "pointer", letterSpacing: "0.3px",
            }}
          >
            Confirmar
          </button>
          <button
            onClick={cerrar}
            style={{
              flex: 1, background: "transparent",
              border: `1px solid ${T.amaranto}25`,
              borderRadius: 9, padding: "11px 0",
              color: `${T.amaranto}66`, fontSize: 12,
              fontFamily: T.sans, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}