// Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import anime from "animejs";
import EsferaTona from "../components/EsferaTona";
import MicTona from "../components/MicTona";
import WidgetShell from "../components/WidgetShell";
import CajonWidgets from "../components/CajonWidgets";
import EstrellasFugaces from "../components/EstrellasFugaces";
import Aves from "../components/Aves";
import { T } from "../tokens";
import { agenteBus, detectarCierre, enviarMensajeChat } from "../components/AgenteTona";
import { useSearchParams } from "react-router-dom";
import { FlashMensaje, ConfirmacionAccion, IndicadorPensando } from "../components/agentes/Categoria1";
import { FormNuevaTarea, FormNuevoRecordatorio, FormNuevaNota, TarjetaExamen, TarjetaArchivo, NotificacionUrgente } from "../components/agentes/Categoria3y4";
import { ConfirmarCreacion } from "../components/agentes/ConfirmarCreacion";
import { VistaListaTareas,VistaGmail,VistaCalendario, VistaHorario, VistaCalificaciones, VistaMaterias, VistaArchivosDrive } from "../components/agentes/Categoria2";
import OnboardingTona from "../components/OnboardingTona";
import PanelConfiguracion from "../components/PanelConfiguracion";
import PanelDocs from "../components/PanelDocs";
import { PanelHorario } from "../components/PanelHorario";


import {
  WidgetTareas, WidgetTareasSm,
  WidgetRecordatorios, WidgetRecordatoriosSm,
  WidgetCalendario, WidgetCalendarioSm,
  WidgetContadorRegresivo, WidgetContadorRegresivоSm,
  WidgetMaterias, WidgetMateriasSm,
  WidgetCalificaciones, WidgetCalificacionesSm,
  WidgetHorario, WidgetHorarioSm,
  WidgetTareaDetalle, WidgetTareaDetalleSm,
  WidgetNotas, WidgetNotasSm,
  WidgetArchivos, WidgetArchivosSm,
  WidgetClima, WidgetClimaSm,
  WidgetEstadisticas, WidgetEstadisticasSm,
  WidgetAcciones, WidgetAccionesSm,
} from "../components/widgets/index";

const API = import.meta.env.VITE_API_URL;

function getTiempo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 13) return "manana";
  if (h >= 13 && h < 20) return "tarde";
  return "noche";
}

const TEMAS = {
  manana: {
    saludo: "Buenos días",
    frase: "El cielo de hoy abre camino.",
    acento: "#F5C87A",
    jade: "#2EC990",
    textoDim: "#5a7060",
    luz1: "rgba(255,180,60,0.05)",
    luz2: "rgba(255,120,30,0.03)",
  },
  tarde: {
    saludo: "Buenas tardes",
    frase: "La tarde es tuya para construir.",
    acento: "#ffffff",
    jade: "#34D399",
    textoDim: "#ffffff",
    luz1: "rgba(160,80,255,0.05)",
    luz2: "rgba(80,30,180,0.03)",
  },
  noche: {
    saludo: "Buenas noches",
    frase: "El cosmos observa tu avance.",
    acento: "#C8A96E",
    jade: "#3D7068",
    textoDim: "#3a5040",
    luz1: "rgba(29,158,117,0.05)",
    luz2: "rgba(10,60,40,0.03)",
  },
};

const WIDGET_MAP = {
  tareas: { Md: WidgetTareas, Sm: WidgetTareasSm, titulo: "Tareas", categoria: "productividad" },
  recordatorios: { Md: WidgetRecordatorios, Sm: WidgetRecordatoriosSm, titulo: "Recordatorios", categoria: "productividad" },
  calendario: { Md: WidgetCalendario, Sm: WidgetCalendarioSm, titulo: "Calendario", categoria: "productividad" },
  contador: { Md: WidgetContadorRegresivo, Sm: WidgetContadorRegresivоSm, titulo: "Cuenta regresiva", categoria: "productividad" },
  materias: { Md: WidgetMaterias, Sm: WidgetMateriasSm, titulo: "Materias", categoria: "academico" },
  calificaciones: { Md: WidgetCalificaciones, Sm: WidgetCalificacionesSm, titulo: "Calificaciones", categoria: "academico" },
  horario: { Md: WidgetHorario, Sm: WidgetHorarioSm, titulo: "Horario", categoria: "academico" },
  tarea_detalle: { Md: WidgetTareaDetalle, Sm: WidgetTareaDetalleSm, titulo: "Tarea detalle", categoria: "academico" },
  notas: { Md: WidgetNotas, Sm: WidgetNotasSm, titulo: "Notas", categoria: "info" },
  archivos: { Md: WidgetArchivos, Sm: WidgetArchivosSm, titulo: "Archivos", categoria: "info" },
  clima: { Md: WidgetClima, Sm: WidgetClimaSm, titulo: "Clima", categoria: "info" },
  estadisticas: { Md: WidgetEstadisticas, Sm: WidgetEstadisticasSm, titulo: "Estadísticas", categoria: "info" },
  acciones: { Md: WidgetAcciones, Sm: WidgetAccionesSm, titulo: "Acciones rápidas", categoria: "agente" },
};

