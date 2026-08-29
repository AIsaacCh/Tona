import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import anime from 'animejs'
import EsferaTona from '../components/EsferaTona'
import LaptopHero, { NavBar } from '../components/LaptopHero'
import { DemoTareas, DemoHorario, DemoDocs, DemoCorreo, DemoVoz } from '../components/WidgetsCapacidades'
import FondoProfundidad from '../components/FondoProfundidad'

const JADE = 'var(--jade)'
const JADE_LIGHT = 'var(--jade-light)'
const TURQUESA = 'var(--turquesa, #3fb8b0)'
const AMARANTO = 'var(--amaranto, #c0455a)'
const COPAL = 'var(--copal, #d4a24c)'
const FONT = "'Poppins', system-ui, sans-serif"

// ─────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      width: '100%', padding: '40px 24px 32px',
      borderTop: '1px solid rgba(237,235,230,0.08)',
      display: 'flex', flexWrap: 'wrap', gap: '20px',
      alignItems: 'center', justifyContent: 'space-between',
      fontFamily: FONT, fontSize: '12px', color: 'rgba(237, 235, 230, 0.99)',
    }}>
      <span>© {new Date().getFullYear()} Tona · Angel Isaac Cortes Hernandez</span>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <a href="/legal/terminos" style={{ color: 'rgb(254, 254, 253)', textDecoration: 'none' }}>
          Términos y Condiciones
        </a>
        <a href="/legal/privacidad" style={{ color: 'rgba(255, 255, 255, 0.99)', textDecoration: 'none' }}>
          Aviso de Privacidad
        </a>
        <a href="mailto:corteshernandezangelisaac@gmail.com." style={{ color: 'rgba(237, 235, 230, 0.99)', textDecoration: 'none' }}>
          Contacto
        </a>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Hook: revela una sección con inclinación 3D suave al entrar en vista
// ─────────────────────────────────────────────────────────────────────────
function useRevelado(delay = 0) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: el,
              opacity: [0, 1],
              translateY: [50, 0],
              rotateX: [8, 0],
              duration: 1000,
              delay,
              easing: 'easeOutExpo',
            })
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])
  return ref
}

// ─────────────────────────────────────────────────────────────────────────
// Hook: inclinación 3D al mover el mouse sobre la tarjeta (efecto vivo)
// ─────────────────────────────────────────────────────────────────────────
function useTilt(intensidad = 8) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    function onMove(e) {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      anime({
        targets: el,
        rotateY: px * intensidad,
        rotateX: -py * intensidad,
        duration: 400,
        easing: 'easeOutQuad',
      })
    }
    function onLeave() {
      anime({ targets: el, rotateY: 0, rotateX: 0, duration: 600, easing: 'easeOutElastic(1, 0.6)' })
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [intensidad])
  return ref
}

function ReglaNumerada({ numero, texto }) {
  const lineRef = useRef(null)
  const ref = useRevelado()

  useEffect(() => {
    if (!lineRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({ targets: lineRef.current, width: ['0%', '100%'], duration: 1100, easing: 'easeOutExpo', delay: 250 })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.3 }
    )
    observer.observe(lineRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'baseline', gap: '18px', marginBottom: '56px', opacity: 0 }}>
      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: COPAL, letterSpacing: '0.1em', flexShrink: 0 }}>
        {numero}
      </span>
      <span style={{ fontFamily: FONT, fontWeight: 500, fontSize: '13px', letterSpacing: '0.25em', color: 'rgba(237,235,230,0.75)', flexShrink: 0 }}>
        {texto}
      </span>
      <div ref={lineRef} style={{ height: '1px', background: `linear-gradient(90deg, ${JADE}55, transparent)`, width: 0, flex: 1 }} />
    </div>
  )
}

