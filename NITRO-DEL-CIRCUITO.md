# Nitro compartido del circuito

Una recogida por carrera: emblema Škoda luminoso en el centro al comienzo de la segunda recta y disponible en la segunda vuelta. El primer coche que cruza su centro lo consume para todos. El punto se obtiene de la curvatura del mismo trazado usado para conducir; se agrupan pequeñas discontinuidades geométricas sin unir rectas separadas por curvas pronunciadas.

300 km/h mientras se mantiene el acelerador. Soltarlo o frenar cancela definitivamente el efecto. Los rivales también pueden recogerlo y frenan según su conducción automática. Pausa congela el estado y reiniciar crea una recogida nueva. No modifica música, controles, cámaras, cronómetro ni homenaje al Tesla.

`racing-nitro.mjs` contiene la lógica determinista, barrido continuo de cruces y resolución temporal del ganador. La misma posición se representa en WebGL, respaldo 2D y mapa. El servidor conserva el mínimo normal de la primera vuelta y permite el mínimo de 300 km/h en vueltas posteriores para no rechazar tiempos legítimos. Esta validación conserva el modelo existente de tiempos comunicados por el cliente, sin presentarse como antitrampas.

Validación: 77 pruebas unitarias, cobertura de los 26 circuitos en tres dificultades, disputa entre jugadores y rivales, cancelación, pausa y reinicio; Chrome comprueba el recurso, presencia en tres cámaras, desaparición tras recogida y velocidad real de la simulación.
