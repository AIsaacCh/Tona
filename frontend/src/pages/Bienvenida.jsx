import { useState } from 'react'
import FondoProfundidad from '../components/FondoProfundidad'
import EsferaTona from '../components/EsferaTona'

const API = import.meta.env.VITE_API_URL
const JADE = 'var(--jade)'
const FONT = "'Poppins', system-ui, sans-serif"

export default function Bienvenida() {
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState('inicial')
  const [info, setInfo] = useState(null)

  async function verificarCodigo() {
    if (!codigo.trim()) return
    setEstado('verificando')
    try {
      const resp = await fetch(`${API}/pagos/promo/${codigo.trim()}/validar`)
      const data = await resp.json()
      if (data.valido) {
        setInfo(data)
        setEstado('valido')
      } else {
        setEstado('invalido')
      }
    } catch {
      setEstado('invalido')
    }
  }

  function continuar() {
    localStorage.setItem('tona_promo_pendiente', codigo.trim())
    window.location.href = `/api/auth/google`
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <FondoProfundidad />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 420, padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <EsferaTona size={140} />
        </div>

        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: JADE, marginBottom: 14, fontFamily: FONT }}>
          UN REGALO PARA TI
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: 26, fontWeight: 500, color: 'rgba(237,235,230,0.94)', marginBottom: 16 }}>
          Bienvenido a Tona
        </h1>
        <p style={{ color: 'rgba(237,235,230,0.5)', fontFamily: FONT, fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
          Fuiste seleccionado para probar Tona Premium gratis. Ingresa tu código de invitación para comenzar.
        </p>

        {(estado === 'inicial' || estado === 'verificando' || estado === 'invalido') && (
          <>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verificarCodigo()}
              placeholder="Tu código de invitación"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '14px 16px',
                borderRadius: 12, background: 'rgba(237,235,230,0.04)',
                border: `1px solid ${estado === 'invalido' ? 'rgba(192,69,90,0.5)' : 'rgba(237,235,230,0.12)'}`,
                color: 'rgba(237,235,230,0.9)', fontSize: 14, fontFamily: FONT,
                textAlign: 'center', outline: 'none', marginBottom: 14,
              }}
            />
            {estado === 'invalido' && (
              <p style={{ color: '#c0455a', fontSize: 12, fontFamily: FONT, marginBottom: 14 }}>
                Ese código no es válido o ya fue usado.
              </p>
            )}
            <button
              onClick={verificarCodigo}
              disabled={estado === 'verificando' || !codigo.trim()}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 30,
                background: JADE, color: 'var(--obsidiana)', border: 'none',
                fontFamily: FONT, fontSize: 14, fontWeight: 600,
                cursor: codigo.trim() ? 'pointer' : 'default',
                opacity: estado === 'verificando' ? 0.6 : 1,
              }}
            >
              {estado === 'verificando' ? 'Verificando...' : 'Continuar'}
            </button>
          </>
        )}

        {estado === 'valido' && (
          <>
            <p style={{ color: 'rgba(237,235,230,0.6)', fontFamily: FONT, fontSize: 14, lineHeight: 1.7, marginBottom: 26 }}>
              ¡Código válido! Tienes {info.dias_trial} días gratis de Tona Premium.
              Solo inicia sesión con Google para activarlo.
            </p>
            <button
              onClick={continuar}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 30,
                background: JADE, color: 'var(--obsidiana)', border: 'none',
                fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Continuar con Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}