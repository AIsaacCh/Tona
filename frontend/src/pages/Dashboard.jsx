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
import { FlashMensaje, ConfirmacionAccion, IndicadorPensando,TarjetaLinks } from "../components/agentes/Categoria1";
import { FormNuevaTarea, FormNuevoRecordatorio, FormNuevaNota, TarjetaExamen, TarjetaArchivo, NotificacionUrgente } from "../components/agentes/Categoria3y4";
import { ConfirmarCreacion } from "../components/agentes/ConfirmarCreacion";
import { VistaListaTareas,VistaGmail,VistaCalendario, VistaHorario, VistaMaterias, VistaArchivosDrive } from "../components/agentes/Categoria2";
import OnboardingTona from "../components/OnboardingTona";
import PanelConfiguracion from "../components/PanelConfiguracion";
import PanelDocs from "../components/PanelDocs";
import { PanelHorario } from "../components/PanelHorario";
import { useNavigate } from "react-router-dom";
import { PanelColaborar } from "../components/PanelColaborar";
import { PanelSalaEstudio } from "../components/PanelSalaEstudio";
import { useOnboarding } from "../hooks/useOnboarding";
import PanelCompleto from "../components/PanelCompleto";



import {
  WidgetTareas, WidgetTareasSm,
  WidgetRecordatorios, WidgetRecordatoriosSm,
  WidgetCalendario, WidgetCalendarioSm,
  WidgetContadorRegresivo, WidgetContadorRegresivoSm,
  WidgetMaterias, WidgetMateriasSm,
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
  contador: { Md: WidgetContadorRegresivo, Sm: WidgetContadorRegresivoSm, titulo: "Cuenta regresiva", categoria: "productividad" },
  materias: { Md: WidgetMaterias, Sm: WidgetMateriasSm, titulo: "Materias", categoria: "academico" },
  horario: { Md: WidgetHorario, Sm: WidgetHorarioSm, titulo: "Horario", categoria: "academico" },
  tarea_detalle: { Md: WidgetTareaDetalle, Sm: WidgetTareaDetalleSm, titulo: "Tarea detalle", categoria: "academico" },
  notas: { Md: WidgetNotas, Sm: WidgetNotasSm, titulo: "Notas", categoria: "info" },
  archivos: { Md: WidgetArchivos, Sm: WidgetArchivosSm, titulo: "Archivos", categoria: "info" },
  clima: { Md: WidgetClima, Sm: WidgetClimaSm, titulo: "Clima", categoria: "info" },
  estadisticas: { Md: WidgetEstadisticas, Sm: WidgetEstadisticasSm, titulo: "Estadísticas", categoria: "info" },
  acciones: { Md: WidgetAcciones, Sm: WidgetAccionesSm, titulo: "Acciones rápidas", categoria: "agente" },
};

let nextId = 1;

function BloqueoSuscripcion({ userId }) {
  async function handlePagar() {
    const resp = await fetch(`${API}/pagos/crear-checkout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await resp.json();
    if (data.url) window.location.href = data.url;
  }

  async function handleCerrarSesion() {
  try {
    await fetch(`${API}/auth/revocar`, { method: "POST", credentials: "include" });
  } catch (e) {
  }

  try {
    await fetch(`${API}/auth/logout`, {
      method: "GET",
      credentials: "include",
      redirect: "manual",
    });
  } catch (e) {
  }

  localStorage.clear();
  window.location.href = "/login";
}

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(9,11,13,0.97)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ maxWidth: 380, textAlign: "center", padding: 24 }}>
        <h2 style={{ color: "rgba(237,235,230,0.94)", fontSize: 22, marginBottom: 16 }}>
          Tu prueba gratuita terminó
        </h2>
        <p style={{ color: "rgba(237,235,230,0.5)", fontSize: 14, lineHeight: 1.7, marginBottom: 30 }}>
          Esperamos que hayas disfrutado Tona Premium. Para seguir usándolo, activa tu suscripción.
        </p>
        <button onClick={handlePagar} style={{
          width: "100%", padding: "14px 0", borderRadius: 30, marginBottom: 12,
          background: "var(--jade)", color: "var(--obsidiana)", border: "none",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          Suscribirme por $120 MXN/mes
        </button>
        <button onClick={handleCerrarSesion} style={{
          width: "100%", padding: "12px 0", borderRadius: 30,
          background: "transparent", color: "rgba(237,235,230,0.4)",
          border: "1px solid rgba(237,235,230,0.15)", fontSize: 13, cursor: "pointer",
        }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [params] = useSearchParams();
  const userId = params.get("user_id") || localStorage.getItem("tona_user_id") || "demo";

  useEffect(() => {
    const token = params.get("token");
    if (token) localStorage.setItem("tona_token", token);
  }, [params]);

  const { paso, actualizarPaso, cargando } = useOnboarding(userId);
  const [panelConfig, setPanelConfig] = useState(false);

  const promoYaIntentado = useRef(false);

  useEffect(() => {
    if (!userId || userId === "demo") return;
    if (promoYaIntentado.current) return;

    const promoPendiente = localStorage.getItem("tona_promo_pendiente");
    console.log("🎟️ promo pendiente encontrado en localStorage:", promoPendiente);
    if (!promoPendiente) return;

    promoYaIntentado.current = true;
    localStorage.removeItem("tona_promo_pendiente");

    fetch(`${API}/pagos/crear-checkout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promo_token: promoPendiente }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("🎟️ respuesta de crear-checkout:", data);
        if (data.url) window.location.href = data.url;
        else agenteBus.emit("flash", { mensaje: "No se pudo activar tu promoción", tipo: "error" });
      })
      .catch((e) => {
        console.error("🎟️ error activando promo:", e);
        agenteBus.emit("flash", { mensaje: "Error activando tu promoción", tipo: "error" });
      });
  }, [userId]);

  const claimYaIntentado = useRef(false);
  const [chequeandoEstado, setChequeandoEstado] = useState(true);
  const [bloqueado, setBloqueado] = useState(false);

