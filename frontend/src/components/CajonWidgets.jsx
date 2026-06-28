import React from "react";
import { T } from "../tokens";
import {
  WidgetTareasSm, WidgetRecordatoriosSm, WidgetCalendarioSm,
  WidgetContadorRegresivоSm, WidgetMateriasSm, WidgetCalificacionesSm,
  WidgetHorarioSm, WidgetTareaDetalleSm, WidgetNotasSm,
  WidgetArchivosSm, WidgetClimaSm, WidgetEstadisticasSm, WidgetAccionesSm,
} from "./widgets/index";

const CATALOGO = [
  { id: "tareas",        titulo: "Tareas",          categoria: "productividad", Sm: WidgetTareasSm        },
  { id: "recordatorios", titulo: "Recordatorios",   categoria: "productividad", Sm: WidgetRecordatoriosSm },
  { id: "calendario",    titulo: "Calendario",      categoria: "productividad", Sm: WidgetCalendarioSm    },
  { id: "contador",      titulo: "Cuenta regresiva",categoria: "productividad", Sm: WidgetContadorRegresivоSm },
  { id: "materias",      titulo: "Materias",        categoria: "academico",     Sm: WidgetMateriasSm      },
  { id: "calificaciones",titulo: "Calificaciones",  categoria: "academico",     Sm: WidgetCalificacionesSm},
  { id: "horario",       titulo: "Horario",         categoria: "academico",     Sm: WidgetHorarioSm       },
  { id: "tarea_detalle", titulo: "Tarea detalle",   categoria: "academico",     Sm: WidgetTareaDetalleSm  },
  { id: "notas",         titulo: "Notas",           categoria: "info",          Sm: WidgetNotasSm         },
  { id: "archivos",      titulo: "Archivos",        categoria: "info",          Sm: WidgetArchivosSm      },
  { id: "clima",         titulo: "Clima",           categoria: "info",          Sm: WidgetClimaSm         },
  { id: "estadisticas",  titulo: "Estadísticas",    categoria: "info",          Sm: WidgetEstadisticasSm  },
  { id: "acciones",      titulo: "Acciones rápidas",categoria: "agente",        Sm: WidgetAccionesSm      },
];

const ACCENT = {
  productividad: T.copal,
  academico:     T.jade,
  info:          T.turquesa,
  agente:        T.copal,
};

const GRUPOS = [
  { key: "productividad", label: "PRODUCTIVIDAD" },
  { key: "academico",     label: "ACADÉMICO"      },
  { key: "info",          label: "INFORMACIÓN"    },
  { key: "agente",        label: "AGENTE"         },
];

export default function CajonWidgets({ lado = "derecho", visible, onAgregar, widgetsActivos }) {
  const isLeft = lado === "izquierdo";

  return (
    <div style={{
      position:   "fixed",
      top:        0,
      [isLeft ? "left" : "right"]: 0,
      width:      260,
      height:     "100vh",
      background: "rgba(8,10,12,0.96)",
      borderLeft: isLeft ? "none" : `1px solid ${T.cen}`,
      borderRight: isLeft ? `1px solid ${T.cen}` : "none",
      backdropFilter: "blur(16px)",
      zIndex:     200,
      display:    "flex",
      flexDirection: "column",
      transform:  visible
        ? "translateX(0)"
        : isLeft ? "translateX(-100%)" : "translateX(100%)",
      transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      overflowY:  "auto",
      padding:    "20px 0 32px",
      boxSizing:  "border-box",
    }}>

      {/* Header */}
      <div style={{ padding: "0 18px 16px", borderBottom: `1px solid ${T.cen}` }}>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: "1.5px", marginBottom: 4 }}>
          WIDGETS DISPONIBLES
        </div>
        <div style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", fontWeight: 300 }}>
          Toca para agregar al centro
        </div>
      </div>

      {/* Grupos */}
      {GRUPOS.map((grupo) => {
        const items = CATALOGO.filter((w) => w.categoria === grupo.key);
        const accent = ACCENT[grupo.key];
        return (
          <div key={grupo.key} style={{ padding: "14px 18px 0" }}>
            <div style={{ fontSize: 8, color: `${accent}88`, letterSpacing: "1.5px", marginBottom: 10 }}>
              {grupo.label}
            </div>
            {items.map((w) => {
              const yaActivo = widgetsActivos.some((a) => a.tipo === w.id);
              return (
                <div
                  key={w.id}
                  onClick={() => !yaActivo && onAgregar(w.id)}
                  style={{
                    background:    yaActivo ? `${accent}08` : `${accent}12`,
                    border:        `1px solid ${accent}${yaActivo ? "18" : "30"}`,
                    borderRadius:  10,
                    padding:       "10px 12px",
                    marginBottom:  8,
                    cursor:        yaActivo ? "default" : "pointer",
                    opacity:       yaActivo ? 0.4 : 1,
                    transition:    "opacity 0.2s, background 0.2s",
                  }}
                >
                  <div style={{ fontSize: 11, color: `rgba(237,235,230,${yaActivo ? "0.3" : "0.6"})`, fontWeight: 300, marginBottom: 4 }}>
                    {w.titulo}
                  </div>
                  <div style={{ fontSize: 9, color: `${accent}66`, letterSpacing: "0.3px" }}>
                    {grupo.label.toLowerCase()}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}