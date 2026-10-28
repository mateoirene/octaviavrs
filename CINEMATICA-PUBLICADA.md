# Vídeo publicado en El club

El reproductor de `#club` utiliza el vídeo facilitado por el club el 28 de octubre de 2026. El MP4 se conserva exactamente como se recibió, sin recomprimir ni cambiar sus fotogramas.

- Archivo público: `dist/assets/cinematic/octavia-cinematica-web.mp4`
- SHA-256: `3d340697ae235080f918d43e29a8a1c15e5049c49c0f8fbe580432ef5fe7f444`
- Formato: H.264, 854×480, 30 fps, 33,6 segundos y 3.204.769 bytes
- Audio: no contiene pista de audio
- Inicio: voluntario, con controles y reproducción integrada en móvil
- Final: vuelve a empezar mediante el atributo `loop`
- Carga: `preload="none"` y entrega HTTP por rangos
- Portada: fotograma del mismo vídeo guardado en `octavia-club-portada.jpg`

El botón rojo «Descubre el club» enlaza directamente con `#club`, la sección `01 / EL CLUB`. Chrome valida el destino, los metadatos, la reproducción real y el bucle. La comprobación posterior al despliegue valida el tamaño original mediante `Content-Range`.
