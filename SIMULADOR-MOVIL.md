# Reparación de gráficos en móvil

La comprobación de la web publicada reprodujo el fallo en 390×844 y 844×390, con WebGL 2 disponible: `assets/cesped-circuito.jpg` devolvía HTTP 200 pero con HTML, y la carga de la textura abortaba la inicialización del escenario. La textura JPEG se generaba únicamente como efecto de `browser-check.mjs`; una publicación rápida omitía esas pruebas y retiraba el archivo.

La codificación de las cinco imágenes PNG a JPEG pasa a `prepare-local-images.mjs`, ejecutado en todas las publicaciones, antes de las pruebas. Se conserva el mismo contenido y calidad JPEG de la codificación anterior. Las pruebas ahora verifican los archivos preparados sin crearlos. El césped dispone además del PNG original como alternativa si falla el JPEG.

En móviles y dispositivos de entrada táctil, incluso en horizontal y con ocho núcleos, se aplica un presupuesto reducido: hasta 30 dibujos por segundo, resolución y tamaño del búfer limitados, texturas de superficie de hasta 1024 píxeles, terreno y vegetación menos densos, sin MSAA, mapas de sombra dinámicos ni HDR/PMREM. Se conservan las imágenes de los coches, sombras de contacto y texturas del circuito. La simulación física mantiene sus pasos independientes del dibujo y sus velocidades.

Los fotogramas lentos reducen gradualmente la resolución y ya no desactivan permanentemente el renderizador. Una pérdida del contexto WebGL muestra la representación compatible, también estando la carrera en pausa. Cuando el navegador restaura el contexto se recupera el escenario 3D y se reinicia la medición del rendimiento. Esto depende de que el navegador pueda restaurar el contexto; no se garantiza recuperar una GPU que el sistema mantenga desactivada.

La prueba de móvil usa Chrome con pantalla táctil, DPR 3, ocho núcleos y CPU ralentizada, en vertical y horizontal. Comprueba carga, conducción, pérdida/restauración del contexto y capturas. Se ejecuta sobre la rama antes de integrar y sobre la web pública tras una publicación correcta. Es una emulación, no una prueba en el teléfono físico del usuario.
