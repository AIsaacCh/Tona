import { useEffect, useState, useRef } from 'react'

function trazoAve(color, escala = 1) {
  return (
    <svg width={14 * escala} height={8 * escala} viewBox="0 0 14 8" style={{ display: 'block' }}>
      <path
        d="M0,4 Q3.5,0 7,4 Q10.5,0 14,4"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

export default function Aves({ color }) {
  const [bandadas, setBandadas] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    function crearBandada() {
      const id = idRef.current++
      const startY = Math.random() * 25 + 8
      const numAves = 2 + Math.floor(Math.random() * 3)
      const duracion = 14 + Math.random() * 8
      const direccion = Math.random() > 0.5 ? 1 : -1

      setBandadas(prev => [...prev, { id, startY, numAves, duracion, direccion }])

      setTimeout(() => {
        setBandadas(prev => prev.filter(b => b.id !== id))
      }, duracion * 1000 + 500)
    }

    const inicial = setTimeout(crearBandada, 1500)
    const intervalo = setInterval(() => {
      if (Math.random() > 0.5) crearBandada()
    }, 9000)

    return () => {
      clearTimeout(inicial)
      clearInterval(intervalo)
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes volar-derecha {
          from { transform: translateX(-8vw); opacity: 0; }
          8% { opacity: 0.6; }
          92% { opacity: 0.6; }
          to { transform: translateX(108vw); opacity: 0; }
        }
        @keyframes volar-izquierda {
          from { transform: translateX(108vw) scaleX(-1); opacity: 0; }
          8% { opacity: 0.6; }
          92% { opacity: 0.6; }
          to { transform: translateX(-8vw) scaleX(-1); opacity: 0; }
        }
        @keyframes aletear {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
      {bandadas.map(b => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            top: `${b.startY}%`,
            left: 0,
            display: 'flex',
            gap: '14px',
            animation: `${b.direccion > 0 ? 'volar-derecha' : 'volar-izquierda'} ${b.duracion}s linear forwards`,
          }}
        >
          {Array.from({ length: b.numAves }).map((_, i) => (
            <div
              key={i}
              style={{
                animation: `aletear ${0.8 + Math.random() * 0.4}s ease-in-out ${Math.random() * 0.5}s infinite`,
                marginTop: `${(Math.random() - 0.5) * 16}px`,
              }}
            >
              {trazoAve(color, 0.8 + Math.random() * 0.4)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}