let nextId = 1;

// ──────────────────────────────────────────────────────────────────────────────
// 🚀 DASHBOARD PRINCIPAL (con onboarding y configuración)
// ──────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [params] = useSearchParams();
  const userId = params.get("user_id") || "demo";

  const [onboarding, setOnboarding] = useState(null); // null = cargando
  const [panelConfig, setPanelConfig] = useState(false);

  // ✅ Verificar onboarding
  useEffect(() => {
    const uid = localStorage.getItem("tona_user_id") || userId;
    if (uid && uid !== "demo") {
      fetch(`${API}/agent/contexto/${uid}`)
        .then((r) => r.json())
        .then((data) => {
          setOnboarding(!data.onboarding_completado);
        })
        .catch(() => setOnboarding(false));
    } else {
      setOnboarding(true);
    }
  }, [userId]);

  // ✅ Escuchar evento para abrir configuración
  useEffect(() => {
    return agenteBus.on("abrir_configuracion", () => setPanelConfig(true));
  }, []);

  if (onboarding === null) return null;

  if (onboarding) {
    return (
      <OnboardingTona
        userId={userId}
        onCompletado={() => setOnboarding(false)}
      />
    );
  }

  return (
    <DashboardPrincipal
      userId={userId}
      params={params}
      panelConfig={panelConfig}
      setPanelConfig={setPanelConfig}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 🧩 DASHBOARD PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────
function DashboardPrincipal({ userId, params, panelConfig, setPanelConfig }) {
  const nombre = (params.get("name") || "Isaac").split(" ")[0];
  const tiempo = getTiempo();
  const tema = TEMAS[tiempo];

  const [hora, setHora] = useState("");
  const [input, setInput] = useState("");
  const [micActivo, setMicActivo] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [hayContenido, setHayContenido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const btnCerrarRef = useRef(null);
  const [panelDocs, setPanelDocs] = useState(false);
  const [panelHorario, setPanelHorario] = useState(false);

  // ✅ Persistir user_id
  useEffect(() => {
    if (userId && userId !== "demo") {
      localStorage.setItem("tona_user_id", userId);
    }
  }, [userId]);

  // ✅ Sincronizar Classroom + Calendar
  useEffect(() => {
    if (!userId || userId === "demo") return;
    fetch(`${API}/tasks/sync/${userId}`, { method: "GET" })
      .then((r) => r.json())
      .then((data) => console.log("📚 Sync inicial:", data))
      .catch((e) => console.error("❌ Error sincronizando al cargar:", e));
  }, [userId]);

  useEffect(() => {
    setHayContenido(widgets.length > 0);
  }, [widgets]);

  useEffect(() => {
    if (!btnCerrarRef.current) return;
    anime({
      targets: btnCerrarRef.current,
      opacity: hayContenido ? [0, 1] : [1, 0],
      translateY: hayContenido ? [10, 0] : [0, 10],
      duration: 300,
      easing: "easeOutQuart",
    });
  }, [hayContenido]);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      setHora(`${h}:${m}`);
    }
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  const agregarWidgetRef = useRef(agregarWidget);
  useEffect(() => {
    agregarWidgetRef.current = agregarWidget;
  }, [widgets]);

  useEffect(() => {
    const acciones = {
      mostrar_tareas: () => agregarWidgetRef.current("tareas"),
      mostrar_recordatorios: () => agregarWidgetRef.current("recordatorios"),
      mostrar_calendario: () => agregarWidgetRef.current("calendario"),
      mostrar_materias: () => agregarWidgetRef.current("materias"),
      mostrar_calificaciones: () => agregarWidgetRef.current("calificaciones"),
      mostrar_horario: () => agregarWidgetRef.current("horario"),
      mostrar_notas: () => agregarWidgetRef.current("notas"),
      mostrar_archivos: () => agregarWidgetRef.current("archivos"),
      mostrar_clima: () => agregarWidgetRef.current("clima"),
      mostrar_estadisticas: () => agregarWidgetRef.current("estadisticas"),
      mostrar_acciones: () => agregarWidgetRef.current("acciones"),
      convertir_a_widget: ({ tipo }) => agregarWidgetRef.current(tipo),
      abrir_docs:   () => setPanelDocs(true),
      abrir_editor: (p) => setPanelDocs(true),
      crear_doc:    () => setPanelDocs(true),
      cerrar_todo: () => setWidgets([]),
      tona_habla: async ({ texto }) => {
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
        } catch {
          // fallback silencioso
        }
      },
      // ✅ ACCIONES DE DOCUMENTOS
      abrir_docs_con_titulo: ({ titulo }) => {
        setPanelDocs(true);
        setTimeout(() => {
          agenteBus.emit("panel_docs_crear_con_titulo", { titulo });
        }, 100);
      },
      abrir_doc_especifico: ({ doc_id, titulo }) => {
        setPanelDocs(true);
        setTimeout(() => {
          agenteBus.emit("panel_docs_abrir_doc", { doc_id, titulo });
        }, 100);
      },
    };
    const offs = Object.entries(acciones).map(([e, fn]) => agenteBus.on(e, fn));
    return () => offs.forEach((off) => off());
  }, []);

  function cerrarTodo() {
    agenteBus.emit("cerrar_todo", {});
    setWidgets([]);
  }

  function agregarWidget(tipo) {
    setWidgets((prev) => {
      if (prev.some((w) => w.tipo === tipo)) return prev;
      const id = `w-${nextId++}`;
      return [
        ...prev,
        { id, tipo, x: 100 + (prev.length % 4) * 30, y: 100 + (prev.length % 4) * 30, size: "md" },
      ];
    });
  }

  function moverWidget(id, x, y) {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, x, y } : w));
  }

  function cerrarWidget(id) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }

  function resizarWidget(id, size) {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, size } : w));
  }

  async function handleSendMessage(texto) {
    if (!texto.trim() || enviando) return;

    const tipoCierre = detectarCierre(texto);

    if (tipoCierre === "total") {
      cerrarTodo();
      agenteBus.emit("flash", { mensaje: "Pantalla limpiada", tipo: "info" });
      setInput("");
      return;
    }

    if (tipoCierre === "vista") {
      agenteBus.emit("cerrar_vista", {});
      setInput("");
      return;
    }

    setEnviando(true);
    try {
      await enviarMensajeChat(userId, texto);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      agenteBus.emit("flash", { mensaje: "Error al enviar mensaje", tipo: "error" });
    } finally {
      setEnviando(false);
      setInput("");
    }
  }

  function handleInput(e) {
    setInput(e.target.value);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage(input);
    }
  }

  return (
    <div style={s.root}>
      {/* Fondo ambiental */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 20% 10%, ${tema.luz1} 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 90%, ${tema.luz2} 0%, transparent 50%)`,
        pointerEvents: "none",
      }} />

      {/* Efectos de fondo */}
      {tiempo === "noche" && <EstrellasFugaces color={tema.acento} colorAlt={tema.jade} />}
      {(tiempo === "manana" || tiempo === "tarde") && <Aves color={tema.textoDim} />}

      {/* Cajón de widgets */}
      <CajonWidgets
        lado="izquierdo"
        visible={editMode}
        onAgregar={agregarWidget}
        widgetsActivos={widgets}
      />

      {/* Info top-left */}
      <div style={s.infoTL}>
        <span style={{ ...s.weather, color: tema.textoDim }}>
          {tema.saludo}, {nombre} · Despejado 18°C
        </span>
        <span style={s.clock}>{hora}</span>
      </div>

      {/* Top-right */}
      <div style={s.infoTR}>
        <span style={s.urgentDot} />
        <span style={s.urgentText}>2 urgentes</span>
        <button
          style={{ ...s.editBtn, ...(editMode ? s.editBtnActive : {}) }}
          onClick={() => setEditMode((p) => !p)}
          title={editMode ? "Salir de edición" : "Personalizar pantalla"}
        >
          {editMode ? "✕" : "⊞"}
        </button>
      </div>

      {/* Botón limpiar pantalla */}
      <div
        ref={btnCerrarRef}
        style={{ ...s.btnCerrarWrap, opacity: 0, pointerEvents: hayContenido ? "auto" : "none" }}
      >
        <button onClick={cerrarTodo} style={s.btnCerrar}>
          <span style={s.btnCerrarDot} />
          limpiar pantalla
        </button>
      </div>

      {/* Título */}
      <div style={s.titleWrap}>
        <h1 style={{ ...s.title, color: tema.acento }}>TONA</h1>
        <div style={{
          ...s.titleLine,
          background: `linear-gradient(90deg, transparent, ${tema.jade}55, transparent)`,
        }} />
      </div>

      {/* Esfera */}
      <div style={s.sphereWrap}>
        <EsferaTona size={480} />
      </div>

      {/* Bottom — mic + input */}
      <div style={s.bottomWrap}>
        <div style={s.micWrap}>
          <MicTona size={72} userId={userId} onToggle={setMicActivo} />
        </div>
        <div style={{
          ...s.inputWrap,
          borderColor: micActivo ? `${tema.acento}55` : "rgba(237,235,230,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <input
            style={s.input}
            type="text"
            placeholder={enviando ? "enviando..." : (micActivo ? "escuchando..." : `${tema.frase}`)}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={enviando}
            autoFocus
            aria-label="Habla con TONA"
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={enviando || !input.trim()}
            style={{
              background: "transparent",
              border: "none",
              color: input.trim() ? "rgba(200,169,110,0.7)" : "rgba(237,235,230,0.15)",
              fontSize: 16,
              cursor: input.trim() ? "pointer" : "default",
              padding: "0 4px",
              flexShrink: 0,
              transition: "color 0.2s",
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* Widgets flotantes */}
      {widgets.map((w) => {
        const def = WIDGET_MAP[w.tipo];
        if (!def) return null;
        return (
          <WidgetShell
            key={w.id} id={w.id}
            titulo={def.titulo} categoria={def.categoria}
            x={w.x} y={w.y} size={w.size}
            onClose={cerrarWidget}
            onMove={moverWidget}
            onResize={resizarWidget}
            childrenSm={<def.Sm />}
          >
            <def.Md />
          </WidgetShell>
        );
      })}

      {/* Componentes del agente */}
      <FlashMensaje />
      <ConfirmacionAccion />
      <IndicadorPensando />
      <VistaListaTareas />
      <VistaCalendario />
      <VistaHorario />
      <VistaCalificaciones />
      <VistaMaterias />
      <FormNuevaTarea />
      <FormNuevoRecordatorio />
      <FormNuevaNota />
      <TarjetaExamen />
      <TarjetaArchivo />
      <NotificacionUrgente />
      <ConfirmarCreacion />
      <VistaArchivosDrive />
      <VistaGmail />

      {/* 📄 Botón de documentos flotante */}
      <button
        onClick={() => setPanelDocs(true)}
        title="Documentos"
        style={{
          position:       "fixed",
          bottom:         148,
          right:          28,
          zIndex:         300,
          width:          40,
          height:         40,
          borderRadius:   "50%",
          background:     "rgba(9,11,13,0.85)",
          border:         `1px solid ${T.turquesa}22`,
          color:          `${T.turquesa}66`,
          fontSize:       14,
          cursor:         "pointer",
          backdropFilter: "blur(8px)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          transition:     "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${T.turquesa}55`;
          e.currentTarget.style.color = T.turquesa;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${T.turquesa}22`;
          e.currentTarget.style.color = `${T.turquesa}66`;
        }}
      >
        ✎
      </button>

      {/* ⚙️ Botón de configuración flotante */}
      <button
        onClick={() => setPanelConfig(true)}
        title="Configuración"
        style={{
          position: "fixed",
          bottom: 100,
          right: 28,
          zIndex: 300,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(9,11,13,0.85)",
          border: `1px solid ${T.copal}22`,
          color: `${T.copal}66`,
          fontSize: 16,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${T.copal}55`;
          e.currentTarget.style.color = T.copal;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${T.copal}22`;
          e.currentTarget.style.color = `${T.copal}66`;
        }}
      >
        ⚙
      </button>
      {/* 📅 Botón de horario flotante */}
      <button
        onClick={() => setPanelHorario(true)}
        title="Configurar horario"
        style={{
          position: "fixed",
          bottom: 52,
          right: 28,
          zIndex: 300,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(9,11,13,0.85)",
          border: `1px solid ${T.jade}22`,
          color: `${T.jade}66`,
          fontSize: 16,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${T.jade}55`;
          e.currentTarget.style.color = T.jade;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${T.jade}22`;
          e.currentTarget.style.color = `${T.jade}66`;
        }}
      >
        📅
      </button>

      {/* Panel de configuración */}
      {panelConfig && (
        <PanelConfiguracion
          userId={userId}
          onCerrar={() => setPanelConfig(false)}
        />
      )}

      {/* Panel de documentos */}
      {panelDocs && (
        <PanelDocs
          userId={userId}
          onCerrar={() => setPanelDocs(false)}
        />
      )}

      {/* Panel de horario */}
      {panelHorario && (
        <PanelHorario
          onCerrar={() => setPanelHorario(false)}
        />
      )}


    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 🎨 ESTILOS
// ──────────────────────────────────────────────────────────────────────────────
const s = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    background: T.obs,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  infoTL: {
    position: "absolute",
    top: 24, left: 28,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    zIndex: 10,
  },
  weather: {
    fontSize: 11,
    letterSpacing: "0.5px",
    fontWeight: 300,
    fontFamily: T.sans,
  },
  clock: {
    fontSize: 13,
    color: "rgba(237,235,230,0.18)",
    letterSpacing: "1px",
    fontWeight: 300,
    fontFamily: T.mono,
  },
  infoTR: {
    position: "absolute",
    top: 24, right: 28,
    display: "flex",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  urgentDot: {
    display: "inline-block",
    width: 6, height: 6,
    borderRadius: "50%",
    background: T.amaranto,
  },
  urgentText: {
    fontSize: 11,
    color: T.muted,
    letterSpacing: "0.5px",
    fontWeight: 300,
  },
  editBtn: {
    background: "transparent",
    border: "1px solid rgba(237,235,230,0.08)",
    borderRadius: 7,
    color: "rgba(237,235,230,0.25)",
    fontSize: 13,
    padding: "4px 9px",
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "all 0.2s ease",
    lineHeight: 1,
  },
  editBtnActive: {
    borderColor: `${T.copal}50`,
    color: T.copal,
    background: `${T.copal}08`,
  },
  btnCerrarWrap: {
    position: "absolute",
    bottom: 36, left: 28,
    zIndex: 20,
  },
  btnCerrar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(10,12,14,0.85)",
    border: `1px solid ${T.amaranto}30`,
    borderRadius: 20,
    padding: "7px 14px",
    color: `${T.amaranto}88`,
    fontSize: 11,
    fontFamily: T.mono,
    letterSpacing: "0.5px",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    transition: "border-color 0.2s, color 0.2s",
  },
  btnCerrarDot: {
    display: "inline-block",
    width: 6, height: 6,
    borderRadius: "50%",
    background: T.amaranto,
    opacity: 0.7,
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 28,
    flexShrink: 0,
    zIndex: 2,
  },
  title: {
    fontFamily: T.serif,
    fontSize: 72,
    fontWeight: 300,
    letterSpacing: 24,
    textIndent: 24,
    lineHeight: 1,
    margin: 0,
    userSelect: "none",
    transition: "color 1s ease",
  },
  titleLine: {
    width: 100,
    height: 1,
    marginTop: 8,
    transition: "background 1s ease",
  },
  sphereWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "visible",
    minHeight: 0,
    pointerEvents: "none",
  },
  bottomWrap: {
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingBottom: 36,
    width: "100%",
    zIndex: 10,
    position: "relative",
  },
  micWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    width: 340,
    background: "rgba(255,255,255,0.025)",
    border: "1px solid",
    borderRadius: 30,
    padding: "10px 20px",
    transition: "border-color 0.4s ease",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    fontFamily: T.sans,
    fontSize: 12,
    fontWeight: 300,
    color: "rgba(237,235,230,0.7)",
    letterSpacing: "0.3px",
  },
};