import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import {
  BookOpen, CheckSquare, Calendar, Mail, BarChart3, Award, Folder, StickyNote,
} from "lucide-react";
import { agenteBus } from "./AgenteTona";
import { T } from "../tokens";

const FUNCIONES = [
  { id: "materias",       label: "Cursos",     accion: "mostrar_materias",       Icono: BookOpen },
  { id: "tareas",         label: "Tareas",     accion: "mostrar_tareas",         Icono: CheckSquare },
  { id: "calendario",     label: "Calendario", accion: "mostrar_calendario",     Icono: Calendar },
  { id: "gmail",          label: "Mensajes",   mensaje: "muéstrame mis correos", accionEvento: "ver_gmail", Icono: Mail },
  { id: "estadisticas",   label: "Progreso",   accion: "mostrar_estadisticas",   Icono: BarChart3 },
  { id: "calificaciones", label: "Exámenes",   accion: "mostrar_calificaciones", Icono: Award },
  { id: "archivos",       label: "Recursos",   accion: "mostrar_archivos",       Icono: Folder },
  { id: "notas",          label: "Notas",      accion: "mostrar_notas",          Icono: StickyNote },
];

function posicion(indice, total, radio, centro) {
  const anguloInicio = -90;
  const paso = 360 / total;
  const angulo = (anguloInicio + paso * indice) * (Math.PI / 180);
  return {
    x: centro + radio * Math.cos(angulo),
    y: centro + radio * Math.sin(angulo),
  };
}

export default function AroFunciones({ activo, radio = 170 }) {
  const contenedorRef = useRef(null);
  const [activos, setActivos] = useState({});
  const tam = radio * 2 + 80;
  const centro = tam / 2;

  useEffect(() => {
    const offs = FUNCIONES.map((f) => {
      const evento = f.accionEvento || f.accion;
      return agenteBus.on(evento, () => {
        setActivos((prev) => ({ ...prev, [f.id]: true }));
        setTimeout(() => setActivos((prev) => ({ ...prev, [f.id]: false })), 900);
      });
    });
    return () => offs.forEach((off) => off());
  }, []);

  useEffect(() => {
    if (!contenedorRef.current) return;
    const nodos = contenedorRef.current.querySelectorAll("[data-icono]");
    if (activo) {
      anime({
        targets: nodos, opacity: [0, 1], scale: [0.7, 1],
        duration: 500, delay: anime.stagger(60), easing: "easeOutQuart",
      });
    } else {
      anime({ targets: nodos, opacity: [1, 0], scale: [1, 0.7], duration: 250, easing: "easeInQuart" });
    }
  }, [activo, radio]);

  function disparar(f) {
    agenteBus.emit("modo_ui", { modo: "completo" });
    if (f.mensaje) {
      agenteBus.emit("enviar_texto_usuario", { texto: f.mensaje });
    } else {
      agenteBus.emit(f.accion, {});
    }
  }

  return (
    <div
      ref={contenedorRef}
      style={{
        position: "absolute", width: tam, height: tam,
        left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        pointerEvents: activo ? "auto" : "none", zIndex: 5,
        transition: "width 0.4s ease, height 0.4s ease",
      }}
    >
      {FUNCIONES.map((f, i) => {
        const pos = posicion(i, FUNCIONES.length, radio, centro);
        const encendido = !!activos[f.id];
        const Icono = f.Icono;
        return (
          <button
            key={f.id}
            data-icono
            onClick={() => disparar(f)}
            title={f.label}
            style={{
              position: "absolute", left: pos.x, top: pos.y,
              transform: "translate(-50%, -50%)",
              width: 52, height: 52, borderRadius: "50%",
              background: encendido ? `${T.copal}22` : "rgba(9,11,13,0.72)",
              border: `1px solid ${encendido ? T.copal : `${T.copal}30`}`,
              color: encendido ? T.copal : `${T.copal}88`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", backdropFilter: "blur(6px)",
              transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, left 0.4s ease, top 0.4s ease",
              boxShadow: encendido ? `0 0 18px ${T.copal}55` : "none",
              opacity: 0,
            }}
          >
            <Icono size={19} strokeWidth={1.6} color="currentColor" />
            <span style={{
              position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)",
              fontSize: 10, whiteSpace: "nowrap", color: "rgba(237,235,230,0.4)",
              fontFamily: T.sans, letterSpacing: "0.3px",
            }}>
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}