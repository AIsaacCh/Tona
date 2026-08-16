import { useEffect, useRef } from "react";
import anime from "animejs";
import { proyectar, puntosAPath } from "../../utils/isometrico";
import { T } from "../../tokens";

const RADIO_ESFERA = 22;
const Y_TOPE = 220;
const Y_PISO = -220;
const ANCHO_TUBO = 90;

function Tubo({ ancho, yArriba, yAbajo }) {
  const hw = ancho / 2;
  const esquinasArriba = [[-hw, yArriba, -hw], [hw, yArriba, -hw], [hw, yArriba, hw], [-hw, yArriba, hw]];
  const esquinasAbajo = esquinasArriba.map(([x, y, z]) => [x, yAbajo, z]);
  return (
    <g stroke={`${T.jade}30`} strokeWidth="1" fill="none">
      <path d={puntosAPath(esquinasArriba, true)} />
      <path d={puntosAPath(esquinasAbajo, true)} />
      {esquinasArriba.map((p, i) => {
        const a = proyectar(...p);
        const b = proyectar(...esquinasAbajo[i]);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
    </g>
  );
}

function BaseConAnillos({ radio }) {
  const anillos = [1, 0.65, 0.35];
  return (
    <g stroke={`${T.jade}50`} fill="none" strokeWidth="1">
      {anillos.map((f, i) => {
        const puntos = Array.from({ length: 48 }, (_, k) => {
          const ang = (k / 48) * Math.PI * 2;
          return [Math.cos(ang) * radio * f, 0, Math.sin(ang) * radio * f];
        });
        return <path key={i} d={puntosAPath(puntos, true)} opacity={0.4 + i * 0.2} />;
      })}
    </g>
  );
}

function Esfera({ radio, color }) {
  const segmentos = 40;
  const anilloXY = Array.from({ length: segmentos }, (_, k) => {
    const a = (k / segmentos) * Math.PI * 2;
    return [Math.cos(a) * radio, Math.sin(a) * radio, 0];
  });
  const anilloXZ = Array.from({ length: segmentos }, (_, k) => {
    const a = (k / segmentos) * Math.PI * 2;
    return [Math.cos(a) * radio, 0, Math.sin(a) * radio];
  });
  return (
    <g stroke={color} strokeWidth="1.3" fill="none" opacity={0.85}>
      <path d={puntosAPath(anilloXY, true)} />
      <path d={puntosAPath(anilloXZ, true)} />
    </g>
  );
}

export default function CaidaLibreIsometrico({ trayectoria, medioId, cayendo }) {
  const grupoEsferaRef = useRef(null);
  const colorEsfera = medioId === "agua" ? T.turquesa : T.jade;

  useEffect(() => {
    // ✅ Si no hay trayectoria o el ref no está listo, no hacer nada
    if (!trayectoria || trayectoria.length === 0 || !grupoEsferaRef.current) return;

    const alturaInicial = trayectoria[0].y || 1;
    const anim = { progreso: 0 };

    anime({
      targets: anim,
      progreso: 1,
      duration: Math.min(3200, Math.max(1200, trayectoria[trayectoria.length - 1].t * 900)),
      easing: "linear",
      update: () => {
        // ✅ Verificar que el ref siga existiendo durante la animación
        if (!grupoEsferaRef.current) return;
        
        const idx = Math.min(
          trayectoria.length - 1,
          Math.floor(anim.progreso * (trayectoria.length - 1))
        );
        const punto = trayectoria[idx];
        const fraccionAltura = punto.y / alturaInicial;
        const yVisual = Y_PISO + fraccionAltura * (Y_TOPE - Y_PISO);
        const p = proyectar(0, yVisual, 0);
        grupoEsferaRef.current.setAttribute("transform", `translate(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
      },
    });
  }, [trayectoria]);

  return (
    <svg
      viewBox="-160 -280 320 560"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", maxHeight: 440, overflow: "hidden", display: "block" }}
    >
      <Tubo ancho={ANCHO_TUBO} yArriba={Y_TOPE + 30} yAbajo={Y_PISO} />

      <g ref={grupoEsferaRef} transform={`translate(${proyectar(0, Y_TOPE, 0).x}, ${proyectar(0, Y_TOPE, 0).y})`}>
        <Esfera radio={RADIO_ESFERA} color={colorEsfera} />
      </g>

      <g transform={`translate(${proyectar(0, Y_PISO, 0).x}, ${proyectar(0, Y_PISO, 0).y})`}>
        <BaseConAnillos radio={55} />
      </g>
    </svg>
  );
}