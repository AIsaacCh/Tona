# Términos y Condiciones de Uso — Tona

**Última actualización:** 17 de agosto de 2026
**Versión:** 1.1

---

## 1. Quiénes somos y qué es Tona

Tona ("el Servicio", "la Plataforma", "nosotros") es un agente académico impulsado por inteligencia artificial, operado por **Angel Isaac Cortes Hernandez**, persona física, bajo el nombre comercial **"Tona"**.

Al crear una cuenta o usar el Servicio, aceptas estos Términos y Condiciones ("Términos") y nuestro [Aviso de Privacidad](/legal/privacidad). Si no estás de acuerdo, no debes usar Tona.

---

## 2. Elegibilidad

El Servicio está dirigido **exclusivamente a personas mayores de 18 años**. Al registrarte, declaras y garantizas que tienes al menos 18 años de edad. Nos reservamos el derecho de suspender cuentas donde tengamos motivos razonables para creer que esta condición no se cumple.

---

## 3. Descripción del Servicio

Tona te permite, entre otras funciones:

- Sincronizar y organizar tareas, calendario y materiales de **Google Classroom** y **Google Calendar**.
- Gestionar **documentos de Google Drive** que tú vincules explícitamente a través de la función de "vincular doc", que requiere tu autorización expresa en cada ocasión.
- Interactuar con un agente de IA (basado en Gemini, vía Google Cloud Vertex AI) para crear tareas, eventos, notas, buscar correos, redactar y enviar correos.
- Conectar y consultar contenido de **Notion** (opcional).
- Colaborar en tiempo real con otros usuarios de Tona mediante salas de trabajo compartido.
- Recibir monitoreo de páginas web que tú configuras, para avisos de becas, convocatorias, etc.

El Servicio se ofrece "tal cual" y puede modificarse, ampliarse o discontinuarse parcialmente en cualquier momento, conforme a la Sección 12.

---

## 4. Cuenta y autenticación

- El acceso a Tona se realiza mediante inicio de sesión con tu cuenta de Google. No existe un sistema de usuario/contraseña independiente.
- Eres responsable de mantener la seguridad de tu cuenta de Google, ya que es la puerta de entrada a Tona.
- Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta que detectes.

---

## 5. Permisos e integraciones con Google y terceros

Al conectar tu cuenta de Google, Tona solicita los siguientes permisos (*scopes*), que puedes revisar y revocar en cualquier momento desde la configuración de seguridad de tu cuenta de Google (myaccount.google.com/permissions):

| Scope solicitado | Alcance real del permiso |
|---|---|
| `openid`, `userinfo.email`, `userinfo.profile` | Identificarte y mostrar tu nombre, correo y foto de perfil. |
| `calendar` | Acceso de **lectura y escritura sobre todos tus calendarios de Google**, no solo sobre eventos que Tona haya creado. Tona lo usa para mostrar tu agenda y crear recordatorios que tú confirmas, pero el permiso concedido a nivel técnico es más amplio que ese uso. |
| `classroom.courses.readonly` | Lectura de tus cursos de Classroom. |
| `classroom.coursework.me` | Lectura y gestión de tus propias tareas de Classroom. |
| `classroom.coursework.me.readonly` | Lectura de tu propio trabajo de curso. |
| `classroom.student-submissions.me.readonly` | Lectura del estado de tus propias entregas. |
| `drive.file` | Acceso **solo** a los archivos individuales que tú abres o creas con Tona mediante el selector de Google (Picker). No da acceso al resto de tu Drive. |
| `documents` | Lectura y edición del contenido de los Google Docs a los que Tona tiene acceso mediante el punto anterior. |
| `gmail.send` | Envío de correos en tu nombre — únicamente los que tú redactas o apruebas explícitamente. |
| `gmail.readonly` | **Lectura del contenido completo de tu Gmail** (no solo metadatos): asunto, remitente, cuerpo del mensaje y adjuntos. Este es un *scope restringido* según la clasificación de Google, que exige mayores estándares de manejo de datos de nuestra parte (ver Sección 5.2 y el Aviso de Privacidad, Sección 5.1). |

