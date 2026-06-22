import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import audioEngine from '../services/audioEngine'

const COLORES_TEMA = {
  manana: { primario: 0xF5C87A, secundario: 0x2EC990 },
  tarde:  { primario: 0xC084FC, secundario: 0x34D399 },
  noche:  { primario: 0xE8D5A3, secundario: 0x1D9E75 },
}

export default function EsferaTona({ tiempo = 'noche', size = 460, iniciar = true }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const colores = COLORES_TEMA[tiempo] || COLORES_TEMA.noche

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.z = 4.2

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(size, size)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const grupo = new THREE.Group()
    scene.add(grupo)

    const RADIO = 1.6
    const NUM_ANILLOS_LAT = 7
    const NUM_ANILLOS_LON = 5
    const NUM_PARTICULAS = 90

    function colorMezcla(t) {
      const c1 = new THREE.Color(colores.primario)
      const c2 = new THREE.Color(colores.secundario)
      return c1.clone().lerp(c2, t)
    }

    // ── Núcleo central ──────────────────────────────────
    const nucleoGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const nucleoMat = new THREE.MeshBasicMaterial({
      color: colores.primario, transparent: true, opacity: 0,
    })
    const nucleo = new THREE.Mesh(nucleoGeo, nucleoMat)
    nucleo.scale.setScalar(0.01)
    scene.add(nucleo)

    const glowGeo = new THREE.SphereGeometry(0.28, 16, 16)
    const glowMat = new THREE.MeshBasicMaterial({
      color: colores.primario, transparent: true, opacity: 0,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.scale.setScalar(0.01)
    scene.add(glow)

    // ── Anillos de latitud ──────────────────────────────
    const anillosLat = []
    for (let i = 0; i < NUM_ANILLOS_LAT; i++) {
      const lat = (i / (NUM_ANILLOS_LAT - 1) - 0.5) * Math.PI * 0.85
      const r = Math.cos(lat) * RADIO
      const y = Math.sin(lat) * RADIO
      const puntos = []
      const segments = 64
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2
        puntos.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(puntos)
      const mat = new THREE.LineBasicMaterial({
        color: colorMezcla(i / NUM_ANILLOS_LAT), transparent: true, opacity: 0,
      })
      const linea = new THREE.LineLoop(geo, mat)
      linea.scale.setScalar(0.3)
      grupo.add(linea)
      anillosLat.push({ mesh: linea, offset: i })
    }

    // ── Anillos de longitud ─────────────────────────────
    const anillosLon = []
    for (let i = 0; i < NUM_ANILLOS_LON; i++) {
      const rotY = (i / NUM_ANILLOS_LON) * Math.PI
      const puntos = []
      const segments = 64
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2
        puntos.push(new THREE.Vector3(
          Math.cos(a) * RADIO * Math.cos(rotY),
          Math.sin(a) * RADIO,
          Math.cos(a) * RADIO * Math.sin(rotY)
        ))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(puntos)
      const mat = new THREE.LineBasicMaterial({
        color: colorMezcla(0.5 + i / NUM_ANILLOS_LON * 0.5), transparent: true, opacity: 0,
      })
      const linea = new THREE.LineLoop(geo, mat)
      linea.scale.setScalar(0.3)
      grupo.add(linea)
      anillosLon.push({ mesh: linea, offset: i })
    }

    // ── Partículas ──────────────────────────────────────
    const posiciones = new Float32Array(NUM_PARTICULAS * 3)
    const datosParticula = []
    for (let i = 0; i < NUM_PARTICULAS; i++) {
      const r = RADIO * (0.5 + Math.random() * 0.9)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      posiciones[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      posiciones[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      posiciones[i * 3 + 2] = r * Math.cos(phi)
      datosParticula.push({
        baseR: r, theta, phi,
        velocidad: 0.2 + Math.random() * 0.4,
        fase: Math.random() * Math.PI * 2,
      })
    }
    const particulasGeo = new THREE.BufferGeometry()
    particulasGeo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
    const particulasMat = new THREE.PointsMaterial({
      color: colores.secundario, size: 0.035, transparent: true, opacity: 0, sizeAttenuation: true,
    })
    const particulas = new THREE.Points(particulasGeo, particulasMat)
    grupo.add(particulas)

    // ── Líneas de convergencia ──────────────────────────
    const lineasConvergencia = []
    for (let i = 0; i < 12; i++) {
      const idx = Math.floor(Math.random() * NUM_PARTICULAS)
      const geo = new THREE.BufferGeometry()
      const mat = new THREE.LineBasicMaterial({
        color: colores.primario, transparent: true, opacity: 0,
      })
      const linea = new THREE.Line(geo, mat)
      grupo.add(linea)
      lineasConvergencia.push({ mesh: linea, idx })
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))

    // ── Construcción progresiva ─────────────────────────
    let faseConstruccion = iniciar ? 0 : -1
    let tConstruccion = 0
    const DURACION_FASE = 0.9

    // Flags — cada sonido suena una sola vez
    const sonidosDisparados = { nucleo: false, lat: false, lon: false, particulas: false }

    function lerp(a, b, t) { return a + (b - a) * Math.min(Math.max(t, 0), 1) }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

    let t = 0
    let frameId

    function animar(dt) {
      frameId = requestAnimationFrame(animar)
      t += 0.012

      grupo.rotation.y += 0.0022
      grupo.rotation.x = Math.sin(t * 0.15) * 0.08

      if (faseConstruccion >= 0) {
        tConstruccion += 0.016

        // Fase 1 — núcleo
        const p1 = easeOut(Math.min(tConstruccion / DURACION_FASE, 1))
        if (p1 > 0.01 && !sonidosDisparados.nucleo) {
          audioEngine.capaEsfera({ tipo: 'nucleo' })
          sonidosDisparados.nucleo = true
        }
        nucleo.material.opacity = lerp(0, 0.9, p1)
        nucleo.scale.setScalar(lerp(0.01, 1, p1) * (1 + Math.sin(t * 1.8) * 0.12))
        glow.material.opacity = lerp(0, 0.15, p1)
        glow.scale.setScalar(lerp(0.01, 1.3, p1))

        // Fase 2 — anillos de latitud
        const inicio2 = DURACION_FASE * 0.6
        if (tConstruccion > inicio2) {
          if (!sonidosDisparados.lat) {
            audioEngine.capaEsfera({ tipo: 'latitud' })
            sonidosDisparados.lat = true
          }
          anillosLat.forEach((a, i) => {
            const delayLocal = i * 0.08
            const p = easeOut(Math.min(Math.max((tConstruccion - inicio2 - delayLocal) / DURACION_FASE, 0), 1))
            a.mesh.material.opacity = lerp(0, 0.35, p)
            a.mesh.scale.setScalar(lerp(0.3, 1, p))
          })
        }

        // Fase 3 — anillos de longitud
        const inicio3 = inicio2 + DURACION_FASE * 0.9
        if (tConstruccion > inicio3) {
          if (!sonidosDisparados.lon) {
            audioEngine.capaEsfera({ tipo: 'longitud' })
            sonidosDisparados.lon = true
          }
          anillosLon.forEach((a, i) => {
            const delayLocal = i * 0.08
            const p = easeOut(Math.min(Math.max((tConstruccion - inicio3 - delayLocal) / DURACION_FASE, 0), 1))
            a.mesh.material.opacity = lerp(0, 0.28, p)
            a.mesh.scale.setScalar(lerp(0.3, 1, p))
          })
        }

        // Fase 4 — partículas y shimmer final
        const inicio4 = inicio3 + DURACION_FASE * 0.9
        if (tConstruccion > inicio4) {
          if (!sonidosDisparados.particulas) {
            audioEngine.capaEsfera({ tipo: 'particulas' })
            audioEngine.shimmer()
            sonidosDisparados.particulas = true
          }
          const p4 = easeOut(Math.min(Math.max((tConstruccion - inicio4) / DURACION_FASE, 0), 1))
          particulasMat.opacity = lerp(0, 0.7, p4)
          lineasConvergencia.forEach(l => {
            l.mesh.material.opacity = lerp(0, 0.18, p4)
          })
        }
      }

      // Partículas respirando
      if (particulasMat.opacity > 0.01) {
        const posArr = particulasGeo.attributes.position.array
        for (let i = 0; i < NUM_PARTICULAS; i++) {
          const d = datosParticula[i]
          const respiro = 1 + Math.sin(t * d.velocidad + d.fase) * 0.15
          const r = d.baseR * respiro
          posArr[i * 3]     = r * Math.sin(d.phi) * Math.cos(d.theta)
          posArr[i * 3 + 1] = r * Math.sin(d.phi) * Math.sin(d.theta)
          posArr[i * 3 + 2] = r * Math.cos(d.phi)
        }
        particulasGeo.attributes.position.needsUpdate = true

        lineasConvergencia.forEach((l, i) => {
          const px = posArr[l.idx * 3]
          const py = posArr[l.idx * 3 + 1]
          const pz = posArr[l.idx * 3 + 2]
          l.mesh.geometry.setFromPoints([
            new THREE.Vector3(px, py, pz),
            new THREE.Vector3(0, 0, 0),
          ])
        })
      }

      anillosLat.forEach((a) => {
        if (a.mesh.material.opacity > 0.01) {
          const escala = 1 + Math.sin(t * 0.5 + a.offset) * 0.02
          a.mesh.scale.setScalar(a.mesh.scale.x * 0 + escala * (a.mesh.scale.x > 0.95 ? 1 : a.mesh.scale.x))
        }
      })

      renderer.render(scene, camera)
    }
    animar()

    return () => {
      cancelAnimationFrame(frameId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [tiempo, size, iniciar])

  return <div ref={mountRef} style={{ width: size, height: size }} />
}