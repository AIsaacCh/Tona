import { useState, useEffect, useCallback } from "react";
import { T } from "../../tokens";
import OpticaDiagrama from "./OpticaDiagrama";

const API = import.meta.env.VITE_API_URL;

const COLOR_TIPO = { real: T.jade, virtual: "#F5C87A" };

export default function OpticaGeometrica({ userId }) {
  const [lentes, setLentes] = useState([]);
  const [lenteId, setLenteId] = useState("");
  const [f, setF] = useState(15);
  const [distanciaObjeto, setDistanciaObjeto] = useState(30);
  const [alturaObjeto, setAlturaObjeto] = useState(5);
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/laboratorio/optica/lentes`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setLentes(data.lentes || []);
        if (data.lentes?.length) {
          setLenteId(data.lentes[0].id);
          setF(data.lentes[0].f_default);
        }
      })
      .catch(() => setError("No se pudieron cargar los lentes."));
  }, []);

  const simular = useCallback(async () => {
    if (!lenteId) return;
    setCargando(true);
    setError("");
    try {
      const resp = await fetch(`${API}/laboratorio/optica/simular`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lente_id: lenteId, f, distancia_objeto: distanciaObjeto, altura_objeto: alturaObjeto }),
      });
      if (!resp.ok) throw new Error("Error en la simulación");
      const data = await resp.json();
      setResultado(data);
    } catch (e) {
      setError("No se pudo calcular la simulación. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [lenteId, f, distanciaObjeto, alturaObjeto]);

  useEffect(() => { if (lenteId) simular(); }, [lenteId]);

  const lenteActivo = lentes.find((l) => l.id === lenteId);

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.panelIzquierdo}>
        <div style={estilos.tituloSeccion}>PARÁMETROS DE SIMULACIÓN</div>

        <label style={estilos.label}>Tipo de lente</label>
        <select
          value={lenteId}
          onChange={(e) => {
            const l = lentes.find((ll) => ll.id === e.target.value);
            setLenteId(e.target.value);
            if (l) setF(l.f_default);
          }}
          style={estilos.select}
        >
          {lentes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>

        <label style={estilos.label}>Distancia focal (cm)</label>
        <input type="range" min={lenteActivo?.f_min ?? -40} max={lenteActivo?.f_max ?? 40} step={0.5}
          value={f} onChange={(e) => setF(parseFloat(e.target.value))} style={estilos.slider} />
        <div style={estilos.valorSlider}>{f.toFixed(1)} cm</div>

        <label style={estilos.label}>Distancia del objeto (cm)</label>
        <input type="range" min={1} max={80} step={0.5}
          value={distanciaObjeto} onChange={(e) => setDistanciaObjeto(parseFloat(e.target.value))} style={estilos.slider} />
        <div style={estilos.valorSlider}>{distanciaObjeto.toFixed(1)} cm</div>

        <label style={estilos.label}>Altura del objeto (cm)</label>
        <input type="range" min={0.5} max={20} step={0.5}
          value={alturaObjeto} onChange={(e) => setAlturaObjeto(parseFloat(e.target.value))} style={estilos.slider} />
        <div style={estilos.valorSlider}>{alturaObjeto.toFixed(1)} cm</div>

        <button onClick={simular} disabled={cargando} style={estilos.botonAplicar}>
          {cargando ? "Calculando..." : "Aplicar cambios"}
        </button>

        {error && <div style={estilos.error}>{error}</div>}
      </div>

      <div style={estilos.panelCentro}>
        <OpticaDiagrama resultado={resultado} />
        {resultado && (
          <div style={{ ...estilos.chip, borderColor: `${COLOR_TIPO[resultado.tipo_imagen]}55`, color: COLOR_TIPO[resultado.tipo_imagen] }}>
            Imagen {resultado.tipo_imagen} · {resultado.orientacion} · {resultado.tamano}
          </div>
        )}
      </div>

      <div style={estilos.panelDerecho}>
        <div style={estilos.tituloSeccion}>ECUACIÓN DEL LENTE DELGADO</div>
        <div style={estilos.formula}>1/f = 1/dₒ + 1/dᵢ</div>

        {resultado && (
          <>
            <div style={estilos.grid2}>
              <div><div style={estilos.labelDato}>Distancia imagen</div><div style={estilos.valorDato}>{resultado.distancia_imagen_cm} cm</div></div>
              <div><div style={estilos.labelDato}>Altura imagen</div><div style={estilos.valorDato}>{resultado.altura_imagen_cm} cm</div></div>
            </div>
            <div style={estilos.grid2}>
              <div><div style={estilos.labelDato}>Aumento (m)</div><div style={estilos.valorDato}>{resultado.aumento}×</div></div>
              <div><div style={estilos.labelDato}>Tipo de lente</div><div style={{ ...estilos.valorDato, fontSize: 12 }}>{resultado.lente_tipo}</div></div>
            </div>
          </>
        )}

        <div style={estilos.notaAyuda}>
          Rayo turquesa: objeto. Rayo sólido jade: imagen real. Rayo punteado ámbar: imagen virtual (no se forma físicamente, solo se percibe).
        </div>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: { display: "flex", gap: 24, padding: 24, color: "rgba(237,235,230,0.85)", fontFamily: T.sans },
  panelIzquierdo: { width: 220, display: "flex", flexDirection: "column", gap: 6 },
  panelCentro: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, justifyContent: "center" },
  panelDerecho: { width: 300, display: "flex", flexDirection: "column", gap: 12 },
  tituloSeccion: { fontSize: 10, letterSpacing: "1px", color: "rgba(237,235,230,0.35)", fontFamily: T.mono, marginTop: 8 },
  label: { fontSize: 11, color: "rgba(237,235,230,0.4)", marginTop: 10 },
  select: { background: "rgba(237,235,230,0.04)", border: `1px solid ${T.jade}25`, borderRadius: 8, padding: "8px", color: "rgba(237,235,230,0.85)", fontSize: 12 },
  slider: { width: "100%" },
  valorSlider: { fontSize: 11, color: T.jade, fontFamily: T.mono },
  botonAplicar: { marginTop: 16, background: `${T.jade}18`, border: `1px solid ${T.jade}45`, borderRadius: 10, padding: "10px", color: T.jade, fontSize: 12, cursor: "pointer" },
  error: { fontSize: 11, color: "#E05A5A", marginTop: 8 },
  chip: { border: "1px solid", borderRadius: 20, padding: "8px 16px", fontSize: 12 },
  formula: { fontSize: 16, fontFamily: T.serif, color: "rgba(237,235,230,0.9)" },
  grid2: { display: "flex", gap: 20 },
  labelDato: { fontSize: 10, color: "rgba(237,235,230,0.35)" },
  valorDato: { fontSize: 16, color: T.jade, fontFamily: T.mono },
  notaAyuda: { fontSize: 10, color: "rgba(237,235,230,0.3)", lineHeight: 1.6, marginTop: 12 },
};