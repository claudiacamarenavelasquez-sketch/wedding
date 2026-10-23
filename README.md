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

También quedan pendientes la ubicación exacta verificada en Google Maps, acceso, estacionamiento y regalos. No se publican servicios ni enlaces no confirmados. `mapsUrl: null` oculta Cómo llegar hasta verificar el destino con la pareja. El diseño no impone burgundy a las invitadas.

## RSVP: estado real y conexión segura

Por defecto `mode: 'demo'`. Familia y dos lugares son ejemplos claramente señalados; NO se guardan datos ni se usa localStorage. No se leen `nombre` ni `cupos` de la URL. No hay backend ni base de datos conectados. No cambiar a `live` hasta implementar y probar lo siguiente:

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
