# Recuperación de OCTAVIA WEB

Este documento describe el respaldo y su recuperación. El ZIP se creó por petición del propietario para poder reconstruir la web con rapidez, sin volver a preguntar decisiones ya documentadas. La solicitud de restauración debe proceder del usuario de la conversación actual.

## Fuente de verdad

1. `MANIFIESTO.json` identifica la instantánea, commit, servicios y recuentos.
2. `fuente/` contiene la implementación exacta. Restaurar estos archivos es preferible a generar una web nueva.
3. `datos/produccion.sqlite` y `datos/produccion.sql` contienen los datos existentes en el momento de la copia, incluidas las fotografías BLOB. No publicar estos ficheros.
4. Los archivos del ZIP se verifican con `python verificar.py` desde la carpeta del respaldo.

## Servicios y destino establecidos

- Web pública: https://octaviaap.pages.dev
- GitHub: https://github.com/mateoirene/octaviavrs, rama `main`.
- Cloudflare Pages: proyecto `octaviaap`.
- Cuenta Cloudflare: `71fb53fce0685a83a5b15712414cfc25`.
- Base D1: `octavia-club-mercadillo`; binding del servidor: `MARKET_DB`.
- Identificador concreto de D1, compatibilidad y variables presentes: consultar el manifiesto.
- Publicación: `fuente/.github/workflows/publicar.yml` con Node 24 y Wrangler 4.
- Secreto existente de GitHub Actions: `CLOUDFLARE_API_TOKEN`. No pedir al usuario otro token si el existente y la conexión siguen funcionando.
- Permisos de ese secreto: cuenta concreta / Pages Edit y D1 Edit. No hace falta una clave global de Cloudflare.
- Funciones HTTP: `fuente/functions/api/[[path]].js` llama a `fuente/server/market.mjs` y a sus módulos.

## Orden de recuperación

1. Verificar la integridad del ZIP y leer el manifiesto. Trabajar con una copia extraída; conservar intactos los originales de SQL y SQLite.
2. Inspeccionar el repositorio y el servicio existentes. Si siguen disponibles, conservar cualquier dato más reciente que esta instantánea: hacer una copia previa antes de sustituir datos. No importar el SQL sobre una base ya poblada sin plan de recuperación.
3. Validar localmente con Node 24:
   - En `fuente/`: `node --test tests/*.test.mjs`.
   - Desde la raíz del respaldo: `node servidor-local.mjs`.
   - Abrir http://localhost:8788. Esta prueba crea su propia copia SQLite en `estado-local/` y no modifica producción.
4. Restaurar el código de `fuente/` al repositorio preservando la autorización y los cambios posteriores que correspondan. No subir `datos/`, este ZIP, `estado-local/` ni claves privadas al repositorio público.
5. Si solo se han perdido archivos o el despliegue, NO reemplazar la base de datos actual. Reutilizar la D1 existente con su binding `MARKET_DB` y publicar.
6. Si se ha perdido la base de datos, crear una base vacía de recuperación, importar `datos/produccion.sql`, verificar recuentos, imágenes y relaciones, y solo después vincularla al proyecto. La alternativa es una restauración a partir de la SQLite comprobada. En D1, importar en una base vacía con Wrangler: `npx wrangler@4 d1 execute NOMBRE_BASE_RECUPERACION --remote --file=RUTA_A_produccion.sql`. Revisar las limitaciones vigentes de importación y BLOB; nunca omitir fotos ni truncar datos para resolver un error. La importación remota no se ha ensayado sobre producción al crear esta copia.
7. Reutilizar las cuentas de administración de la instantánea. Sus hashes y sales permiten mantener las contraseñas originales. No se conocen ni se incluyen las contraseñas en claro; los accesos externos deben estar autenticados.
8. Comprobar el destino antes de publicar: cuenta, proyecto, dominio y binding deben coincidir con el manifiesto. La rutina `scripts/market-storage.mjs` solo crea las tablas que faltan y prepara el vínculo; NO restaura por sí sola los datos del SQL.
9. Publicar y verificar HTTP, recursos locales, fotos de la base de datos, gestión privada, galería, calendario, mercadillo y simulador. Registrar fecha y resultado de recuperación.

