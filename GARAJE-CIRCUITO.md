# Garaje y circuito del club

`garaje.html` sustituye el acceso de propuesta por Instagram de la portada. Los visitantes pueden abrir carpetas y consultar fichas con hasta tres fotos, nombre del piloto, Instagram y datos técnicos opcionales. El álbum externo de Google Fotos se ha retirado; las cuatro fotos de la galería se conservan.

Los administradores utilizan las mismas sesiones del mercadillo. Desde el garaje pueden crear y renombrar carpetas, publicar y editar fichas, moverlas a otra carpeta y sustituir fotos. Solo se pueden borrar carpetas vacías. Las fichas y sus fotos pueden eliminarse con confirmación. Ningún visitante puede modificar el contenido. Las fotos se reducen en el navegador y el servidor valida formato y tamaño. Se requiere confirmar el permiso para publicar los datos y las imágenes.

Las tablas `garage_folders`, `garage_members` y `garage_photos` se crean mediante el esquema D1 existente. La publicación no necesita claves ni proveedores nuevos. No se añaden miembros ni carpetas ficticias a producción.

`simulador.html` es un juego de carreras de perspectiva 2.5D en Canvas, con habitáculo dibujado e inspirado en el Octavia VRS MK4, circuito de 3.240 metros y tres vueltas. Tiene dos rivales, frenada, velocidad reducida fuera del asfalto, contactos, volante animado y cuadro digital. Usa teclado o controles multitáctiles y se pausa al abandonar la pestaña. El sonido del motor es opcional y se sintetiza únicamente tras activarlo; no se descarga audio externo. La mejor vuelta se conserva solo en el navegador. No es una reproducción exacta del interior ni una simulación de la física real del vehículo.

`node --test tests/*.test.mjs` comprueba permisos, validación, operaciones del garaje y física del juego. El flujo de publicación ejecuta además `node scripts/browser-check.mjs` en Chrome con SQLite temporal: crea una carpeta y ficha, sube una foto, comprueba el acceso de visitante, arranca el circuito y verifica pausa y controles multitáctiles. Guarda capturas de las vistas como artefactos de la ejecución; no utiliza ni modifica datos de producción.
