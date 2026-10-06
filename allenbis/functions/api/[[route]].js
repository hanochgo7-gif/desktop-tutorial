/*
 * Allenbis order API (Cloudflare Pages Function, database: D1 bound as DB).
 *   POST /api/orders                 new order            -> { id, token, myCode, benefit }
 *   GET  /api/orders/:id?t=token      order status (customer)
 *   GET  /api/credit?code=            "bring a friend" credit for the customer's own code
 *   GET  /api/stock                   sold-out items and price changes (public)
 *   Store screen (header x-store-pin = STORE_PIN secret):
 *   GET  /api/admin/orders?since=     recent orders
 *   POST /api/admin/orders/:id        { status }
 *   GET  /api/admin/stock  ·  POST /api/admin/stock { id, oos, price }
 */
const STATUSES = ['received', 'accepted', 'collecting', 'on_the_way', 'delivered', 'cancelled'];
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const bad = (msg, status = 400) => json({ error: msg }, status);
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randCode = n => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => ALPHA[x % ALPHA.length]).join(''); };
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const phoneOf = v => str(v, 20).replace(/[\s-]/g, '');
const PHONE = /^(05\d{8}|0[2-489]\d{7}|07\d{8})$/;

async function pinOk(request, env) {
  if (!env.STORE_PIN) return false;
  const got = request.headers.get('x-store-pin') || '';
  const a = new TextEncoder().encode(got), b = new TextEncoder().encode(env.STORE_PIN);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function createOrder(request, env) {
  let body;
  try { body = await request.json(); } catch { return bad('bad json'); }
  const phone = phoneOf(body.phone);
  const name = str(body.name, 60), street = str(body.street, 120);
  if (name.length < 2 || !PHONE.test(phone) || street.length < 3) return bad('missing details');
  const lines = Array.isArray(body.lines) ? body.lines.filter(l => Array.isArray(l) && /^p\d{1,4}$/.test(l[0]) && Number.isInteger(l[1]) && l[1] > 0 && l[1] < 100).slice(0, 80) : [];
  if (!lines.length) return bad('empty order');
  const total = Number.isInteger(body.total) && body.total >= 0 && body.total < 10_000_000 ? body.total : 0;
  const items = lines.reduce((n, l) => n + l[1], 0);
  const now = Date.now();
  const db = env.DB;
  const previous = await db.prepare('SELECT COUNT(*) AS n FROM orders WHERE phone = ? AND status != ?').bind(phone, 'cancelled').first('n');

  // The single money benefit the customer chose; the server checks it may really be used
  let benefit = null, benefitAmount = 0, refCode = null;
  const want = body.benefit && typeof body.benefit === 'object' ? body.benefit : null;
  if (want && Number.isInteger(want.amount) && want.amount > 0) {
    if (want.kind === 'ref') {
      const ref = await db.prepare('SELECT code, phone FROM referrers WHERE code = ?').bind(str(want.code, 12).toUpperCase()).first();
      const reward = +env.REF_REWARD || 2500;
      if (ref && ref.phone !== phone && !previous && total + want.amount >= (+env.REF_MIN || 0)) { benefit = 'ref'; benefitAmount = Math.min(want.amount, reward); refCode = ref.code; }
    } else if (want.kind === 'credit') {
      const me = await db.prepare('SELECT credit FROM referrers WHERE code = ? AND phone = ?').bind(str(want.code, 12).toUpperCase(), phone).first();
      if (me && me.credit > 0) { benefit = 'credit'; benefitAmount = Math.min(want.amount, me.credit); }
    } else if (want.kind === 'welcome' && !previous && total + want.amount >= (+env.WELCOME_MIN || 0)) {
      benefit = 'welcome'; benefitAmount = Math.min(want.amount, +env.WELCOME_AMOUNT || 2000);
    }
  }
  // whatever part of the discount the customer asked for that isn't allowed goes back into the total
  const rejected = want && Number.isInteger(want.amount) && want.amount > 0 ? want.amount - benefitAmount : 0;
  const id = randCode(5), token = randCode(16);
  const stmts = [db.prepare(`INSERT INTO orders (id, token, created_at, updated_at, status, name, phone, street, apt, note, pay, lang, items, total, lines, summary, benefit, benefit_amount, ref_code)
    VALUES (?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, token, now, now, name, phone, street, str(body.apt, 60), str(body.note, 200), str(body.pay, 30), body.lang === 'en' ? 'en' : 'he',
    items, total + rejected, JSON.stringify(lines), str(body.summary, 4000), benefit, benefitAmount, refCode)];
  if (benefit === 'credit') stmts.push(db.prepare('UPDATE referrers SET credit = MAX(credit - ?, 0) WHERE code = ?').bind(benefitAmount, str(want.code, 12).toUpperCase()));
  await db.batch(stmts);

  // every customer gets their own "bring a friend" code
  let mine = await db.prepare('SELECT code FROM referrers WHERE phone = ?').bind(phone).first('code');
  if (!mine) { mine = randCode(6); await db.prepare('INSERT INTO referrers (code, phone, created_at) VALUES (?, ?, ?)').bind(mine, phone, now).run(); }
  return json({ id, token, myCode: mine, benefit, benefitAmount, rejected, total: total + rejected }, 201);
}

async function orderStatus(id, url, env) {
  const row = await env.DB.prepare('SELECT id, status, created_at, updated_at, token FROM orders WHERE id = ?').bind(id).first();
  if (!row || row.token !== url.searchParams.get('t')) return bad('not found', 404);
  return json({ id: row.id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
}

async function setStatus(id, request, env) {
  let body;
  try { body = await request.json(); } catch { return bad('bad json'); }
  if (!STATUSES.includes(body.status)) return bad('bad status');
  const db = env.DB;
  const order = await db.prepare('SELECT id, ref_code, ref_paid FROM orders WHERE id = ?').bind(id).first();
  if (!order) return bad('not found', 404);
  const stmts = [db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, Date.now(), id)];
  // the friend who referred this first order earns their credit once it is delivered
  if (body.status === 'delivered' && order.ref_code && !order.ref_paid) {
    const reward = +env.REF_REWARD || 2500;
    stmts.push(db.prepare('UPDATE referrers SET credit = credit + ?, earned = earned + ? WHERE code = ?').bind(reward, reward, order.ref_code));
    stmts.push(db.prepare('UPDATE orders SET ref_paid = 1 WHERE id = ?').bind(id));
  }
  await db.batch(stmts);
  return json({ ok: true });
}

export async function onRequest({ request, env }) {
  if (!env.DB) return bad('order system not configured', 503);
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const m = request.method;
  try {
    if (parts[0] === 'orders' && parts.length === 1 && m === 'POST') return await createOrder(request, env);
    if (parts[0] === 'orders' && parts.length === 2 && m === 'GET') return await orderStatus(parts[1], url, env);
    if (parts[0] === 'credit' && m === 'GET') {
      const row = await env.DB.prepare('SELECT credit FROM referrers WHERE code = ?').bind(str(url.searchParams.get('code') || '', 12).toUpperCase()).first();
      return json({ credit: row ? row.credit : 0 });
    }
    if (parts[0] === 'stock' && m === 'GET') {
      const { results } = await env.DB.prepare('SELECT id, oos, price FROM stock').all();
      return json(Object.fromEntries(results.map(r => [r.id, { oos: !!r.oos, price: r.price }])), 200, { 'cache-control': 'public, max-age=30' });
    }
    if (parts[0] === 'admin') {
      if (!env.STORE_PIN) return bad('STORE_PIN not set', 503);
      if (!(await pinOk(request, env))) { await new Promise(r => setTimeout(r, 800)); return bad('wrong pin', 401); }
      if (parts[1] === 'orders' && parts.length === 2 && m === 'GET') {
        const since = +url.searchParams.get('since') || Date.now() - 2 * 864e5;
        const { results } = await env.DB.prepare('SELECT * FROM orders WHERE created_at >= ? ORDER BY created_at DESC LIMIT 200').bind(since).all();
        return json(results.map(({ token, ...o }) => ({ ...o, lines: JSON.parse(o.lines || '[]') })));
      }
      if (parts[1] === 'orders' && parts.length === 3 && m === 'POST') return await setStatus(parts[2], request, env);
      if (parts[1] === 'stock' && m === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, oos, price FROM stock').all();
        return json(Object.fromEntries(results.map(r => [r.id, { oos: !!r.oos, price: r.price }])));
      }
      if (parts[1] === 'stock' && m === 'POST') {
        let b; try { b = await request.json(); } catch { return bad('bad json'); }
        if (!/^p\d{1,4}$/.test(b.id || '')) return bad('bad id');
        const price = Number.isInteger(b.price) && b.price > 0 && b.price < 10_000_000 ? b.price : null;
        if (!b.oos && price === null) await env.DB.prepare('DELETE FROM stock WHERE id = ?').bind(b.id).run();
        else await env.DB.prepare('INSERT INTO stock (id, oos, price, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET oos = excluded.oos, price = excluded.price, updated_at = excluded.updated_at')
          .bind(b.id, b.oos ? 1 : 0, price, Date.now()).run();
        return json({ ok: true });
      }
    }
    return bad('not found', 404);
  } catch (e) {
    return bad('server error', 500);
  }
}