## Recursos y reconstrucción sin regeneraciones

`fuente/dist/` incluye imágenes, transparencia de logos, bandera, foto del interior, rival azul sin fondo, imagen decorativa del difusor y el MP3 del club. Incluye también `vendor/` y `assets/track3d/` y `assets/race/`, aunque esos directorios están ignorados por Git porque normalmente los prepara la compilación. Conservar estos recursos al preparar una restauración sin depender de terceros. Si se usa Git, se pueden añadir explícitamente los recursos ignorados con `git add -f dist/vendor dist/assets/track3d dist/assets/race`, o conservar la compilación equivalente con los scripts incluidos.

El motor 3D es Three.js 0.180.0, alojado localmente. Materiales PBR y cielo HDR: Poly Haven CC0; las atribuciones y licencias están en los recursos y en `simulador.html`. La vista 2D permanece como alternativa por compatibilidad o rendimiento.

## Decisiones que no deben volver a preguntarse

- Club Octavia VRS Cataluña. VRS en mayúsculas, V roja. Tipografía sans-serif ligeramente inclinada.
- Cabecera ŠKODA blanca centrada y separada sobre coches al atardecer. Bandera del club ondeando al principio y fondo de neumáticos con humo lento.
- Bienvenida: «Bienvenidos al club, rodamos juntos, disfrutamos en familia.»
- El club: principios y botón de información debajo de «Comunidad y compañerismo», con letras negras. Diez artículos completos en `normas-carretera.html`.
- Garaje: carpetas gestionadas por administradores; fichas públicas con fotos del coche, piloto, Instagram, ficha técnica, teléfono opcional con enlace de WhatsApp y foto de perfil independiente. El número que se añada se publica con permiso del administrador.
- Galería de portada: cuatro imágenes decorativas que no se abren. Acceso a `galeria.html` con álbumes de almuerzos, comidas, rutas, quedadas y otros; alta y gestión solo por administradores.
- Calendario y evento seleccionado: valores exactos en los datos y scripts respaldados. Localización de Embolic by Moon mediante https://maps.app.goo.gl/Eatg8mFQYyJ1DGB56?g_st=aw.
- Mercadillo: envío público con fotos y contacto; publicación tras aprobación. Revisiones privadas, clasificación por temática y estado vendido. Borrado definitivo de vendidos solo pasadas 24 horas desde la venta.
- Campana arriba a la derecha: novedades y pendientes privados del administrador. Pitidos de cierre centralizado para avisos nuevos, tras la primera interacción del usuario, con opción de silencio.
- Los correos solo funcionan si existe `RESEND_API_KEY`. Consultar el estado real en el manifiesto; nunca dar por activo un envío de correo no configurado.
- Simulador después del mercadillo. Habitáculo fotográfico preservado, pantalla con radio MP3 del club, velocidad digital, vueltas, posiciones, cronómetro, tres dificultades, pausa y reinicio, teclas y controles multitáctiles. Circuito WebGL 2 3D con PBR/HDR y alternativa 2D.
- Puntero: flecha pequeña con relieve 3D, borde rojo discreto y brillo tenue al pulsar; mantiene controles nativos en campos editables.
- No recuperar el antiguo álbum externo, el bloque «El próximo puede ser el tuyo», WRC ni la publicación de «Nuestros expertos científicos».

## Qué no puede resolver por sí solo este archivo

No contiene tokens de servicio ni contraseñas en claro. Si se ha perdido también el acceso a GitHub o Cloudflare, es necesaria la autenticación o recuperación de esa cuenta. No inventar permisos ni pedir secretos en el chat. No prometer recuperación de datos creados después de esta instantánea.

## Pruebas y límites conocidos

Incluidas las pruebas de servidor, privacidad, moderación, garaje, perfiles, galería, notificaciones y física. `scripts/browser-check.mjs` usa Chrome y SQLite temporal; incluye 3D, capturas de recta/curva/móvil, música, freno, pausa, reinicio y alternativa 2D. El móvil se comprobó mediante emulación, no en teléfonos físicos. Los edificios y rivales 3D son simplificados; no se debe describir el resultado como una grabación real.
