import { useEffect, useRef } from "react";
import anime from "animejs";
import { animate } from "motion";
import { proyectar, puntosAPath } from "../../utils/isometrico";
import { generarHelicoide } from "../../utils/helicoide";
import { T } from "../../tokens";

// ── Geometría fija — estos valores garantizan que TODO quepa siempre
// dentro del viewBox, sin importar qué tan grande sea la deformación real ──
const Y_TAPA = 120;
const ALTURA_BASE = 170;          // longitud del resorte en reposo (visual)
const EXTENSION_VISUAL_MAX = 95;  // el resorte nunca se estira visualmente más que esto
const TASA_COMPRESION = 45;       // qué tan rápido se acerca al límite asintótico
const RADIO_HELICE = 20;
const VUELTAS = 8;
const SEGMENTOS_POR_VUELTA = 28;
const LADO_MASA = 56;             // antes RADIO_MASA=34, ahora es el lado del cubo
const ALTURA_MASA = 60;
const PROFUNDIDAD_ANCLAJE = 22;   // cuánto "entra" el resorte dentro del cubo, visualmente
const Y_BASE_CAJA = Y_TAPA + 15;
const ALTO_CAJA = 360;
const Y_PISO_CAJA = Y_BASE_CAJA - ALTO_CAJA;

// Rigidez/amortiguación del spring visual según el estado físico —
// más rebote (damping bajo) conforme el material se acerca a la ruptura
const SPRING_POR_ESTADO = {
  segura: { stiffness: 260, damping: 22, mass: 1 },
  fluencia: { stiffness: 220, damping: 14, mass: 1 },
  ruptura: { stiffness: 180, damping: 8, mass: 1.1 },
};

// Comprime la deformación real (que puede ser 5cm o 500cm) a un rango visual
// acotado — se acerca a EXTENSION_VISUAL_MAX pero JAMÁS lo excede, así el
// resorte nunca puede salirse del área contenida, sin importar la física.
function alturaVisualDesdeDeformacion(deformacionCm) {
  const factor = 1 - Math.exp(-Math.max(0, deformacionCm) / TASA_COMPRESION);
  return ALTURA_BASE + EXTENSION_VISUAL_MAX * factor;
}
// Afina el radio de la última vuelta de la espiral para que converja
// visualmente en el punto de anclaje, en vez de cortar en seco con el
// mismo radio que el resto del resorte. Es puramente cosmético — no
// toca la física de generarHelicoide, solo transforma los puntos ya
// generados antes de dibujarlos.
// Convierte el tramo final de la espiral en un gancho recto que cae
// directo al centro — en vez de seguir girando con radio decreciente
// (que visualmente sigue leyéndose como bobina), corta el giro y traza
// una línea recta desde el final de la última vuelta hasta el punto
// de anclaje. Puramente cosmético — no toca generarHelicoide.
// Convierte el tramo final de la espiral en una argolla pequeña y
// cerrada — el radio se contrae suavemente desde RADIO_HELICE hasta
// un radio mínimo fijo (no cero) y se mantiene ahí una vuelta extra,
// dibujando un aro real en vez de solo apuntar hacia el centro.
// Puramente cosmético — no toca generarHelicoide.
function convertirExtremoEnArgolla(puntos, radioArgolla = 5, fraccionContraccion = 0.12) {
  const n = puntos.length;
  const inicioContraccion = Math.floor(n * (1 - fraccionContraccion));

  return puntos.map(([x, y, z], i) => {
    if (i < inicioContraccion) return [x, y, z];

    const t = (i - inicioContraccion) / Math.max(1, n - 1 - inicioContraccion); // 0 → 1
    // Interpola el radio de RADIO_HELICE hacia radioArgolla, conservando
    // el ángulo (x,z) que ya trae la hélice — así sigue girando, solo
    // que con un radio cada vez menor hasta estabilizarse en el aro.
    const radioActual = RADIO_HELICE + (radioArgolla - RADIO_HELICE) * Math.min(1, t * 1.4);
    const anguloOriginal = Math.atan2(z, x);
    return [
      Math.cos(anguloOriginal) * radioActual,
      y,
      Math.sin(anguloOriginal) * radioActual,
    ];
  });
}

