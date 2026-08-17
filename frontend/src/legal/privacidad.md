# Aviso de Privacidad Integral — Tona

**Última actualización:** 17 de agosto de 2026
**Versión:** 1.1

---

## 1. Identidad y domicilio del responsable

**Tona** (el "Servicio", la "Plataforma") es operado por **Angel Isaac Cortes Hernandez**, persona física, con domicilio de contacto en el **Estado de México**, México.

Correo de contacto para privacidad y ejercicio de derechos ARCO: **tagentstudyapp@gmail.com**

---

## 2. ¿A quién va dirigido este Servicio?

Tona está diseñado y dirigido **exclusivamente a personas mayores de 18 años**, principalmente estudiantes de nivel universitario. El Servicio no está dirigido a menores de edad y no solicita conscientemente datos de menores de 18 años. Si Tona detecta o se le notifica que una cuenta pertenece a una persona menor de 18 años, procederá a suspender y eliminar dicha cuenta y los datos asociados.

---

## 3. Datos personales que se tratan

### 3.1 Datos proporcionados directamente
- Nombre, correo electrónico y fotografía de perfil (obtenidos vía inicio de sesión con Google, scopes `openid`, `userinfo.email`, `userinfo.profile`).
- Contenido que tú generas dentro de Tona: notas, tareas manuales, eventos, configuración de nombre/tono del agente, mensajes enviados al chat.

### 3.2 Datos obtenidos mediante integraciones que tú autorizas (Google)

Mediante OAuth de Google, y solo si tú otorgas el permiso correspondiente, Tona solicita los siguientes alcances (*scopes*) y accede a los datos que cada uno habilita:

| Scope | Qué permite realmente | Para qué lo usa Tona |
|---|---|---|
| `classroom.courses.readonly` | Leer la lista de tus cursos de Classroom. | Mostrar tus cursos en el panel. |
| `classroom.coursework.me` | Leer y gestionar las tareas (`courseWork`) y trabajo asociado que te pertenecen. | Sincronizar fechas de entrega y detalles de tareas. |
| `classroom.coursework.me.readonly` | Lectura de tu propio trabajo de curso. | Mostrar tareas y fechas en el panel y agenda. |
| `classroom.student-submissions.me.readonly` | Leer el estado de tus propias entregas (`studentSubmissions`). | Mostrar si ya entregaste o sigue pendiente. |
| `calendar` | Acceso de **lectura y escritura sobre todos tus calendarios de Google** (no solo un calendario o solo lectura). Permite crear, leer, modificar y eliminar eventos en cualquiera de tus calendarios. | Mostrar tu agenda y crear recordatorios académicos que tú confirmas antes de guardarse. Tona no elimina ni modifica eventos que no haya creado a petición tuya, pero el permiso técnico concedido por Google es más amplio que eso. |
| `gmail.readonly` | **Acceso de lectura al contenido completo de tu correo** — no solo metadatos: incluye asunto, remitente, cuerpo del mensaje y datos de adjuntos. Este es un *scope restringido* según la clasificación de Google (ver Sección 5.1). | Buscar correos por tema para que el agente pueda referenciarlos o resumirlos cuando tú lo solicitas. Tona no lee tu bandeja de forma continua ni indexa todos tus correos; consulta bajo demanda, a partir de tus instrucciones al agente. |
| `gmail.send` | Enviar correos en tu nombre. | Enviar únicamente los correos que tú redactas o apruebas explícitamente antes del envío. Tona nunca envía correos sin tu confirmación. |
| `drive.file` | Acceso limitado a los archivos individuales que tú creas o abres explícitamente con Tona a través del selector de Google (Picker) — **no** a tu Drive completo. | Vincular, crear o editar documentos específicos que tú eliges. |
| `documents` | Leer y editar el contenido de Google Docs a los que Tona tiene acceso (los que tú vinculaste vía Picker o que Tona creó a tu solicitud). | Mostrar y editar el contenido de esos documentos dentro de Tona. |

