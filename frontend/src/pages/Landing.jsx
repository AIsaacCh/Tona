import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="tona-app">
      <h1>TONA</h1>
      <p>Tu nagual digital</p>
      <button
        onClick={() => navigate('/login')}
        style={{
          marginTop: '2rem',
          padding: '12px 36px',
          background: 'var(--jade)',
          color: 'var(--obsidiana)',
          border: 'none',
          borderRadius: '1px',
          fontFamily: "'Cinzel', serif",
          fontSize: '13px',
          letterSpacing: '0.2em',
          cursor: 'pointer',
          fontWeight: '600',
        }}
      >
        Despertar
      </button>
    </div>
  )
}