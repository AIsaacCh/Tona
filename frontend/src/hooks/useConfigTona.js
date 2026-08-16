import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;

export function useConfigTona(userId) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const uid = localStorage.getItem("tona_user_id") || userId;
    if (!uid || uid === "demo") {
      setConfig({ nombre_usuario: "", nombre_agente: "Tona" });
      return;
    }
    fetch(`${API}/agent/config`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig({ nombre_usuario: "", nombre_agente: "Tona" }));
  }, [userId]);

  return {
    nombreUsuario: config?.nombre_usuario || "",
    nombreAgente: config?.nombre_agente || "Tona",
    cargando: config === null,
  };
}