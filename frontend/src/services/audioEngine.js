import * as Tone from 'tone'

class AudioEngine {
  constructor() {
    this.iniciado = false
    this.reverb = null
    this.reverbCorta = null
  }

  async iniciar() {
    if (this.iniciado) return
    await Tone.start()

    
    this.reverb = new Tone.Reverb({ decay: 4.5, wet: 0.35 }).toDestination()
    await this.reverb.ready

    // Reverb corta — para tarjetas, sensación de cristal en cuarto pequeño
    this.reverbCorta = new Tone.Reverb({ decay: 0.8, wet: 0.25 }).toDestination()
    await this.reverbCorta.ready

    this.masterVol = new Tone.Volume(-6).toDestination()

    this.iniciado = true
  }

  get listo() {
    return this.iniciado
  }

  // ── Clic orgánico — gota tocando cristal, para texto escribiéndose ──
  clicGota() {
    if (!this.listo) return

    const variacion = 0.9 + Math.random() * 0.2
    const freqBase = (1600 + Math.random() * 500) * variacion

    // Componente de ruido — el "tap" físico
    const ruido = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.0005, decay: 0.015, sustain: 0, release: 0.01 },
      volume: -32,
    })
    const filtroRuido = new Tone.Filter({ frequency: freqBase * 2, type: 'highpass', Q: 1 })
    ruido.connect(filtroRuido)
    filtroRuido.connect(this.reverbCorta)
    ruido.triggerAttackRelease(0.01)

    // Componente tonal — el "ping" cristalino
    const tono = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.05 },
      volume: -26,
    })
    tono.connect(this.reverbCorta)
    tono.triggerAttackRelease(freqBase, 0.04)

    setTimeout(() => { ruido.dispose(); filtroRuido.dispose(); tono.dispose() }, 300)
  }

  // ── Campana de cristal — tarjeta llega a posición ───
campanaCristal({ urgencia = 'media' } = {}) {
  if (!this.listo) return

  
  const ruido = new Tone.Noise({ type: 'pink', volume: -26 })
  const filtro = new Tone.Filter({ frequency: 900, type: 'bandpass', Q: 0.6 })
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.04,
    decay: 0.15,
    sustain: 0.05,
    release: 0.2,
  })

  ruido.connect(filtro)
  filtro.connect(env)
  env.connect(this.reverbCorta)

  ruido.start()
  env.triggerAttackRelease(0.18)
  filtro.frequency.rampTo(450, 0.25)

  setTimeout(() => { ruido.stop(); ruido.dispose(); filtro.dispose(); env.dispose() }, 600)
}

  // ── Whoosh natural — tarjetas abandonando pantalla ──
  whooshAire({ duracion = 0.8 } = {}) {
    if (!this.listo) return

    const ruido = new Tone.Noise({ type: 'pink', volume: -22 })
    const filtro = new Tone.Filter({ frequency: 1400, type: 'bandpass', Q: 0.8 })
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.05,
      decay: duracion * 0.4,
      sustain: 0.2,
      release: duracion * 0.5,
    })

    ruido.connect(filtro)
    filtro.connect(env)
    env.connect(this.reverbCorta)

    ruido.start()
    env.triggerAttackRelease(duracion)

    filtro.frequency.rampTo(250, duracion)

    setTimeout(() => { ruido.stop(); ruido.dispose(); filtro.dispose(); env.dispose() }, duracion * 1000 + 500)
  }

  // ── Sub-bass de expansión — panel creciendo ─────────
  expansionSubBass({ duracion = 1.8 } = {}) {
    if (!this.listo) return
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: duracion * 0.3, decay: 0.2, sustain: 0.6, release: duracion * 0.4 },
      volume: -20,
    })
    synth.connect(this.reverb)
    synth.frequency.value = 55
    synth.triggerAttackRelease(55, duracion * 0.7)
    synth.frequency.rampTo(38, duracion)

    setTimeout(() => synth.dispose(), duracion * 1000 + 500)
  }

  // ── Capas atmosféricas — construcción de la esfera ──
  capaEsfera({ tipo = 'nucleo' } = {}) {
    if (!this.listo) return

    const configs = {
      nucleo:     { freq: 110,  tipo: 'sine',     attack: 0.4, decay: 0.8, sustain: 0.4, release: 1.5, vol: -16 },
      latitud:    { freq: 220,  tipo: 'triangle', attack: 0.5, decay: 0.6, sustain: 0.3, release: 1.8, vol: -20 },
      longitud:   { freq: 330,  tipo: 'sine',     attack: 0.6, decay: 0.6, sustain: 0.3, release: 2.0, vol: -20 },
      particulas: { freq: 660,  tipo: 'sine',     attack: 0.3, decay: 1.0, sustain: 0.2, release: 2.5, vol: -18 },
    }
    const c = configs[tipo] || configs.nucleo

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: c.tipo },
      envelope: { attack: c.attack, decay: c.decay, sustain: c.sustain, release: c.release },
      volume: c.vol,
    })
    const filtro = new Tone.Filter({ frequency: c.freq * 4, type: 'lowpass', Q: 0.5 })
    synth.connect(filtro)
    filtro.connect(this.reverb)

    // Acorde simple — fundamental + quinta + octava, da riqueza sin disonancia
    synth.triggerAttackRelease([c.freq, c.freq * 1.5, c.freq * 2], c.decay + c.sustain)

    setTimeout(() => { synth.dispose(); filtro.dispose() }, (c.attack + c.decay + c.release) * 1000 + 500)
  }

  // ── Shimmer final — partículas completas, brillo etéreo ──
  shimmer() {
    if (!this.listo) return
    const notas = ['E6', 'G6', 'A6', 'C7', 'E7']
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.1, release: 1.5 },
      volume: -22,
    })
    synth.connect(this.reverb)

    notas.forEach((nota, i) => {
      setTimeout(() => {
        synth.triggerAttackRelease(nota, 1.2)
      }, i * 110)
    })

    setTimeout(() => synth.dispose(), 3000)
  }
}

const audioEngine = new AudioEngine()
export default audioEngine