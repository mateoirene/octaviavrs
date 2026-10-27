# Bricos, álbumes multimedia, noticias y reloj

Fecha: 27 de octubre de 2026. Se conserva la web de Cloudflare Pages y D1 existente.

## Bricos
- Acceso `bricos.html` en las botoneras. Todos pueden proponer un tutorial con su nombre o alias, modelo, temática, instrucciones y hasta 10 fotos/vídeos.
- No hay cuentas de socio: el nombre o alias es declarado por el autor, como en el envío de fichas del garaje. La revisión administrativa determina si se publica.
- Crear prepara un borrador privado y una clave efímera de carga. El servidor guarda solo su hash; no se incluye en respuestas públicas ni en enlaces. Al enviar, se cierra la carga y pasa a pendiente.
- Solo los administradores existentes pueden abrir envíos pendientes, aprobar, rechazar/retirar o eliminar. Acceso desde Administración, Bricos y avisos de la campana. Los comentarios también requieren aprobación.
- Los envíos pendientes no permiten descargar los archivos sin sesión administrativa. Se verifican permisos también al solicitar el archivo directamente.
- Nuevas tablas idempotentes: club_bricos, club_brico_media, club_brico_comments. No se modifica el contenido histórico del garaje, mercadillo o simulador.

## Álbumes
- Hasta 100 archivos combinados por álbum, conservando las fotos actuales. MP4/WebM de hasta 25 MB por vídeo. Las fotos se reducen en el navegador y se validan en servidor (JPG/PNG/WebP, hasta 1 MB).
- Vídeos guardados en fragmentos de 512 KiB en club_media_files/club_media_chunks, sin contratar otro proveedor. El espacio y las cuotas de la cuenta D1 siguen aplicándose. Las respuestas admiten rangos HTTP para reproducir y avanzar. Se borran los fragmentos al eliminar un archivo.
- No se promete conversión de códecs: deben usarse MP4 compatibles con el navegador (preferiblemente H.264/AAC) o WebM. El contenido multimedia no se reproduce automáticamente.
- Temáticas: Almuerzos, Comidas, Rutas, Kdds, Calçotada y Otros. Las carpetas históricas guardadas como Quedadas se muestran como Kdds sin borrarlas.

## Noticias y reloj
- Estación más compacta. Se eliminan récords, clasificación y demás avisos del simulador del carrusel y la campana.
- Tras recorrer las noticias del club, el emblema Škoda oscila con CSS; respeta movimiento reducido. RSS filtrado exclusivamente por Octavia y RS/vRS, con enlace al medio y fecha cuando están disponibles.
- Fuentes: comunicación de Škoda, Diariomotor y Motorpasión; se reutiliza caché y hay reserva. Si no hay titulares válidos o la fuente falla, se muestra claramente la indisponibilidad y se enlaza a la ficha oficial del Octavia RS, sin inventar noticias.
- Reloj dinámico inspirado en la referencia, con marco metálico, emblema, aguja y lectura digital; no se usa una captura con hora fija. Fondo exterior transparente y esfera translúcida para ver los neumáticos. «Hora local» usa la zona del dispositivo. La meteorología sigue siendo Barcelona (indicada), con datos Open-Meteo; «Tiempo» abre eltiempo.es.
- Navegación marcada con aria-current y borde azul hielo; selección instantánea del apartado, sin recorrido animado. Enlaces externos y modificadores del navegador conservan su comportamiento.

## Verificación
Pruebas de privacidad de borradores y archivos, tokens, revisión, comentarios, álbum mixto, categorías, rangos entre fragmentos y borrado. Navegador real: subida de foto y vídeo, aprobación, reproducción, navegación y móvil. Las pruebas utilizan SQLite efímero y contenido de prueba local, sin publicar datos artificiales.
