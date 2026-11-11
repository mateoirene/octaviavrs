# Evolución de Autovía · propuesta #23

## Continuación: escenario y comprobación en el propio dispositivo

Se añade terreno con la textura de césped existente del club (resolución limitada en móvil), fachadas con ventanas proporcionadas a la altura y color variable, pilares apoyados en el terreno y un túnel continuo con espesor en los portales. Se retiran las señales exteriores dentro del túnel para que no atraviesen sus paredes. La pintura conserva ahora la intensidad original del mapa de normales, reduciendo el brillo granulado excesivo. No se cambia el motor ni se añaden recursos de pago.

El menú de Autovía permite **Medir rendimiento · 30 s**. Hay que arrancar o continuar primero y conducir treinta segundos activos; las pausas no cuentan y las demoras reales del renderizado sí. Al terminar, **Guardar medición** descarga un JSON local con FPS, percentil 95, fotogramas, GPU declarada, resolución y ajustes. No se envía al servidor ni contiene nombre de piloto, correo, identificadores personales o tokens. La identificación Android del navegador se registra como declarada, sin afirmar una prueba física por parte del agente.

Cámara, calidad y ambiente se guardan en una clave local independiente de los récords del circuito. El audio sigue requiriendo una acción del usuario. Los ajustes dañados o un bloqueo del almacenamiento no impiden conducir.

La continuación se respalda en `backup/pre-scenery-refinement-20261111`, con base remota `ef86ca0ba33e7d3c31cd3c993bf7e7941ec2d975`. Validación local: 165 pruebas antes del último caso de señalización, cinco pruebas nuevas de estructuras/sesión y una prueba posterior específica de señalización; CI repite toda la batería actual. Chrome con Intel UHD completó la medición de 30 s y el informe exportable: 29,93 FPS, percentil 95 de 33,4 ms, 898 intervalos. Sigue siendo GPU de escritorio con pantalla móvil emulada, no un Android físico. Se conservan las limitaciones de modelo provisional, dirección artística y falta de certificación a 60 FPS descritas al final de este documento.

Se continúa en `codex/highway-3d-20261111`, sin fusionar `main`, alterar D1, modificar administración ni ejecutar el flujo de producción. La base de esta evolución queda recuperable en `backup/pre-professional-20261111` (remota) y en el ZIP `octaviavrs-antes-fase-A.zip`. El respaldo original anterior a toda la autovía también se conserva.

## Avances por fases

**A, reconstrucción visual.** Se mantiene Three.js 0.180.0: admite glTF, PBR, HDR e instancias, sin cambiar el motor del circuito. Se sustituyen los coches hechos de cajas por modelos GLB: deportivo Car Concept con interior, cristales, faros, llantas y neumáticos; y berlina Innerscene para dar variedad al tráfico. Las ruedas se transforman alrededor de sus centros y giran según la distancia. Se agrupan geometrías por material y se comparten en instancias GPU. Pintura con reflejos del entorno HDR, luces de freno y faros emisivos. Asfalto con color, normales y rugosidad de Poly Haven, carretera con relieve y peralte, quitamiedos perfilados, señalización, vegetación en tarjetas cruzadas con transparencia, edificios con fachadas, puentes y túneles. No se afirma que todos los elementos alcancen calidad fotográfica.

Las cámaras interior, trasera y aérea comparten el mismo estado. El puesto interior usa el habitáculo GLB, con un instrumento que muestra la velocidad del motor; se elimina el cero decorativo de la textura original. La aérea sigue cerca del coche y se corrigió su encuadre para mostrarlo completo. La vista de capó anterior sigue disponible en el menú.

**B, conducción.** Dirección progresiva, orientación relativa, velocidad lateral con adherencia, inercia al soltar, aceleración/freno proporcionales, respuesta a pendientes, deriva moderada en curvas, impactos y rebote en barreras. Cabeceo, balanceo y pequeño movimiento vertical de carrocería a partir del estado físico. El tráfico conserva velocidades, adelantamientos, reserva de carril y frenada con distancia de seguridad; ahora limita también el avance para evitar atravesar a un vehículo delantero. El collider lateral se amplía para ajustarse a las nuevas carrocerías.

