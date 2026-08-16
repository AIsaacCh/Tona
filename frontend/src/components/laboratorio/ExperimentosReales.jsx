import { useState, useEffect, useRef } from "react";
import anime from "animejs";
import { T } from "../../tokens";

const API = import.meta.env.VITE_API_URL;

const COLOR_CALIDAD = {
  excelente: T.jade,
  aceptable: "#F5C87A",
  revisar: "#E05A5A",
};

const TEXTO_CALIDAD = {
  excelente: "Tu medición coincide muy bien con la teoría",
  aceptable: "Hay una diferencia esperable por fricción o error de medición",
  revisar: "La diferencia es grande — revisa cómo mediste o si el resorte cambió de comportamiento",
};

export default function ExperimentosReales({ userId, materiales, materialId, setMaterialId, masa, setMasa, k, setK }) {
  const [deformacionMedida, setDeformacionMedida] = useState("");
  const [notas, setNotas] = useState("");
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const panelResultadoRef = useRef(null);
  const barraTeoricaRef = useRef(null);
  const barraMedidaRef = useRef(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    try {
      const resp = await fetch(`${API}/laboratorio/hooke/experimentos-reales`, { credentials: "include" });
      const data = await resp.json();
      setHistorial(data.experimentos || []);
    } catch (e) {
      console.error("Error cargando historial de experimentos reales:", e);
    }
  }

  async function registrarExperimento() {
    const valor = parseFloat(deformacionMedida);
    if (isNaN(valor) || valor < 0) {
      setError("Ingresa la deformación que mediste, en centímetros.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const resp = await fetch(`${API}/laboratorio/hooke/experimento-real`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: materialId,
          masa,
          k,
          deformacion_medida_cm: valor,
          notas: notas.trim() || null,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error registrando el experimento");
      }
      const data = await resp.json();
      setResultado(data.experimento);
      setHistorial((prev) => [data.experimento, ...prev].slice(0, 30));
      setDeformacionMedida("");
      setNotas("");
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    if (!resultado) return;
    const maxVal = Math.max(resultado.deformacion_cm, resultado.deformacion_medida_cm, 1);
    const colorMedida = COLOR_CALIDAD[resultado.calidad] || T.jade;

    if (barraTeoricaRef.current) {
      anime({
        targets: barraTeoricaRef.current,
        width: [`0%`, `${(resultado.deformacion_cm / maxVal) * 100}%`],
        duration: 700,
        easing: "easeOutQuart",
      });
    }
    if (barraMedidaRef.current) {
      anime({
        targets: barraMedidaRef.current,
        width: [`0%`, `${(resultado.deformacion_medida_cm / maxVal) * 100}%`],
        background: colorMedida,
        duration: 700,
        delay: 150,
        easing: "easeOutQuart",
      });
    }
    if (panelResultadoRef.current) {
      anime({ targets: panelResultadoRef.current, opacity: [0, 1], translateY: [10, 0], duration: 400, easing: "easeOutQuart" });
    }
  }, [resultado]);

  const materialActivo = materiales.find((m) => m.id === materialId);

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.panelForm}>
        <div style={estilos.tituloSeccion}>REGISTRA TU EXPERIMENTO FÍSICO</div>
        <div style={estilos.textoAyuda}>
          Usa los mismos parámetros que ya tienes configurados en la simulación (material, masa, k) y anota
          lo que mediste con una regla en tu resorte real.
        </div>

        <div style={estilos.resumenParams}>
          <span>Material: <b>{materialActivo?.nombre || "—"}</b></span>
          <span>Masa: <b>{masa} kg</b></span>
          <span>k: <b>{k} N/m</b></span>
        </div>

        <label style={estilos.label}>¿Cuánto se estiró en tu experimento? (cm)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={deformacionMedida}
          onChange={(e) => setDeformacionMedida(e.target.value)}
          placeholder="Ej. 12.8"
          style={estilos.inputNum}
        />

        <label style={estilos.label}>Notas (opcional)</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej. usé una regla de 30cm, el resorte tenía uso previo..."
          style={estilos.textarea}
          maxLength={500}
        />

        <button onClick={registrarExperimento} disabled={enviando} style={estilos.botonRegistrar}>
          {enviando ? "Registrando..." : "Comparar contra la teoría"}
        </button>

        {error && <div style={estilos.error}>{error}</div>}
      </div>

      <div style={estilos.panelComparacion}>
        {resultado ? (
          <div ref={panelResultadoRef} style={{ opacity: 0 }}>
            <div style={estilos.tituloSeccion}>COMPARACIÓN</div>

            <div style={estilos.filaBarra}>
              <span style={estilos.labelBarra}>Teórico ({resultado.deformacion_cm} cm)</span>
              <div style={estilos.pistaBarra}>
                <div ref={barraTeoricaRef} style={{ ...estilos.barra, background: T.turquesa, width: 0 }} />
              </div>
            </div>

            <div style={estilos.filaBarra}>
              <span style={estilos.labelBarra}>Medido ({resultado.deformacion_medida_cm} cm)</span>
              <div style={estilos.pistaBarra}>
                <div ref={barraMedidaRef} style={{ ...estilos.barra, width: 0 }} />
              </div>
            </div>

            <div style={{
              ...estilos.chipCalidad,
              borderColor: `${COLOR_CALIDAD[resultado.calidad]}55`,
              color: COLOR_CALIDAD[resultado.calidad],
            }}>
              Error: {resultado.error_porcentual}% — {TEXTO_CALIDAD[resultado.calidad]}
            </div>
          </div>
        ) : (
          <div style={estilos.placeholder}>
            Registra tu primer experimento para ver la comparación aquí.
          </div>
        )}

        <div style={estilos.tituloSeccion}>HISTORIAL</div>
        <div style={estilos.historial}>
          {historial.length === 0 && (
            <div style={estilos.placeholderChico}>Aún no tienes experimentos registrados.</div>
          )}
          {historial.map((exp) => (
            <div key={exp.id} style={estilos.filaHistorial}>
              <span style={{ color: COLOR_CALIDAD[exp.calidad] || T.jade, fontFamily: T.mono, fontSize: 11 }}>
                {exp.error_porcentual}%
              </span>
              <span style={estilos.textoHistorial}>
                {exp.material_nombre} · {exp.masa_kg}kg · medido {exp.deformacion_medida_cm}cm vs teórico {exp.deformacion_cm}cm
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { display: "flex", gap: 24, padding: 24, color: "rgba(237,235,230,0.85)", fontFamily: T.sans },
  panelForm: { width: 320, display: "flex", flexDirection: "column", gap: 8 },
  panelComparacion: { flex: 1, display: "flex", flexDirection: "column", gap: 10 },
  tituloSeccion: { fontSize: 10, letterSpacing: "1px", color: "rgba(237,235,230,0.35)", fontFamily: T.mono, marginTop: 8 },
  textoAyuda: { fontSize: 11, color: "rgba(237,235,230,0.4)", lineHeight: 1.5, marginBottom: 8 },
  resumenParams: { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "rgba(237,235,230,0.55)", background: "rgba(237,235,230,0.03)", border: "1px solid rgba(237,235,230,0.08)", borderRadius: 8, padding: 10, marginBottom: 8 },
  label: { fontSize: 11, color: "rgba(237,235,230,0.4)", marginTop: 6 },
  inputNum: { background: "rgba(237,235,230,0.04)", border: `1px solid ${T.jade}25`, borderRadius: 8, padding: "9px 12px", color: "rgba(237,235,230,0.85)", fontSize: 13 },
  textarea: { background: "rgba(237,235,230,0.04)", border: `1px solid ${T.jade}25`, borderRadius: 8, padding: "9px 12px", color: "rgba(237,235,230,0.85)", fontSize: 12, minHeight: 60, resize: "vertical", fontFamily: T.sans },
  botonRegistrar: { marginTop: 14, background: `${T.jade}18`, border: `1px solid ${T.jade}45`, borderRadius: 10, padding: "11px", color: T.jade, fontSize: 12, cursor: "pointer" },
  error: { fontSize: 11, color: "#E05A5A", marginTop: 8 },
  placeholder: { fontSize: 12, color: "rgba(237,235,230,0.3)", padding: "20px 0" },
  placeholderChico: { fontSize: 11, color: "rgba(237,235,230,0.25)" },
  filaBarra: { marginBottom: 12 },
  labelBarra: { fontSize: 11, color: "rgba(237,235,230,0.5)", display: "block", marginBottom: 4 },
  pistaBarra: { width: "100%", height: 10, background: "rgba(237,235,230,0.06)", borderRadius: 6, overflow: "hidden" },
  barra: { height: "100%", borderRadius: 6 },
  chipCalidad: { border: "1px solid", borderRadius: 10, padding: "10px 14px", fontSize: 12, marginTop: 6, marginBottom: 16 },
  historial: { display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" },
  filaHistorial: { display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(237,235,230,0.05)" },
  textoHistorial: { fontSize: 11, color: "rgba(237,235,230,0.55)" },
};