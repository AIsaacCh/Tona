import { useLocation } from "react-router-dom";
import EsferaTona from "./EsferaTona";

export default function EsferaFlotante() {
  const location = useLocation();

  const enColaborar = location.pathname.startsWith("/colaborar");
  const enDashboard = location.pathname === "/dashboard";

  if (enDashboard) return null;
  if (!enColaborar) return null;

  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 32,
      zIndex: 900,
      pointerEvents: "none",
    }}>
      <EsferaTona size={90} />
    </div>
  );
}