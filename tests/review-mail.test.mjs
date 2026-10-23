import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { dispatchReviewMail, reviewMailStatus, reviewMessage } from '../server/review-mail.mjs';
import { groupByCategory } from '../dist/market-categories.mjs';
function fixture() {
  const raw = new DatabaseSync(':memory:'); raw.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  const listing = { id: 'test-listing', title: 'Llantas originales', category: 'Llantas y neumáticos', price: 150, seller: 'Socio', location: 'Barcelona' };
  raw.prepare("INSERT INTO market_listings(id,title,category,description,price,condition,compatibility,location,seller,contact_type,contact_value,contact_url,created_at,updated_at) VALUES(?,?,?,'Descripción de la pieza',?,'Usado','Octavia',?,?,'email','test@example.com','mailto:test@example.com',1,1)").run(listing.id, listing.title, listing.category, listing.price, listing.location, listing.seller);
  raw.prepare('INSERT INTO market_review_mail(listing_id,created_at) VALUES(?,1)').run(listing.id);
  const db = { prepare(sql) { const statement = raw.prepare(sql); let args = []; const api = { bind(...values) { args = values; return api; }, async first() { return statement.get(...args); }, async all() { return { results: statement.all(...args) }; }, async run() { return { meta: { changes: statement.run(...args).changes } }; } }; return api; } };
  return { db, raw, listing };
}
test('el aviso usa solo el destinatario autorizado y un enlace al anuncio que requiere acceso', () => {
  const mail = reviewMessage({ id: 'piece/1', title: 'Pieza\r\nCabecera falsa', category: 'Motor', price: 35, seller: 'Socio', location: 'Girona' }, {});
  assert.deepEqual(mail.to, ['mozos.raul@gmail.com']);
  assert.ok(!mail.subject.includes('\n')); assert.match(mail.text, /admin\.html\?anuncio=piece%2F1/);
  assert.match(mail.text, /iniciar sesión/); assert.equal(mail.html, undefined);
});
test('sin servicio configurado conserva el aviso pendiente sin enviar ni fingir éxito', async () => {
  const { db, raw, listing } = fixture();
  try {
    const result = await dispatchReviewMail(db, {}, listing.id, () => { throw new Error('No debe enviar'); });
    assert.equal(result.configured, false); assert.equal(raw.prepare('SELECT status FROM market_review_mail').get().status, 'queued');
    assert.equal((await reviewMailStatus(db, {})).queued, 1);
  } finally { raw.close(); }
});
test('confirma la aceptación del proveedor y evita reenvíos de avisos ya enviados', async () => {
  const { db, raw, listing } = fixture(); let calls = 0;
  try {
    const env = { RESEND_API_KEY: 'test-only', MARKET_FROM_EMAIL: 'Club <club@example.com>' };
    const fetcher = async (url, options) => { calls++; assert.equal(url, 'https://api.resend.com/emails'); assert.equal(options.headers['Idempotency-Key'], 'club-market-review-test-listing'); assert.deepEqual(JSON.parse(options.body).to, ['mozos.raul@gmail.com']); return new Response(JSON.stringify({ id: 'email-test' }), { status: 200 }); };
    assert.equal((await dispatchReviewMail(db, env, listing.id, fetcher)).sent, true);
    assert.equal((await dispatchReviewMail(db, env, listing.id, fetcher)).skipped, true); assert.equal(calls, 1);
    assert.equal(raw.prepare('SELECT status FROM market_review_mail').get().status, 'sent');
    assert.equal((await reviewMailStatus(db, env)).sent, 1);
  } finally { raw.close(); }
});
test('un fallo de envío queda registrado y se puede reintentar sin perder el anuncio', async () => {
  const { db, raw, listing } = fixture(); const env = { RESEND_API_KEY: 'test-only' };
  try {
    assert.equal((await dispatchReviewMail(db, env, listing.id, async () => new Response('{}', { status: 403 }))).sent, false);
    assert.equal(raw.prepare('SELECT status FROM market_review_mail').get().status, 'failed');
    assert.equal(raw.prepare('SELECT status FROM market_listings').get().status, 'pending');
    assert.equal((await reviewMailStatus(db, env)).failed, 1);
    assert.equal((await dispatchReviewMail(db, env, listing.id, async () => new Response('{"id":"accepted"}'))).sent, true);
  } finally { raw.close(); }
});
test('no avisa de un anuncio que ya está resuelto', async () => {
  const { db, raw, listing } = fixture();
  try {
    raw.prepare("UPDATE market_listings SET status='rejected'").run();
    const result = await dispatchReviewMail(db, { RESEND_API_KEY: 'test-only' }, listing.id, () => { throw new Error('No debe enviar'); });
    assert.equal(result.skipped, true); assert.equal(raw.prepare('SELECT status FROM market_review_mail').get().status, 'cancelled');
  } finally { raw.close(); }
});
test('agrupa y filtra anuncios por temática sin mezclar categorías', () => {
  const items = [{ id: '1', category: 'Motor' }, { id: '2', category: 'Interior' }, { id: '3', category: 'Motor' }];
  assert.deepEqual(groupByCategory(items).map(group => [group.category, group.items.length]), [['Motor', 2], ['Interior', 1]]);
  assert.deepEqual(groupByCategory(items, 'Interior')[0].items.map(item => item.id), ['2']);
  assert.deepEqual(groupByCategory(items, 'Exterior'), []);
});
