# Cumpleaños de los pilotos — 26 de octubre de 2026

Campo opcional de fecha en la ficha del garaje (día/mes/año). Se guarda en garage_birthdays, tabla complementaria con clave foránea y borrado en cascada, sin modificar fichas existentes ni inventar fechas. Se valida la fecha real entre 1900 y hoy en Europe/Madrid. Las fichas enviadas por miembros mantienen la revisión habitual: ni la ficha, ni su cumpleaños se publican hasta ser aprobadas.

Administración puede ver, editar o retirar la fecha completa desde la ficha. El público solo recibe día y mes y ve Cumpleaños: dd/mm. El año no se expone en la ficha pública, los eventos ni las notificaciones. Clientes antiguos que no envían el nuevo campo conservan la fecha existente; un campo explícitamente vacío la retira.

El calendario deriva los cumpleaños de las fichas aprobadas, mostrando Cumpleaños de [piloto] como evento de todo el día cada año. Cambiar nombre o fecha o eliminar la ficha actualiza la próxima lectura sin eventos duplicados o huérfanos. Las entradas se gestionan desde la ficha, no como quedadas manuales. La navegación anual materializa la fecha del año visitado. El 29/02 se celebra el 28/02 en años no bisiestos, explicado junto al campo. Las próximas quedadas siguen excluyendo cumpleaños.

El día del cumpleaños según Europe/Madrid, /api/club/notifications devuelve el aviso de hoy con identificador anual. La campana lo muestra como novedad y un banner visible bajo la cabecera felicita al piloto en todas las páginas. Las marcas de leído funcionan como siempre; al año siguiente el identificador es nuevo. Se actualiza al entrar, volver a la pestaña y cada minuto mientras está visible. No se crean correos, SMS ni nuevas suscripciones push para esta función.

Pruebas: fecha y años bisiestos, cambio de día de Madrid, privacidad y moderación, aprobación, edición, compatibilidad con formularios antiguos, retirada y borrado en cascada. Chrome prueba envío de fecha, revisión, recuperación en edición privada, ausencia del año en público, calendario de hoy y aviso en la página y campana. Los datos de comprobación son SQLite efímero, nunca miembros ficticios en producción.
