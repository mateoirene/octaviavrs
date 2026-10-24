# Calendario real, gestión de eventos y colaboradores

Calendario: abre en el mes y día actuales de Europe/Madrid, sin saltar automáticamente a la siguiente quedada. Botón Hoy y marcador aria-current=date; texto Hoy visible incluso al consultar otros meses. Temporizador calculado para la siguiente medianoche de Madrid (incluido cambio de horario), revisión al recuperar foco/visibilidad y comprobación de reloj cada minuto. Próxima quedada se conserva como navegación explícita.

Todos los días son seleccionables. Administrador autenticado: pulsar un día futuro vacío abre el editor con la fecha preparada; en días con eventos, el botón Añadir evento permite añadir otro. Campos: título, fecha, descripción, lugar, inicio/fin, localización e información/red social. Editar/eliminar desde la tarjeta. No se crean eventos nuevos en fechas pasadas; se permite corregir un evento histórico conservando su fecha. Las mutaciones usan la sesión y origen ya existentes. Calendario público compartido en D1, no localStorage.

Tabla club_events. La calçotada original del 23/01/2027, Embolic by moon, 13:00–17:00, enlaces originales, se importa una vez mediante marcador calendar-seeded-v1. Editarla no se sobrescribe y eliminarla no la hace reaparecer al desplegar de nuevo. El HTML conserva la referencia inicial como contenido estático; la vista JavaScript usa exclusivamente los datos actuales de D1. Descarga ICS desde la API, hora Europe/Madrid.

Texto del club: reemplazo literal de los diez párrafos solicitados, conservando bienvenida, principios y acceso a reglas. Se respeta el emblema gráfico VRS existente.

Colaboradores y sitios de interés: enlace de navegación y acceso desde la portada a colaboradores.html. Visitantes consultan listas y enlaces. Administradores crean/renombran/eliminan listas y crean/editan/eliminan enlaces con nombre, descripción, plataforma y URL. Tipos de lista Colaboradores / Sitios de interés. Enlaces HTTPS con noopener noreferrer y sin HTML ejecutable. No se eliminan listas que aún contienen enlaces. Tablas club_directory_lists y club_directory_links.

API: /api/club/events, /api/club/events/:id y /api/club/events/:id/calendar.ics; /api/club/directory/lists y /links. Gestión solo administradores, validación de fechas/horas/URL y límite de peticiones. Nuevos eventos, cambios y enlaces generan avisos del club mediante el sistema push/campana existente; requiere suscripción del dispositivo para avisos externos.

Pruebas: API con SQLite real (permisos, persistencia, fechas imposibles/pasadas, horas, URL, borrado y no resurrección), medianoches Madrid verano/invierno, Chrome (día real y cambio de reloj, pulsación para crear evento, lectura pública, editar/eliminar, listas y redes, gestión privada y móvil). Texto solicitado cotejado con los 10 párrafos completos.
