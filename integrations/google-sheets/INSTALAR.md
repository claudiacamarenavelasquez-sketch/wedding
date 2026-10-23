# Conectar el RSVP con Google Sheets

## 1. Pegar el script

En la hoja de la boda abre **Extensiones → Apps Script**. Guarda una copia de tu código anterior y reemplaza `Code.gs` por el archivo de esta carpeta. Usa el motor V8.

## 2. Propiedades privadas

En **Configuración del proyecto → Propiedades del script**, agrega:

- `API_KEY`: una clave aleatoria privada de al menos 32 caracteres (idealmente 64). Puedes generarla en tu computadora con `openssl rand -hex 32`. No la pegues en el chat ni en config.js.
- `WEDDING_URL`: la dirección HTTPS de la invitación definitiva, sin `#` ni parámetros. Usa la web de la invitación, no la del Save the Date.

La misma API_KEY se configurará solo en Vercel.

## 3. Usar la lista actual sin reorganizarla

Esta versión reconoce la pestaña original por su gid `1294208008`, con **Invitados en B1 y Pases en C1**, como en la captura de la pareja. Conserva A, B y C.

Ejecuta **prepararRSVP** desde el selector de funciones de Apps Script, acepta los permisos y recarga Google Sheets. Agrega solo estas columnas en la misma pestaña:

| D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|
| ID | TokenHash | Enlace | Asiste | Cantidad | Nombres | Actualizado |

No tienes que copiar los invitados a otra pestaña. Los datos originales de B y C se leen tal cual; las respuestas se actualizan en G:J en la misma fila. Si D:J ya contienen datos ajenos o fórmulas, el script se detiene sin sobrescribirlos.

Selecciona una fila de invitado (por ejemplo una celda de la fila 2) y usa **Invitaciones → Generar o renovar enlace de la fila seleccionada**. El enlace aparece en **F**. Si ejecutas de nuevo esa opción, revoca el enlace anterior de esa familia. La hoja es privada; cada familia recibe únicamente su enlace.

Se conserva compatibilidad con la instalación anterior que usaba Invitados (ID, Titular, Cupos, TokenHash, Enlace) y RSVP por separado. La lista original se utiliza preferentemente cuando sus encabezados corresponden a la captura.

## 4. Publicar Apps Script

**Implementar → Administrar implementaciones → Editar → Nueva versión** (o crear una implementación de tipo Aplicación web):

- Ejecutar como: **tú**, propietario de la hoja.
- Acceso: **Cualquier usuario**, para que el backend Vercel pueda llamarlo sin una sesión de Google. La API exige la clave privada y el token de la invitación para consultar o guardar. Si tu organización no permite ese acceso, hará falta otro backend.

Copia la URL terminada en `/exec`. Al abrirla devuelve un estado público sin nombres ni cupos. Una respuesta de estado no prueba que se puedan guardar confirmaciones.

## 5. Vercel

El repositorio ya incluye `api/invitation.js`, que conecta el formulario con Apps Script sin revelar la clave. Agrega en **Settings → Environment Variables**:

- `RSVP_SCRIPT_URL`: URL `/exec` de la implementación; opcional si conservas la URL que ya proporcionaste y está configurada por defecto en el backend.
- `RSVP_API_KEY`: exactamente la misma clave privada del paso 2.

Vuelve a desplegar después de configurar las variables. Estas son variables del servidor; no uses prefijos públicos. El código Apps Script devuelve errores en JSON; Vercel los convierte en errores HTTP. No usar `no-cors`, porque impediría comprobar los guardados.

## 6. Activación y prueba final

El frontend usa modo `auto`: un enlace privado con `#invite=...` utiliza el backend y el enlace general sin token muestra demostración. No hace falta cambiar config.js. Después de configurar las variables y desplegar, abre un enlace de prueba generado por el menú y verifica una confirmación parcial, su actualización y que no se permita superar el cupo. Usa una familia de prueba y elimínala después según prefieras. No afirmar conexión real hasta ver el resultado en RSVP. Mantén la hoja privada.

El script valida los cupos en servidor, busca una sola familia por token, serializa las escrituras con LockService y actualiza una respuesta por ID. No exporta la lista a los invitados. Quien tenga el enlace privado de una familia puede gestionar su confirmación; se revoca generando otro enlace. Para exposición pública conviene activar límites de solicitudes en Vercel Firewall.

## Si falla la selección de una fila

Actualiza Code.gs con la versión 3. Guarda, ejecuta `prepararRSVP` y luego selecciona `generarEnlacesFaltantes` en Apps Script y pulsa Ejecutar. Esta función no depende de la celda activa ni de la pestaña seleccionada: reconoce la lista por los encabezados Invitados/Pases. En la lista de la pareja los enlaces se escriben en F. Conserva los enlaces que ya existen, por lo que se puede volver a ejecutar para nuevos invitados. Las filas sin nombre o con pases inválidos se omiten y se indican en el resumen. Si hay más de una lista con esos encabezados, se detiene para no elegir otra por accidente. Publica una nueva versión de la implementación al terminar.
