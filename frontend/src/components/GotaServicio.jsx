import { useEffect, useRef, useState } from 'react'
import { animate } from 'animejs'

const N = 10

const ICONOS_SVG = {
  gmail: (
    <svg viewBox="52 42 88 66" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
      <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
      <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
      <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
      <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
    </svg>
  ),
  classroom: (
    <svg viewBox="0 0 578.9 500" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#0F9D58" d="M52.6,52.6h473.7v394.7H52.6V52.6z"/>
      <path fill="#57BB8A" d="M394.7,263.2c16.4,0,29.6-13.3,29.6-29.6s-13.3-29.6-29.6-29.6s-29.6,13.3-29.6,29.6S378.4,263.2,394.7,263.2z M394.7,282.9c-31.7,0-65.8,16.8-65.8,37.6v21.6h131.6v-21.6C460.5,299.7,426.4,282.9,394.7,282.9z M184.2,263.2c16.4,0,29.6-13.3,29.6-29.6s-13.3-29.6-29.6-29.6s-29.6,13.3-29.6,29.6S167.9,263.2,184.2,263.2z M184.2,282.9c-31.7,0-65.8,16.8-65.8,37.6v21.6H250v-21.6C250,299.7,215.9,282.9,184.2,282.9z"/>
      <path fill="#F7F7F7" d="M289.5,236.8c21.8,0,39.5-17.7,39.4-39.5c0-21.8-17.7-39.5-39.5-39.4c-21.8,0-39.4,17.7-39.4,39.5C250,219.2,267.7,236.8,289.5,236.8z M289.5,263.2c-44.4,0-92.1,23.6-92.1,52.6v26.3h184.2v-26.3C381.6,286.7,333.9,263.2,289.5,263.2z"/>
      <path fill="#F4B400" d="M539.5,0h-500C17.7,0,0,17.7,0,39.5v421.1C0,482.3,17.7,500,39.5,500h500c21.8,0,39.5-17.7,39.5-39.5V39.5C578.9,17.7,561.3,0,539.5,0z M526.3,447.4H52.6V52.6h473.7V447.4z"/>
    </svg>
  ),
  drive: (
    <svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
      <path fill="#FFF" d="M9.7 15.5V8.5l6.3 3.5z"/>
    </svg>
  ),
  notion: (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path d="M6.017 4.313l55.333-4.087c6.797-.583 8.543-.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277-1.553 6.807-6.99 7.193L24.467 99.967c-4.08.193-6.023-.39-8.16-3.113L3.3 79.94C.967 76.827 0 74.497 0 71.773V11.113c0-3.497 1.553-6.413 6.017-6.8z" fill="#fff"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M61.35.227L6.017 4.313C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257-3.89c5.433-.387 6.99-2.917 6.99-7.193V20.64c0-2.21-.873-2.847-3.443-4.733L74.167 3.143C69.893.037 68.147-.357 61.35.227zM25.92 19.523c-5.247.353-6.437.433-9.417-1.99L8.927 11.507c-.77-.78-.383-1.753 1.557-1.947l53.193-3.887c4.467-.39 6.793 1.167 8.54 2.527l9.123 6.61c.39.197 1.36 1.36.193 1.36l-54.933 3.307-.68.047zM19.803 88.3V30.367c0-2.53.777-3.697 3.103-3.893L86 22.78c2.14-.193 3.107 1.167 3.107 3.693v57.547c0 2.53-.39 4.67-3.883 4.863l-60.377 3.5c-3.493.193-5.043-.97-5.043-4.083zm59.6-54.827c.387 1.75 0 3.5-1.75 3.7l-2.91.577v42.773c-2.527 1.36-4.853 2.137-6.797 2.137-3.107 0-3.883-.973-6.21-3.887L41.907 48.833v28.967l6.02 1.363s0 3.5-4.857 3.5l-13.39.777c-.39-.78 0-2.723 1.357-3.11l3.497-.97v-38.3L30.48 40.667c-.39-1.75.58-4.277 3.3-4.473l14.367-.967 19.8 30.327V38.724l-5.047-.58c-.39-2.143 1.163-3.7 3.103-3.89l13.4-.78z" fill="#000"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#1A73E8" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
      <path fill="#FBBC04" d="M7 11h5v5H7z"/>
    </svg>
  ),
  docs: (
    <svg viewBox="0 0 87 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#4285f4" d="M55 0H8.7C4 0 0 4 0 8.7v82.6C0 96 4 100 8.7 100h69.6c4.7 0 8.7-4 8.7-8.7V27.4L66 13.7z"/>
      <path fill="#a1c2fa" d="M55 0v18.7c0 4.7 4 8.7 8.7 8.7H87z"/>
      <path fill="#fff" d="M21.7 50h43.6v6.5H21.7zm0 13h43.6v6.5H21.7zm0 13h28v6.5h-28z"/>
    </svg>
  ),
  sheets: (
    <svg viewBox="0 0 87 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#0F9D58" d="M55 0H8.7C4 0 0 4 0 8.7v82.6C0 96 4 100 8.7 100h69.6c4.7 0 8.7-4 8.7-8.7V27.4L66 13.7z"/>
      <path fill="#87ceac" d="M55 0v18.7c0 4.7 4 8.7 8.7 8.7H87z"/>
      <path fill="#fff" d="M21.7 47h43.6v30H21.7zm14.5 0v30m14.6-30v30M21.7 62h43.6"/>
    </svg>
  ),
  meet: (
    <svg viewBox="0 0 87 70" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <path fill="#00832d" d="M58 26v18H30V26z"/>
      <path fill="#0066da" d="M58 26h14v18H58z"/>
      <path fill="#e94235" d="M58 8 44 26h14z"/>
      <path fill="#2684fc" d="M30 26v18l-14 9V17z"/>
      <path fill="#00ac47" d="M58 44H30l-14 9h56z"/>
      <path fill="#ffba00" d="M72 26V17l-14 9z"/>
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <circle cx="12" cy="12" r="10" fill="#4285F4" />
      <path fill="#fff" d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 5.3-5.3 1.4 1.4z"/>
    </svg>
  ),
}

