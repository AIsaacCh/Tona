// services/vozService.js
import api from './api'

class VozService {
  constructor() {
    this.recognition = null
    this.sintetizando = false
    this.escuchando = false
    this.onTranscripcion = null
    this.onRespuesta = null
    this.audioActual = null
    this.inicializado = false
    this.userId = 'demo'
    this.audioContext = null
    this.audioBufferSource = null
    this.audioUnlocked = false
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    // ✅ LISTA DE SUSCRIPTORES
    this._listeners = []
    this._estadoActual = 'reposo'
    
    console.log('🔍 Navegador:', this.isSafari ? 'Safari' : 'Otro')
  }

  // ✅ SUSCRIBIRSE A CAMBIOS DE ESTADO
  suscribirEstado(callback) {
    if (typeof callback === 'function') {
      this._listeners.push(callback)
      // Llamar inmediatamente con el estado actual
      callback(this._estadoActual)
      // Devolver función para desuscribirse
      return () => {
        this._listeners = this._listeners.filter(cb => cb !== callback)
      }
    }
    return () => {}
  }

  // ✅ NOTIFICAR A TODOS LOS SUSCRIPTORES
  _notificar(estado) {
    this._estadoActual = estado
    this._listeners.forEach(cb => {
      try { cb(estado) } catch (e) {}
    })
  }

  unlockAudio() {
    if (this.audioUnlocked) return true
    
    try {
      console.log('🔓 Desbloqueando audio en Safari...')
      const audio = document.createElement('audio')
      const silentMP3 = 'data:audio/mpeg;base64,//MkxAAHiAADWABAFhG8F//8N//9v/+//v/+//v/+//v/+//v/+//v/+//v/+//v/+//v/+//v/+//v/+//v/+'
      audio.src = silentMP3
      audio.volume = 0
      
      const playPromise = audio.play()
      if (playPromise) {
        playPromise.then(() => {
          audio.pause()
          this.audioUnlocked = true
          console.log('✅ Audio desbloqueado exitosamente')
        }).catch(() => {
          this.unlockWithAudioContext()
        })
      }
      this.unlockWithAudioContext()
      return true
    } catch (e) {
      console.warn('⚠️ Error desbloqueando audio:', e)
      return false
    }
  }

