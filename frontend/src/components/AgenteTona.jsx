import { useEffect, useRef, useState } from 'react'
import vozService from '../services/vozService'

const ESTADOS = {
  reposo:      { label: 'Toca para hablar', color: 'rgba(29,158,117,0.3)' },
  escuchando:  { label: 'Escuchando...', color: 'rgba(93,202,165,0.6)' },
  procesando:  { label: 'Procesando...', color: 'rgba(232,213,163,0.4)' },
  hablando:    { label: 'Tona habla...', color: 'rgba(29,158,117,0.5)' },
  error:       { label: 'Error — intenta de nuevo', color: 'rgba(248,113,113,0.4)' },
}

export default function AgenteTona({ userId, tema, mostrarChat = false }) {
  const [estado, setEstado] = useState('reposo')
  const [transcripcion, setTranscripcion] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [chatVisible, setChatVisible] = useState(false)
  const [mensajeChat, setMensajeChat] = useState('')
  const [historialChat, setHistorialChat] = useState([])
  const [acciones, setAcciones] = useState([])
  const pulsoRef = useRef(null)

  useEffect(() => {
    vozService.onEstado = (nuevoEstado) => setEstado(nuevoEstado)
    vozService.onTranscripcion = (texto, esFinal) => {
      setTranscripcion(texto)
      if (esFinal) setTranscripcion('')
    }
    vozService.onRespuesta = (texto, accs) => {
      setRespuesta(texto)
      setAcciones(accs)
      setHistorialChat(prev => [...prev,
        { role: 'tona', content: texto }
      ])
      setTimeout(() => setRespuesta(''), 8000)
    }

    return () => {
      vozService.detener()
    }
  }, [])

  async function manejarActivacion() {
    if (estado === 'escuchando') {
      vozService.detener()
      return
    }
    if (estado === 'hablando') {
      vozService.detenerAudio()
      return
    }
    try {
      const texto = await vozService.activar(userId)
      if (texto?.trim()) {
        setHistorialChat(prev => [...prev,
          { role: 'user', content: texto }
        ])
        await vozService.enviarMensaje(userId, texto)
      }
    } catch (e) {
      setEstado('reposo')
    }
  }

  async function enviarChat() {
    if (!mensajeChat.trim()) return
    const texto = mensajeChat
    setMensajeChat('')
    setHistorialChat(prev => [...prev, { role: 'user', content: texto }])
    await vozService.enviarMensaje(userId, texto)
  }

  const estadoActual = ESTADOS[estado] || ESTADOS.reposo
  const estaActivo = estado === 'escuchando' || estado === 'hablando'

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
    }}>

      {/* Transcripción en tiempo real */}
      {transcripcion && (
        <div style={{
          position: 'absolute',
          top: '-3rem',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
          color: tema.jade,
          fontStyle: 'italic',
          opacity: 0.8,
          textAlign: 'center',
          animation: 'slideUp 0.3s ease',
        }}>
          "{transcripcion}"
        </div>
      )}

      {/* Respuesta de Tona */}
      {respuesta && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 1rem)',
          width: '100%',
          maxWidth: '600px',
          background: 'rgba(255,255,255,0.03)',
          border: `0.5px solid ${tema.jade}30`,
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          backdropFilter: 'blur(8px)',
          animation: 'slideUp 0.4s ease',
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(14px, 2vw, 18px)',
            fontStyle: 'italic',
            color: tema.texto,
            lineHeight: 1.7,
            margin: 0,
          }}>
            {respuesta}
          </p>
        </div>
      )}

      {/* Indicador de estado */}
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '11px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: estaActivo ? tema.jade : tema.textoDim,
        marginBottom: '1rem',
        transition: 'color 0.4s ease',
        opacity: 0.7,
      }}>
        {estadoActual.label}
      </div>

      {/* Botón de activación */}
      <div
        ref={pulsoRef}
        onClick={manejarActivacion}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: `1.5px solid ${estaActivo ? tema.jade : tema.jade + '40'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.4s ease',
          background: estadoActual.color,
          backdropFilter: 'blur(4px)',
          boxShadow: estaActivo
            ? `0 0 30px ${tema.jade}40, 0 0 60px ${tema.jade}20`
            : 'none',
          animation: estado === 'escuchando' ? 'pulsar 1.2s ease-in-out infinite' : 'none',
          position: 'relative',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          {estado === 'hablando' ? (
            <>
              <path d="M11 5C11 3.9 11.9 3 13 3s2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V5z"
                fill={tema.jade} opacity="0.9"/>
              <path d="M8 9v1a5 5 0 0010 0V9" stroke={tema.jade} strokeWidth="1.5"
                strokeLinecap="round" fill="none"/>
              <line x1="13" y1="18" x2="13" y2="21" stroke={tema.jade} strokeWidth="1.5"
                strokeLinecap="round"/>
              <line x1="9" y1="21" x2="17" y2="21" stroke={tema.jade} strokeWidth="1.5"
                strokeLinecap="round"/>
            </>
          ) : estado === 'procesando' ? (
            <>
              <circle cx="8" cy="12" r="1.5" fill={tema.acento} opacity="0.6"/>
              <circle cx="12" cy="12" r="1.5" fill={tema.acento}/>
              <circle cx="16" cy="12" r="1.5" fill={tema.acento} opacity="0.6"/>
            </>
          ) : (
            <>
              <path d="M12 2C10.9 2 10 2.9 10 4v8c0 1.1.9 2 2 2s2-.9 2-2V4c0-1.1-.9-2-2-2z"
                fill={estado === 'escuchando' ? tema.jade : tema.jade + '80'}/>
              <path d="M7 10v1a5 5 0 0010 0v-1" stroke={estado === 'escuchando' ? tema.jade : tema.jade + '80'}
                strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <line x1="12" y1="19" x2="12" y2="22" stroke={estado === 'escuchando' ? tema.jade : tema.jade + '80'}
                strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="22" x2="16" y2="22" stroke={estado === 'escuchando' ? tema.jade : tema.jade + '80'}
                strokeWidth="1.5" strokeLinecap="round"/>
            </>
          )}
        </svg>
      </div>

      {/* Botón chat */}
      <button
        onClick={() => setChatVisible(!chatVisible)}
        style={{
          marginTop: '1rem',
          background: 'transparent',
          border: 'none',
          color: tema.textoDim,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '11px',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          opacity: 0.4,
          transition: 'opacity 0.2s ease',
          textTransform: 'uppercase',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
      >
        {chatVisible ? 'ocultar chat' : 'chat'}
      </button>

      {/* Panel de chat */}
      {chatVisible && (
        <div style={{
          position: 'fixed',
          bottom: '5rem',
          right: '2rem',
          width: 'min(380px, 90vw)',
          maxHeight: '60vh',
          background: 'rgba(8,12,10,0.92)',
          border: `0.5px solid ${tema.jade}25`,
          borderRadius: '16px',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 30,
          animation: 'slideUp 0.3s ease',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderBottom: `0.5px solid ${tema.jade}20`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '14px',
              color: tema.acento,
              letterSpacing: '0.1em',
            }}>TONA</span>
            <button onClick={() => setChatVisible(false)} style={{
              background: 'none', border: 'none',
              color: tema.textoDim, cursor: 'pointer', fontSize: '16px',
            }}>×</button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {historialChat.length === 0 && (
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '14px',
                fontStyle: 'italic',
                color: tema.textoDim,
                textAlign: 'center',
                marginTop: '2rem',
              }}>
                "¿Con qué deseas comenzar?"
              </p>
            )}
            {historialChat.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '0.6rem 0.9rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user'
                    ? `${tema.jade}20`
                    : 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${msg.role === 'user' ? tema.jade + '40' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: msg.role === 'user' ? "'DM Sans', sans-serif" : "'Cormorant Garamond', serif",
                  fontSize: msg.role === 'user' ? '13px' : '14px',
                  fontStyle: msg.role === 'tona' ? 'italic' : 'normal',
                  color: msg.role === 'user' ? tema.texto : tema.texto,
                  lineHeight: 1.6,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: '0.75rem',
            borderTop: `0.5px solid ${tema.jade}20`,
            display: 'flex',
            gap: '8px',
          }}>
            <input
              value={mensajeChat}
              onChange={e => setMensajeChat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviarChat()}
              placeholder="Escribe a Tona..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${tema.jade}25`,
                borderRadius: '8px',
                padding: '8px 12px',
                color: tema.texto,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={enviarChat}
              style={{
                padding: '8px 14px',
                background: `${tema.jade}20`,
                border: `0.5px solid ${tema.jade}50`,
                borderRadius: '8px',
                color: tema.jade,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                transition: 'all 0.2s ease',
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}