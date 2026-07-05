// componentes_aislados/agentes/Categoria3y4.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import anime from "animejs";
import { T } from "../../tokens";
import { agenteBus } from "../AgenteTona";

const API = import.meta.env.VITE_API_URL;

// ── FormShell ─────────────────────────────────────────────────────────────────

function FormShell({ titulo, accent = T.copal, onCerrar, onGuardar, guardando = false, children }) {
  const ref        = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 300, easing: "easeOutQuart" });
    anime.timeline({ easing: "easeOutElastic(1, 0.6)" })
      .add({ targets: ref.current, opacity: [0, 1], translateY: [-30, 4], duration: 400 })
      .add({ targets: ref.current, translateY: [4, 0], duration: 250 });
  }, []);

  const cerrar = useCallback(() => {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, translateY: 16, duration: 250, complete: onCerrar }, "-=150");
  }, [onCerrar]);

  useEffect(() => { return agenteBus.on("cerrar_todo", cerrar); }, [cerrar]);

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", opacity: 0,
    }}>
      <div ref={ref} style={{
        width: 360, background: "rgba(9,11,13,0.97)",
        border: `1px solid ${accent}25`, borderTop: `1px solid ${accent}55`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: `0 8px 48px rgba(0,0,0,0.7), 0 0 40px ${accent}08`,
        opacity: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${accent}18` }}>
          <span style={{ fontSize: 9, color: `${accent}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>{titulo}</span>
          <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "18px 18px 6px" }}>{children}</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 18px 18px" }}>
          <button
            onClick={() => { if (!guardando) onGuardar?.(); }}
            disabled={guardando}
            style={{ ...btnForm(accent), opacity: guardando ? 0.5 : 1, cursor: guardando ? "wait" : "pointer" }}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={cerrar} style={btnForm(T.amaranto, true)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function btnForm(color, outline = false) {
  return {
    flex: 1, background: outline ? "transparent" : `${color}18`,
    border: `1px solid ${color}${outline ? "30" : "45"}`,
    borderRadius: 8, padding: "9px 0", color,
    fontSize: 12, fontFamily: T.sans, fontWeight: 300,
    cursor: "pointer", letterSpacing: "0.3px",
  };
}

function Campo({ label, value, onChange, placeholder, tipo = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 6, fontFamily: T.mono }}>{label}</div>
      <input
        type={tipo} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "rgba(237,235,230,0.03)",
          border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8,
          padding: "9px 12px", color: "rgba(237,235,230,0.7)",
          fontSize: 12, fontFamily: T.sans, fontWeight: 300,
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ── FormNuevaTarea ────────────────────────────────────────────────────────────

export function FormNuevaTarea() {
  const [data,      setData]      = useState(null);
  const [titulo,    setTitulo]    = useState("");
  const [fecha,     setFecha]     = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [guardando, setGuardando] = useState(false);

  const userId = localStorage.getItem("tona_user_id") || "demo";

  useEffect(() => {
    const off1 = agenteBus.on("nueva_tarea", (p) => {
      setData(p || {});
      setTitulo(p?.titulo || "");
      setFecha(p?.fecha || "");
      setPrioridad(p?.prioridad || "Media");
    });
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;

  async function guardar() {
    if (!titulo.trim()) {
      agenteBus.emit("flash", { mensaje: "El título es obligatorio", tipo: "error" });
      return;
    }
    if (!fecha) {
      agenteBus.emit("flash", { mensaje: "La fecha es obligatoria", tipo: "error" });
      return;
    }
    setGuardando(true);
    try {
      const resp = await fetch(`${API}/tasks/manual/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          fecha_limite: fecha,
          prioridad: prioridad.toLowerCase(),
          resumen: titulo.trim(),
        }),
      });
      if (resp.ok) {
        agenteBus.emit("flash", { mensaje: `"${titulo}" guardada`, tipo: "exito" });
        setData(null);
      } else {
        agenteBus.emit("flash", { mensaje: "No se pudo guardar la tarea", tipo: "error" });
      }
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error de conexión", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <FormShell titulo="TONA · NUEVA TAREA" accent={T.copal} onCerrar={() => setData(null)} onGuardar={guardar} guardando={guardando}>
      <Campo label="TÍTULO" value={titulo} onChange={setTitulo} placeholder="Nombre de la tarea" />
      <Campo label="FECHA"  value={fecha}  onChange={setFecha}  placeholder="2026-06-27" tipo="date" />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 8, fontFamily: T.mono }}>PRIORIDAD</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Alta", "Media", "Baja"].map((p) => {
            const c = { Alta: T.amaranto, Media: T.copal, Baja: T.jade }[p];
            return (
              <button key={p} onClick={() => setPrioridad(p)} style={{
                flex: 1, background: prioridad === p ? `${c}25` : `${c}08`,
                border: `1px solid ${c}${prioridad === p ? "55" : "20"}`,
                borderRadius: 6, padding: "7px 0",
                color: c, fontSize: 11, fontFamily: T.sans, cursor: "pointer",
              }}>{p}</button>
            );
          })}
        </div>
      </div>
    </FormShell>
  );
}

// ── FormNuevoRecordatorio ─────────────────────────────────────────────────────

export function FormNuevoRecordatorio() {
  const [data,  setData]  = useState(null);
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora,  setHora]  = useState("");
  const [guardando, setGuardando] = useState(false);

  const userId = localStorage.getItem("tona_user_id") || "demo";

  useEffect(() => {
    const off1 = agenteBus.on("nuevo_recordatorio", (p) => {
      setData(p || {});
      setTexto(p?.texto || "");
      setFecha(p?.fecha || "");
      setHora(p?.hora || "");
    });
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;

  async function guardar() {
    if (!texto.trim()) {
      agenteBus.emit("flash", { mensaje: "La descripción es obligatoria", tipo: "error" });
      return;
    }
    if (!fecha || !hora) {
      agenteBus.emit("flash", { mensaje: "Fecha y hora son obligatorias", tipo: "error" });
      return;
    }
    setGuardando(true);
    try {
      const resp = await fetch(`${API}/tasks/evento/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: texto.trim(),
          fecha,
          hora,
          descripcion: "Recordatorio creado desde Tona",
          duracion_min: 30,
        }),
      });
      if (resp.ok) {
        agenteBus.emit("flash", { mensaje: "Recordatorio añadido al calendario", tipo: "exito" });
        setData(null);
      } else {
        const err = await resp.json();
        agenteBus.emit("flash", { mensaje: err.detail || "No se pudo crear el recordatorio", tipo: "error" });
      }
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error de conexión", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <FormShell titulo="TONA · NUEVO RECORDATORIO" accent={T.copal} onCerrar={() => setData(null)} onGuardar={guardar} guardando={guardando}>
      <Campo label="DESCRIPCIÓN" value={texto} onChange={setTexto} placeholder="¿De qué quieres que te recuerde?" />
      <Campo label="FECHA"       value={fecha} onChange={setFecha} placeholder="2026-06-27" tipo="date" />
      <Campo label="HORA"        value={hora}  onChange={setHora}  placeholder="09:00" tipo="time" />
    </FormShell>
  );
}

// ── FormNuevaNota ─────────────────────────────────────────────────────────────

export function FormNuevaNota() {
  const [data,      setData]      = useState(null);
  const [titulo,    setTitulo]    = useState("");
  const [contenido, setContenido] = useState("");

  useEffect(() => {
    const off1 = agenteBus.on("nueva_nota", (p) => {
      setData(p || {});
      setTitulo(p?.titulo || "");
      setContenido(p?.contenido || "");
    });
    const off2 = agenteBus.on("cerrar_todo", () => setData(null));
    return () => { off1(); off2(); };
  }, []);

  if (!data) return null;

  function guardar() {
    if (!titulo.trim()) {
      agenteBus.emit("flash", { mensaje: "El título es obligatorio", tipo: "error" });
      return;
    }
    agenteBus.emit("flash", { mensaje: "Nota guardada", tipo: "exito" });
    setData(null);
  }

  return (
    <FormShell titulo="TONA · NUEVA NOTA" accent={T.turquesa} onCerrar={() => setData(null)} onGuardar={guardar}>
      <Campo label="TÍTULO" value={titulo} onChange={setTitulo} placeholder="Título de la nota" />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 6, fontFamily: T.mono }}>CONTENIDO</div>
        <textarea
          value={contenido} onChange={(e) => setContenido(e.target.value)}
          placeholder="Escribe aquí..." rows={5}
          style={{
            width: "100%", background: "rgba(237,235,230,0.03)",
            border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8,
            padding: "9px 12px", color: "rgba(237,235,230,0.7)",
            fontSize: 12, fontFamily: T.sans, fontWeight: 300,
            outline: "none", resize: "none", boxSizing: "border-box",
          }}
        />
      </div>
    </FormShell>
  );
}

