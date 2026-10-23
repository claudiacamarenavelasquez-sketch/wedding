# Claudia & Jorge · 12 de diciembre de 2026

Invitación editorial responsive en HTML, CSS y JavaScript, sin dependencias de producción ni compilación. Incluye las diez escenas del brief, apertura automática silenciada y sin botones, monograma original, programa confirmado y RSVP explícitamente demostrativo.

## Ejecutar

Desde `/workspace/wedding`: `python3 -m http.server 3000 --bind 0.0.0.0`.
Abrir mediante un servidor HTTP, no con `file://`, porque se usan módulos ES.

## Programa confirmado

4:00 p. m.: ceremonia religiosa. 5:00 p. m.: ceremonia civil. 6:00 p. m.: inicio de la fiesta. Estos horarios reemplazan los del brief y los incrustados en la acuarela.

## Recursos e información

`config.js` centraliza rutas, paleta de invitadas, indicaciones, regalos, Maps y RSVP. Se conservaron sin alterar el video, monograma y fotograma del ZIP recibido. El original completo está respaldado fuera del proyecto, en `/workspace/wedding-original/claudia_jorge_web/`.

Se incorporaron la acuarela auténtica y la foto vertical en blanco y negro de Claudia y Jorge desde complementos.zip. El draft editorial se conserva como referencia en /workspace/wedding-original/complementos/. Faltan las referencias e ilustración de Hera y Ramsés y una foto original de la capilla (opcional, la acuarela ya está integrada). Los puntos `assets.chapel`, `assets.couple` y `assets.cats` aceptan sus futuras rutas; no se muestran imágenes inventadas. La acuarela se presenta con una ventana CSS que muestra la arquitectura y oculta los textos incrustados del programa para evitar duplicación y horarios anteriores. Se conserva el archivo íntegro; el color se atenúa solo con CSS. La foto de los novios ocupa una escena de pantalla completa con object-fit: cover y encuadre responsive; el texto se superpone dejando los rostros libres. El archivo original no se modifica. La sección del monograma utiliza una versión derivada con fondo transparente, preparada para integrarse al papel como marca de agua. El original permanece en assets/monograma.png.

Quedan pendientes acceso, estacionamiento y regalos. No se publican servicios ni enlaces no confirmados. `mapsUrl` contiene el enlace de Google Maps proporcionado por la pareja; Cómo llegar abre esa ubicación en otra pestaña. El diseño no impone burgundy a las invitadas.

## RSVP: estado real y conexión segura

Por defecto `mode: 'auto'`: el enlace general muestra demostración y los enlaces privados con #invite usan el backend. Familia y dos lugares son ejemplos claramente señalados; NO se guardan datos ni se usa localStorage. No se leen `nombre` ni `cupos` de la URL. No hay backend ni base de datos conectados. No cambiar a `live` hasta implementar y probar lo siguiente:

1. Crear una base privada (por ejemplo PostgreSQL administrado) con `invitations(id, token_hash UNIQUE, name, seats)` y `responses(invitation_id UNIQUE REFERENCES invitations, attending, count, names, message, updated_at)`. Un organizador autenticado administra los cupos; nunca el invitado.
2. Generar tokens aleatorios criptográficos de al menos 32 bytes en el servidor. Guardar solo su hash y entregar a cada familia su enlace `/#invite=TOKEN`. El fragmento no se envía al alojamiento estático; el navegador lo usa en Authorization. Es una credencial privada: cualquiera que reciba el enlace puede usarlo. No poner nombres ni cupos en URLs, analítica o logs. Permitir revocación/rotación.
3. Implementar funciones Vercel en `/api/invitation` con GET y PUT. Leer `Authorization: Bearer TOKEN`, calcular su hash, buscar una sola invitación. Sin token válido: 401/404 genérico. No permitir listar invitaciones. Responder `Cache-Control: private, no-store`; no registrar tokens o datos personales.
4. GET devuelve `{name, seats, response: null | {attending, count, names, message}}`. PUT acepta solo `{attending, count, names, message}`. Obtener SIEMPRE seats desde la base. Rechazar cantidad no entera, negativa, cero si asiste, mayor al cupo, nombres vacíos o incoherentes y mensajes de más de 2000 caracteres. Si no asiste, exigir count=0 y names=[]. Limitar nombres a 120 caracteres. Rechazar campos desconocidos y cuerpos excesivos. Hacer validación y actualización atómica para evitar carreras con cambios de cupo.
5. Hacer upsert por invitation_id para actualizar respuestas sin duplicados. PUT responde JSON solo tras confirmar la escritura. Aplicar limitación de solicitudes, mismo origen y HTTPS. Mantener credenciales únicamente en variables privadas del servidor. Si se utiliza Google Sheets, acceder desde el backend con cuenta de servicio privada, nunca desde el navegador; controlar concurrencia y escrituras con el mismo rigor.
6. Probar tokens inválidos, aislamiento entre familias, manipulación del cupo, confirmación parcial, rechazo, actualización y errores de almacenamiento. Luego activar `rsvp.mode: 'live'`.