useEffect(() => {
  if (!userId || userId === "demo") return;
  if (claimYaIntentado.current) return;
  claimYaIntentado.current = true;

    async function reclamarYVerificar() {
      const claimPendiente = localStorage.getItem("tona_claim_pendiente");

      if (claimPendiente) {
        localStorage.removeItem("tona_claim_pendiente");
        try {
          await fetch(`${API}/pagos/reclamar`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claim_token: claimPendiente }),
          });
        } catch (e) {
          console.error("Error reclamando suscripción:", e);
        }
      }

      try {
        const resp = await fetch(`${API}/pagos/estado`, { credentials: "include" });
        const data = await resp.json();
        setBloqueado(data.bloqueado);
      } catch (e) {
        console.error("Error verificando estado de suscripción:", e);
      } finally {
        setChequeandoEstado(false);
      }
    }

    reclamarYVerificar();
  }, [userId]);

  useEffect(() => {
  if (!userId || userId === "demo") return;

  async function revisarEstado() {
    try {
      const resp = await fetch(`${API}/pagos/estado`, { credentials: "include" });
      const data = await resp.json();
      setBloqueado(data.bloqueado);
    } catch (e) {
      console.error("Error revisando estado periódico:", e);
    }
  }

  const intervalo = setInterval(revisarEstado, 60000);

  function alVolverALaPestana() {
    if (document.visibilityState === "visible") revisarEstado();
  }
  document.addEventListener("visibilitychange", alVolverALaPestana);

  return () => {
    clearInterval(intervalo);
    document.removeEventListener("visibilitychange", alVolverALaPestana);
  };
}, [userId]);

  useEffect(() => {
    return agenteBus.on("abrir_configuracion", () => setPanelConfig(true));
  }, []);

  useEffect(() => {
    if (!userId || userId === "demo") return;
    fetch(`${API}/agent/saludo`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.saludo) {
          agenteBus.emit("tona_habla", { texto: data.saludo });
        }
      })
      .catch((e) => console.error("Error obteniendo saludo:", e));
  }, [userId]);

  if (cargando) return null;

  if (paso < 3) {
    return (
      <OnboardingTona
        userId={userId}
        paso={paso}
        onAvanzarPaso={actualizarPaso}
        onCompletado={() => actualizarPaso(3)}
      />
    );
  }

  return (
    <DashboardPrincipal
      userId={userId}
      params={params}
      panelConfig={panelConfig}
      setPanelConfig={setPanelConfig}
      bloqueado={bloqueado}
      chequeandoEstado={chequeandoEstado}
    />
  );
}

