import { useState, useEffect, useRef, useCallback } from "react";
import anime from "animejs";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { T } from "../../tokens";
import ExperimentosReales from "./ExperimentosReales";
import ResorteIsometrico from "./ResorteIsometrico";

const API = import.meta.env.VITE_API_URL;

const COLOR_ESTADO = {
  segura: T.jade,
  fluencia: "#F5C87A",
  ruptura: "#E05A5A",
};

const TEXTO_ESTADO = {
  segura: "Zona segura — el resorte regresa a su forma original",
  fluencia: "Punto de fluencia — deformación permanente",
  ruptura: "Punto de ruptura — el material falló",
};

function AlertaFractura() {
  const contenedorRef = useRef(null);

  useEffect(() => {
    anime({
      targets: contenedorRef.current,
      opacity: [0, 1, 0.35, 1, 0.55, 1],
      duration: 650,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <div style={estilosAlerta.posicionador}>
      <motion.div
        ref={contenedorRef}
        initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={estilosAlerta.panel}
      >
        <span style={{ ...estilosAlerta.esquina, top: -1, left: -1, borderRight: "none", borderBottom: "none" }} />
        <span style={{ ...estilosAlerta.esquina, top: -1, right: -1, borderLeft: "none", borderBottom: "none" }} />
        <span style={{ ...estilosAlerta.esquina, bottom: -1, left: -1, borderRight: "none", borderTop: "none" }} />
        <span style={{ ...estilosAlerta.esquina, bottom: -1, right: -1, borderLeft: "none", borderTop: "none" }} />

        <motion.div
          style={estilosAlerta.scanline}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />

        <div style={estilosAlerta.icono}>⚠</div>
        <div style={estilosAlerta.titulo}>FRACTURA</div>
        <div style={estilosAlerta.subtitulo}>Punto de ruptura detectado</div>
        <div style={estilosAlerta.descripcion}>El material excedió su límite elástico.</div>
      </motion.div>
    </div>
  );
}

export default function LaboratorioHooke({ userId }) {
  const [materiales, setMateriales] = useState([]);
  const [materialId, setMaterialId] = useState("");
  const [masa, setMasa] = useState(2.5);
  const [k, setK] = useState(20);
  const [resultado, setResultado] = useState(null);
  const [historialPuntos, setHistorialPuntos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("simulacion");

  const panelResultadoRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/laboratorio/materiales`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMateriales(data.materiales || []);
        if (data.materiales?.length) {
          setMaterialId(data.materiales[0].id);
          setK(data.materiales[0].k_default);
        }
      })
      .catch(() => setError("No se pudieron cargar los materiales."));
  }, []);

  const simular = useCallback(async () => {
    if (!materialId) return;
    setCargando(true);
    setError("");
    try {
      const resp = await fetch(`${API}/laboratorio/hooke/simular`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material_id: materialId, masa, k }),
      });
      if (!resp.ok) throw new Error("Error en la simulación");
      const data = await resp.json();
      setResultado(data);
      setHistorialPuntos((prev) => [...prev, { x: data.deformacion_cm, y: data.fuerza_N }].slice(-30));
    } catch (e) {
      console.error(e);
      setError("No se pudo calcular la simulación. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [materialId, masa, k]);

  useEffect(() => { if (materialId) simular(); }, [materialId]);

  useEffect(() => {
    if (resultado && resultado.estado !== "ruptura" && panelResultadoRef.current) {
      anime({
        targets: panelResultadoRef.current,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400,
        easing: "easeOutQuart"
      });
    }
  }, [resultado]);

  const materialActivo = materiales.find((m) => m.id === materialId);

  return (
    <div>
      <div style={estilos.tabs}>
        <button 
          onClick={() => setVista("simulacion")} 
          style={{
            ...estilos.tab,
            ...(vista === "simulacion" ? estilos.tabActiva : {})
          }}
        >
          Simulación
        </button>
        <button 
          onClick={() => setVista("real")} 
          style={{
            ...estilos.tab,
            ...(vista === "real" ? estilos.tabActiva : {})
          }}
        >
          Experimentos reales
        </button>
        <button disabled style={{ ...estilos.tab, opacity: 0.3, cursor: "default" }}>
          Análisis (próximamente)
        </button>
      </div>

      {vista === "simulacion" && (
        <div style={estilos.contenedor}>
          <div style={estilos.panelIzquierdo}>
            <div style={estilos.tituloSeccion}>PARÁMETROS DE SIMULACIÓN</div>

            <label style={estilos.label}>Material</label>
            <select
              value={materialId}
              onChange={(e) => {
                const m = materiales.find((mm) => mm.id === e.target.value);
                setMaterialId(e.target.value);
                if (m) setK(m.k_default);
              }}
              style={estilos.select}
            >
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>

            <label style={estilos.label}>Masa (kg)</label>
            <input
              type="range"
              min={materialActivo?.masa_min || 0.1}
              max={materialActivo?.masa_max || 10}
              step={0.1}
              value={masa}
              onChange={(e) => setMasa(parseFloat(e.target.value))}
              style={estilos.slider}
            />
            <div style={estilos.valorSlider}>{masa.toFixed(2)} kg</div>

            <label style={estilos.label}>Constante elástica k (N/m)</label>
            <input
              type="range"
              min={materialActivo?.k_min || 1}
              max={materialActivo?.k_max || 100}
              step={0.5}
              value={k}
              onChange={(e) => setK(parseFloat(e.target.value))}
              style={estilos.slider}
            />
            <div style={estilos.valorSlider}>{k.toFixed(2)} N/m</div>

            <button onClick={simular} disabled={cargando} style={estilos.botonAplicar}>
              {cargando ? "Calculando..." : "Aplicar cambios"}
            </button>

            {error && <div style={estilos.error}>{error}</div>}
          </div>

          <div style={estilos.panelCentro}>
            <div style={estilos.escenaWrapper}>
              <ResorteIsometrico
                deformacionCm={resultado?.deformacion_cm || 0}
                estado={resultado?.estado || "segura"}
              />

              <AnimatePresence>
                {resultado?.estado === "ruptura" && <AlertaFractura key="alerta-fractura" />}
              </AnimatePresence>
            </div>

            {resultado && resultado.estado !== "ruptura" && (
              <div ref={panelResultadoRef} style={{
                ...estilos.chipEstado,
                borderColor: `${COLOR_ESTADO[resultado.estado]}55`,
                color: COLOR_ESTADO[resultado.estado],
              }}>
                {TEXTO_ESTADO[resultado.estado]}
              </div>
            )}
          </div>

          <div style={estilos.panelDerecho}>
            <div style={estilos.tituloSeccion}>LEY DE HOOKE</div>
            <div style={estilos.formula}>F = k · x</div>

            {resultado && (
              <div style={estilos.grid2}>
                <div><div style={estilos.labelDato}>Fuerza aplicada</div><div style={estilos.valorDato}>{resultado.fuerza_N} N</div></div>
                <div><div style={estilos.labelDato}>Deformación</div><div style={estilos.valorDato}>{resultado.deformacion_cm} cm</div></div>
              </div>
            )}

            <div style={estilos.tituloSeccion}>GRÁFICA FUERZA VS DEFORMACIÓN</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historialPuntos}>
                <CartesianGrid stroke="rgba(237,235,230,0.06)" />
                <XAxis dataKey="x" tick={{ fill: "rgba(237,235,230,0.35)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(237,235,230,0.35)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0a0c0e", border: `1px solid ${T.jade}33` }} />
                <Line type="monotone" dataKey="y" stroke={T.jade} strokeWidth={2} dot={false} isAnimationActive={false} />
                {resultado && (
                  <ReferenceDot
                    x={resultado.deformacion_cm}
                    y={resultado.fuerza_N}
                    r={5}
                    fill={COLOR_ESTADO[resultado.estado]}
                    stroke="none"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {vista === "real" && (
        <ExperimentosReales
          userId={userId}
          materiales={materiales}
          materialId={materialId}
          setMaterialId={setMaterialId}
          masa={masa}
          setMasa={setMasa}
          k={k}
          setK={setK}
        />
      )}
    </div>
  );
}

const estilos = {
  tabs: { 
    display: "flex", 
    gap: 8, 
    padding: "16px 24px 0" 
  },
  tab: { 
    background: "transparent", 
    border: "1px solid rgba(237,235,230,0.1)", 
    borderRadius: "8px 8px 0 0", 
    padding: "8px 16px", 
    color: "rgba(237,235,230,0.4)", 
    fontSize: 12, 
    cursor: "pointer",
    borderBottom: "1px solid rgba(237,235,230,0.1)"
  },
  tabActiva: { 
    borderColor: `${T.jade}45`, 
    borderBottom: "1px solid rgba(9,11,13,0.98)", 
    color: T.jade, 
    background: "rgba(237,235,230,0.02)" 
  },
  contenedor: { display: "flex", gap: 24, padding: 24, color: "rgba(237,235,230,0.85)", fontFamily: T.sans },
  panelIzquierdo: { width: 220, display: "flex", flexDirection: "column", gap: 6 },
  panelCentro: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  escenaWrapper: { position: "relative", width: "100%", display: "flex", justifyContent: "center" },
  panelDerecho: { width: 300, display: "flex", flexDirection: "column", gap: 12 },
  tituloSeccion: { fontSize: 10, letterSpacing: "1px", color: "rgba(237,235,230,0.35)", fontFamily: T.mono, marginTop: 8 },
  label: { fontSize: 11, color: "rgba(237,235,230,0.4)", marginTop: 10 },
  select: { background: "rgba(237,235,230,0.04)", border: `1px solid ${T.jade}25`, borderRadius: 8, padding: "8px", color: "rgba(237,235,230,0.85)", fontSize: 12 },
  slider: { width: "100%" },
  valorSlider: { fontSize: 11, color: T.jade, fontFamily: T.mono },
  botonAplicar: { marginTop: 16, background: `${T.jade}18`, border: `1px solid ${T.jade}45`, borderRadius: 10, padding: "10px", color: T.jade, fontSize: 12, cursor: "pointer" },
  error: { fontSize: 11, color: "#E05A5A", marginTop: 8 },
  chipEstado: { border: "1px solid", borderRadius: 20, padding: "8px 16px", fontSize: 12, opacity: 0 },
  formula: { fontSize: 22, fontFamily: T.serif, color: "rgba(237,235,230,0.9)" },
  grid2: { display: "flex", gap: 20 },
  labelDato: { fontSize: 10, color: "rgba(237,235,230,0.35)" },
  valorDato: { fontSize: 16, color: T.jade, fontFamily: T.mono },
};

const estilosAlerta = {
  posicionador: {
    position: "absolute",
    top: "38%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 5,
    pointerEvents: "none",
  },
  panel: {
    position: "relative",
    width: 260,
    padding: "22px 24px",
    textAlign: "center",
    background: "rgba(10,14,16,0.55)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(224,90,90,0.4)",
    borderRadius: 12,
    boxShadow: "0 0 30px rgba(224,90,90,0.25), inset 0 0 20px rgba(224,90,90,0.06)",
    overflow: "hidden",
    fontFamily: T.mono,
  },
  esquina: {
    position: "absolute",
    width: 14,
    height: 14,
    border: "2px solid #E05A5A",
    opacity: 0.85,
  },
  scanline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    background: "linear-gradient(90deg, transparent, #E05A5A, transparent)",
    opacity: 0.55,
  },
  icono: {
    fontSize: 26,
    color: "#E05A5A",
    marginBottom: 6,
    textShadow: "0 0 12px rgba(224,90,90,0.7)",
  },
  titulo: {
    fontSize: 19,
    letterSpacing: "2px",
    color: "#E05A5A",
    fontWeight: 700,
  },
  subtitulo: {
    fontSize: 13,
    color: "rgba(237,235,230,0.85)",
    marginTop: 6,
  },
  descripcion: {
    fontSize: 11,
    color: "rgba(237,235,230,0.5)",
    marginTop: 8,
    lineHeight: 1.4,
  },
};