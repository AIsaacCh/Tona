import FondoProfundidad from '../components/FondoProfundidad'
import EsferaTona from '../components/EsferaTona'

const JADE = 'var(--jade)'
const FONT = "'Poppins', system-ui, sans-serif"

export default function PostPago() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <FondoProfundidad />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 420, padding: 24 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <EsferaTona size={140} />
        </div>

        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: JADE, marginBottom: 14, fontFamily: FONT }}>
          PAGO CONFIRMADO
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: 26, fontWeight: 500, color: 'rgba(237,235,230,0.94)', marginBottom: 16 }}>
          ¡Ya casi está listo!
        </h1>
        <p style={{ color: 'rgba(237,235,230,0.5)', fontFamily: FONT, fontSize: 14, lineHeight: 1.7, marginBottom: 30 }}>
          Solo falta un paso: inicia sesión con Google para activar tu cuenta de Tona Premium.
        </p>
        <button
          onClick={() => { window.location.href = `/api/auth/google` }}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 30,
            background: JADE, color: 'var(--obsidiana)', border: 'none',
            fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Continuar con Google
        </button>
        <p style={{ fontSize: 11, color: "rgba(237,235,230,0.3)", marginTop: 16 }}>
          Al continuar, aceptas nuestros{" "}
          <a href="/legal/terminos" target="_blank" style={{ color: JADE }}>Términos</a> y{" "}
          <a href="/legal/privacidad" target="_blank" style={{ color: JADE }}>Aviso de Privacidad</a>.
        </p>
      </div>
    </div>
  )
}