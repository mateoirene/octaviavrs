# Club Octavia vRS Cataluña

Web pública: https://octaviaap.pages.dev

Repositorio: https://github.com/mateoirene/octaviavrs

## Publicación

Los cambios en `dist/` de la rama `main` activan `Publicar web del club` en GitHub Actions. El flujo también se puede iniciar manualmente desde Actions.

El token se guarda en el secreto de GitHub `CLOUDFLARE_API_TOKEN`. El identificador de cuenta (no es una clave) está configurado en el flujo. No hay que crear un secreto adicional para el identificador.

Antes de publicar, el flujo valida el token, confirma el proyecto `octaviaap.pages.dev` y consulta la rama de producción real. La primera publicación automática está pendiente de comprobar su resultado.

Para renovar el token, usar `Account > Cloudflare Pages > Edit`, limitado a la cuenta de Raúl, y actualizar el secreto en GitHub.

## Contenido

La próxima quedada es el 23 de enero de 2027, cuarta edición Calçotada vRS. La galería incluye las fotos de los coches y «Los más fans de OCTAVIA».

El botón del álbum abre Google Fotos; sus fotos nuevas no se copian automáticamente a las miniaturas de la web.

El panel de administración de contenido y las cuentas de socios siguen pendientes.

## Referencia oficial

https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
