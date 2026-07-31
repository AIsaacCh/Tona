import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FondoProfundidad from '../components/FondoProfundidad'
import EsferaTona from '../components/EsferaTona'

const API = import.meta.env.VITE_API_URL
const AUTH_BASE = import.meta.env.VITE_AUTH_URL
const JADE = 'var(--jade)'
const COPAL = 'var(--copal, #d4a24c)'
const FONT = "'Poppins', system-ui, sans-serif"

export default function Bienvenida() {
  const [params] = useSearchParams()
  const token = params.get('promo')
  const [estado, setEstado] = useState('cargando') // cargando | valido | invalido
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!token) { setEstado('invalido'); return }
    fetch(`${API}/pagos/promo/${token}/validar`)
      .then(r => r.json())
      .then(data => {
        if (data.valido) {
          setInfo(data)
          setEstado('valido')
        } else {
          setEstado('invalido')
        }
      })
      .catch(() => setEstado('invalido'))
  }, [token])

  function continuar() {
    localStorage.setItem('tona_promo_pendiente', token)
    window.location.href = `${AUTH_BASE}/auth/google`
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <FondoProfundidad />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 440, padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <EsferaTona size={140} />
        </div>

        {estado === 'cargando' && (
          <p style={{ color: 'rgba(237,235,230,0.5)', fontFamily: FONT }}>Verificando invitación...</p>
        )}

        {estado === 'invalido' && (
          <>
            <h1 style={{ fontFamily: FONT, fontSize: 24, color: 'rgba(237,235,230,0.9)', marginBottom: 12 }}>
              Este link ya no es válido
            </h1>
            <p style={{ color: 'rgba(237,235,230,0.5)', fontFamily: FONT, fontSize: 14 }}>
              Puede que ya haya sido usado o haya expirado. Si crees que es un error, contáctanos.
            </p>
          </>
        )}

        {estado === 'valido' && (
          <>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', color: JADE, marginBottom: 14, fontFamily: FONT }}>
              FUISTE SELECCIONADO
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: 'rgba(237,235,230,0.94)', marginBottom: 16 }}>
              Bienvenido a Tona
            </h1>
            <p style={{ color: 'rgba(237,235,230,0.55)', fontFamily: FONT, fontSize: 14, lineHeight: 1.7, marginBottom: 30 }}>
              Tienes acceso a {info.dias_trial} días gratis de Tona Premium, sin costo.
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