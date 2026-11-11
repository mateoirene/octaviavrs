# Autovía integrada · 11 de noviembre de 2026

Documento histórico de la primera versión de la propuesta #23. Para la evolución visual y móvil posterior, consultar `AUTOVIA-EVOLUCION.md`.

En `simulador.html`, el selector «Experiencia de conducción» permite alternar el circuito existente y «Autovía 3D · tráfico y conducción libre». La autovía reutiliza Three.js 0.180.0, la carrocería Octavia y el presupuesto gráfico del simulador. No es una página independiente. El circuito sigue siendo la opción inicial.

## Comportamiento implementado

- Carretera 3D continua de tres carriles, curvas suaves, arcén, barreras, marcas, señales, vegetación y edificios procedurales. Geometría relativa al jugador para evitar pérdida de precisión al recorrer grandes distancias.
- Aceleración, retención, freno, dirección progresiva, pérdida de velocidad en el arcén y respuesta a barreras e impactos. Unidades reales de simulación: metros, segundos, m/s; la instrumentación convierte a km/h.
- Seis vehículos iniciales, generación posterior a más de 430 metros, velocidades individuales, seguimiento con distancia de seguridad y cambios de carril condicionados a espacio delantero y trasero. Máximo 18 vehículos; se retiran los lejanos. Los adelantamientos e impactos cuentan a partir del estado físico.
- Detección barrida de impactos jugador/tráfico y subpasos de hasta 1/120 s. Se puede recuperar la trayectoria tras un golpe o reiniciar la sesión.
- Cámaras detrás, capó y conductor, seguimiento amortiguado y campo de visión dependiente de la velocidad. La vista conductor de autovía no incluye el interior fotográfico: este se conserva en el circuito.
- GAS, FRENO e izquierda/derecha con Pointer Events, captura por identificador y pulsaciones simultáneas. Se liberan al cancelar el contacto, perder captura o cambiar de aplicación. Teclado WASD/flechas, espacio, P y C. Pausa, reinicio y pantalla completa cuando el navegador lo permite.
- Instrumentos de velocidad, distancia, adelantamientos e impactos derivados del motor. No se envían resultados de autovía a las clasificaciones del circuito.
- Tráfico y entorno con instancias GPU, textura de asfalto propia de 128×128, geometría acotada y carga diferida. Presupuesto existente: objetivo 30 FPS en perfil móvil y 60 en escritorio, límite de píxeles y reducción de resolución ante lentitud. Son objetivos, no rendimiento garantizado.
- Cambio de experiencia pausa la anterior y libera su renderizador; el estado del circuito se conserva. Pérdida de contexto pausa la autovía; la recuperación no reanuda sin intervención del usuario. Si WebGL no arranca, se muestra reintento y se puede volver al circuito compatible.

## Conservación y permisos

Sin cambios en `server/`, `functions/`, migraciones, configuración Cloudflare, datos del club ni credenciales. Se conservan campeonato, pilotos, pintura, fotografías, nitro, récords, resultados, radio y repetición del circuito, además de sus menús y el resto de la web. La autovía tiene su propio estado temporal y reiniciar no borra almacenamiento del circuito.

La administración web sigue validando la sesión del ID fijo del propietario de Raúl. No se ha creado otra cuenta de administrador. **La cuenta de gestor de simulador de Alberto no existe en el esquema actual y no se ha provisionado**. No se deben usar su nombre ni el Tesla ALBERTO como identidad de autorización. Para darle un acceso de gestión es necesario diseñar/provisionar credenciales limitadas sin elevarlo a administrador general. Los permisos del repositorio GitHub son independientes: esta conexión tiene `push=true`, `admin=false`; no puede alterar la titularidad o los permisos de colaboradores. El repositorio continúa bajo `mateoirene`.

## Recuperación

Base exacta: `f00cba605ff8495e05f77490ceadfdc88701426a`.

