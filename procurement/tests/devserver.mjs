// Local development server: serves the app and imitates the parts of the Supabase API the app uses
// (password sign-in, PostgREST tables and RPC) on top of a local Postgres, through psql.
// Development only. It trusts the token it issues itself and accepts one shared password for every user.
// Usage: node procurement/tests/devserver.mjs [port]   (database: proc_dev on /tmp:5499, see tests/dev_db.sh)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.argv[2] || 8787);
const DB = process.env.PGDATABASE || 'proc_dev';
const DEV_PASSWORD = 'demo1234';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const lit = (v) => (v === null || v === undefined) ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw httpErr(400, 'PGRST100', `bad identifier ${s}`); return `"${s}"`; };
function httpErr(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }

function psql(sql) {
  return new Promise((resolve) => {
    const p = spawn('psql', ['-h', '/tmp', '-p', process.env.PGPORT || '5499', '-U', 'postgres', '-d', DB, '-qAtX', '-v', 'ON_ERROR_STOP=1']);
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ code, out, err }));
    p.stdin.end('\\set VERBOSITY verbose\n' + sql);
  });
}

// runs a statement as the signed-in user; the statement must return one json value
async function asUser(uid, sql) {
  const role = uid ? 'authenticated' : 'anon';
  const r = await psql(`begin;\nset local role ${role};\nset local request.jwt.claim.sub = ${lit(uid || '')};\n${sql};\ncommit;\n`);
  if (r.code !== 0) {
    const m = /ERROR:\s+([0-9A-Z]{5}):\s+([^\n]*)/.exec(r.err) || /ERROR:\s+([^\n]*)/.exec(r.err);
    const code = m && m.length === 3 ? m[1] : 'XX000';
    const message = m ? (m.length === 3 ? m[2] : m[1]) : r.err.trim();
    const status = code === '42501' ? 403 : code === '23505' ? 409 : code === 'P0002' ? 404 : code === '28000' ? 401 : 400;
    throw Object.assign(new Error(message), { status, code });
  }
  return r.out.trim() || 'null';
}

// ---------------------------------------------------------------- auth
const tokenFor = (user) => {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `dev.${payload}.sig`;
};
const uidFrom = (req) => {
  const h = req.headers.authorization || '';
  const t = h.replace(/^Bearer\s+/i, '');
  if (!t.startsWith('dev.')) return null;
  try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); return p.exp * 1000 > Date.now() ? p.sub : null; } catch { return null; }
};

async function auth(req, res, url, body) {
  const route = url.pathname.replace('/auth/v1/', '');
  if (route === 'token') {
    let user;
    if (url.searchParams.get('grant_type') === 'password') {
      if (body.password !== DEV_PASSWORD) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      const r = await psql(`select json_build_object('id', id, 'email', email) from auth.users where email = ${lit(String(body.email || '').toLowerCase())};`);
      if (!r.out.trim()) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      user = JSON.parse(r.out.trim());
    } else if (url.searchParams.get('grant_type') === 'refresh_token') {
      const [, id] = String(body.refresh_token || '').split(':');
      const r = await psql(`select json_build_object('id', id, 'email', email) from auth.users where id = ${lit(id)}::uuid;`);
      if (!r.out.trim()) return send(res, 400, { error: 'invalid_grant' });
      user = JSON.parse(r.out.trim());
    } else return send(res, 400, { error: 'unsupported_grant_type' });
    return send(res, 200, { access_token: tokenFor(user), token_type: 'bearer', expires_in: 3600, refresh_token: `dev:${user.id}`, user });
  }
  if (route === 'logout') return send(res, 204, null);
  if (route === 'user') {
    const uid = uidFrom(req);
    if (!uid) return send(res, 401, { message: 'not signed in' });
    if (req.method === 'PUT') return send(res, 200, { id: uid });
    const r = await psql(`select json_build_object('id', id, 'email', email) from auth.users where id = ${lit(uid)}::uuid;`);
    return send(res, 200, JSON.parse(r.out.trim() || 'null'));
  }
  if (route.startsWith('signup') || route.startsWith('recover')) return send(res, 400, { msg: 'Sign-up and password recovery are not available on the dev server' });
  return send(res, 404, { message: 'not found' });
}

// ---------------------------------------------------------------- PostgREST subset
const fnCache = new Map();
async function fnInfo(name) {
  if (fnCache.has(name)) return fnCache.get(name);
  const r = await psql(`select json_build_object('retset', p.proretset, 'args', coalesce((select json_agg(json_build_object('name', n, 'type', format_type(t, null)) order by i)
    from unnest(p.proargnames, p.proargtypes::oid[]) with ordinality x(n, t, i)), '[]'))
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = ${lit(name)} limit 1;`);
  if (!r.out.trim()) throw httpErr(404, 'PGRST202', `function ${name} not found`);
  const info = JSON.parse(r.out.trim());
  fnCache.set(name, info);
  return info;
}