const FEATURES = [
  { numero: '01', titulo: 'Tareas y calendario', texto: 'Organiza tus tareas de Classroom, eventos de Calendar y pendientes propios en un solo lugar — sin duplicados, sin perder el hilo.', Demo: DemoTareas },
  { numero: '02', titulo: 'Tu horario, siempre a la mano', texto: 'Guarda tu horario de clases y sabe qué sigue en tu día, sin que tengas que ir a buscarlo.', Demo: DemoHorario },
  { numero: '03', titulo: 'Documentos con ayuda de IA', texto: 'Crea, edita y recibe sugerencias sobre tus documentos directamente desde la conversación.', Demo: DemoDocs },
  { numero: '04', titulo: 'Correo y avisos', texto: 'Revisa tu Gmail, busca correos por tema y redacta mensajes por ti, cuando tú lo pidas.', Demo: DemoCorreo },
  { numero: '05', titulo: 'Habla con Tona', texto: 'Escríbele o simplemente háblale. Te escucha, entiende el contexto y te responde con voz.', Demo: DemoVoz },
]

// ─────────────────────────────────────────────────────────────────────────
// BANNER — vista pequeña de la esfera, flotando suavemente
// ─────────────────────────────────────────────────────────────────────────
function BannerEsfera() {
  const ref = useRevelado()
  const floatRef = useRef(null)

  useEffect(() => {
    if (!floatRef.current) return
    anime({
      targets: floatRef.current,
      translateY: [-8, 8],
      duration: 3200,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine',
    })
  }, [])

  return (
    <section
      ref={ref}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '40px', padding: '60px 24px', flexWrap: 'wrap', opacity: 0,
        background: 'radial-gradient(ellipse at center, rgba(46,201,144,0.04) 0%, transparent 70%)',
      }}
    >
      <div
        ref={floatRef}
        style={{
          width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${JADE}22`,
        }}
      >
        <EsferaTona size={160} />
      </div>
      <p style={{ maxWidth: 340, fontSize: '14px', lineHeight: 1.7, color: 'rgba(237,235,230,0.5)', fontFamily: FONT, fontWeight: 300, textAlign: 'left' }}>
        Detrás de cada tarea resuelta, cada correo revisado y cada pregunta respondida,
        hay una presencia constante — atenta, serena, siempre despierta.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// FILA DE FEATURE — con inclinación 3D al pasar el mouse
// ─────────────────────────────────────────────────────────────────────────
function FilaFeature({ numero, titulo, texto, Demo, invertido }) {
  const revelaRef = useRevelado()
  const tiltRef = useTilt(6)

  return (
    <div
      ref={revelaRef}
      style={{
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: '56px',
        alignItems: 'center', marginBottom: '100px', opacity: 0, width: '100%',
      }}
    >
      <div style={{ order: invertido ? 2 : 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: COPAL, letterSpacing: '0.1em', marginBottom: '14px' }}>
          {numero}
        </div>
        <h3 style={{ fontFamily: FONT, fontSize: '21px', letterSpacing: '0.01em', color: 'rgba(237,235,230,0.9)', marginBottom: '14px', fontWeight: 500 }}>
          {titulo}
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.75, color: 'rgba(237,235,230,0.42)', fontFamily: FONT, fontWeight: 300, maxWidth: '380px' }}>
          {texto}
        </p>
      </div>
      <div
        ref={tiltRef}
        style={{ order: invertido ? 1 : 2, minWidth: 0, transformStyle: 'preserve-3d', perspective: '800px', willChange: 'transform' }}
      >
        <Demo />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PRECIO
// ─────────────────────────────────────────────────────────────────────────
function SeccionPrecio({ onEntrar }) {
  const ref = useRevelado()
  const tiltRef = useTilt(4)
  const numeroRef = useRef(null)
  const [precio, setPrecio] = useState(0)

  useEffect(() => {
    const el = numeroRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const obj = { valor: 0 }
            anime({ targets: obj, valor: 120, duration: 1400, easing: 'easeOutExpo', round: 1, delay: 300, update: () => setPrecio(obj.valor) })
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const beneficios = [
    'Tareas de Classroom, Calendar y pendientes propios',
    'Horario, calificaciones y materias en un solo lugar',
    'Documentos con ayuda de IA',
    'Gmail y envío de correos',
    'Voz: háblale y te responde',
    'Sitios monitoreados y avisos automáticos',
  ]

  return (
    <section style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 24px 130px' }}>
      <ReglaNumerada numero="06" texto="SUSCRIPCIÓN" />

      <div
        ref={(node) => { ref.current = node; tiltRef.current = node }}
        style={{
          border: `1px solid ${COPAL}55`, borderRadius: '20px', padding: '38px 34px',
          textAlign: 'center', background: 'linear-gradient(160deg, rgba(212,162,76,0.04), rgba(46,201,144,0.02))', opacity: 0,
          transformStyle: 'preserve-3d', perspective: '900px', willChange: 'transform',
        }}
      >
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: JADE_LIGHT, marginBottom: '18px', fontFamily: FONT, fontWeight: 500 }}>
          PRUEBA GRATUITA · 3 DÍAS
        </div>

        <div ref={numeroRef} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: '46px', color: COPAL }}>${precio}</span>
          <span style={{ fontSize: '14px', color: 'rgba(237,235,230,0.4)', fontFamily: FONT, fontWeight: 300 }}>MXN / mes</span>
        </div>

        <div style={{ marginTop: '26px', display: 'flex', flexDirection: 'column', gap: '11px', textAlign: 'left', fontSize: '13px', color: 'rgba(237,235,230,0.6)', fontFamily: FONT, fontWeight: 300 }}>
          {beneficios.map((item) => (
            <div key={item} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: JADE, flexShrink: 0 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onEntrar}
          style={{
            marginTop: '30px', width: '100%', padding: '14px 0', background: JADE,
            color: 'var(--obsidiana)', border: 'none', borderRadius: '30px',
            fontFamily: FONT, fontSize: '14px', letterSpacing: '0.03em', cursor: 'pointer', fontWeight: '600',
          }}
        >
          Comenzar prueba gratuita
        </button>

        <div style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(237,235,230,0.25)', fontFamily: FONT, fontWeight: 300 }}>
          Sin cargo durante los primeros 3 días
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LANDING
// ─────────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const irALogin = () => navigate('/login')

  
  async function iniciarSuscripcionDesdeLanding() {
    try {
      const respWhoami = await fetch(`${import.meta.env.VITE_API_URL}/auth/whoami`, { credentials: 'include' })
      const dataWhoami = await respWhoami.json()

      if (dataWhoami.autenticado) {
        
        const respEstado = await fetch(`${import.meta.env.VITE_API_URL}/pagos/estado`, { credentials: 'include' })
        const dataEstado = await respEstado.json()

        if (dataEstado.activo) {
          window.location.href = `/dashboard?user_id=${dataWhoami.user_id}&name=${encodeURIComponent(dataWhoami.name || '')}`
          return
        }

        
        const respCheckout = await fetch(`${import.meta.env.VITE_API_URL}/pagos/crear-checkout`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const dataCheckout = await respCheckout.json()
        if (dataCheckout.url) window.location.href = dataCheckout.url
        return
      }

      // No tiene cuenta todavía: flujo de invitado normal
      const claimToken = crypto.randomUUID()
      localStorage.setItem('tona_claim_pendiente', claimToken)
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/pagos/crear-checkout-invitado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_token: claimToken }),
      })
      const data = await resp.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error('Error iniciando suscripción desde landing:', e)
    }
  }

  return (
    <div className="tona-app" style={{ minHeight: '100vh', width: '100%', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
      <FondoProfundidad />
      <NavBar onEntrar={irALogin} />
      <LaptopHero />
      <BannerEsfera />

      <section style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '100px 5vw 40px', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
        <ReglaNumerada numero="—" texto="CAPACIDADES" />
        {FEATURES.map((f, i) => (
          <FilaFeature key={f.numero} {...f} invertido={i % 2 === 1} />
        ))}
      </section>

      <SeccionPrecio onEntrar={iniciarSuscripcionDesdeLanding} />
      
      <Footer />
    </div>
  )
}