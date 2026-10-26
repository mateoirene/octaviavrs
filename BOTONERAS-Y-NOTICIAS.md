# Botoneras, noticias y reloj — 26 de octubre de 2026

Navegación: hoja aislada navigation-premium.css, paneles negros brillantes con borde metálico fino, iconos vectoriales blancos/plata y reflejos discretos azul hielo. Cuatro columnas en escritorio y dos en móvil. Enlaces, texto, target y rel originales conservados en todas las páginas. No cambia el fondo, emblema, imágenes ni botones de gestión. Las entradas adicionales existentes de redes sociales se conservan.

Antes de El club se añade Sección de noticias. Descripción izquierda, pequeña pantalla derecha y reloj lateral en escritorio; composición apilada en móvil. Reproduce una ronda de novedades públicas y luego titulares del motor. Anterior, siguiente, pausa y volver al club; sin animación automática con movimiento reducido. Nuevas entradas se consultan cada minuto; no se marcan leídas las notificaciones de la campana ni se muestran revisiones privadas.

/api/club/news combina próximas quedadas, anuncios con estado approved, álbumes y mejor tiempo por combinación de circuito/dificultad y líder por puntos del campeonato en cada nivel (mejor resultado por pista, sin duplicar puntos al repetir). No expone teléfonos, correos, notas de revisión, anuncios rechazados o pendientes. Récord por circuito/nivel, sin comparar tiempos entre pistas diferentes. SQL de lectura, sin nuevas tablas ni cambios en contenidos existentes.

/api/club/motor-news obtiene solo titulares y enlaces de RSS de Diariomotor, con Motorpasión de reserva. No reproduce artículos ni fotografías de terceros. Consulta con límite de tamaño, timeout, caché y destinos fijos; URL de cada noticia limitada al dominio del medio. Se indica fuente y fecha de publicación. Si no hay conexión, se explica y se siguen mostrando las novedades del club. Una lectura antigua se identifica como tal.

Reloj en forma de velocímetro de 24 horas: fecha, hora y aguja según Europe/Madrid, sincronizadas con la hora del servidor al actualizar las noticias, incluyendo cambios de día y horario. /api/club/weather usa Open-Meteo sin clave para el tiempo de Barcelona, con atribución visible, caché y ciudad explícita. No solicita geolocalización ni envía ubicación del visitante. Si falla la fuente, se muestra Tiempo no disponible; la hora continúa funcionando.

Collage decorativo: mismas siete imágenes, tamaño compacto con tres columnas en escritorio y dos en móvil. Emblema final completo y centrado. No se habilita apertura ni se altera la gestión de álbumes.

Validación: privacidad y récords con SQLite efímero, RSS con fuentes válidas/ajenas, reserva y caché, reloj y navegación en Chrome, rotación club/motor, adaptación móvil y capturas. Las fuentes de red de la prueba de navegador son fixtures; las fuentes reales se comprueban después de desplegar. Nunca se generan anuncios o carreras de prueba en la base del club.
