import { appendFileSync } from 'node:fs';

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const missing = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter(name => !process.env[name]);
const summary = text => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n'); };

try {
  if (token) {
    const verification = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(30000),
    });
    if (!verification.ok) throw new Error('No se ha podido validar el token: HTTP ' + verification.status + '.');
    const verified = await verification.json();
    if (!verified.success || verified.result?.status !== 'active') throw new Error('Cloudflare no confirma un token activo. Revisa el secreto CLOUDFLARE_API_TOKEN.');
    console.log('CLOUDFLARE_API_TOKEN está guardado y Cloudflare confirma que está activo.');
    summary('Token de Cloudflare: activo.');
  }
  if (missing.length) {
    console.log('Configuración pendiente. Falta guardar en GitHub: ' + missing.join(', ') + '.');
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'ready=false\n');
    summary('## Publicación pendiente\nFalta guardar en GitHub: ' + missing.join(', ') + '. La web online no se ha actualizado.');
    process.exit(0);
  }
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error('CLOUDFLARE_ACCOUNT_ID no tiene el formato esperado.');
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account + '/pages/projects/octaviaap', {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Cloudflare ha respondido HTTP ' + response.status + '. Comprueba la cuenta y los permisos de Pages.');
  const data = await response.json();
  const project = data.result;
  if (!data.success || project?.name !== 'octaviaap' || project.subdomain !== 'octaviaap.pages.dev') throw new Error('No se ha confirmado el proyecto octaviaap.pages.dev. No se publicará.');
  const branch = project.production_branch;
  if (typeof branch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(branch)) throw new Error('No se ha confirmado la rama de producción. No se publicará.');
  if (!process.env.GITHUB_OUTPUT) throw new Error('Este script debe ejecutarse dentro de GitHub Actions.');
  appendFileSync(process.env.GITHUB_OUTPUT, 'branch=' + branch + '\nready=true\n');
  console.log('Acceso confirmado al proyecto octaviaap.pages.dev.');
  summary('Acceso confirmado al proyecto octaviaap.pages.dev.');
} catch (error) {
  // Imprimir solo mensajes controlados, sin credenciales ni respuestas completas.
  console.error(error instanceof Error ? error.message : 'No se ha podido comprobar el acceso.');
  process.exit(1);
}
