export const REVIEW_RECIPIENT = 'mozos.raul@gmail.com';
export const REVIEW_BASE = 'https://octaviaap.pages.dev';
export function mailConfigured(env) { return typeof env.RESEND_API_KEY === 'string' && env.RESEND_API_KEY.trim().length > 0; }
export function reviewMessage(listing, env) {
  const subjectTitle = listing.title.replace(/[\r\n]/g, ' ').slice(0, 90);
  return {
    from: env.MARKET_FROM_EMAIL || 'Club Octavia <onboarding@resend.dev>',
    to: [REVIEW_RECIPIENT],
    subject: `Revisar anuncio del mercadillo: ${subjectTitle}`,
    text: `Hola Raúl,\n\nHay un anuncio nuevo pendiente de tu autorización.\n\nPieza: ${listing.title}\nTemática: ${listing.category}\nPrecio: ${listing.price} €\nVendedor: ${listing.seller}\nLocalidad: ${listing.location}\n\nEntra en el panel privado para revisar las fotos y los datos, y aprobar o rechazar su publicación:\n${REVIEW_BASE}/admin.html?anuncio=${encodeURIComponent(listing.id)}\n\nEl anuncio seguirá oculto hasta que lo apruebes. Para autorizarlo tendrás que iniciar sesión; este correo no publica nada automáticamente.\n\nClub Octavia VRS Cataluña`,
  };
}
export async function dispatchReviewMail(db, env, id, fetcher = fetch) {
  if (!mailConfigured(env)) return { sent: false, configured: false };
  const listing = await db.prepare('SELECT l.*,m.status AS mail_status FROM market_listings l JOIN market_review_mail m ON m.listing_id=l.id WHERE l.id=?').bind(id).first();
  if (!listing || listing.mail_status === 'sent') return { sent: false, skipped: true };
  if (listing.status !== 'pending') {
    await db.prepare("UPDATE market_review_mail SET status='cancelled',last_error='' WHERE listing_id=? AND status<>'sent'").bind(id).run();
    return { sent: false, skipped: true };
  }
  let error = 'No se ha podido contactar con el servicio de correo.';
  for (let attempt = 0; attempt < 3; attempt++) {
    await db.prepare('UPDATE market_review_mail SET attempts=attempts+1 WHERE listing_id=?').bind(id).run();
    try {
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `club-market-review-${id}` },
        body: JSON.stringify(reviewMessage(listing, env)), signal: AbortSignal.timeout(7000),
      });
      if (response.ok) {
        const body = await response.json();
        if (typeof body.id === 'string' && body.id) {
          await db.prepare("UPDATE market_review_mail SET status='sent',sent_at=?,last_error='' WHERE listing_id=?").bind(Math.floor(Date.now()/1000),id).run();
          return { sent: true };
        }
      }
      error = `El servicio de correo no aceptó el aviso (HTTP ${response.status}).`;
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch { error = 'No se ha podido contactar con el servicio de correo.'; }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, attempt ? 2000 : 1000));
  }
  await db.prepare("UPDATE market_review_mail SET status='failed',last_error=? WHERE listing_id=? AND status<>'sent'").bind(error,id).run();
  return { sent: false, configured: true };
}
export async function reviewMailStatus(db, env) {
  const rows = (await db.prepare("SELECT m.status,COUNT(*) AS count FROM market_review_mail m JOIN market_listings l ON l.id=m.listing_id WHERE l.status='pending' GROUP BY m.status").all()).results;
  const counts = Object.fromEntries(rows.map(row => [row.status, row.count]));
  return { configured: mailConfigured(env), recipient: REVIEW_RECIPIENT, queued: counts.queued || 0, failed: counts.failed || 0, sent: counts.sent || 0 };
}
