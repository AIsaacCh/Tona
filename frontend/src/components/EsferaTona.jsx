// EsferaTona.jsx — con respiración al hablar
import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import vozService from "../services/vozService";

const CX = 250;
const CY = 250;
const D2R = Math.PI / 180;

function ePoint(rx, ry, tiltDeg, angleDeg) {
  const a = angleDeg * D2R;
  const t = tiltDeg * D2R;
  const lx = rx * Math.cos(a);
  const ly = ry * Math.sin(a);
  return {
    x: CX + lx * Math.cos(t) - ly * Math.sin(t),
    y: CY + lx * Math.sin(t) + ly * Math.cos(t),
  };
}

function buildArc(rx, ry, tilt, startDeg, endDeg, steps = 60) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const angle = startDeg + ((endDeg - startDeg) * i) / steps;
    const p = ePoint(rx, ry, tilt, angle);
    d += `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)} `;
  }
  return d.trim();
}

function buildTicks(rx, ry, tilt, startDeg, endDeg, count, len = 8) {
  let d = "";
  for (let i = 0; i <= count; i++) {
    const angle = startDeg + ((endDeg - startDeg) * i) / count;
    const outer = ePoint(rx, ry, tilt, angle);
    const inner = ePoint(rx * 0.88, ry * 0.88, tilt, angle);
    const dx = inner.x - outer.x;
    const dy = inner.y - outer.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const tickLen = i % 5 === 0 ? len : len * 0.45;
    d += `M${outer.x.toFixed(2)},${outer.y.toFixed(2)} `;
    d += `L${(outer.x + (dx / mag) * tickLen).toFixed(2)},${(outer.y + (dy / mag) * tickLen).toFixed(2)} `;
  }
  return d.trim();
}

const LAYERS = [
  { id: "l1",  rx: 132, ry: 52, tilt: 15,  arcStart: 188, arcEnd: 322, color: "#C8A96E", width: 2.4, opacity: 0.92, floatAmp: 3.0, floatFreq: 0.00016, phaseY: 0.0,  phaseX: 1.2, satellites: [{ t: 0.18, size: 4 }, { t: 0.58, size: 3 }, { t: 0.86, size: 3.5 }] },
  { id: "l2",  rx: 92,  ry: 70, tilt: 72,  arcStart: -42, arcEnd: 62,  color: "#B8955A", width: 1.8, opacity: 0.85, floatAmp: 2.5, floatFreq: 0.00012, phaseY: 0.8,  phaseX: 2.0, satellites: [{ t: 0.32, size: 3.5 }, { t: 0.74, size: 4 }] },
  { id: "l3",  rx: 158, ry: 48, tilt: 138, arcStart: 148, arcEnd: 258, color: "#A07840", width: 1.4, opacity: 0.75, floatAmp: 3.5, floatFreq: 0.00010, phaseY: 1.6,  phaseX: 0.4, satellites: [{ t: 0.28, size: 3 }, { t: 0.65, size: 2.5 }] },
  { id: "l4",  rx: 104, ry: 78, tilt: 48,  arcStart: 198, arcEnd: 292, color: "#956830", width: 1.2, opacity: 0.68, floatAmp: 2.0, floatFreq: 0.00013, phaseY: 2.4,  phaseX: 3.1, satellites: [{ t: 0.42, size: 3 }, { t: 0.82, size: 3.5 }] },
  { id: "l5",  rx: 170, ry: 62, tilt: 102, arcStart: 28,  arcEnd: 142, color: "#7A5828", width: 1.0, opacity: 0.55, floatAmp: 2.8, floatFreq: 0.00009, phaseY: 3.2,  phaseX: 1.8, satellites: [{ t: 0.5,  size: 3 }] },
  { id: "l6",  rx: 78,  ry: 85, tilt: 88,  arcStart: 248, arcEnd: 362, color: "#C8A96E", width: 0.9, opacity: 0.42, floatAmp: 2.2, floatFreq: 0.00011, phaseY: 4.0,  phaseX: 0.9, satellites: [] },
  { id: "l7",  rx: 118, ry: 60, tilt: 25,  arcStart: 30,  arcEnd: 148, color: "#B8955A", width: 1.3, opacity: 0.62, floatAmp: 2.6, floatFreq: 0.00014, phaseY: 0.5,  phaseX: 2.5, satellites: [{ t: 0.45, size: 3 }] },
  { id: "l8",  rx: 145, ry: 55, tilt: 162, arcStart: 200, arcEnd: 310, color: "#9A6A38", width: 1.1, opacity: 0.58, floatAmp: 3.2, floatFreq: 0.00008, phaseY: 1.1,  phaseX: 3.8, satellites: [{ t: 0.3,  size: 2.5 }, { t: 0.7, size: 3 }] },
  { id: "l9",  rx: 182, ry: 58, tilt: 55,  arcStart: 160, arcEnd: 300, color: "#6A5020", width: 0.7, opacity: 0.38, floatAmp: 2.4, floatFreq: 0.00007, phaseY: 2.0,  phaseX: 1.1, satellites: [] },
  { id: "l10", rx: 88,  ry: 90, tilt: 115, arcStart: -30, arcEnd: 75,  color: "#A07840", width: 0.8, opacity: 0.45, floatAmp: 2.0, floatFreq: 0.00015, phaseY: 3.6,  phaseX: 4.2, satellites: [{ t: 0.55, size: 2.5 }] },
];