- Rama de respaldo remota: `backup/pre-highway-20261111`, creada antes de subir los cambios.
- Etiqueta local con el mismo nombre y rama de trabajo `codex/highway-3d-20261111`.
- ZIP del árbol original: `octaviavrs-antes-autovia-20261111.zip`, SHA-256 `78de99a8a22e737e9a9c8c43b0e6599365f2d88b14b4b445446040795b26d431`.

El ZIP contiene el código y recursos versionados, no una exportación de D1 ni los recursos externos generados por los scripts. Para recuperar el código, partir de la rama de respaldo y ejecutar los scripts habituales de preparación. Si se llegase a integrar esta propuesta, se puede revertir su commit mediante otro cambio revisable, conservando los commits posteriores. No ejecutar el flujo `publicar.yml` para hacer una vista previa: ese flujo consulta el destino de producción y también aplica migraciones. No se ha publicado ni ejecutado ese flujo desde este trabajo.

## Validación reproducible

Con Node 24 y Chrome instalado, desde la raíz del repositorio:

```text
node scripts/prepare-local-images.mjs
node scripts/prepare-race-assets.mjs
node scripts/prepare-track3d.mjs
node --test tests/*.test.mjs
node scripts/highway-browser-check.mjs
```

En Windows, indicar `CHROME_BIN` con la ruta a Chrome para `prepare-local-images.mjs`; la nueva prueba de navegador detecta también la instalación habitual. Los recursos externos de preparación requieren red. No hay compilación ni `package.json`: `dist/` es el código servido.

Para probar manualmente, ejecutar `node scripts/preview-highway.mjs` y abrir `http://127.0.0.1:8790/simulador.html`; seleccionar Autovía 3D. Esa vista previa solo sirve archivos locales: las APIs responden que no están conectadas y no muestran ni modifican D1. Las clasificaciones y la gestión de datos requieren el backend normal del club.

La prueba de navegador sirve la web original desde localhost con SQLite efímero, ejecuta WebGL en Chrome/SwiftShader y comprueba circuito, navegación, cambio de experiencia, teclado, cámaras, pausa, multitáctil mediante CDP (390×844 y 844×390, DPR 3), freno, cancelación, colisión, límites de dibujo, pérdida/restauración de contexto, retorno al circuito y conservación del récord. Genera capturas y `artifacts/autovia-browser-results.json`. Los hooks de inyección física solo se exponen con `?highwayTest=1` en localhost; no están disponibles en el dominio público.

La batería completa dio **157 pruebas superadas** (151 existentes y 6 nuevas). Las seis pruebas de física se volvieron a ejecutar después de añadir el tráfico inicial. El workflow `comprobar-autovia.yml` permite repetir pruebas y conservar capturas sin secretos Cloudflare y sin publicar. El estado real de CI debe consultarse en GitHub; no se presupone que haya pasado por haber añadido el archivo.

La última comprobación de navegador superó 13 verificaciones sin excepciones JavaScript. Una muestra de la sesión emulada registró 8 vehículos, 36 llamadas de dibujo y 26.790 triángulos. El contador observó 9 FPS bajo SwiftShader (renderizado por software); esta medición no acredita fluidez en Android ni el objetivo de 30/60 FPS. Debe verificarse con la GPU del teléfono real antes de publicar.

## Límites comprobados

Se leyó íntegramente el adjunto «Texto pegado.txt», recuperado de la conversación original. Se intentó abrir el enlace corto y el enlace completo del vídeo, y buscar su ID: la herramienta no pudo recuperar el vídeo ni devolvió resultados. Por tanto, no se atribuye al vídeo ninguna cámara, iluminación, física o interfaz concreta, ni se afirma equivalencia visual con Highway Racer Pro. Los vehículos de tráfico y el entorno son estilizados, no fotorrealistas.

La validación móvil es emulación de Chrome, no una prueba en un Android físico. No se garantiza 60 FPS. No se ha probado un inicio de sesión real, permisos reales de Alberto, publicación en Pages ni restauración de D1 de producción. Las pruebas automatizadas de autorización y del resto del club usan bases temporales. El modo autovía requiere WebGL 2; la alternativa 2D existente sigue accesible en circuito.