**C, móvil.** Pantalla de juego inmersiva al arrancar, salida al club sin perder navegación, áreas seguras, mandos semitransparentes con pulgar izquierdo/derecho, velocímetro compacto y opciones en un menú. Vertical y horizontal. Inicio, pausa, reinicio, pantalla completa del navegador, cámaras y teclado se mantienen. Las pulsaciones continuas/simultáneas y su cancelación se verifican mediante eventos táctiles reales de Chrome CDP.

**D, ambiente y sonido.** Día, atardecer y noche, faro delantero de alcance limitado y luces de los modelos. Se añade sonido sintetizado de motor, neumáticos, proximidad del tráfico e impactos, activado por el usuario. Se integra la radio existente del club también en Autovía. Pausar, salir o cambiar de aplicación silencia la conducción y detiene la radio. Las pruebas verifican activación del audio; no certifican cómo se oye en un altavoz Android físico.

**E, optimización y validación.** La geometría del escenario solo se reconstruye al avanzar a otro tramo, en vez de en cada dibujo. No se dibuja continuamente estando en pausa. Recursos de geometría/textura compartidos, eliminación de coches lejanos y menos deportivos detallados a distancia. Resolución adaptable, tres niveles manuales y objetivo 30/60 FPS según perfil; calidad Alta permite intentar 60. Los enlaces directos a Autovía cargan el circuito de forma diferida para no descargar antes todas sus fotografías. Se conserva pérdida/restauración de contexto, disposición de recursos y retorno al circuito.

## Modelos, licencias y diferencia con Octavia

El jugador es **un deportivo conceptual provisional; NO es un Škoda Octavia**. No se cambia esa identidad por una afirmación falsa ni se usan recursos extraídos de juegos. `dist/highway-models.mjs` contiene el manifiesto sustituible: URL, longitud, orientación, raíces de ruedas, posición del conductor y crédito. Al obtener un Octavia con licencia verificable, debe adaptarse a ese contrato y volver a comprobar cámaras y colisiones.

