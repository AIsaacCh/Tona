// PanelCompleto.jsx
import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import {
  Home, CheckSquare, Sparkles, ClipboardList, ChevronRight, Database, GraduationCap, X,
} from "lucide-react";
import { agenteBus } from "./AgenteTona";
import { T } from "../tokens";
import PaginaNotion from "./PaginaNotion";
import PaginaResumen from "./PaginaResumen";
import PaginaClassroom from "./PaginaClassroom";

const API = import.meta.env.VITE_API_URL;

const NAV = [
  { id: "inicio", label: "Inicio", pagina: true },
  { id: "classroom", label: "Classroom", pagina: true },
  { id: "notion", label: "Notion", pagina: true },
];

const VISUAL_NAV = {
  inicio:    { Icono: Home,          sub: "Resumen" },
  classroom: { Icono: GraduationCap, sub: "Tus materias" },
  notion:    { Icono: Database,      sub: "Páginas enlazadas" },
};

// Paleta de puntos de estado — solo rota visualmente entre tareas para dar
// variedad, como los puntos jade/dorado de la referencia. No representa
// prioridad real, es puramente decorativo.
const PUNTOS_ESTADO = [T.jade, `${T.copal}`, T.jade, `${T.copal}`];

export default function PanelCompleto({ activo, userId, panelesAbiertos, setPanelesAbiertos, onSalirPanel }) {
  const sidebarRef = useRef(null);
  const rightRef = useRef(null);
  const [navActivo, setNavActivo] = useState("inicio");
  const [tareas, setTareas] = useState([]);

  useEffect(() => {
    if (!activo || !userId || userId === "demo") return;
    fetch(`${API}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTareas((data.tareas || []).filter((t) => !t.completada).slice(0, 4)))
      .catch(() => {});
  }, [activo, userId]);

  useEffect(() => {
    if (!sidebarRef.current || !rightRef.current) return;
    if (activo) {
      anime({ targets: sidebarRef.current, opacity: [0, 1], duration: 450, easing: "easeOutQuart" });
      anime({ targets: rightRef.current, opacity: [0, 1], duration: 450, delay: 80, easing: "easeOutQuart" });
    } else {
      anime({ targets: sidebarRef.current, opacity: [1, 0], duration: 250, easing: "easeInQuart" });
      anime({ targets: rightRef.current, opacity: [1, 0], duration: 250, easing: "easeInQuart" });
    }
  }, [activo]);

  function irA(item) {
    setNavActivo(item.id);
    if (item.pagina) return;
    if (item.mensaje) {
      agenteBus.emit("enviar_texto_usuario", { texto: item.mensaje });
    } else if (item.accion) {
      agenteBus.emit(item.accion, {});
    }
  }

  const anchoIzq = panelesAbiertos ? 240 : 0;
  const anchoDer = panelesAbiertos ? 300 : 0;

  return (
    <>
      {/* Botón único para colapsar/expandir ambas barras */}
      <button
        onClick={() => setPanelesAbiertos((p) => !p)}
        title={panelesAbiertos ? "Ocultar paneles" : "Mostrar paneles"}
        style={{
          position: "fixed", top: 30, left: panelesAbiertos ? 226 : 14,
          zIndex: 20, width: 26, height: 26, borderRadius: "50%",
          background: "rgba(9,11,13,0.9)", border: `1px solid ${T.jade}35`,
          color: T.jade, fontSize: 12, cursor: "pointer",
          display: activo ? "flex" : "none", alignItems: "center", justifyContent: "center",
          transition: "left 0.4s ease",
          opacity: activo ? 1 : 0,
          pointerEvents: activo ? "auto" : "none",
        }}
      >
        {panelesAbiertos ? "‹" : "›"}
      </button>

      {/* Sidebar izquierdo — ancho colapsable con overflow hidden, contenido fijo adentro */}
      <div
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0,
          width: anchoIzq, overflow: "hidden", zIndex: 15,
          transition: "width 0.4s ease",
          pointerEvents: activo ? "auto" : "none",
        }}
      >
        <div
          ref={sidebarRef}
          style={{
            width: 240, height: "100%",
            background: "rgba(9,11,13,0.85)", backdropFilter: "blur(10px)",
            borderRight: `1px solid ${T.copal}15`, padding: "24px 16px",
            pointerEvents: activo ? "auto" : "none", opacity: 0,
            display: "flex", flexDirection: "column", gap: 2,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 22px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `${T.jade}14`, border: `1px solid ${T.jade}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={16} strokeWidth={1.8} color={T.jade} />
            </div>
            <div>
              <div style={{ fontSize: 13, letterSpacing: "2px", color: "rgba(237,235,230,0.9)", fontFamily: T.sans, fontWeight: 600 }}>
                TONA
              </div>
              <div style={{ fontSize: 9.5, color: "rgba(237,235,230,0.35)", fontFamily: T.sans, marginTop: 1 }}>
                Tu asistente académico
              </div>
            </div>
          </div>

          <div style={{ fontSize: 9.5, letterSpacing: "1.2px", color: "rgba(237,235,230,0.25)", fontFamily: T.mono, padding: "0 10px 6px" }}>
            NAVEGACIÓN
          </div>

          {NAV.map((item) => {
            const { Icono, sub } = VISUAL_NAV[item.id] || {};
            const esActivo = navActivo === item.id;
            return (
              <button
                key={item.id}
                onClick={() => irA(item)}
                style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "9px 12px", borderRadius: 10,
                  background: esActivo ? `${T.jade}14` : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  transition: "background 0.25s ease",
                }}
                onMouseEnter={(e) => { if (!esActivo) e.currentTarget.style.background = "rgba(237,235,230,0.04)"; }}
                onMouseLeave={(e) => { if (!esActivo) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{
                  position: "absolute", left: 0, top: "18%", bottom: "18%", width: 2.5,
                  borderRadius: 2, background: esActivo ? T.jade : "transparent",
                  transition: "background 0.25s ease",
                }} />
                {Icono && (
                  <span style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: esActivo ? `${T.jade}1c` : "rgba(237,235,230,0.03)",
                    border: `1px solid ${esActivo ? `${T.jade}40` : "rgba(237,235,230,0.06)"}`,
                    transition: "background 0.25s ease, border-color 0.25s ease",
                  }}>
                    <Icono size={15} strokeWidth={1.7} color={esActivo ? T.jade : "rgba(237,235,230,0.5)"} />
                  </span>
                )}
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 13, fontFamily: T.sans, lineHeight: 1.2,
                    color: esActivo ? T.jade : "rgba(237,235,230,0.75)",
                    whiteSpace: "nowrap",
                  }}>
                    {item.label}
                  </span>
                  {sub && (
                    <span style={{
                      fontSize: 10.5, fontFamily: T.sans, lineHeight: 1.2,
                      color: "rgba(237,235,230,0.32)", whiteSpace: "nowrap",
                    }}>
                      {sub}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra superior — responsiva al ancho de las barras laterales */}
      <div
        style={{
          position: "fixed", top: 0, left: anchoIzq, right: anchoDer, height: 84,
          padding: "20px 32px", zIndex: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          opacity: activo ? 1 : 0,
          pointerEvents: activo ? "auto" : "none",
          transition: "opacity 0.3s ease, left 0.4s ease, right 0.4s ease",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "rgba(237,235,230,0.35)", fontFamily: T.sans, marginBottom: 4, textTransform: "capitalize" }}>
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div style={{ fontSize: 20, color: "rgba(237,235,230,0.9)", fontFamily: T.serif }}>
            Hola, Isaac.
          </div>
        </div>

        <div style={{
          flex: 1, maxWidth: 380, margin: "0 24px",
          background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.08)",
          borderRadius: 20, padding: "9px 16px",
          fontSize: 12, color: "rgba(237,235,230,0.3)", fontFamily: T.sans,
        }}>
          Buscar en tus cursos, notas, archivos...
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 11, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, whiteSpace: "nowrap" }}>
            Despejado 18°C
          </div>
          <button
            onClick={onSalirPanel}
            title="Salir del panel completo"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.1)",
              color: "rgba(237,235,230,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 🟢 Render de Inicio */}
      {navActivo === "inicio" && (
        <div
          style={{
            position: "fixed",
            top: 84, left: anchoIzq, right: anchoDer, bottom: 0,
            zIndex: 12, overflowY: "auto",
            background: "rgba(9,11,13,0.98)",
            opacity: activo ? 1 : 0,
            pointerEvents: activo ? "auto" : "none",
            transition: "opacity 0.3s ease, left 0.4s ease, right 0.4s ease",
          }}
        >
          <PaginaResumen userId={userId} onCerrar={() => setNavActivo("")} />
        </div>
      )}

      

      {/* 🟢 Render de Notion */}
      {navActivo === "notion" && (
        <div
          style={{
            position: "fixed",
            top: 84, left: anchoIzq, right: anchoDer, bottom: 0,
            zIndex: 12, overflowY: "auto",
            background: "rgba(9,11,13,0.98)",
            opacity: activo ? 1 : 0,
            pointerEvents: activo ? "auto" : "none",
            transition: "opacity 0.3s ease, left 0.4s ease, right 0.4s ease",
          }}
        >
          <PaginaNotion userId={userId} onCerrar={() => setNavActivo("")} />
        </div>
      )}

      {navActivo === "classroom" && (
        <div
          style={{
            position: "fixed",
            top: 84, left: anchoIzq, right: anchoDer, bottom: 0,
            zIndex: 12, overflowY: "auto",
            background: "rgba(9,11,13,0.98)",
            opacity: activo ? 1 : 0,
            pointerEvents: activo ? "auto" : "none",
            transition: "opacity 0.3s ease, left 0.4s ease, right 0.4s ease",
          }}
        >
          <PaginaClassroom userId={userId} onCerrar={() => setNavActivo("")} />
        </div>
      )}

      {/* Columna derecha — mismo patrón de colapso */}
      <div
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0,
          width: anchoDer, overflow: "hidden", zIndex: 15,
          transition: "width 0.4s ease",
          pointerEvents: activo ? "auto" : "none",
        }}
      >
        <div
          ref={rightRef}
          style={{
            width: 300, height: "100%",
            background: "rgba(9,11,13,0.85)", backdropFilter: "blur(10px)",
            borderLeft: `1px solid ${T.copal}15`, padding: "24px 18px",
            pointerEvents: activo ? "auto" : "none", opacity: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{
            background: "rgba(237,235,230,0.02)",
            border: "1px solid rgba(237,235,230,0.07)",
            borderRadius: 14,
            padding: "16px 16px 6px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ClipboardList size={13} strokeWidth={1.8} color={`${T.copal}aa`} />
                <span style={{ fontSize: 10.5, letterSpacing: "1px", color: "rgba(237,235,230,0.5)", fontFamily: T.mono }}>
                  PRÓXIMAS TAREAS
                </span>
              </div>
              <span style={{
                display: "flex", alignItems: "center", gap: 2,
                fontSize: 10.5, color: T.jade, fontFamily: T.sans, cursor: "pointer",
              }}>
                Ver todas <ChevronRight size={11} strokeWidth={2} />
              </span>
            </div>

            {tareas.length === 0 && (
              <div style={{ fontSize: 12, color: "rgba(237,235,230,0.3)", padding: "4px 0 16px", fontFamily: T.sans }}>
                Sin pendientes por ahora.
              </div>
            )}

            {tareas.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "10px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(237,235,230,0.05)",
                }}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(237,235,230,0.03)",
                  border: "1px solid rgba(237,235,230,0.08)",
                }}>
                  <CheckSquare size={14} strokeWidth={1.7} color="rgba(237,235,230,0.5)" />
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{
                    fontSize: 12.5, fontFamily: T.sans, color: "rgba(237,235,230,0.85)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {t.titulo}
                  </span>
                  <span style={{ fontSize: 10.5, fontFamily: T.sans, color: "rgba(237,235,230,0.32)" }}>
                    {t.fecha_limite || "sin fecha"}
                  </span>
                </span>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: PUNTOS_ESTADO[i % PUNTOS_ESTADO.length],
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}