// ── TarjetaExamen ─────────────────────────────────────────────────────────────

export function TarjetaExamen() {
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("tarjeta_examen", (p) => setData(p || { materia: "Cálculo", fecha: "2026-06-28", hora: "09:00" }));
    const off2 = agenteBus.on("cerrar_todo", () => {
      if (ref.current) anime({ targets: ref.current, opacity: 0, translateX: 20, duration: 260, easing: "easeInQuart", complete: () => setData(null) });
      else setData(null);
    });
    return () => { off1(); off2(); };
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], translateX: [40, 4], duration: 400 })
      .add({ targets: ref.current, translateX: [4, 0], duration: 250, easing: "easeOutElastic(1, 0.5)" });
  }, [data]);

  if (!data) return null;

  const diff  = new Date(`${data.fecha}T${data.hora}`) - new Date();
  const dias  = Math.max(0, Math.floor(diff / 86400000));
  const horas = Math.max(0, Math.floor((diff % 86400000) / 3600000));

  function cerrar() {
    anime({ targets: ref.current, opacity: 0, translateX: 20, duration: 260, easing: "easeInQuart", complete: () => setData(null) });
  }

  return (
    <div ref={ref} style={{ position: "fixed", bottom: 140, right: 32, zIndex: 400, opacity: 0 }}>
      <div style={{
        width: 280, background: "rgba(9,11,13,0.95)",
        border: `1px solid ${T.amaranto}30`, borderTop: `1px solid ${T.amaranto}66`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 30px ${T.amaranto}08`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${T.amaranto}18` }}>
          <span style={{ fontSize: 9, color: `${T.amaranto}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>TONA · EXAMEN</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { agenteBus.emit("convertir_a_widget", { tipo: "contador" }); cerrar(); }} style={{ background: `${T.amaranto}15`, border: `1px solid ${T.amaranto}35`, borderRadius: 5, padding: "2px 8px", color: T.amaranto, fontSize: 9, fontFamily: T.mono, cursor: "pointer" }}>FIJAR</button>
            <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 11, cursor: "pointer" }}>✕</button>
          </div>
        </div>
        <div style={{ padding: "14px" }}>
          <div style={{ fontSize: 15, color: "rgba(237,235,230,0.85)", fontWeight: 300, marginBottom: 4 }}>{data.materia}</div>
          <div style={{ fontSize: 11, color: `${T.amaranto}88`, marginBottom: 14 }}>{data.fecha} · {data.hora}</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[{ v: dias, l: "días" }, { v: horas, l: "horas" }].map(({ v, l }) => (
              <div key={l} style={{ flex: 1, background: `${T.amaranto}10`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: T.mono, fontSize: 24, color: T.amaranto, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, color: "rgba(237,235,230,0.25)", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${T.amaranto}33,transparent)` }} />
      </div>
    </div>
  );
}

