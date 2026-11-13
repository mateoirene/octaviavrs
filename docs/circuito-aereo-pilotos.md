# Vista aérea y fichas de pilotos — revisión

Rama: `codex/circuito-aereo-pilotos`. Base: `42b2c62`. Trabajo limitado al simulador de circuitos de `mateoirene/octaviavrs`. No se ha desplegado en producción ni modificado el repositorio/Worker privado de Autovía 3D.

## Resultado

- Carrocerías 3D propias diferenciadas para Octavia II, III, III facelift, IV, IV facelift y familiares IV/IV facelift; Tesla Model 3 conserva geometría 3D en aérea. Son recreaciones artísticas, no modelos CAD homologados ni una reproducción exacta de cada acabado.
- Capó esculpido, perfiles curvos, cristales, pilares, retrovisores, juntas, luces y ruedas reales. Se evita el dibujo 2D de un segundo coche sobre el 3D y las fotografías planas en aérea. Las fichas vinculadas usan 3D también en las otras cámaras y foto finish.
- Distintivos de 1–3 cifras proyectados mediante raycasting sobre el techo. Diámetro dependiente de su superficie útil; textura 512 px en ordenador y 256 px en perfil móvil. Se calculan al cambiar la selección, nunca por fotograma.
- Iluminación metálica con reflejos compactos en móvil y conservación del HDR de ordenador. Se mantienen las sombras de contacto y la calidad adaptativa existentes.

## Datos reales

`GET /api/racing/pilots` consulta `garage_members`, `garage_memberships`, moderación y bloqueos. Solo lectura, sin tablas ni migraciones nuevas. No expone teléfono, fecha de nacimiento, notas o fotografías. Solo fichas aprobadas y no bloqueadas.

La selección se hace por ID. Un nombre único puede vincularse automáticamente; nombres repetidos exigen seleccionar la ficha concreta. No se permite asignar el mismo ID a dos coches. Se recargan las fichas antes de iniciar una carrera vinculada; durante ella se conserva la misma asociación para evitar intercambios. La siguiente carrera utiliza los cambios de la ficha original.

La ficha desplegable muestra nombre, dorsal, modelo y datos técnicos originales. La base actual no tiene un campo independiente de marca ni color: los datos ausentes se muestran como «No disponible». Solo se interpreta un color cuando consta explícitamente en el texto, como «Blue Race». Los demás coches usan un color de representación claramente señalado. No se deduce información de fotos ni se inventa potencia o motor. Un modelo desconocido puede consultarse, pero se bloquea su carrera vinculada en vez de mostrar otro coche. Las carreras vinculadas requieren WebGL 2: el modo invitado conserva la vista compatible anterior.

No se cambia la identidad histórica del navegador para clasificaciones ni el modelo físico de los rivales. La vinculación es visual e informativa; conserva aceleración, velocidades, vueltas, colisiones y puntos. La validación de resultados acepta los nombres completos y modelos originales, incluidos sus espacios y comas.

## Archivos

- Datos: `server/racing-pilots.mjs`, `server/racing.mjs`, `dist/racing-pilot-profiles.mjs`.
- Interfaz: `dist/racing-profile-controls.mjs`, `dist/racing-profiles.css`, `dist/simulador.html`, `dist/racing-championship.mjs`.
- Gráficos: `dist/racing-body-shapes.mjs`, `dist/racing-vehicles3d.mjs`, `dist/racing-roof-numbers.mjs`, `dist/racing-world3d.mjs`, `dist/racing-tesla-photo3d.mjs`, `dist/racing-aerial.mjs`.
- Integración: `dist/racing.mjs`, `dist/racing-results.mjs`, `dist/racing-finish-replay.mjs`, `dist/simulator-bootstrap.mjs`.
- Verificación: `tests/racing-pilot-profiles.test.mjs`, `scripts/racing-roof-geometry.test.mjs`, `scripts/circuit-aerial-browser-check.mjs`.
- Inventario de modelos, sin datos personales: `.github/audits/circuit-models.mjs`, `.github/workflows/auditar-pilotos-simulador.yml`.

## Verificación reproducible

Con los recursos públicos del simulador preparados:

```sh
node --test tests/*.test.mjs scripts/racing-roof-geometry.test.mjs
node scripts/circuit-aerial-browser-check.mjs
```

El script de navegador utiliza Chromium, SQLite efímero y siete pilotos ficticios; no escribe en la base de datos real. Opcional: `CIRCUIT_BASELINE_ROOT` apunta al `dist` de la revisión anterior para capturas comparables. `CHROME_BIN` permite indicar otro ejecutable Chromium.

194 pruebas automáticas superadas: fuente aprobada, datos ausentes, nombres duplicados, dorsal cero y 1/2/3 cifras, inventario de modelos, nombres completos, equivalencia de física durante 300 pasos, ganador de foto finish, geometría del techo rotada y desplazada, curvatura y distancia inferior a 2 mm, entre las regresiones existentes.

Las comprobaciones de navegador cubren selección por ID, refresco de la ficha original, bloqueo de cambios en carrera, gas/pausa/reinicio, Combi con color explícito, tres cámaras y ficha móvil sin solapar la pista. Capturas e informe se generan en `artifacts/circuit-aerial/`.

## Límites pendientes

- Falta comprobar fluidez y legibilidad en móviles físicos; la emulación valida interfaz y perfil gráfico, no FPS reales.
- Faltan los colores originales en seis de las siete fichas examinadas. Para reproducirlos exactamente deben constar en la fuente original.
- Las recreaciones propias mejoran la geometría disponible, pero no sustituyen un conjunto de modelos de fabricante detallados y verificados para cada versión.
- La versión publicada sigue sin estos cambios hasta revisar y autorizar el despliegue. No se ha ejecutado el flujo de publicación ni sus migraciones o notificaciones.
