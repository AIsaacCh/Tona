const JADE = 'var(--jade)'
const COPAL = 'var(--copal, #d4a24c)'

function EsquinaTallada({ posicion, color }) {
  const transformPorPosicion = {
    'top-left': {},
    'top-right': { transform: 'scaleX(-1)' },
    'bottom-left': { transform: 'scaleY(-1)' },
    'bottom-right': { transform: 'scale(-1,-1)' },
  }
  const posicionCss = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'bottom-right': { bottom: 0, right: 0 },
  }
  return (
    <svg
      width="200" height="200" viewBox="0 0 200 200" fill="none"
      style={{ position: 'absolute', opacity: 0.34, ...posicionCss[posicion], ...transformPorPosicion[posicion] }}
    >
      <path d="M0 76 L0 0 L76 0" stroke={color} strokeWidth="1.1" />
      <path d="M0 50 L26 50 L26 24 L52 24 L52 0" stroke={color} strokeWidth="1.1" />
      <path d="M18 18 L42 18 L42 42" stroke={color} strokeWidth="0.7" opacity="0.6" />
      <circle cx="10" cy="10" r="2.6" fill={color} opacity="0.55" />
    </svg>
  )
}

export default function FondoProfundidad() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* viñeta */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 36%, rgba(24,22,16,0.22) 0%, rgba(6,6,6,0.6) 55%, #050504 100%)',
      }} />

      {/* textura de líneas — tejido/piedra tallada, casi imperceptible y se apaga hacia el centro */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(118deg, rgba(212,162,76,0.06) 0px, rgba(212,162,76,0.06) 1px, transparent 1px, transparent 58px)`,
        maskImage: 'radial-gradient(ellipse at 50% 45%, transparent 0%, transparent 20%, black 68%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, transparent 0%, transparent 20%, black 68%)',
      }} />

      {/* resplandor dorado */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%', width: '58%', height: '58%',
        background: `radial-gradient(circle, ${COPAL}22 0%, transparent 65%)`, filter: 'blur(90px)',
      }} />

      {/* resplandor jade */}
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%', width: '58%', height: '58%',
        background: `radial-gradient(circle, ${JADE}1c 0%, transparent 65%)`, filter: 'blur(90px)',
      }} />

      <EsquinaTallada posicion="top-left" color={COPAL} />
      <EsquinaTallada posicion="top-right" color={JADE} />
      <EsquinaTallada posicion="bottom-left" color={JADE} />
      <EsquinaTallada posicion="bottom-right" color={COPAL} />
    </div>
  )
}