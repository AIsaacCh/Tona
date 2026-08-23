const API = import.meta.env.VITE_API_URL;

const listeners = {};
export const agenteBus = {
  on(evento, cb) {
    if (!listeners[evento]) listeners[evento] = [];
    if (listeners[evento].includes(cb)) return () => this.off(evento, cb);
    listeners[evento].push(cb);
    return () => this.off(evento, cb);
  },
  off(evento, cb) {
    if (!listeners[evento]) return;
    listeners[evento] = listeners[evento].filter((l) => l !== cb);
  },
  emit(evento, payload) {
    (listeners[evento] || []).forEach((cb) => cb(payload));
  },
};

export function simular(accion, payload) {
  agenteBus.emit(accion, payload);
}

export async function enviarMensajeChat(userId, texto) {
  console.log("📨 enviarMensajeChat llamado con:", userId, texto);
  agenteBus.emit("pensando_inicio", {});
  try {
    const resp = await fetch(`${API}/agent/chat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: texto }),
    });
    const data = await resp.json();
    console.log("📋 Data completa:", data);
    agenteBus.emit("pensando_fin", {});

    const { accion, payload, mensaje, flujo_activo, modo_ui } = data;
    console.log("🎯 Acción:", accion, "📦 Payload:", payload, "🔄 Flujo activo:", flujo_activo, "🖥️ Modo UI:", modo_ui);

    agenteBus.emit(accion, payload);
    agenteBus.emit("modo_ui", { modo: modo_ui || "compacto" });

    if (flujo_activo) {
      agenteBus.emit("flujo_activo", { activo: true });
    } else {
      agenteBus.emit("flujo_activo", { activo: false });
    }

    if (mensaje) {
      agenteBus.emit("tona_habla", { texto: mensaje });
    }

    return data;
  } catch (e) {
    console.error("💥 Error en enviarMensajeChat:", e);
    agenteBus.emit("pensando_fin", {});
    agenteBus.emit("flujo_activo", { activo: false });
    agenteBus.emit("flash", { mensaje: "Error de conexión", tipo: "error" });
    throw e;
  }
}

agenteBus.on("enviar_texto_usuario", async ({ texto }) => {
  if (!texto?.trim()) return;
  const userId = localStorage.getItem("tona_user_id") || "demo";
  try {
    await enviarMensajeChat(userId, texto);
  } catch (e) {
    console.error("Error en puente enviar_texto_usuario:", e);
  }
});

agenteBus.on("completar_examen_real", (contexto) => {
  agenteBus.emit("ejecutar_creacion", { accion: "completar_examen_real", payload: contexto });
});

agenteBus.on("confirmar_entrega_real", (contexto) => {
  agenteBus.emit("ejecutar_creacion", { accion: "entregar_tarea_real", payload: contexto });
});

agenteBus.on("completar_tarea_real", (contexto) => {
  agenteBus.emit("ejecutar_creacion", { accion: "completar_tarea_real", payload: contexto });
});

agenteBus.on("eliminar_tarea_real", (contexto) => {
  agenteBus.emit("ejecutar_creacion", { accion: "eliminar_tarea_real", payload: contexto });
});

agenteBus.on("crear_archivo_para_tarea", (contexto) => {
  agenteBus.emit("ejecutar_creacion", { accion: "crear_archivo_para_tarea", payload: contexto });
});

agenteBus.on("abrir_archivo_entrega", (contexto) => {
  if (contexto?.archivo_link) {
    window.open(contexto.archivo_link, "_blank");
  }

});

agenteBus.on("abrir_link_externo", (payload) => {
  if (payload?.url) {
    window.open(payload.url, "_blank");
  }
});

agenteBus.on("ejecutar_creacion", async ({ accion, payload }) => {
  const userId = localStorage.getItem("tona_user_id") || "demo";
  agenteBus.emit("pensando_inicio", {});
  try {
    const resp = await fetch(`${API}/agent/chat`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje: `__ACCION_DIRECTA__:${JSON.stringify({ accion, payload })}`,
      }),
    });
    const data = await resp.json();
    agenteBus.emit("pensando_fin", {});
    agenteBus.emit(data.accion, data.payload);
    if (data.mensaje) agenteBus.emit("tona_habla", { texto: data.mensaje });
  } catch (e) {
    agenteBus.emit("pensando_fin", {});
    agenteBus.emit("flash", { mensaje: "Error al confirmar", tipo: "error" });
  }
});

export const PALABRAS_CIERRE_TOTAL = [
  "cierra todo", "limpia pantalla", "quita todo",
  "borra todo", "limpiar", "cerrar todo", "limpia todo",
  "quita ventanas", "cierra ventanas",
];

export const PALABRAS_CIERRE_VISTA = [
  "ciérralo", "quítalo", "cierra eso", "cierra la vista",
  "ya cierra", "ok cierra", "quita eso", "ya está bien",
];

export const PALABRAS_CERRAR_PANEL = [
  "cierra el panel", "cierra el panel de trabajo", "sal del panel de trabajo",
  "cierra el modo de trabajo", "cierra el modo completo", "vuelve al inicio",
];

export function detectarCierre(texto) {
  const t = texto.toLowerCase().trim();
  if (PALABRAS_CIERRE_TOTAL.some((p) => t.includes(p))) return "total";
  if (PALABRAS_CIERRE_VISTA.some((p) => t.includes(p))) return "vista";
  if (PALABRAS_CERRAR_PANEL.some((p) => t.includes(p))) return "panel";
  return null;
}