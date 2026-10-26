# Analítica · Club Octavia VRS Cataluña

## Estado y cuentas
El colector propio consentido, el panel privado, los eventos y el adaptador GA4 están implementados. Un adaptador instalado no significa que la cuenta externa esté conectada. Sin IDs reales, autorización de lector y credencial de servidor, las herramientas muestran pendiente. Nunca se introducen ejemplos de tráfico en producción. Las pruebas con proveedores simulados no acreditan recepción externa real.

## Configuración
1. Iniciar sesión en admin.html con una cuenta ya autorizada y abrir «Estadísticas de la web». La API reutiliza la cookie HttpOnly del club.
2. Crear/localizar la propiedad GA4 para https://octaviaap.pages.dev. Guardar ID G-… y número de propiedad en el panel. Desactivar Google Signals, publicidad y medición mejorada automática: el sitio envía page_view manual una vez. Hasta confirmar esta revisión, la etiqueta no se carga. Retención recomendada de la cuenta: 2 meses.
3. Habilitar Google Analytics Data API en Google Cloud. Crear una cuenta de servicio y añadir su correo como Lector de la propiedad. Instalar su JSON exclusivamente como secreto GA4_SERVICE_ACCOUNT_JSON en Cloudflare Pages > Settings > Variables and Secrets, entorno de producción. No pegar la clave en GitHub, este chat o el formulario. GA4_PROPERTY_ID también admite variable de servidor; el entorno tiene prioridad.
4. Registrar section, button, circuit, level, state, lap y progress como dimensiones personalizadas, y lap_ms/active_ms como métricas, si se desean explorar en GA4. No registrar nombres, alias o contactos.
5. Crear proyecto Clarity. Configurar enmascarado estricto y exclusiones de administración, estadísticas, garaje, álbumes, mercadillo y simulador. El código tampoco lo carga en esas páginas. Guardar su ID y confirmar la revisión en el panel. Requiere consentimiento adicional de grabaciones. Solo se carga en las páginas públicas admitidas sin consulta en la URL.
6. El despliegue intenta recuperar o activar Web Analytics con los permisos existentes, reutiliza un sitio del mismo host y enlaza Pages sin modificar los demás ajustes. Si la cuenta no lo permite, deja un estado pendiente y no amplía permisos ni imprime credenciales. Cloudflare > Workers & Pages > octaviaap > Metrics > Web Analytics: habilitar si la cuenta lo permite y obtener el token público del beacon. Guardarlo en el panel. El encabezado no-transform impide la inyección automática; el gestor instala un único beacon manual después de aceptar. No instalar otra etiqueta en Tag Manager, Zaraz o un tema. Los permisos de publicación existentes no implican administración de las cuentas Google, Microsoft o todos los servicios Cloudflare.

Fuentes oficiales:
- https://developers.cloudflare.com/pages/how-to/web-analytics/
- https://developers.cloudflare.com/web-analytics/get-started/
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart
- https://developers.google.com/tag-platform/security/guides/consent
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2

## Panel y metodología
Filtros de hasta 90 días, comparación con periodo anterior, gráfico diario/semanal/mensual de páginas vistas, tablas de páginas, secciones, eventos, dispositivos y procedencia. Usuarios propios son visitantes seudónimos consentidos, no un censo de personas. Sesión: 30 minutos de inactividad. Dispositivo/procedencia son categorías aproximadas sin huella digital. Interacción propia: tiempo visible con actividad reciente, incrementos de hasta 30 s; no equivale a la definición de engagement de GA4.

No sumar visitantes o visitas de GA4, Clarity, Cloudflare y D1. Sus metodologías, rechazos, bloqueadores y tiempos de procesamiento producen diferencias normales. El panel elige una fuente y no sustituye errores de GA4 por datos inventados. El backend firma OAuth de alcance analytics.readonly; nunca devuelve la credencial. Clarity y Cloudflare tienen además sus paneles externos protegidos.

Retención propia: ventana de 90 días y eliminación de registros antiguos durante actividad del servicio. Las comparaciones fuera de esa ventana pueden estar incompletas. Los informes de GA4 dependen de su retención y pueden tardar 24–48 h en consolidarse. No se reconstruye historia anterior a la instalación.