function CajaVidrio({ ancho, alto, profundo, yBase }) {
  const hw = ancho / 2, hd = profundo / 2;
  const esquinasArriba = [
    [-hw, yBase, -hd], [hw, yBase, -hd], [hw, yBase, hd], [-hw, yBase, hd],
  ];
  const esquinasAbajo = esquinasArriba.map(([x, y, z]) => [x, y - alto, z]);
  const pathTapa = puntosAPath(esquinasArriba, true);
  const pathBase = puntosAPath(esquinasAbajo, true);

  return (
    <g stroke={`${T.jade}70`} strokeWidth="1.2" fill="none">
      <path d={pathTapa} />
      <path d={pathBase} />
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

// Interpola linealmente entre dos puntos 2D ya proyectados — como la
// proyección isométrica es afín, interpolar en pantalla sigue siendo
// correcto para dibujar líneas sobre una cara plana.
function interpolarPunto(pA, pB, t) {
  return { x: pA.x + (pB.x - pA.x) * t, y: pA.y + (pB.y - pA.y) * t };
}

// Finas líneas horizontales sobre una cara — simulan metal cepillado
function VetasMetal({ pArribaA, pArribaB, pAbajoA, pAbajoB, color, n = 5 }) {
  const lineas = Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    const izq = interpolarPunto(pArribaA, pAbajoA, t);
    const der = interpolarPunto(pArribaB, pAbajoB, t);
    return { izq, der };
  });
  return (
    <g stroke={color} strokeWidth="0.6" opacity="0.18">
      {lineas.map((l, i) => (
        <line key={i} x1={l.izq.x} y1={l.izq.y} x2={l.der.x} y2={l.der.y} />
      ))}
    </g>
  );
}

