# Aviso de Privacidad Integral — Tona

**Última actualización:** 5 de octubre de 2026
**Versión:** 1.4

---

## 1. Identidad y domicilio del responsable

**Tona** (el "Servicio", la "Plataforma") es operado por **Angel Isaac Cortes Hernandez**, persona física, con domicilio de contacto en el **Estado de México**, México.

Correo de contacto para privacidad y ejercicio de derechos ARCO: **corteshernandezangelisaac@gmail.com**

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
| `classroom.courses.readonly` | Leer la lista de tus cursos de Classroom. | Mostrar tus cursos en el panel y crear las carpetas de Drive de las clases que elijas. |
| `classroom.coursework.me` | Leer y gestionar las tareas (`courseWork`) y el trabajo asociado que te pertenecen. | Sincronizar fechas de entrega y detalles de tus tareas. Tona no entrega tareas por ti: te abre la tarea en Classroom para que la entregues tú. |
| `classroom.student-submissions.me.readonly` | Leer el estado de tus propias entregas (`studentSubmissions`). | Saber si ya entregaste una tarea o sigue pendiente. |
| `calendar.events` | Ver y editar los eventos de tus calendarios de Google. No permite crear, borrar ni compartir calendarios completos, ni cambiar su configuración. | Mostrar tu agenda de los próximos días (calendario principal) y crear los eventos que tú pides y confirmas. Tona no modifica ni elimina eventos que no haya creado a petición tuya, aunque el permiso técnico concedido por Google es más amplio que eso. |
| `gmail.send` | Enviar correos en tu nombre. **No permite leer, listar ni buscar tus correos.** | Enviar únicamente los correos que tú le pides redactar. Antes de enviar, Tona te muestra destinatario, asunto y contenido, y espera tu confirmación explícita. |
| `drive.file` | Acceso limitado a los archivos que Tona crea o que tú abres explícitamente con Tona mediante el selector de Google (Picker) — **no** a tu Drive completo. | Crear las carpetas y documentos de tus clases, y vincular o editar los documentos específicos que tú eliges. |
| `documents` | Ver, editar, crear y eliminar tus documentos de Google Docs. Es un permiso de Google que, a nivel técnico, abarca todos tus Docs. | Mostrar y editar el contenido de los documentos que Tona creó o que tú vinculaste. Tona no accede a otros documentos tuyos. |

Si en el futuro Tona amplía o reduce estos scopes, esta tabla se actualizará y se te notificará conforme a la Sección 12.

### 3.3 Acceso a Google Drive y Docs (bajo tu control explícito)
**Tona no solicita acceso a todo tu Google Drive.** El scope `drive.file` solo permite a Tona ver y modificar los archivos que ella misma crea o que tú abres con Tona a través del **Google Picker**, un selector de archivos que tú controlas. Tona no puede ver, listar ni acceder a ningún otro archivo de tu Drive.

Esto incluye:

- **Documentos que tú vinculas:** cuando seleccionas un documento con el Picker, Tona obtiene acceso a ese documento específico. Su identificador, título y enlace se guardan en la base de datos de Tona para que puedas abrirlo desde el panel de documentos, compartirlo en sesiones colaborativas o consultarlo con el agente.
- **Carpetas de tus clases:** durante la configuración inicial puedes pedir que Tona cree en tu Drive una carpeta llamada «Tona · Clases» con una subcarpeta por cada clase de Classroom que elijas. Si activaste esta función, Tona también crea la subcarpeta de las clases nuevas que aparezcan en tu Classroom, salvo las que hayas omitido o quitado. Puedes quitar el vínculo de cualquier clase cuando quieras; al hacerlo, Tona no borra la carpeta de tu Drive.
- **Documentos creados por Tona:** los documentos que Tona crea dentro de esas carpetas a petición tuya, por ejemplo un borrador para una tarea.
- **Revisión periódica en segundo plano:** cada pocas horas, Tona revisa únicamente las carpetas de clases que ella creó, para ver si ya existe un archivo que corresponda a una tarea próxima a vencer y así sugerirte revisarlo o prepararlo. No revisa ninguna otra parte de tu Drive.