**Importante sobre Google Drive y Docs:**

Tona **no solicita acceso permanente a tu Google Drive ni a Google Docs**. En lugar de eso, cuando deseas vincular un documento existente o crear uno nuevo, Tona te muestra un selector (Google Picker) que tú controlas. Solo en ese momento, y con tu acción explícita de seleccionar o crear un documento, Tona obtiene acceso a **ese documento específico** que tú elegiste. Este acceso se limita al documento seleccionado y no se extiende al resto de tu Drive.

Tona **nunca**:
- Accede a documentos que no hayas vinculado explícitamente.
- Elimina, modifica o comparte documentos sin tu acción directa.
- Escanea tu Drive en busca de archivos sin tu intervención.
- Lee tu Gmail de forma continua o en segundo plano; solo consulta correos cuando tú se lo pides al agente en el momento.

**Tona nunca envía correos, entrega tareas ni elimina documentos sin una acción explícita tuya.** Las acciones irreversibles (como entregar en Classroom o enviar un correo) siempre requieren tu confirmación directa antes de ejecutarse.

Si conectas **Notion**, aplican adicionalmente los términos de uso de Notion para el contenido que compartes con la integración.

### 5.1 Cumplimiento con la Política de Datos de Usuario de Google

El uso de las APIs de Google dentro de Tona está sujeto a la [Política de Datos de Usuario de los Servicios de API de Google](https://developers.google.com/terms/api-services-user-data-policy), incluyendo sus requisitos de **Uso Limitado ("Limited Use")**: los datos obtenidos de Gmail, Calendar, Classroom, Drive y Docs se usan exclusivamente para proveerte las funciones de Tona descritas en estos Términos, no se venden, no se usan con fines publicitarios y no son leídos por personas salvo en las excepciones descritas en el Aviso de Privacidad (soporte que tú solicitas, seguridad, cumplimiento legal, o datos agregados y anonimizados).

### 5.2 Scopes restringidos y verificación de Google

`gmail.readonly` está clasificado por Google como un scope **restringido**. Esto significa, entre otras cosas, que conforme el número de usuarios de Tona crece, Google puede exigirnos completar procesos adicionales de verificación y evaluación de seguridad para mantener este acceso habilitado. Esto es un requisito de la plataforma de Google hacia nosotros como desarrolladores, y no cambia los compromisos que ya te hacemos en estos Términos y en el Aviso de Privacidad sobre cómo tratamos tus datos.

---

## 6. Función de colaboración entre usuarios

Tona permite crear salas de trabajo compartido con hasta 3 participantes mediante un código de acceso. Al usar esta función, aceptas que:

- Tu nombre y correo serán visibles para los demás participantes de la sala.
- Los archivos que decidas compartir dentro de la sala quedarán con permisos de edición para los demás participantes.
- Eres responsable de a quién le compartes el código de la sala.
- Cualquier participante puede cerrar la sala si es quien la creó; los demás pueden abandonarla en cualquier momento.

---

## 7. Suscripción, pagos y cancelación

- Tona se ofrece mediante un plan de **suscripción mensual**, con un periodo de prueba gratuito de **3 días** para nuevos usuarios.
- Podemos, a nuestra discreción, otorgar periodos de prueba extendidos (hasta 30 días) a usuarios seleccionados como parte de promociones.
- Los pagos se procesan a través de **Stripe**. Al suscribirte, autorizas el cobro recurrente conforme al plan vigente hasta que canceles.
- Puedes cancelar tu suscripción en cualquier momento desde el portal de facturación (Stripe). La cancelación surte efecto al final del periodo ya pagado; no se realizan cargos adicionales después de cancelar.
- **Política de reembolsos:** no se ofrecen reembolsos por periodos parciales ya utilizados, salvo que la ley aplicable disponga lo contrario.
- Nos reservamos el derecho de modificar el precio del Servicio, notificándote con anticipación razonable antes de que el cambio te afecte.

---

## 8. Uso de Inteligencia Artificial — alcances y límites

- Las respuestas y acciones del agente son generadas automáticamente por un modelo de lenguaje (Gemini, vía Google Cloud Vertex AI) y **pueden contener errores, imprecisiones u omisiones**.
- Tona **no sustituye el criterio académico del usuario, de sus profesores o de su institución educativa**. Es tu responsabilidad verificar la información antes de usarla en trabajos, entregas o decisiones académicas.
- El uso de Tona para completar tareas académicas debe cumplir con las **políticas de integridad académica de tu institución**. Tona no es responsable de las consecuencias derivadas de un uso que infrinja dichas políticas.
- No garantizamos disponibilidad ininterrumpida del motor de IA, ya que depende de servicios de terceros (Google Cloud).

---

## 9. Uso aceptable

Al usar Tona, te comprometes a **no**:

- Usar el Servicio para actividades ilegales o fraudulentas.
- Intentar acceder a cuentas de otros usuarios o a datos que no te pertenecen.
- Interferir con la operación del Servicio (ataques de denegación de servicio, ingeniería inversa del backend, scraping automatizado no autorizado).
- Compartir contenido que infrinja derechos de propiedad intelectual de terceros a través de las funciones de documentos o notas.
- Usar la función de colaboración para compartir contenido dañino, acosar a otros participantes o distribuir malware.

El incumplimiento de esta sección puede resultar en la suspensión o terminación de tu cuenta sin reembolso.

---

## 10. Propiedad intelectual

- El software, diseño, marca "Tona" y la arquitectura del Servicio son propiedad de **Angel Isaac Cortes Hernandez**.
- **Tú conservas la propiedad de todo el contenido que generas o subes** (notas, documentos, tareas manuales). Nos otorgas solo la licencia estrictamente necesaria para almacenar, procesar y mostrarte dicho contenido como parte del Servicio.
- El contenido generado por el agente de IA a partir de tus instrucciones (por ejemplo, borradores de documentos o correos) se te otorga en licencia de uso libre para tus fines personales/académicos; no garantizamos que dicho contenido sea original o esté libre de similitudes con otros textos generados por el mismo modelo para otros usuarios.

---

## 11. Terminación de cuenta

- Puedes eliminar tu cuenta en cualquier momento enviando una solicitud a `tagentstudyapp@gmail.com`. Procesaremos tu solicitud en un plazo máximo de 5 días hábiles.
- Podemos suspender o terminar tu acceso si incumples estos Términos, sin perjuicio de otras acciones legales que correspondan.
- Al terminar tu cuenta, tus datos se eliminan conforme a lo descrito en el Aviso de Privacidad.

---

## 12. Cambios al Servicio y a estos Términos

Podemos modificar, actualizar o descontinuar funciones del Servicio en cualquier momento. Podemos también actualizar estos Términos; los cambios sustanciales (incluyendo cambios en los scopes de Google solicitados) se te notificarán dentro de la aplicación y, cuando la ley lo requiera, se solicitará tu aceptación nuevamente antes de continuar usando el Servicio. La versión vigente siempre estará disponible en esta misma página.

---

## 13. Limitación de responsabilidad

En la máxima medida permitida por la ley aplicable:

- Tona se ofrece "tal cual" y "según disponibilidad", sin garantías de exactitud, disponibilidad ininterrumpida o ausencia de errores.
- No somos responsables por daños indirectos, incidentales o consecuentes derivados del uso del Servicio, incluyendo pero no limitado a pérdida de datos académicos, entregas tardías o incorrectas resultantes de fallas técnicas de terceros (Google, Notion, Stripe), o decisiones tomadas con base en respuestas generadas por IA.
- Nada en esta sección limita responsabilidad en casos donde la ley mexicana no permita su limitación (por ejemplo, dolo o mala fe).

---

## 14. Ley aplicable y jurisdicción

Estos Términos se rigen por las leyes de los **Estados Unidos Mexicanos**. Para cualquier controversia, las partes se someten a los tribunales competentes del **Estado de México**, renunciando a cualquier otro fuero que pudiera corresponderles.

---

## 15. Contacto

Para dudas sobre estos Términos: **tagentstudyapp@gmail.com**