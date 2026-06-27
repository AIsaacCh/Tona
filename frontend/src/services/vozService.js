// services/vozService.js
import api from './api'

class VozService {
  constructor() {
    this.recognition = null
    this.sintetizando = false
    this.escuchando = false
    this.onTranscripcion = null
    this.onRespuesta = null
    this.onEstado = null
    this.audioActual = null
    this.inicializado = false
    this.userId = 'demo'
    this.audioUnlocked = false
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    console.log('🔍 Navegador:', this.isSafari ? 'Safari' : 'Otro')
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

  unlockAudio() {
    if (this.audioUnlocked) {
      return true
    }
    
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
    } catch (e) {
      // Ignorar
    }
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
    this.onEstado?.('escuchando')

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
        this.onEstado?.('error')
        reject(e.error)
      }

      this.recognition.onend = () => {
        this.escuchando = false
        if (this.onEstado && this.escuchando) {
          this.onEstado?.('procesando')
        }
      }

      this.recognition.start()
    })
  }

  async enviarMensaje(userId, texto) {
    try {
      this.userId = userId || this.userId
      this.onEstado?.('procesando')
      
      console.log('📡 Enviando mensaje al chat...')
      const resp = await api.post('/agent/chat', {
        user_id: userId,
        mensaje: texto,
      })
      
      const respuestaTexto = resp.data.respuesta
      console.log('💬 Respuesta recibida:', respuestaTexto.substring(0, 50) + '...')
      
      this.onRespuesta?.(respuestaTexto, resp.data.acciones || [])
      
      await this.hablar(respuestaTexto)
      return respuestaTexto
    } catch (e) {
      console.error('Error enviando mensaje:', e)
      this.onEstado?.('error')
      setTimeout(() => this.onEstado?.('reposo'), 2000)
    }
  }

  async hablar(texto) {
    console.log(`🔊 TTS: "${texto.substring(0, 40)}..."`)
    
    // ✅ Detener audio anterior (esto puede generar AbortError, lo manejamos)
    this.detenerAudio()
    this.sintetizando = true
    this.onEstado?.('hablando')

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
        this.onEstado?.('reposo')
        URL.revokeObjectURL(url)
        console.log('⏹️ Audio terminado')
      }
      
      this.audioActual.onerror = (e) => {
        // ✅ Ignorar AbortError (es normal cuando se interrumpe)
        if (e.type === 'abort' || e.target?.error?.code === 25) {
          console.log('⏹️ Audio interrumpido (normal)')
        } else {
          console.error('❌ Error en audio:', e)
        }
        this.sintetizando = false
        this.onEstado?.('reposo')
        URL.revokeObjectURL(url)
      }
      
      try {
        await this.audioActual.play()
        console.log('▶️ Audio reproduciendo')
      } catch (playError) {
        // ✅ Si es AbortError, es normal (se interrumpió)
        if (playError.name === 'AbortError') {
          console.log('⏹️ Reproducción abortada (normal)')
          this.sintetizando = false
          this.onEstado?.('reposo')
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
      // ✅ Si es AbortError, es normal
      if (e.name === 'AbortError') {
        console.log('⏹️ Operación abortada (normal)')
        this.sintetizando = false
        this.onEstado?.('reposo')
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
      this.onEstado?.('reposo')
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
      this.onEstado?.('reposo')
    }
    
    u.onerror = () => {
      this.sintetizando = false
      this.onEstado?.('reposo')
    }
    
    this.onEstado?.('hablando')
    window.speechSynthesis.speak(u)
  }

  detenerAudio() {
    if (this.audioActual) {
      try {
        this.audioActual.pause()
        // ✅ Ignorar errores al detener
      } catch (e) {
        // Ignorar
      }
      this.audioActual = null
    }
    window.speechSynthesis?.cancel()
    this.sintetizando = false
  }

  detener() {
    this.recognition?.stop()
    this.detenerAudio()
    this.escuchando = false
    this.onEstado?.('reposo')
  }
}

const vozService = new VozService()
export default vozService