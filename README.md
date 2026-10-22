# Club Octavia VRS Cataluña

Web pública: https://octaviaap.pages.dev

Repositorio: https://github.com/mateoirene/octaviavrs

## Publicación

Los cambios en `dist/` de la rama `main` activan `Publicar web del club` en GitHub Actions. El flujo también se puede iniciar manualmente desde Actions.

El token se guarda en el secreto de GitHub `CLOUDFLARE_API_TOKEN`. El identificador de cuenta (no es una clave) está configurado en el flujo. No hay que crear un secreto adicional para el identificador.

Antes de publicar, el flujo valida el token, confirma el proyecto `octaviaap.pages.dev` y consulta la rama de producción real. Primera publicación automática confirmada el 22 de octubre de 2026. Incluye la quedada del 23 de enero de 2027.

Para renovar el token, usar `Account > Cloudflare Pages > Edit`, limitado a la cuenta de Raúl, y actualizar el secreto en GitHub.

## Contenido

La próxima quedada es el 23 de enero de 2027, cuarta edición Calçotada VRS. La galería incluye las fotos de los coches y el enlace al álbum del club.

El botón del álbum abre Google Fotos; sus fotos nuevas no se copian automáticamente a las miniaturas de la web.

El panel de administración de contenido y las cuentas de socios siguen pendientes.

## Referencia oficial

https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

## Mercadillo

`dist/mercadillo.html` muestra los anuncios de `dist/data/mercadillo.json`. La lista está vacía hasta recibir las primeras piezas reales de los miembros. Los anuncios se envían al club a través de Instagram y se publican actualizando ese archivo; no hay cuentas de vendedor ni subida automática.

Cada anuncio admite `title`, `category`, `description`, `price` (número en euros o `null` para consultar), `condition`, `compatibility`, `location`, `seller`, `image` (ruta o URL) y `contactUrl` (web, correo o teléfono). Las fotos se guardan en `dist/assets/`. Un anuncio con `status: "sold"` deja de aparecer. Publicar únicamente el contacto que el vendedor quiera mostrar públicamente.

La búsqueda ignora mayúsculas y acentos, y las categorías se generan a partir de los anuncios publicados. Si el archivo de anuncios no carga, la página muestra el error y ofrece contactar con el club.
