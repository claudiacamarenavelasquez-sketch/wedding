# Pruebas de invitaciones de uno y dos pases

Ejecutar con un servidor estático local en la raíz del proyecto:

```
TEST_PORT=3022 node tests/invitation-journeys.cjs
node tests/rsvp-backend.cjs
```

El recorrido ejecuta el navegador, el controlador real de Vercel (`api/invitation.js`) y el código real de Apps Script (`Code.gs`), sustituyendo la conexión HTTP a Google y SpreadsheetApp por una hoja en memoria. No utiliza claves, enlaces ni nombres reales, ni escribe en producción.

## Casos verificados

Cuatro recorridos completos: un pase y dos pases, a 390 y 1440 px.

- Enlace corto y enlace anterior; titular y número correcto de pases.
- Video reproducible, toque para pasar a la portada y regreso al video.
- Fotografía, dos tiempos de texto, capilla, cronograma, paletas y cierre con monograma.
- Destino de los enlaces de ubicación y lista de regalos. No se navega ni se verifica el contenido de servicios externos.
- Copia exacta de las dos cuentas y ambos CCI, conservando ceros iniciales.
- Pop-up: nombre del titular, soles/dólares, operación y mensaje opcional; registro Pendiente en Obsequios.
- Reenvío de una operación sin duplicarla; cierre con Escape y restitución del foco.
- Un pase sin campos de acompañantes; dos pases con nombre obligatorio del acompañante.
- Confirmación, recarga y recuperación de la respuesta; dos pases reducidos a uno; cambio a no asistir y nueva recarga.
- Fallo temporal al enviar sin mostrar un éxito falso, seguido de un reintento correcto.
- Sin errores JavaScript, desbordamiento horizontal ni modificación de la lista de invitados; separación de registros entre ambas invitaciones.

Resultado: cuatro recorridos y 21 pruebas del backend aprobados. Esto verifica el código y el flujo con datos aislados; no certifica las variables de Vercel, permisos, propiedades o versión publicada en Apps Script.