// ── TarjetaArchivo ────────────────────────────────────────────────────────────

const TIPO_COLOR = { pdf: T.amaranto, docx: T.turquesa, xlsx: T.jade, pptx: T.copal, txt: "rgba(237,235,230,0.3)" };

export function TarjetaArchivo() {
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("tarjeta_archivo", (p) => setData(p || { nombre: "Proyecto_TONA.pdf", tamaño: "2.4 MB", modificado: "Hoy 17:45" }));
    const off2 = agenteBus.on("cerrar_todo", () => {
      if (ref.current) anime({ targets: ref.current, opacity: 0, translateX: -20, duration: 260, easing: "easeInQuart", complete: () => setData(null) });
      else setData(null);
    });
    return () => { off1(); off2(); };
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], translateX: [-40, 4], duration: 400 })
      .add({ targets: ref.current, translateX: [4, 0], duration: 250, easing: "easeOutElastic(1, 0.5)" });
  }, [data]);

  if (!data) return null;

  const ext   = data.nombre.split(".").pop();
  const color = TIPO_COLOR[ext] || T.copal;

  function cerrar() {
    anime({ targets: ref.current, opacity: 0, translateX: -20, duration: 260, easing: "easeInQuart", complete: () => setData(null) });
  }

  return (
    <div ref={ref} style={{ position: "fixed", bottom: 140, left: 32, zIndex: 400, opacity: 0, width: 260 }}>
      <div style={{
        background: "rgba(9,11,13,0.95)",
        border: `1px solid ${color}28`, borderTop: `1px solid ${color}55`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 30px ${color}08`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${color}15` }}>
          <span style={{ fontSize: 9, color: `${color}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>TONA · ARCHIVO</span>
          <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 11, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: `${color}20`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color, fontFamily: T.mono }}>{ext.toUpperCase()}</span>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "rgba(237,235,230,0.7)", fontWeight: 300 }}>{data.nombre}</div>
              <div style={{ fontSize: 10, color: "rgba(237,235,230,0.25)", marginTop: 2 }}>{data.tamaño} · {data.modificado}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 1, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 7, padding: "7px 0", color, fontSize: 11, fontFamily: T.sans, cursor: "pointer" }}>Abrir</button>
            <button style={{ flex: 1, background: "transparent", border: "1px solid rgba(237,235,230,0.08)", borderRadius: 7, padding: "7px 0", color: "rgba(237,235,230,0.35)", fontSize: 11, fontFamily: T.sans, cursor: "pointer" }}>Compartir</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NotificacionUrgente ───────────────────────────────────────────────────────

export function NotificacionUrgente() {
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const off1 = agenteBus.on("notificacion_urgente", (p) => setData(p));
    const off2 = agenteBus.on("cerrar_todo", () => {
      if (ref.current) anime({ targets: ref.current, opacity: 0, translateY: -20, duration: 260, easing: "easeInQuart", complete: () => setData(null) });
      else setData(null);
    });
    return () => { off1(); off2(); };
  }, []);

  useEffect(() => {
    if (!data || !ref.current) return;
    anime.timeline()
      .add({ targets: ref.current, opacity: [0, 1], translateY: [-24, 2], duration: 380, easing: "easeOutQuart" })
      .add({ targets: ref.current, translateY: [2, -2, 0], duration: 300, easing: "easeOutElastic(1, 0.4)" });
  }, [data]);

  if (!data) return null;

  function cerrar() {
    anime({ targets: ref.current, opacity: 0, translateY: -20, duration: 280, easing: "easeInQuart", complete: () => setData(null) });
  }

  return (
    <div ref={ref} style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 700, opacity: 0 }}>
      <div style={{
        background: "rgba(9,11,13,0.97)",
        border: `1px solid ${T.amaranto}44`, borderTop: `2px solid ${T.amaranto}`,
        borderRadius: 12, padding: "12px 18px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: `0 4px 32px rgba(139,58,82,0.3), 0 0 40px ${T.amaranto}08`,
        backdropFilter: "blur(16px)", minWidth: 300,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.amaranto, flexShrink: 0, boxShadow: `0 0 8px ${T.amaranto}` }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: `${T.amaranto}88`, letterSpacing: "1.5px", fontFamily: T.mono, marginBottom: 3 }}>TONA · URGENTE</div>
          <div style={{ fontSize: 13, color: "rgba(237,235,230,0.85)", fontWeight: 300 }}>{data.mensaje}</div>
        </div>
        <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}