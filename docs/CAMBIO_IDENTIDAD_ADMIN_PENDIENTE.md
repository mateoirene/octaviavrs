# Cambio de identidad administrativa autorizado

Cambio de D1 aplicado el 7 de noviembre de 2026 tras autorización expresa. Publicación del código pendiente de comprobación final.

Origen: mozos.raul@gmail.com
Destino: cluboctaviavrscat@gmail.com

## Estado

Cambios locales en autorización de altas, destinatario de revisión, contacto VAPID, documentación y destinatario documentado en futuras copias. No se cambia contraseña, ID, mecanismo de autenticación, diseño ni contenido.

Se utilizó exclusivamente la conexión existente guardada como secreto de GitHub Actions. Auditoría real: una cuenta de origen y ninguna de destino. Se actualizó solo email y se verificó el mismo ID y fecha de creación. No se modificaron contraseña, sesiones, cuentas externas, DNS ni alojamiento. Resend y remitente: no configurados; no se han enviado correos.

## Consulta de auditoría

En la consola oficial de D1 de la base octavia-club-mercadillo, comprobar el vínculo MARKET_DB y ejecutar únicamente:

```sql
SELECT id, email, created_at FROM market_admins
WHERE lower(email) IN ('mozos.raul@gmail.com','cluboctaviavrscat@gmail.com');
```

No seleccionar password_hash, salt ni tokens. Si el destino ya existe, no fusionar, borrar ni sustituir cuentas: revisar primero los dos registros. Si falta el origen, detenerse.

## Procedimiento autorizado y aplicado

Conservar el ID del registro origen, password_hash, salt, created_at, sesiones y suscripciones push. Actualizar solo email con control del ID, correo previo y ausencia del destino; exigir exactamente una fila modificada. Preparar reversión limitada al mismo ID antes de ejecutar. No crear administradores adicionales. No ejecutar scripts de inicialización ni restaurar copias antiguas.

Verificar primero en una base aislada y después, tras aprobación, en producción: sesión actual en móvil y ordenador, correo mostrado, acceso a panel y permisos, nuevo inicio con el correo del club y contraseña existente, rechazo del correo anterior. No cerrar las sesiones existentes antes de comprobar el nuevo acceso.

## Correo externo

Revisar Resend con el titular autorizado. El remitente de pruebas puede impedir enviar al nuevo destinatario. No cambiar cuenta, remitente, variables ni DNS sin autorización. No se ha enviado ningún correo de prueba.

## Alcance de exclusividad

Se sustituye la identidad de la cuenta indicada. No se eliminan ni alteran otros administradores que puedan existir sin inspección y autorización específicas. Las copias históricas conservan su contenido; no se reescribe el historial de Git ni se borran respaldos.

## Evidencia

Acción de cambio D1: https://github.com/mateoirene/octaviavrs/actions/runs/42374228353 (correcta). Pruebas locales: 134 superadas, incluido cambio de identidad con conservación de contraseña y dos sesiones. No se realizó un inicio de sesión real con contraseña en producción: no se dispone de ella y no se solicita por chat.