  unlockWithAudioContext() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          gain.gain.value = 0.001
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 0.01)
        })
      }
    } catch (e) {}
  }

  inicializar() {
    if (this.inicializado) return true
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Web Speech API no disponible')
      return false
    }
    this.recognition = new SpeechRecognition()
    this.recognition.lang = 'es-MX'
    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.maxAlternatives = 1
    this.inicializado = true
    return true
  }

  async activar(userId) {
    console.log('🎤 Activando micrófono...')
    
    if (this.isSafari && !this.audioUnlocked) {
      this.unlockAudio()
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    this.userId = userId || this.userId
    if (!this.inicializar()) return
    if (this.sintetizando) {
      this.detenerAudio()
      return
    }

    this.escuchando = true
    this._notificar('escuchando')

    return new Promise((resolve, reject) => {
      this.recognition.onresult = (e) => {
        const transcripcion = Array.from(e.results)
          .map(r => r[0].transcript)
          .join('')

        const esFinal = e.results[e.results.length - 1].isFinal
        this.onTranscripcion?.(transcripcion, esFinal)

        if (esFinal) {
          resolve(transcripcion)
        }
      }

      this.recognition.onerror = (e) => {
        this.escuchando = false
        this._notificar('error')
        reject(e.error)
      }

      this.recognition.onend = () => {
        this.escuchando = false
      }

      this.recognition.start()
    })
  }

  async enviarMensaje(userId, texto) {
  try {
    this.userId = userId || this.userId
    this._notificar('procesando')
    
    const resp = await api.post('/agent/chat', {
      user_id: userId,
      mensaje: texto,
    })
    
    // ← cambio aquí: antes era resp.data.respuesta
    const { accion, payload, mensaje } = resp.data
    
    // Emitir la acción al bus
    const { agenteBus } = await import('../components/AgenteTona')
    agenteBus.emit(accion, payload)
    
    // Hablar si hay mensaje
    if (mensaje) {
      await this.hablar(mensaje)
    }
    
    return resp.data
  } catch (e) {
    console.error('Error enviando mensaje:', e)
    this._notificar('error')
    setTimeout(() => this._notificar('reposo'), 2000)
  }
}

  async hablar(texto) {
    console.log(`🔊 TTS: "${texto.substring(0, 40)}..."`)
    
    this.detenerAudio()
    this.sintetizando = true
    this._notificar('hablando')

    try {
      console.log('📡 Solicitando audio a la API...')
      const resp = await api.post('/agent/hablar',
        { texto, user_id: this.userId || 'demo' },
        { responseType: 'blob' }
      )

      console.log(`✅ Audio recibido: ${resp.data.size} bytes`)
      
      const url = URL.createObjectURL(resp.data)
      this.audioActual = new Audio(url)
      
      this.audioActual.onended = () => {
        this.sintetizando = false
        this._notificar('reposo')
        URL.revokeObjectURL(url)
        console.log('⏹️ Audio terminado')
      }
      
      this.audioActual.onerror = (e) => {
        if (e.type === 'abort' || e.target?.error?.code === 25) {
          console.log('⏹️ Audio interrumpido (normal)')
        } else {
          console.error('❌ Error en audio:', e)
        }
        this.sintetizando = false
        this._notificar('reposo')
        URL.revokeObjectURL(url)
      }
      
      try {
        await this.audioActual.play()
        console.log('▶️ Audio reproduciendo')
      } catch (playError) {
        if (playError.name === 'AbortError') {
          console.log('⏹️ Reproducción abortada (normal)')
          this.sintetizando = false
          this._notificar('reposo')
          return
        }
        
        console.error('❌ Error al reproducir:', playError)
        
        if (this.isSafari) {
          console.log('🔄 Safari: Reintentando desbloquear...')
          this.audioUnlocked = false
          this.unlockAudio()
          await new Promise(resolve => setTimeout(resolve, 200))
          await this.audioActual.play()
          console.log('▶️ Audio reproduciendo después de reintentar')
        } else {
          throw playError
        }
      }
      
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('⏹️ Operación abortada (normal)')
        this.sintetizando = false
        this._notificar('reposo')
        return
      }
      
      console.error('❌ Error en reproducción:', e)
      this.sintetizando = false
      this._hablarFallback(texto)
    }
  }

  _hablarFallback(texto) {
    console.log('📢 Fallback: TTS navegador')
    
    if (!window.speechSynthesis) {
      this._notificar('reposo')
      return
    }
    
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'es-MX'
    u.rate = 0.88
    u.pitch = 0.9
    
    const voces = window.speechSynthesis.getVoices()
    const voz = voces.find(v => v.name === 'Mónica')
      || voces.find(v => v.lang.includes('es'))
    if (voz) u.voice = voz
    
    u.onend = () => {
      this.sintetizando = false
      this._notificar('reposo')
    }
    
    u.onerror = () => {
      this.sintetizando = false
      this._notificar('reposo')
    }
    
    this._notificar('hablando')
    window.speechSynthesis.speak(u)
  }

  detenerAudio() {
    if (this.audioActual) {
      try {
        this.audioActual.pause()
      } catch (e) {}
      this.audioActual = null
    }
    window.speechSynthesis?.cancel()
    this.sintetizando = false
    this._notificar('reposo')
  }

  detener() {
    if (this.recognition) {
      try { this.recognition.stop() } catch (e) {}
    }
    this.detenerAudio()
    this.escuchando = false
    this._notificar('reposo')
  }
}

const vozService = new VozService()
export default vozService