Si en el futuro Tona amplía o reduce estos scopes, esta tabla se actualizará y se te notificará conforme a la Sección 12.

### 3.3 Acceso a Google Drive y Docs (bajo tu control explícito)
**Tona no solicita acceso permanente a tu Google Drive.** El scope `drive.file` solo da acceso a archivos que tú mismo abres o creas con Tona a través del **Google Picker**, un selector de archivos que tú controlas. Solo en ese momento, y con tu acción explícita de seleccionar un documento, Tona obtiene acceso a **ese documento específico** que tú elegiste. Tona no puede ver, listar ni acceder a ningún otro archivo de tu Drive.

Los documentos que vinculas de esta forma se almacenan en la base de datos de Tona con su identificador, título y enlace, para que puedas acceder a ellos desde el panel de documentos, compartirlos en sesiones colaborativas o consultarlos con el agente. Este acceso se limita estrictamente a los documentos que tú has vinculado explícitamente.

### 3.4 Datos de integraciones adicionales opcionales
- **Notion:** si conectas tu cuenta, se sincroniza el contenido de las páginas que tú compartes explícitamente con la integración y que decides "anclar" dentro de Tona.

### 3.5 Datos generados por el uso del Servicio
- Historial de conversación con el agente (para dar continuidad a la conversación).
- Racha de estudio, minutos de enfoque diario, actividad diaria (mensajes por día).
- Uso mensual de tokens de IA (para gestión interna de capacidad del servicio).

### 3.6 Datos de pago
Tona utiliza **Stripe** como procesador de pagos. Tona **no almacena** números de tarjeta ni datos financieros completos: Stripe los procesa directamente y Tona solo conserva identificadores de cliente/suscripción y su estatus (activa, en prueba, cancelada, etc.).

### 3.7 Datos sensibles
Tona no solicita ni clasifica intencionalmente datos personales sensibles (salud, religión, orientación sexual, afiliación política, etc.). Sin embargo, dado que el Servicio da acceso a contenido libre del usuario (correos, documentos, notas), es posible que dicho contenido incluya datos sensibles del propio usuario de forma incidental — por ejemplo, si tu correo o un documento vinculado contiene ese tipo de información. Tona no analiza ni clasifica ese contenido con fines distintos a los descritos en este Aviso, y no lo utiliza para inferir características sensibles sobre ti.

---

## 4. Finalidades del tratamiento

### 4.1 Finalidades necesarias para el Servicio (no requieren consentimiento adicional)
- Crear y administrar tu cuenta.
- Sincronizar y mostrar tus tareas, calendario y materiales académicos.
- Gestionar los documentos que tú vinculas explícitamente desde Google Drive, para mostrarlos, editarlos y compartirlos según tus instrucciones.
- Permitir que el agente de IA responda tus solicitudes y ejecute acciones que tú confirmas (crear tareas, enviar correos que redactas, entregar trabajos en Classroom cuando tú lo confirmas explícitamente).
- Procesar tu suscripción y pagos.
- Dar soporte técnico y atender solicitudes de privacidad.
- Prevenir abuso del Servicio (por ejemplo, detección de patrones de spam en el chat).

### 4.2 Finalidades secundarias (requieren tu consentimiento, y puedes negarlo sin afectar el Servicio principal)
Actualmente no se realizan tratamientos con finalidades secundarias (como marketing o comunicaciones comerciales). Si en el futuro se implementaran, se te notificará y solicitará tu consentimiento por separado.

---

## 5. Uso de Inteligencia Artificial y lógica del algoritmo

Tona utiliza el modelo **Gemini 2.5 Flash**, operado a través de **Google Cloud Vertex AI**, como motor conversacional y de toma de decisiones dentro de la aplicación.

