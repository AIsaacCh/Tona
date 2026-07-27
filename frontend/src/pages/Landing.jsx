import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import anime from 'animejs'
import EsferaTona from '../components/EsferaTona'
import MallaFondo from '../components/MallaFondo'

const JADE = 'var(--jade)'
const JADE_LIGHT = 'var(--jade-light)'
const TURQUESA = 'var(--turquesa, #3fb8b0)'
const AMARANTO = 'var(--amaranto, #c0455a)'
const COPAL = 'var(--copal, #d4a24c)'
const FONT = "'Poppins', system-ui, sans-serif"

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

// ─────────────────────────────────────────────────────────────────────────
// DEMOS ANIMADAS
// ─────────────────────────────────────────────────────────────────────────

function DemoTareas() {
  const ref = useRef(null)
  const items = [
    { texto: 'Práctica de Física', color: AMARANTO },
    { texto: 'Examen Cálculo · jueves', color: AMARANTO },
    { texto: 'Leer cap. 4 de SO', color: JADE },
    { texto: 'Notas de Inglés', color: JADE_LIGHT },
  ]

  useEffect(() => {
    if (!ref.current) return
    const filas = ref.current.querySelectorAll('.fila')
    const checks = ref.current.querySelectorAll('.check')
    const tl = anime.timeline({ loop: true })
    tl.add({ targets: filas, opacity: [0, 1], translateX: [24, 0], duration: 500, delay: anime.stagger(160), easing: 'easeOutQuart' })
      .add({ targets: checks[1], backgroundColor: ['rgba(0,0,0,0)', JADE], duration: 300, easing: 'easeOutQuart' }, '+=400')
      .add({ targets: filas[1], opacity: [1, 0.35], duration: 300 }, '-=100')
      .add({ targets: filas, opacity: 0, translateX: -16, duration: 400, delay: anime.stagger(80), easing: 'easeInQuart' }, '+=1400')
    return () => tl.pause()
  }, [])

  return (
    <div ref={ref} style={demoBox}>
      {items.map((it, i) => (
        <div key={i} className="fila" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', opacity: 0 }}>
          <div className="check" style={{ width: 12, height: 12, borderRadius: 3, border: `1px solid ${it.color}88`, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'rgba(237,235,230,0.7)', fontFamily: FONT, fontWeight: 300, flex: 1 }}>{it.texto}</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: it.color, opacity: 0.6, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}

// ✅ Reescrito: antes usaba scaleY(0) inline que chocaba con anime.js.
// Ahora es una franja semanal con altura animada vía CSS height real
// controlada por anime, sin transforms conflictivos.
function DemoHorario() {
  const ref = useRef(null)
  const dias = [
    { d: 'LUN', h: 34 }, { d: 'MAR', h: 54 }, { d: 'MIÉ', h: 74 },
    { d: 'JUE', h: 44 }, { d: 'VIE', h: 64 },
  ]

  useEffect(() => {
    if (!ref.current) return
    const celdas = ref.current.querySelectorAll('.celda')
    const barras = ref.current.querySelectorAll('.barra')
    const hoy = ref.current.querySelector('.hoy')

    const tl = anime.timeline({ loop: true })
    tl.add({ targets: celdas, opacity: [0, 1], translateY: [16, 0], duration: 450, delay: anime.stagger(90), easing: 'easeOutQuart' })
      .add({
        targets: barras,
        height: (el) => [0, el.dataset.h + 'px'],
        duration: 600,
        delay: anime.stagger(90),
        easing: 'easeOutExpo',
      }, '-=250')
      .add({ targets: hoy, backgroundColor: [`${TURQUESA}00`, `${TURQUESA}22`], borderColor: [`${TURQUESA}00`, `${TURQUESA}66`], duration: 400 }, '-=300')
      .add({ targets: [celdas, barras], opacity: 0, duration: 400 }, '+=1500')
    return () => tl.pause()
  }, [])

  return (
    <div ref={ref} style={{ ...demoBox, display: 'flex', flexDirection: 'column', padding: '20px 20px 14px', height: 190, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {dias.map((item, i) => (
          <div
            key={item.d}
            className={`celda${i === 2 ? ' hoy' : ''}`}
            style={{
              flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'flex-end', gap: 8, padding: '8px 2px 0', borderRadius: 6,
              opacity: 0, border: '1px solid transparent', height: '100%', boxSizing: 'border-box',
            }}
          >
            <div
              className="barra"
              data-h={item.h}
              style={{ width: 7, height: 0, background: JADE, opacity: 0.7, borderRadius: 3, flexShrink: 0 }}
            />
            <span style={{ fontSize: 9, color: 'rgba(237,235,230,0.35)', letterSpacing: '0.05em', fontFamily: FONT, whiteSpace: 'nowrap' }}>{item.d}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: 'rgba(46,201,144,0.15)', marginTop: 10, flexShrink: 0 }} />
    </div>
  )
}
function IconoArchivoMini({ color }) {
  return (
    <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
      <path d="M4 2H18L26 10V34C26 35.1 25.1 36 24 36H4C2.9 36 2 35.1 2 34V4C2 2.9 2.9 2 4 2Z" fill={`${color}14`} stroke={color} strokeWidth="1.4" />
      <path d="M18 2V10H26" stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  )
}

function DemoDocs() {
  const ref = useRef(null)
  const colores = [JADE, JADE_LIGHT, TURQUESA, JADE]

  useEffect(() => {
    if (!ref.current) return
    const archivos = ref.current.querySelectorAll('.archivo')
    const check = ref.current.querySelector('.check')
    const chispa = ref.current.querySelector('.chispa')
    const tl = anime.timeline({ loop: true })
    tl.add({ targets: archivos, opacity: [0, 1], translateY: [20, 0], scale: [0.7, 1], duration: 500, delay: anime.stagger(160), easing: 'easeOutBack' })
      .add({ targets: archivos[2], scale: [1, 1.18, 1], rotate: [0, -6, 0], duration: 600, easing: 'easeInOutQuad' }, '+=200')
      .add({ targets: chispa, opacity: [0, 1], scale: [0.5, 1], duration: 350, easing: 'easeOutBack' }, '-=300')
      .add({ targets: check, opacity: [0, 1], scale: [0.4, 1], duration: 400, easing: 'easeOutBack' }, '-=200')
      .add({ targets: [archivos, check, chispa], opacity: 0, duration: 400, delay: anime.stagger(40) }, '+=1000')
    return () => tl.pause()
  }, [])

  return (
    <div ref={ref} style={{ ...demoBox, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, position: 'relative', height: 150 }}>
      {colores.map((c, i) => (
        <div key={i} className="archivo" style={{ opacity: 0, position: 'relative' }}>
          <IconoArchivoMini color={c} />
          {i === 2 && (
            <span
              className="check"
              style={{
                position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%',
                background: JADE, color: 'var(--obsidiana)', fontSize: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center', opacity: 0,
              }}
            >
              ✓
            </span>
          )}
        </div>
      ))}
      <span className="chispa" style={{ position: 'absolute', top: 14, right: 22, fontSize: 15, color: COPAL, opacity: 0 }}>✨</span>
    </div>
  )
}

function DemoCorreo() {
  const ref = useRef(null)
  const correos = ['Aviso de titulación', 'Recordatorio de pago', 'Beca disponible']

  useEffect(() => {
    if (!ref.current) return
    const filas = ref.current.querySelectorAll('.correo')
    const puntos = ref.current.querySelectorAll('.punto')
    const tl = anime.timeline({ loop: true })
    tl.add({ targets: filas, opacity: [0, 1], translateY: [10, 0], duration: 450, delay: anime.stagger(150), easing: 'easeOutQuart' })
      .add({ targets: puntos, scale: [0, 1], backgroundColor: TURQUESA, duration: 300, delay: anime.stagger(150) }, '-=300')
      .add({ targets: puntos[0], opacity: 0.25, backgroundColor: 'rgba(237,235,230,0.2)', duration: 300 }, '+=500')
      .add({ targets: filas, opacity: 0, duration: 400, delay: anime.stagger(60) }, '+=1200')
    return () => tl.pause()
  }, [])

  return (
    <div ref={ref} style={{ ...demoBox, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
      {correos.map((c, i) => (
        <div key={i} className="correo" style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0 }}>
          <div className="punto" style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transform: 'scale(0)' }} />
          <span style={{ fontSize: 12, color: 'rgba(237,235,230,0.65)', fontFamily: FONT, fontWeight: 300 }}>{c}</span>
        </div>
      ))}
    </div>
  )
}

function DemoVoz() {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const barras = ref.current.querySelectorAll('.onda')
    anime({
      targets: barras,
      scaleY: () => anime.random(3, 12) / 10,
      duration: 600,
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine',
      delay: anime.stagger(80),
    })
    const anillos = ref.current.querySelectorAll('.anillo')
    anime({
      targets: anillos,
      scale: [0.7, 1.4],
      opacity: [0.6, 0],
      duration: 1800,
      loop: true,
      easing: 'easeOutQuart',
      delay: anime.stagger(500),
    })
  }, [])

  return (
    <div ref={ref} style={{ ...demoBox, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, position: 'relative' }}>
      <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="anillo" style={{ position: 'absolute', inset: 0, border: `1px solid ${JADE}`, borderRadius: '50%' }} />
        ))}
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: JADE }} />
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="onda" style={{ width: 3, height: 16, background: TURQUESA, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  )
}

