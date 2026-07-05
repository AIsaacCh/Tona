// components/MicTona.jsx
import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import vozService from "../services/vozService";
import { agenteBus } from "../components/AgenteTona";

export default function MicTona({ size = 120, onToggle, userId = "demo" }) {
  const [estadoVoz, setEstadoVoz] = useState("reposo");
  const svgRef          = useRef(null);
  const rafRef          = useRef(null);
  const activeRef       = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = vozService.suscribirEstado((estado) => {
      setEstadoVoz(estado);
      const isActive = estado === "escuchando" || estado === "hablando";
      if (isActive !== activeRef.current) {
        isActive ? activarAnimaciones() : desactivarAnimaciones();
        activeRef.current = isActive;
        onToggle?.(isActive);
      }
    });
    return () => unsubscribe?.();
  }, [onToggle]);

  useEffect(() => {
    return agenteBus.on("enviar_texto_usuario", async ({ texto }) => {
      if (!texto?.trim()) return;
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      try {
        await vozService.enviarMensaje(userId, texto);
      } catch (e) {
        console.error("Error enviando texto desde widget:", e);
        agenteBus.emit("flash", { mensaje: "Error al procesar", tipo: "error" });
      } finally {
        isProcessingRef.current = false;
      }
    });
  }, [userId]);

  const activarAnimaciones = () => {
    const svg = svgRef.current;
    if (!svg) return;

    anime({
      targets: "#mic-oval",
      translateY: [-6, 0],
      duration: 500,
      easing: "easeOutElastic(1, 0.5)",
    });

    anime({
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
        const wave  = Math.sin(t);
        const wave2 = Math.sin(t * 1.3 + 1.2);
        stop1.setAttribute("stop-opacity", (0.3 + wave  * 0.25).toFixed(3));
        stop2.setAttribute("stop-opacity", (0.7 + wave2 * 0.3 ).toFixed(3));
        stop3.setAttribute("stop-opacity", (0.2 + wave  * 0.2 ).toFixed(3));
        const grad = svg.querySelector("#liquidGrad");
        if (grad) grad.setAttribute("cy", `${38 + wave * 12}%`);
      }
      const halo = svg.querySelector("#mic-halo");
      if (halo) {
        const pulse = 0.06 + Math.abs(Math.sin(t * 0.8)) * 0.12;
        halo.setAttribute("opacity", pulse.toFixed(3));
      }
      rafRef.current = requestAnimationFrame(liquidTick);
    }
    rafRef.current = requestAnimationFrame(liquidTick);

    anime({ targets: "#mic-fill", opacity: [0, 1], duration: 400, easing: "easeOutQuad" });
  };

  const desactivarAnimaciones = () => {
    cancelAnimationFrame(rafRef.current);
    anime.remove(["#mic-oval", "#mic-arc", "#mic-stem", "#mic-base"]);

    anime({ targets: "#mic-oval",  translateY: 0, strokeWidth: 3, opacity: 0.55, duration: 500, easing: "easeOutQuad" });
    anime({ targets: "#mic-arc",   strokeWidth: 3, opacity: 0.55,  duration: 500, easing: "easeOutQuad" });
    anime({ targets: ["#mic-stem", "#mic-base"], opacity: 0.4,     duration: 500, easing: "easeOutQuad" });
    anime({ targets: "#mic-fill",  opacity: 0,                     duration: 600, easing: "easeOutQuad" });
    anime({ targets: "#mic-halo",  opacity: 0,                     duration: 600, easing: "easeOutQuad" });
  };

  const handleClick = async () => {
    if (estadoVoz === "hablando") {
      vozService.detenerAudio();
      return;
    }

    if (activeRef.current) {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      vozService.detener(); // ya cancela flujoActivo internamente
      setTimeout(() => { isProcessingRef.current = false; }, 300);
      return;
    }

    if (estadoVoz === "procesando") return;
    if (isProcessingRef.current) return;

    try {
      isProcessingRef.current = true;

      if (vozService.escuchando) {
        vozService.detener();
        setTimeout(() => { isProcessingRef.current = false; }, 300);
        return;
      }

      const texto = await vozService.activar(userId);

      if (texto?.trim()) {
        await vozService.enviarMensaje(userId, texto);
      }
    } catch (error) {
      console.error("❌ Error en micrófono:", error);
      if (error?.name === "InvalidStateError") {
        vozService.detener();
        setTimeout(() => {
          isProcessingRef.current = false;
          handleClick();
        }, 500);
        return;
      }
      setEstadoVoz("error");
      setTimeout(() => setEstadoVoz("reposo"), 2000);
    } finally {
      setTimeout(() => { isProcessingRef.current = false; }, 500);
    }
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      anime.remove(["#mic-oval", "#mic-arc", "#mic-stem", "#mic-base", "#mic-fill", "#mic-halo"]);
    };
  }, []);

  const colorActive  = "#C8A96E";
  const colorIdle    = "rgba(237,235,230,0.55)";
  const isActive     = estadoVoz === "escuchando" || estadoVoz === "hablando";
  const isError      = estadoVoz === "error";
  const isProcesando = estadoVoz === "procesando";
  const colorActual  = isError ? "#F87171" : (isActive ? colorActive : colorIdle);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      onClick={handleClick}
      style={{
        display: "block",
        cursor: isProcesando ? "wait" : "pointer",
        overflow: "visible",
        opacity: isProcesando ? 0.6 : 1,
        transition: "opacity 0.2s ease",
      }}
      aria-label={isActive ? "Detener micrófono" : "Activar micrófono"}
      role="button"
    >
      <defs>
        <radialGradient id="liquidGrad" cx="50%" cy="38%" r="60%">
          <stop id="lg-stop1" offset="0%"   stopColor="#EED898" stopOpacity="0" />
          <stop id="lg-stop2" offset="50%"  stopColor="#C8A96E" stopOpacity="0" />
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

      <rect
        id="mic-halo"
        x="30" y="6" width="40" height="56" rx="20" ry="20"
        fill="none"
        stroke={isError ? "#F87171" : colorActive}
        strokeWidth="6"
        opacity="0"
        filter="url(#fHalo)"
      />

      <rect
        id="mic-fill"
        x="32" y="8" width="36" height="52" rx="18" ry="18"
        fill="url(#liquidGrad)"
        opacity="0"
        clipPath="url(#ovalClip)"
      />

      <rect
        id="mic-oval"
        x="32" y="8" width="36" height="52" rx="18" ry="18"
        fill="none"
        stroke={colorActual}
        strokeWidth="3"
        opacity={isActive ? 1 : 0.55}
        filter={isActive ? "url(#fMicGlow)" : undefined}
        style={{ willChange: "transform" }}
      />

      <line x1="42" y1="26" x2="56" y2="26" stroke={colorActual} strokeWidth="2" strokeLinecap="round" opacity={isActive ? 0.7 : 0.35} />
      <line x1="42" y1="34" x2="56" y2="34" stroke={colorActual} strokeWidth="2" strokeLinecap="round" opacity={isActive ? 0.5 : 0.25} />

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

      <line
        id="mic-stem"
        x1="50" y1="72" x2="50" y2="82"
        stroke={colorActual} strokeWidth="3" strokeLinecap="round"
        opacity={isActive ? 0.7 : 0.4}
      />
      <rect
        id="mic-base"
        x="36" y="82" width="28" height="4" rx="2" ry="2"
        fill={colorActual}
        opacity={isActive ? 0.7 : 0.4}
      />

      {isProcesando && (
        <text x="50" y="96" textAnchor="middle" fill="#C8A96E" fontSize="8" fontFamily="'JetBrains Mono', monospace" opacity="0.6">
          ···
        </text>
      )}
      {isError && (
        <text x="50" y="96" textAnchor="middle" fill="#F87171" fontSize="8" fontFamily="'JetBrains Mono', monospace" opacity="0.8">
          error
        </text>
      )}
    </svg>
  );
}