# archivo de seguridad OCTAVIA WEB

Esta es una copia completa y fechada de la web del club. Guarda el ZIP en privado, preferiblemente en dos lugares distintos. Incluye datos personales y fotografías de miembros; no lo publiques ni lo subas a un repositorio público.

## Si algún día falla o desaparece la página

Adjunta este ZIP a Codex y escribe:

«Restaura OCTAVIA WEB usando este archivo de seguridad. Conserva el diseño, contenidos, imágenes, datos y funciones del respaldo. Lee primero RECUPERACION-PARA-CODEX.md y MANIFIESTO.json. Utiliza los accesos ya conectados a GitHub y Cloudflare.»

El archivo contiene la información técnica y los recursos para evitar tener que volver a explicar cómo era la página.

## Qué contiene

- `fuente/`: código completo, páginas, CSS, JavaScript, funciones del servidor, esquema de base de datos, pruebas y publicación.
- `fuente/dist/`: web con todos sus recursos actuales, incluida la biblioteca 3D y las texturas que normalmente se descargan al compilar. No depende de volver a generar las imágenes ni el audio.
- `datos/produccion.sql`: exportación completa del esquema y de los datos de producción.
- `datos/produccion.sqlite`: la misma instantánea ya reconstruida y comprobada en SQLite.
- `MANIFIESTO.json`: fecha, versión del código, cuenta y proyecto, base de datos, funciones, estado del correo y número de registros por tabla.
- `SHA256SUMS.json` y `verificar.py`: permiten detectar archivos incompletos o modificados.
- `servidor-local.mjs`: permite levantar una copia local con datos propios del respaldo para comprobar la recuperación sin modificar la web pública.
- `RECUPERACION-PARA-CODEX.md`: procedimiento y decisiones ya tomadas.

## Importante

La copia recoge el estado de la fecha indicada en el manifiesto. Los cambios, anuncios o fotografías añadidos después requieren una copia nueva.

Las claves de acceso de Cloudflare, GitHub y otros servicios no se incluyen en el ZIP. El secreto de publicación existente se llama `CLOUDFLARE_API_TOKEN` y permanece en GitHub. Las cuentas de administración se conservan con sus huellas de contraseña y sales en la base de datos, sin guardar las contraseñas en claro.

Por ello, este archivo evita volver a preguntar el diseño, los textos y la configuración conocida; no sustituye la autenticación de las cuentas externas si estas también se pierden.