async function rpc(uid, name, body) {
  const info = await fnInfo(name);
  const args = [];
  for (const [k, v] of Object.entries(body || {})) {
    const a = info.args.find((x) => x.name === k);
    if (!a) throw httpErr(400, 'PGRST202', `unknown argument ${k}`);
    let val;
    if (v === null || v === undefined) val = 'null';
    else if (a.type === 'jsonb' || a.type === 'json') val = `${lit(JSON.stringify(v))}::${a.type}`;
    else if (a.type.endsWith('[]')) val = `${lit('{' + (v || []).map((x) => '"' + String(x).replace(/"/g, '\\"') + '"').join(',') + '}')}::${a.type}`;
    else val = `${lit(v)}::${a.type}`;
    args.push(`${ident(k)} => ${val}`);
  }
  const call = `public.${ident(name)}(${args.join(', ')})`;
  const sql = info.retset ? `select coalesce(json_agg(t), '[]') from ${call} t` : `select to_json(${call})`;
  return asUser(uid, sql);
}

function parseFilters(params) {
  const where = [];
  const reserved = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);
  for (const [k, raw] of params) {
    if (reserved.has(k)) continue;
    if (k === 'or') { where.push('(' + splitTop(raw.slice(1, -1)).map(cond).join(' or ') + ')'); continue; }
    where.push(cond(`${k}.${raw}`));
  }
  return where;
}
function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; }
function cond(expr) {
  const m = /^([a-z_][a-z0-9_]*)\.(not\.)?(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs)\.(.*)$/s.exec(expr);
  if (!m) throw httpErr(400, 'PGRST100', `unsupported filter ${expr}`);
  const [, col, not, op, val] = m; const c = ident(col);
  let s;
  switch (op) {
    case 'eq': s = `${c} = ${lit(val)}`; break; case 'neq': s = `${c} <> ${lit(val)}`; break;
    case 'gt': s = `${c} > ${lit(val)}`; break; case 'gte': s = `${c} >= ${lit(val)}`; break;
    case 'lt': s = `${c} < ${lit(val)}`; break; case 'lte': s = `${c} <= ${lit(val)}`; break;
    case 'like': s = `${c}::text like ${lit(val.replace(/\*/g, '%'))}`; break; case 'ilike': s = `${c}::text ilike ${lit(val.replace(/\*/g, '%'))}`; break;
    case 'is': s = `${c} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : 'false'}`; break;
    case 'in': s = `${c}::text in (${splitTop(val.slice(1, -1)).map((x) => lit(x.replace(/^"|"$/g, ''))).join(',') || 'null'})`; break;
    case 'cs': s = `${c} @> ${lit(val)}`; break;
  }
  return not ? `not (${s})` : s;
}

async function table(req, res, uid, name, url, body) {
  const t = `public.${ident(name)}`;
  const p = url.searchParams;
  const where = parseFilters(p);
  const w = where.length ? ' where ' + where.join(' and ') : '';
  const prefer = req.headers.prefer || '';
  if (req.method === 'GET' || req.method === 'HEAD') {
    const cols = (p.get('select') || '*').split(',').map((c) => c.trim()).map((c) => (c === '*' ? '*' : ident(c))).join(', ');
    const order = p.get('order') ? ' order by ' + p.get('order').split(',').map((o) => {
      const [c, dir, nulls] = o.split('.'); return `${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}${nulls === 'nullslast' ? ' nulls last' : nulls === 'nullsfirst' ? ' nulls first' : ''}`;
    }).join(', ') : '';
    const lim = p.get('limit') ? ` limit ${Number(p.get('limit'))}` : '';
    const off = p.get('offset') ? ` offset ${Number(p.get('offset'))}` : '';
    const count = /count=exact/.test(prefer);
    const sql = `select json_build_object('rows', (select coalesce(json_agg(t), '[]') from (select ${cols} from ${t}${w}${order}${lim}${off}) t)${count ? `, 'count', (select count(*) from ${t}${w})` : ''})`;
    const r = JSON.parse(await asUser(uid, sql));
    const headers = {};
    const from = Number(p.get('offset') || 0);
    if (count) headers['Content-Range'] = `${from}-${from + r.rows.length - 1}/${r.count}`;
    return send(res, 200, r.rows, headers);
  }
  if (req.method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    const cols = [...new Set(rows.flatMap((x) => Object.keys(x)))].map(ident);
    const conflict = /resolution=merge-duplicates/.test(prefer) && p.get('on_conflict')
      ? ` on conflict (${p.get('on_conflict').split(',').map(ident).join(', ')}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}` : '';
    const sql = `with ins as (insert into ${t} (${cols.join(', ')}) select ${cols.join(', ')} from json_populate_recordset(null::${t}, ${lit(JSON.stringify(rows))}::json)${conflict} returning *) select coalesce(json_agg(ins), '[]') from ins`;
    const out = await asUser(uid, sql);
    return send(res, 201, /return=representation/.test(prefer) ? JSON.parse(out) : null);
  }
  if (req.method === 'PATCH') {
    if (!where.length) throw httpErr(400, 'PGRST100', 'update without filter');
    const sets = Object.keys(body).map((k) => `${ident(k)} = (json_populate_record(null::${t}, ${lit(JSON.stringify(body))}::json)).${ident(k)}`);
    const sql = `with up as (update ${t} set ${sets.join(', ')}${w} returning *) select coalesce(json_agg(up), '[]') from up`;
    const out = await asUser(uid, sql);
    return send(res, 200, /return=representation/.test(prefer) ? JSON.parse(out) : null);
  }
  if (req.method === 'DELETE') {
    if (!where.length) throw httpErr(400, 'PGRST100', 'delete without filter');
    const out = await asUser(uid, `with d as (delete from ${t}${w} returning *) select coalesce(json_agg(d), '[]') from d`);
    return send(res, 200, /return=representation/.test(prefer) ? JSON.parse(out) : null);
  }
  return send(res, 405, { message: 'method not allowed' });
}

