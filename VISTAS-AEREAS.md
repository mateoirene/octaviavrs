# Vistas aéreas — 25 de octubre de 2026

Motor existente: Three.js 0.180/WebGL2, trazados Catmull-Rom geográficos y fallback Canvas2D. El modo aéreo anterior desactivaba niebla y sombras y usaba terreno sin textura. El fallback era una línea sobre fondo uniforme. Las referencias fotográficas previas no eran reconstrucciones de los recintos.

La cámara WebGL ahora añade terreno con textura de césped generada de apariencia fotográfica, variación de color en coordenadas del mundo, vegetación volumétrica instanciada, sombras de contacto, edificios de servicio con cubiertas y equipos, aparcamientos y escapatorias. El asfalto conserva los tres mapas PBR fotográficos CC0 Asphalt02 y el cielo HDR. Cámara aérea ligeramente oblicua conservando el encuadre completo. Los coches, salpicadero, controles y cronometraje no se modifican.

El modo compatible crea un atlas estático de hasta 1600 píxeles usando la misma geometría y distribución de escenario, texturas, pianos, goma, reparaciones, edificios, sombras y árboles; máximo tres atlas en caché. Solo los coches y el HUD se dibujan cada cuadro. Su fotografía se incluye también en el resumen final existente. No hay una fotografía fija con un recorrido ajeno superpuesto.

La textura fuente assets/cesped-circuito.png se conserva; Chrome codifica su JPEG durante browser-check antes del despliegue, con el mismo procedimiento de las fotos de la galería. Los elementos del escenario son genéricos y no reproducen los edificios exactos de cada circuito real. No se promete fotorrealismo de una captura de vídeo.

Verificaciones: separación de volúmenes y calzada en todos los circuitos, determinismo del escenario, movimiento y pausa, captura de vista 3D y compatible, pruebas completas del sitio y recurso servido después de publicar. Las capturas de CI están en artifacts/circuito-aereo.jpg y circuito-aereo-compatible.jpg. No se han medido FPS en teléfonos físicos.
