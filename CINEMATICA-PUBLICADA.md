# Cinemática publicada del club

Película propia de 30 segundos y 720 fotogramas a 24 fps. Modelo artístico inspirado en el Octavia vRS, no réplica ni plano técnico oficial. 33 grupos independientes; cada fotograma valida que las mallas, sus geometrías, vértices y visibilidad se mantienen. Se animan únicamente transformaciones rígidas.

Original: assets/cinematic/octavia-cinematica-4k.mp4, 3840×2160, 18.578.161 bytes, H264. Versión web: 1920×1080, 5.256.136 bytes, H264. Ambas con faststart; sin audio. Portada de 1920×1080. Reproductor debajo del título de #club, reproducción voluntaria, preload none y enlace de descarga del 4K.

Producción: workflow 40177377168, fuente b6d93c026d60bb2b3a5a66d0b7325b7a398ee6f8, Blender 4.0.2 y Three.js 0.180.0. Modelo original en cinematic/modelo.py; estudio, animación y profundidad de campo en cinematic/estudio.html; render y preparación en cinematic/. Rama de producción video-octavia-40177377168. No se incorporan cambios antiguos de esa rama al código: se copian los cuatro recursos terminados sobre la rama principal.

Comprobaciones: ffprobe confirma duración exacta, 4K nativo y 720 fotogramas; decodificación completa del MP4 web y revisión de fotogramas 0, 168, 336, 480, 624 y 695. Chrome comprueba metadatos, reproducción real, controles y ausencia de autoplay en la web. Tras publicar se verifican HTTP 206, MIME video/mp4 y solicitudes por rango de ambas versiones. No se ha medido reproducción en teléfonos físicos.
