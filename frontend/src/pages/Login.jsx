import { useRef, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import anime from 'animejs'
import FondoProfundidad from '../components/FondoProfundidad'
import EsferaTona from '../components/EsferaTona'

const JADE = 'var(--jade)'
const JADE_LIGHT = 'var(--jade-light)'
const COPAL = 'var(--copal, #d4a24c)'
const FONT = "'Poppins', system-ui, sans-serif"

const API = import.meta.env.VITE_API_URL

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

export default function Login() {
  const izqRef = useRef(null)
  const cardRef = useRef(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [cargandoAccion, setCargandoAccion] = useState(null)
  const [params] = useSearchParams()
  const necesitaSuscripcion = params.get('necesita_suscripcion') === '1'
  
  const [mostrarEmailForm, setMostrarEmailForm] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [mensajeEstado, setMensajeEstado] = useState(null)
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    fetch(`${API}/auth/whoami`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.autenticado) {
          window.location.href = `/dashboard?user_id=${data.user_id}&name=${encodeURIComponent(data.name || '')}`
        } else {
          setVerificandoSesion(false)
        }
      })
      .catch(() => setVerificandoSesion(false))
  }, [])

  useEffect(() => {
    if (verificandoSesion) return
    anime({ targets: izqRef.current, opacity: [0, 1], translateY: [16, 0], duration: 800, easing: 'easeOutExpo' })
    anime({ targets: cardRef.current, opacity: [0, 1], translateY: [24, 0], scale: [0.97, 1], duration: 800, delay: 150, easing: 'easeOutExpo' })
  }, [verificandoSesion])

  const [claimTokenActual, setClaimTokenActual] = useState(() => crypto.randomUUID())
  const suscribirEnProceso = useRef(false)

  async function handleSuscribirse() {
    if (suscribirEnProceso.current) return
    suscribirEnProceso.current = true
    setCargandoAccion('suscribir')

    let token = claimTokenActual
    let intentos = 0

    while (intentos < 2) {
      localStorage.setItem('tona_claim_pendiente', token)
      try {
        const resp = await fetch(`${API}/pagos/crear-checkout-invitado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claim_token: token }),
        })

        if (resp.status === 409) {
          token = crypto.randomUUID()
          setClaimTokenActual(token)
          intentos++
          continue
        }

        const data = await resp.json()
        if (data.url) {
          window.location.href = data.url
          return
        } else {
          break
        }
      } catch (e) {
        break
      }
    }

    setCargandoAccion(null)
    suscribirEnProceso.current = false
  }

  async function handleVerificarCuenta() {
    if (!emailInput.trim()) return
    setVerificando(true)
    setMensajeEstado(null)
    try {
      const resp = await fetch(`${API}/auth/verificar-cuenta?email=${encodeURIComponent(emailInput.trim())}`)
      const data = await resp.json()

      if (!data.existe) {
        setMensajeEstado('no_encontrada')
      } else if (!data.tiene_suscripcion) {
        setMensajeEstado('sin_suscripcion')
      } else {
        setCargandoAccion('login')
        window.location.href = `/api/auth/google`
      }
    } catch (e) {
      console.error('Error verificando cuenta:', e)
    } finally {
      setVerificando(false)
    }
  }

  function handleTengoCodigo() {
    window.location.href = '/bienvenida'
  }

  if (verificandoSesion) return null

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

        <div ref={izqRef} style={{ opacity: 0, position: 'relative', padding: '30px 34px 30px 0' }}>
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

        <div ref={cardRef} style={{ opacity: 0 }}>
          <TarjetaLogin>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26, height: 56 }} />

            <h2 style={{
              textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 15,
              letterSpacing: '0.28em', color: 'rgba(237,235,230,0.9)', margin: '0 0 16px',
            }}>
              ACCEDE A TONA
            </h2>

            <p style={{
              textAlign: 'center', fontSize: 13, lineHeight: 1.7, color: 'rgba(237,235,230,0.42)',
              fontFamily: FONT, fontWeight: 300, maxWidth: 280, margin: '0 auto',
            }}>
              Elige una opción para continuar.
            </p>

            {necesitaSuscripcion && (
              <p style={{ 
                color: '#c0455a', 
                fontSize: 12, 
                textAlign: 'center', 
                margin: '16px 0 12px', 
                fontFamily: FONT,
                background: 'rgba(192, 69, 90, 0.08)',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(192, 69, 90, 0.2)',
              }}>
                Necesitas una suscripción activa para continuar. Elige una opción abajo.
              </p>
            )}

            <div style={{ flex: 1, minHeight: 30 }} />

            {!mostrarEmailForm ? (
              <button
                onClick={() => setMostrarEmailForm(true)}
                disabled={cargandoAccion !== null}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: '16px 0', borderRadius: 30, marginBottom: 12,
                  background: 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))',
                  border: `1px solid ${JADE}66`, color: JADE_LIGHT,
                  fontFamily: FONT, fontSize: 13, letterSpacing: '0.08em', fontWeight: 500,
                  cursor: cargandoAccion ? 'default' : 'pointer',
                  opacity: cargandoAccion ? 0.4 : 1,
                  transition: 'background 0.25s ease, border-color 0.25s ease, opacity 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  if (cargandoAccion === null) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, rgba(46,201,144,0.16), rgba(46,201,144,0.04))'
                    e.currentTarget.style.borderColor = JADE
                  }
                }}
                onMouseLeave={(e) => {
                  if (cargandoAccion === null) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))'
                    e.currentTarget.style.borderColor = `${JADE}66`
                  }
                }}
              >
                <IconoGoogle />
                Ya tengo cuenta — Iniciar sesión
              </button>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerificarCuenta()}
                  placeholder="tu@email.com"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 10,
                    borderRadius: 12, background: 'rgba(237,235,230,0.04)',
                    border: '1px solid rgba(237,235,230,0.15)', color: 'rgba(237,235,230,0.9)',
                    fontSize: 13, fontFamily: FONT, outline: 'none', textAlign: 'center',
                  }}
                />

                {mensajeEstado === 'no_encontrada' && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ color: '#c0455a', fontSize: 12, fontFamily: FONT, marginBottom: 10, textAlign: 'center' }}>
                      No encontramos una cuenta con ese correo.
                    </p>
                    <button 
                      onClick={handleSuscribirse} 
                      style={{ 
                        width: '100%', padding: '13px 0', borderRadius: 30, 
                        background: `${COPAL}12`, border: `1px solid ${COPAL}55`, 
                        color: COPAL, fontFamily: FONT, fontSize: 13, cursor: 'pointer',
                        transition: 'background 0.25s ease, border-color 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${COPAL}22`
                        e.currentTarget.style.borderColor = COPAL
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${COPAL}12`
                        e.currentTarget.style.borderColor = `${COPAL}55`
                      }}
                    >
                      Suscribirme (3 días gratis)
                    </button>
                  </div>
                )}

                {mensajeEstado === 'sin_suscripcion' && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ color: JADE_LIGHT, fontSize: 12, fontFamily: FONT, marginBottom: 10, textAlign: 'center' }}>
                      Tu cuenta existe, pero no tienes una suscripción activa.
                    </p>
                    <button 
                      onClick={handleSuscribirse} 
                      style={{ 
                        width: '100%', padding: '13px 0', borderRadius: 30, 
                        background: `${COPAL}12`, border: `1px solid ${COPAL}55`, 
                        color: COPAL, fontFamily: FONT, fontSize: 13, cursor: 'pointer',
                        transition: 'background 0.25s ease, border-color 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${COPAL}22`
                        e.currentTarget.style.borderColor = COPAL
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${COPAL}12`
                        e.currentTarget.style.borderColor = `${COPAL}55`
                      }}
                    >
                      Activar suscripción
                    </button>
                  </div>
                )}

                <button
                  onClick={handleVerificarCuenta}
                  disabled={verificando || !emailInput.trim()}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 30,
                    background: 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))',
                    border: `1px solid ${emailInput.trim() ? JADE : 'rgba(237,235,230,0.15)'}`,
                    color: emailInput.trim() ? JADE_LIGHT : 'rgba(237,235,230,0.3)',
                    fontFamily: FONT, fontSize: 13, 
                    cursor: emailInput.trim() && !verificando ? 'pointer' : 'default',
                    opacity: 1,
                    transition: 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (emailInput.trim() && !verificando) {
                      e.currentTarget.style.background = 'linear-gradient(180deg, rgba(46,201,144,0.16), rgba(46,201,144,0.04))'
                      e.currentTarget.style.borderColor = JADE
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (emailInput.trim() && !verificando) {
                      e.currentTarget.style.background = 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))'
                      e.currentTarget.style.borderColor = JADE
                    }
                  }}
                >
                  {verificando ? 'Verificando...' : 'Continuar'}
                </button>
              </div>
            )}

            <button
              onClick={handleSuscribirse}
              disabled={cargandoAccion !== null}
              style={{
                width: '100%', padding: '15px 0', borderRadius: 30, marginBottom: 12,
                background: `${COPAL}12`, border: `1px solid ${COPAL}55`, color: COPAL,
                fontFamily: FONT, fontSize: 13, letterSpacing: '0.05em', fontWeight: 500,
                cursor: cargandoAccion ? 'default' : 'pointer',
                opacity: cargandoAccion && cargandoAccion !== 'suscribir' ? 0.4 : 1,
                transition: 'background 0.25s ease, border-color 0.25s ease, opacity 0.25s ease',
              }}
              onMouseEnter={(e) => {
                if (cargandoAccion === null) {
                  e.currentTarget.style.background = `${COPAL}22`
                  e.currentTarget.style.borderColor = COPAL
                }
              }}
              onMouseLeave={(e) => {
                if (cargandoAccion === null) {
                  e.currentTarget.style.background = `${COPAL}12`
                  e.currentTarget.style.borderColor = `${COPAL}55`
                }
              }}
            >
              {cargandoAccion === 'suscribir' ? 'Redirigiendo...' : 'Soy nuevo — Suscribirme (3 días gratis)'}
            </button>

            <button
              onClick={handleTengoCodigo}
              disabled={cargandoAccion !== null}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 30,
                background: 'transparent', border: '1px solid rgba(237,235,230,0.15)',
                color: 'rgba(237,235,230,0.5)',
                fontFamily: FONT, fontSize: 12.5,
                cursor: cargandoAccion ? 'default' : 'pointer',
                opacity: cargandoAccion ? 0.4 : 1,
                transition: 'background 0.25s ease, border-color 0.25s ease, opacity 0.25s ease',
              }}
              onMouseEnter={(e) => {
                if (cargandoAccion === null) {
                  e.currentTarget.style.background = 'rgba(237,235,230,0.05)'
                  e.currentTarget.style.borderColor = 'rgba(237,235,230,0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (cargandoAccion === null) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(237,235,230,0.15)'
                }
              }}
            >
              Tengo un código de invitación
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