const demoBox = {
  width: '100%',
  minHeight: 150,
  border: '1px solid rgba(46,201,144,0.1)',
  borderRadius: '10px',
  background: 'rgba(237,235,230,0.015)',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  overflow: 'hidden',
  boxSizing: 'border-box',
}

const FEATURES = [
  { numero: '01', titulo: 'Tareas y calendario', texto: 'Organiza tus tareas de Classroom, eventos de Calendar y pendientes propios en un solo lugar — sin duplicados, sin perder el hilo.', Demo: DemoTareas },
  { numero: '02', titulo: 'Tu horario, siempre a la mano', texto: 'Guarda tu horario de clases y sabe qué sigue en tu día, sin que tengas que ir a buscarlo.', Demo: DemoHorario },
  { numero: '03', titulo: 'Documentos con ayuda de IA', texto: 'Crea, edita y recibe sugerencias sobre tus documentos directamente desde la conversación.', Demo: DemoDocs },
  { numero: '04', titulo: 'Correo y avisos', texto: 'Revisa tu Gmail, busca correos por tema y redacta mensajes por ti, cuando tú lo pidas.', Demo: DemoCorreo },
  { numero: '05', titulo: 'Habla con Tona', texto: 'Escríbele o simplemente háblale. Te escucha, entiende el contexto y te responde con voz.', Demo: DemoVoz },
]

