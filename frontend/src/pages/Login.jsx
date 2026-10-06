import { useRef, useEffect, useState } from 'react'
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

const ROJO = '#c0455a'

function Boton({ variante = 'jade', children, onClick, disabled = false, style }) {
  const [hover, setHover] = useState(false)
  const activo = hover && !disabled
  const variantes = {
    jade: {
      background: activo
        ? 'linear-gradient(180deg, rgba(46,201,144,0.16), rgba(46,201,144,0.04))'
        : 'linear-gradient(180deg, rgba(46,201,144,0.1), rgba(46,201,144,0.02))',
      border: `1px solid ${activo ? JADE : `${JADE}66`}`,
      color: JADE_LIGHT,
    },
    copal: {
      background: activo ? `${COPAL}22` : `${COPAL}12`,
      border: `1px solid ${activo ? COPAL : `${COPAL}55`}`,
      color: COPAL,
    },
    suave: {
      background: activo ? 'rgba(237,235,230,0.05)' : 'transparent',
      border: `1px solid ${activo ? 'rgba(237,235,230,0.3)' : 'rgba(237,235,230,0.15)'}`,
      color: 'rgba(237,235,230,0.5)',
    },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '15px 0', borderRadius: 30, marginBottom: 12,
        fontFamily: FONT, fontSize: 13, letterSpacing: '0.05em', fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
        transition: 'background 0.25s ease, border-color 0.25s ease, opacity 0.25s ease',
        ...variantes[variante], ...style,
      }}
    >
      {children}
    </button>
  )
}

