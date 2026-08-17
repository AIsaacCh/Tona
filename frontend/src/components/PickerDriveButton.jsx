import { useState, useCallback } from "react";
import { T } from "../tokens";
import { agenteBus } from "./AgenteTona";

const API = import.meta.env.VITE_API_URL;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const PICKER_API_KEY = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;

let tokenClient = null;
let pickerCargado = false;

function cargarPickerApi() {
  return new Promise((resolve) => {
    if (pickerCargado) return resolve();
    window.gapi.load("picker", () => {
      pickerCargado = true;
      resolve();
    });
  });
}

function obtenerAccessToken() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: () => {}, // se sobreescribe abajo por invocación
      });
    }
    tokenClient.callback = (resp) => {
      if (resp.error) reject(resp);
      else resolve(resp.access_token);
    };
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

export default function PickerDriveButton({ onVinculado, style }) {
  const [cargando, setCargando] = useState(false);

  const abrirPicker = useCallback(async () => {
    setCargando(true);
    try {
      const accessToken = await obtenerAccessToken();
      await cargarPickerApi();

      const vista = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(PICKER_API_KEY)
        .addView(vista)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback(async (data) => {
          if (data.action !== window.google.picker.Action.PICKED) return;
          for (const doc of data.docs) {
            try {
              const resp = await fetch(`${API}/tasks/drive/vincular`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_id: doc.id,
                  nombre: doc.name,
                  mime_type: doc.mimeType,
                }),
              });
              if (resp.ok) {
                const r = await resp.json();
                onVinculado?.(r.archivo);
              }
            } catch (e) {
              console.error("Error vinculando archivo:", e);
            }
          }
          agenteBus.emit("flash", {
            mensaje: `${data.docs.length} archivo(s) agregado(s) a Tona.`,
            tipo: "exito",
          });
        })
        .build();

      picker.setVisible(true);
    } catch (e) {
      console.error("Error abriendo Picker:", e);
      agenteBus.emit("flash", { mensaje: "No se pudo abrir el selector de Drive.", tipo: "error" });
    } finally {
      setCargando(false);
    }
  }, [onVinculado]);

  return (
    <button
      onClick={abrirPicker}
      disabled={cargando}
      style={{
        background: `${T.turquesa}15`,
        border: `1px solid ${T.turquesa}35`,
        borderRadius: 8,
        padding: "6px 14px",
        color: T.turquesa,
        fontSize: 11,
        fontFamily: T.mono,
        cursor: cargando ? "wait" : "pointer",
        letterSpacing: "0.5px",
        ...style,
      }}
    >
      {cargando ? "abriendo..." : "+ desde Drive"}
    </button>
  );
}