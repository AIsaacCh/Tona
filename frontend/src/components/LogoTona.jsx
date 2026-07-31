export default function LogoTona({ size = 22, color = 'var(--jade, #2ec990)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      <rect
        x="4" y="4" width="16" height="16" rx="3"
        transform="rotate(45 12 12)"
        fill="none" stroke={color} strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" fill={color} />
    </svg>
  )
}