// components/MicTona.jsx
import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import vozService from "../services/vozService";

export default function MicTona({ size = 120, onToggle, userId = "demo" }) {
  const [active, setActive] = useState(false);
  const [estadoVoz, setEstadoVoz] = useState("reposo");
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  const activeRef = useRef(false);
  const glowAnim = useRef(null);
  const bounceAnim = useRef(null);
  const isProcessingRef = useRef(false); // ✅ Prevenir múltiples llamadas

  // ✅ Suscribirse a los estados de vozService
  useEffect(() => {
    const unsubscribe = vozService.suscribirEstado((estado) => {
      setEstadoVoz(estado);
      
      const isActive = estado === "escuchando" || estado === "hablando";
      
      // Solo actualizar si cambió el estado
      if (isActive !== activeRef.current) {
        if (isActive) {
          activarAnimaciones();
        } else {
          desactivarAnimaciones();
        }
        activeRef.current = isActive;
        setActive(isActive);
        onToggle?.(isActive);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onToggle]);

  // ✅ Función para activar animaciones
  const activarAnimaciones = () => {
    const svg = svgRef.current;
    if (!svg) return;

    bounceAnim.current = anime({
      targets: "#mic-oval",
      translateY: [-6, 0],
      duration: 500,
      easing: "easeOutElastic(1, 0.5)",
    });

    glowAnim.current = anime({
      targets: "#mic-oval",
      strokeWidth: [3, 5, 3],
      opacity: [0.9, 1, 0.9],
      duration: 1800,
      loop: true,
      easing: "easeInOutSine",
    });

    anime({
      targets: "#mic-arc",
      strokeWidth: [3, 4.5, 3],
      opacity: [0.9, 1, 0.9],
      duration: 1800,
      loop: true,
      easing: "easeInOutSine",
    });

    anime({
      targets: ["#mic-stem", "#mic-base"],
      opacity: [0.5, 0.7],
      duration: 600,
      easing: "easeOutQuad",
    });

    let t = 0;
    function liquidTick() {
      if (!activeRef.current) return;
      t += 0.025;
      const stop1 = svg.querySelector("#lg-stop1");
      const stop2 = svg.querySelector("#lg-stop2");
      const stop3 = svg.querySelector("#lg-stop3");
      if (stop1 && stop2 && stop3) {
        const wave = Math.sin(t);
        const wave2 = Math.sin(t * 1.3 + 1.2);
        stop1.setAttribute("stop-opacity", (0.3 + wave * 0.25).toFixed(3));
        stop2.setAttribute("stop-opacity", (0.7 + wave2 * 0.3).toFixed(3));
        stop3.setAttribute("stop-opacity", (0.2 + wave * 0.2).toFixed(3));
        const grad = svg.querySelector("#liquidGrad");
        if (grad) {
          grad.setAttribute("cy", `${38 + wave * 12}%`);
        }
      }
      const halo = svg.querySelector("#mic-halo");
      if (halo) {
        const pulse = 0.06 + Math.abs(Math.sin(t * 0.8)) * 0.12;
        halo.setAttribute("opacity", pulse.toFixed(3));
      }
      rafRef.current = requestAnimationFrame(liquidTick);
    }
    rafRef.current = requestAnimationFrame(liquidTick);

    anime({
      targets: "#mic-fill",
      opacity: [0, 1],
      duration: 400,
      easing: "easeOutQuad",
    });
  };

  // ✅ Función para desactivar animaciones
  const desactivarAnimaciones = () => {
    cancelAnimationFrame(rafRef.current);

    anime.remove(["#mic-oval", "#mic-arc", "#mic-stem", "#mic-base"]);

    anime({
      targets: "#mic-oval",
      translateY: 0,
      strokeWidth: 3,
      opacity: 0.55,
      duration: 500,
      easing: "easeOutQuad",
    });

    anime({
      targets: "#mic-arc",
      strokeWidth: 3,
      opacity: 0.55,
      duration: 500,
      easing: "easeOutQuad",
    });

    anime({
      targets: ["#mic-stem", "#mic-base"],
      opacity: 0.4,
      duration: 500,
      easing: "easeOutQuad",
    });

    anime({
      targets: "#mic-fill",
      opacity: 0,
      duration: 600,
      easing: "easeOutQuad",
    });

    anime({
      targets: "#mic-halo",
      opacity: 0,
      duration: 600,
      easing: "easeOutQuad",
    });
  };

  // ✅ Click: inicia/desactiva la escucha
  const handleClick = async () => {
    // Evitar múltiples clics mientras se procesa
    if (isProcessingRef.current) {
      console.log("⏳ Ya está procesando, espera...");
      return;
    }

    // Si está activo, detener
    if (activeRef.current) {
      isProcessingRef.current = true;
      vozService.detener();
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
      return;
    }

    // Si está hablando, detener audio
    if (estadoVoz === "hablando") {
      vozService.detenerAudio();
      return;
    }

    // Iniciar escucha
    try {
      isProcessingRef.current = true;
      
      // ✅ Verificar si ya está escuchando
      if (vozService.escuchando) {
        console.log("⚠️ Ya está escuchando, deteniendo...");
        vozService.detener();
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 300);
        return;
      }

      const texto = await vozService.activar(userId);
      
      if (texto?.trim()) {
        // Enviar al chat
        await vozService.enviarMensaje(userId, texto);
      }
    } catch (error) {
      console.error("❌ Error en micrófono:", error);
      // Si el error es "recognition already started", simplemente detener y resetear
      if (error?.name === 'InvalidStateError') {
        console.log("🔄 Reiniciando reconocimiento...");
        vozService.detener();
        // Intentar de nuevo después de un breve momento
        setTimeout(() => {
          isProcessingRef.current = false;
          handleClick();
        }, 500);
        return;
      }
      setEstadoVoz("error");
      setTimeout(() => setEstadoVoz("reposo"), 2000);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };

  // Efecto de limpieza
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      anime.remove(["#mic-oval", "#mic-arc", "#mic-stem", "#mic-base", "#mic-fill", "#mic-halo"]);
    };
  }, []);

  const colorActive = "#C8A96E";
  const colorIdle = "rgba(237,235,230,0.55)";

  const isActive = estadoVoz === "escuchando" || estadoVoz === "hablando";
  const isError = estadoVoz === "error";
  const colorActual = isError ? "#F87171" : (isActive ? colorActive : colorIdle);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      onClick={handleClick}
      style={{ display: "block", cursor: "pointer", overflow: "visible" }}
      aria-label={isActive ? "Desactivar micrófono" : "Activar micrófono"}
      role="button"
    >
      <defs>
        <radialGradient id="liquidGrad" cx="50%" cy="38%" r="60%">
          <stop id="lg-stop1" offset="0%" stopColor="#EED898" stopOpacity="0" />
          <stop id="lg-stop2" offset="50%" stopColor="#C8A96E" stopOpacity="0" />
          <stop id="lg-stop3" offset="100%" stopColor="#8A6030" stopOpacity="0" />
        </radialGradient>

        <filter id="fMicGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="fHalo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id="ovalClip">
          <rect x="32" y="8" width="36" height="52" rx="18" ry="18" />
        </clipPath>
      </defs>

      {/* Halo exterior */}
      <rect
        id="mic-halo"
        x="30" y="6" width="40" height="56"
        rx="20" ry="20"
        fill="none"
        stroke={isError ? "#F87171" : colorActive}
        strokeWidth="6"
        opacity="0"
        filter="url(#fHalo)"
      />

      {/* Relleno líquido */}
      <rect
        id="mic-fill"
        x="32" y="8" width="36" height="52"
        rx="18" ry="18"
        fill="url(#liquidGrad)"
        opacity="0"
        clipPath="url(#ovalClip)"
      />

      {/* Contorno del ovalo */}
      <rect
        id="mic-oval"
        x="32" y="8" width="36" height="52"
        rx="18" ry="18"
        fill="none"
        stroke={colorActual}
        strokeWidth="3"
        opacity={isActive ? 1 : 0.55}
        filter={isActive ? "url(#fMicGlow)" : undefined}
        style={{ willChange: "transform" }}
      />

      {/* Líneas internas */}
      <line x1="42" y1="26" x2="56" y2="26" stroke={colorActual} strokeWidth="2" strokeLinecap="round" opacity={isActive ? 0.7 : 0.35} />
      <line x1="42" y1="34" x2="56" y2="34" stroke={colorActual} strokeWidth="2" strokeLinecap="round" opacity={isActive ? 0.5 : 0.25} />

      {/* Arco inferior */}
      <path
        id="mic-arc"
        d="M 28 52 Q 28 72 50 72 Q 72 72 72 52"
        fill="none"
        stroke={colorActual}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={isActive ? 1 : 0.55}
        filter={isActive ? "url(#fMicGlow)" : undefined}
      />

      {/* Base */}
      <line
        id="mic-stem"
        x1="50" y1="72" x2="50" y2="82"
        stroke={colorActual}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={isActive ? 0.7 : 0.4}
      />
      <rect
        id="mic-base"
        x="36" y="82" width="28" height="4"
        rx="2" ry="2"
        fill={colorActual}
        opacity={isActive ? 0.7 : 0.4}
      />

      {/* Indicador de estado */}
      {estadoVoz === "procesando" && (
        <text x="50" y="96" textAnchor="middle" fill="#C8A96E" fontSize="8" fontFamily="'DM Sans', sans-serif" opacity="0.6">
          ...
        </text>
      )}
      {estadoVoz === "error" && (
        <text x="50" y="96" textAnchor="middle" fill="#F87171" fontSize="8" fontFamily="'DM Sans', sans-serif" opacity="0.8">
          error
        </text>
      )}
    </svg>
  );
}