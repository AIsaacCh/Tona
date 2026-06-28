import { useRef, useState, useCallback } from "react";
import { T } from "../tokens";
import React from "react";


const ACCENT = {
  productividad: T.copal,
  academico:     T.jade,
  info:          T.turquesa,
  agente:        T.copal,
};

export default function WidgetShell({
  id,
  titulo,
  categoria = "productividad",
  x = 100,
  y = 100,
  size = "md",
  onClose,
  onMove,
  onResize,
  children,
  childrenSm,
}) {
  const dragRef   = useRef(null);
  const isDragging = useRef(false);
  const offset     = useRef({ x: 0, y: 0 });
  const accent     = ACCENT[categoria] || T.copal;
  const dims       = size === "sm" ? T.W_SM : T.W_MD;

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.target.closest("[data-no-drag]")) return;
    isDragging.current = true;
    offset.current = {
      x: e.clientX - x,
      y: e.clientY - y,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    e.preventDefault();
  }, [x, y]);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    onMove?.(id, e.clientX - offset.current.x, e.clientY - offset.current.y);
  }, [id, onMove]);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup",   onMouseUp);
  }, [onMouseMove]);

  return (
    <div
      ref={dragRef}
      onMouseDown={onMouseDown}
      style={{
        position:    "absolute",
        left:        x,
        top:         y,
        width:       dims.w,
        height:      dims.h,
        background:  "rgba(10,12,14,0.88)",
        border:      `1px solid ${accent}22`,
        borderTop:   `1px solid ${accent}55`,
        borderRadius: 14,
        backdropFilter: "blur(12px)",
        display:     "flex",
        flexDirection: "column",
        overflow:    "hidden",
        cursor:      "grab",
        userSelect:  "none",
        zIndex:      100,
        boxShadow:   `0 4px 32px rgba(0,0,0,0.5), 0 0 0 0.5px ${accent}18`,
        transition:  "width 0.3s ease, height 0.3s ease",
        willChange:  "transform",
      }}
    >
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "10px 14px 8px",
        borderBottom:   `1px solid ${accent}18`,
        flexShrink:     0,
        cursor:         "grab",
      }}>
        <span style={{
          fontSize:      9,
          letterSpacing: "1.5px",
          color:         `${accent}99`,
          fontFamily:    T.mono,
          textTransform: "uppercase",
        }}>
          {titulo}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }} data-no-drag>
          {/* Toggle tamaño */}
          <button
            onClick={() => onResize?.(id, size === "sm" ? "md" : "sm")}
            style={btnStyle(accent)}
            title={size === "sm" ? "Expandir" : "Compactar"}
          >
            {size === "sm" ? "⊞" : "⊟"}
          </button>
          {/* Cerrar */}
          <button
            onClick={() => onClose?.(id)}
            style={btnStyle(T.amaranto)}
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{
        flex:     1,
        overflow: "hidden",
        padding:  "12px 14px",
      }}>
        {size === "sm" && childrenSm ? childrenSm : children}
      </div>

      {/* Borde inferior de acento */}
      <div style={{
        height:     1,
        background: `linear-gradient(90deg, transparent, ${accent}33, transparent)`,
        flexShrink: 0,
      }} />
    </div>
  );
}

function btnStyle(color) {
  return {
    background:  "transparent",
    border:      "none",
    color:       `${color}66`,
    fontSize:    11,
    cursor:      "pointer",
    padding:     "2px 4px",
    lineHeight:  1,
    transition:  "color 0.2s",
  };
}