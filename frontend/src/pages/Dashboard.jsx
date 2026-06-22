import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as THREE from 'three'
import GotaServicio from '../components/GotaServicio'
import CarruselPendientes from '../components/CarruselPendientes'
import EstrellasFugaces from '../components/EstrellasFugaces'
import Aves from '../components/Aves'
import EsferaTona from '../components/EsferaTona'
import audioEngine from '../services/audioEngine'

const SERVICIOS = [
  { id: 'classroom', label: 'Classroom', color: '#1D9E75', colorOscuro: '#0F6E56' },
  { id: 'drive', label: 'Drive', color: '#4285F4', colorOscuro: '#1A56C4' },
  { id: 'calendar', label: 'Calendar', color: '#EA4335', colorOscuro: '#B31412' },
  { id: 'gmail', label: 'Gmail', color: '#EA4335', colorOscuro: '#B31412' },
  { id: 'notion', label: 'Notion', color: '#E8E8E4', colorOscuro: '#AEADA8' },
  { id: 'docs', label: 'Docs', color: '#4285F4', colorOscuro: '#1A56C4' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', colorOscuro: '#B30000' },
  { id: 'sheets', label: 'Sheets', color: '#0F9D58', colorOscuro: '#0A6E3C' },
  { id: 'meet', label: 'Meet', color: '#00BCD4', colorOscuro: '#007A8A' },
  { id: 'tasks', label: 'Tasks', color: '#4285F4', colorOscuro: '#1A56C4' },
]

const PENDIENTES = [
  { id: 1, titulo: 'Cálculo diferencial', resumen: 'Unidad 3 · vence 6h', urgencia: 'alta' },
  { id: 2, titulo: 'Álgebra lineal', resumen: 'Parcial 2 · mañana 9am', urgencia: 'media' },
  { id: 3, titulo: 'Proyecto Tona', resumen: 'XPRIZE · 3 archivos', urgencia: 'media' },
  { id: 4, titulo: 'Programación', resumen: 'Práctica 5 · 2 días', urgencia: 'baja' },
  { id: 5, titulo: 'Reunión equipo', resumen: 'Hoy 4pm · Zoom', urgencia: 'alta' },
]

const COLORES_URGENCIA = {
  alta: 0xF87171,
  media: 0x34D399,
  baja: 0x5DCAA5,
}

function getTiempo() {
  const h = new Date().getHours()
  if (h >= 5 && h < 13) return 'manana'
  if (h >= 13 && h < 20) return 'tarde'
  return 'noche'
}

const TEMAS = {
  manana: {
    saludo: 'Buenos días',
    frase: 'El cielo de hoy abre camino.',
    bg: '#060f1a',
    luz1: 'rgba(255,180,60,0.07)',
    luz2: 'rgba(255,120,30,0.04)',
    acento: '#F5C87A',
    jade: '#2EC990',
    texto: '#c8d4c9',
    textoDim: '#5a7060',
  },
  tarde: {
    saludo: 'Buenas tardes',
    frase: 'La tarde es tuya para construir.',
    bg: '#08050f',
    luz1: 'rgba(160,80,255,0.07)',
    luz2: 'rgba(80,30,180,0.04)',
    acento: '#C084FC',
    jade: '#34D399',
    texto: '#d4c8e8',
    textoDim: '#5a4a70',
  },
  noche: {
    saludo: 'Buenas noches',
    frase: 'El cosmos observa tu avance.',
    bg: '#05080a',
    luz1: 'rgba(29,158,117,0.06)',
    luz2: 'rgba(10,60,40,0.03)',
    acento: '#E8D5A3',
    jade: '#1D9E75',
    texto: '#c8d4c9',
    textoDim: '#3a5040',
  },
}

export default function Dashboard() {
  const [params] = useSearchParams()
  const nombre = (params.get('name') || 'Isaac').split(' ')[0]
  const tiempo = getTiempo()
  const tema = TEMAS[tiempo]

  const [fase, setFase] = useState('negro')
  const [textoListo, setTextoListo] = useState(false)
  const [mostrarCarrusel, setMostrarCarrusel] = useState(false)
  const [carruselMinimizado, setCarruselMinimizado] = useState(false)
  const [modoDirecto, setModoDirecto] = useState(false)
  const [iconosVisible, setIconosVisible] = useState(false)
  const [serviciosActivos, setServiciosActivos] = useState([])
  const [combinando, setCombinando] = useState(false)
  const [texto, setTexto] = useState('')
  const [cursorTexto, setCursorTexto] = useState(true)
  const [clima] = useState({ temp: '18°C', desc: 'Despejado' })
  const [textoFase, setTextoFase] = useState('saludo')
  const [panelCreciendo, setPanelCreciendo] = useState(false)
  const [mostrarEsfera, setMostrarEsfera] = useState(false)

  const threeRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const tarjetasRef = useRef([])
  const frameIdRef = useRef(null)
  const dimensionesRef = useRef({})

  const textoCompleto = `${tema.saludo}, ${nombre}. ${tema.frase} Tienes ${PENDIENTES.length} pendientes para hoy.`

  // Three.js — inicialización permanente
  useEffect(() => {
    const container = threeRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000)
    camera.position.z = 9

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const fov  = camera.fov * (Math.PI / 180)
    const visH = 2 * Math.tan(fov / 2) * camera.position.z
    const visW = visH * camera.aspect
    const ALTO  = visH * 0.80
    const ANCHO = ALTO * (21.59 / 27.94)
    const NUM   = PENDIENTES.length
    const RADIO = (ANCHO * 1.3) / (2 * Math.sin(Math.PI / NUM))
    const MINI_ALTO  = visH * 0.18
    const MINI_ANCHO = MINI_ALTO * (21.59 / 27.94)
    const ESQUINA_X  = -visW / 2 + MINI_ANCHO / 2 + 0.2
    const ESQUINA_Y  =  visH / 2 - MINI_ALTO  / 2 - 0.2

    dimensionesRef.current = {
      ALTO, ANCHO, NUM, RADIO,
      MINI_ALTO, MINI_ANCHO,
      ESQUINA_X, ESQUINA_Y,
    }

    const tarjetas = PENDIENTES.map((p, i) => {
      const geo = new THREE.BoxGeometry(ANCHO, ALTO, 0.08)
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0, 0, 0),
        roughness: 0.15,
        metalness: 0,
        transparent: true,
        opacity: 0,
        transmission: 0.4,
        thickness: 0.5,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        ior: 1.4,
      })

      const mesh = new THREE.Mesh(geo, mat)
      scene.add(mesh)

      const edgeGeo = new THREE.EdgesGeometry(geo)
      const edgeMat = new THREE.LineBasicMaterial({
        color: COLORES_URGENCIA[p.urgencia] || 0x1D9E75,
        transparent: true,
        opacity: 0,
      })
      const edge = new THREE.LineSegments(edgeGeo, edgeMat)
      mesh.add(edge)

      // Sprite de texto
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const CW = 512, CH = 320
      canvas.width = CW
      canvas.height = CH

      function dibujarTexto() {
        ctx.clearRect(0, 0, CW, CH)
        ctx.font = '300 italic 38px "Cormorant Garamond", serif'
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 8
        ctx.fillText(p.titulo, CW / 2, CH / 2 - 18, CW - 60)

        ctx.font = '400 22px "DM Sans", sans-serif'
        const colorUrgencia = p.urgencia === 'alta' ? '#F87171'
          : p.urgencia === 'media' ? '#34D399' : '#94A3B8'
        ctx.fillStyle = colorUrgencia
        ctx.shadowBlur = 4
        ctx.fillText(p.resumen, CW / 2, CH / 2 + 28, CW - 60)
      }
      dibujarTexto()

      const texturaTexto = new THREE.CanvasTexture(canvas)
      texturaTexto.needsUpdate = true

      const spriteMat = new THREE.SpriteMaterial({
        map: texturaTexto,
        transparent: true,
        opacity: 0,
        depthTest: false,
      })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.scale.set(ANCHO * 0.92, ALTO * 0.6, 1)
      sprite.position.z = 0.06
      mesh.add(sprite)

      return {
        mesh, mat, edge, edgeMat, sprite, spriteMat,
        angulo: { val: (i / NUM) * Math.PI * 2 },
        escala: { x: 1, y: 1 },
      }
    })

    tarjetas.forEach((t) => {
      const a = t.angulo.val
      t.mesh.position.x = Math.sin(a) * RADIO
      t.mesh.position.z = Math.cos(a) * RADIO - RADIO
      t.mesh.rotation.y = -a
    })

    const luz = new THREE.DirectionalLight(0xffffff, 2.5)
    luz.position.set(5, 5, 5)
    scene.add(luz)

    const luz2 = new THREE.DirectionalLight(0xffffff, 1.2)
    luz2.position.set(-5, -3, 4)
    scene.add(luz2)

    scene.add(new THREE.AmbientLight(0xffffff, 1.0))

    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
    tarjetasRef.current = tarjetas

    const loop = () => {
      frameIdRef.current = requestAnimationFrame(loop)
      renderer.render(scene, camera)
    }
    loop()

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Audio + secuencia de texto inicial
  useEffect(() => {
 const activarAudio = async () => {
  await audioEngine.iniciar()
  window.removeEventListener('click', activarAudio)
  window.removeEventListener('keydown', activarAudio)
}
    window.addEventListener('click', activarAudio)
    window.addEventListener('keydown', activarAudio)

    setTimeout(() => {
      setFase('activo')

      let idx = 0
      const escribir = setInterval(() => {
        idx++
        setTexto(textoCompleto.slice(0, idx))
        audioEngine.clicGota()
        if (idx >= textoCompleto.length) {
          clearInterval(escribir)
          setTextoListo(true)
        }
      }, 38)
    }, 700)

    const parpadeo = setInterval(() => setCursorTexto(c => !c), 530)
    return () => {
      clearInterval(parpadeo)
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    if (textoListo && textoFase === 'saludo') {
      setTimeout(() => setMostrarCarrusel(true), 2000)
    }
  }, [textoListo])

  function toggleServicio(id) {
    setServiciosActivos(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      const nuevo = [...prev, id]
      if (nuevo.length >= 2) activarCombinacion()
      return nuevo
    })
  }

  function activarCombinacion() {
    setCombinando(true)
    setTimeout(() => setCombinando(false), 2000)
  }

  function manejarAbandono() {
    setMostrarCarrusel(false)
    setCarruselMinimizado(true)
    setModoDirecto(false)
    setTextoFase('pregunta')
    setTexto('')
    const preguntaTexto = '¿Con qué deseas comenzar?'
    let idx = 0
    const escribir = setInterval(() => {
      idx++
      setTexto(preguntaTexto.slice(0, idx))
      audioEngine.clicGota()
      if (idx >= preguntaTexto.length) {
        clearInterval(escribir)
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setPanelCreciendo(true)
              audioEngine.expansionSubBass()
            })
          })
          setTimeout(() => setMostrarEsfera(true), 1700)
        }, 2000)
      }
    }, 38)
  }

  function reabrirCarrusel() {
    setCarruselMinimizado(false)
    setModoDirecto(true)
    setMostrarCarrusel(true)
  }

  const d = dimensionesRef.current

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tema.bg,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseMove={() => setIconosVisible(true)}
      onMouseLeave={() => !serviciosActivos.length && setIconosVisible(false)}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes pulsar { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.9;transform:scale(1.3)} }
        @keyframes flotar { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-6px)} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      <div
        ref={threeRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: mostrarCarrusel ? 51 : 1,
          pointerEvents: 'none',
        }}
      />

      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
            {tiempo === 'manana' && <>
              <stop offset="0%" stopColor="#060f1a" />
              <stop offset="60%" stopColor="#0d2240" />
              <stop offset="100%" stopColor="#1a3a5c" />
            </>}
            {tiempo === 'tarde' && <>
              <stop offset="0%" stopColor="#08050f" />
              <stop offset="60%" stopColor="#1a0a2e" />
              <stop offset="100%" stopColor="#2d1058" />
            </>}
            {tiempo === 'noche' && <>
              <stop offset="0%" stopColor="#05080a" />
              <stop offset="60%" stopColor="#080d10" />
              <stop offset="100%" stopColor="#0a1218" />
            </>}
          </linearGradient>

          <linearGradient id="niebla" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor={
              tiempo === 'manana' ? 'rgba(255,180,60,0.04)' :
              tiempo === 'tarde'  ? 'rgba(150,80,255,0.04)' :
                                    'rgba(29,158,117,0.03)'
            } />
          </linearGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#cielo)" />

        <path
          d="M0,680 L80,600 L180,640 L280,560 L380,610 L480,540 L580,590 L680,520 L780,570 L880,500 L980,550 L1080,480 L1180,530 L1280,470 L1380,520 L1440,490 L1440,900 L0,900 Z"
          fill={
            tiempo === 'manana' ? 'rgba(20,50,90,0.5)' :
            tiempo === 'tarde'  ? 'rgba(40,20,70,0.5)' :
                                  'rgba(8,20,28,0.6)'
          }
        />

        <path
          d="M0,740 L100,660 L200,700 L320,620 L420,670 L540,600 L640,650 L760,580 L860,630 L980,560 L1080,610 L1200,550 L1300,600 L1440,560 L1440,900 L0,900 Z"
          fill={
            tiempo === 'manana' ? 'rgba(12,35,65,0.7)' :
            tiempo === 'tarde'  ? 'rgba(25,12,50,0.7)' :
                                  'rgba(6,14,20,0.75)'
          }
        />

        <path
          d="M0,800 L120,720 L240,760 L360,690 L480,740 L600,680 L720,730 L840,670 L960,720 L1080,660 L1200,710 L1320,660 L1440,700 L1440,900 L0,900 Z"
          fill={
            tiempo === 'manana' ? 'rgba(8,22,42,0.85)' :
            tiempo === 'tarde'  ? 'rgba(16,8,32,0.85)' :
                                  'rgba(4,10,15,0.9)'
          }
        />

        <rect width="1440" height="900" fill="url(#niebla)" />

        {tiempo === 'manana' && (
          <ellipse cx="320" cy="820" rx="400" ry="80"
            fill="rgba(255,160,50,0.06)" />
        )}
        {tiempo === 'tarde' && (
          <ellipse cx="1100" cy="820" rx="350" ry="70"
            fill="rgba(180,80,255,0.06)" />
        )}
      </svg>

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 20% 10%, ${tema.luz1} 0%, transparent 60%),
                     radial-gradient(ellipse at 80% 90%, ${tema.luz2} 0%, transparent 50%)`,
        opacity: fase === 'activo' ? 1 : 0,
        transition: 'opacity 3s ease',
      }} />

      {fase === 'activo' && tiempo === 'noche' && (
        <EstrellasFugaces color={tema.acento} colorAlt={tema.jade} />
      )}

      {fase === 'activo' && (tiempo === 'manana' || tiempo === 'tarde') && (
        <Aves color={tema.textoDim} />
      )}

      <div style={{
        position: 'absolute', top: '1.5rem', left: '1.5rem',
        fontSize: '12px', color: tema.textoDim,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.06em',
        opacity: fase === 'activo' ? 1 : 0,
        transition: 'opacity 1s ease 1s',
        zIndex: 10,
      }}>
        {clima.desc} · {clima.temp}
      </div>

      {carruselMinimizado && (
        <div
          onClick={reabrirCarrusel}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(10,15,12,0.85)',
            border: `0.5px solid ${tema.jade}40`,
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            cursor: 'pointer', zIndex: 22,
            animation: 'slideUp 0.4s ease',
          }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F87171' }} />
          <span style={{ fontSize: '11px', color: tema.jade, fontFamily: "'DM Sans', sans-serif" }}>
            {PENDIENTES.filter(p => p.urgencia === 'alta').length} urgentes · ver
          </span>
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        paddingBottom: '100px',
        position: 'relative',
        zIndex: 5,
      }}>

        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(48px, 8vw, 80px)',
          fontWeight: 300,
          letterSpacing: '0.7em',
          color: tema.acento,
          opacity: fase === 'negro' ? 0 : 1,
          transform: fase === 'negro' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'all 2s cubic-bezier(.16,1,.3,1)',
          marginBottom: '0.5rem',
          animation: fase === 'activo' ? 'flotar 6s ease-in-out infinite' : 'none',
        }}>TONA</div>

        <div style={{
          width: fase === 'activo' ? '200px' : '0px',
          height: '0.5px',
          background: `linear-gradient(90deg, transparent, ${tema.jade}, ${tema.acento}, ${tema.jade}, transparent)`,
          opacity: 0.5,
          transition: 'width 1.5s ease 0.5s',
          marginBottom: '2.5rem',
        }} />

        <div style={{
          width: panelCreciendo ? '85vw' : '100%',
          maxWidth: panelCreciendo ? '900px' : '680px',
          height: panelCreciendo ? '80vh' : '140px',
          background: 'rgba(255,255,255,0.02)',
          border: `0.5px solid ${tema.jade}20`,
          borderRadius: '16px',
          padding: panelCreciendo ? '0' : 'clamp(1.5rem, 4vw, 2.5rem) clamp(1.5rem, 5vw, 3rem)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fase === 'activo' ? 1 : 0,
          transition: 'opacity 1.2s ease 0.3s, width 1.8s cubic-bezier(.22,1,.36,1), height 1.8s cubic-bezier(.22,1,.36,1), max-width 1.8s cubic-bezier(.22,1,.36,1), padding 1.8s cubic-bezier(.22,1,.36,1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <p style={{
            position: 'absolute',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(18px, 3vw, 26px)',
            fontWeight: 300,
            fontStyle: 'italic',
            color: tema.texto,
            lineHeight: 1.7,
            textAlign: 'center',
            letterSpacing: '0.02em',
            opacity: panelCreciendo ? 0 : 1,
            transform: panelCreciendo ? 'scale(0.9)' : 'scale(1)',
            transition: 'opacity 1s ease, transform 1s ease',
            pointerEvents: panelCreciendo ? 'none' : 'auto',
            margin: 0,
            width: '100%',
          }}>
            {texto}
            <span style={{ opacity: cursorTexto && !panelCreciendo ? 1 : 0, color: tema.jade }}>|</span>
          </p>

          <div
            style={{
              opacity: mostrarEsfera ? 1 : 0,
              transform: mostrarEsfera ? 'scale(1)' : 'scale(0.85)',
              transition: 'opacity 1s ease, transform 1s ease',
              pointerEvents: mostrarEsfera ? 'auto' : 'none',
              position: mostrarEsfera ? 'relative' : 'absolute',
            }}
          >
            <EsferaTona key="esfera-fija" tiempo={tiempo} size={460} iniciar={panelCreciendo} />
          </div>
        </div>

        {serviciosActivos.length >= 2 && (
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideUp 0.4s ease',
          }}>
            {serviciosActivos.map((id, i) => {
              const s = SERVICIOS.find(s => s.id === id)
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: combinando ? '44px' : '36px',
                    height: combinando ? '44px' : '36px',
                    borderRadius: '50%',
                    background: `${s.color}20`,
                    border: `0.5px solid ${s.color}`,
                    transition: 'all 0.4s cubic-bezier(.34,1.56,.64,1)',
                  }} />
                  {i < serviciosActivos.length - 1 && (
                    <div style={{
                      width: combinando ? '24px' : '16px',
                      height: '0.5px',
                      background: `linear-gradient(90deg, ${s.color}, ${tema.jade})`,
                      transition: 'width 0.4s ease',
                    }} />
                  )}
                </div>
              )
            })}
            <div style={{
              fontSize: '11px',
              color: tema.jade,
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.08em',
              marginLeft: '8px',
            }}>
              {combinando ? 'combinando flujo...' : 'flujo activo'}
            </div>
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        padding: '1rem 2rem 1.5rem',
        background: `linear-gradient(to top, ${tema.bg} 60%, transparent)`,
        display: 'flex',
        justifyContent: 'center',
        gap: 'clamp(8px, 2vw, 20px)',
        opacity: iconosVisible ? 1 : 0,
        transform: iconosVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s cubic-bezier(.16,1,.3,1)',
        zIndex: 10,
      }}>
        {SERVICIOS.map(s => (
          <GotaServicio
            key={s.id}
            serviceId={s.id}
            color={s.color}
            colorOscuro={s.colorOscuro}
            label={s.label}
            size={80}
            activo={serviciosActivos.includes(s.id)}
            onClick={() => toggleServicio(s.id)}
          />
        ))}
      </div>

      {mostrarCarrusel && d.NUM && (
        <CarruselPendientes
          pendientes={PENDIENTES}
          tema={tema}
          modoDirecto={modoDirecto}
          onMinimizar={() => {
            setMostrarCarrusel(true)
          }}
          onAbandonar={manejarAbandono}
          renderer={rendererRef.current}
          scene={sceneRef.current}
          camera={cameraRef.current}
          tarjetas={tarjetasRef.current}
          MINI_ANCHO={d.MINI_ANCHO}
          MINI_ALTO={d.MINI_ALTO}
          ANCHO={d.ANCHO}
          ALTO={d.ALTO}
          ESQUINA_X={d.ESQUINA_X}
          ESQUINA_Y={d.ESQUINA_Y}
          NUM={d.NUM}
        />
      )}
    </div>
  )
}