## Eventos y disparadores reales
- garage_view: carga pública del garaje.
- member_car_view: apertura de foto de ficha; resource_id UUID, sin nombre.
- member_instagram_click: clic en Instagram de ficha; resource_id UUID.
- gallery_open: carga de la página de álbumes.
- gallery_album_view: álbum cargado correctamente; album_id UUID.
- gallery_image_view: apertura de imagen; resource_id y album_id UUID.
- event_view: tarjeta visible al menos al 50 %; section y UUID si existe.
- event_calendar_click: clic en día del calendario.
- event_save_calendar: clic en descarga ICS; no acredita importación en el dispositivo.
- event_location_click: clic en enlace de localización.
- marketplace_view: carga del mercadillo.
- marketplace_listing_view: apertura de anuncio con fotos; listing_id UUID.
- seller_contact_click: clic en contacto del anuncio; listing_id, nunca URL ni teléfono.
- simulator_start: inicio validado por el juego; no vuelve a contar al reanudar pausa.
- simulator_session_end: termina, reinicia o abandona una carrera iniciada.
- simulator_engagement: cada 30 s efectivos de carrera, excluyendo pausas.
- simulator_lap_complete: la física confirma vuelta; lap, lap_ms, circuit y level.
- simulator_best_lap: mejora la marca local real que utiliza la aplicación; sin alias.
- video_start: play real por reproducción.
- video_progress: cruza 25/50/75 % por primera vez.
- video_complete: ended real.
- club_button_click: clic en botonera de navegación; sección y botón de lista cerrada.
- site_search: submit/search de un buscador type=search; solo longitud, nunca consulta. Actualmente no existe un buscador global.
- contact_click: WhatsApp/correo; tipo, sin destinatario ni borrador.
- social_link_click: clic en red externa; tipo de lista cerrada.
- page_view y user_engagement: telemetría propia adicional. El heartbeat propio user_engagement no se reenvía a GA4, que gestiona su evento automático.

El colector deduplica por UUID de evento. Una misma acción puede tener dos categorías distintas, como contacto y contacto de vendedor: no sumar esos eventos como si fueran usuarios. Los títulos libres de álbumes, fichas, eventos o anuncios no se envían para evitar datos personales. La lista cerrada de parámetros está compartida y también se valida en el servidor.

## Consentimiento y seguridad
Consent Mode básico: todo denegado por defecto, sin pings de Google previos. Publicidad siempre denegada. Clarity recibe consentv2 con capitalización oficial. Rechazar no genera identificadores analíticos. Retirar elimina identificadores y cookies accesibles y recarga para descargar etiquetas ya iniciadas; no borra retroactivamente los datos de proveedores. Áreas sensibles se excluyen y el contenido se enmascara.

No se aceptan URL completa con consulta/hash, contraseñas, correo, teléfono, nombre/alias, fecha de nacimiento, mensajes o formulario. El informe y su configuración requieren administración y mismo origen en escrituras. El colector aplica tamaño, catálogo y límites de solicitudes.

## Verificación y demostración
Navegador limpio: sin elección, rechazar, aceptar estadísticas sin grabaciones, aceptar ambas, retirar, recargar, navegar y realizar acciones reales. Network no debe mostrar gtag, clarity, beacon o collect antes de aceptar. GA4 Realtime/DebugView y Clarity deben recibir una vista correspondiente, sin instalar fragmentos duplicados. Probar 401 de informes sin sesión y 403 ante otro origen. No usar datos privados para pruebas.

Tras configurar y recibir visitas consentidas, abrir 7 días y los paneles externos para una demostración con fecha/fuente. Las capturas deben ser privadas. Los tests usan SQLite efímero, proveedores simulados y claves generadas solo para test: no representan estadísticas reales ni recepción en cuentas reales.

Para no transmitir consultas o fragmentos potencialmente sensibles, Clarity y el beacon Cloudflare no se cargan en URLs con búsqueda o fragmentos no reconocidos. GA4 recibe página y referente saneados. La medición propia elimina siempre búsqueda y fragmento. Esto puede producir diferencias adicionales entre proveedores.

La API GA4 filtra hostName=octaviaap.pages.dev. Si se migra a otro dominio, hay que actualizar ese filtro además de la propiedad y los proveedores.
