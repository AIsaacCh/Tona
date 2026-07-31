import { useRef, useEffect } from 'react'
import anime from 'animejs'
import FondoProfundidad from '../components/FondoProfundidad'
import EsferaTona from '../components/EsferaTona'
import LiquidGlass from 'liquid-glass-react'


const JADE = 'var(--jade)'
const JADE_LIGHT = 'var(--jade-light)'
const COPAL = 'var(--copal, #d4a24c)'
const FONT = "'Poppins', system-ui, sans-serif"

const AUTH_BASE = import.meta.env.VITE_AUTH_URL

// ─────────────────────────────────────────────────────────────────────────
// Borde punteado (sin cambios)
// ─────────────────────────────────────────────────────────────────────────
function BordePunteado() {
  const horizontales = Array.from({ length: 9 })
  const verticales = Array.from({ length: 7 })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      {['top', 'bottom'].map((borde) => (
        <div key={borde} style={{
          position: 'absolute', left: 0, right: 0, [borde]: 18,
          display: 'flex', justifyContent: 'space-between', padding: '0 5vw',
        }}>
          {horizontales.map((_, i) => (
            <span key={i} style={{
              width: 3, height: 3,
              borderRadius: i % 4 === 0 ? 0 : '50%',
              transform: i % 4 === 0 ? 'rotate(45deg)' : 'none',
              background: i % 3 === 0 ? COPAL : 'rgba(237,235,230,0.2)',
              opacity: 0.5,
            }} />
          ))}
        </div>
      ))}
      {['left', 'right'].map((borde) => (
        <div key={borde} style={{
          position: 'absolute', top: 0, bottom: 0, [borde]: 18,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '90px 0',
        }}>
          {verticales.map((_, i) => (
            <span key={i} style={{
              width: 3, height: 3,
              borderRadius: i % 3 === 0 ? 0 : '50%',
              transform: i % 3 === 0 ? 'rotate(45deg)' : 'none',
              background: i % 4 === 0 ? JADE : 'rgba(237,235,230,0.18)',
              opacity: 0.5,
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Esfera ambiental — ahora centrada y hundida en el fondo, como la pirámide
// de la referencia: grande pero tenue, sugiriendo distancia, no protagonismo
// ─────────────────────────────────────────────────────────────────────────
function EsferaAmbiente() {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    anime({
      targets: ref.current,
      translateY: [-10, 10],
      duration: 6000,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
    })
  }, [])

  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: '-30%', width: 'min(760px, 62vw)',
      transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 0,
    }}>
      <div style={{
        position: 'absolute', inset: '-10%', borderRadius: '50%',
        background: `radial-gradient(circle at 50% 55%, ${COPAL}10 0%, ${JADE}0c 42%, transparent 72%)`,
        filter: 'blur(50px)',
      }} />
      <div ref={ref} style={{ opacity: 0.18, filter: 'blur(0.5px) saturate(0.85)' }}>
        <EsferaTona size={620} />
      </div>
    </div>
  )
}

function IconoGoogle() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
    </svg>
  )
}
// ─────────────────────────────────────────────────────────────────────────
// Tarjeta con borde de luz recorriendo el contorno — anillo real vía mask,
// así el brillo queda geométricamente confinado a la orilla, nunca al centro
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Filtro de vidrio esmerilado real: turbulencia + feDisplacementMap distorsiona
// lo que hay detrás (no solo lo desenfoca), + una neblina blanquecina encima —
// así es como se ve opaco sin ser oscuro
// ─────────────────────────────────────────────────────────────────────────
function FiltroVidrioEsmerilado() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <filter id="vidrioEsmerilado" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="11" result="ruido" />
        <feGaussianBlur in="ruido" stdDeviation="4" result="ruidoSuave" />
        <feDisplacementMap in="SourceGraphic" in2="ruidoSuave" scale="55" xChannelSelector="R" yChannelSelector="G" result="distorsionado" />
        <feGaussianBlur in="distorsionado" stdDeviation="16" />
      </filter>
    </svg>
  )
}


