# Prueba 2026.11.11-mp1

Base recuperable: `6752ded` (main publicado). Rama: `codex/simulador-multiplataforma`.

Cambios limitados al simulador y su publicación de prueba: Octavia original del proyecto con habitáculo; mandos estándar y entrada analógica compartida; pausa al desconectar; controles según puntero; opciones gráficas manuales en ambos modos; recuperación gradual de resolución; pantalla ampliada; suspensión completa del circuito al entrar en autovía; limpieza tras fallos de carga.

Validación local: 171 pruebas Node aprobadas. Navegador Chromium: autovía, teclado, cambio al circuito y arranque 3D. La validación de integración en Actions genera capturas, pruebas multitáctiles emuladas y una muestra de conducción de 60 segundos. Ver resultados de esa ejecución antes de aprobar producción.

La vista previa utiliza un worker sin bindings de base de datos, bloquea APIs y administración. Las clasificaciones públicas no se consultan ni guardan en este entorno. No se cambian usuarios, permisos ni migraciones.

No se acredita Android/iPhone físico, Safari, macOS, Linux ni mando físico por una prueba de Chromium emulada. El modelo es una representación artística original, no un modelo oficial de Škoda. La sincronización del progreso mantiene las capacidades existentes; no se incorpora una nueva cuenta o servicio de sincronización.

Producción requiere aprobación expresa después de revisar la vista previa. No fusionar automáticamente.
