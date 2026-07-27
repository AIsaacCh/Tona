import { useEffect, useRef } from 'react'

const COLORES = ['#2ec990', '#3fb8b0', '#d4a24c']

export default function MallaFondo() {
  const canvasRef = useRef(null)
  const scrollRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let width, height, dpr
    let puntos = []
    const COLS = 26
    const ROWS = 16
    let t = 0

    function construirMalla() {
      puntos = []
      const spacingX = width / (COLS - 1)
      const spacingY = height / (ROWS - 1)
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          puntos.push({
            baseX: x * spacingX,
            baseY: y * spacingY,
            col: x,
            row: y,
            color: COLORES[(x + y) % COLORES.length],
          })
        }
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      construirMalla()
    }

    function onScroll() {
      scrollRef.current = window.scrollY
    }

    function dibujar() {
      ctx.clearRect(0, 0, width, height)
      const scroll = scrollRef.current
      const centroX = width / 2
      const centroY = height / 2

      for (const p of puntos) {
        // Ondulación tipo olas: profundidad simulada con seno según posición + tiempo + scroll
        const onda = Math.sin(p.col * 0.4 + t * 0.6) * 14 + Math.cos(p.row * 0.5 + t * 0.4 + scroll * 0.002) * 10
        const profundidad = Math.sin(p.col * 0.3 + p.row * 0.3 + t * 0.5) * 0.5 + 0.5 // 0..1

        // Perspectiva simple: puntos "más cerca" (profundidad alta) se ven más grandes y desplazados hacia el centro
        const escala = 0.5 + profundidad * 0.9
        const parallax = (scroll * 0.03) % height
        let y = p.baseY + onda - parallax
        // Wrap vertical infinito para que el scroll nunca se acabe
        if (y < -40) y += height + 80
        if (y > height + 40) y -= height + 80

        const dx = (p.baseX - centroX) * (1 - escala) * 0.15
        const x = p.baseX + dx

        const radio = 1.1 + escala * 1.6
        const opacidad = 0.08 + profundidad * 0.22

        ctx.beginPath()
        ctx.arc(x, y, radio, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = opacidad
        ctx.fill()
      }
      ctx.globalAlpha = 1

      t += 0.012
      rafRef.current = requestAnimationFrame(dibujar)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', onScroll, { passive: true })
    dibujar()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  )
}