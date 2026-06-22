import { useEffect } from "react";
import { animate, remove } from "animejs";
import audioEngine from '../services/audioEngine'

export default function CarruselPendientes({
  pendientes, tema, onMinimizar, onAbandonar,
  modoDirecto,
  renderer, scene, camera, tarjetas,
  MINI_ANCHO, MINI_ALTO, ANCHO, ALTO, ESQUINA_X, ESQUINA_Y, NUM,
}) {
  useEffect(() => {
    const fov  = camera.fov * (Math.PI / 180)
    const visH = 2 * Math.tan(fov / 2) * camera.position.z
    const visW = visH * camera.aspect

    const FILA_Y = visH / 2 - MINI_ALTO / 2 - 0.3
    const FILA_GAP = MINI_ANCHO + 0.25
    const FILA_INICIO_X = -((NUM - 1) * FILA_GAP) / 2

    function mostrarFilaDirecta() {
      tarjetas.forEach((t, i) => {
        t.mesh.position.set(FILA_INICIO_X + i * FILA_GAP, FILA_Y, i * 0.01)
        t.mesh.rotation.set(0, 0, 0)
        t.mesh.scale.set(MINI_ANCHO / ANCHO, MINI_ALTO / ALTO, 1)
        t.mat.opacity = 0.18
        if (t.edgeMat) t.edgeMat.opacity = 0.5
        if (t.spriteMat) t.spriteMat.opacity = 0.6
      })
      setTimeout(() => onMinimizar(), 100)
    }

    function abandonarPantalla() {
      audioEngine.whooshAire({ duracion: 0.8, direccion: 'down' })
      tarjetas.forEach((t, i) => {
        const proxy = {
          x: t.mesh.position.x,
          y: t.mesh.position.y,
          z: t.mesh.position.z,
          opacity: t.mat.opacity,
          edgeOpacity: t.edgeMat ? t.edgeMat.opacity : 0,
          spriteOpacity: t.spriteMat ? t.spriteMat.opacity : 0,
        }
        animate(proxy, {
          y: -visH / 2 - MINI_ALTO,
          opacity: 0,
          edgeOpacity: 0,
          spriteOpacity: 0,
          duration: 700,
          delay: i * 40,
          ease: "easeOutQuad",
          onUpdate() {
            t.mesh.position.set(proxy.x, proxy.y, proxy.z)
            t.mat.opacity = proxy.opacity
            if (t.edgeMat) t.edgeMat.opacity = proxy.edgeOpacity
            if (t.spriteMat) t.spriteMat.opacity = proxy.spriteOpacity
          },
          onComplete() {
            if (i === NUM - 1) onAbandonar()
          }
        })
      })
    }

    if (modoDirecto) {
      mostrarFilaDirecta()
      return () => {}
    }

    function apilarTarjetas() {
      const stackX = ESQUINA_X
      const stackY = ESQUINA_Y

      tarjetas.forEach((t, i) => {
        const rotZDestino = (Math.random() - 0.5) * 0.18
        const offsetX     = (Math.random() - 0.5) * 0.08
        const offsetY     = (Math.random() - 0.5) * 0.05
        const zDestino    = i * 0.015

        const proxy = {
          x:      ESQUINA_X + i * (MINI_ANCHO + 0.15),
          y:      ESQUINA_Y,
          z:      0,
          ry:     0,
          rz:     t.mesh.rotation.z,
          sx:     t.mesh.scale.x,
          sy:     t.mesh.scale.y,
        }

        animate(proxy, {
          x:      stackX + offsetX,
          y:      stackY + offsetY,
          z:      zDestino,
          ry:     0,
          rz:     rotZDestino,
          sx:     MINI_ANCHO / ANCHO,
          sy:     MINI_ALTO  / ALTO,
          delay:  i * 150,
          duration: 1100,
          ease: "easeOutElastic(0.7, 0.5)",
          onUpdate() {
            t.mesh.position.set(proxy.x, proxy.y, proxy.z)
            t.mesh.rotation.y = proxy.ry
            t.mesh.rotation.z = proxy.rz
            t.mesh.scale.set(proxy.sx, proxy.sy, 1)
          },
          onComplete() {
            if (i === NUM - 1) {
              setTimeout(abandonarPantalla, 500)
            }
          }
        })
      })
    }

    let sacarCount = 0

    function sacarUna(t, idx) {
      remove(t.angulo)
      remove(t.escala)

      const destX = ESQUINA_X + idx * (MINI_ANCHO + 0.15)
      const destY = ESQUINA_Y

      const proxy = {
        x:      t.mesh.position.x,
        y:      t.mesh.position.y,
        z:      t.mesh.position.z,
        ry:     t.mesh.rotation.y,
        sx:     t.mesh.scale.x,
        sy:     t.mesh.scale.y,
      }

      animate(proxy, {
        x:      destX,
        y:      destY,
        z:      0,
        ry:     0,
        sx:     MINI_ANCHO / ANCHO,
        sy:     MINI_ALTO  / ALTO,
        duration: 1000,
        ease: "easeOutElastic(0.8, 0.6)",
        onUpdate() {
          t.mesh.position.set(proxy.x, proxy.y, proxy.z)
          t.mesh.rotation.y = proxy.ry
          t.mesh.scale.set(proxy.sx, proxy.sy, 1)
        },
        onComplete() {
          sacarCount++
          if (sacarCount === NUM) {
            setTimeout(apilarTarjetas, 800)
          }
        },
      })
    }

    function sacarTarjetas() {
      tarjetas.forEach((t, i) => {
        setTimeout(() => sacarUna(t, i), i * 700)
      })
    }

    function colocarEnRueda(t) {
      const RADIO = (ANCHO * 1.3) / (2 * Math.sin(Math.PI / NUM))
      const a = t.angulo.val
      t.mesh.position.x = Math.sin(a) * RADIO
      t.mesh.position.z = Math.cos(a) * RADIO - RADIO
      t.mesh.rotation.y = -a
      t.mesh.scale.set(t.escala.x, t.escala.y, 1)
    }

    const paso = (Math.PI * 2) / NUM
    let offset = 0
    let pasos  = 0

    // Aparición inicial — cristal, borde y texto desde 0
    tarjetas.forEach(t => {
      const proxy = { opacity: 0, edgeOpacity: 0, spriteOpacity: 0 }
      animate(proxy, {
        opacity: 0.18,
        edgeOpacity: 0.5,
        spriteOpacity: 0.25,
        duration: 600,
        onUpdate() {
          t.mat.opacity = proxy.opacity
          if (t.edgeMat) t.edgeMat.opacity = proxy.edgeOpacity
          if (t.spriteMat) t.spriteMat.opacity = proxy.spriteOpacity
        },
      })
    })

    function rotar() {
      pasos++
      if (pasos > NUM) {
        clearInterval(intervalo)
        setTimeout(sacarTarjetas, 600)
        return
      }
      offset += paso

      const idxActiva = ((NUM - pasos) % NUM + NUM) % NUM

      tarjetas.forEach((t, i) => {
        const destino = (i / NUM) * Math.PI * 2 + offset
        const delay   = i * 50
        remove(t.angulo)
        remove(t.escala)
        t.escala.x = 1
        t.escala.y = 1
        animate(t.angulo, {
          val:      destino,
          duration: 1200,
          ease:     "easeOutElastic(1, 0.5)",
          delay,
          onUpdate: () => colocarEnRueda(t),
          onComplete: () => audioEngine.campanaCristal({ urgencia: pendientes[i].urgencia }),
        })
        animate(t.escala, {
          keyframes: [
            { x: 1.20, y: 0.80, duration: 150, ease: "easeOutQuad" },
            { x: 1.0,  y: 1.0,  duration: 600, ease: "easeOutElastic(1, 0.4)" },
          ],
          delay,
          onUpdate: () => colocarEnRueda(t),
        })

        const esActiva = i === idxActiva
        const proxyFoco = {
          spriteOp: t.spriteMat ? t.spriteMat.opacity : 0,
          edgeOp: t.edgeMat ? t.edgeMat.opacity : 0,
        }
        animate(proxyFoco, {
          spriteOp: esActiva ? 1 : 0.25,
          edgeOp: esActiva ? 0.9 : 0.25,
          duration: 700,
          delay: delay + 200,
          ease: "easeOutQuad",
          onUpdate() {
            if (t.spriteMat) t.spriteMat.opacity = proxyFoco.spriteOp
            if (t.edgeMat) t.edgeMat.opacity = proxyFoco.edgeOp
          },
        })
      })
    }

    const intervalo = setInterval(rotar, 2000)

    return () => clearInterval(intervalo)
  }, [modoDirecto])

  return (
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(5,8,10,0.88)',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 52,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(80px, 16vw, 140px)',
          fontWeight: 300,
          letterSpacing: '0.5em',
          color: tema.acento,
          opacity: 0.03,
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>TONA</div>
      </div>
    </>
  )
}