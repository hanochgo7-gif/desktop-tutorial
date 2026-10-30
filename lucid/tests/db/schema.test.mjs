// Runs the Supabase migrations on PGlite (Postgres in WASM) with a stub of Supabase's auth schema,
// then checks row-level security, the age gate, export and account deletion as real roles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const year = new Date().getFullYear();

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  for (const f of readdirSync(new URL('../../supabase/migrations/', import.meta.url)).sort()) {
    await db.exec(readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  }
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');`);
  return db;
}
// Run statements as a given role/user inside a transaction so settings don't leak.
async function as(db, role, uid, sql, params = []) {
  await db.exec(`begin; set local role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', true);`);
  try { const r = await db.query(sql, params); await db.exec('commit'); return r; }
  catch (e) { await db.exec('rollback'); throw e; }
}

test('age gate, minors and RLS on profiles', async () => {
  const db = await setup();
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_profiles (id, birth_year) values ($1, $2)`, [A, year - 14]), /16 and over/);
  await as(db, 'authenticated', A, `insert into lucid_profiles (id, birth_year, marketing_opt_in) values ($1, $2, true)`, [A, year - 17]);
  const p = await as(db, 'authenticated', A, `select marketing_opt_in from lucid_profiles`);
  assert.equal(p.rows[0].marketing_opt_in, false, 'a 17-year-old cannot be opted in to marketing');
  await assert.rejects(as(db, 'authenticated', B, `insert into lucid_profiles (id, birth_year) values ($1, $2)`, [A, year - 30]), /row-level security|duplicate/);
  const seenByB = await as(db, 'authenticated', B, `select * from lucid_profiles`);
  assert.equal(seenByB.rows.length, 0, 'B cannot read A');
  await assert.rejects(as(db, 'anon', null, `select * from lucid_profiles`), /permission denied/);
});

test('records are private, stamped by the server and size-limited', async () => {
  const db = await setup();
  await as(db, 'authenticated', A, `insert into lucid_records (coll, id, data) values ('progress', 'pa1-05', '{"score":0.9}')`);
  const r = await as(db, 'authenticated', A, `select user_id, updated_at from lucid_records`);
  assert.equal(r.rows[0].user_id, A, 'user_id defaults to the caller');
  assert.ok(r.rows[0].updated_at instanceof Date);
  assert.equal((await as(db, 'authenticated', B, `select * from lucid_records`)).rows.length, 0, 'B cannot read A');
  await assert.rejects(as(db, 'authenticated', B, `insert into lucid_records (user_id, coll, id, data) values ($1, 'progress', 'x', '{}')`, [A]), /row-level security/);
  const upd = await as(db, 'authenticated', B, `update lucid_records set data = '{"score":0}' where user_id = $1`, [A]);
  assert.equal(upd.affectedRows ?? 0, 0, 'B cannot modify A');
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_records (coll, id, data) values ('secrets', 'x', '{}')`), /check constraint/);
  const big = JSON.stringify({ t: 'x'.repeat(70000) });
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_records (coll, id, data) values ('writing', 'big', $1::jsonb)`, [big]), /check constraint/);
});

test('AI usage is read-only for learners', async () => {
  const db = await setup();
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_ai_usage (user_id, route) values ($1, 'tutor_turn')`, [A]), /permission denied|row-level security/);
  await as(db, 'service_role', null, `insert into lucid_ai_usage (user_id, route, units) values ($1, 'tutor_turn', 1), ($2, 'tutor_turn', 1)`, [A, B]);
  assert.equal((await as(db, 'authenticated', A, `select * from lucid_ai_usage`)).rows.length, 1, 'A sees only own usage');
});

test('export returns only the caller; delete removes everything', async () => {
  const db = await setup();
  for (const [u, n] of [[A, 3], [B, 2]]) {
    await as(db, 'authenticated', u, `insert into lucid_profiles (id, birth_year) values ($1, $2)`, [u, year - 25]);
    for (let i = 0; i < n; i++) await as(db, 'authenticated', u, `insert into lucid_records (coll, id, data) values ('attempts', $1, '{}')`, [`a${i}`]);
  }
  const ex = await as(db, 'authenticated', A, `select lucid_export() as e`);
  assert.equal(ex.rows[0].e.profile.id, A);
  assert.equal(ex.rows[0].e.records.length, 3);
  await assert.rejects(as(db, 'anon', null, `select lucid_delete_account()`), /permission denied/);
  await as(db, 'authenticated', A, `select lucid_delete_account()`);
  const left = await db.query(`select (select count(*) from auth.users where id = $1) u, (select count(*) from lucid_records where user_id = $1) r, (select count(*) from lucid_profiles where id = $1) p`, [A]);
  assert.deepEqual([Number(left.rows[0].u), Number(left.rows[0].r), Number(left.rows[0].p)], [0, 0, 0]);
  const bLeft = await db.query(`select count(*) n from lucid_records where user_id = $1`, [B]);
  assert.equal(Number(bLeft.rows[0].n), 2, 'other users untouched');
});
