import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL;

export function useOnboarding(userId) {
  const [paso, setPaso] = useState(null); // null = cargando

  useEffect(() => {
    const uid = localStorage.getItem("tona_user_id") || userId;
    if (!uid || uid === "demo") {
      setPaso(2); // usuario demo, no forzamos onboarding
      return;
    }
    fetch(`${API}/agent/config/${uid}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPaso(data.onboarding_paso ?? 0))
      .catch(() => setPaso(0));
  }, [userId]);

  const actualizarPaso = useCallback(async (nuevoPaso) => {
    setPaso(nuevoPaso); // optimista
    try {
      await fetch(`${API}/agent/config/${userId}/paso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paso: nuevoPaso }),
      });
    } catch (e) {
      console.error("Error actualizando onboarding_paso:", e);
    }
  }, [userId]);

  return { paso, actualizarPaso, cargando: paso === null };
}