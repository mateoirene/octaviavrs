# Centro de control de Octavia VRS Catalunya

El panel se sirve en `admin.html` (Cloudflare Pages también resuelve la ruta limpia `/admin`). La publicación automatizada crea primero una copia cifrada de la D1 de producción, aplica las migraciones aditivas y, si todo termina correctamente, despliega el código en Cloudflare Pages. La copia cifrada se conserva como artefacto de GitHub Actions durante 90 días.

## Uso de los doce apartados

1. **Panel principal:** consulta visitas y visitantes de los últimos 30 días, miembros aprobados, noticias, eventos próximos y las últimas operaciones administrativas. Los botones abren las herramientas principales; «Moderar mercadillo» lleva al panel anterior, que se conserva en `admin-mercadillo.html`.
2. **Contenido y páginas:** elige la página, pulsa «Elegir elemento en vista previa» y señala un texto, enlace, imagen, vídeo o sección. Modifica el valor y elige guardar borrador, publicar o programar. Para ordenar secciones, selecciona una sección y guarda un número entre 0 y 100; el menor aparece primero entre sus elementos hermanos. La sección también permite crear páginas nuevas con formato de títulos, negrita, cursiva, listas y enlaces seguros, y vista previa. En borradores el panel guarda automáticamente tras una pausa breve; publicar sigue requiriendo una acción explícita.
3. **Noticias:** crea o edita una noticia, categoría, enlace, caducidad y marca de destacada. Elige una foto o vídeo ya cargado en la biblioteca multimedia; si falta, súbelo primero en «Contenido y páginas». Guarda borradores, publica, programa, consulta versiones, recupera una versión como borrador o archiva. Un borrador posterior no reemplaza la última versión publicada. Las publicaciones antiguas siguen editándose en el vínculo al editor anterior.
4. **Eventos:** abre la herramienta de calendario actual desde el panel para crear o modificar concentraciones, consultar asistentes y mantener el historial.
5. **Socios y usuarios:** abre la gestión existente del garaje para revisar solicitudes y editar las fichas y fotos que ya admite. En «Revisiones» se puede ocultar temporalmente una ficha del garaje, cumpleaños y novedades públicas, y restaurarla después; el motivo queda privado. También se puede descargar un CSV con ID, datos del vehículo, carpeta y estado, sin teléfonos ni fechas completas de nacimiento. Esto controla la visibilidad de una ficha, no bloquea credenciales de acceso de un socio.
6. **Colaboradores:** abre la lista de colaboradores existente para editar tarjetas, enlaces y perfiles.
7. **Redes sociales:** abre la gestión existente de enlaces e iconos sociales. No se publicará automáticamente en redes sin credenciales e integración autorizadas.
8. **Apariencia:** ajusta colores y dirección de imagen del banner; la vista previa permite revisar estilos. Usa «Historial de apariencia» para inspeccionar o restaurar versiones.
9. **SEO:** define título, descripción, robots e imagen para compartir a nivel global y por cada página estática del selector. Usa «Historial SEO» para recuperar ajustes anteriores. Incluye sitemap dinámico con páginas estáticas y páginas CMS publicadas o programadas que ya estén visibles.
10. **Comunicaciones:** edita el aviso destacado de la web, revisa su historial de versiones y abre el buzón de sugerencias existente.
11. **Seguridad:** consulta accesos y operaciones registrados por el servidor, incluyendo ruta, método, código de respuesta y el ID del actor.
12. **Configuración avanzada:** cambia el nombre y contacto del club, activa el aviso de mantenimiento y alterna las funciones públicas disponibles. Cada grupo de ajustes tiene historial restaurable. Desde aquí se exporta y restaura el contenido del CMS y la visibilidad de fichas.

## Acceso y seguridad

El servidor reconoce administración solamente mediante la sesión vinculada al ID fijo del propietario `c15706ae-7b72-4779-9785-8c2f5c1e50ea`. Las rutas CMS obtienen esa identidad de la sesión validada en servidor; el nombre visible no concede permisos. Las restricciones de la tabla de administradores impiden insertar otro ID, transferir el ID del propietario o borrar su cuenta. El panel no incluye un formulario para crear administradores. Las operaciones CMS se registran en `admin_audit_log`.

La base actual es Cloudflare D1; no ofrece políticas RLS equivalentes a PostgreSQL. La aplicación aplica el control en el Worker y el acceso directo a D1 depende de las credenciales del proyecto Cloudflare. Esta entrega no configura MFA ni cambia los controles de sesión existentes.

## Copias y datos

Las tablas añadidas son `cms_content`, `cms_versions`, `cms_custom_pages`, `cms_custom_page_versions`, `cms_settings`, `cms_settings_versions`, `cms_news`, `cms_news_versions` y `garage_member_blocks`. Las migraciones idempotentes `migrations/2026-11-10-cms.sql` y `migrations/2026-11-10-garage-member-visibility.sql` las crean con `CREATE TABLE IF NOT EXISTS`; no borran ni alteran tablas existentes. Las pruebas usan una base SQLite temporal cargada desde `server/schema.sql` y vuelven a aplicar migraciones para comprobar que son seguras e idempotentes.

La copia exporta contenido, páginas, noticias, ajustes, historiales y reglas de visibilidad de fichas. La restauración valida los datos y aplica inserciones/actualizaciones a las tablas CMS y a las reglas de visibilidad de fichas que existan; no elimina filas ajenas. Los archivos multimedia se guardan en las tablas multimedia existentes y no se incluyen como bytes en el JSON. Para recuperarlos en otra base, se debe preservar también la copia de D1 y sus tablas/chunks multimedia.

## Funciones aún no conectadas

- Autenticación multifactor: no se implementa en el sistema actual.
- Publicación automática a Instagram, Facebook o WhatsApp: necesita una integración autorizada, credenciales y permisos del proveedor.
- Editor WYSIWYG de arrastrar y soltar para cabecera/pie: se ofrece edición segura de contenido con herramientas de formato básico y vista previa, no generación libre de HTML.
- Gestión de contactos de un formulario independiente y bloqueo de credenciales: el proyecto no tiene un formulario de contacto con mensajes persistidos ni cuentas de inicio de sesión para socios. Las fichas públicas sí pueden ocultarse y restaurarse desde el garaje.
- La vista previa CMS se renderiza desde el contenido guardado (y los borradores solo para la sesión del propietario); no es una previsualización de cambios de apariencia guardados sin publicar en una sesión separada.

## Verificación realizada

`node --test tests/*.test.mjs` pasa 151 pruebas. Incluye pruebas nuevas de autorización CMS, separación de borradores y contenido publicado, historial de ajustes, editor enriquecido seguro, sitemap, ocultación reversible de fichas, restauración de noticias/copias y migraciones aditivas/idempotentes, además de las pruebas existentes de activación del propietario, asistentes, galería, miembros, eventos, mercadillo y feed público. Los módulos JavaScript cambiados pasan `node --check`, y `git diff --check` no informa errores de espacios. No se ha ejecutado una prueba visual con el navegador ni una prueba contra producción.

El flujo de publicación aplica `2026-11-10-cms.sql` y `2026-11-10-garage-member-visibility.sql` a `octavia-club-mercadillo` solo después de crear y conservar el respaldo cifrado. Ambas migraciones son aditivas e idempotentes; si el respaldo o cualquiera de las migraciones falla, el flujo se detiene antes de desplegar el sitio.