function CuboMasa({ lado, altura, color }) {
  const hl = lado / 2;
  // 0: atrás-izq | 1: atrás-der | 2: frente-der | 3: frente-izq
  const arriba = [[-hl, 0, -hl], [hl, 0, -hl], [hl, 0, hl], [-hl, 0, hl]];
  const abajo = arriba.map(([x, y, z]) => [x, y - altura, z]);

  const proyArriba = arriba.map((p) => proyectar(...p));
  const proyAbajo = abajo.map((p) => proyectar(...p));

  const cara = (iA, iB) => {
    const p1 = proyArriba[iA], p2 = proyArriba[iB];
    const p3 = proyAbajo[iB], p4 = proyAbajo[iA];
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`;
  };

  const pTapa = proyectar(0, 0, 0); // centro exacto de la tapa — ancla del resorte

  return (
    <g>
      <defs>
        <linearGradient
          id="gradCaraFrente"
          gradientUnits="userSpaceOnUse"
          x1={proyArriba[3].x} y1={proyArriba[3].y}
          x2={proyAbajo[2].x} y2={proyAbajo[2].y}
        >
          <stop offset="0%" stopColor="#0a1216" />
          <stop offset="55%" stopColor="#16262c" />
          <stop offset="100%" stopColor="#060b0d" />
        </linearGradient>
        <linearGradient
          id="gradCaraDer"
          gradientUnits="userSpaceOnUse"
          x1={proyArriba[1].x} y1={proyArriba[1].y}
          x2={proyAbajo[2].x} y2={proyAbajo[2].y}
        >
          <stop offset="0%" stopColor="#20353d" />
          <stop offset="45%" stopColor="#284450" />
          <stop offset="100%" stopColor="#0e1a1f" />
        </linearGradient>
        <linearGradient
          id="gradTapa"
          gradientUnits="userSpaceOnUse"
          x1={proyArriba[0].x} y1={proyArriba[0].y}
          x2={proyArriba[2].x} y2={proyArriba[2].y}
        >
          <stop offset="0%" stopColor="#25404a" />
          <stop offset="50%" stopColor="#33555f" />
          <stop offset="100%" stopColor="#182a30" />
        </linearGradient>
        <radialGradient id="gradTornillo" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#eaf6f2" stopOpacity="0.9" />
          <stop offset="35%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor="#04100f" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* cara frontal — antes faltaba, dejaba el hueco visible en la esquina */}
      <path d={cara(3, 2)} fill="url(#gradCaraFrente)" stroke={color} strokeWidth="1" strokeOpacity={0.5} />
      <VetasMetal pArribaA={proyArriba[3]} pArribaB={proyArriba[2]} pAbajoA={proyAbajo[3]} pAbajoB={proyAbajo[2]} color={color} />

      {/* cara derecha — con luz */}
      <path d={cara(1, 2)} fill="url(#gradCaraDer)" stroke={color} strokeWidth="1" strokeOpacity={0.5} />
      <VetasMetal pArribaA={proyArriba[1]} pArribaB={proyArriba[2]} pAbajoA={proyAbajo[1]} pAbajoB={proyAbajo[2]} color={color} />

      {/* tapa superior */}
      <path d={puntosAPath(arriba, true)} fill="url(#gradTapa)" stroke={color} strokeWidth="1.3" />

      {/* sombra de contacto + collar + tornillo, exactamente en (0,0,0) */}
      <ellipse cx={pTapa.x} cy={pTapa.y + 2} rx="12" ry="5.5" fill="#000" opacity="0.35" />
      <ellipse cx={pTapa.x} cy={pTapa.y} rx="10.5" ry="5" fill="none" stroke={color} strokeWidth="1.4" opacity="0.85" />
      <ellipse cx={pTapa.x} cy={pTapa.y} rx="6.5" ry="3.1" fill="#0c1a1c" stroke={color} strokeWidth="0.8" opacity="0.9" />
      <circle cx={pTapa.x} cy={pTapa.y} r="3.6" fill="url(#gradTornillo)" stroke={color} strokeWidth="0.6" />
    </g>
  );
}

export default function ResorteIsometrico({ deformacionCm = 0, estado = "segura" }) {
  const colorEstado = { segura: T.jade, fluencia: "#F5C87A", ruptura: "#E05A5A" }[estado] || T.jade;

  const blurRef = useRef(null);
  const grupoRef = useRef(null);
  const pathResorteRef = useRef(null);
  const pathResorteBrilloRef = useRef(null);
  const ganchoAbajoRef = useRef(null);
  const grupoMasaRef = useRef(null);
  const vastagoRef = useRef(null);
  const gradFadeRef = useRef(null);

  // Valor animado internamente — Motion interpola esto frame a frame con un
  // spring físico real, y en cada frame regeneramos la geometría real e
  // imponemos los atributos directo al DOM (sin pasar por setState de React).
  const animRef = useRef({ altura: alturaVisualDesdeDeformacion(0) });

  function actualizarGeometria(alturaActual) {
    const puntosHelice = convertirExtremoEnArgolla(
      generarHelicoide({
        radio: RADIO_HELICE, vueltas: VUELTAS, altura: alturaActual, segmentosPorVuelta: SEGMENTOS_POR_VUELTA,
      })
    );
    const puntosResorte3d = puntosHelice.map(([x, y, z]) => [x, Y_TAPA - y, z]);

    if (pathResorteRef.current) {
      pathResorteRef.current.setAttribute("d", puntosAPath(puntosResorte3d));
    }
    if (pathResorteBrilloRef.current) {
      pathResorteBrilloRef.current.setAttribute("d", puntosAPath(puntosResorte3d));
    }

    const yFinResorte = Y_TAPA - alturaActual;

    if (ganchoAbajoRef.current) {
      const p = proyectar(0, yFinResorte, 0);
      ganchoAbajoRef.current.setAttribute("cx", p.x.toFixed(2));
      ganchoAbajoRef.current.setAttribute("cy", p.y.toFixed(2));
    }

    if (grupoMasaRef.current) {
      // Calculamos el offset ya en espacio de pantalla (proyectado), no en
      // espacio 3D crudo — así garantizamos que el origen local del cubo
      // (donde está el collar/argolla) caiga EXACTAMENTE sobre el punto
      // donde termina la espiral, sin depender de cómo escale proyectar()
      // el eje Y internamente.
      const pAncla = proyectar(0, yFinResorte, 0);
      const pOrigenCubo = proyectar(0, 0, 0);
      const dx = pAncla.x - pOrigenCubo.x;
      const dy = pAncla.y - pOrigenCubo.y;
      grupoMasaRef.current.setAttribute("transform", `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    }

    // Vástago visible que se desvanece dentro del cubo
    const pIniVastago = proyectar(0, yFinResorte, 0);
    const pFinVastago = proyectar(0, yFinResorte - PROFUNDIDAD_ANCLAJE, 0);

    if (vastagoRef.current) {
      vastagoRef.current.setAttribute(
        "d",
        `M ${pIniVastago.x.toFixed(2)} ${pIniVastago.y.toFixed(2)} L ${pFinVastago.x.toFixed(2)} ${pFinVastago.y.toFixed(2)}`
      );
    }
    if (gradFadeRef.current) {
      gradFadeRef.current.setAttribute("x1", pIniVastago.x.toFixed(2));
      gradFadeRef.current.setAttribute("y1", pIniVastago.y.toFixed(2));
      gradFadeRef.current.setAttribute("x2", pFinVastago.x.toFixed(2));
      gradFadeRef.current.setAttribute("y2", pFinVastago.y.toFixed(2));
    }
  }

  // Primer render — pinta la geometría inicial sin animación
  useEffect(() => {
    actualizarGeometria(animRef.current.altura);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animación del glow holograma - respiración del blur (más sutil) — se queda en anime.js
  useEffect(() => {
    anime({
      targets: blurRef.current,
      stdDeviation: [0.4, 0.9],
      duration: 2200,
      easing: "easeInOutSine",
      direction: "alternate",
      loop: true,
    });
  }, []);

  // Animación de los nodos brillantes — se queda en anime.js
  useEffect(() => {
    anime({
      targets: ".nodo-brillante",
      opacity: [0.55, 1],
      duration: 1500,
      direction: "alternate",
      loop: true,
      easing: "easeInOutQuad",
    });
  }, []);

  // Cada vez que cambia la deformación real, anima suavemente hacia el nuevo
  // valor usando un spring físico de Motion (masa-resorte-amortiguador real,
  // no una curva de easing simulada) — el motor correcto para animar Ley de Hooke.
  useEffect(() => {
    const destino = alturaVisualDesdeDeformacion(deformacionCm);
    const spring = SPRING_POR_ESTADO[estado] || SPRING_POR_ESTADO.segura;

    const controls = animate(animRef.current.altura, destino, {
      type: "spring",
      stiffness: spring.stiffness,
      damping: spring.damping,
      mass: spring.mass,
      onUpdate: (latest) => {
        animRef.current.altura = latest;
        actualizarGeometria(latest);
      },
    });

    if (pathResorteRef.current) {
      animate(
        pathResorteRef.current,
        { stroke: colorEstado },
        { duration: 0.4, ease: "easeOut" }
      );
    }
    if (pathResorteBrilloRef.current) {
      animate(
        pathResorteBrilloRef.current,
        { stroke: "#eaf6f2" },
        { duration: 0.4, ease: "easeOut" }
      );
    }

    if (estado === "ruptura" && grupoRef.current) {
      anime({
        targets: grupoRef.current,
        translateX: [0, -3, 3, -2, 2, 0],
        duration: 350,
        easing: "easeInOutSine",
      });
    }

    return () => controls.stop();
  }, [deformacionCm, estado, colorEstado]);

  return (
    <svg
      viewBox="-200 -260 400 620"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", maxHeight: 440, overflow: "hidden", display: "block" }}
    >
      <defs>
        <filter id="glowHolograma" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur ref={blurRef} stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient ref={gradFadeRef} id="fadeVastago" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colorEstado} stopOpacity="1" />
          <stop offset="100%" stopColor={colorEstado} stopOpacity="0" />
        </linearGradient>
      </defs>

      <g ref={grupoRef}>
        <CajaVidrio ancho={200} alto={ALTO_CAJA} profundo={200} yBase={Y_BASE_CAJA} />

        {/* el cubo va PRIMERO ahora — queda detrás de la espiral */}
        <g ref={grupoMasaRef}>
          <CuboMasa lado={LADO_MASA} altura={ALTURA_MASA} color={colorEstado} />
        </g>

        {/* vástago que se desvanece dentro del metal */}
        <path ref={vastagoRef} d="" stroke="url(#fadeVastago)" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* base del alambre — ahora se dibuja DESPUÉS del cubo, así la argolla
            queda visualmente al frente, agarrando el tornillo */}
        <path
          ref={pathResorteRef}
          d=""
          fill="none"
          stroke={colorEstado}
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#glowHolograma)"
        />

        <path
          ref={pathResorteBrilloRef}
          d=""
          fill="none"
          stroke="#eaf6f2"
          strokeWidth="0.7"
          strokeOpacity="0.55"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle 
          className="nodo-brillante" 
          cx={proyectar(0, Y_TAPA, 0).x} 
          cy={proyectar(0, Y_TAPA, 0).y} 
          r="4" 
          fill="none" 
          stroke={colorEstado} 
          strokeWidth="1.3" 
          filter="url(#glowHolograma)" 
        />
        <circle 
          ref={ganchoAbajoRef} 
          className="nodo-brillante" 
          r="4" 
          fill="none" 
          stroke={colorEstado}
          strokeWidth="1.3" 
          filter="url(#glowHolograma)" 
        />

        <g transform={`translate(${proyectar(0, Y_PISO_CAJA, 0).x}, ${proyectar(0, Y_PISO_CAJA, 0).y})`}>
          <BaseConAnillos radio={55} />
        </g>
      </g>
    </svg>
  );
}