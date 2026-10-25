# Cortometraje propio del club

Modelo artístico original inspirado en el Octavia vRS facelift, no CAD ni réplica oficial. Referencia de proporciones y rasgos: https://www.skoda.com.sg/octavia-RS/octavia-rs-fl y https://www.skoda-storyboard.com/en/skoda-model/octavia/octavia-rs/. No se descargaron ni extrajeron modelos de terceros. Las formas internas son interpretaciones artísticas.

modelo.py construye 33 conjuntos independientes en Blender y exporta GLB y .blend. Se conservan desde el primer fotograma todas las mallas. estudio.html aplica transformaciones rígidas, sin morphs, ocultaciones ni cambios de modelo; comprueba UUID de las mallas, geometría y número de vértices cada fotograma. Red/verde en estudio negro, reflejo planar, luces, bruma tenue y profundidad de campo calculada con el buffer de profundidad.

Secuencia: 0–8 s coche completo, 8–17.5 carrocería y luces, 16–23 mecánica y ruedas, 21–26.5 habitáculo, 26–30 panorama con rótulos. Cámara orbital y movimientos smoothstep. Representación artística; no equivale a un procedimiento mecánico de desmontaje.

Producción automatizada: workflow cinematica-octavia.yml, 720 fotogramas JPEG 3840×2160 a 24fps, doce fragmentos. Genera H264 MP4 de 30 s con faststart y máximo de 24MB para Cloudflare Pages. Conserva proyecto y vídeo en artefactos; la película se guarda en una rama propia para revisar imágenes antes de incorporarla a portada. No sustituye por sí sola la web publicada.

Reproducción voluntaria mediante controles HTML, sin autoplay ni carga del MP4 al abrir la portada. Vista bajo el título de #club. El navegador no necesita ejecutar el render 3D: recibe un vídeo.

Three.js 0.180 y utilidades: MIT, licencia incluida por preparar.mjs. Blender: herramienta de producción. Sin audio añadido; no se reutiliza ni se activa la música del simulador en este vídeo.
