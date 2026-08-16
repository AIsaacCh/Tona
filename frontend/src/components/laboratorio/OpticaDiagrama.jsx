import { useEffect, useRef } from "react";
import anime from "animejs";
import { T } from "../../tokens";

// Compresión asintótica — mismo principio que usamos en el resorte: sin
// importar qué tan grande sea la distancia real (di puede dispararse cerca
// de la singularidad óptica), el dibujo nunca se sale del área contenida.
const ESCALA_MAX = 150;
const TASA_COMPRESION = 55;

function distanciaVisual(cm) {
  const signo = Math.sign(cm) || 1;
  const magnitud = ESCALA_MAX * (1 - Math.exp(-Math.abs(cm) / TASA_COMPRESION));
  return signo * magnitud;
}

const ESCALA_ALTURA_MAX = 70;
const TASA_ALTURA = 20;
function alturaVisual(cm) {
  const signo = Math.sign(cm) || 1;
  const magnitud = ESCALA_ALTURA_MAX * (1 - Math.exp(-Math.abs(cm) / TASA_ALTURA));
  return signo * magnitud;
}

function SimboloLente({ tipo, altura }) {
  const puntas = tipo === "convergente"
    ? [[-8, -altura], [0, -altura], [8, -altura], [-8, altura], [0, altura], [8, altura]]
    : [[8, -altura], [0, -altura], [-8, -altura], [8, altura], [0, altura], [-8, altura]];

  return (
    <g stroke={T.jade} strokeWidth="1.6" fill="none">
      <line x1="0" y1={-altura} x2="0" y2={altura} />
      {/* Flechas de apertura (convergente) o cierre (divergente) en cada extremo */}
      <polyline points={`${puntas[0][0]},${puntas[0][1]} ${puntas[1][0]},${puntas[1][1]} ${puntas[2][0]},${puntas[2][1]}`} />
      <polyline points={`${puntas[3][0]},${puntas[3][1]} ${puntas[4][0]},${puntas[4][1]} ${puntas[5][0]},${puntas[5][1]}`} />
    </g>
  );
}

export default function OpticaDiagrama({ resultado }) {
  const grupoRef = useRef(null);

  useEffect(() => {
    if (!grupoRef.current) return;
    anime({
      targets: grupoRef.current,
      opacity: [0.3, 1],
      duration: 500,
      easing: "easeOutQuart",
    });
  }, [resultado]);

  if (!resultado) {
    return <div style={{ color: "rgba(237,235,230,0.3)", fontSize: 12, padding: 40 }}>Ajusta los parámetros para ver el trazado.</div>;
  }

  const {
    distancia_focal_cm: f,
    distancia_objeto_cm: doReal,
    altura_objeto_cm: hoReal,
    distancia_imagen_cm: diReal,
    altura_imagen_cm: hiReal,
    tipo_imagen,
  } = resultado;

  const esVirtual = tipo_imagen === "virtual";

  const xObjeto = -distanciaVisual(doReal);
  const yObjeto = -alturaVisual(hoReal);
  const xImagen = distanciaVisual(diReal);   // el signo real de di ya indica el lado correcto
  const yImagen = -alturaVisual(hiReal);
  const xFocoDer = distanciaVisual(Math.abs(f));
  const xFocoIzq = -distanciaVisual(Math.abs(f));

  const alturaLente = 85;

  return (
    <svg viewBox="-190 -110 380 220" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "auto", maxHeight: 340 }}>
      <g ref={grupoRef}>
        {/* Eje óptico */}
        <line x1="-180" y1="0" x2="180" y2="0" stroke="rgba(237,235,230,0.15)" strokeWidth="1" />

        {/* Focos */}
        <circle cx={xFocoDer} cy="0" r="3" fill="none" stroke={`${T.jade}88`} strokeWidth="1" />
        <circle cx={xFocoIzq} cy="0" r="3" fill="none" stroke={`${T.jade}88`} strokeWidth="1" />
        <text x={xFocoDer} y="16" fontSize="9" fill="rgba(237,235,230,0.35)" textAnchor="middle">F</text>
        <text x={xFocoIzq} y="16" fontSize="9" fill="rgba(237,235,230,0.35)" textAnchor="middle">F'</text>

        {/* Lente */}
        <SimboloLente tipo={resultado.lente_tipo} altura={alturaLente} />

        {/* Objeto — flecha vertical sólida */}
        <line x1={xObjeto} y1="0" x2={xObjeto} y2={yObjeto} stroke={T.turquesa} strokeWidth="2" />
        <polygon
          points={`${xObjeto - 4},${yObjeto + 8} ${xObjeto + 4},${yObjeto + 8} ${xObjeto},${yObjeto}`}
          fill={T.turquesa}
        />

        {/* Rayo 1: paralelo al eje desde el objeto, luego hacia la imagen (o su extensión) */}
        <line x1={xObjeto} y1={yObjeto} x2="0" y2={yObjeto} stroke={`${T.jade}90`} strokeWidth="1" strokeDasharray={esVirtual ? "4 3" : "none"} />
        <line x1="0" y1={yObjeto} x2={xImagen} y2={yImagen} stroke={`${T.jade}90`} strokeWidth="1" strokeDasharray={esVirtual ? "4 3" : "none"} />

        {/* Rayo 2: a través del centro de la lente, sin desviarse */}
        <line x1={xObjeto} y1={yObjeto} x2={xImagen} y2={yImagen} stroke={`${T.jade}55`} strokeWidth="1" strokeDasharray={esVirtual ? "4 3" : "none"} />

        {/* Imagen — flecha vertical, punteada si es virtual, sólida si es real */}
        <line
          x1={xImagen} y1="0" x2={xImagen} y2={yImagen}
          stroke={esVirtual ? "#F5C87A" : T.jade}
          strokeWidth="2"
          strokeDasharray={esVirtual ? "5 3" : "none"}
        />
        <polygon
          points={`${xImagen - 4},${yImagen + (yImagen < 0 ? 8 : -8)} ${xImagen + 4},${yImagen + (yImagen < 0 ? 8 : -8)} ${xImagen},${yImagen}`}
          fill={esVirtual ? "#F5C87A" : T.jade}
          opacity={esVirtual ? 0.7 : 1}
        />
      </g>
    </svg>
  );
}