- [Car Concept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/7d4ba189827916452eeadc82d4b712dbc6280a6f/Models/CarConcept): Eric Chadwick / Darmstadt Graphics Group GmbH, 2024, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Se adapta escala, materiales, pintura, luces, animación y salpicadero. Se omiten pequeñas mallas del limpiaparabrisas que producían moiré desde el puesto de conducción. No se declara patrocinio de Khronos. GLB original 11.778.688 bytes, SHA-256 `c272098089d78c5cd9fd9f24ff50ee8acf8d932c55f2d55fc10adb6c8998966b`.
- [Sedan car](https://www.innerscene.com/tools/library/3d-parts/sedan-car-42109739): Innerscene, CC0. Berlina genérica exterior, sin interior detallado. GLB 641.908 bytes, SHA-256 `187c9935c40f952837fe2d98200b390415e695196d7b1280c9ec3ebb1bf4961b`.
- Asfalto Asphalt 02 (Rob Tuytel) y cielo Kloppenheim 06 Pure Sky: Poly Haven, CC0, mismos recursos legales del circuito. Vegetación, fachadas, carretera y estructuras creadas mediante código para esta integración.

Los scripts descargan los modelos de fuentes públicas, verifican su hash y generan créditos. No se compran recursos ni se contratan servicios. Se volvió a intentar el vídeo y se buscaron modelos Octavia; el vídeo no fue recuperable y la descarga Octavia de Sketchfab respondió 403. No se usa esa página para atribuir una licencia a un archivo que no se obtuvo.

## Pruebas y rendimiento

`node --test tests/*.test.mjs`: 160 pruebas superadas en local, incluidas las anteriores del club, física/inercia y aislamiento de la vista previa. Se ejecutan otra vez en CI sobre el commit final. El resultado real de Actions es la autoridad para la rama remota, no la mera existencia del workflow.

`scripts/highway-browser-check.mjs` verifica arranque del circuito, navegación, transición entre experiencias y liberación de GPU, aceleración, pausa, tres cámaras principales, multitáctil vertical/horizontal, cancelación del freno, colisión, pantalla inmersiva, cambio de ambiente, audio activado por el usuario, pérdida/restauración WebGL, conservación del récord y ausencia de excepciones/`console.error`. Genera nueve capturas de escena (interior, trasera, aérea, tráfico, curva, puente, túnel, atardecer y noche), además de móvil vertical/horizontal. Las capturas se crean desde un estado físico controlado para comparar vistas, no se presentan como fotografías de un teléfono.

Mediciones locales de 15 segundos, con **Intel UHD / ANGLE Direct3D11**, no SwiftShader: entre **28,6 y 29,9 FPS**, con objetivo conservador de 30 FPS. Una muestra dio 29,7 FPS, percentil 95 de 33,6 ms, 82 llamadas de dibujo, aproximadamente 504.000 triángulos, 24 texturas y 86 geometrías. El escenario/vehículos cambian y estas cifras no son constantes. Es GPU de escritorio con emulación de pantalla móvil: **no prueba un Android físico ni acredita 30 FPS sostenidos en ese dispositivo**. La prueba guarda la cadena del renderizador y marca `physicalAndroid:false`. Solicitar GPU nativa no basta: hay que comprobar que la cadena no indique SwiftShader/llvmpipe/software.

Las mediciones previas de 3–9 FPS pertenecían a renderizado por software. La nueva CI también usa software y se debe informar por separado. El objetivo de 60 FPS no se ha demostrado. El presupuesto automático reduce resolución cuando hay lentitud; no transforma una GPU insuficiente en una garantía de fluidez.

## Vista previa aislada para Android

`vista-previa-autovia.yml` prepara recursos y pruebas y despliega exclusivamente la rama Pages `autovia-pr23`, después de confirmar que difiere de la rama de producción. No llama a `cloudflare-target.mjs`, no aplica migraciones, no configura almacenamiento y no ejecuta `publicar.yml`.

La copia se prepara fuera del checkout y usa un `_worker.js` específico: solo sirve archivos estáticos, bloquea administración y todas las APIs de datos y no accede a ningún binding D1. Incluso si el proyecto tiene vínculos de vista previa heredados, ese worker no los utiliza. Los tests usan un proxy que lanza un error al acceder a cualquier binding distinto de ASSETS. Se comprueba por HTTP que administración devuelve 404 y APIs de datos 503. Las clasificaciones, perfiles y administración no se conectan a producción desde esta copia de prueba.

Antes y después se compara el ID canónico de producción. El informe generado `artifacts/autovia-preview.json` debe confirmar entorno `preview`, URL distinta de `octaviaap.pages.dev` y el mismo ID de producción. No dar por publicada la vista previa si falla esa comprobación. La propuesta sigue en borrador; no se fusiona sin aprobación expresa.

## Conservación y límites pendientes

Circuito, campeonato, pilotos, pintura, fotos, nitro, récords, clasificaciones, radio y repetición permanecen en sus módulos originales. La nueva carga diferida no borra sus datos. Se prueba ida/vuelta entre modos y se repiten las pruebas existentes del club. No se ha probado manualmente cada operación administrativa contra producción y no se ha escrito en D1. La administración de Raúl y los permisos existentes no cambian; no se aprovisiona otra cuenta ni se concede administración a Alberto.

**Todavía no es una certificación de videojuego profesional.** Faltan el modelo Octavia exacto con licencia verificable, prueba prolongada en el Android de referencia, ajuste con sensaciones de conducción del usuario y mayor dirección artística del paisaje. Los árboles son tarjetas cruzadas y los edificios/puentes procedurales; no un entorno escaneado. Las sombras de los coches son de contacto, no sombras dinámicas completas del escenario. Los reflejos usan HDR precalculado, no reflejos de pantalla o trazado de rayos. Día es el modo principal; noche y atardecer son opciones iniciales. No se afirma paridad con Highway Racer Pro ni finalización del estándar profesional solicitado.
