// AgenteTona.jsx - VERSIÓN ORIGINAL COMPLETA
import vozService from '../services/vozService';
import api from '../services/api';

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

// ── Simulador para desarrollo ─────────────────────────────────────────────────
export function simular(accion, payload) {
  agenteBus.emit(accion, payload);
}

// ── Enviar mensaje al chat ────────────────────────────────────────────────────
export async function enviarMensajeChat(userId, texto) {
  console.log("📨 enviarMensajeChat llamado con:", userId, texto);
  agenteBus.emit("pensando_inicio", {});
  
  try {
    console.log("🌐 Haciendo fetch...");
    const resp = await fetch("http://localhost:8000/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, mensaje: texto }),
    });
    
    console.log("✅ Fetch completado, status:", resp.status);
    const data = await resp.json();
    console.log("📋 Data completa:", data);
    
    agenteBus.emit("pensando_fin", {});
    
    const { accion, payload, mensaje } = data;
    console.log("🎯 Acción:", accion);
    console.log("📦 Payload:", payload);
    
    agenteBus.emit(accion, payload);
    
    if (mensaje) {
      agenteBus.emit("tona_habla", { texto: mensaje });
    }
    
    return data;
  } catch (e) {
    console.error("💥 Error en enviarMensajeChat:", e);
    agenteBus.emit("pensando_fin", {});
    agenteBus.emit("flash", { mensaje: "Error de conexión", tipo: "error" });
    throw e;
  }
}

// ── Detección de cierre por texto ─────────────────────────────────────────────
export const PALABRAS_CIERRE = [
  "cierra todo", "limpia pantalla", "quita todo",
  "borra todo", "limpiar", "cerrar todo", "limpia",
  "quita ventanas", "cierra ventanas",
];

export function detectarCierre(texto) {
  const t = texto.toLowerCase().trim();
  return PALABRAS_CIERRE.some((p) => t.includes(p));
}