### 3.4 Datos de integraciones adicionales opcionales
- **Notion:** si conectas tu cuenta, se sincroniza el contenido de las páginas que tú compartes explícitamente con la integración y que decides "anclar" dentro de Tona.

### 3.5 Datos generados por el uso del Servicio
- Historial de conversación con el agente (para dar continuidad a la conversación).
- Racha de estudio, minutos de enfoque diario, actividad diaria (mensajes por día).
- Uso mensual de tokens de IA (para gestión interna de capacidad del servicio).

### 3.6 Datos de pago
Tona utiliza **Stripe** como procesador de pagos. Tona **no almacena** números de tarjeta ni datos financieros completos: Stripe los procesa directamente y Tona solo conserva identificadores de cliente/suscripción y su estatus (activa, en prueba, cancelada, etc.).

### 3.7 Datos sensibles
Tona no solicita ni clasifica intencionalmente datos personales sensibles (salud, religión, orientación sexual, afiliación política, etc.). Sin embargo, dado que el Servicio da acceso a contenido libre del usuario (documentos, notas, mensajes de chat, correos que le pides redactar), es posible que dicho contenido incluya datos sensibles del propio usuario de forma incidental. Tona no analiza ni clasifica ese contenido con fines distintos a los descritos en este Aviso, y no lo utiliza para inferir características sensibles sobre ti.

---

## 4. Finalidades del tratamiento

### 4.1 Finalidades necesarias para el Servicio (no requieren consentimiento adicional)
- Crear y administrar tu cuenta.
- Sincronizar y mostrar tus tareas, calendario y materiales académicos.
- Crear y gestionar las carpetas y documentos descritos en la Sección 3.3, y mostrar, editar y compartir los documentos que tú vinculas.
- Permitir que el agente de IA responda tus solicitudes y ejecute acciones que tú pides explícitamente (crear tareas, eventos y notas; crear o eliminar documentos que tú nombras; enviar correos que tú redactas). Los correos siempre requieren una confirmación adicional antes de enviarse. La entrega de tareas en Classroom la haces tú: Tona solo te abre la tarea.
- Procesar tu suscripción y pagos.
- Dar soporte técnico y atender solicitudes de privacidad.
- Prevenir abuso del Servicio (por ejemplo, detección de patrones de spam en el chat).

### 4.2 Finalidades secundarias (requieren tu consentimiento, y puedes negarlo sin afectar el Servicio principal)
Actualmente no se realizan tratamientos con finalidades secundarias (como marketing o comunicaciones comerciales). Si en el futuro se implementaran, se te notificará y solicitará tu consentimiento por separado.

---

## 5. Uso de Inteligencia Artificial y lógica del algoritmo

Tona utiliza el modelo **Gemini 2.5 Flash**, operado a través de **Google Cloud Vertex AI**, como motor conversacional y de toma de decisiones dentro de la aplicación.

- **No hay revisión humana individual** de cada respuesta o acción que el agente genera en tiempo real; el sistema responde de forma automatizada con base en el contexto de tus datos académicos y tu conversación.
- **Qué se envía al modelo:** para responderte, Tona envía al modelo tu mensaje, tu conversación reciente y un resumen de datos de tu cuenta de Tona (por ejemplo, tareas, eventos, exámenes, sitios monitoreados y títulos de páginas de Notion ancladas).
- **El usuario mantiene control sobre las acciones de mayor impacto:** las acciones destructivas o irreversibles (como eliminar un documento o enviar un correo) solo se ejecutan cuando tú las pides explícitamente. Además, el envío de correos siempre te muestra el contenido y espera tu confirmación antes de enviarse. Tona no entrega tareas por ti.
- **Vertex AI no utiliza el contenido de tus conversaciones ni tus datos para entrenar los modelos de Google**, conforme a los términos empresariales de Google Cloud.
- El procesamiento ocurre en la región `us-central1` de Google Cloud (Estados Unidos), lo cual implica una **transferencia internacional de datos** hacia Estados Unidos como parte necesaria de la operación del Servicio. Google actúa como encargado del tratamiento bajo sus propios compromisos contractuales de protección de datos.

### 5.1 Cumplimiento con la Política de Datos de Usuario de los Servicios de API de Google

