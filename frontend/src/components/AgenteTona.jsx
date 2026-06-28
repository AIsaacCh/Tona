// AgenteTona.jsx

const listeners = {};

export const agenteBus = {
  on(evento, cb) {
    if (!listeners[evento]) listeners[evento] = [];
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
// Cuando el backend esté listo, reemplazar por conectarWebSocket()

export function simular(accion, payload) {
  agenteBus.emit(accion, payload);
}

// ── Conexión WebSocket real ───────────────────────────────────────────────────
// Descomentar cuando conectes el backend:

// let ws = null;
//
// export function conectarWebSocket(url) {
//   ws = new WebSocket(url);
//   ws.onmessage = (e) => {
//     const { accion, payload } = JSON.parse(e.data);
//     agenteBus.emit(accion, payload);
//   };
//   ws.onclose = () => setTimeout(() => conectarWebSocket(url), 3000);
// }
//
// export function enviarMensaje(texto) {
//   if (ws && ws.readyState === WebSocket.OPEN) {
//     ws.send(JSON.stringify({ texto }));
//   }
// }

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