- **No hay revisión humana individual** de cada respuesta o acción que el agente genera en tiempo real; el sistema responde de forma automatizada con base en el contexto de tus datos académicos y tu conversación.
- **El usuario mantiene control sobre las acciones de mayor impacto:** acciones irreversibles (como entregar una tarea en Classroom, enviar un correo, o crear/eliminar documentos) requieren tu confirmación explícita antes de ejecutarse — el agente nunca las realiza de forma silenciosa.
- **Vertex AI no utiliza el contenido de tus conversaciones ni tus datos para entrenar los modelos de Google**, conforme a los términos empresariales de Google Cloud.
- El procesamiento ocurre en la región `us-central1` de Google Cloud (Estados Unidos), lo cual implica una **transferencia internacional de datos** hacia Estados Unidos como parte necesaria de la operación del Servicio. Google actúa como encargado del tratamiento bajo sus propios compromisos contractuales de protección de datos.

### 5.1 Cumplimiento con la Política de Datos de Usuario de los Servicios de API de Google

El uso y la transferencia a Tona de información recibida de las APIs de Google se adhieren a la [Política de Datos de Usuario de los Servicios de API de Google](https://developers.google.com/terms/api-services-user-data-policy), incluidos sus requisitos de **Uso Limitado (Limited Use)**. En concreto, respecto de los datos obtenidos vía Gmail, Calendar, Classroom, Drive y Docs:

- No usamos estos datos para publicidad, ni los vendemos, ni los compartimos con fines de publicidad ni con corredores de datos de ningún tipo.
- No permitimos que humanos lean el contenido de tu Gmail, Calendar, Drive o Docs, salvo en los siguientes casos excepcionales: (a) con tu consentimiento explícito y afirmativo para atender una solicitud de soporte que tú iniciaste; (b) por razones de seguridad, como investigar abuso o una vulnerabilidad; (c) para cumplir con obligaciones legales; o (d) cuando los datos han sido agregados y anonimizados y se usan exclusivamente para mejorar funciones del Servicio, sin poder ser reasociados a tu identidad.
- Usamos estos datos únicamente para proveer o mejorar las funciones orientadas al usuario descritas explícitamente en este Aviso — no para ningún otro producto, modelo de IA de propósito general, ni finalidad no relacionada.
- `gmail.readonly` es clasificado por Google como un *scope restringido*. Tona solicita el mínimo alcance necesario para las funciones descritas y trabaja para mantener el cumplimiento de los requisitos de verificación y evaluación de seguridad que Google exige a aplicaciones que solicitan este tipo de scopes conforme crece su base de usuarios.

---

## 6. Con quién compartimos tus datos (encargados del tratamiento)

Para operar Tona, tus datos son procesados por los siguientes proveedores, actuando como encargados del tratamiento (nunca se venden ni se comparten con fines publicitarios de terceros):

| Proveedor | Función | Datos involucrados |
|---|---|---|
| Google (Workspace APIs, Cloud, Vertex AI) | Autenticación, Classroom, Calendar, Gmail, motor de IA, texto a voz | Los descritos en la Sección 3.2 y 3.3 |
| Supabase | Base de datos principal | Todos los datos de cuenta, tareas, notas, historial, documentos vinculados |
| Railway | Hosting del backend | Datos en tránsito y procesamiento |
| Netlify | Hosting del frontend | Ninguno (solo sirve la aplicación web) |
| Stripe | Procesamiento de pagos | Identificadores de suscripción, correo, nombre |
| Notion (si lo conectas) | Sincronización de páginas ancladas | Contenido de las páginas que tú compartes con la integración |

---

## 7. Datos compartidos con otros usuarios (función de colaboración)

Tona incluye una función de **sesiones colaborativas** en la que puedes crear o unirte a una sala mediante un código, junto con hasta 2 personas más. Al usar esta función:

- Tu **nombre y correo electrónico** se vuelven visibles para los demás participantes de esa sala mientras dure la sesión.
- Los **documentos de Google Drive que decidas compartir** dentro de la sala se comparten con permisos de edición con los demás participantes, mediante la API de Drive.
- Los mensajes de chat dentro de la sala son visibles para todos los participantes de esa sala.

**Es tu responsabilidad únicamente compartir el código de sala con personas de tu confianza**, ya que cualquiera con el código puede unirse (hasta el límite de participantes) y ver la información antes descrita.

---

## 8. Conservación y eliminación de datos

- **Mientras tu cuenta esté activa:** conservamos tus datos académicos, notas, archivos vinculados e historial para que el Servicio funcione con continuidad.
- **Si cierras sesión sin cancelar tu suscripción:** tus datos de trabajo (tareas, notas, archivos vinculados) se conservan sin límite de tiempo mientras la cuenta exista, para que puedas retomar tu actividad al volver.
- **Si eliminas tu cuenta:** todos tus datos personales, tokens de acceso, historial y contenido almacenado en Tona se eliminan de forma permanente e irreversible. Para solicitar la eliminación de tu cuenta, escribe a `tagentstudyapp@gmail.com`; procesaremos tu solicitud en un plazo máximo de 5 días hábiles.
- **Si revocas el acceso OAuth de Google** (sin eliminar tu cuenta): se eliminan tus tokens de acceso y refresco de inmediato, y las integraciones dejan de funcionar hasta que vuelvas a autorizarlas. Los datos ya sincronizados previamente (tareas, notas creadas manualmente) no se eliminan automáticamente por esta acción — solo se elimina el acceso a las fuentes externas.
- Los **documentos vinculados** que hayas seleccionado mediante el Picker permanecen en tu Google Drive; Tona solo conserva su identificador y título para mostrarlos en el panel. Si eliminas tu cuenta, estas referencias se eliminan de la base de datos de Tona, pero los documentos originales permanecen en tu Drive.
- El contenido de Gmail al que Tona accede mediante `gmail.readonly` no se almacena de forma permanente en la base de datos de Tona más allá de lo necesario para la sesión de conversación en la que fue consultado, salvo que tú mismo decidas guardarlo (por ejemplo, convirtiéndolo en una nota).

---

## 9. Tus derechos ARCO

Tienes derecho, en todo momento y sin costo, a **A**cceder, **R**ectificar, **C**ancelar u **O**ponerte al tratamiento de tus datos personales, así como a revocar tu consentimiento. Para ejercerlos, escribe a `tagentstudyapp@gmail.com` indicando tu solicitud; daremos respuesta conforme a los plazos establecidos por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).

