import { useState, useRef, useEffect } from "react";
import anime from "animejs";
import { T } from "../tokens";
import { agenteBus } from "./AgenteTona";


const API = import.meta.env.VITE_API_URL;

const DIAS_LABEL = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado",
};

export function PanelHorario({ onCerrar }) {
  const [paso, setPaso] = useState("elegir"); // "elegir" | "subir" | "analizando" | "confirmar" | "manual"
  const [clasesPropuestas, setClasesPropuestas] = useState([]);
  const [error, setError] = useState("");
  const [reemplazar, setReemplazar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const fileInputRef = useRef(null);
  const ref = useRef(null);
  const overlayRef = useRef(null);

  // Estado del formulario manual
  const [materia, setMateria] = useState("");
  const [dia, setDia] = useState("lunes");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [aula, setAula] = useState("");
  const [clasesAgregadas, setClasesAgregadas] = useState([]);

  const userId = localStorage.getItem("tona_user_id") || "demo";

  useEffect(() => {
    if (!ref.current) return;
    anime({ targets: overlayRef.current, opacity: [0, 1], duration: 280, easing: "easeOutQuart" });
    anime({ targets: ref.current, opacity: [0, 1], translateY: [20, 0], duration: 320, easing: "easeOutQuart" });
  }, []);

  function cerrar() {
    anime.timeline({ easing: "easeInQuart" })
      .add({ targets: overlayRef.current, opacity: 0, duration: 200 })
      .add({ targets: ref.current, opacity: 0, translateY: 12, duration: 220, complete: onCerrar }, "-=100");
  }

  async function manejarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setPaso("analizando");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(`${API}/horario/${userId}/analizar`, {
  method: "POST",
  credentials: "include",
  body: formData,
});
   

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "No se pudo analizar el archivo");
      }

      const data = await resp.json();
      const clases = data.clases_propuestas || [];

      if (clases.length === 0) {
        setError("No se pudo identificar ninguna clase en el archivo. Intenta con una imagen más clara.");
        setPaso("subir");
        return;
      }

      setClasesPropuestas(clases);
      setPaso("confirmar");
    } catch (e) {
      setError(e.message || "Error al procesar el archivo");
      setPaso("subir");
    }
  }

  function editarClase(index, campo, valor) {
    setClasesPropuestas((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [campo]: valor } : c))
    );
  }

  function eliminarClasePropuesta(index) {
    setClasesPropuestas((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmarGuardado() {
    if (guardando) return;
    if (clasesPropuestas.length === 0) {
      setError("No hay clases para guardar");
      return;
    }
    setGuardando(true);
    setError("");

    try {
      const resp = await fetch(
  `${API}/horario/${userId}/confirmar?reemplazar=${reemplazar}`,
  {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clases: clasesPropuestas }),
  }
);

      if (!resp.ok) throw new Error("No se pudo guardar el horario");

      agenteBus.emit("flash", { mensaje: "Horario guardado correctamente", tipo: "exito" });
      cerrar();
    } catch (e) {
      setError(e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  // ── Modo manual ──────────────────────────────────────────────────────────

  function agregarClaseManual() {
  console.log("materia:", materia, "horaInicio:", horaInicio);
  if (!materia.trim() || !horaInicio) {
    setError("Materia y hora de inicio son obligatorias");
    return;
  }
  
    setClasesAgregadas((prev) => [
      ...prev,
      { materia: materia.trim(), dia, hora_inicio: horaInicio, hora_fin: horaFin, aula: aula.trim() },
    ]);
    setMateria("");
    setHoraInicio("");
    setHoraFin("");
    setAula("");
    setError("");
  }

  function quitarClaseAgregada(index) {
    setClasesAgregadas((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarManual() {
    if (guardando) return;
    if (clasesAgregadas.length === 0) {
      setError("Agrega al menos una clase antes de guardar");
      return;
    }
    setGuardando(true);
    setError("");

    try {
      const resp = await fetch(
  `${API}/horario/${userId}/confirmar?reemplazar=${reemplazar}`,
  {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clases: clasesAgregadas }),
  }
);

      if (!resp.ok) throw new Error("No se pudo guardar el horario");

      agenteBus.emit("flash", { mensaje: "Horario guardado correctamente", tipo: "exito" });
      cerrar();
    } catch (e) {
      setError(e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div ref={overlayRef} style={{
      position: "fixed", inset: 0, zIndex: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", opacity: 0,
    }}>
      <div ref={ref} style={{
        width: paso === "confirmar" ? 520 : 400,
        maxHeight: "80vh",
        background: "rgba(9,11,13,0.98)",
        border: `1px solid ${T.turquesa}28`, borderTop: `2px solid ${T.turquesa}`,
        borderRadius: 16, overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: `0 12px 64px rgba(0,0,0,0.7), 0 0 40px ${T.turquesa}08`,
        opacity: 0,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: `1px solid ${T.turquesa}15`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: `${T.turquesa}88`, letterSpacing: "1.5px", fontFamily: T.mono }}>
            TONA · CONFIGURAR HORARIO
          </span>
          <button onClick={cerrar} style={{ background: "transparent", border: "none", color: `${T.amaranto}55`, fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "20px", overflow: "auto", flex: 1 }}>

          {paso === "elegir" && (
            <>
              <div style={{ fontSize: 13, color: "rgba(237,235,230,0.7)", fontWeight: 300, marginBottom: 20, lineHeight: 1.5 }}>
                ¿Cómo quieres configurar tu horario?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => setPaso("subir")}
                  style={{
                    padding: "16px 18px", background: `${T.turquesa}08`,
                    border: `1px solid ${T.turquesa}30`, borderRadius: 10,
                    color: `${T.turquesa}cc`, fontSize: 12, fontFamily: T.sans,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  📄 Subir imagen o PDF
                  <div style={{ fontSize: 10, color: "rgba(237,235,230,0.35)", marginTop: 4, fontWeight: 300 }}>
                    Tona lo lee automáticamente y tú confirmas
                  </div>
                </button>
                <button
                  onClick={() => setPaso("manual")}
                  style={{
                    padding: "16px 18px", background: `${T.jade}08`,
                    border: `1px solid ${T.jade}30`, borderRadius: 10,
                    color: `${T.jade}cc`, fontSize: 12, fontFamily: T.sans,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  ✏️ Agregar manualmente
                  <div style={{ fontSize: 10, color: "rgba(237,235,230,0.35)", marginTop: 4, fontWeight: 300 }}>
                    Captura clase por clase tú mismo
                  </div>
                </button>
              </div>
            </>
          )}

          {paso === "subir" && (
            <>
              <div style={{ fontSize: 13, color: "rgba(237,235,230,0.7)", fontWeight: 300, marginBottom: 16, lineHeight: 1.5 }}>
                Sube una imagen o PDF de tu horario y Tona lo va a leer automáticamente.
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={manejarArchivo}
                style={{ display: "none" }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%", padding: "32px 20px",
                  background: `${T.turquesa}08`, border: `1px dashed ${T.turquesa}35`,
                  borderRadius: 12, color: `${T.turquesa}aa`,
                  fontSize: 12, fontFamily: T.mono, cursor: "pointer",
                  letterSpacing: "0.5px", textAlign: "center",
                }}
              >
                📄 Haz clic para subir imagen o PDF
              </button>

              <button
                onClick={() => { setPaso("elegir"); setError(""); }}
                style={{
                  marginTop: 12, width: "100%", background: "transparent",
                  border: "none", color: "rgba(237,235,230,0.3)",
                  fontSize: 11, fontFamily: T.sans, cursor: "pointer",
                }}
              >
                ← volver
              </button>

              {error && (
                <div style={{ marginTop: 14, fontSize: 11, color: T.amaranto, fontFamily: T.sans }}>
                  {error}
                </div>
              )}
            </>
          )}

          {paso === "analizando" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 12, color: `${T.turquesa}aa`, fontFamily: T.mono, letterSpacing: "0.5px" }}>
                Analizando tu horario...
              </div>
            </div>
          )}

          {paso === "confirmar" && (
            <>
              <div style={{ fontSize: 12, color: "rgba(237,235,230,0.6)", marginBottom: 16, lineHeight: 1.5 }}>
                Revisa las clases detectadas. Puedes editar cualquier dato antes de guardar.
              </div>

              {clasesPropuestas.map((c, i) => (
                <div key={i} style={{
                  background: "rgba(237,235,230,0.03)",
                  border: `1px solid ${T.turquesa}18`,
                  borderRadius: 10, padding: "12px 14px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <input
                      value={c.materia}
                      onChange={(e) => editarClase(i, "materia", e.target.value)}
                      style={inputStyle(140)}
                      placeholder="Materia"
                    />
                    <button
                      onClick={() => eliminarClasePropuesta(i)}
                      style={{ background: "transparent", border: "none", color: `${T.amaranto}66`, fontSize: 14, cursor: "pointer" }}
                    >✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select
                      value={c.dia}
                      onChange={(e) => editarClase(i, "dia", e.target.value)}
                      style={inputStyle(110)}
                    >
                      {Object.entries(DIAS_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="time"
                      value={c.hora_inicio}
                      onChange={(e) => editarClase(i, "hora_inicio", e.target.value)}
                      style={inputStyle(90)}
                    />
                    <input
                      type="time"
                      value={c.hora_fin || ""}
                      onChange={(e) => editarClase(i, "hora_fin", e.target.value)}
                      style={inputStyle(90)}
                    />
                    <input
                      value={c.aula || ""}
                      onChange={(e) => editarClase(i, "aula", e.target.value)}
                      placeholder="Aula"
                      style={inputStyle(80)}
                    />
                  </div>
                </div>
              ))}

              <div style={{
                display: "flex", gap: 8, marginTop: 16, marginBottom: 16,
                padding: "10px 12px", background: `${T.copal}08`,
                border: `1px solid ${T.copal}20`, borderRadius: 8,
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "rgba(237,235,230,0.6)" }}>
                  <input
                    type="checkbox"
                    checked={reemplazar}
                    onChange={(e) => setReemplazar(e.target.checked)}
                  />
                  Reemplazar horario existente (si lo desmarcas, solo se agregan estas clases)
                </label>
              </div>

              {error && (
                <div style={{ fontSize: 11, color: T.amaranto, marginBottom: 12 }}>{error}</div>
              )}
            </>
          )}

          {paso === "manual" && (
            <>
              <div style={{ fontSize: 12, color: "rgba(237,235,230,0.6)", marginBottom: 16, lineHeight: 1.5 }}>
                Agrega tus clases una por una.
              </div>

              <div style={{
                background: "rgba(237,235,230,0.03)", border: `1px solid ${T.jade}18`,
                borderRadius: 10, padding: "14px", marginBottom: 16,
              }}>
                <div style={{ marginBottom: 10 }}>
                  <input
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    placeholder="Nombre de la materia"
                    style={{ ...inputStyle("100%"), boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <select value={dia} onChange={(e) => setDia(e.target.value)} style={inputStyle(110)}>
                    {Object.entries(DIAS_LABEL).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    style={inputStyle(90)}
                  />
                  <input
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    style={inputStyle(90)}
                  />
                  <input
                    value={aula}
                    onChange={(e) => setAula(e.target.value)}
                    placeholder="Aula (opcional)"
                    style={inputStyle(110)}
                  />
                </div>
                <button
                  onClick={agregarClaseManual}
                  style={{
                    width: "100%", background: `${T.jade}15`, border: `1px solid ${T.jade}35`,
                    borderRadius: 8, padding: "8px 0", color: T.jade,
                    fontSize: 11, fontFamily: T.mono, cursor: "pointer",
                  }}
                >
                  + agregar clase
                </button>
              </div>

              {clasesAgregadas.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "rgba(237,235,230,0.3)", letterSpacing: "1px", marginBottom: 8, fontFamily: T.mono }}>
                    CLASES AGREGADAS ({clasesAgregadas.length})
                  </div>
                  {clasesAgregadas.map((c, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 10px", background: "rgba(237,235,230,0.02)",
                      borderRadius: 6, marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 11, color: "rgba(237,235,230,0.6)" }}>
                        {c.materia} — {DIAS_LABEL[c.dia]} {c.hora_inicio}{c.hora_fin ? `-${c.hora_fin}` : ""}
                      </span>
                      <button
                        onClick={() => quitarClaseAgregada(i)}
                        style={{ background: "transparent", border: "none", color: `${T.amaranto}66`, fontSize: 12, cursor: "pointer" }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                display: "flex", gap: 8, marginBottom: 16,
                padding: "10px 12px", background: `${T.copal}08`,
                border: `1px solid ${T.copal}20`, borderRadius: 8,
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "rgba(237,235,230,0.6)" }}>
                  <input
                    type="checkbox"
                    checked={reemplazar}
                    onChange={(e) => setReemplazar(e.target.checked)}
                  />
                  Reemplazar horario existente
                </label>
              </div>

              <button
                onClick={() => { setPaso("elegir"); setError(""); }}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  color: "rgba(237,235,230,0.3)", fontSize: 11,
                  fontFamily: T.sans, cursor: "pointer", marginBottom: 8,
                }}
              >
                ← volver
              </button>

              {error && (
                <div style={{ fontSize: 11, color: T.amaranto, marginBottom: 12 }}>{error}</div>
              )}
            </>
          )}
        </div>

        {paso === "confirmar" && (
          <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: `1px solid ${T.turquesa}12`, flexShrink: 0 }}>
            <button
              onClick={confirmarGuardado}
              disabled={guardando}
              style={{
                flex: 2, background: `${T.turquesa}18`, border: `1px solid ${T.turquesa}45`,
                borderRadius: 9, padding: "11px 0", color: T.turquesa,
                fontSize: 13, fontFamily: T.sans, fontWeight: 300, cursor: guardando ? "wait" : "pointer",
                opacity: guardando ? 0.5 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Confirmar y guardar"}
            </button>
            <button
              onClick={() => { setPaso("subir"); setClasesPropuestas([]); }}
              style={{
                flex: 1, background: "transparent", border: `1px solid ${T.amaranto}25`,
                borderRadius: 9, padding: "11px 0", color: `${T.amaranto}66`,
                fontSize: 12, fontFamily: T.sans, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {paso === "manual" && clasesAgregadas.length > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: `1px solid ${T.jade}12`, flexShrink: 0 }}>
            <button
              onClick={guardarManual}
              disabled={guardando}
              style={{
                flex: 1, background: `${T.jade}18`, border: `1px solid ${T.jade}45`,
                borderRadius: 9, padding: "11px 0", color: T.jade,
                fontSize: 13, fontFamily: T.sans, fontWeight: 300, cursor: guardando ? "wait" : "pointer",
                opacity: guardando ? 0.5 : 1,
              }}
            >
              {guardando ? "Guardando..." : `Guardar horario (${clasesAgregadas.length} clases)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function inputStyle(width) {
  return {
    width, background: "rgba(237,235,230,0.04)",
    border: "1px solid rgba(237,235,230,0.1)", borderRadius: 6,
    padding: "6px 8px", color: "rgba(237,235,230,0.75)",
    fontSize: 11, fontFamily: T.sans, outline: "none",
  };
}