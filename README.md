# Club Octavia vRS Cataluña

Web pública: https://octaviaap.pages.dev

Este proyecto prepara la publicación automática en el proyecto existente de Cloudflare Pages. Repositorio: https://github.com/mateoirene/octaviavrs

La configuración aún necesita la autorización de Cloudflare mediante los secretos del repositorio. La primera ejecución sin secretos se omite con un aviso y no modifica la web online.

## Configuración inicial

1. Repositorio creado: `mateoirene/octaviavrs`, rama `main`.
2. La conexión de GitHub en ChatGPT ya tiene permisos de escritura en ese repositorio.
3. En la cuenta de Cloudflare de Raúl, crear un token personalizado con permiso `Account > Cloudflare Pages > Edit`, limitado a la cuenta que contiene `octaviaap`. No necesita permisos de administrador de cuenta ni de DNS. Puede gestionar proyectos Pages dentro de la cuenta seleccionada: Cloudflare no lo limita exclusivamente a octaviaap mediante este permiso.
4. Guardar el token en el repositorio, en `Settings > Secrets and variables > Actions > New repository secret`, como `CLOUDFLARE_API_TOKEN`.
5. Guardar el identificador de esa cuenta como otro secreto llamado `CLOUDFLARE_ACCOUNT_ID`. Ambos valores se introducen en GitHub; no deben incluirse en el código o en mensajes de la conversación.
6. Ejecutar `Publicar web del club` desde Actions o incorporar un cambio en `dist/` en la rama `main`.

El flujo comprueba primero que la cuenta contiene exactamente el proyecto y el subdominio octaviaap.pages.dev, consulta su rama de producción real y publica allí. No crea otro proyecto.

## Actualizaciones

Los cambios de la web se hacen en `dist/`. Los cambios en `main` ejecutan el flujo de publicación. El asistente podrá editar esos archivos con la conexión de GitHub y consultar el resultado de Actions. No hay que intercambiar ZIP para estas actualizaciones.

Las fotos de portada están en `dist/assets`. El botón del álbum abre Google Fotos; no sincroniza automáticamente las miniaturas de la web. La próxima quedada es el 23 de enero de 2027, cuarta edición Calçotada vRS.

El acceso de administrador de Raúl para editar contenido desde un panel y las cuentas de socios siguen pendientes. Esta configuración automatiza la publicación de cambios; no añade un panel de administración.

## Referencia oficial

https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