// ─────────────────────────────────────────────────────────────────────────
// Tarjeta con borde de luz + vidrio real vía liquid-glass-react
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// Tarjeta con borde de luz — vidrio con CSS puro (sin dependencia externa,
// hasta resolver por qué liquid-glass-react rompía el render)
// ─────────────────────────────────────────────────────────────────────────
function TarjetaLogin({ children }) {
  return (
    <div style={{ position: 'relative', borderRadius: 28, boxShadow: '0 40px 90px rgba(0,0,0,0.55)' }}>
      <style>{`
        @keyframes girarAnillo {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0, borderRadius: 28, padding: 1.5,
        overflow: 'hidden', pointerEvents: 'none', zIndex: 2,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        maskComposite: 'exclude',
      }}>
        <div style={{
          position: 'absolute', inset: '-160%',
          animation: 'girarAnillo 8s linear infinite',
          background: `conic-gradient(from 0deg,
            transparent 0%,
            ${COPAL} 5%,
            #f3d999 9%,
            ${COPAL} 13%,
            transparent 24%,
            transparent 100%)`,
        }} />
      </div>

      <div style={{
        position: 'absolute', inset: -1, borderRadius: 28, zIndex: 1, pointerEvents: 'none',
        boxShadow: `0 0 22px ${COPAL}26, inset 0 0 30px ${COPAL}12`,
      }} />

      <div style={{
        position: 'relative', zIndex: 1, borderRadius: 28, overflow: 'hidden',
        minHeight: 640, padding: '52px 42px', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(165deg, rgba(20,20,18,0.4), rgba(8,8,8,0.55))',
        backdropFilter: 'blur(14px) saturate(1.15)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.15)',
        border: `1px solid ${COPAL}22`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 28, pointerEvents: 'none',
          background: 'linear-gradient(122deg, rgba(255,255,255,0.07) 0%, transparent 26%, transparent 74%, rgba(255,255,255,0.02) 100%)',
        }} />
        {children}
      </div>
    </div>
  )
}

function RuidoVidrio() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 28 }}>
      <filter id="ruidoVidrio">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="ruido" />
        <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.035 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ruidoVidrio)" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────
export default function Login() {
  const izqRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    anime({ targets: izqRef.current, opacity: [0, 1], translateY: [16, 0], duration: 800, easing: 'easeOutExpo' })
    anime({ targets: cardRef.current, opacity: [0, 1], translateY: [24, 0], scale: [0.97, 1], duration: 800, delay: 150, easing: 'easeOutExpo' })
  }, [])

  const handleGoogleLogin = () => {
    window.location.href = `${AUTH_BASE}/auth/google`
  }

  return (
    <div className="tona-app" style={{
      minHeight: '100vh', width: '100%', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <FondoProfundidad />
      <EsferaAmbiente />
      <BordePunteado />

      <div style={{
        width: 'min(1180px, 92vw)', display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,0.78fr)', gap: '64px',
        alignItems: 'center', position: 'relative', zIndex: 2,
      }}>

        {/* columna izquierda — identidad, con su propio "espacio" de contraste */}
        <div ref={izqRef} style={{ opacity: 0, position: 'relative', padding: '30px 34px 30px 0' }}>
          {/* scrim propio — independiente de dónde caiga la esfera, garantiza contraste */}
          <div style={{
            position: 'absolute', inset: '-10% -6%', zIndex: -1, borderRadius: 40,
            background: 'radial-gradient(ellipse at 30% 40%, rgba(5,5,4,0.55) 0%, transparent 72%)',
          }} />

          <h1 style={{
            fontFamily: FONT, fontWeight: 500, fontSize: 'clamp(48px, 6vw, 76px)',
            letterSpacing: '0.14em', color: 'rgba(237,235,230,0.94)', margin: 0,
          }}>
            TONA
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 26px' }}>
            <div style={{ width: 32, height: 1, background: `linear-gradient(90deg, ${COPAL}, transparent)` }} />
            <span style={{ fontSize: 12, letterSpacing: '0.2em', color: JADE_LIGHT, fontFamily: FONT }}>
              TU NAGUAL DIGITAL
            </span>
          </div>

          <p style={{
            maxWidth: 380, fontSize: 14, lineHeight: 1.8, color: 'rgba(237,235,230,0.5)',
            fontFamily: FONT, fontWeight: 300,
          }}>
            Un agente de estudio personal que organiza tus tareas, tu horario,
            tus documentos y tu correo — y te escucha cuando le hablas.
          </p>

          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 30,
            fontSize: 11, letterSpacing: '0.15em', color: COPAL, fontFamily: FONT,
            textDecoration: 'none',
          }}>
            ← VOLVER AL INICIO
          </a>
        </div>

        {/* columna derecha — tarjeta de acceso */}
        <div ref={cardRef} style={{ opacity: 0 }}>
          <TarjetaLogin>
            {/* logo — pendiente, lo integras tú */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26, height: 56 }} />

            <h2 style={{
              textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 15,
              letterSpacing: '0.28em', color: 'rgba(237,235,230,0.9)', margin: '0 0 16px',
            }}>
              INICIA SESIÓN
            </h2>

            <p style={{
              textAlign: 'center', fontSize: 13, lineHeight: 1.7, color: 'rgba(237,235,230,0.42)',
              fontFamily: FONT, fontWeight: 300, maxWidth: 280, margin: '0 auto',
            }}>
              Accede con tu cuenta de Google para continuar.
            </p>

            {/* separador — empuja el botón hacia el centro visual de la tarjeta alargada */}
            <div style={{ flex: 1, minHeight: 40 }} />

            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: '16px 0', borderRadius: 30,
                background: 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))',
                border: `1px solid ${JADE}66`, color: JADE_LIGHT,
                fontFamily: FONT, fontSize: 13, letterSpacing: '0.08em', fontWeight: 500,
                cursor: 'pointer', transition: 'background 0.25s ease, border-color 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(46,201,144,0.16), rgba(46,201,144,0.04))'
                e.currentTarget.style.borderColor = JADE
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))'
                e.currentTarget.style.borderColor = `${JADE}66`
              }}
            >
              <IconoGoogle />
              CONTINUAR CON GOOGLE
            </button>

            <div style={{
              marginTop: 24, textAlign: 'center', fontSize: 10.5, lineHeight: 1.7,
              color: 'rgba(237,235,230,0.25)', fontFamily: FONT, fontWeight: 300,
            }}>
              Al continuar, aceptas los Términos y el Aviso de Privacidad de TONA.
            </div>
          </TarjetaLogin>
        </div>
      </div>
    </div>
  )
}