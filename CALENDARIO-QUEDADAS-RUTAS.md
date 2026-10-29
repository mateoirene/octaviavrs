# Calendario de quedadas y rutas

La sección reutiliza el calendario, la sesión de administración y la API existentes. No necesita dependencias nuevas ni otra base de datos.

## Añadir o editar un evento

1. Iniciar sesión en `admin.html`.
2. Abrir «Gestionar calendario».
3. Pulsar hoy o una fecha futura para crear un evento, o «Editar evento» en una tarjeta existente.
4. Completar el tipo, estado, fecha, hora, lugar, descripción y, cuando proceda, recorrido y fotografía.
5. Añadir un enlace HTTPS real para mostrar el botón de inscripción o información. Sin enlace no aparece ningún botón de inscripción.

Los tipos admitidos son quedada, ruta, concentración, almuerzo y calçotada. Los estados son próximo evento, inscripciones abiertas y evento finalizado. Cualquier fecha pasada se presenta públicamente como finalizada aunque conserve otro estado en la ficha administrativa.

## Datos y fotografías

Los campos históricos siguen en `club_events`. Los nuevos campos se guardan en `club_event_details`, vinculados por el identificador del evento. Esta estructura conserva los eventos existentes y permite volver a desplegar el esquema sin recrearlos.

La fotografía es opcional, admite JPG, PNG o WebP y tiene un máximo de 3 MB. Se guarda en Cloudflare D1 y se sirve desde `/api/club/events/{id}/photo`. Al eliminar el evento también se elimina su detalle y fotografía mediante la relación de la base de datos.

## Publicación

Los cambios de esta mejora se preparan en `codex/calendario-quedadas-rutas`. La rama `main` y la web de producción no cambian hasta revisar y fusionar expresamente esta rama.