// ---------------------------------------------------------------- storage (files kept on disk, dev only)
const STORE = process.env.DEV_STORAGE || '/var/tmp/proc-dev-storage';
const signed = new Map();
async function storageRoute(req, res, url) {
  const uid = uidFrom(req);
  const m = /^\/storage\/v1\/object\/(sign\/)?attachments\/(.+)$/.exec(url.pathname);
  const dl = /^\/storage\/v1\/object\/dev-signed\/([a-f0-9-]+)$/.exec(url.pathname);
  if (dl) {
    const p = signed.get(dl[1]);
    if (!p || p.exp < Date.now()) return send(res, 404, { message: 'expired' });
    const data = await readFile(path.join(STORE, p.path));
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(p.path.split('/').pop())}` });
    return res.end(data);
  }
  if (!m || !uid) return send(res, 403, { message: 'not allowed' });
  const rel = decodeURIComponent(m[2]);
  if (rel.includes('..')) return send(res, 400, { message: 'bad path' });
  // same rule as the Supabase policy: the first folder is an organization the user belongs to
  const ok = JSON.parse(await asUser(uid, `select to_json(${lit(rel.split('/')[0])}::uuid in (select public.my_orgs()))`));
  if (!ok) return send(res, 403, { message: 'not a member of this organization' });
  if (m[1]) {
    const token = crypto.randomUUID();
    signed.set(token, { path: rel, exp: Date.now() + 120000 });
    return send(res, 200, { signedURL: `/object/dev-signed/${token}` });
  }
  const chunks = []; for await (const c of req) chunks.push(c);
  const file = path.join(STORE, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.concat(chunks), { flag: 'wx' }).catch(() => { throw Object.assign(new Error('exists'), { status: 409 }); });
  return send(res, 200, { Key: `attachments/${rel}` });
}

// ---------------------------------------------------------------- http
function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...headers });
  res.end(data === null ? '' : JSON.stringify(data));
}

async function serveStatic(res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/procurement/';
  // the app reads its Supabase address from config.js; here it points at this server
  if (p === '/procurement/js/config.js') {
    res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' });
    return res.end(`export const CONFIG = { url: location.origin, key: 'dev-publishable-key', env: 'dev' };\n`);
  }
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) return send(res, 403, { message: 'forbidden' });
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); } catch { return send(res, 404, { message: 'not found' }); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { send(res, 404, { message: 'not found' }); }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,PUT,OPTIONS' });
    return res.end();
  }
  if (url.pathname.startsWith('/storage/v1/')) { try { return await storageRoute(req, res, url); } catch (e) { return send(res, e.status || 500, { message: e.message }); } }
  let body = null;
  if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const s = Buffer.concat(chunks).toString(); body = s ? JSON.parse(s) : {};
  }
  try {
    if (url.pathname.startsWith('/auth/v1/')) return await auth(req, res, url, body || {});
    if (url.pathname.startsWith('/rest/v1/')) {
      const uid = uidFrom(req);
      const rest = url.pathname.replace('/rest/v1/', '');
      if (rest.startsWith('rpc/')) return send(res, 200, JSON.parse(await rpc(uid, rest.slice(4), body)));
      return await table(req, res, uid, rest, url, body);
    }
    return await serveStatic(res, url);
  } catch (e) {
    return send(res, e.status || 500, { code: e.code || 'XX000', message: e.message, details: null, hint: null });
  }
}).listen(PORT, () => console.log(`dev server on http://localhost:${PORT}/procurement/ (db ${DB}, password ${DEV_PASSWORD})`));
