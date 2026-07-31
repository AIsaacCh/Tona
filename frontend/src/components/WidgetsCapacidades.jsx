import { useEffect, useLayoutEffect, useRef } from 'react'
import anime from 'animejs'

const JADE = 'var(--jade)'
const JADE_LIGHT = 'var(--jade-light)'
const TURQUESA = 'var(--turquesa, #3fb8b0)'
const AMARANTO = 'var(--amaranto, #c0455a)'
const COPAL = 'var(--copal, #d4a24c)'
const FONT = "'Poppins', system-ui, sans-serif"

export const demoBox = {
  width: '100%',
  minHeight: 150,
  border: '1px solid rgba(212,162,76,0.14)',
  borderRadius: '10px',
  background: 'linear-gradient(160deg, rgba(237,235,230,0.02), rgba(0,0,0,0.16))',
  padding: '22px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  overflow: 'hidden',
  boxSizing: 'border-box',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 24px rgba(0,0,0,0.35), 0 10px 26px rgba(0,0,0,0.35)',
}

function IconoArchivoMini({ color }) {
  return (
    <svg width="30" height="38" viewBox="0 0 30 38" fill="none">
      <path d="M4 2H18L26 10V34C26 35.1 25.1 36 24 36H4C2.9 36 2 35.1 2 34V4C2 2.9 2.9 2 4 2Z" fill={`${color}14`} stroke={color} strokeWidth="1.4" />
      <path d="M18 2V10H26" stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  )
}

function IconoPizarron({ color }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M9 28L13 19M23 28L19 19" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <rect x="3" y="4" width="26" height="17" rx="2" fill={`${color}14`} stroke={color} strokeWidth="1.4" />
      <line x1="7" y1="9.5" x2="19" y2="9.5" stroke={color} strokeWidth="1.2" opacity="0.55" />
      <line x1="7" y1="13.5" x2="23" y2="13.5" stroke={color} strokeWidth="1.2" opacity="0.55" />
      <line x1="7" y1="17.5" x2="15" y2="17.5" stroke={color} strokeWidth="1.2" opacity="0.55" />
    </svg>
  )
}