export default function EsferaTona({ size = 500, className = "" }) {
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const sizeAnimRef = useRef(null);
  const unsubscribeRef = useRef(null);
  
  // ✅ Estado para controlar la animación de tamaño
  const [escala, setEscala] = useState(1);
  const [estaHablando, setEstaHablando] = useState(false);

  const layerData = LAYERS.map((layer) => {
    const arcMain  = buildArc(layer.rx, layer.ry, layer.tilt, layer.arcStart, layer.arcEnd);
    const arcInner = buildArc(layer.rx * 0.90, layer.ry * 0.86, layer.tilt, layer.arcStart + 8, layer.arcEnd - 8);
    const arcOuter = buildArc(layer.rx * 1.04, layer.ry * 1.04, layer.tilt, layer.arcStart + 4, layer.arcEnd - 4);
    const ticks    = buildTicks(layer.rx, layer.ry, layer.tilt, layer.arcStart, layer.arcEnd, 22, 8);
    const accentS  = buildArc(layer.rx, layer.ry, layer.tilt, layer.arcStart, layer.arcStart + 12, 6);
    const accentE  = buildArc(layer.rx, layer.ry, layer.tilt, layer.arcEnd - 12, layer.arcEnd, 6);
    const satPos   = layer.satellites.map(({ t }) => {
      const angle = layer.arcStart + (layer.arcEnd - layer.arcStart) * t;
      return ePoint(layer.rx, layer.ry, layer.tilt, angle);
    });
    return { ...layer, arcMain, arcInner, arcOuter, ticks, accentS, accentE, satPos };
  });

  // ✅ Suscribirse a los estados de vozService con el nuevo sistema
  useEffect(() => {
    // Suscribirse a cambios de estado
    unsubscribeRef.current = vozService.suscribirEstado((estado) => {
      console.log('🔊 Esfera recibió estado:', estado);
      const hablando = estado === "hablando" || estado === "escuchando" || estado === "procesando";
      setEstaHablando(hablando);
      
      // Si está hablando o escuchando, animar tamaño
      if (hablando) {
        // Cancelar animación anterior
        if (sizeAnimRef.current) {
          anime.remove(sizeAnimRef.current);
        }
        
        // Si está procesando, pulso más suave
        const amplitud = estado === "procesando" ? 1.04 : 1.08;
        const duracion = estado === "procesando" ? 600 : 800;
        
        // Crear nueva animación de "respiración"
        sizeAnimRef.current = anime({
          targets: { val: 1 },
          val: [1, amplitud, 1],
          duration: duracion,
          loop: true,
          easing: "easeInOutSine",
          update: function(anim) {
            setEscala(anim.animatables[0].currentValue);
          }
        });
      } else {
        // Volver al tamaño normal
        if (sizeAnimRef.current) {
          anime.remove(sizeAnimRef.current);
          sizeAnimRef.current = null;
        }
        
        // Animación suave de regreso
        anime({
          targets: { val: escala },
          val: [escala, 1],
          duration: 400,
          easing: "easeOutQuad",
          update: function(anim) {
            setEscala(anim.animatables[0].currentValue);
          }
        });
      }
    });

    return () => {
      // Desuscribirse
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (sizeAnimRef.current) {
        anime.remove(sizeAnimRef.current);
        sizeAnimRef.current = null;
      }
    };
  }, []);

  // ✅ Animación de flotación y capas (sin cambios)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const groupEls = LAYERS.map((l) => svg.querySelector(`#group-${l.id}`));
    const ringEl   = svg.querySelector("#nuc-ring");

    anime({
      targets: "#nuc-halo",
      r: [24, 40, 24],
      opacity: [0.04, 0.15, 0.04],
      duration: 4000,
      loop: true,
      easing: "easeInOutSine",
    });
    anime({
      targets: "#nuc-core",
      r: [4, 7.5, 4],
      opacity: [0.7, 1, 0.7],
      duration: 2600,
      loop: true,
      easing: "easeInOutQuad",
    });

    LAYERS.forEach((layer) => {
      layer.satellites.forEach(({ size: sz }, i) => {
        anime({
          targets: `#sat-${layer.id}-${i}`,
          r: [sz * 0.65, sz * 1.35, sz * 0.65],
          opacity: [0.3, 0.95, 0.3],
          duration: 2200 + i * 300 + LAYERS.indexOf(layer) * 150,
          loop: true,
          delay: i * 450,
          easing: "easeInOutSine",
        });
      });
    });

    anime({
      targets: ".ray",
      strokeDashoffset: [anime.setDashoffset, 0],
      opacity: [0, 0.42],
      duration: 2000,
      delay: anime.stagger(100, { start: 300 }),
      easing: "easeOutCubic",
    });

    let ringAngle = 0;

    function tick(ts) {
      ringAngle += 0.18;
      if (ringEl) ringEl.setAttribute("transform", `rotate(${ringAngle},${CX},${CY})`);

      LAYERS.forEach((layer, idx) => {
        const el = groupEls[idx];
        if (!el) return;
        const ty = Math.sin(ts * layer.floatFreq * Math.PI * 2 + layer.phaseY) * layer.floatAmp;
        const tx = Math.sin(ts * layer.floatFreq * Math.PI * 2 * 0.6 + layer.phaseX) * layer.floatAmp * 0.4;
        el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      anime.remove(["#nuc-halo", "#nuc-core", ".ray"]);
      LAYERS.forEach((layer) => {
        layer.satellites.forEach((_, i) => anime.remove(`#sat-${layer.id}-${i}`));
      });
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: "block",
        transform: `scale(${escala})`,
        transformOrigin: "center center",
        transition: "transform 0.05s ease",
        willChange: "transform",
      }}
      className={className}
      aria-label="Esfera TONA"
      role="img"
    >
      <defs>
        <radialGradient id="gNuc" cx="36%" cy="30%" r="68%">
          <stop offset="0%"   stopColor="#F5EDD5" />
          <stop offset="25%"  stopColor="#D4A85A" />
          <stop offset="60%"  stopColor="#6A3A10" />
          <stop offset="100%" stopColor="#080A08" />
        </radialGradient>
        <radialGradient id="gAmbient" cx="50%" cy="50%">
          <stop offset="0%"   stopColor="#C8A96E" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#0A0C0E" stopOpacity="0" />
        </radialGradient>
        <filter id="fNuc" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="7" result="b1" />
          <feGaussianBlur stdDeviation="2.5" result="b2" in="SourceGraphic" />
          <feMerge>
            <feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="fSat" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={CX} cy={CY} r="220" fill="url(#gAmbient)" />

      {layerData.flatMap((layer) =>
        layer.satPos.map((pos, i) => (
          <line
            key={`ray-${layer.id}-${i}`}
            id={`ray-${layer.id}-${i}`}
            className="ray"
            x1={CX} y1={CY}
            x2={pos.x} y2={pos.y}
            stroke={layer.color}
            strokeWidth="0.7"
            strokeDasharray="4 6"
            opacity="0"
          />
        ))
      )}

      {[...layerData].reverse().map((layer) => (
        <g
          key={layer.id}
          id={`group-${layer.id}`}
          style={{ willChange: "transform" }}
        >
          <path d={layer.arcOuter} fill="none" stroke={layer.color} strokeWidth="0.4" strokeLinecap="round" opacity="0.13" />
          <path d={layer.arcMain}  fill="none" stroke={layer.color} strokeWidth={layer.width} strokeLinecap="round" opacity={layer.opacity} />
          <path d={layer.arcInner} fill="none" stroke={layer.color} strokeWidth="0.6" strokeLinecap="round" opacity="0.22" />
          <path d={layer.ticks}    fill="none" stroke={layer.color} strokeWidth="0.5" strokeLinecap="round" opacity="0.34" />
          <path d={layer.accentS}  fill="none" stroke="#EED898" strokeWidth="3.0" strokeLinecap="round" opacity="0.88" />
          <path d={layer.accentE}  fill="none" stroke="#EED898" strokeWidth="1.6" strokeLinecap="round" opacity="0.40" />
        </g>
      ))}

      {layerData.flatMap((layer) =>
        layer.satPos.map((pos, i) => (
          <circle
            key={`sat-${layer.id}-${i}`}
            id={`sat-${layer.id}-${i}`}
            cx={pos.x} cy={pos.y}
            r={layer.satellites[i].size}
            fill="#E8D090"
            opacity="0.4"
            filter="url(#fSat)"
          />
        ))
      )}

      <circle id="nuc-halo" cx={CX} cy={CY} r="26" fill="none" stroke="#C8A96E" strokeWidth="1.2" opacity="0.05" filter="url(#fNuc)" />
      <circle cx={CX} cy={CY} r="20" fill="#060808" />
      <circle cx={CX} cy={CY} r="20" fill="url(#gNuc)" filter="url(#fNuc)" />
      <circle cx={CX} cy={CY} r="20" fill="none" stroke="#C8A96E" strokeWidth="0.5" opacity="0.28" />
      <g id="nuc-ring">
        <circle cx={CX} cy={CY} r="24" fill="none" stroke="#C8A96E" strokeWidth="0.5" strokeDasharray="2 9" opacity="0.18" />
      </g>
      <circle id="nuc-core" cx={CX} cy={CY} r="5" fill="#F5EDD5" opacity="0.88" filter="url(#fNuc)" />
      <circle cx={CX - 6} cy={CY - 7} r="2.5" fill="white" opacity="0.5" />
      <circle cx={CX - 4} cy={CY - 5} r="1.0" fill="white" opacity="0.85" />
    </svg>
  );
}