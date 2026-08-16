import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../../tokens";
import CaidaLibreIsometrico from "./CaidaLibreIsometrico";

const API = import.meta.env.VITE_API_URL;

export default function CaidaLibre({ userId }) {
  const [medios, setMedios] = useState([]);
  const [medioId, setMedioId] = useState("");
  const [altura, setAltura] = useState(10);
  const [masa, setMasa] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/laboratorio/caida/medios`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMedios(data.medios || []);
        if (data.medios?.length) setMedioId(data.medios[0].id);
      })
      .catch(() => setError("No se pudieron cargar los medios."));
  }, []);

  const simular = useCallback(async () => {
    if (!medioId) return;
    setCargando(true);
    setError("");
    try {
      const resp = await fetch(`${API}/laboratorio/caida/simular`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medio_id: medioId, altura, masa }),
      });
      if (!resp.ok) throw new Error("Error en la simulación");
      const data = await resp.json();
      setResultado(data);
    } catch (e) {
      setError("No se pudo calcular la simulación. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [medioId, altura, masa]);

  useEffect(() => { if (medioId) simular(); }, [medioId]);

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.panelIzquierdo}>
        <div style={estilos.tituloSeccion}>PARÁMETROS DE SIMULACIÓN</div>

        <label style={estilos.label}>Medio</label>
        <select value={medioId} onChange={(e) => setMedioId(e.target.value)} style={estilos.select}>
          {medios.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>

        <label style={estilos.label}>Altura inicial (m)</label>
        <input type="range" min={0.5} max={50} step={0.5} value={altura}
          onChange={(e) => setAltura(parseFloat(e.target.value))} style={estilos.slider} />
        <div style={estilos.valorSlider}>{altura.toFixed(1)} m</div>

        <label style={estilos.label}>Masa (kg)</label>
        <input type="range" min={0.1} max={20} step={0.1} value={masa}
          onChange={(e) => setMasa(parseFloat(e.target.value))} style={estilos.slider} />
        <div style={estilos.valorSlider}>{masa.toFixed(1)} kg</div>

        <button onClick={simular} disabled={cargando} style={estilos.botonAplicar}>
          {cargando ? "Calculando..." : "Soltar objeto"}
        </button>

        {error && <div style={estilos.error}>{error}</div>}
      </div>

      <div style={estilos.panelCentro}>
        <CaidaLibreIsometrico
          trayectoria={resultado?.trayectoria}
          medioId={medioId}
          cayendo={cargando}
        />
        {resultado && (
          <div style={estilos.chip}>
            {resultado.velocidad_terminal_ms
              ? `Velocidad terminal alcanzable: ${resultado.velocidad_terminal_ms} m/s`
              : "Caída ideal — sin resistencia del medio"}
          </div>
        )}
      </div>

      <div style={estilos.panelDerecho}>
        <div style={estilos.tituloSeccion}>CAÍDA LIBRE CON ARRASTRE</div>
        <div style={estilos.formula}>m·a = m·g − c·v²</div>

        {resultado && (
          <>
            <div style={estilos.grid2}>
              <div><div style={estilos.labelDato}>Tiempo de caída</div><div style={estilos.valorDato}>{resultado.tiempo_caida_s} s</div></div>
              <div><div style={estilos.labelDato}>Velocidad impacto</div><div style={estilos.valorDato}>{resultado.velocidad_impacto_ms} m/s</div></div>
            </div>
            <div style={estilos.grid2}>
              <div><div style={estilos.labelDato}>Ideal (sin aire)</div><div style={{ ...estilos.valorDato, color: "rgba(237,235,230,0.4)" }}>{resultado.tiempo_ideal_s} s</div></div>
              <div><div style={estilos.labelDato}>Energía al impacto</div><div style={estilos.valorDato}>{resultado.energia_cinetica_impacto_j} J</div></div>
            </div>

            <div style={estilos.tituloSeccion}>ALTURA VS TIEMPO</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={resultado.trayectoria}>
                <CartesianGrid stroke="rgba(237,235,230,0.06)" />
                <XAxis dataKey="t" tick={{ fill: "rgba(237,235,230,0.35)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(237,235,230,0.35)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0a0c0e", border: `1px solid ${T.jade}33` }} />
                <Line type="monotone" dataKey="y" stroke={T.jade} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { display: "flex", gap: 24, padding: 24, color: "rgba(237,235,230,0.85)", fontFamily: T.sans },
  panelIzquierdo: { width: 220, display: "flex", flexDirection: "column", gap: 6 },
  panelCentro: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  panelDerecho: { width: 300, display: "flex", flexDirection: "column", gap: 12 },
  tituloSeccion: { fontSize: 10, letterSpacing: "1px", color: "rgba(237,235,230,0.35)", fontFamily: T.mono, marginTop: 8 },
  label: { fontSize: 11, color: "rgba(237,235,230,0.4)", marginTop: 10 },
  select: { background: "rgba(237,235,230,0.04)", border: `1px solid ${T.jade}25`, borderRadius: 8, padding: "8px", color: "rgba(237,235,230,0.85)", fontSize: 12 },
  slider: { width: "100%" },
  valorSlider: { fontSize: 11, color: T.jade, fontFamily: T.mono },
  botonAplicar: { marginTop: 16, background: `${T.jade}18`, border: `1px solid ${T.jade}45`, borderRadius: 10, padding: "10px", color: T.jade, fontSize: 12, cursor: "pointer" },
  error: { fontSize: 11, color: "#E05A5A", marginTop: 8 },
  chip: { border: `1px solid ${T.jade}45`, borderRadius: 20, padding: "8px 16px", fontSize: 12, color: T.jade },
  formula: { fontSize: 18, fontFamily: T.serif, color: "rgba(237,235,230,0.9)" },
  grid2: { display: "flex", gap: 20 },
  labelDato: { fontSize: 10, color: "rgba(237,235,230,0.35)" },
  valorDato: { fontSize: 16, color: T.jade, fontFamily: T.mono },
};