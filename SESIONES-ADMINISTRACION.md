# Sesiones de administración

La administración permite mantener sesiones simultáneas en el móvil y en el ordenador. Cada navegador recibe un token distinto y cerrar sesión elimina solamente el token del dispositivo actual.

Las sesiones persistentes duran hasta 400 días, el máximo práctico admitido por los navegadores actuales, y se renuevan al comprobar el acceso desde el panel de administración. La cookie conserva `HttpOnly`, `Secure` y `SameSite=Strict`.

No requiere migraciones de D1. Borrar las cookies, usar navegación privada o limpiar los datos del navegador seguirá cerrando la sesión de ese dispositivo.
