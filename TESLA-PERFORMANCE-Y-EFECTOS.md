# Tesla Performance y sensación de nitro

Referencia consultada el 26 de octubre de 2026: https://www.tesla.com/es_es/model3 — 460 CV de pico, 0–100 km/h anunciado en 3,1 s y 262 km/h. La aceleración inicial del juego se calibra a 3,1 s; por encima de 100 se reduce con velocidad, potencia nominal, masa de referencia y resistencia simplificada. No es una simulación homologada ni promete reproducir todas las condiciones de ensayo del fabricante. El inicio conserva la salida lanzada del juego; conserva carrocería blanca Standard y ALBERTO.

El rival anticipa curvas hasta 270 m, limita velocidad lateral según dificultad, frena a 11 m/s² y recupera en rectas hasta 262 km/h. Los 300 km/h del bonus son una excepción de juego. La retirada/pausa/final y la secuencia existente al perder el liderato se conservan. No se añaden escapes al Tesla eléctrico.

Nitro: FOV del escenario +10° en interior/trasera y +5° en aérea; salpicadero y volante permanecen en su propia capa. Trazos periféricos deterministas según distancia, sin desenfoque de pantalla completa ni duplicar imágenes. Se acotan a 28 trazos, 8 con movimiento reducido, y no ocultan controles o radio. Dos llamas 3D de doble núcleo aditivo nacen en las salidas reales del Octavia, con longitud variable según velocidad. Respaldo Canvas equivalente en trasera/aérea y mapa completo. Sin tareas por movimiento del ratón, nuevas peticiones por fotograma ni efectos DOM animados.

Materiales: carrocería con barniz y reflejo PBR, portón fotográfico con respuesta a la iluminación, cristal más pulido, dibujo de neumático en mapa de relieve local, discos perforados y proyectores LED. Se conservan dimensiones, geometría coherente y ruedas animadas. Los vehículos siguen siendo representaciones artísticas propias, no modelos CAD oficiales ni fotografías 3D.

Verificación: 81 pruebas automatizadas incluyendo calibración, punta, curvas, pausa, explosión frente a jugador/IA y presupuesto de efectos. Chrome verifica geometría, llama activa con nitro y ausencia tras soltar. El despliegue conserva comprobaciones completas de cámaras, móvil, música, freno y acelerador.
