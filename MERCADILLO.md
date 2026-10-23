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
