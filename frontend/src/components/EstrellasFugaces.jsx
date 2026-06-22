import { useEffect, useState, useRef } from 'react'

export default function EstrellasFugaces({ color, colorAlt }) {
  const [estrellas, setEstrellas] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    function crearEstrella() {
      const id = idRef.current++
      const startY = Math.random() * 35 + 5
      const startX = Math.random() * 60 + 10
      const angulo = 25 + Math.random() * 15
      const duracion = 1.4 + Math.random() * 1
      const distancia = 35 + Math.random() * 25

      setEstrellas(prev => [...prev, {
        id, startX, startY, angulo, duracion, distancia,
        color: Math.random() > 0.7 ? colorAlt : color,
      }])

      setTimeout(() => {
        setEstrellas(prev => prev.filter(e => e.id !== id))
      }, duracion * 1000 + 200)
    }

    // Primera estrella con delay inicial
    const inicial = setTimeout(crearEstrella, 2000 + Math.random() * 3000)

    // Estrellas siguientes en intervalos aleatorios — no muy recurrentes
    const intervalo = setInterval(() => {
      if (Math.random() > 0.45) crearEstrella()
    }, 4500)

    return () => {
      clearTimeout(inicial)
      clearInterval(intervalo)
    }
  }, [color, colorAlt])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes fugaz {
          0% { opacity: 0; transform: translate(0, 0); }
          8% { opacity: 1; }
          85% { opacity: 0.8; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
        }
      `}</style>
      {estrellas.map(e => {
        const rad = (e.angulo * Math.PI) / 180
        const dx = Math.cos(rad) * e.distancia
        const dy = Math.sin(rad) * e.distancia
        return (
          <div
            key={e.id}
            style={{
              position: 'absolute',
              left: `${e.startX}%`,
              top: `${e.startY}%`,
              width: '2px',
              height: '2px',
              '--dx': `${dx}vw`,
              '--dy': `${dy}vh`,
              animation: `fugaz ${e.duracion}s linear forwards`,
            }}
          >
            <div style={{
              position: 'absolute',
              width: '60px',
              height: '1px',
              background: `linear-gradient(${e.angulo}deg, transparent, ${e.color})`,
              transform: `rotate(${e.angulo}deg)`,
              transformOrigin: 'right center',
              right: 0,
            }} />
            <div style={{
              position: 'absolute',
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: e.color,
              boxShadow: `0 0 4px ${e.color}, 0 0 8px ${e.color}`,
            }} />
          </div>
        )
      })}
    </div>
  )
}