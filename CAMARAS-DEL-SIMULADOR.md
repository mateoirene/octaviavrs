# Cámaras del simulador — 26 de octubre de 2026

Tres vistas jugables para la misma carrera: interior original, cámara de seguimiento detrás del Octavia y cámara aérea cercana. Selector accesible y tecla C; el cambio no crea otra carrera, motor WebGL, cronómetro ni clasificación. En aérea se conserva un botón para mostrar el circuito completo. El resumen final continúa usando la vista del circuito entero y la repetición de llegada.

La radio sigue usando el audio del club (no una conexión a Spotify). En exterior se sitúa en la esquina inferior derecha, con zona táctil de 44 px; el GPS queda abajo a la izquierda. Se mantienen acelerador, dirección, freno, sonidos, alias, vueltas, clasificación, pausa, reinicio, Tesla blanco ALBERTO e incendio.

Motor: Three.js 0.180 / WebGL2. Materiales PBR de la pista, HDR y escenario compartido sin alteración de su trazado. Se añade carrocería continua del Octavia, techo, pilares, llantas, discos/pinzas rojas, faros, parrilla, escapes y fotografías recortadas del juego. Ruedas con rotación por distancia; ruedas delanteras orientables. Paneles estáticos agrupados y mapas de laterales compartidos para limitar llamadas de dibujo y memoria. Se corrige el sentido de las caras del loft para que techo y carrocería sean visibles desde fuera. Los coches son adaptaciones propias con texturas fotográficas, no réplicas CAD ni modelos oficiales fotorrealistas.

La cámara aérea de seguimiento usa perspectiva y altura constante respecto al coche. La general conserva su cámara ortográfica. El modo compatible dibuja el mismo trazado con proyección de cámara y las imágenes del juego; no requiere WebGL. Su calidad visual es inferior a la del motor 3D.

## Búsqueda de fotografías reales y proporciones

Se consultaron fotografías reales de ambos modelos para contrastar las vistas trasera/lateral, siluetas y proporciones. No se incorporan capturas con marca de agua ni se presentan fotografías ajenas como modelos 3D descargados:

- Škoda Octavia IV RS, fotografías de Alexander Migl, CC BY-SA 4.0: https://commons.wikimedia.org/wiki/File:Skoda_Octavia_IV_Combi_RS_Auto_Zuerich_2021_IMG_0573.jpg
- Tesla Model 3 blanco, vista trasera de Fiver, der Hellseher, CC BY-SA 4.0: https://commons.wikimedia.org/wiki/File:White_Tesla_Model_3_(rear).jpg
- Fotografías reales del Octavia vRS: https://www.goodwood.com/grr/car-reviews/skoda/octavia-vrs-2021/
- Proporciones Octavia RS de la documentación de Škoda: https://cdn.skoda-storyboard.com/2020/11/TD-OCTAVIA-en.pdf

Se conservan las imágenes originales seleccionadas por el club para los rivales y sus adaptaciones laterales, con sus créditos ya publicados. La búsqueda informa la construcción geométrica; no cambia su procedencia ni su licencia.

## Comprobaciones

Pruebas matemáticas en todos los circuitos, curvas, anchuras de pantalla y paso por meta. Comprobación de que cambiar de cámara no modifica el estado de carrera. Chrome verifica cambio en marcha/pausa, movimiento de cámara y ruedas, música persistente al cambiar de vista, mapa completo, adaptación móvil, reinicio y tres vistas en modo compatible. Capturas en artifacts/camara-chase.jpg y artifacts/camara-aerial.jpg. Datos de prueba efímeros, sin carreras ficticias en producción.
