// PaginaNotion.jsx
import { useEffect, useState } from "react";
import { FileText, Database, ExternalLink, X, RefreshCw } from "lucide-react";
import { T } from "../tokens";

const API = import.meta.env.VITE_API_URL;

function urlNotion(pageId) {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 🧩 PARSER DE BLOQUES NOTION
// ──────────────────────────────────────────────────────────────────────────────

function parsearBloques(raw) {
  if (!raw) return null;
  try {
    const bloques = JSON.parse(raw);
    return Array.isArray(bloques) ? bloques : null;
  } catch {
    return null;
  }
}

function textoPlanoDeBloques(bloques) {
  return bloques.map((b) => b.texto).filter(Boolean).join(" ");
}

function BloqueNotion({ bloque }) {
  const { tipo, texto, nivel = 0, marcado } = bloque;
  const sangria = { marginLeft: nivel * 18 };

  switch (tipo) {
    case "heading_1":
      return <div style={{ fontFamily: T.serif, fontSize: 22, color: "rgba(237,235,230,0.92)", margin: "22px 0 10px" }}>{texto}</div>;
    case "heading_2":
      return <div style={{ fontFamily: T.serif, fontSize: 18, color: "rgba(237,235,230,0.88)", margin: "18px 0 8px" }}>{texto}</div>;
    case "heading_3":
      return <div style={{ fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, color: "rgba(237,235,230,0.82)", margin: "14px 0 6px" }}>{texto}</div>;
    case "bulleted_list_item":
      return (
        <div style={{ ...sangria, display: "flex", gap: 8, fontSize: 13, color: "rgba(237,235,230,0.62)", lineHeight: 1.7 }}>
          <span>•</span><span>{texto}</span>
        </div>
      );
    case "numbered_list_item":
      return (
        <div style={{ ...sangria, display: "flex", gap: 8, fontSize: 13, color: "rgba(237,235,230,0.62)", lineHeight: 1.7 }}>
          <span>–</span><span>{texto}</span>
        </div>
      );
    case "to_do":
      return (
        <div style={{ ...sangria, display: "flex", gap: 8, fontSize: 13, lineHeight: 1.7, color: marcado ? "rgba(237,235,230,0.35)" : "rgba(237,235,230,0.62)", textDecoration: marcado ? "line-through" : "none" }}>
          <span>{marcado ? "☑" : "☐"}</span><span>{texto}</span>
        </div>
      );
    case "quote":
      return (
        <div style={{ borderLeft: `2px solid ${T.jade}55`, paddingLeft: 12, margin: "10px 0", fontSize: 13, fontStyle: "italic", color: "rgba(237,235,230,0.55)" }}>
          {texto}
        </div>
      );
    case "code":
      return (
        <pre style={{ background: "rgba(237,235,230,0.04)", border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8, padding: "10px 12px", fontSize: 12, fontFamily: T.mono, color: "rgba(237,235,230,0.7)", overflowX: "auto", margin: "10px 0" }}>
          {texto}
        </pre>
      );
    case "divider":
      return <div style={{ height: 1, background: "rgba(237,235,230,0.08)", margin: "16px 0" }} />;
    default:
      return texto ? (
        <div style={{ fontSize: 13, color: "rgba(237,235,230,0.55)", lineHeight: 1.75, margin: "6px 0" }}>{texto}</div>
      ) : null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 🚀 COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

export default function PaginaNotion({ userId, onCerrar }) {
  const [conectado, setConectado] = useState(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [ultimaSync, setUltimaSync] = useState(null);
  const [ancladas, setAncladas] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => { cargar(); }, [userId]);

  async function cargar() {
    if (!userId || userId === "demo") { setConectado(false); return; }
    try {
      const estado = await fetch(`${API}/notion/estado`, { credentials: "include" }).then((r) => r.json());
      setConectado(estado.conectado);
      setWorkspaceName(estado.workspace_name || "");
      setUltimaSync(estado.ultima_sincronizacion || null);
      if (estado.conectado) {
        const r = await fetch(`${API}/notion/ancladas`, { credentials: "include" }).then((r) => r.json());
        setAncladas(r.paginas || []);
      }
    } catch {
      setConectado(false);
    }
  }

  async function refrescar() {
    setRefrescando(true);
    try {
      await fetch(`${API}/notion/sincronizar`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Error sincronizando Notion:", e);
    }
    await cargar();
    setRefrescando(false);
  }

  if (conectado === null) return null;

  const principales = (ancladas || []).filter((a) => !a.es_auto);
  const hijosDe = (id) => (ancladas || []).filter((a) => a.es_auto && a.parent_id === id);
  const totalDbs = (ancladas || []).filter((a) => a.tipo === "database").length;

  return (
    <div style={{ padding: "32px 36px 60px", maxWidth: 1040, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: "1.5px", color: "rgba(237,235,230,0.3)", fontFamily: T.mono, marginBottom: 6 }}>
            PÁGINAS ENLAZADAS
          </div>
          <div style={{ fontSize: 28, fontFamily: T.serif, color: "rgba(237,235,230,0.92)" }}>Notion</div>
          {conectado && (
            <div style={{ fontSize: 12, color: "rgba(237,235,230,0.4)", fontFamily: T.sans, marginTop: 6 }}>
              {workspaceName || "Workspace conectado"}
              {ultimaSync && ` · última sync ${ultimaSync.slice(0, 16).replace("T", " ")}`}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {conectado && (
            <button onClick={refrescar} disabled={refrescando} style={s.btnIcono} title="Actualizar">
              <RefreshCw size={14} strokeWidth={2} style={{ transform: refrescando ? "rotate(180deg)" : "none", transition: "transform 0.6s ease" }} />
            </button>
          )}
          <button onClick={onCerrar} style={s.btnIcono} title="Cerrar">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* No conectado */}
      {!conectado && (
        <div style={s.centrado}>
          <Database size={22} strokeWidth={1.6} color={`${T.jade}88`} />
          <div style={{ fontSize: 13, fontFamily: T.sans, color: "rgba(237,235,230,0.4)", marginTop: 14, textAlign: "center", maxWidth: 320 }}>
            Conecta tu workspace desde Configuración → Servicios para empezar a enlazar páginas.
          </div>
        </div>
      )}

      {/* Conectado pero sin páginas ancladas */}
      {conectado && principales.length === 0 && (
        <div style={s.centrado}>
          <div style={{ fontSize: 13, fontFamily: T.sans, color: "rgba(237,235,230,0.4)", textAlign: "center", maxWidth: 340 }}>
            Aún no has enlazado ninguna página. Ve a Configuración → Servicios → Notion para elegir cuáles mostrar aquí.
          </div>
        </div>
      )}

      {/* Resumen rápido */}
      {conectado && principales.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <Chip label={`${principales.length} página${principales.length !== 1 ? "s" : ""}`} color={T.turquesa} />
          {totalDbs > 0 && <Chip label={`${totalDbs} base${totalDbs !== 1 ? "s" : ""} de datos`} color={T.jade} />}
        </div>
      )}

      {/* Vista de lista o detalle */}
      {!seleccionada && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {principales.map((pg) => {
            const bloques = parsearBloques(pg.contenido_resumen);
            const previewTexto = bloques ? textoPlanoDeBloques(bloques) : (pg.contenido_resumen || "");
            const tieneContenido = bloques || pg.contenido_resumen;
            
            return (
              <div
                key={pg.page_id}
                style={{ ...s.cardPagina, cursor: tieneContenido ? "pointer" : "default" }}
                onClick={() => tieneContenido && setSeleccionada(pg)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={s.iconoCard}>
                    <FileText size={15} strokeWidth={1.7} color={T.turquesa} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 14, fontFamily: T.sans, color: "rgba(237,235,230,0.9)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pg.titulo}
                      </div>
                      <a
                        href={urlNotion(pg.page_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={s.linkExterno}
                        title="Abrir en Notion"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} strokeWidth={2} />
                      </a>
                    </div>
                    {previewTexto && (
                      <div style={{
                        fontSize: 11.5, fontFamily: T.sans, color: "rgba(237,235,230,0.35)",
                        marginTop: 6, lineHeight: 1.55,
                        display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {previewTexto}
                      </div>
                    )}
                  </div>
                </div>

                {hijosDe(pg.page_id).length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(237,235,230,0.06)" }}>
                    {hijosDe(pg.page_id).map((db) => (
                      <a
                        key={db.page_id}
                        href={urlNotion(db.page_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Database size={12} strokeWidth={1.8} color={T.jade} />
                        <span style={{ flex: 1, fontSize: 11.5, color: "rgba(237,235,230,0.7)", fontFamily: T.sans }}>{db.titulo}</span>
                        <span style={{ fontSize: 9, color: `${T.jade}aa`, fontFamily: T.mono, letterSpacing: "0.5px" }}>BASE DE DATOS</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {seleccionada && (() => {
        const bloques = parsearBloques(seleccionada.contenido_resumen);
        return (
          <div style={s.detallePagina}>
            <button onClick={() => setSeleccionada(null)} style={{ ...s.btnIcono, marginBottom: 18 }} title="Volver">
              <X size={16} strokeWidth={2} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={s.iconoCard}>
                <FileText size={15} strokeWidth={1.7} color={T.turquesa} />
              </div>
              <div style={{ fontSize: 20, fontFamily: T.serif, color: "rgba(237,235,230,0.92)" }}>
                {seleccionada.titulo}
              </div>
              <a href={urlNotion(seleccionada.page_id)} target="_blank" rel="noopener noreferrer" style={s.linkExterno} title="Abrir en Notion">
                <ExternalLink size={13} strokeWidth={2} />
              </a>
            </div>

            {bloques ? (
              bloques.map((b, i) => <BloqueNotion key={i} bloque={b} />)
            ) : (
              <div style={{ fontSize: 13, fontFamily: T.sans, color: "rgba(237,235,230,0.55)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {seleccionada.contenido_resumen}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function Chip({ label, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: `${color}12`, border: `1px solid ${color}30`,
      borderRadius: 20, padding: "5px 12px",
      fontSize: 11, color, fontFamily: T.sans,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label}
    </div>
  );
}

const s = {
  centrado: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "80px 0",
  },
  btnIcono: {
    width: 32, height: 32, borderRadius: 9,
    background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.1)",
    color: "rgba(237,235,230,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  cardPagina: {
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)",
    borderRadius: 14, padding: 16,
  },
  iconoCard: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    border: `1px solid ${T.turquesa}35`, background: `${T.turquesa}14`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  linkExterno: {
    color: "rgba(237,235,230,0.3)", flexShrink: 0, display: "flex",
  },
  detallePagina: {
    background: "rgba(237,235,230,0.02)", border: "1px solid rgba(237,235,230,0.07)",
    borderRadius: 14, padding: "20px 24px", maxWidth: 760,
  },
};