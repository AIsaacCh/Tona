// services/pickerService.js

// Cargar la API de Google Picker dinámicamente
const GOOGLE_PICKER_API_KEY = import.meta.env.VITE_GOOGLE_PICKER_API_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Script de carga de GAPI
function cargarScriptGAPI() {
  return new Promise((resolve, reject) => {
    // Si ya está cargado, resolver
    if (window.gapi) {
      resolve();
      return;
    }
    
    // Cargar script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      // Inicializar GAPI
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: GOOGLE_PICKER_API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        }).then(() => {
          resolve();
        }).catch(reject);
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Función principal del Picker
export async function abrirPickerDrive(accessToken, onSeleccion) {
  try {
    // Asegurar que GAPI esté cargado
    await cargarScriptGAPI();
    
    // Cargar el Picker
    window.gapi.load('picker', () => {
      // Crear vista de documentos
      const view = new google.picker.View(google.picker.ViewId.DOCS);
      
      // Opcional: filtrar solo documentos de Google
      // view.setMimeTypes('application/vnd.google-apps.document');
      
      // Crear el Picker
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_PICKER_API_KEY)
        .setAppId(GOOGLE_CLIENT_ID) // Importante para la autenticación
        .setCallback((data) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0]; // Solo un documento
            console.log('📄 Documento seleccionado:', doc);
            
            onSeleccion({
              id: doc.id,
              nombre: doc.name,
              mime_type: doc.mimeType,
              url: doc.url,
              iconUrl: doc.iconUrl
            });
          } else if (data.action === google.picker.Action.CANCEL) {
            console.log('👤 Usuario canceló selección');
          }
        })
        .build();
      
      // Mostrar el Picker
      picker.setVisible(true);
    });
  } catch (error) {
    console.error('❌ Error abriendo Picker:', error);
    throw new Error('No se pudo cargar el Google Picker');
  }
}

// Función para mostrar errores al usuario
export function handlePickerError(error) {
  console.error('Error del Picker:', error);
  
  if (error.message.includes('OAuth')) {
    return 'Error de autenticación. Por favor, inicia sesión nuevamente.';
  }
  
  if (error.message.includes('API key')) {
    return 'Error de configuración. Contacta al administrador.';
  }
  
  return 'Error al abrir el selector de archivos.';
}