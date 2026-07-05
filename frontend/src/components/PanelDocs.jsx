import { useState, useEffect, useRef, useCallback } from "react";
import anime from "animejs";
import { T } from "../tokens";
import { agenteBus } from "./AgenteTona";

const API = import.meta.env.VITE_API_URL;

export default function PanelDocs({ userId, onCerrar }) {
  const [vista,        setVista]        = useState("lista");   // lista | editor
  const [docs,         setDocs]         = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [docActual,    setDocActual]    = useState(null);
  const [contenido,    setContenido]    = useState("");
  const [titulo,       setTitulo]       = useState("");
  const [guardando,    setGuardando]    = useState(false);
  const [sugerencia,   setSugerencia]   = useState("");
  const [cargSuger,    setCargSuger]    = useState(false);
  const [tipoSuger,    setTipoSuger]    = useState("continuar");
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [nuevoTitulo,  setNuevoTitulo]  = useState("");

  const ref        = useRef(null);
  const overlayRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Animación de entrada ──────────────────────────────────────────────────
  useEffect(() => {
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 250, easing: "easeOutQuart" });
    anime.timeline({ easing: "easeOutQuart" })
      .add({ targets: ref.current, opacity: [0, 1], translateX: [60, 0], duration: 350 });
  }, []);

  const cerrar = useCallback(() => {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, translateX: 40, duration: 280, complete: onCerrar }, "-=150");
  }, [onCerrar]);

  useEffect(() => {
    return agenteBus.on("cerrar_todo", cerrar);
  }, [cerrar]);

  // ── Cargar lista de docs ──────────────────────────────────────────────────
  useEffect(() => {
    cargarDocs();
  }, []);

  async function cargarDocs() {
    setCargando(true);
    try {
      const resp = await fetch(`${API}/docs/lista/${userId}`);
      if (resp.ok) {
        const data = await resp.json();
        setDocs(data.docs || []);
      }
    } catch (e) {
      console.error("Error cargando docs:", e);
    } finally {
      setCargando(false);
    }
  }

  // ── Abrir doc existente ───────────────────────────────────────────────────
  async function abrirDoc(doc) {
    if (!doc || !doc.id) {
      console.error("Documento inválido:", doc);
      return;
    }
    
    setDocActual({ id: doc.id, titulo: doc.titulo, link: doc.link });
    setTitulo(doc.titulo);
    setContenido("Cargando...");
    setVista("editor");
    setSugerencia("");
    try {
      const resp = await fetch(`${API}/docs/contenido/${userId}/${doc.id}`);
      if (resp.ok) {
        const data = await resp.json();
        setContenido(data.contenido || "");
      } else {
        setContenido("");
        console.error("Error cargando contenido:", resp.status);
      }
    } catch (e) {
      setContenido("");
      console.error("Error abriendo doc:", e);
    }
  }

  // ── Crear doc nuevo ───────────────────────────────────────────────────────
  async function crearDoc() {
    if (!nuevoTitulo.trim()) return;
    setCreandoNuevo(false);
    setDocActual(null);
    setTitulo(nuevoTitulo.trim());
    setContenido("");
    setVista("editor");
    setSugerencia("");
    setNuevoTitulo("");
    
    setTimeout(() => {
      guardarDocConTitulo(nuevoTitulo.trim());
    }, 300);
  }

  // ── Guardar documento con título (para creación desde chat) ──────────────
  async function guardarDocConTitulo(titulo) {
    if (!titulo.trim() || guardando) return;
    setGuardando(true);
    try {
      const resp = await fetch(`${API}/docs/crear/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, contenido: "" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDocActual({ id: data.doc_id, titulo, link: data.link });
        agenteBus.emit("flash", { mensaje: `Documento "${titulo}" creado.`, tipo: "exito" });
        cargarDocs();
      } else {
        const error = await resp.json();
        agenteBus.emit("flash", { mensaje: `Error al crear: ${error.detail}`, tipo: "error" });
      }
    } catch (e) {
      agenteBus.emit("flash", { mensaje: "Error de conexión.", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  // ── Guardar doc ───────────────────────────────────────────────────────────
  async function guardarDoc() {
    if (!contenido.trim() || guardando) return;
    
    console.log("📝 Contenido a guardar:", contenido);
    console.log("📝 docActual:", docActual);
    
    const tituloFinal = titulo.trim() || "Sin título";
    
    setGuardando(true);
    try {
      if (docActual && docActual.id) {
        // ✅ ACTUALIZAR DOCUMENTO EXISTENTE
        console.log(`📝 Actualizando documento existente: ${docActual.id} - ${tituloFinal}`);
        
        const resp = await fetch(`${API}/docs/actualizar/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            doc_id: docActual.id, 
            contenido: contenido 
          }),
        });
        
        if (resp.ok) {
          agenteBus.emit("flash", { mensaje: "Documento guardado.", tipo: "exito" });
          cargarDocs();
        } else {
          const error = await resp.json();
          console.error("Error al guardar:", error);
          agenteBus.emit("flash", { mensaje: `Error al guardar: ${error.detail || "Error desconocido"}`, tipo: "error" });
        }
      } else {
        // ✅ CREAR DOCUMENTO NUEVO
        console.log(`📝 Creando nuevo documento: ${tituloFinal}`);
        
        const resp = await fetch(`${API}/docs/crear/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            titulo: tituloFinal, 
            contenido: contenido 
          }),
        });
        
        if (resp.ok) {
          const data = await resp.json();
          setDocActual({ 
            id: data.doc_id, 
            titulo: tituloFinal, 
            link: data.link 
          });
          agenteBus.emit("flash", { mensaje: "Documento creado en Drive.", tipo: "exito" });
          cargarDocs();
        } else {
          const error = await resp.json();
          console.error("Error al crear:", error);
          agenteBus.emit("flash", { mensaje: `Error al crear: ${error.detail || "Error desconocido"}`, tipo: "error" });
        }
      }
    } catch (e) {
      console.error("Error de conexión:", e);
      agenteBus.emit("flash", { mensaje: "Error de conexión al guardar.", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  // ── Eliminar documento ──────────────────────────────────────────────────────
  async function eliminarDoc(docId, docTitulo, e) {
    e.stopPropagation();
    
    if (!docId) return;
    
    const confirmar = window.confirm(`¿Estás seguro de que quieres eliminar "${docTitulo}"?`);
    if (!confirmar) return;
    
    try {
      const resp = await fetch(`${API}/docs/eliminar/${userId}/${docId}`, {
        method: "DELETE",
      });
      
      if (resp.ok) {
        agenteBus.emit("flash", { 
          mensaje: `Documento "${docTitulo}" eliminado.`, 
          tipo: "exito" 
        });
        cargarDocs();
      } else {
        const error = await resp.json();
        agenteBus.emit("flash", { 
          mensaje: `Error al eliminar: ${error.detail || "Error desconocido"}`, 
          tipo: "error" 
        });
      }
    } catch (e) {
      console.error("Error eliminando:", e);
      agenteBus.emit("flash", { 
        mensaje: "Error de conexión al eliminar.", 
        tipo: "error" 
      });
    }
  }

  // ── Exportar como .docx ───────────────────────────────────────────────────
  function exportarDocx() {
    if (!docActual) return;
    window.open(`${API}/docs/exportar/${userId}/${docActual.id}`, "_blank");
  }

  // ── Sugerencias de IA ─────────────────────────────────────────────────────
  async function pedirSugerencia() {
    if (cargSuger) return;
    setCargSuger(true);
    setSugerencia("");
    try {
      const resp = await fetch(`${API}/docs/sugerir/${userId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          doc_id:           docActual?.id || null,
          titulo:           titulo,
          contenido_actual: contenido,
          tipo:             tipoSuger,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSugerencia(data.sugerencia);
      }
    } catch (e) {
      console.error("Error obteniendo sugerencia:", e);
    } finally {
      setCargSuger(false);
    }
  }

  function insertarSugerencia() {
    if (!sugerencia) return;
    const cursor = textareaRef.current?.selectionStart ?? contenido.length;
    const nuevoContenido = contenido.slice(0, cursor) + sugerencia + contenido.slice(cursor);
    setContenido(nuevoContenido);
    setSugerencia("");
  }

  // ── Eventos desde el agente ──────────────────────────────────────────────
  useEffect(() => {
    return agenteBus.on("panel_docs_crear_con_titulo", ({ titulo }) => {
      setVista("editor");
      setDocActual(null);
      setTitulo(titulo);
      setContenido("");
      setSugerencia("");
      setTimeout(() => {
        guardarDocConTitulo(titulo);
      }, 300);
    });
  }, []);

  useEffect(() => {
    return agenteBus.on("panel_docs_abrir_doc", async ({ doc_id, titulo }) => {
      if (!doc_id) {
        console.error("❌ No se proporcionó doc_id");
        return;
      }
      
      console.log(`📂 Abriendo documento: ${titulo} (${doc_id})`);
      setVista("editor");
      setDocActual({ id: doc_id, titulo: titulo || "Sin título" });
      setTitulo(titulo || "Sin título");
      setContenido("Cargando...");
      
      try {
        const resp = await fetch(`${API}/docs/contenido/${userId}/${doc_id}`);
        if (resp.ok) {
          const data = await resp.json();
          setContenido(data.contenido || "");
          console.log(`✅ Contenido cargado: ${data.contenido?.length || 0} caracteres`);
        } else {
          setContenido("");
          console.error("❌ Error cargando contenido:", resp.status);
        }
      } catch (e) {
        setContenido("");
        console.error("❌ Error abriendo doc:", e);
      }
    });
  }, [userId]);

  // ── Render lista ──────────────────────────────────────────────────────────
  const renderLista = () => (
    <div>
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        marginBottom:   16,
      }}>
        <span style={{ fontSize: 11, color: `${T.turquesa}88`, fontFamily: T.mono, letterSpacing: "1px" }}>
          {docs.length} DOCUMENTOS
        </span>
        <button
          onClick={() => setCreandoNuevo(true)}
          style={{
            background:    `${T.jade}15`,
            border:        `1px solid ${T.jade}35`,
            borderRadius:  8,
            padding:       "6px 14px",
            color:         T.jade,
            fontSize:      11,
            fontFamily:    T.mono,
            cursor:        "pointer",
            letterSpacing: "0.5px",
          }}
        >
          + nuevo doc
        </button>
      </div>

      {creandoNuevo && (
        <div style={{
          marginBottom:  14,
          background:    `${T.jade}08`,
          border:        `1px solid ${T.jade}22`,
          borderRadius:  10,
          padding:       "12px 14px",
        }}>
          <div style={{ fontSize: 9, color: `${T.jade}88`, letterSpacing: "1px", marginBottom: 8, fontFamily: T.mono }}>
            TÍTULO DEL DOCUMENTO
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") crearDoc(); if (e.key === "Escape") setCreandoNuevo(false); }}
              placeholder="Ej: Reporte de laboratorio"
              style={{
                flex:         1,
                background:   "rgba(237,235,230,0.04)",
                border:       `1px solid ${T.jade}30`,
                borderRadius: 6,
                padding:      "7px 10px",
                color:        "rgba(237,235,230,0.8)",
                fontSize:     12,
                fontFamily:   T.sans,
                outline:      "none",
              }}
            />
            <button onClick={crearDoc} style={{ background: `${T.jade}20`, border: `1px solid ${T.jade}40`, borderRadius: 6, padding: "7px 12px", color: T.jade, fontSize: 11, cursor: "pointer" }}>
              Crear
            </button>
            <button onClick={() => setCreandoNuevo(false)} style={{ background: "transparent", border: `1px solid rgba(237,235,230,0.1)`, borderRadius: 6, padding: "7px 10px", color: "rgba(237,235,230,0.3)", fontSize: 11, cursor: "pointer" }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {cargando && (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 12, color: "rgba(237,235,230,0.25)", fontFamily: T.mono }}>
          cargando documentos...
        </div>
      )}

      {!cargando && docs.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: 12, color: "rgba(237,235,230,0.25)" }}>
          No tienes documentos aún
        </div>
      )}

      {!cargando && docs.map((doc) => (
        <div
          key={doc.id}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          12,
            padding:      "10px 12px",
            borderRadius: 8,
            cursor:       "pointer",
            marginBottom: 4,
            border:       "1px solid transparent",
            transition:   "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${T.turquesa}08`;
            e.currentTarget.style.borderColor = `${T.turquesa}22`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <div
            onClick={() => abrirDoc(doc)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div style={{
              width:          32,
              height:         32,
              borderRadius:   6,
              background:     `${T.turquesa}15`,
              border:         `1px solid ${T.turquesa}25`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              fontSize:       10,
              color:          T.turquesa,
              fontFamily:     T.mono,
            }}>
              DOC
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "rgba(237,235,230,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.titulo}
              </div>
              <div style={{ fontSize: 10, color: "rgba(237,235,230,0.25)", marginTop: 2 }}>
                {doc.modificado}
              </div>
            </div>
          </div>
          
          <button
            onClick={(e) => eliminarDoc(doc.id, doc.titulo, e)}
            title={`Eliminar "${doc.titulo}"`}
            style={{
              background:   "transparent",
              border:       `1px solid ${T.amaranto}20`,
              borderRadius: 6,
              padding:      "4px 8px",
              color:        `${T.amaranto}55`,
              fontSize:     11,
              cursor:       "pointer",
              flexShrink:   0,
              opacity:      0.4,
              transition:   "all 0.2s ease",
              fontFamily:   T.sans,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = 1;
              e.currentTarget.style.borderColor = `${T.amaranto}60`;
              e.currentTarget.style.color = T.amaranto;
              e.currentTarget.style.background = `${T.amaranto}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = 0.4;
              e.currentTarget.style.borderColor = `${T.amaranto}20`;
              e.currentTarget.style.color = `${T.amaranto}55`;
              e.currentTarget.style.background = "transparent";
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  // ── Render editor ─────────────────────────────────────────────────────────
  const renderEditor = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display:        "flex",
        alignItems:     "center",
        gap:            8,
        marginBottom:   12,
        paddingBottom:  12,
        borderBottom:   `1px solid rgba(237,235,230,0.06)`,
        flexShrink:     0,
      }}>
        <button
          onClick={() => { setVista("lista"); setSugerencia(""); }}
          style={{
            background:   "transparent",
            border:       "none",
            color:        `${T.turquesa}66`,
            fontSize:     14,
            cursor:       "pointer",
            padding:      "0 4px",
            flexShrink:   0,
          }}
        >
          ‹
        </button>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={{
            flex:         1,
            background:   "transparent",
            border:       "none",
            outline:      "none",
            fontSize:     14,
            color:        "rgba(237,235,230,0.85)",
            fontFamily:   T.sans,
            fontWeight:   300,
          }}
          placeholder="Título del documento"
        />
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {docActual && (
            <button
              onClick={exportarDocx}
              title="Exportar como .docx"
              style={{
                background:    `${T.copal}12`,
                border:        `1px solid ${T.copal}30`,
                borderRadius:  6,
                padding:       "4px 10px",
                color:         T.copal,
                fontSize:      10,
                fontFamily:    T.mono,
                cursor:        "pointer",
                letterSpacing: "0.5px",
              }}
            >
              .docx
            </button>
          )}
          <button
            onClick={guardarDoc}
            disabled={guardando}
            style={{
              background:    guardando ? "transparent" : `${T.jade}15`,
              border:        `1px solid ${T.jade}${guardando ? "20" : "40"}`,
              borderRadius:  6,
              padding:       "4px 12px",
              color:         T.jade,
              fontSize:      10,
              fontFamily:    T.mono,
              cursor:        guardando ? "wait" : "pointer",
              opacity:       guardando ? 0.5 : 1,
              letterSpacing: "0.5px",
            }}
          >
            {guardando ? "guardando..." : "guardar"}
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder="Empieza a escribir... o pide una sugerencia a Tona ↓"
        style={{
          flex:         1,
          background:   "rgba(237,235,230,0.02)",
          border:       `1px solid rgba(237,235,230,0.06)`,
          borderRadius: 8,
          padding:      "14px",
          color:        "rgba(237,235,230,0.75)",
          fontSize:     13,
          fontFamily:   T.sans,
          fontWeight:   300,
          lineHeight:   1.7,
          outline:      "none",
          resize:       "none",
          boxSizing:    "border-box",
          width:        "100%",
          minHeight:    200,
        }}
      />

      <div style={{
        marginTop:    12,
        flexShrink:   0,
      }}>
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 9, color: `${T.copal}88`, letterSpacing: "1px", fontFamily: T.mono }}>
            TONA · SUGERENCIAS IA
          </span>
          <div style={{ flex: 1, height: 1, background: `${T.copal}18` }} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {[
            { key: "continuar",    label: "Continuar" },
            { key: "estructurar",  label: "Estructurar" },
            { key: "expandir",     label: "Expandir" },
            { key: "resumir",      label: "Resumir" },
            { key: "introduccion", label: "Introducción" },
            { key: "conclusion",   label: "Conclusión" },
          ].map((op) => (
            <button
              key={op.key}
              onClick={() => setTipoSuger(op.key)}
              style={{
                background:    tipoSuger === op.key ? `${T.copal}25` : `${T.copal}08`,
                border:        `1px solid ${T.copal}${tipoSuger === op.key ? "45" : "20"}`,
                borderRadius:  6,
                padding:       "4px 10px",
                color:         tipoSuger === op.key ? T.copal : `${T.copal}66`,
                fontSize:      10,
                fontFamily:    T.mono,
                cursor:        "pointer",
                letterSpacing: "0.3px",
                transition:    "all 0.15s",
              }}
            >
              {op.label}
            </button>
          ))}
          <button
            onClick={pedirSugerencia}
            disabled={cargSuger}
            style={{
              background:    cargSuger ? "transparent" : `${T.jade}12`,
              border:        `1px solid ${T.jade}${cargSuger ? "20" : "35"}`,
              borderRadius:  6,
              padding:       "4px 12px",
              color:         T.jade,
              fontSize:      10,
              fontFamily:    T.mono,
              cursor:        cargSuger ? "wait" : "pointer",
              opacity:       cargSuger ? 0.5 : 1,
              letterSpacing: "0.5px",
              marginLeft:    "auto",
            }}
          >
            {cargSuger ? "generando..." : "generar ↗"}
          </button>
        </div>

        {sugerencia && (
          <div style={{
            background:    `${T.copal}08`,
            border:        `1px solid ${T.copal}22`,
            borderLeft:    `3px solid ${T.copal}`,
            borderRadius:  8,
            padding:       "12px 14px",
            fontSize:      12,
            color:         "rgba(237,235,230,0.6)",
            lineHeight:    1.6,
            fontFamily:    T.sans,
            whiteSpace:    "pre-wrap",
            maxHeight:     140,
            overflowY:     "auto",
          }}>
            {sugerencia}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={insertarSugerencia}
                style={{
                  background:    `${T.jade}15`,
                  border:        `1px solid ${T.jade}35`,
                  borderRadius:  6,
                  padding:       "4px 12px",
                  color:         T.jade,
                  fontSize:      10,
                  fontFamily:    T.mono,
                  cursor:        "pointer",
                  letterSpacing: "0.5px",
                }}
              >
                insertar
              </button>
              <button
                onClick={() => setSugerencia("")}
                style={{
                  background:  "transparent",
                  border:      `1px solid rgba(237,235,230,0.08)`,
                  borderRadius: 6,
                  padding:     "4px 10px",
                  color:       "rgba(237,235,230,0.25)",
                  fontSize:    10,
                  fontFamily:  T.mono,
                  cursor:      "pointer",
                }}
              >
                descartar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div
      ref={overlayRef}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         500,
        display:        "flex",
        justifyContent: "flex-end",
        background:     "rgba(0,0,0,0.2)",
        backdropFilter: "blur(2px)",
        opacity:        0,
      }}
      onClick={(e) => { if (e.target === overlayRef.current) cerrar(); }}
    >
      <div
        ref={ref}
        style={{
          width:          440,
          height:         "100vh",
          background:     "rgba(9,11,13,0.97)",
          borderLeft:     `1px solid ${T.turquesa}22`,
          display:        "flex",
          flexDirection:  "column",
          opacity:        0,
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "18px 20px",
          borderBottom:   `1px solid ${T.turquesa}18`,
          flexShrink:     0,
        }}>
          <div>
            <div style={{ fontSize: 9, color: `${T.turquesa}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
              TONA · DOCUMENTOS
            </div>
            <div style={{ fontSize: 11, color: "rgba(237,235,230,0.35)", marginTop: 2, fontFamily: T.sans }}>
              Google Drive
            </div>
          </div>
          <button
            onClick={cerrar}
            style={{
              background: "transparent",
              border:     "none",
              color:      `${T.amaranto}55`,
              fontSize:   14,
              cursor:     "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          flex:      1,
          overflow:  "auto",
          padding:   "16px 20px",
          display:   "flex",
          flexDirection: "column",
        }}>
          {vista === "lista" ? renderLista() : renderEditor()}
        </div>

        <div style={{
          height:     1,
          background: `linear-gradient(90deg,transparent,${T.turquesa}33,transparent)`,
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
}