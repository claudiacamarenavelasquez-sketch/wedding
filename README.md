# Claudia & Jorge · Invitación web

Invitación responsive en HTML, CSS y JavaScript, con funciones de Vercel para el RSVP. Boda el 12 de diciembre de 2026 en ANCPCPP, Lima.

## Desarrollo

Desde `/workspace/wedding`:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

No hay dependencias de producción ni compilación. Usar HTTP: los módulos ES no se ejecutan correctamente con `file://`. El servidor estático sirve la interfaz; las funciones `/api` se ejecutan en Vercel.

## Diseño y archivos

- `index.html`: escenas, programa y formulario.
- `styles.css`, `editorial.css`, `materials.css`: estilos; la dirección visual más reciente está al final de materials.css.
- `app.js`: apertura, recursos, paletas y RSVP.
- `config.js`: datos configurables y rutas.
- `assets/`: recursos y fuentes locales con sus licencias.
- `api/invitation.js`: puente privado entre el navegador y Apps Script.

La portada sigue la referencia floral elegida por la pareja: papel marfil, encaje diagonal, marco burgundy, anturios en esquinas y monograma central C/J con anturio. El fondo (`portada-floral.webp`) y el monograma transparente (`monograma-floral.webp`) son capas separadas preparadas a partir de la referencia. Los textos son HTML editable y la flecha enlaza con Nuestra historia. El sello anterior ya no se muestra.

Solo hay dos familias tipográficas: **Bodoni Moda** para títulos, textos, campos, botones y números; **Pinyon Script** para el ampersand caligráfico de portada. Se sirven localmente desde assets/fonts. No se usan las antiguas familias Cormorant Garamond o DM Sans.

La foto de los novios ocupa una escena completa. La capilla utiliza una versión aislada con transparencia de la acuarela proporcionada; el original sigue en assets/capilla.png. El video se presenta completo, con una capa sincronizada desenfocada para llenar la pantalla vertical; tocarlo avanza a la portada. La intro está silenciada y no muestra controles. Si falla o se bloquea, se muestra la portada; con movimiento reducido se omite automáticamente.

El prototipo recibido se conserva fuera del checkout en `/workspace/wedding-original/claudia_jorge_web/`. Los complementos originales están en `/workspace/wedding-original/complementos/`.

## Información confirmada

- 3:30 p. m.: ceremonia religiosa.
- 5:00 p. m.: ceremonia civil.
- 6:00 p. m.: inicio de la fiesta.
- Ubicación: enlace de Maps proporcionado por la pareja en config.js.
- Dress code: paletas separadas para mujeres y hombres; acuarelas ovaladas y figurines de color moderado. Se indica evitar blanco, ivory y burgundy.
- Regalos: datos bancarios proporcionados por la pareja en index.html. `giftRegistryUrl` está pendiente; Lista de regalos se muestra desactivado con Próximamente y se habilita al configurar una URL HTTPS válida.

No se inventaron horarios adicionales, hoteles, estacionamiento o indicaciones de acceso. Aún faltan las referencias e ilustración auténtica de Hera y Ramsés.

## RSVP

El titular y sus cupos aparecen junto al formulario en una sola hoja de papel. No se vuelve a pedir el nombre del titular. Con un pase no hay nombres adicionales; con más pases se piden los acompañantes confirmados. Se permiten confirmaciones parciales y rechazos. No hay campo de mensaje.

El modo `auto` utiliza el backend solo cuando el enlace contiene `#invite=TOKEN`. El enlace general muestra datos de ejemplo y el botón Probar confirmación, y no envía ni guarda respuestas. El estado de prueba se informa al intentar confirmar; no se afirma un guardado real en este modo.

Los enlaces privados consumen `/api/invitation`:

- GET devuelve únicamente nombre, cupos y respuesta de la invitación autenticada.
- PUT envía `{attending, count, names, message}`; message es una cadena vacía por compatibilidad.
- El primer nombre es el titular identificado; los siguientes son los acompañantes.
- El backend y Apps Script verifican los cupos guardados, sin confiar en cantidades de la URL ni del navegador.
- La clave privada nunca se incluye en el frontend. Las respuestas se actualizan por ID y se confirma el guardado después de la escritura.

### Google Sheets y Apps Script

Código: `integrations/google-sheets/Code.gs`.

Pasos completos: `integrations/google-sheets/INSTALAR.md`.

`crearBaseRSVP` crea una base nueva, importa nombres y pases de la lista original sin modificarla y prepara las pestañas Invitados y RSVP. Los enlaces quedan en E de Invitados. El ID del archivo creado se guarda automáticamente en `RSVP_SPREADSHEET_ID`, dentro de las propiedades de ese proyecto Apps Script. Volver a ejecutar reutiliza el archivo y conserva enlaces existentes.

`generarEnlacesFaltantes` crea enlaces únicamente para filas que todavía no tienen uno. `generarEnlaceSeleccionado` renueva un enlace y revoca el anterior de esa fila. Mantener la hoja y cada enlace privados. Si se actualiza el código de Apps Script, publicar una nueva versión de la misma implementación.

Variables privadas de Vercel:

- `RSVP_API_KEY`: misma clave que `API_KEY` en Apps Script.
- `RSVP_SCRIPT_URL`: opcional; el endpoint proporcionado por la pareja ya está definido como destino predeterminado del backend.

No pegar claves en el chat, código, configuración pública o logs. Configurar límites de solicitudes en Vercel Firewall según el uso. Las pruebas locales usan dobles de la API y Sheets; no demuestran por sí solas una escritura en la hoja de producción.

## Vercel

Importar el repositorio, preset Other, sin comando de build ni instalación y directorio de salida `.`. Las funciones de api se detectan automáticamente. Configurar las variables privadas y volver a desplegar. `vercel.json` define cabeceras de seguridad. La publicación de cambios en GitHub no confirma por sí misma un despliegue de Vercel.

Dominio de la invitación: https://claudiayjorge.vercel.app

## Validación

Con el servidor en puerto 3000 y Playwright/Chromium disponibles en este entorno:

```sh
node tests/browser.cjs
node tests/design-scenes.cjs
node tests/rsvp-form.cjs
node --test tests/rsvp-backend.cjs
```

Para otro puerto, anteponer `TEST_PORT=3003` a las tres pruebas de navegador. Estas comprueban la navegación, recursos, dos familias tipográficas, portada, programa, video completo, paletas, aislamiento visual y formulario con distintos cupos y tamaños. Las pruebas de backend verifican límites, actualización, separación entre familias, conservación de datos originales y generación repetible de enlaces con servicios simulados.
