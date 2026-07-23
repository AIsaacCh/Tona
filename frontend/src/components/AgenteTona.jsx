import vozService from '../services/vozService';


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
  body: JSON.stringify({ user_id: userId, mensaje: texto }),
});
    const data = await resp.json();
    console.log("📋 Data completa:", data);
    agenteBus.emit("pensando_fin", {});

    const { accion, payload, mensaje, flujo_activo } = data;
    console.log("🎯 Acción:", accion, "📦 Payload:", payload, "🔄 Flujo activo:", flujo_activo);

    agenteBus.emit(accion, payload);

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

// Puente para widgets
agenteBus.on("enviar_texto_usuario", async ({ texto }) => {
  if (!texto?.trim()) return;
  const userId = localStorage.getItem("tona_user_id") || "demo";
  try {
    await enviarMensajeChat(userId, texto);
  } catch (e) {
    console.error("Error en puente enviar_texto_usuario:", e);
  }
});

// Puente para confirmación de creación directa
agenteBus.on("ejecutar_creacion", async ({ accion, payload }) => {
  const userId = localStorage.getItem("tona_user_id") || "demo";
  agenteBus.emit("pensando_inicio", {});
  try {
 const resp = await fetch(`${API}/agent/chat`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: userId,
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

// ✅ NUEVO: dos niveles de cierre
// "cerrar_vista"  → solo cierra el overlay activo (VistaShell), no toca widgets
// "cerrar_todo"   → cierra todo (overlay + widgets del dashboard)
// Ambos los maneja cada componente que los escucha.
// Dashboard solo necesita saber de cerrar_todo para limpiar su estado de widgets.

export const PALABRAS_CIERRE_TOTAL = [
  "cierra todo", "limpia pantalla", "quita todo",
  "borra todo", "limpiar", "cerrar todo", "limpia todo",
  "quita ventanas", "cierra ventanas",
];

export const PALABRAS_CIERRE_VISTA = [
  "ciérralo", "quítalo", "cierra eso", "cierra la vista",
  "ya cierra", "ok cierra", "quita eso", "ya está bien",
];

// ✅ Ahora devuelve "total" | "vista" | null en vez de true/false
export function detectarCierre(texto) {
  const t = texto.toLowerCase().trim();
  if (PALABRAS_CIERRE_TOTAL.some((p) => t.includes(p))) return "total";
  if (PALABRAS_CIERRE_VISTA.some((p) => t.includes(p))) return "vista";
  return null;
}