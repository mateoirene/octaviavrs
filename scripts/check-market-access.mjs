const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) throw new Error('Falta la configuración de Cloudflare del flujo de publicación.');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database?per_page=1`, {
  headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000),
});
if (response.status === 401 || response.status === 403) {
  console.error('MERCADILLO_D1_PERMISSION: El token actual publica Pages, pero no permite acceder a D1. Añadir Cuenta > D1 > Editar en ese mismo token, limitado a esta cuenta. No compartir ni sustituir la clave.');
  process.exit(1);
}
if (!response.ok) throw new Error('No se pudo comprobar el almacenamiento: HTTP ' + response.status);
const body = await response.json();
if (!body.success) throw new Error('Cloudflare no confirmó el acceso a D1.');
console.log('MERCADILLO_D1_READY: acceso al almacenamiento confirmado. No se han creado ni modificado recursos.');
