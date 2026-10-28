# Tesla GLB del simulador

El simulador carga `dist/assets/Tesla_Model3.glb` como carrocería 3D del Tesla blanco durante la carrera y durante la repetición de llegada. La geometría procedural se conserva como respaldo si el archivo no puede cargarse. Las cuatro ruedas animadas, la matrícula **ALBERTO** y la sombra de contacto siguen gestionadas por el sistema del simulador para mantener su apoyo en el asfalto y el giro ligado a la distancia recorrida.

La sustitución es visual. Las colisiones, la aceleración, el comportamiento competitivo, el límite de 250 km/h y la ausencia de explosión automática permanecen en los módulos de física existentes.

## Alcance del archivo actual

El GLB entregado es una primera aproximación básica. Su presencia en el simulador no implica que reproduzca con fidelidad un Tesla Model 3 Standard de 2026 ni que sea un modelo CAD oficial.

## Recurso necesario para una sustitución profesional

Para elevar la fidelidad hace falta un GLB/GLTF con licencia de uso web que incluya:

- carrocería correspondiente exactamente a la versión y año deseados, validada con referencias exteriores;
- escala real, origen centrado, eje vertical Y y frontal documentado;
- cuatro ruedas separadas y nombradas, con sus pivotes en el centro de cada eje;
- materiales PBR y texturas optimizadas para web, incluyendo pintura, cristal, pilotos, neumáticos e interior visible;
- matrícula o superficie trasera donde integrar **ALBERTO** sin deformar la geometría;
- una versión optimizada para móvil, preferiblemente por debajo de 100.000 triángulos y con texturas de 2K o menores;
- confirmación escrita de la licencia y la procedencia del modelo.

Con ese recurso se puede sustituir el GLB conservando el mismo adaptador, las físicas y las cámaras, y después ajustar orientación, ruedas, materiales y nivel de detalle con capturas de móvil y ordenador.
