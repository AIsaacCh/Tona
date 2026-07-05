const API = import.meta.env.VITE_API_URL;

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = `${API}/auth/google`;
  }
  return (
    <div className="tona-app">
      <h1 style={{ fontSize: '36px' }}>TONA</h1>
      <p style={{ marginBottom: '2rem' }}>Inicia sesión para continuar</p>
      <button
        onClick={handleGoogleLogin}
        style={{
          padding: '12px 36px',
          background: 'transparent',
          color: 'var(--jade-light)',
          border: '0.5px solid var(--jade)',
          borderRadius: '1px',
          fontFamily: 'system-ui',
          fontSize: '14px',
          letterSpacing: '0.1em',
          cursor: 'pointer',
        }}
      >
        Continuar con Google
      </button>
    </div>
  )
}