// ─────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────
function Hero() {
  const heroRef = useRef(null)
  const letrasRef = useRef(null)
  const lineaRef = useRef(null)
  const subRef = useRef(null)

  useEffect(() => {
    const letras = letrasRef.current.querySelectorAll('span')
    anime.timeline({ easing: 'easeOutExpo' })
      .add({ targets: heroRef.current, opacity: [0, 1], duration: 400 })
      .add({ targets: letras, opacity: [0, 1], translateY: [40, 0], rotateX: [70, 0], duration: 900, delay: anime.stagger(60) }, '-=200')
      .add({ targets: lineaRef.current, width: ['0%', '140px'], duration: 700 }, '-=400')
      .add({ targets: subRef.current, opacity: [0, 1], translateY: [12, 0], duration: 600 }, '-=400')
  }, [])

  return (
    <section
      ref={heroRef}
      style={{
        minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '24px', position: 'relative', opacity: 0, overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }}>
        {[20, 40, 60, 80].map((pct) => (
          <div key={pct} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: '1px', background: 'rgba(46,201,144,0.04)' }} />
        ))}
        {[25, 50, 75].map((pct) => (
          <div key={pct} style={{ position: 'absolute', top: `${pct}%`, left: 0, right: 0, height: '1px', background: 'rgba(46,201,144,0.04)' }} />
        ))}
      </div>

      <div ref={letrasRef} style={{ display: 'flex', perspective: '600px' }}>
        {'TONA'.split('').map((l, i) => (
          <span key={i} style={{ display: 'inline-block', fontSize: '68px', letterSpacing: '0.1em', opacity: 0, fontFamily: FONT, fontWeight: 500 }}>
            {l}
          </span>
        ))}
      </div>

      <div ref={lineaRef} style={{ height: '2px', width: 0, background: JADE, marginTop: '20px', borderRadius: '2px' }} />

      <p ref={subRef} style={{ marginTop: '18px', color: 'var(--jade-light)', fontSize: '14px', letterSpacing: '0.05em', opacity: 0, fontFamily: FONT, fontWeight: 400 }}>
        Tu nagual digital
      </p>

      <p style={{ marginTop: '24px', maxWidth: '460px', fontSize: '14px', lineHeight: 1.7, color: 'rgba(237,235,230,0.45)', fontFamily: FONT, fontWeight: 300 }}>
        Un agente de estudio personal que organiza tus tareas, tu horario, tus documentos
        y tu correo — y te escucha cuando le hablas.
      </p>

      <div style={{ position: 'absolute', bottom: '32px', fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(237,235,230,0.18)', fontFamily: 'monospace' }}>
        ↓ CONOCE A TONA
      </div>
    </section>
  )
}

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

    return (
    <div className="tona-app" style={{ minHeight: '100vh', width: '100%', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
      <MallaFondo />
      <Hero />
      <BannerEsfera />

      <section style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '100px 5vw 40px', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
        <ReglaNumerada numero="—" texto="CAPACIDADES" />
        {FEATURES.map((f, i) => (
          <FilaFeature key={f.numero} {...f} invertido={i % 2 === 1} />
        ))}
      </section>

      <SeccionPrecio onEntrar={irALogin} />
    </div>
  )
}