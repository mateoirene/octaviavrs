# Mercadillo del club

Los miembros envían entre una y tres fotos, descripción, precio, modelo compatible, localidad y contacto desde `mercadillo.html`. El envío queda pendiente. Solo los anuncios aprobados y sus fotos se pueden consultar sin iniciar sesión.

Alberto y Raúl revisan los anuncios en `admin.html`: aprobar y publicar, rechazar, retirar o marcar como vendido. Las notas de revisión son privadas. Un registro de cambios conserva quién revisó cada anuncio. Los anuncios rechazados o vendidos dejan de verse en público.

## Acceso privado

La primera activación requiere el enlace privado que conserva el responsable de la instalación. Su clave no está en el repositorio. Solo se permiten las dos cuentas de administración configuradas mediante sus huellas. La activación permite elegir una contraseña de al menos 12 caracteres. Desde el panel se puede dar acceso al otro administrador con su correo y una contraseña inicial que se entrega personalmente.

Las contraseñas se guardan con sal y PBKDF2; las sesiones duran ocho horas y usan cookies Secure, HttpOnly y SameSite=Strict. No se guardan contraseñas ni claves en el navegador. Los intentos de acceso y los envíos tienen límites por IP, registrada únicamente como huella temporal.

## Publicación

El flujo `Publicar web del club` ejecuta las pruebas, comprueba el proyecto, prepara D1 y publica Pages. Usa el secreto existente `CLOUDFLARE_API_TOKEN`; necesita Cuenta → Cloudflare Pages → Editar y Cuenta → D1 → Editar, solo en la cuenta del club. No hace falta compartir ni cambiar el valor del secreto al ampliar los permisos del mismo token.

La base `octavia-club-mercadillo` se crea una vez, con el esquema de `server/schema.sql`, y se vincula como `MARKET_DB` únicamente al entorno de producción. Si falta acceso a D1, el flujo se detiene antes de publicar: la web anterior permanece activa. Tras modificar los permisos, vuelve a ejecutar el flujo fallido.

Las fotos se reducen en el navegador a JPG de hasta 1 MB, retirando metadatos. Se almacenan en D1 junto con los anuncios. No se requieren servicios de correo, Instagram ni R2. El formulario no comprueba que quien envía pertenezca al club: esa comprobación corresponde a los administradores antes de aprobar. Los anuncios y las fotos consumen el almacenamiento y las operaciones de D1 según los límites del plan de Cloudflare.

## Comprobaciones

`node --test tests/*.test.mjs` (Node 24). Las pruebas usan SQLite en memoria para verificar privacidad de las fotos pendientes, moderación, sesiones, activación única, segunda cuenta, validación, límites de intentos y preparación del almacenamiento. No se utilizan credenciales de producción.

## Avisos de revisión por correo

Cada envío nuevo guarda, en la misma transacción, el anuncio pendiente y un aviso en `market_review_mail`. La campana muestra los pendientes únicamente a administradores con sesión iniciada y enlaza directamente al anuncio. El mercadillo incluye acceso a revisión y filtros por temática; el panel agrupa las piezas por Motor, Llantas y neumáticos, Interior, Exterior y Otros.

El envío de correo está preparado mediante Resend para el destinatario fijo `mozos.raul@gmail.com`. Requiere configurar `RESEND_API_KEY` como **secreto del entorno de producción de Cloudflare Pages** y volver a publicar. No se debe pegar esa clave en el chat ni guardarla en GitHub o en archivos públicos. `MARKET_FROM_EMAIL` permite elegir un remitente autorizado en Resend. Si no se configura, se utiliza `Club Octavia <onboarding@resend.dev>`; el remitente de pruebas de Resend solo permite enviar a la dirección verificada del titular de la cuenta, por lo que la cuenta deberá pertenecer a `mozos.raul@gmail.com`. Para otros destinatarios o un remitente propio, primero hay que verificar un dominio en Resend.

El correo lleva temática, pieza, precio, vendedor y un enlace al anuncio en el panel privado. Abrir el correo no aprueba el anuncio: hay que iniciar sesión y pulsar Aprobar y publicar. No se adjuntan imágenes privadas al correo.

Los envíos usan una clave de idempotencia por anuncio, hasta tres intentos inmediatos y registro del resultado. `sent` significa que el proveedor ha aceptado el correo, no que esté confirmado en la bandeja de entrada. Los avisos sin configurar o fallidos permanecen pendientes; se reintentan al entrar al panel o con el botón de reintento, en lotes de cinco. No hay tarea programada de reintento cuando nadie utiliza la web. Al resolverse un anuncio, no se envían sus avisos aún pendientes.

El panel informa si el servicio de correo todavía no está configurado. Esa falta de configuración no bloquea los envíos de anuncios, la campana ni su aprobación.

## Borrado de artículos vendidos

En el panel privado, el estado Vendidos ofrece Eliminar definitivamente. Deben transcurrir 24 horas completas desde que se marcó el artículo como vendido. El tiempo se comprueba en el servidor usando el instante del cambio a vendido; no depende de la hora del navegador ni de la antigüedad del anuncio. El panel muestra cuándo se habilitará y se actualiza periódicamente.

El borrado es manual y exige confirmación. Elimina el anuncio, sus fotografías, los avisos asociados y las notas de revisión mediante una operación atómica con claves foráneas y un disparador de limpieza. No permite eliminar anuncios pendientes, publicados ni rechazados. Añadir esta función no borra ningún anuncio existente automáticamente.