function DashboardPrincipal({ userId, params, panelConfig, setPanelConfig, bloqueado, chequeandoEstado }) {
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
  const [panelColaborar, setPanelColaborar] = useState(false);
  const [panelEstudio, setPanelEstudio] = useState(false);
  const [modoUI, setModoUI] = useState("compacto");
  const [panelesAbiertos, setPanelesAbiertos] = useState(true);

  useEffect(() => {
    if (userId && userId !== "demo") {
      localStorage.setItem("tona_user_id", userId);
    }
  }, [userId]);

  useEffect(() => {
    return agenteBus.on("modo_ui", ({ modo }) => {
      console.log("🖥️ modo_ui recibido:", modo);
      setModoUI(modo || "compacto");
    });
  }, []);

  useEffect(() => {
    if (!userId || userId === "demo") return;
    const t = setTimeout(() => {
      agenteBus.emit("ejecutar_creacion", { accion: "revisar_novedades_sitios", payload: {} });
    }, 2500);
    return () => clearTimeout(t);
  }, [userId]);

  useEffect(() => {
    if (!userId || userId === "demo") return;
    const t = setTimeout(() => {
      agenteBus.emit("ejecutar_creacion", { accion: "revisar_sugerencias_entrega", payload: {} });
    }, 4000);
    return () => clearTimeout(t);
  }, [userId]);

  useEffect(() => {
    if (!userId || userId === "demo") return;
    fetch(`${API}/tasks/sync`, {
      method: "GET",
      credentials: "include",
    })
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
      mostrar_horario: () => agregarWidgetRef.current("horario"),
      mostrar_notas: () => agregarWidgetRef.current("notas"),
      mostrar_archivos: () => agregarWidgetRef.current("archivos"),
      mostrar_clima: () => agregarWidgetRef.current("clima"),
      mostrar_estadisticas: () => agregarWidgetRef.current("estadisticas"),
      mostrar_acciones: () => agregarWidgetRef.current("acciones"),
      convertir_a_widget: ({ tipo }) => agregarWidgetRef.current(tipo),
      abrir_docs: () => setPanelDocs(true),
      abrir_editor: (p) => setPanelDocs(true),
      crear_doc: () => setPanelDocs(true),
      cerrar_todo: () => setWidgets([]),
      tona_habla: async ({ texto }) => {
        try {
          const resp = await fetch(`${API}/agent/hablar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ texto }),
          });
          const arrayBuffer = await resp.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio();
          audio.src = url;
          audio.onended = () => URL.revokeObjectURL(url);
          audio.oncanplaythrough = () => {
            audio.play().catch((e) => console.warn("No se pudo reproducir audio:", e));
          };
          audio.load();
        } catch {
        }
      },
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
    setModoUI("compacto");
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

    if (tipoCierre === "panel") {
      agenteBus.emit("modo_ui", { modo: "compacto" });
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

  const navigate = useNavigate();
  async function iniciarColaboracion() {
  try {
    const resp = await fetch(`${API}/colaborar/mi-sesion`, {
      credentials: "include",
    });
      
      const data = await resp.json();

      if (data.codigo) {
        navigate(`/colaborar/${data.codigo}`);
      } else {
        setPanelColaborar(true);
      }
    } catch (e) {
      console.error("Error verificando sesión activa:", e);
      setPanelColaborar(true);
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

  if (chequeandoEstado) return null;
  if (bloqueado) return <BloqueoSuscripcion userId={userId} />;

  const anchoIzqCompleto = modoUI === "completo" && panelesAbiertos ? 240 : 0;
  const anchoDerCompleto = modoUI === "completo" && panelesAbiertos ? 300 : 0;
  const offsetCompleto = (anchoIzqCompleto - anchoDerCompleto) / 2;
  const tamEsfera = modoUI === "completo" ? (panelesAbiertos ? 220 : 300) : 480;
  

  return (
    <div style={s.root}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 20% 10%, ${tema.luz1} 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 90%, ${tema.luz2} 0%, transparent 50%)`,
        pointerEvents: "none",
      }} />

      {modoUI === "compacto" && tiempo === "noche" && <EstrellasFugaces color={tema.acento} colorAlt={tema.jade} />}
      {modoUI === "compacto" && (tiempo === "manana" || tiempo === "tarde") && <Aves color={tema.textoDim} />}

      {modoUI === "compacto" && (
        <CajonWidgets
          lado="izquierdo"
          visible={editMode}
          onAgregar={agregarWidget}
          widgetsActivos={widgets}
        />
      )}

      {modoUI === "compacto" && (
        <div style={s.infoTL}>
          <span style={{ ...s.weather, color: tema.textoDim }}>
            {tema.saludo}, {nombre} · Despejado 18°C
          </span>
          <span style={s.clock}>{hora}</span>
        </div>
      )}

      {modoUI === "compacto" && (
        <div style={s.infoTR}>
          <span style={s.urgentDot} />
          <span style={s.urgentText}>2 urgentes</span>
          <button
            style={s.editBtn}
            onClick={() => setModoUI("completo")}
            title="Abrir panel completo"
          >
            ⤢
          </button>
          <button
            style={{ ...s.editBtn, ...(editMode ? s.editBtnActive : {}) }}
            onClick={() => setEditMode((p) => !p)}
            title={editMode ? "Salir de edición" : "Personalizar pantalla"}
          >
            {editMode ? "✕" : "⊞"}
          </button>
        </div>
      )}

      {modoUI === "compacto" && (
        <div
          ref={btnCerrarRef}
          style={{ ...s.btnCerrarWrap, opacity: 0, pointerEvents: hayContenido ? "auto" : "none" }}
        >
          <button onClick={cerrarTodo} style={s.btnCerrar}>
            <span style={s.btnCerrarDot} />
            limpiar pantalla
          </button>
        </div>
      )}

      {modoUI === "compacto" && (
        <div style={s.titleWrap}>
          <h1 style={{ ...s.title, color: tema.acento }}>TONA</h1>
          <div style={{
            ...s.titleLine,
            background: `linear-gradient(90deg, transparent, ${tema.jade}55, transparent)`,
          }} />
        </div>
      )}

      <div
        style={{
          ...s.sphereWrap,
          paddingTop: modoUI === "completo" ? 90 : 0,
          transform: `translateX(${offsetCompleto}px)`,
          transition: "padding-top 0.4s ease, transform 0.4s ease",
        }}
      >
        <div style={{
          position: "relative",
          width: tamEsfera,
          height: tamEsfera,
          transition: "width 0.4s ease, height 0.4s ease",
        }}>
          <EsferaTona size={tamEsfera} />
          
        </div>
      </div>

      <div style={{ ...s.bottomWrap, transform: `translateX(${offsetCompleto}px)`, transition: "transform 0.4s ease" }}>
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

      {modoUI === "compacto" && widgets.map((w) => {
        const def = WIDGET_MAP[w.tipo];
        if (!def) return null;

        return (
          <WidgetShell
            key={w.id}
            id={w.id}
            titulo={def.titulo}
            categoria={def.categoria}
            x={w.x}
            y={w.y}
            size={w.size}
            onClose={cerrarWidget}
            onMove={moverWidget}
            onResize={resizarWidget}
            childrenSm={<def.Sm />}
          >
            <def.Md />
          </WidgetShell>
        );
      })}

      <FlashMensaje />
      <ConfirmacionAccion />
      <TarjetaLinks />
      <IndicadorPensando />
      <VistaListaTareas />
      <VistaCalendario />
      <VistaHorario />
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

      {modoUI === "compacto" && (
        <>
          <button
            onClick={() => setPanelDocs(true)}
            title="Documentos"
            style={{
              position: "fixed",
              bottom: 148,
              right: 28,
              zIndex: 300,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(9,11,13,0.85)",
              border: `1px solid ${T.turquesa}22`,
              color: `${T.turquesa}66`,
              fontSize: 14,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
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

          <button
            onClick={iniciarColaboracion}
            title="Entrar a colaborar"
            style={{
              position: "fixed",
              bottom: 4,
              right: 28,
              zIndex: 300,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(9,11,13,0.85)",
              border: `1px solid ${T.amaranto}22`,
              color: `${T.amaranto}66`,
              fontSize: 16,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🤝
          </button>

          <button
            onClick={() => setPanelEstudio(true)}
            title="Sala de estudio"
            style={{
              position: "fixed",
              bottom: 4,
              right: 76,
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
            🧪
          </button>
        </>
      )}

      <PanelCompleto
        activo={modoUI === "completo"}
        userId={userId}
        panelesAbiertos={panelesAbiertos}
        setPanelesAbiertos={setPanelesAbiertos}
        onSalirPanel={() => setModoUI("compacto")}
      />

      {panelConfig && (
        <PanelConfiguracion
          userId={userId}
          onCerrar={() => setPanelConfig(false)}
        />
      )}

      {panelColaborar && (
        <PanelColaborar
          userId={userId}
          onCerrar={() => setPanelColaborar(false)}
        />
      )}

      {panelEstudio && (
        <PanelSalaEstudio
          userId={userId}
          onCerrar={() => setPanelEstudio(false)}
        />
      )}

      {panelDocs && (
        <PanelDocs
          userId={userId}
          onCerrar={() => setPanelDocs(false)}
        />
      )}

      {panelHorario && (
        <PanelHorario
          onCerrar={() => setPanelHorario(false)}
        />
      )}
    </div>
  );
}

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
    top: 24,
    left: 28,
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
    top: 24,
    right: 28,
    display: "flex",
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  urgentDot: {
    display: "inline-block",
    width: 6,
    height: 6,
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
    bottom: 36,
    left: 28,
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
    width: 6,
    height: 6,
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