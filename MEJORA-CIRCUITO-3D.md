# Circuito 3D del Club VRS

## Auditoría previa

El simulador original usa JavaScript nativo y CanvasRenderingContext2D. Proyecta aproximadamente 105 segmentos de carretera, aplica recortes de una imagen de estadio y dibuja rivales fotográficos. La foto del habitáculo, la radio MP3, los controles táctiles y el HUD son independientes de la física. No existía motor 3D, cámara perspectiva, mapas normales, iluminación PBR ni oclusión real del entorno. La imagen de estadio estirada no puede representar correctamente el movimiento de una cámara por una carretera.

## Transición aplicada

Se incorpora Three.js 0.180.0, alojado localmente y con licencia MIT. La escena WebGL 2 se dibuja en un canvas independiente detrás del habitáculo existente. La imagen del interior y sus botones conservan sus coordenadas y sus funciones. La representación anterior permanece disponible cuando WebGL 2 no está disponible o se pierde el contexto gráfico.

Los tres trazados son curvas cerradas 3D parametrizadas por longitud de arco: un metro de física corresponde a un metro de desplazamiento de la cámara. La física calcula la curvatura del mismo trazado. El asfalto, arcenes, pianos, reparaciones, marcas y vallas siguen la misma superficie. Los boxes, torre de control y gradas son geometría 3D situada fuera de la calzada. No se crean objetos al aproximarse a ellos; la niebla atenúa la distancia.

El asfalto usa los mapas fotográficos de color, normal OpenGL y rugosidad de Asphalt 02 (Rob Tuytel / Poly Haven, CC0). Los UV se expresan en metros, con repetición cada tres metros. Se incluyen marcas de goma, pequeños parches y líneas a nivel de la pista. Se utiliza luz hemisférica, luz direccional, sombras PCF y un entorno de reflejos suave con materiales MeshStandardMaterial. Es una escena propia del club y no una reconstrucción exacta de un circuito real ni una grabación de vídeo.

Un cielo HDR fotográfico CC0 (Kloppenheim 06 Pure Sky, Poly Haven) alimenta el fondo y el entorno de reflejos.

La resolución inicial se adapta al tamaño del dispositivo. Tras una ventana de medición sostenida, se reduce progresivamente si el renderizado es lento. Los elementos repetidos usan instancias y las piezas estáticas se agrupan por material. La prueba de la recta pasó de 574 a 52 llamadas de dibujo. Ante rendimiento extremadamente bajo sostenido, se activa la alternativa 2D. Los recursos de motor y materiales se descargan en la compilación y se sirven desde el dominio del club, sin dependencias de CDN durante la conducción.

## Verificación

Pruebas de geometría para cierre, continuidad, parametrización métrica, pendientes y separación entre tramos. Pruebas existentes de freno, acelerador, pausa, tres vueltas, rivales y niveles. Chrome comprueba explícitamente que WebGL 2 está activo, y registra capturas de escritorio y móvil junto con los contadores del renderizador. La validación inicial se ejecuta en una rama separada sin publicación.

La emulación móvil y SwiftShader en CI comprueban compatibilidad funcional, pero no equivalen a una medición de rendimiento en teléfonos físicos. Los coches rivales conservan la imagen trasera del club como textura sobre una geometría simplificada; no son modelos CAD detallados del Octavia.

La comprobación incluye capturas específicas de una curva del nivel experto y limpieza del renderizador auxiliar. Se valida el arranque de WebGL 2 de forma explícita, no solamente que el juego siga funcionando en la alternativa 2D.
