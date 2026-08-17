import { useEffect, useState, useRef } from "react";
import anime from "animejs";
import { T } from "../tokens";
import { agenteBus } from "./AgenteTona";

const API = import.meta.env.VITE_API_URL;
const TABS = ["perfil", "servicios", "sitios", "cuenta"];

export default function PanelConfiguracion({ userId, onCerrar }) {
  const [config, setConfig] = useState(null);
  const [tab, setTab] = useState("perfil");
  const [guardando, setGuardando] = useState(false);

  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const yaAnimado = useRef(false);

  useEffect(() => { cargarPerfil(); }, []);
  useEffect(() => { const off = agenteBus.on("abrir_configuracion", cargarPerfil); return () => off(); }, []);

  useEffect(() => {
    if (!config || !panelRef.current || yaAnimado.current) return;
    yaAnimado.current = true;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 250, easing: "easeOutQuart" });
    anime({ targets: panelRef.current, opacity: [0, 1], translateX: [40, 0], duration: 380, easing: "easeOutQuart" });
  }, [config]);

  async function fetchSeguro(url, opts) {
    try {
      const r = await fetch(url, { credentials: "include", ...opts });
      if (!r.ok) { console.error(`Error ${r.status} en ${url}`); return null; }
      return await r.json();
    } catch (e) {
      console.error(`Fallo de red en ${url}:`, e);
      return null;
    }
  }

  async function cargarPerfil() {
    const rc = await fetchSeguro(`${API}/agent/config`);
    setConfig(rc || { nombre_agente: "Tona", tono: "neutral", nombre_usuario: "" });
    if (!rc) agenteBus.emit("flash", { mensaje: "No se pudo cargar tu configuración", tipo: "error" });
  }

  async function guardar() {
    setGuardando(true);
    try {
      await fetch(`${API}/agent/config`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      agenteBus.emit("flash", { mensaje: "Configuración guardada", tipo: "exito" });
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error guardando configuración", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  function cerrar() {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: panelRef.current, opacity: 0, translateX: 40, duration: 280, complete: onCerrar }, "-=100");
  }

  if (!config) return null;

  return (
    <div ref={overlayRef} style={s.overlay}>
      <div ref={panelRef} style={s.panel}>
        <div style={s.header}>
          <div>
            <div style={s.headerLabel}>CONFIGURACIÓN</div>
            <div style={s.headerTitulo}>{config.nombre_agente || "Tona"}</div>
          </div>
          <button onClick={cerrar} style={s.btnCerrarX}>✕</button>
        </div>

        <div style={s.tabsWrap}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...s.tabBtn,
                borderBottom: tab === t ? `2px solid ${T.copal}` : "2px solid transparent",
                color: tab === t ? T.copal : "rgba(237,235,230,0.3)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={s.contenido}>
          {tab === "perfil" && (
            <TabPerfil config={config} setConfig={setConfig} guardar={guardar} guardando={guardando} />
          )}
          {tab === "servicios" && <TabServicios userId={userId} />}
          {tab === "sitios" && <TabSitios userId={userId} />}
          {tab === "cuenta" && <TabCuenta userId={userId} />}
        </div>
      </div>
    </div>
  );
}

function TabPerfil({ config, setConfig, guardar, guardando }) {
  const TONO_OPCIONES = [
    { valor: "amigable", label: "Amigable" },
    { valor: "neutral", label: "Neutral" },
    { valor: "formal", label: "Formal" },
  ];

  return (
    <div>
      <Campo
        label="CÓMO TE LLAMA TONA"
        value={config.nombre_usuario || ""}
        onChange={(v) => setConfig({ ...config, nombre_usuario: v })}
        placeholder="Tu nombre preferido"
      />
      <Campo
        label="NOMBRE DEL AGENTE"
        value={config.nombre_agente || "Tona"}
        onChange={(v) => setConfig({ ...config, nombre_agente: v })}
        placeholder="Tona"
      />
      <div style={{ marginBottom: 20 }}>
        <div style={s.labelChico}>TONO DE COMUNICACIÓN</div>
        <div style={{ display: "flex", gap: 8 }}>
          {TONO_OPCIONES.map((op) => (
            <button
              key={op.valor}
              onClick={() => setConfig({ ...config, tono: op.valor })}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8,
                background: config.tono === op.valor ? `${T.copal}25` : `${T.copal}08`,
                border: `1px solid ${T.copal}${config.tono === op.valor ? "55" : "20"}`,
                color: T.copal, fontSize: 11, fontFamily: T.sans, cursor: "pointer",
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={guardar} disabled={guardando} style={s.btnGuardar(guardando)}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

function TabServicios({ userId }) {
  const [expandido, setExpandido] = useState(null);

  function toggle(id) {
    setExpandido((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      <div style={s.labelChico}>SERVICIOS EXTRA</div>
      <div style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", marginBottom: 16, fontFamily: T.sans, lineHeight: 1.5 }}>
        Conecta tus herramientas favoritas y elige qué mostrar en tu vista de Tona.
      </div>

      <ServicioCardNotion
        userId={userId}
        expandido={expandido === "notion"}
        onToggle={() => toggle("notion")}
      />

      <ServicioCardClassroom
        userId={userId}
        expandido={expandido === "classroom"}
        onToggle={() => toggle("classroom")}
      />
    </div>
  );
}

function ServicioCard({ icono, nombre, descripcion, estadoTexto, estadoColor, expandido, onToggle, children }) {
  return (
    <div style={{ ...s.cardServicio, marginBottom: 10 }}>
      <button onClick={onToggle} style={s.filaServicio}>
        <img
          src={icono}
          alt={nombre}
          style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", flexShrink: 0 }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ fontSize: 13, color: "rgba(237,235,230,0.85)", fontFamily: T.sans }}>{nombre}</div>
          <div style={{ fontSize: 10.5, color: "rgba(237,235,230,0.3)", fontFamily: T.sans, marginTop: 2 }}>
            {descripcion}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {estadoTexto && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: estadoColor, fontFamily: T.sans }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: estadoColor }} />
              {estadoTexto}
            </span>
          )}
          <span style={{ color: "rgba(237,235,230,0.25)", fontSize: 12, transform: expandido ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }}>
            ›
          </span>
        </div>
      </button>
      {expandido && <div style={s.expandido}>{children}</div>}
    </div>
  );
}

function ServicioCardNotion({ userId, expandido, onToggle }) {
  const [conectado, setConectado] = useState(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [ancladas, setAncladas] = useState([]);
  const [arbol, setArbol] = useState([]);
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const cargadoRef = useRef(false);

  useEffect(() => {
    if (!expandido || cargadoRef.current) return;
    cargadoRef.current = true;
    cargarTodo();
  }, [expandido]);

  async function cargarTodo() {
    try {
      const rEstado = await fetch(`${API}/notion/estado`, { credentials: "include" }).then((r) => r.json());
      setConectado(rEstado.conectado);
      setWorkspaceName(rEstado.workspace_name || "");
      if (rEstado.conectado) {
        const [rAncladas, rArbol] = await Promise.all([
          fetch(`${API}/notion/ancladas`, { credentials: "include" }).then((r) => r.json()),
          fetch(`${API}/notion/arbol`, { credentials: "include" }).then((r) => r.json()),
        ]);
        setAncladas(rAncladas.paginas || []);
        setArbol(rArbol.paginas || []);
      }
    } catch (e) {
      console.error("Error cargando Notion:", e);
    }
  }

  async function conectar() {
    try {
      const resp = await fetch(`${API}/notion/conectar`, { credentials: "include" });
      const data = await resp.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "No se pudo iniciar la conexión con Notion", tipo: "error" });
    }
  }

  async function desconectar() {
    try {
      await fetch(`${API}/notion/desconectar`, { method: "DELETE", credentials: "include" });
      setConectado(false);
      setAncladas([]);
      agenteBus.emit("flash", { mensaje: "Notion desconectado", tipo: "info" });
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error al desconectar", tipo: "error" });
    }
  }

  async function sincronizar() {
    setSincronizando(true);
    try {
      const resp = await fetch(`${API}/notion/sincronizar`, { method: "POST", credentials: "include" });
      const data = await resp.json();
      agenteBus.emit("flash", { mensaje: `Sincronizado: ${data.total_paginas} páginas`, tipo: "exito" });
      const rArbol = await fetch(`${API}/notion/arbol`, { credentials: "include" }).then((r) => r.json());
      setArbol(rArbol.paginas || []);
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error sincronizando con Notion", tipo: "error" });
    } finally {
      setSincronizando(false);
    }
  }

  async function anclar(pageId) {
    try {
      await fetch(`${API}/notion/anclar`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });
      const rAncladas = await fetch(`${API}/notion/ancladas`, { credentials: "include" }).then((r) => r.json());
      setAncladas(rAncladas.paginas || []);
      setMostrarPicker(false);
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error enlazando página", tipo: "error" });
    }
  }

  async function desanclar(pageId) {
    try {
      await fetch(`${API}/notion/anclar/${pageId}`, { method: "DELETE", credentials: "include" });
      setAncladas((prev) => prev.filter((a) => a.page_id !== pageId && a.parent_id !== pageId));
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error quitando página", tipo: "error" });
    }
  }

  const paginasPrincipales = ancladas.filter((a) => !a.es_auto);
  const idsAnclados = new Set(ancladas.map((a) => a.page_id));
  const disponibles = arbol.filter((p) => p.tipo === "page" && !idsAnclados.has(p.page_id));

  return (
    <ServicioCard
      icono="/icons/notion.png"
      nombre="Notion"
      descripcion="Conecta tus espacios, páginas y bases de datos."
      estadoTexto={conectado === null ? null : conectado ? "Conectado" : "No conectado"}
      estadoColor={conectado ? T.jade : "rgba(237,235,230,0.3)"}
      expandido={expandido}
      onToggle={onToggle}
    >
      {conectado === null && <div style={s.textoMuted}>Cargando...</div>}

      {conectado === false && (
        <button onClick={conectar} style={s.btnGuardar(false)}>Conectar con Notion</button>
      )}

      {conectado === true && (
        <div>
          <div style={{ fontSize: 10.5, color: "rgba(237,235,230,0.3)", fontFamily: T.mono, marginBottom: 12 }}>
            {workspaceName || "Workspace conectado"}
          </div>

          {paginasPrincipales.length === 0 && (
            <div style={{ ...s.textoMuted, marginBottom: 10 }}>Aún no has enlazado ninguna página.</div>
          )}

          {paginasPrincipales.map((pg) => {
            const hijas = ancladas.filter((a) => a.es_auto && a.parent_id === pg.page_id);
            return (
              <div key={pg.page_id} style={s.filaAnclada}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(237,235,230,0.75)", fontFamily: T.sans }}>{pg.titulo}</div>
                  {hijas.map((h) => (
                    <div key={h.page_id} style={{ fontSize: 10.5, color: `${T.jade}aa`, fontFamily: T.mono, marginTop: 3 }}>
                      ↳ {h.titulo} (base de datos)
                    </div>
                  ))}
                </div>
                <button onClick={() => desanclar(pg.page_id)} style={s.btnQuitarChico}>quitar</button>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setMostrarPicker((p) => !p)} style={s.btnSecundarioChico}>
              + Enlazar página
            </button>
            <button onClick={sincronizar} disabled={sincronizando} style={s.btnSecundarioChico}>
              {sincronizando ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>

          {mostrarPicker && (
            <div style={{ marginTop: 10, borderTop: "1px solid rgba(237,235,230,0.06)", paddingTop: 10 }}>
              {disponibles.length === 0 && (
                <div style={s.textoMuted}>No hay páginas nuevas. Sincroniza si acabas de compartir una.</div>
              )}
              {disponibles.map((p) => (
                <button key={p.page_id} onClick={() => anclar(p.page_id)} style={s.filaPicker}>
                  {p.titulo}
                </button>
              ))}
            </div>
          )}

          <button onClick={desconectar} style={{ ...s.btnDesconectar, marginTop: 14 }}>Desconectar</button>
        </div>
      )}
    </ServicioCard>
  );
}

function ServicioCardClassroom({ userId, expandido, onToggle }) {
  const [cursos, setCursos] = useState([]);
  const [carpetas, setCarpetas] = useState([]);
  const [creandoCarpetaId, setCreandoCarpetaId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const cargadoRef = useRef(false);

  useEffect(() => {
    if (!expandido || cargadoRef.current) return;
    cargadoRef.current = true;
    cargar();
  }, [expandido]);

  async function cargar() {
    setCargando(true);
    try {
      const [rCursos, rCarpetas] = await Promise.all([
        fetch(`${API}/tasks/cursos`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/tasks/drive/clases`, { credentials: "include" }).then((r) => r.json()),
      ]);
      setCursos(rCursos.cursos || []);
      setCarpetas(rCarpetas.clases || []);
    } catch (e) {
      console.error("Error cargando Classroom:", e);
    } finally {
      setCargando(false);
    }
  }

  async function crearCarpeta(curso) {
    setCreandoCarpetaId(curso.id);
    try {
      const resp = await fetch(`${API}/tasks/drive/estructura`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursos: [{ curso_id: curso.id, nombre: curso.nombre }] }),
      });
      if (resp.ok) {
        await cargar();
        agenteBus.emit("flash", { mensaje: `Carpeta creada para ${curso.nombre}`, tipo: "exito" });
      } else {
        agenteBus.emit("flash", { mensaje: "No se pudo crear la carpeta", tipo: "error" });
      }
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error de conexión", tipo: "error" });
    } finally {
      setCreandoCarpetaId(null);
    }
  }

  async function quitarCarpeta(cursoId, nombre) {
    try {
      await fetch(`${API}/tasks/drive/carpeta/${cursoId}`, { method: "DELETE", credentials: "include" });
      setCarpetas((prev) => prev.filter((c) => c.curso_id !== cursoId));
      agenteBus.emit("flash", { mensaje: `Carpeta de ${nombre} desvinculada`, tipo: "info" });
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error al desvincular", tipo: "error" });
    }
  }

  return (
    <ServicioCard
      icono="/icons/classroom.png"
      nombre="Google Classroom"
      descripcion="Carpetas organizadas de Drive por materia."
      estadoTexto="Conectado"
      estadoColor={T.jade}
      expandido={expandido}
      onToggle={onToggle}
    >
      {cargando && <div style={s.textoMuted}>Cargando cursos...</div>}
      {!cargando && cursos.length === 0 && (
        <div style={s.textoMuted}>No encontré clases activas en tu Classroom.</div>
      )}
      {cursos.map((curso) => {
        const vinculada = carpetas.find((c) => c.curso_id === curso.id);
        const creando = creandoCarpetaId === curso.id;
        return (
          <div key={curso.id} style={s.filaAnclada}>
            <span style={{ fontSize: 12, color: "rgba(237,235,230,0.75)", fontFamily: T.sans, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {curso.nombre}
            </span>
            {vinculada ? (
              <button onClick={() => quitarCarpeta(curso.id, curso.nombre)} style={s.btnQuitarChico}>quitar</button>
            ) : (
              <button onClick={() => crearCarpeta(curso)} disabled={creando} style={s.btnSecundarioChico}>
                {creando ? "creando..." : "crear carpeta"}
              </button>
            )}
          </div>
        );
      })}
    </ServicioCard>
  );
}

function TabSitios({ userId }) {
  const [sitios, setSitios] = useState([]);
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [nuevoAlias, setNuevoAlias] = useState("");
  const [nuevaPeriodo, setNuevaPeriodo] = useState("semanal");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    try {
      const r = await fetch(`${API}/tasks/sitios`, { credentials: "include" }).then((r) => r.json());
      setSitios(r.sitios || []);
    } catch (e) {
      setSitios([]);
    }
  }

  async function agregarSitio() {
    if (!nuevaUrl.trim() || !nuevoAlias.trim()) return;
    try {
      const resp = await fetch(`${API}/tasks/sitios`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nuevaUrl.trim(), alias: nuevoAlias.trim(), frecuencia: nuevaPeriodo }),
      });
      if (resp.ok) {
        setNuevaUrl(""); setNuevoAlias(""); setNuevaPeriodo("semanal");
        await cargar();
        agenteBus.emit("flash", { mensaje: "Sitio agregado", tipo: "exito" });
      }
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error agregando sitio", tipo: "error" });
    }
  }

  async function eliminarSitio(id) {
    try {
      await fetch(`${API}/tasks/sitios/${id}`, { method: "DELETE", credentials: "include" });
      setSitios((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error eliminando sitio", tipo: "error" });
    }
  }

  async function revisarSitioAhora(id) {
    agenteBus.emit("flash", { mensaje: "Revisando sitio...", tipo: "info" });
    try {
      const resp = await fetch(`${API}/tasks/sitios/${id}/revisar`, { method: "POST", credentials: "include" });
      const data = await resp.json();
      agenteBus.emit("flash", {
        mensaje: data.cambio ? `Cambio detectado: ${data.resumen?.slice(0, 60)}` : "Sin cambios desde la última revisión",
        tipo: data.cambio ? "urgente" : "info",
      });
      await cargar();
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error al revisar", tipo: "error" });
    }
  }

  return (
    <div>
      <div style={s.labelChico}>SITIOS MONITOREADOS</div>
      {sitios.length === 0 && <div style={{ ...s.textoMuted, textAlign: "center", padding: "20px 0" }}>No hay sitios configurados</div>}
      {sitios.map((st) => (
        <div key={st.id} style={{ background: "rgba(237,235,230,0.03)", border: `1px solid ${T.copal}15`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, color: "rgba(237,235,230,0.75)", fontFamily: T.sans }}>{st.alias}</div>
              <div style={{ fontSize: 10, color: "rgba(237,235,230,0.25)", fontFamily: T.mono, marginTop: 2 }}>
                {st.url.length > 40 ? st.url.slice(0, 40) + "…" : st.url}
              </div>
            </div>
            <button onClick={() => eliminarSitio(st.id)} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, cursor: "pointer", fontSize: 12 }}>✕</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: `${T.copal}66`, fontFamily: T.mono }}>
              {st.frecuencia} · {st.ultima_revision ? `última: ${st.ultima_revision.slice(0, 10)}` : "sin revisar"}
            </div>
            <button onClick={() => revisarSitioAhora(st.id)} style={{ background: `${T.turquesa}12`, border: `1px solid ${T.turquesa}25`, borderRadius: 6, padding: "4px 10px", color: T.turquesa, fontSize: 10, fontFamily: T.mono, cursor: "pointer" }}>
              revisar ahora
            </button>
          </div>
          {st.ultimo_resumen && (
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, lineHeight: 1.5 }}>
              {st.ultimo_resumen}
            </div>
          )}
        </div>
      ))}
      <div style={{ marginTop: 16, padding: 16, background: `${T.copal}05`, border: `1px dashed ${T.copal}20`, borderRadius: 10 }}>
        <div style={{ fontSize: 9, color: `${T.copal}55`, letterSpacing: "1px", marginBottom: 12, fontFamily: T.mono }}>AGREGAR SITIO</div>
        <input value={nuevaUrl} onChange={(e) => setNuevaUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, marginBottom: 8 }} />
        <input value={nuevoAlias} onChange={(e) => setNuevoAlias(e.target.value)} placeholder="Nombre descriptivo" style={{ ...inputStyle, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["diaria", "semanal", "quincenal"].map((f) => (
            <button key={f} onClick={() => setNuevaPeriodo(f)} style={{
              flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 10, fontFamily: T.sans, cursor: "pointer",
              background: nuevaPeriodo === f ? `${T.turquesa}25` : `${T.turquesa}08`,
              border: `1px solid ${T.turquesa}${nuevaPeriodo === f ? "55" : "18"}`, color: T.turquesa,
            }}>{f}</button>
          ))}
        </div>
        <button onClick={agregarSitio} style={{ width: "100%", background: `${T.jade}12`, border: `1px solid ${T.jade}30`, borderRadius: 8, padding: 9, color: T.jade, fontSize: 12, fontFamily: T.sans, cursor: "pointer" }}>
          + Agregar
        </button>
      </div>
    </div>
  );
}

function TabCuenta({ userId }) {
  const [confirmando, setConfirmando] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);

  async function eliminarCuenta() {
    setEliminando(true);
    try {
      const resp = await fetch(`${API}/account`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "No se pudo eliminar la cuenta");
      }
      // Cuenta borrada y sesión cerrada del lado del servidor
      window.location.href = "/";
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error eliminando cuenta: " + e.message, tipo: "error" });
      setEliminando(false);
    }
  }

  const confirmacionValida = textoConfirmacion.trim().toUpperCase() === "ELIMINAR";

  return (
    <div>
      <div style={s.labelChico}>CUENTA</div>

      {!confirmando && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", marginBottom: 16, fontFamily: T.sans, lineHeight: 1.5 }}>
            Eliminar tu cuenta borra permanentemente tus tareas, horario, notas, conexiones (Notion, Classroom),
            historial de chat y toda la demás información asociada a tu perfil en Tona. Esta acción no se puede deshacer.
          </div>
          <button onClick={() => setConfirmando(true)} style={s.btnDesconectar}>
            Eliminar mi cuenta
          </button>
        </div>
      )}

      {confirmando && (
        <div style={{
          background: `${T.amaranto}08`, border: `1px solid ${T.amaranto}30`,
          borderRadius: 10, padding: 16,
        }}>
          <div style={{ fontSize: 12.5, color: "rgba(237,235,230,0.75)", fontFamily: T.sans, marginBottom: 12, lineHeight: 1.5 }}>
            Esta acción es irreversible. Se eliminarán todos tus datos de Tona de forma permanente.
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, marginBottom: 8 }}>
            Escribe <strong>ELIMINAR</strong> para confirmar:
          </div>
          <input
            value={textoConfirmacion}
            onChange={(e) => setTextoConfirmacion(e.target.value)}
            placeholder="ELIMINAR"
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setConfirmando(false); setTextoConfirmacion(""); }}
              style={s.btnSecundarioChico}
              disabled={eliminando}
            >
              Cancelar
            </button>
            <button
              onClick={eliminarCuenta}
              disabled={!confirmacionValida || eliminando}
              style={{
                flex: 1, background: `${T.amaranto}18`, border: `1px solid ${T.amaranto}55`,
                borderRadius: 7, padding: "8px 0", color: T.amaranto, fontSize: 11.5,
                fontFamily: T.sans, cursor: confirmacionValida && !eliminando ? "pointer" : "not-allowed",
                opacity: confirmacionValida && !eliminando ? 1 : 0.4,
              }}
            >
              {eliminando ? "Eliminando..." : "Sí, eliminar todo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={s.labelChico}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

const inputStyle = {
  width: "100%", background: "rgba(237,235,230,0.03)",
  border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8,
  padding: "10px 14px", color: "rgba(237,235,230,0.75)",
  fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 300,
  outline: "none", boxSizing: "border-box",
};

const s = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 800,
    background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
    display: "flex", justifyContent: "flex-end", opacity: 0,
  },
  panel: {
    width: "min(420px, 92vw)", height: "100%",
    background: "rgba(9,11,13,0.98)",
    borderLeft: `1px solid ${T.copal}22`,
    display: "flex", flexDirection: "column", opacity: 0,
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px", borderBottom: `1px solid ${T.copal}15`,
  },
  headerLabel: { fontSize: 9, color: `${T.copal}66`, letterSpacing: "2px", fontFamily: T.mono },
  headerTitulo: { fontSize: 16, color: "rgba(237,235,230,0.75)", fontFamily: T.serif, marginTop: 4 },
  btnCerrarX: { background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 18, cursor: "pointer" },
  tabsWrap: { display: "flex", borderBottom: `1px solid ${T.copal}12`, padding: "0 24px" },
  tabBtn: {
    background: "transparent", border: "none", padding: "12px 16px 10px", marginBottom: -1,
    fontSize: 11, fontFamily: T.mono, cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase",
  },
  contenido: { flex: 1, overflow: "auto", padding: 24 },
  labelChico: { fontSize: 9, color: "rgba(237,235,230,0.25)", letterSpacing: "1px", marginBottom: 10, fontFamily: T.mono },
  btnGuardar: (activo) => ({
    width: "100%", background: `${T.jade}18`, border: `1px solid ${T.jade}45`, borderRadius: 10,
    padding: 12, color: T.jade, fontSize: 13, fontFamily: T.sans,
    cursor: activo ? "wait" : "pointer", opacity: activo ? 0.6 : 1,
  }),
  cardServicio: {
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)", borderRadius: 12,
  },
  filaServicio: {
    width: "100%", display: "flex", alignItems: "center", gap: 12,
    background: "transparent", border: "none", padding: "14px 14px", cursor: "pointer",
  },
  expandido: { padding: "0 14px 16px", borderTop: "1px solid rgba(237,235,230,0.05)", paddingTop: 12 },
  filaAnclada: {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
    borderBottom: "1px solid rgba(237,235,230,0.05)",
  },
  btnQuitarChico: {
    background: "transparent", border: `1px solid ${T.amaranto}30`, borderRadius: 6,
    padding: "4px 9px", color: `${T.amaranto}aa`, fontSize: 10, fontFamily: T.mono, cursor: "pointer", flexShrink: 0,
  },
  btnSecundarioChico: {
    background: `${T.turquesa}10`, border: `1px solid ${T.turquesa}28`, borderRadius: 7,
    padding: "6px 11px", color: T.turquesa, fontSize: 10.5, fontFamily: T.sans, cursor: "pointer",
  },
  btnDesconectar: {
    width: "100%", background: "transparent", border: `1px solid ${T.amaranto}30`, borderRadius: 8,
    padding: 9, color: `${T.amaranto}aa`, fontSize: 11.5, fontFamily: T.sans, cursor: "pointer",
  },
  filaPicker: {
    width: "100%", display: "block", textAlign: "left", background: "transparent", border: "none",
    padding: "7px 4px", color: "rgba(237,235,230,0.7)", fontSize: 12, fontFamily: T.sans, cursor: "pointer",
  },
  textoMuted: { fontSize: 11.5, color: "rgba(237,235,230,0.3)", fontFamily: T.sans },
};