# Buzón y eliminación de anuncios

27 de octubre de 2026.

## Mercadillo

Administración → Ver anuncios → Rechazados o retirados → Eliminar definitivamente. Requiere sesión administrativa y confirmación. Elimina el anuncio, fotos, notas de revisión, cola de correo y versión de edición mediante los vínculos y triggers existentes. La condición SQL vuelve a comprobar el estado al borrar; no permite eliminar pendientes ni publicados. Los vendidos mantienen la espera de 24 horas. No se borraron anuncios reales durante las pruebas.

## Buzón

Botón «Buzón de sugerencias» en las botoneras de portada. Página `sugerencias.html`: título, apartado, idea (10–4000 caracteres), alias opcional y aceptación de revisión privada. Diseño negro con borde metálico y reflejo azul discreto, sin cambiar el resto del sitio. No exige una cuenta de miembro: el sitio no dispone de autenticación general de socios. Cualquier visitante puede enviar; solo administradores pueden leer y gestionar.

Administración → Revisar buzón de sugerencias. Filtro nuevas/leídas/archivadas, actualización, marcado y borrado con confirmación. Muestra las últimas 200 recibidas; archivar conserva el registro. La campana registra un aviso solo para administradores, sin publicar la idea en noticias públicas. No envía correos ni SMS. No se promete respuesta.

API `/api/suggestions`: POST público crea; GET solo administradores lista; POST `/id` actualiza estado y DELETE `/id` elimina, también privados. Protección de origen, validación de tamaños/categorías, honeypot y límite de cuatro envíos por IP aproximada/bloque de 15 minutos usando el mecanismo existente. Los campos se muestran con textContent. Clarity no está habilitado en esa página; formularios enmascarados y privacidad actualizada. Se almacena en la tabla D1 `club_suggestions`, creada de forma aditiva por el flujo de publicación. No requiere un proveedor adicional.

Pruebas en SQLite efímero y navegador: envío sin alias, validación, límite, privacidad, origen, cambios de estado, borrado, móvil y no filtración de avisos al público. Ninguna sugerencia de prueba se envió a producción.