El adaptador frontend ya consume ese contrato y muestra errores sin afirmar un guardado cuando falla la petición. Las validaciones del navegador son solo de experiencia de usuario y deben repetirse en el servidor.

## Vercel

Importar el repositorio, elegir preset **Other**, sin comando de build ni instalación y directorio de salida `.`. `vercel.json` define cabeceras. No hace falta framework. El modo demo se puede desplegar directamente; el RSVP real requiere las funciones y la base indicadas. No se ha publicado ni desplegado automáticamente.

## Validación

`node --check app.js` y prueba de navegador documentada en `tests/browser.cjs`. La prueba usa Playwright y Chromium del entorno, sin añadir dependencias a la aplicación. Ejecutar con el servidor en puerto 3000: `node tests/browser.cjs`. Comprueba recursos, intro, demo, cupos, rechazo de parámetros públicos y ausencia de desbordamiento en móvil/tableta/escritorio.

## Actualización de dirección de arte

Se retiró el rótulo vertical de portada. La capilla se acompaña de un marco doble de papelería, separadores e iconos lineales para el programa. `assets/anturio-editorial.png` es una naturaleza muerta decorativa generada para esta invitación; no representa el lugar ni a los novios. Se conserva como recurso disponible, pero no se muestra en Regalos ni Lugares reservados: ambas escenas utilizan papelería sobria, sin fotografías de fondo.

La composición actual incorpora editorial.css, foto a pantalla completa, detalles botánicos, papelería en la sección de detalles y formulario con doble marco. Se eliminaron los rótulos de capítulos numerados.

## Ajustes finales solicitados

Se eliminó la escena independiente de detalles (Nos encontramos en Lima); la ubicación permanece junto a la capilla. Dress code reproduce la composición de la referencia: seis tonos sugeridos configurables, ilustraciones de moda decorativas generadas, vestido largo o midi elegante, traje en tonos neutros e indicación de evitar blanco, ivory y burgundy.

Regalos usa fondo marfil y un monograma pequeño. Lugares reservados usa burgundy liso, dos líneas finas y la cantidad asignada como protagonista.

La intro se reproduce sola y pasa a la portada al terminar. Ante error, bloqueo de autoplay o espera superior a 15 segundos, se muestra la portada sin bloquear la navegación. Con movimiento reducido se muestra directamente la portada.

Regalos incorpora un anturio fotográfico decorativo generado, con transparencia, como remate pequeño y parcialmente recortado en el borde inferior. El texto sigue sobre marfil y Lugares reservados conserva el fondo burgundy liso.

La referencia de materiales se traduce en pequeños bordes de encaje vectorial en portada y regalos, esquinas finas de plata envejecida en el formulario y una separación de papel muy suave. Los SVG decorativos son originales y no contienen textos ni estrellas. No se reproduce el collage ni se añaden flores nuevas.

## Materialidad revisada

materials.css unifica portada, dress code y RSVP con papel de algodón, encaje y esquinas de plata mediante recursos decorativos generados, optimizados a WebP. Las muestras de la paleta usan pinceladas con textura, conservando los seis tonos de config.js. Regalos utiliza una hoja marfil sobre burgundy, encaje en el borde superior y el anturio pequeño inferior. Los márgenes evitan que la decoración interfiera con el texto.

## Hoja de RSVP elegida por la pareja