const MENSAJES = {
  invalido:              { error: true,  texto: 'Escribe un correo de Google válido.' },
  demasiados:            { error: true,  texto: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' },
  error:                 { error: true,  texto: 'No pudimos verificar el correo. Inténtalo de nuevo.' },
  login_sin_cuenta:      { error: true,  texto: 'No encontramos una cuenta con ese correo.' },
  login_sin_suscripcion: { error: false, texto: 'Tu cuenta existe, pero no tiene una suscripción activa. Inicia sesión y te mostramos cómo activarla.' },
  nuevo_ya_activo:       { error: false, texto: 'Ese correo ya tiene una cuenta con suscripción activa. Inicia sesión.' },
  nuevo_prueba_usada:    { error: false, texto: 'Ese correo ya usó su prueba gratuita. Puedes suscribirte: el cobro empieza desde el primer día.' },
  nuevo_ok:              { error: false, texto: 'Ese correo es nuevo. Tendrás 3 días gratis.' },
}

function clasificar(modo, d) {
  if (modo === 'login') {
    if (!d.existe) return 'login_sin_cuenta'
    return d.tiene_suscripcion ? 'login_ok' : 'login_sin_suscripcion'
  }
  if (d.existe && d.tiene_suscripcion) return 'nuevo_ya_activo'
  return d.prueba_usada ? 'nuevo_prueba_usada' : 'nuevo_ok'
}

const estiloEnlaceLegal = {
  color: JADE, fontFamily: FONT, fontSize: 13, textDecoration: 'none',
  padding: '8px 20px', border: `1px solid ${JADE}25`, borderRadius: 24,
  background: `${JADE}08`, display: 'inline-flex', alignItems: 'center', gap: 8,
}

export default function Login() {
  const izqRef = useRef(null)
  const cardRef = useRef(null)

  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [sesion, setSesion] = useState(null) // hay sesión pero sin suscripción activa
  const [cargandoAccion, setCargandoAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const [vista, setVista] = useState('inicio') // 'inicio' | 'correo'
  const [modoCorreo, setModoCorreo] = useState('login') // 'login' | 'nuevo'
  const [emailInput, setEmailInput] = useState('')
  const [resultado, setResultado] = useState(null)
  const [verificando, setVerificando] = useState(false)

  const [mostrarPanelTerminos, setMostrarPanelTerminos] = useState(false)
  const [terminosAceptados, setTerminosAceptados] = useState(false)

  useEffect(() => {
    async function revisarSesion() {
      try {
        const who = await (await fetch(`${API}/auth/whoami`, { credentials: 'include' })).json()
        if (!who.autenticado) {
          setVerificandoSesion(false)
          return
        }

        const rEstado = await fetch(`${API}/pagos/estado`, { credentials: 'include' })
        const estado = rEstado.ok ? await rEstado.json() : null
        if (estado?.activo) {
          window.location.href = `/dashboard?user_id=${who.user_id}&name=${encodeURIComponent(who.name || '')}`
          return
        }

        const rPrueba = await fetch(`${API}/pagos/prueba-disponible`, { credentials: 'include' })
        if (rPrueba.ok) {
          setSesion({ name: who.name, ...(await rPrueba.json()) })
        } else {
          setSesion({ name: who.name, error: true })
        }
        setVerificandoSesion(false)
      } catch (e) {
        console.error('Error revisando sesión:', e)
        setVerificandoSesion(false)
      }
    }
    revisarSesion()
  }, [])

  useEffect(() => {
    if (verificandoSesion) return
    anime({ targets: izqRef.current, opacity: [0, 1], translateY: [16, 0], duration: 800, easing: 'easeOutExpo' })
    anime({ targets: cardRef.current, opacity: [0, 1], translateY: [24, 0], scale: [0.97, 1], duration: 800, delay: 150, easing: 'easeOutExpo' })
  }, [verificandoSesion])

  function irAGoogle(email) {
    setCargandoAccion(true)
    const hint = email ? `?email=${encodeURIComponent(email)}` : ''
    window.location.href = `/api/auth/google${hint}`
  }

  function abrirCorreo(modo) {
    setModoCorreo(modo)
    setVista('correo')
    setResultado(null)
  }

  function volverAlInicio() {
    setVista('inicio')
    setResultado(null)
    setEmailInput('')
  }

  async function handleVerificarCorreo() {
    const email = emailInput.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setResultado({ tipo: 'invalido' })
      return
    }
    setVerificando(true)
    setResultado(null)
    try {
      const resp = await fetch(`${API}/auth/verificar-cuenta?email=${encodeURIComponent(email)}`)
      if (resp.status === 429) {
        setResultado({ tipo: 'demasiados' })
        return
      }
      if (!resp.ok) throw new Error(`verificar-cuenta ${resp.status}`)
      const tipo = clasificar(modoCorreo, await resp.json())
      if (tipo === 'login_ok') {
        irAGoogle(email)
        return
      }
      setResultado({ tipo, email })
    } catch (e) {
      console.error('Error verificando correo:', e)
      setResultado({ tipo: 'error' })
    } finally {
      setVerificando(false)
    }
  }

  function abrirPanelTerminos() {
    setTerminosAceptados(false)
    setMostrarPanelTerminos(true)
  }

  function cerrarPanelTerminos() {
    setMostrarPanelTerminos(false)
    setTerminosAceptados(false)
  }

  function continuarConGoogleNuevo() {
    if (!terminosAceptados) return
    // Aún no hay sesión: la aceptación se registra en el servidor después del login
    localStorage.setItem('tona_terminos_pendiente', new Date().toISOString())
    setMostrarPanelTerminos(false)
    irAGoogle(resultado?.email)
  }

  async function continuarAlPago() {
    setCargandoAccion(true)
    setErrorAccion('')
    try {
      const pendiente = localStorage.getItem('tona_terminos_pendiente')
      if (pendiente) {
        try {
          const { version } = await (await fetch(`${API}/auth/terminos-version`)).json()
          const ra = await fetch(`${API}/auth/aceptar-terminos`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version, fecha: pendiente }),
          })
          if (ra.ok) localStorage.removeItem('tona_terminos_pendiente')
        } catch (e) {
          console.error('Error registrando aceptación:', e)
        }
      }

      const resp = await fetch(`${API}/pagos/crear-checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!resp.ok) throw new Error(`crear-checkout ${resp.status}`)
      const data = await resp.json()
      if (!data.url) throw new Error('sin url')
      window.location.href = data.url
    } catch (e) {
      console.error('Error abriendo el pago:', e)
      setErrorAccion('No pudimos abrir el pago. Inténtalo de nuevo en unos segundos.')
      setCargandoAccion(false)
    }
  }

  function handleTengoCodigo() {
    window.location.href = '/bienvenida'
  }

  if (verificandoSesion) return null

  let textoSesion = ''
  if (sesion?.error) textoSesion = 'No pudimos verificar el estado de tu cuenta. Inténtalo de nuevo.'
  else if (sesion?.pago_pendiente) textoSesion = 'Tienes un pago pendiente de tu suscripción anterior. Regularízalo para volver a usar Tona.'
  else if (sesion?.prueba_disponible) textoSesion = 'Tu cuenta está lista. Activa tus 3 días gratis: no se cobra nada durante la prueba.'
  else if (sesion) textoSesion = 'Ya usaste tu prueba gratuita. Para seguir, suscríbete: el cobro empieza desde el primer día.'

  const etiquetaPago = sesion?.pago_pendiente
    ? 'Regularizar pago'
    : sesion?.prueba_disponible ? 'Comenzar prueba gratuita' : 'Suscribirme'

  const textoCorreo = modoCorreo === 'login'
    ? 'Escribe el correo de Google con el que te registraste en Tona.'
    : 'Escribe el correo de Google con el que te registrarás en Tona. Después te llevaremos a Google: usa ese mismo correo.'

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
            Un agente de estudio personal que organiza tus tareas, tu horario y
            tus documentos, redacta tus correos — y te escucha cuando le hablas.
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
              {sesion ? 'ACTIVA TU CUENTA' : 'ACCEDE A TONA'}
            </h2>

            <p style={{
              textAlign: 'center', fontSize: 13, lineHeight: 1.7, color: 'rgba(237,235,230,0.42)',
              fontFamily: FONT, fontWeight: 300, maxWidth: 300, margin: '0 auto',
            }}>
              {sesion ? textoSesion : vista === 'inicio' ? 'Elige una opción para continuar.' : textoCorreo}
            </p>

            <div style={{ flex: 1, minHeight: 30 }} />

            {/* Ya inició sesión pero no tiene suscripción activa */}
            {sesion && (
              <>
                {errorAccion && (
                  <p style={{ color: ROJO, fontSize: 12, textAlign: 'center', fontFamily: FONT, margin: '0 0 10px' }}>
                    {errorAccion}
                  </p>
                )}
                {sesion.error ? (
                  <Boton variante="jade" onClick={() => window.location.reload()}>Reintentar</Boton>
                ) : (
                  <Boton variante="copal" onClick={continuarAlPago} disabled={cargandoAccion}>
                    {cargandoAccion ? 'Redirigiendo...' : etiquetaPago}
                  </Boton>
                )}
                <Boton
                  variante="suave"
                  onClick={() => { window.location.href = '/api/auth/logout' }}
                  disabled={cargandoAccion}
                  style={{ fontSize: 12.5, fontWeight: 400, padding: '13px 0' }}
                >
                  Usar otra cuenta (cerrar sesión)
                </Boton>
              </>
            )}

            {/* Pantalla inicial */}
            {!sesion && vista === 'inicio' && (
              <>
                <Boton variante="jade" onClick={() => abrirCorreo('login')} disabled={cargandoAccion}>
                  <IconoGoogle />
                  Ya tengo cuenta — Iniciar sesión
                </Boton>
                <Boton variante="copal" onClick={() => abrirCorreo('nuevo')} disabled={cargandoAccion}>
                  Soy nuevo — Suscribirme (3 días gratis)
                </Boton>
                <Boton
                  variante="suave"
                  onClick={handleTengoCodigo}
                  disabled={cargandoAccion}
                  style={{ fontSize: 12.5, fontWeight: 400, padding: '13px 0' }}
                >
                  Tengo un código de invitación
                </Boton>
              </>
            )}

            {/* Verificación del correo */}
            {!sesion && vista === 'correo' && (
              <div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setResultado(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && !verificando && handleVerificarCorreo()}
                  placeholder="tu@correo.com"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 10,
                    borderRadius: 12, background: 'rgba(237,235,230,0.04)',
                    border: '1px solid rgba(237,235,230,0.15)', color: 'rgba(237,235,230,0.9)',
                    fontSize: 13, fontFamily: FONT, outline: 'none', textAlign: 'center',
                  }}
                />

                {resultado && MENSAJES[resultado.tipo] && (
                  <p style={{
                    color: MENSAJES[resultado.tipo].error ? ROJO : JADE_LIGHT,
                    fontSize: 12, fontFamily: FONT, margin: '0 0 12px', textAlign: 'center', lineHeight: 1.6,
                  }}>
                    {MENSAJES[resultado.tipo].texto}
                  </p>
                )}

                {resultado?.tipo === 'login_sin_cuenta' && (
                  <Boton variante="copal" onClick={() => abrirCorreo('nuevo')}>
                    Soy nuevo — empezar prueba gratis
                  </Boton>
                )}
                {(resultado?.tipo === 'login_sin_suscripcion' || resultado?.tipo === 'nuevo_ya_activo') && (
                  <Boton variante="jade" onClick={() => irAGoogle(resultado.email)} disabled={cargandoAccion}>
                    <IconoGoogle />
                    Iniciar sesión con Google
                  </Boton>
                )}
                {(resultado?.tipo === 'nuevo_ok' || resultado?.tipo === 'nuevo_prueba_usada') && (
                  <Boton variante="copal" onClick={abrirPanelTerminos}>Continuar</Boton>
                )}

                <Boton variante="jade" onClick={handleVerificarCorreo} disabled={verificando || !emailInput.trim()}>
                  {verificando ? 'Verificando...' : 'Verificar correo'}
                </Boton>

                <button
                  onClick={volverAlInicio}
                  style={{
                    width: '100%', background: 'none', border: 'none', padding: '6px 0',
                    color: 'rgba(237,235,230,0.4)', fontFamily: FONT, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  ← Volver
                </button>
              </div>
            )}
          </TarjetaLogin>
        </div>
      </div>

      {/* PANEL DE ACEPTACIÓN DE TÉRMINOS Y CONDICIONES */}
      {mostrarPanelTerminos && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)', padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarPanelTerminos() }}
        >
          <div style={{
            maxWidth: 580, width: '100%', maxHeight: '85vh',
            background: 'linear-gradient(165deg, rgba(20,20,18,0.97), rgba(8,8,8,0.98))',
            borderRadius: 28, padding: '36px 40px', border: `1px solid ${COPAL}22`,
            boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5)',
            overflow: 'auto', position: 'relative',
          }}>
            <h2 style={{
              fontFamily: FONT, fontSize: 22, fontWeight: 500, color: 'rgba(237,235,230,0.92)',
              margin: '0 0 6px', textAlign: 'center', letterSpacing: '0.05em',
            }}>
              Términos y Condiciones
            </h2>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(237,235,230,0.4)', fontFamily: FONT, marginBottom: 24 }}>
              Para continuar, necesitas leer y aceptar nuestros documentos legales.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
              <a href="/legal/terminos" target="_blank" rel="noopener noreferrer" style={estiloEnlaceLegal}>
                📄 Términos y Condiciones
              </a>
              <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" style={estiloEnlaceLegal}>
                🔒 Aviso de Privacidad
              </a>
            </div>

            <div style={{
              background: 'rgba(237,235,230,0.03)', borderRadius: 12, padding: '14px 18px',
              marginBottom: 24, border: '1px solid rgba(237,235,230,0.06)',
            }}>
              <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'rgba(237,235,230,0.5)', fontFamily: FONT, margin: 0 }}>
                <strong style={{ color: 'rgba(237,235,230,0.7)' }}>Al aceptar, confirmas que:</strong>
                <br />• Eres mayor de 18 años.
                <br />• Has leído y entiendes los Términos y el Aviso de Privacidad.
                <br />• Aceptas el tratamiento de tus datos según lo descrito.
                <br />• Tona no es responsable del uso que hagas de la IA.
              </p>
            </div>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24, cursor: 'pointer',
              padding: '14px 18px', borderRadius: 12,
              background: terminosAceptados ? `${JADE}08` : 'transparent',
              border: `1px solid ${terminosAceptados ? JADE : 'rgba(237,235,230,0.06)'}`,
              transition: 'all 0.25s ease',
            }}>
              <input
                type="checkbox"
                checked={terminosAceptados}
                onChange={(e) => setTerminosAceptados(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, accentColor: JADE, cursor: 'pointer', width: 18, height: 18 }}
              />
              <span style={{
                fontSize: 13.5, lineHeight: 1.6, fontFamily: FONT, transition: 'color 0.25s ease',
                color: terminosAceptados ? 'rgba(237,235,230,0.85)' : 'rgba(237,235,230,0.5)',
              }}>
                He leído y acepto los <strong style={{ color: JADE }}>Términos y Condiciones</strong> y el{' '}
                <strong style={{ color: JADE }}>Aviso de Privacidad</strong> de Tona.
              </span>
            </label>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={cerrarPanelTerminos}
                style={{
                  flex: 1, padding: '14px 0', borderRadius: 30, background: 'transparent',
                  border: '1px solid rgba(237,235,230,0.12)', color: 'rgba(237,235,230,0.4)',
                  fontFamily: FONT, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={continuarConGoogleNuevo}
                disabled={!terminosAceptados}
                style={{
                  flex: 1.5, padding: '14px 0', borderRadius: 30, border: 'none',
                  background: terminosAceptados ? JADE : 'rgba(237,235,230,0.06)',
                  color: terminosAceptados ? 'var(--obsidiana)' : 'rgba(237,235,230,0.2)',
                  fontFamily: FONT, fontSize: 13, fontWeight: 600,
                  cursor: terminosAceptados ? 'pointer' : 'default', transition: 'all 0.25s ease',
                }}
              >
                Continuar con Google
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(237,235,230,0.15)', fontFamily: FONT, marginTop: 18 }}>
              Puedes revisar estos documentos en cualquier momento en el pie de página.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}