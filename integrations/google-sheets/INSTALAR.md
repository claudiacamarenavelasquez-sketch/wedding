# Conectar el RSVP con Google Sheets

## 1. Pegar el script

En la hoja de la boda abre **Extensiones → Apps Script**. Guarda una copia de tu código anterior y reemplaza `Code.gs` por el archivo de esta carpeta. Usa el motor V8.

## 2. Propiedades privadas

En **Configuración del proyecto → Propiedades del script**, agrega:

- `API_KEY`: una clave aleatoria privada de al menos 32 caracteres (idealmente 64). Puedes generarla en tu computadora con `openssl rand -hex 32`. No la pegues en el chat ni en config.js.
- `WEDDING_URL`: la dirección HTTPS de la invitación definitiva, sin `#` ni parámetros. Usa la web de la invitación, no la del Save the Date.

La misma API_KEY se configurará solo en Vercel.

## 3. Preparar las pestañas

Ejecuta **prepararRSVP** y autoriza el script con tu cuenta, propietaria de la hoja. Creará `Invitados` y usará `RSVP`.

La fila 1 de `Invitados` debe ser exactamente:

| ID | Titular | Cupos | TokenHash | Enlace |
|---|---|---|---|---|

La fila 1 de `RSVP` debe ser exactamente:

| ID | Asiste | Cantidad | Nombres | Mensaje | Actualizado |
|---|---|---|---|---|---|

**Si RSVP ya contiene otras columnas, el script se detiene sin reemplazarlas.** Guarda una copia y adapta los encabezados o envíame sus nombres para mapearlos. No borres respuestas existentes para forzar la instalación.

En `Invitados`, completa únicamente **Titular** y **Cupos** para cada familia. Desde la hoja, recarga la página, selecciona una fila y usa **Invitaciones → Generar o renovar enlace de la fila seleccionada**. El script completa ID, TokenHash y Enlace. Si ejecutas de nuevo esa opción, revoca el enlace anterior de esa familia. Cada enlace es privado; no compartas la hoja ni los enlaces de otras familias.

## 4. Publicar Apps Script

**Implementar → Administrar implementaciones → Editar → Nueva versión** (o crear una implementación de tipo Aplicación web):

- Ejecutar como: **tú**, propietario de la hoja.
- Acceso: **Cualquier usuario**, para que el backend Vercel pueda llamarlo sin una sesión de Google. La API exige la clave privada y el token de la invitación para consultar o guardar. Si tu organización no permite ese acceso, hará falta otro backend.

Copia la URL terminada en `/exec`. Al abrirla devuelve un estado público sin nombres ni cupos. Una respuesta de estado no prueba que se puedan guardar confirmaciones.

## 5. Vercel

El repositorio ya incluye `api/invitation.js`, que conecta el formulario con Apps Script sin revelar la clave. Agrega en **Settings → Environment Variables**:

- `RSVP_SCRIPT_URL`: URL `/exec` de la implementación.
- `RSVP_API_KEY`: exactamente la misma clave privada del paso 2.

Vuelve a desplegar después de configurar las variables. Estas son variables del servidor; no uses prefijos públicos. El código Apps Script devuelve errores en JSON; Vercel los convierte en errores HTTP. No usar `no-cors`, porque impediría comprobar los guardados.

## 6. Activación y prueba final

El frontend sigue en modo `demo` hasta comprobar la configuración externa. Después cambia `rsvp.mode` a `live` en config.js y despliega. Abre un enlace de prueba generado por el menú y verifica una confirmación parcial, su actualización y que no se permita superar el cupo. Usa una familia de prueba y elimínala después según prefieras. No afirmar conexión real hasta ver el resultado en RSVP. Mantén la hoja privada.

El script valida los cupos en servidor, busca una sola familia por token, serializa las escrituras con LockService y actualiza una respuesta por ID. No exporta la lista a los invitados. Quien tenga el enlace privado de una familia puede gestionar su confirmación; se revoca generando otro enlace. Para exposición pública conviene activar límites de solicitudes en Vercel Firewall.
