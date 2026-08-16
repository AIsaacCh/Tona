import { T } from "../../tokens";

// Beta: un solo laboratorio disponible. Cuando agregues más al catálogo
// del backend (services/deteccion_tema.py), agrégalos también aquí.
const LABORATORIOS_DISPONIBLES = [
  { id: "hooke", nombre: "Elasticidad: Ley de Hooke", activo: true },
  { id: "caida_libre", nombre: "Caída libre", activo: true },
  { id: "optica", nombre: "Óptica geométrica", activo: true },
  { id: "circuitos_rc", nombre: "Circuitos RC", activo: false },
  { id: "termodinamica", nombre: "Termodinámica", activo: false },
];

const NAV_ITEMS = [
  { id: "estudio", icono: "◈", label: "Estudio" },
  { id: "laboratorio", icono: "⌁", label: "Laboratorio" },
];

export function SidebarEstudio({ vista, setVista, laboratorioActivo, setLaboratorioActivo, onVolverDashboard }) {
  return (
    <div style={estilos.sidebar}>
      <div style={estilos.logo} onClick={onVolverDashboard}>
        <span style={estilos.logoIcono}>◇</span>
        <span style={estilos.logoTexto}>TONA</span>
      </div>

      <div style={estilos.seccionLabel}>NAVEGACIÓN</div>
      <div style={estilos.navList}>
        {NAV_ITEMS.map((item) => {
          const activo = vista === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setVista(item.id)}
              style={{ ...estilos.navItem, ...(activo ? estilos.navItemActivo : {}) }}
            >
              <span style={{ ...estilos.navIcono, color: activo ? T.jade : "rgba(237,235,230,0.3)" }}>
                {item.icono}
              </span>
              {item.label}
              {activo && <span style={estilos.navBarraActiva} />}
            </button>
          );
        })}
      </div>

      <div style={estilos.divisor} />

      <div style={estilos.seccionHeaderLabs}>
        <span style={estilos.seccionLabel}>MIS LABORATORIOS</span>
      </div>

      <div style={estilos.navList}>
        {LABORATORIOS_DISPONIBLES.map((lab) => {
          const activo = vista === "laboratorio" && laboratorioActivo === lab.id;
          return (
            <button
              key={lab.id}
              disabled={!lab.activo}
              onClick={() => {
                if (!lab.activo) return;
                setLaboratorioActivo(lab.id);
                setVista("laboratorio");
              }}
              style={{
                ...estilos.labItem,
                ...(activo ? estilos.labItemActivo : {}),
                opacity: lab.activo ? 1 : 0.35,
                cursor: lab.activo ? "pointer" : "default",
              }}
            >
              <span style={{ ...estilos.dot, background: lab.activo ? T.jade : "rgba(237,235,230,0.25)" }} />
              {lab.nombre}
            </button>
          );
        })}
      </div>

      <div style={estilos.footer}>
        <div style={estilos.footerCard}>
          <div style={estilos.footerTitulo}>Plan Personal</div>
          <div style={estilos.footerSub}>Tu aprendizaje, tu ritmo.</div>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  sidebar: {
    width: 220,
    flexShrink: 0,
    height: "100%",
    background: "rgba(11,14,16,0.55)",
    backdropFilter: "blur(24px)",
    borderRight: "1px solid rgba(237,235,230,0.06)",
    boxShadow: "1px 0 0 rgba(255,255,255,0.02) inset, 12px 0 32px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 8,
    cursor: "pointer", marginBottom: 28, paddingLeft: 4,
  },
  logoIcono: { color: T.jade, fontSize: 16 },
  logoTexto: { fontFamily: T.serif, fontSize: 15, letterSpacing: 4, color: "rgba(237,235,230,0.9)" },
  seccionLabel: {
    fontSize: 9, letterSpacing: "1.5px", color: "rgba(237,235,230,0.25)",
    fontFamily: T.mono, padding: "0 10px", marginBottom: 8,
  },
  seccionHeaderLabs: { marginTop: 4 },
  navList: { display: "flex", flexDirection: "column", gap: 2 },
  navItem: {
    position: "relative",
    display: "flex", alignItems: "center", gap: 10,
    background: "transparent", border: "none",
    borderRadius: 8, padding: "9px 10px",
    color: "rgba(237,235,230,0.5)", fontSize: 13,
    fontFamily: T.sans, cursor: "pointer", textAlign: "left",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  navItemActivo: {
    background: `${T.jade}0d`,
    color: "rgba(237,235,230,0.95)",
  },
  navIcono: { fontSize: 13, width: 14, textAlign: "center" },
  navBarraActiva: {
    position: "absolute", left: -16, top: "50%", transform: "translateY(-50%)",
    width: 2, height: 16, borderRadius: 2, background: T.jade,
  },
  divisor: { height: 1, background: "rgba(237,235,230,0.06)", margin: "18px 4px" },
  labItem: {
    display: "flex", alignItems: "center", gap: 9,
    background: "transparent", border: "none",
    borderRadius: 8, padding: "8px 10px",
    color: "rgba(237,235,230,0.5)", fontSize: 12,
    fontFamily: T.sans, textAlign: "left",
  },
  labItemActivo: {
    background: `${T.jade}0d`,
    color: "rgba(237,235,230,0.9)",
  },
  dot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
  footer: { marginTop: "auto", paddingTop: 20 },
  footerCard: {
    background: "rgba(237,235,230,0.03)",
    border: "1px solid rgba(237,235,230,0.06)",
    borderRadius: 12, padding: "14px 14px",
  },
  footerTitulo: { fontSize: 12, color: "rgba(237,235,230,0.7)", marginBottom: 2 },
  footerSub: { fontSize: 10, color: "rgba(237,235,230,0.3)" },
};