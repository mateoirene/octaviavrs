import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { handleMarketRequest } from '../server/market.mjs';
const origin = 'https://octaviaap.pages.dev';
function fixture(stamp) {
  const raw = new DatabaseSync(':memory:');
  raw.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  raw.prepare('INSERT INTO market_admins VALUES(?,?,?,?,?)').run('admin', 'admin@example.com', 'unused', 'salt', stamp);
  raw.prepare('INSERT INTO market_sessions VALUES(?,?,?)').run(createHash('sha256').update('delete-test-session').digest('hex'), 'admin', stamp + 100000);
  const prepare = sql => { const statement = raw.prepare(sql); let args = []; const api = {
    bind(...values) { args = values; return api; },
    async first() { return statement.get(...args) || null; },
    async all() { return { results: statement.all(...args) }; },
    async run() { return { meta: { changes: Number(statement.run(...args).changes) } }; },
  }; return api; };
  function add(id, status, updatedAt) {
    raw.prepare("INSERT INTO market_listings(id,title,category,description,price,condition,compatibility,location,seller,contact_type,contact_value,contact_url,status,created_at,updated_at) VALUES(?,?,'Motor','Descripción de la pieza',100,'Usado','Octavia','Girona','Socio','email','seller@example.com','mailto:seller@example.com',?,?,?)").run(id, 'Pieza ' + id, status, updatedAt - 100, updatedAt);
    raw.prepare("INSERT INTO market_photos VALUES(?,?,'image/jpeg',?,0)").run('photo-' + id, id, Buffer.from([255,216,255,0]));
    raw.prepare("INSERT INTO market_review_mail(listing_id,created_at) VALUES(?,?)").run(id, updatedAt);
    raw.prepare("INSERT INTO market_reviews(listing_id,old_status,new_status,actor,note,created_at) VALUES(?,'pending',?,'admin','Nota privada',?)").run(id, status, updatedAt);
  }
  async function call(id, { body, auth = true, source = origin, list = false } = {}) {
    const path = list ? '/api/admin/listings?status=sold' : '/api/admin/listings/' + id;
    return handleMarketRequest(new Request(origin + path, {
      method: body ? 'POST' : 'GET', headers: { origin: source, ...(auth ? { cookie: 'club_session=delete-test-session' } : {}), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }), { MARKET_DB: { prepare } });
  }
  return { raw, add, call };
}
test('bloquea el borrado antes de 24 horas y lo habilita exactamente al cumplirse', async () => {
  const original = Date.now; let stamp = 1800000000; Date.now = () => stamp * 1000;
  const { raw, add, call } = fixture(stamp);
  try {
    add('sale', 'sold', stamp - 86399); add('other', 'sold', stamp - 90000);
    let items = await (await call('', { list: true })).json();
    assert.equal(items.find(item => item.id === 'sale').canDelete, false);
    assert.equal(items.find(item => item.id === 'sale').deleteWaitSeconds, 1);
    const blocked = await call('sale', { body: { action: 'delete', confirm: true, soldAt: 0 } });
    assert.equal(blocked.status, 409); assert.match((await blocked.json()).error, /24 horas/);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM market_listings').get().n, 2);
    stamp++;
    items = await (await call('', { list: true })).json();
    assert.equal(items.find(item => item.id === 'sale').canDelete, true);
    assert.equal((await call('sale', { body: { action: 'delete' } })).status, 400);
    const removed = await call('sale', { body: { action: 'delete', confirm: true } });
    assert.equal(removed.status, 200); assert.equal((await removed.json()).deleted, true);
    for (const [table, column] of [['market_listings','id'],['market_photos','listing_id'],['market_review_mail','listing_id'],['market_reviews','listing_id']]) {
      assert.equal(raw.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${column}=?`).get('sale').n, 0, table + ' eliminado');
    }
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM market_listings').get().n, 1, 'Conserva los demás anuncios');
    assert.equal((await call('sale', { body: { action: 'delete', confirm: true } })).status, 404);
  } finally { raw.close(); Date.now = original; }
});
test('solo un administrador puede borrar vendidos; otros estados y otros orígenes se rechazan', async () => {
  const original = Date.now; const stamp = 1800000000; Date.now = () => stamp * 1000;
  const { raw, add, call } = fixture(stamp);
  try {
    for (const state of ['pending','approved','rejected','sold']) add(state, state, stamp - 90000);
    const body = { action: 'delete', confirm: true };
    assert.equal((await call('sold', { body, auth: false })).status, 401);
    assert.equal((await call('sold', { body, source: 'https://other.example' })).status, 403);
    for (const state of ['pending','approved','rejected']) assert.equal((await call(state, { body })).status, 409);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM market_listings').get().n, 4);
  } finally { raw.close(); Date.now = original; }
});