function IconoCalendario({ color }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <line x1="9" y1="2" x2="9" y2="8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="23" y1="2" x2="23" y2="8" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="3" y="5" width="26" height="24" rx="2" fill={`${color}14`} stroke={color} strokeWidth="1.4" />
      <line x1="3" y1="12" x2="29" y2="12" stroke={color} strokeWidth="1.4" />
      <rect x="8" y="16" width="4.5" height="4.5" rx="1" fill={color} opacity="0.75" />
      <rect x="15.5" y="16" width="4.5" height="4.5" rx="1" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
      <rect x="23" y="16" width="4.5" height="4.5" rx="1" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
      <rect x="8" y="22.5" width="4.5" height="4.5" rx="1" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

export function DemoTareas() {
  const containerRef = useRef(null)
  const filesArrRef = useRef([])
  const pizarronWrapRef = useRef(null)
  const calendarioWrapRef = useRef(null)
  const pizarronRef = useRef(null)
  const calendarioRef = useRef(null)
  const glowPizarronRef = useRef(null)
  const glowCalendarioRef = useRef(null)

  const NUM_ARCHIVOS = 5

  useLayoutEffect(() => {
    const cont = containerRef.current
    if (!cont) return
    let cancelado = false
    let idleAnim = null

    function centro(el) {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }

    function calcularRuta(fileEl, destinoEl) {
      const origen = centro(fileEl)
      const destino = centro(destinoEl)
      const dx = destino.x - origen.x
      const dy = destino.y - origen.y
      return {
        arriba: { x: dx, y: dy - 30 },
        entra: { x: dx, y: dy },
      }
    }

    function tween(fileEl, params) {
      return anime({ targets: fileEl, ...params }).finished
    }

    function iniciarIdle() {
      idleAnim = anime({
        targets: filesArrRef.current.filter(Boolean),
        translateY: [0, -4],
        direction: 'alternate',
        loop: true,
        duration: 900,
        easing: 'easeInOutSine',
        delay: anime.stagger(150),
      })
    }

    async function enviarArchivo(fileEl, elegido) {
      anime.remove(fileEl)
      anime.set(fileEl, { translateX: 0, translateY: 0, scale: 1, opacity: 1 })

      const wrapEl = elegido === 'izquierda' ? pizarronWrapRef.current : calendarioWrapRef.current
      const iconoEl = elegido === 'izquierda' ? pizarronRef.current : calendarioRef.current
      const glowEl = elegido === 'izquierda' ? glowPizarronRef.current : glowCalendarioRef.current
      const ruta = calcularRuta(fileEl, wrapEl)

      // 1. viaja hasta quedar arriba del ícono elegido
      await tween(fileEl, {
        translateX: [0, ruta.arriba.x],
        translateY: [0, ruta.arriba.y],
        duration: 700,
        easing: 'easeInOutQuad',
      })

      // 2. pausa breve, quieto, antes de la selección
      await tween(fileEl, { scale: 1, duration: 150, easing: 'linear' })

      // 3. pulso lento de selección: el ícono destino crece y vuelve a su tamaño de forma pausada,
      //    simultáneo al descenso final del archivo (no es un rebote, es un crecimiento sostenido)
      anime({
        targets: iconoEl,
        scale: [1, 1.22, 1],
        duration: 900,
        easing: 'easeInOutSine',
      })
      anime({
        targets: glowEl,
        opacity: [0, 0.45, 0],
        scale: [0.85, 1.3],
        duration: 900,
        easing: 'easeInOutSine',
      })

      await tween(fileEl, {
        translateX: [ruta.arriba.x, ruta.entra.x],
        translateY: [ruta.arriba.y, ruta.entra.y],
        scale: [1, 0.25],
        opacity: [1, 0],
        duration: 450,
        easing: 'easeInQuart',
      })
    }

    async function loop() {
      while (!cancelado) {
        // reset: todos los archivos visibles en su posición base
        filesArrRef.current.forEach((el) => {
          if (el) anime.set(el, { translateX: 0, translateY: 0, scale: 1, opacity: 0 })
        })

        await anime({
          targets: filesArrRef.current.filter(Boolean),
          opacity: [0, 1],
          translateY: [16, 0],
          delay: anime.stagger(90),
          duration: 400,
          easing: 'easeOutQuart',
        }).finished

        if (cancelado) break
        iniciarIdle()

        await new Promise((r) => setTimeout(r, 500))

        // envía uno por uno, alternando destino
        for (let i = 0; i < NUM_ARCHIVOS; i++) {
          if (cancelado) break
          const fileEl = filesArrRef.current[i]
          if (!fileEl) continue
          const elegido = i % 2 === 0 ? 'izquierda' : 'derecha'
          await enviarArchivo(fileEl, elegido)
          await new Promise((r) => setTimeout(r, 220))
        }

        if (idleAnim) anime.remove(filesArrRef.current.filter(Boolean))
        await new Promise((r) => setTimeout(r, 650))
      }
    }
    loop()

    return () => {
      cancelado = true
      if (idleAnim) anime.remove(filesArrRef.current.filter(Boolean))
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        ...demoBox,
        position: 'relative',
        height: 190,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          zIndex: 2,
        }}
      >
        {Array.from({ length: NUM_ARCHIVOS }).map((_, i) => (
          <div
            key={i}
            ref={(el) => { filesArrRef.current[i] = el }}
            style={{ opacity: 0, transform: 'scale(0.75)' }}
          >
            <IconoArchivoMini color={JADE_LIGHT} />
          </div>
        ))}
      </div>

      <div ref={pizarronWrapRef} style={{ position: 'absolute', bottom: 24, left: '15%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={glowPizarronRef} style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: AMARANTO, opacity: 0, filter: 'blur(8px)' }} />
          <div ref={pizarronRef} style={{ position: 'relative' }}>
            <IconoPizarron color={AMARANTO} />
          </div>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(237,235,230,0.35)', fontFamily: FONT, letterSpacing: '0.04em' }}>CLASSROOM</span>
      </div>

      <div ref={calendarioWrapRef} style={{ position: 'absolute', bottom: 24, right: '15%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={glowCalendarioRef} style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: TURQUESA, opacity: 0, filter: 'blur(8px)' }} />
          <div ref={calendarioRef} style={{ position: 'relative' }}>
            <IconoCalendario color={TURQUESA} />
          </div>
        </div>
        <span style={{ fontSize: 9, color: 'rgba(237,235,230,0.35)', fontFamily: FONT, letterSpacing: '0.04em' }}>CALENDAR</span>
      </div>
    </div>
  )
}

export function DemoHorario() {
  const ref = useRef(null)

  const MATERIAS = [
    { materia: 'Cálculo Diferencial', horario: 'Lun · 7:00 – 8:30' },
    { materia: 'Programación Orientada a Objetos', horario: 'Lun · 8:30 – 10:00' },
    { materia: 'Física II', horario: 'Mar · 9:00 – 10:30' },
    { materia: 'Sistemas Operativos', horario: 'Mié · 11:00 – 12:30' },
    { materia: 'Inglés Técnico', horario: 'Jue · 13:00 – 14:00' },
  ]

  useEffect(() => {
    if (!ref.current) return
    const filas = ref.current.querySelectorAll('.fila-horario')
    const encabezado = ref.current.querySelector('.encabezado')
    const linea = ref.current.querySelector('.linea-header')

    const tl = anime.timeline({ loop: true })

    tl.add({
      targets: encabezado,
      opacity: [0, 1],
      translateY: [-6, 0],
      duration: 400,
      easing: 'easeOutQuart',
    })
      .add({
        targets: linea,
        width: ['0%', '100%'],
        duration: 500,
        easing: 'easeOutQuart',
      }, '-=150')
      .add({
        targets: filas,
        opacity: [0, 1],
        translateX: [-14, 0],
        duration: 450,
        delay: anime.stagger(220),
        easing: 'easeOutQuart',
      }, '-=100')
      .add({
        targets: filas[2],
        backgroundColor: ['rgba(0,0,0,0)', 'rgba(46,201,144,0.08)'],
        duration: 400,
        easing: 'easeOutQuart',
      }, '+=200')
      .add({
        targets: [encabezado, linea, filas],
        opacity: 0,
        duration: 400,
        delay: anime.stagger(60),
      }, '+=1400')

    return () => tl.pause()
  }, [])

  return (
    <div ref={ref} style={{ ...demoBox, display: 'flex', flexDirection: 'column', padding: '18px 20px', height: 190, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div className="encabezado" style={{ display: 'flex', justifyContent: 'space-between', opacity: 0, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(237,235,230,0.4)', fontFamily: FONT, letterSpacing: '0.08em', fontWeight: 500 }}>MATERIA</span>
        <span style={{ fontSize: 10, color: 'rgba(237,235,230,0.4)', fontFamily: FONT, letterSpacing: '0.08em', fontWeight: 500 }}>HORARIO</span>
      </div>
      <div className="linea-header" style={{ height: 1, background: 'rgba(46,201,144,0.2)', width: 0, marginBottom: 8, flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MATERIAS.map((m) => (
          <div
            key={m.materia}
            className="fila-horario"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '6px 4px',
              borderRadius: 5,
              opacity: 0,
            }}
          >
            <span style={{ fontSize: 12, color: 'rgba(237,235,230,0.75)', fontFamily: FONT, fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {m.materia}
            </span>
            <span style={{ fontSize: 11, color: JADE_LIGHT, fontFamily: FONT, fontWeight: 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {m.horario}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DemoDocs() {
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

function IconoSobre({ color, activo }) {
  return (
    <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
      <rect x="1" y="1" width="24" height="18" rx="2.5" fill={activo ? `${color}22` : 'transparent'} stroke={color} strokeWidth="1.4" />
      <path d="M2 3L13 12L24 3" stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DemoCorreo() {
  const ref = useRef(null)
  const contRef = useRef(null)
  const sobresRef = useRef([])
  const glowRef = useRef(null)

  const NUM_SOBRES = 5
  const SELECCIONADO = 2

  useEffect(() => {
    if (!ref.current) return
    let cancelado = false

    function tween(target, params) {
      return anime({ targets: target, ...params }).finished
    }

    function posicionRelativa(el) {
      const r = el.getBoundingClientRect()
      const c = contRef.current.getBoundingClientRect()
      return (r.left + r.width / 2) - c.left
    }

    async function cicloCompleto() {
      const sobres = sobresRef.current.filter(Boolean)
      const bordes = sobres.map((s) => Array.from(s.querySelectorAll('.borde')))

      anime.set(sobres, { opacity: 0, translateY: 8, scale: 1 })
      bordes.flat().forEach((b) => anime.set(b, { stroke: 'rgba(237,235,230,0.25)' }))
      anime.set(glowRef.current, { opacity: 0 })

      await tween(sobres, {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: anime.stagger(90),
        duration: 400,
        easing: 'easeOutQuart',
      })

      await new Promise((r) => setTimeout(r, 250))

      // 2. la luz recorre cada sobre — TODOS se apagan igual después de pasar, sin excepción
      for (let i = 0; i < NUM_SOBRES; i++) {
        if (cancelado) return

        anime({
          targets: glowRef.current,
          left: posicionRelativa(sobres[i]),
          opacity: [0, 0.3],
          duration: 220,
          easing: 'easeOutQuad',
        })

        await tween(bordes[i], { stroke: TURQUESA, duration: 180, easing: 'easeOutQuad' })
        await tween(sobres[i], { scale: [1, 1.12, 1], duration: 300, easing: 'easeOutQuad' })
        await tween(bordes[i], { stroke: 'rgba(237,235,230,0.25)', duration: 220, easing: 'easeInQuad' })
        anime({ targets: glowRef.current, opacity: 0, duration: 200, easing: 'easeInQuad' })

        if (cancelado) return
      }

      if (cancelado) return
      await new Promise((r) => setTimeout(r, 200))

      // 3. AHORA sí se enciende el seleccionado — esta es la única vez que se ilumina de forma sostenida
      const otros = sobres.filter((_, i) => i !== SELECCIONADO)
      anime({ targets: otros, opacity: 0.3, duration: 400, easing: 'easeOutQuad' })
      anime({
        targets: glowRef.current,
        left: posicionRelativa(sobres[SELECCIONADO]),
        opacity: [0, 0.4],
        duration: 400,
        easing: 'easeOutQuad',
      })
      await tween(bordes[SELECCIONADO], { stroke: TURQUESA, duration: 300, easing: 'easeOutQuad' })
      await tween(sobres[SELECCIONADO], { scale: [1, 1.2], duration: 400, easing: 'easeOutQuart' })

      await new Promise((r) => setTimeout(r, 1000))

      await tween([...sobres, glowRef.current], { opacity: 0, duration: 400, easing: 'easeInQuart' })
    }

    async function loop() {
      while (!cancelado) {
        await cicloCompleto()
        await new Promise((r) => setTimeout(r, 300))
      }
    }
    loop()

    return () => { cancelado = true }
  }, [])

  return (
    <div ref={ref} style={{ ...demoBox, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, position: 'relative' }}>
      <div ref={contRef} style={{ position: 'relative', display: 'flex', gap: 18 }}>
        <div
          ref={glowRef}
          style={{
            position: 'absolute', top: -14, width: 48, height: 48, borderRadius: '50%',
            background: `radial-gradient(circle, ${TURQUESA}88 0%, ${TURQUESA}22 45%, transparent 75%)`,
            filter: 'blur(6px)', opacity: 0, transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />
        {Array.from({ length: NUM_SOBRES }).map((_, i) => (
          <div key={i} ref={(el) => { sobresRef.current[i] = el }} style={{ opacity: 0, position: 'relative' }}>
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <rect className="borde" x="1" y="1" width="24" height="18" rx="2.5" fill="transparent" stroke="rgba(237,235,230,0.25)" strokeWidth="1.4" />
              <path className="borde" d="M2 3L13 12L24 3" stroke="rgba(237,235,230,0.25)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DemoVoz() {
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