---

## 10. Medidas de seguridad

- Los tokens de acceso y refresco de Google se almacenan **cifrados** (Fernet) en la base de datos, nunca en texto plano.
- La sesión del usuario se maneja mediante **cookies `httpOnly`**, no expuestas a JavaScript ni transmitidas por URL.
- Las comunicaciones entre cliente y servidor se realizan mediante HTTPS.
- El acceso a datos de colaboración está restringido a participantes verificados de cada sala.
- El acceso a scopes restringidos (`gmail.readonly`) está limitado internamente a los procesos del backend necesarios para responder a tu solicitud puntual; no existe un proceso que lea tu correo de forma continua o en segundo plano sin una acción tuya que lo dispare.

---

## 11. Autoridad competente

La autoridad encargada de vigilar el cumplimiento de la LFPDPPP en México es la **Secretaría Anticorrupción y Buen Gobierno (SABG)**, que asumió las funciones del extinto INAI en materia de datos personales del sector privado. Si consideras que tus derechos no fueron atendidos correctamente, puedes acudir ante dicha autoridad.

---

## 12. Cambios a este Aviso

Cualquier modificación a este Aviso de Privacidad será publicada en esta misma página con su nueva fecha de actualización. Si el cambio es sustancial (por ejemplo, nuevas finalidades que requieran tu consentimiento, o cambios en los scopes de Google solicitados), se te notificará dentro de la aplicación y se solicitará tu aceptación nuevamente antes de continuar usando el Servicio.

---

## 13. Contacto

Para dudas sobre este Aviso o el tratamiento de tus datos: **tagentstudyapp@gmail.com**