El uso y la transferencia a Tona de información recibida de las APIs de Google se adhieren a la [Política de Datos de Usuario de los Servicios de API de Google](https://developers.google.com/terms/api-services-user-data-policy), incluidos sus requisitos de **Uso Limitado (Limited Use)**. En concreto, respecto de los datos obtenidos vía Calendar, Classroom, Drive y Docs:

- No usamos estos datos para publicidad, ni los vendemos, ni los compartimos con fines de publicidad ni con corredores de datos de ningún tipo.
- No permitimos que humanos lean el contenido de tu Calendar, Classroom, Drive o Docs, salvo en los siguientes casos excepcionales: (a) con tu consentimiento explícito y afirmativo para atender una solicitud de soporte que tú iniciaste; (b) por razones de seguridad, como investigar abuso o una vulnerabilidad; (c) para cumplir con obligaciones legales; o (d) cuando los datos han sido agregados y anonimizados y se usan exclusivamente para mejorar funciones del Servicio, sin poder ser reasociados a tu identidad.
- Usamos estos datos únicamente para proveer o mejorar las funciones orientadas al usuario descritas explícitamente en este Aviso — no para ningún otro producto, modelo de IA de propósito general, ni finalidad no relacionada.
- El permiso de Gmail que solicitamos (`gmail.send`) se usa únicamente para enviar los correos que tú apruebas. Tona no accede al contenido de tu bandeja de entrada.

---

## 6. Con quién compartimos tus datos (encargados del tratamiento)

Para operar Tona, tus datos son procesados por los siguientes proveedores, actuando como encargados del tratamiento (nunca se venden ni se comparten con fines publicitarios de terceros):

| Proveedor | Función | Datos involucrados |
|---|---|---|
| Google (Workspace APIs, Cloud, Vertex AI) | Autenticación, Classroom, Calendar, Drive y Docs, envío de correos (Gmail), motor de IA, texto a voz | Los descritos en las Secciones 3.2 y 3.3 |
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
- **Cerrar sesión no es lo mismo que eliminar tu cuenta ni que revocar el acceso a Google.** Cerrar sesión solo termina tu sesión activa en la aplicación; tus datos y permisos de Google permanecen intactos hasta que tú decidas revocarlos o eliminar tu cuenta.
- **Si eliminas tu cuenta:** todos tus datos personales, tokens de acceso, historial y contenido almacenado en Tona se eliminan de forma permanente e irreversible. Puedes hacerlo de inmediato desde la sección "Cuenta" en la configuración de Tona (autoservicio, sin espera), o enviando una solicitud a `corteshernandezangelisaac@gmail.com`, que atenderemos en un plazo máximo de 5 días hábiles.
- **Si revocas el acceso OAuth de Google** (sin eliminar tu cuenta): se eliminan tus tokens de acceso y refresco de inmediato, y las integraciones dejan de funcionar hasta que vuelvas a autorizarlas. Los datos ya sincronizados previamente (tareas, notas creadas manualmente) no se eliminan automáticamente por esta acción — solo se elimina el acceso a las fuentes externas.
- Los **documentos y carpetas** que Tona creó o que vinculaste mediante el Picker permanecen en tu Google Drive; Tona solo conserva su identificador y título para mostrarlos en el panel. Si eliminas tu cuenta, estas referencias se eliminan de la base de datos de Tona, pero los documentos y carpetas originales permanecen en tu Drive.
- El contenido de los correos que le pides redactar a Tona puede permanecer en el historial reciente de tu conversación con el agente, que solo conserva los mensajes más recientes y se elimina junto con tu cuenta. Los correos enviados quedan en tu carpeta de enviados de Gmail, fuera de Tona.

---

## 9. Tus derechos ARCO

Tienes derecho, en todo momento y sin costo, a **A**cceder, **R**ectificar, **C**ancelar u **O**ponerte al tratamiento de tus datos personales, así como a revocar tu consentimiento. Para ejercerlos, escribe a `corteshernandezangelisaac@gmail.com` indicando tu solicitud; daremos respuesta conforme a los plazos establecidos por la Ley Federal de Protección de Datos Personales en