function buildPath(cx, cy, radii) {
  const pts = radii.map((r, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
  })
  let d = ''
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % N]
    const p3 = pts[(i + 2) % N]
    if (i === 0) d += `M${p1.x},${p1.y} `
    const cp1x = p1.x + (p2.x - p0.x) / 5
    const cp1y = p1.y + (p2.y - p0.y) / 5
    const cp2x = p2.x - (p3.x - p1.x) / 5
    const cp2y = p2.y - (p3.y - p1.y) / 5
    d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y} `
  }
  return d + 'Z'
}

export default function GotaServicio({
  color = '#1D9E75',
  colorOscuro = '#0F6E56',
  label = 'Classroom',
  serviceId = 'classroom',
  size = 96,
  activo = false,
  onClick,
}) {
  const pathRef = useRef(null)
  const clipPathRef = useRef(null)
  const svgWrapRef = useRef(null)
  const rafRef = useRef(null)

  const fisica = useRef({
    viscosidad: 0.99,
    gravX: 0.0,
    gravY: 0.012,
    radioBase: size * 0.34,
    radioNoise: size * 0.022,
  })

  const estado = useRef({
    radii: Array.from({ length: N }, () => size * 0.34),
    vel: Array.from({ length: N }, () => 0),
    fase: 0,
    vx: 0,
    vy: 0,
    cx: size / 2,
    cy: size / 2,
  })

  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const loop = () => {
      const f = fisica.current
      const e = estado.current
      if (!pathRef.current) { rafRef.current = requestAnimationFrame(loop); return }

      e.fase += 0.018

      for (let i = 0; i < N; i++) {
        const angulo = (i / N) * Math.PI * 2 - Math.PI / 2
        const vecX = Math.cos(angulo)
        const vecY = Math.sin(angulo)
        const noise = Math.sin(e.fase * 1.3 + i * 1.9) * 0.4
          + Math.cos(e.fase * 0.7 + i * 2.3) * 0.25
        const gravDeform = (vecX * f.gravX + vecY * f.gravY) * f.radioBase * 0.8
        const target = f.radioBase + noise * f.radioNoise + gravDeform
        const fuerza = (target - e.radii[i]) * 0.18
        e.vel[i] = e.vel[i] * f.viscosidad + fuerza
        e.radii[i] += e.vel[i]
      }

      e.vx *= f.viscosidad
      e.vy *= f.viscosidad
      e.cx = size / 2 + e.vx
      e.cy = size / 2 + e.vy

      const d = buildPath(e.cx, e.cy, e.radii)
      pathRef.current.setAttribute('d', d)
      if (clipPathRef.current) clipPathRef.current.setAttribute('d', d)

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [size])

  const handleMouseEnter = () => {
    setHovering(true)
    animate(fisica.current, {
      viscosidad: 0.90,
      gravX: 0.025,
      gravY: 0.025,
      radioNoise: size * 0.065,
      duration: 1800,
      easing: 'easeInOutQuad',
    })
    estado.current.vx += (Math.random() - 0.5) * size * 0.06
    estado.current.vy += (Math.random() - 0.5) * size * 0.06
    animate(svgWrapRef.current, {
      scale: 1.08,
      duration: 500,
      easing: 'easeOutElastic(1, 0.5)',
    })
  }

  const handleMouseLeave = () => {
    setHovering(false)
    animate(fisica.current, {
      viscosidad: 0.99,
      gravX: 0.0,
      gravY: 0.012,
      radioNoise: size * 0.022,
      duration: 2200,
      easing: 'easeOutQuart',
    })
    animate(svgWrapRef.current, {
      scale: 1,
      duration: 800,
      easing: 'easeOutElastic(1, 0.4)',
    })
  }

  const handleClick = () => {
    for (let i = 0; i < N; i++) {
      estado.current.vel[i] += (Math.random() - 0.5) * size * 0.05
    }
    estado.current.vy -= size * 0.06
    animate(svgWrapRef.current, {
      scale: [1, 0.9, 1.08, 1],
      duration: 550,
      easing: 'easeOutElastic(1, 0.7)',
    })
    onClick && onClick()
  }

  const cx = size / 2
  const cy = size / 2
  const r = fisica.current.radioBase
  const pathInicial = buildPath(cx, cy, Array(N).fill(r))
  const clipId = `clip-${serviceId}`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div
        ref={svgWrapRef}
        style={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <clipPath id={clipId}>
              <path ref={clipPathRef} d={pathInicial} />
            </clipPath>
            <radialGradient id={`bg-${serviceId}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
            </radialGradient>
          </defs>

          {/* sombra suave */}
          <path
            d={pathInicial}
            fill={colorOscuro}
            opacity="0.25"
            transform="translate(2, 4)"
            style={{ filter: 'blur(5px)' }}
          />

          {/* base de vidrio */}
          <path d={pathInicial} fill={`url(#bg-${serviceId})`} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
        </svg>

        {/* icono recortado al path orgánico */}
        <div style={{
          position: 'absolute',
          inset: 0,
          clipPath: `url(#${clipId})`,
          WebkitClipPath: `url(#${clipId})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(6px) saturate(1.4)',
        }}>
         <div style={{
  width: '42%',
  height: '42%',
  filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.45))',
  opacity: 0.92,
}}>
            {ICONOS_SVG[serviceId] || ICONOS_SVG.classroom}
          </div>

          {/* highlight especular */}
          <div style={{
            position: 'absolute',
            top: '8%', left: '12%',
            width: '50%', height: '28%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
            transform: 'rotate(-15deg)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%', right: '12%',
            width: '34%', height: '16%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* anillo activo */}
        {activo && (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
            <path
              d={pathInicial}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.6"
              transform={`scale(1.1) translate(${-size * 0.05}, ${-size * 0.05})`}
            />
          </svg>
        )}
      </div>

      <span style={{
        fontSize: '12px',
        fontWeight: 500,
        color: hovering ? color : 'rgba(220,225,220,0.78)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        letterSpacing: '0.02em',
        textShadow: '0 1px 6px rgba(0,0,0,0.7)',
        transition: 'color 0.3s ease',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  )
}