- Documento: https://docs.google.com/spreadsheets/d/1xup8YEIi4OSnbCZizovOZj587_md5l0pjYDMb48INtk/edit
- Pestaña indicada: `RSVP`, gid `1294208008`.
- Su estructura aún no se ha podido inspeccionar: el acceso a Google Sheets está bloqueado por la red del entorno y no se ha verificado autorización para escribir.
- Mantener este documento privado. El formulario no debe redirigir a la lista ni descargarla en el navegador. La conexión debe realizarse desde el backend, validando los cupos guardados por invitación.
- Se requiere una exportación de la pestaña o sus encabezados para definir el mapeo, y configurar autorización privada del backend antes de activar el modo real. El enlace de edición por sí solo no habilita escrituras. No se ha enviado ninguna confirmación a esta hoja.

### Apps Script proporcionado

Endpoint de implementación recibido de la pareja:
`https://script.google.com/macros/s/AKfycbxI9qiR24_O1ng66gGS9KZdwCNToXEmLvMevIPPmJPL58Y4ObWG6vx_uS-1hENuZvM/exec`

La solicitud de lectura está bloqueada por el proxy de red (403 CONNECT); todavía no se conoce el contrato de entrada/salida ni se ha probado una escritura. Antes de conectar el formulario se debe revisar el código de Apps Script (doGet/doPost), el mapeo de columnas y la validación de cupos por identificador privado. No activar el modo real ni afirmar guardados sin respuesta verificable. No utilizar mode:no-cors para dar por confirmada una escritura cuya respuesta no pueda leerse.

## Integración Apps Script preparada

El código instalable está en `integrations/google-sheets/Code.gs`; instrucciones completas en `integrations/google-sheets/INSTALAR.md`. `api/invitation.js` implementa el puente privado de Vercel. Configurar `RSVP_SCRIPT_URL` y `RSVP_API_KEY` en Vercel y `API_KEY`/`WEDDING_URL` en Apps Script. Estas piezas aún no están instaladas ni verificadas contra la hoja real; el frontend permanece en demo. Las seis pruebas de `node --test tests/rsvp-backend.cjs` verifican el contrato con dobles de Google Sheets y del servicio HTTP, no una escritura en producción.

El bloque de fecha, programa y ubicación tiene espaciado compacto. El video de apertura usa object-fit: cover, altura dinámica del viewport y desenfoque suave; llena la pantalla sin letterboxing, recortando los laterales según la proporción del dispositivo. El archivo original permanece intacto.

## RSVP y encaje fino

Se sustituyó el fondo de papel por una versión con encaje mucho más estrecho y esquinas de plata reducidas. También se estrecharon los bordes de Regalos y cierre. El formulario tiene márgenes propios, sin campo de mensaje ni campo visible para volver a escribir al titular. Un pase no requiere nombres; con dos o más se piden únicamente los acompañantes que asistirán. El payload conserva al titular precargado como primer nombre para mantener el contrato del backend. `node tests/rsvp-form.cjs` valida 12 combinaciones de cupos y tamaños de pantalla con API simulada.

## Estado de conexión actual

El endpoint Apps Script respondió `{ok:true, service:"wedding-rsvp", version:1}` en una comprobación pública. No se ha confirmado una escritura real ni se han inspeccionado las variables de Vercel. El modo auto conecta enlaces privados a /api/invitation. La URL del script proporcionado ya es el valor predeterminado del servidor; RSVP_SCRIPT_URL permite cambiarla. RSVP_API_KEY debe configurarse en Vercel con la misma API_KEY privada de Apps Script. El enlace general permanece como demostración explícita.

## Adaptación a la lista existente

Apps Script versión 2 reconoce la pestaña original gid 1294208008 con Invitados en B y Pases en C. Conserva A:C y agrega D:J para identificador, hash, enlace y confirmaciones en la misma fila. Las pruebas locales cubren conservación de datos, generación de enlaces, revocación y guardado en esta estructura. Debe instalarse, ejecutarse prepararRSVP y publicarse como nueva versión para aplicarse a la hoja real.

Apps Script versión 3 agrega `generarEnlacesFaltantes`, ejecutable sin selección activa. Detecta una única lista por Invitados/Pases, conserva todos los enlaces existentes y omite filas inválidas. Once pruebas locales cubren esta operación repetible y las reglas del backend. Requiere pegar el script actualizado en Google y publicar una nueva versión.
