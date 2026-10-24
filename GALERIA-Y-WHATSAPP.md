# Galería decorativa y chat fijo

La foto número 2 de la portada se sustituye por el interior con volante/pantalla del Octavia. Se añaden asientos/reposabrazos, emblema Škoda mojado y emblema VRS mojado: cuatro encuadres distintos de las tres capturas del usuario, sin repetir el volante que aparece en dos capturas. Se mantienen las fotos anteriores 1, 3 y 4 (incluida la del escape). Total: siete imágenes decorativas, sin abrirlas; acceso a los álbumes intacto.

Los cuatro encuadres se prepararon a partir de las capturas con la herramienta de edición de imágenes para quitar barras, separadores y marcas horarias de la interfaz de mensajería. Fuentes PNG conservadas en assets/galeria-*.png. Durante browser-check.mjs, Chrome codifica copias JPEG a calidad .86, mismas dimensiones y encuadre, para servir fotografías más ligeras en la web. Las copias JPEG se generan antes de comprobar y publicar; no se eliminan las fuentes. Sin dependencias gráficas adicionales ni servicios externos en la página.

Galería: dos columnas en ordenador, una en móvil, sin huecos, última fotografía en su relación de aspecto completa. Alt descriptivo y carga diferida, tamaños reservados por CSS. Se respetan los emblemas de las propias imágenes y el tratamiento de la marca existente.

WhatsApp: widget único fijo abajo a la derecha, +34 605 245 856. Mantiene abierto/cerrado y borrador en sessionStorage al navegar por páginas de la web, sin robar foco al restaurar. El scroll no lo oculta. No envía mensajes automáticamente; el enlace continúa en WhatsApp. Abrirlo durante una carrera conserva la pausa ya implementada.

Verificación: siete recursos distintos cargan, foto 2 nueva, imágenes sin botones/ampliación, flujo de álbumes anterior conservado; widget fijo al hacer scroll, mensaje codificado y borrador/ventana restaurados al navegar. Pruebas de todo el sitio y comprobación de JPEG servidos en producción.
