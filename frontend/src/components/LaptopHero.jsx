import { useEffect, useRef, useState } from 'react'
import anime from 'animejs'
import EsferaTona from './EsferaTona'
import LogoTona from './LogoTona'

const JADE = 'var(--jade)'
const JADE_LIGHT = 'var(--jade-light)'
const COPAL = 'var(--copal, #d4a24c)'
const OBSIDIANA = 'var(--obsidiana, #0a0a0a)'
const FONT = "'Poppins', system-ui, sans-serif"

// ─────────────────────────────────────────────────────────────────────────
// NAV
// ─────────────────────────────────────────────────────────────────────────
export function NavBar({ onEntrar }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    anime({ targets: ref.current, opacity: [0, 1], translateY: [-12, 0], duration: 700, easing: 'easeOutExpo' })
  }, [])

  const links = ['INICIO', 'CAPACIDADES', 'BENEFICIOS', 'CÓMO FUNCIONA', 'CONTACTO']

  return (
    <nav
      ref={ref}
      style={{
        position: 'sticky', top: 0, zIndex: 20, width: '100%', opacity: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 5vw', boxSizing: 'border-box',
        background: 'linear-gradient(180deg, rgba(10,10,10,0.92), rgba(10,10,10,0.75) 70%, rgba(10,10,10,0))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoTona size={20} />
        <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: 15, letterSpacing: '0.25em', color: 'rgba(237,235,230,0.9)' }}>TONA</span>
      </div>
      <div style={{ display: 'flex', gap: 32 }}>
        {links.map((l) => (
          <span key={l} style={{ fontFamily: FONT, fontSize: 11, letterSpacing: '0.12em', color: 'rgba(237,235,230,0.5)', cursor: 'pointer' }}>{l}</span>
        ))}
      </div>
      <button
        onClick={onEntrar}
        style={{
          fontFamily: FONT, fontSize: 11, letterSpacing: '0.1em', fontWeight: 500,
          padding: '10px 20px', borderRadius: 20, border: `1px solid ${JADE}55`,
          background: 'rgba(46,201,144,0.06)', color: JADE_LIGHT, cursor: 'pointer',
        }}
      >
        INICIA SESIÓN
      </button>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Contenido de la pantalla
// ─────────────────────────────────────────────────────────────────────────
function PantallaTona({ mostrarEsfera }) {
  const items = ['Inicio', 'Tareas', 'Calendario', 'Documentos', 'Correo']
  const resumen = [['Tareas pendientes', 12], ['Eventos hoy', 3], ['Correos sin leer', 8]]

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      <div style={{ width: '26%', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <LogoTona size={12} />
          <span style={{ fontSize: 9, letterSpacing: '0.15em', color: 'rgba(237,235,230,0.8)', fontFamily: FONT }}>TONA</span>
        </div>
        {items.map((item, i) => (
          <span key={item} style={{ fontSize: 8.5, color: i === 0 ? JADE_LIGHT : 'rgba(237,235,230,0.35)', fontFamily: FONT }}>{item}</span>
        ))}
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          width: '90%',
          aspectRatio: '1/1',
          borderRadius: '50%',
          background: `radial-gradient(circle at center, ${COPAL}20 0%, ${COPAL}08 40%, transparent 70%)`,
          pointerEvents: 'none',
          opacity: mostrarEsfera ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }} />

        <div style={{
          width: '80%',
          aspectRatio: '1 / 1',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: mostrarEsfera ? 1 : 0,
          transform: mostrarEsfera ? 'scale(1)' : 'scale(0.8)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <EsferaTona size={280} />
        </div>

        <div style={{ position: 'absolute', top: 10, right: 10, width: '40%', background: 'rgba(237,235,230,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 9 }}>
          <div style={{ fontSize: 7.5, color: 'rgba(237,235,230,0.5)', fontFamily: FONT, marginBottom: 6 }}>Resumen del día</div>
          {resumen.map(([label, n]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'rgba(237,235,230,0.35)', fontFamily: FONT, marginBottom: 4 }}>
              <span>{label}</span>
              <span style={{ color: JADE_LIGHT }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(115deg, rgba(255,255,255,0.05) 0%, transparent 22%, transparent 78%, rgba(255,255,255,0.025) 100%)' }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// HERO — Laptop real: pantalla + bisagra + base
// ─────────────────────────────────────────────────────────────────────────
export default function LaptopHero() {
  const textoRef = useRef(null)
  const lidRef = useRef(null)
  const screenRef = useRef(null)
  const brilloRef = useRef(null)
  const sombraRef = useRef(null)
  const reflejoRef = useRef(null)
  const baseRef = useRef(null)
  const hingeGlowRef = useRef(null)
  const sweepRef = useRef(null)
  const glowRef = useRef(null)
  const laptopGroupRef = useRef(null)

  const [mostrarEsfera, setMostrarEsfera] = useState(false)

  useEffect(() => {
    const tl = anime.timeline({ easing: 'easeOutCubic', duration: 1200 })

    // 1. Base
    tl.add({ 
      targets: baseRef.current, 
      opacity: [0, 1], 
      scaleX: [0.9, 1], 
      translateY: [14, 0], 
      duration: 600, 
      easing: 'easeOutExpo' 
    }, 60)

    // 2. Tapa
    tl.add({ 
      targets: lidRef.current, 
      opacity: [0, 1], 
      scale: [0.92, 1], 
      translateY: [20, 0], 
      duration: 700, 
      easing: 'easeOutExpo' 
    }, 100)

    // 3. Pantalla
    tl.add({ 
      targets: screenRef.current, 
      opacity: [0, 1], 
      scale: [0.98, 1], 
      duration: 500, 
      easing: 'easeOutCubic' 
    }, 350)

    // 4. Brillo
    tl.add({ 
      targets: brilloRef.current, 
      opacity: [0, 0.3], 
      duration: 600, 
      easing: 'easeOutCubic' 
    }, 300)

    // 5. Reflejo
    tl.add({ 
      targets: reflejoRef.current, 
      opacity: [0, 0.08], 
      duration: 700, 
      easing: 'easeOutCubic' 
    }, 400)

    // 6. Sombra
    tl.add({ 
      targets: sombraRef.current, 
      opacity: [0.12, 0.4], 
      scaleX: [0.8, 1], 
      duration: 650, 
      easing: 'easeOutCubic' 
    }, 200)

    // 7. Bisagra
    tl.add({ 
      targets: hingeGlowRef.current, 
      opacity: [0, 0.5], 
      duration: 500 
    }, 500)

    // 8. Glow
    tl.add({ 
      targets: glowRef.current, 
      opacity: [0, 1], 
      duration: 900 
    }, 150)

    // 9. Rotación 3D de toda la laptop - asentándose desde un ángulo más abierto
    tl.add({
      targets: laptopGroupRef.current,
      rotateY: [34, 24],
      rotateX: [-8, -4],
      duration: 900,
      easing: 'easeOutExpo',
    }, 80)

    setTimeout(() => setMostrarEsfera(true), 800)

    // Glow ambiental que "respira" muy lento
    const respiracion = anime({
      targets: glowRef.current,
      opacity: [0.55, 0.85],
      scale: [1, 1.05],
      duration: 4200,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
      delay: 1400,
    })

    return () => {
      tl.pause()
      respiracion.pause()
    }
  }, [])

  useEffect(() => {
    if (!textoRef.current) return
    anime({ targets: textoRef.current, opacity: [0, 1], translateY: [24, 0], duration: 900, delay: 300, easing: 'easeOutExpo' })
  }, [])

  return (
    <section style={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 'min(1100px, 92vw)', display: 'grid', gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.15fr)', gap: '48px', alignItems: 'center' }}>

          <div ref={textoRef} style={{ opacity: 0 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.2em', color: JADE_LIGHT, fontFamily: FONT, marginBottom: 16 }}>TU NAGUAL DIGITAL</div>
            <h1 style={{ fontFamily: FONT, fontWeight: 500, fontSize: 40, letterSpacing: '-0.01em', lineHeight: 1.18, color: 'rgba(237,235,230,0.92)', margin: 0 }}>
              Organiza tu mundo.<br />Encuentra tu <span style={{ color: JADE }}>ritmo</span>.
            </h1>
            <p style={{ marginTop: 22, maxWidth: 380, fontSize: 14, lineHeight: 1.75, letterSpacing: 'normal', color: 'rgba(237,235,230,0.45)', fontFamily: FONT, fontWeight: 300 }}>
              TONA es tu agente de estudio personal: organiza tus tareas, tu horario,
              tus documentos y tu correo — y te escucha cuando le hablas.
            </p>
          </div>

          <div style={{ perspective: 1400, perspectiveOrigin: '50% 20%', position: 'relative' }}>
          
            {/* Glow ambiental */}
            <div ref={glowRef} style={{
              position: 'absolute', top: '-8%', left: '50%', transform: 'translateX(-50%)',
              width: '95%', height: '80%', pointerEvents: 'none', opacity: 0,
              background: `radial-gradient(ellipse at center, ${COPAL}12 0%, ${JADE}08 35%, transparent 70%)`,
              filter: 'blur(2px)',
            }} />

            {/* Reflejo tenue en el "piso" */}
            <div style={{
              position: 'absolute', bottom: '-6%', left: '50%', transform: 'translateX(-50%)',
              width: '70%', height: '18%', borderRadius: '50%',
              background: `radial-gradient(ellipse at center, ${JADE}14 0%, transparent 75%)`,
              filter: 'blur(14px)', pointerEvents: 'none',
            }} />

            {/* Sombra de contacto */}
            <div ref={sombraRef} style={{
  position: 'absolute', bottom: '2%', left: '46%', width: '72%', height: 16,
  borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: 'blur(16px)',
  pointerEvents: 'none', transform: 'translateX(-50%) scaleX(0.72) skewX(10deg)', opacity: 0.12,
}} />

            {/* ───────── LAPTOP ───────── */}
            <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', position: 'relative' }}>
              <div
  ref={laptopGroupRef}
  style={{
    width: '100%', 
    maxWidth: 560, 
    margin: '0 auto', 
    position: 'relative',
    transformStyle: 'preserve-3d',
    transform: 'rotateY(34deg) rotateX(-8deg)',
  }}
>
                {/* PANTALLA / TAPA */}
                <div ref={lidRef} style={{
                  width: '100%', aspectRatio: '16 / 10', position: 'relative', opacity: 0,
                  transform: 'translateY(20px) scale(0.92)', borderRadius: '14px 14px 6px 6px',
                  background: 'linear-gradient(160deg, #1e1e1e 0%, #0d0d0d 100%)', padding: 9,
                  boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)`,
                  border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden', zIndex: 2,
                }}>
                  <div ref={sweepRef} style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', opacity: 0,
                    background: 'linear-gradient(75deg, transparent, rgba(255,255,255,0.16), transparent)',
                    pointerEvents: 'none', zIndex: 5,
                  }} />

                  <div ref={brilloRef} style={{
                    position: 'absolute', inset: 0, borderRadius: '14px 14px 6px 6px', opacity: 0,
                    background: 'linear-gradient(135deg, rgba(212,162,76,0.05) 0%, transparent 30%, transparent 70%, rgba(212,162,76,0.025) 100%)',
                    pointerEvents: 'none', zIndex: 4,
                  }} />

                  <div ref={screenRef} style={{
                    width: '100%', height: '100%', borderRadius: 6, overflow: 'hidden', background: OBSIDIANA,
                    position: 'relative', opacity: 0, transform: 'scale(0.98)',
                    boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.02)',
                  }}>
                    <div ref={reflejoRef} style={{
                      position: 'absolute', inset: 0, borderRadius: 6, opacity: 0,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.012) 100%)',
                      pointerEvents: 'none', zIndex: 10,
                    }} />
                    <PantallaTona mostrarEsfera={mostrarEsfera} />
                  </div>

                  <div style={{
                    position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 5, height: 5,
                    borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, rgba(50,50,50,0.6), rgba(15,15,15,0.8))',
                    zIndex: 5, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.2)',
                  }} />
                </div>

                {/* BISAGRA */}
                <div style={{
                  position: 'relative', height: 6, margin: '0 auto', width: '96%',
                  transformStyle: 'preserve-3d',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(180deg, #050505 0%, #161616 60%, #0a0a0a 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
                  }} />
                  <div ref={hingeGlowRef} style={{
                    position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, opacity: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  }} />
                </div>

                {/* BASE — inclinación sutil para dar sensación de profundidad, sin proyectarse fuera de vista */}
                <div style={{
                  width: '104%', marginLeft: '-2%', height: 34, position: 'relative',
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'top center',
                  transform: 'rotateX(18deg)',
                }}>
                  <div ref={baseRef} style={{
                    width: '100%', height: '100%', opacity: 0, position: 'relative',
                    background: 'linear-gradient(180deg, #232323 0%, #131313 45%, #0a0a0a 100%)',
                    borderRadius: '0 0 10px 10px',
                    boxShadow: '0 14px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
                    borderLeft: '1px solid rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.02)',
                  }}>
                    <div style={{
                      position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                      width: '10%', height: 3, borderRadius: '0 0 4px 4px', background: 'rgba(0,0,0,0.5)',
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}