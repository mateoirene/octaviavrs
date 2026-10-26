# Puntero sin retraso de seguimiento

Se elimina el elemento flotante que seguía `pointermove` mediante `requestAnimationFrame`, sus cambios de posición y la ocultación del cursor nativo. Ese seguimiento dependía del hilo principal y podía retrasarse durante renderizados y otras tareas.

El mismo diseño pequeño, negro biselado con borde rojo discreto, se entrega ahora mediante `cursor: url(...)` con SVG de 21 × 29 y punto activo (2,2). El navegador se encarga del movimiento; JavaScript solo cambia brevemente el recurso al pulsar un control. Se mantienen los cursores de edición y controles deshabilitados. En dispositivos táctiles no se crea ningún puntero ni marcador. Si el navegador rechaza el recurso se conserva su cursor automático.

Las nueve páginas cambian la versión del CSS y JavaScript. Chrome verifica el cursor nativo, iluminación/restauración del clic, ausencia de elementos flotantes y cursor de texto. Se conserva el resto de efectos, navegación y simulador.
