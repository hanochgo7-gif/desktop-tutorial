// Runs the Supabase migrations on PGlite (Postgres in WASM) with a stub of Supabase's auth schema,
// then checks row-level security, the age gate, quotas, AI metering, export and account deletion as real roles.
// PGlite has a single connection, so these tests check the logic of the locking code paths, not real
// concurrency (the edge-function tests cover parallel requests against an atomic ledger).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const year = new Date().getFullYear();

async function setup() {
  const db = new PGlite();
  // Supabase grants everything on new tables, sequences and functions in public to these roles by default;
  // the migrations must take back what learners should not have.
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
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
const addProfile = (db, u) => as(db, 'authenticated', u, `insert into lucid_profiles (id, birth_year) values ($1, $2)`, [u, year - 25]);

test('migrations can be applied twice', async () => {
  const db = await setup();
  for (const f of readdirSync(new URL('../../supabase/migrations/', import.meta.url)).sort()) {
    await db.exec(readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  }
});

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
  await assert.rejects(as(db, 'authenticated', A, `update lucid_profiles set goals = array[repeat('x', 641)]`), /check constraint/, 'goals text is bounded');
  await as(db, 'authenticated', A, `update lucid_profiles set goals = array['work', 'travel', 'exams']`);
});

test('records need a profile: a refused or missing profile stores nothing (S-05)', async () => {
  const db = await setup();
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_profiles (id, birth_year) values ($1, $2)`, [A, year - 13]), /16 and over/);
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_records (coll, id, data) values ('progress', 'pa1-05', '{}')`), /row-level security/);
  assert.equal(Number((await db.query(`select count(*) n from lucid_records`)).rows[0].n), 0);
  await addProfile(db, A);
  await as(db, 'authenticated', A, `insert into lucid_records (coll, id, data) values ('progress', 'pa1-05', '{}')`);
  assert.equal((await as(db, 'authenticated', A, `select * from lucid_records`)).rows.length, 1);
});

test('records are private, stamped by the server and size-limited', async () => {
  const db = await setup();
  await addProfile(db, A);
  await addProfile(db, B);
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

test('per-account storage quota: upserts count once, growth past the limit is refused, shrinking is not (S-07)', async () => {
  const db = await setup();
  await db.exec(`create or replace function public.lucid_storage_limits(out max_records int, out max_bytes bigint)
    language sql immutable set search_path = '' as $$ select 3, 400::bigint $$;`);
  await addProfile(db, A);
  await addProfile(db, B);
  // The client pushes with an upsert (PostgREST merge-duplicates).
  const put = (u, id, data) => as(db, 'authenticated', u,
    `insert into lucid_records (coll, id, data) values ('attempts', $1, $2::jsonb) on conflict (user_id, coll, id) do update set data = excluded.data`,
    [id, JSON.stringify(data)]);
  const usage = async (u) => (await db.query(`select record_count, byte_count from lucid_storage where user_id = $1`, [u])).rows[0];
  const actual = async (u) => (await db.query(`select count(*)::int n, coalesce(sum(octet_length(data::text)), 0)::int b from lucid_records where user_id = $1`, [u])).rows[0];

  for (const n of [1, 2, 3]) await put(A, 'a1', { n });
  assert.equal((await usage(A)).record_count, 1, 'an upsert that updates is not counted as a new record');
  await put(A, 'a2', {});
  await put(A, 'a3', {});
  await assert.rejects(put(A, 'a4', {}), /storage limit/);
  await put(B, 'b1', {}); // other accounts are unaffected
  await assert.rejects(put(A, 'a1', { t: 'x'.repeat(500) }), /storage limit/, 'growing a record past the byte limit is refused');
  await as(db, 'authenticated', A, `update lucid_records set deleted = true where id = 'a2'`); // same data: no change in bytes
  await as(db, 'authenticated', A, `delete from lucid_records where id = 'a3'`);
  await put(A, 'a4', {});
  let u = await usage(A); let real = await actual(A);
  assert.deepEqual([u.record_count, Number(u.byte_count)], [real.n, real.b], 'the running totals match the table');

  // Over a lowered limit, an account can still shrink and delete, but not grow.
  await db.exec(`create or replace function public.lucid_storage_limits(out max_records int, out max_bytes bigint)
    language sql immutable set search_path = '' as $$ select 2, 400::bigint $$;`);
  await put(A, 'a1', { n: 0 });
  await assert.rejects(put(A, 'a5', {}), /storage limit/);
  await as(db, 'authenticated', A, `delete from lucid_records where id = 'a4'`);
  u = await usage(A); real = await actual(A);
  assert.deepEqual([u.record_count, Number(u.byte_count)], [real.n, real.b]);
  await assert.rejects(as(db, 'authenticated', A, `select * from lucid_storage`), /permission denied/, 'the counters are internal');
});

test('AI usage is read-only for learners', async () => {
  const db = await setup();
  await assert.rejects(as(db, 'authenticated', A, `insert into lucid_ai_usage (user_id, route) values ($1, 'tutor_turn')`, [A]), /permission denied|row-level security/);
  await as(db, 'service_role', null, `insert into lucid_ai_usage (user_id, route, units) values ($1, 'tutor_turn', 1), ($2, 'tutor_turn', 1)`, [A, B]);
  assert.equal((await as(db, 'authenticated', A, `select * from lucid_ai_usage`)).rows.length, 1, 'A sees only own usage');
  await assert.rejects(as(db, 'authenticated', A, `update lucid_ai_usage set units = 0`), /permission denied/);
});

test('AI units are reserved by a service-role-only function with hour, day, in-flight and project limits (S-02, S-09)', async () => {
  const db = await setup();
  const reserve = (u, units = 1, { hourly = 3, daily = 5, global = 100, inFlight = 5 } = {}) =>
    as(db, 'service_role', null, `select lucid_ai_reserve($1, 'tutor_turn', $2, $3, $4, $5, $6) r`, [u, units, hourly, daily, global, inFlight]).then((x) => x.rows[0].r);
  const budget = async () => Number((await db.query(`select coalesce(sum(units), 0) n from lucid_ai_budget`)).rows[0].n);

  // Learners cannot call it: they could otherwise spend or block someone else's quota.
  await assert.rejects(as(db, 'authenticated', A, `select lucid_ai_reserve($1, 'tutor_turn', 1, 99, 99, 99, 9)`, [A]), /permission denied/);
  await assert.rejects(as(db, 'anon', null, `select lucid_ai_reserve($1, 'tutor_turn', 1, 99, 99, 99, 9)`, [A]), /permission denied/);
  await assert.rejects(as(db, 'authenticated', A, `select * from lucid_ai_budget`), /permission denied/);

  // Hour window: the reservation row is written before the model is called, so the next call sees it.
  for (let i = 0; i < 3; i++) assert.equal((await reserve(A)).ok, true);
  assert.deepEqual(await reserve(A), { ok: false, reason: 'hourly' });
  const mine = await as(db, 'authenticated', A, `select units, outcome from lucid_ai_usage`);
  assert.deepEqual(mine.rows.map((r) => r.outcome), ['pending', 'pending', 'pending'], 'learners see their reservations');
  // Older usage counts toward the day but not the hour.
  await db.query(`update lucid_ai_usage set created_at = now() - interval '2 hours' where user_id = $1`, [A]);
  assert.equal((await reserve(A)).ok, true);
  assert.deepEqual(await reserve(A, 2), { ok: false, reason: 'daily' });

  // In flight: open reservations from the last 10 minutes; settling one frees a slot.
  const b1 = await reserve(B, 1, { inFlight: 2 });
  assert.equal((await reserve(B, 1, { inFlight: 2 })).ok, true);
  assert.deepEqual(await reserve(B, 1, { inFlight: 2 }), { ok: false, reason: 'in_flight' });
  await as(db, 'service_role', null, `update lucid_ai_usage set outcome = 'refused', input_tokens = 10, output_tokens = 0 where id = $1`, [b1.id]);
  assert.equal((await reserve(B, 1, { inFlight: 2 })).ok, true, 'a refused call stays metered but is no longer open');

  // Project-wide budget for the UTC day, across learners. A: 4 units, B: 3 units.
  assert.equal(await budget(), 7);
  assert.deepEqual(await reserve(B, 1, { hourly: 10, daily: 10, global: 7 }), { ok: false, reason: 'global' });
  assert.equal((await reserve(B, 1, { hourly: 10, daily: 10, global: 8 })).ok, true);
  assert.equal(await budget(), 8);

  // Deleting an account removes its usage rows but not its spend from the project budget.
  await addProfile(db, A);
  await as(db, 'authenticated', A, `select lucid_delete_account()`);
  assert.equal(Number((await db.query(`select count(*) n from lucid_ai_usage where user_id = $1`, [A])).rows[0].n), 0);
  assert.equal(await budget(), 8);

  // Missing limits fail closed.
  await assert.rejects(as(db, 'service_role', null, `select lucid_ai_reserve($1, 'tutor_turn', 1, null, 5, 100, 2)`, [B]), /invalid AI reservation/);
  await assert.rejects(as(db, 'service_role', null, `select lucid_ai_reserve($1, 'not_a_route', 1, 99, 99, 99, 9)`, [B]), /check constraint/);
});

test('learners have no TRUNCATE, REFERENCES or TRIGGER and no access to internal tables (S-16)', async () => {
  const db = await setup();
  const tables = ['lucid_profiles', 'lucid_records', 'lucid_ai_usage', 'lucid_ai_budget', 'lucid_storage'];
  for (const role of ['authenticated', 'anon']) {
    for (const t of tables) {
      for (const priv of ['TRUNCATE', 'REFERENCES', 'TRIGGER']) {
        const r = await db.query(`select has_table_privilege($1, $2, $3) ok`, [role, `public.${t}`, priv]);
        assert.equal(r.rows[0].ok, false, `${role} ${priv} ${t}`);
      }
    }
  }
  await assert.rejects(as(db, 'authenticated', A, `truncate lucid_records`), /permission denied/);
  const fn = 'public.lucid_ai_reserve(uuid, text, int, int, int, int, int)';
  for (const [role, expected] of [['authenticated', false], ['anon', false], ['service_role', true]]) {
    const r = await db.query(`select has_function_privilege($1, $2, 'execute') ok`, [role, fn]);
    assert.equal(r.rows[0].ok, expected, `${role} execute lucid_ai_reserve`);
  }
});

test('export returns only the caller; delete removes everything', async () => {
  const db = await setup();
  for (const [u, n] of [[A, 3], [B, 2]]) {
    await as(db, 'authenticated', u, `insert into lucid_profiles (id, birth_year) values ($1, $2)`, [u, year - 25]);
    for (let i = 0; i < n; i++) await as(db, 'authenticated', u, `insert into lucid_records (coll, id, data) values ('attempts', $1, '{}')`, [`a${i}`]);
  }
  await as(db, 'service_role', null, `insert into lucid_ai_usage (user_id, route, units, outcome, input_tokens, output_tokens) values ($1, 'tutor_turn', 1, 'refused', 120, 0), ($2, 'tutor_turn', 1, 'ok', 5, 5)`, [A, B]);
  const ex = await as(db, 'authenticated', A, `select lucid_export() as e`);
  assert.equal(ex.rows[0].e.profile.id, A);
  assert.equal(ex.rows[0].e.records.length, 3);
  assert.equal(ex.rows[0].e.ai_usage.length, 1, 'only the caller\'s usage');
  assert.deepEqual([ex.rows[0].e.ai_usage[0].outcome, ex.rows[0].e.ai_usage[0].input_tokens], ['refused', 120]);  await assert.rejects(as(db, 'anon', null, `select lucid_delete_account()`), /permission denied/);
  await as(db, 'authenticated', A, `select lucid_delete_account()`);
  const left = await db.query(`select (select count(*) from auth.users where id = $1) u, (select count(*) from lucid_records where user_id = $1) r,
    (select count(*) from lucid_profiles where id = $1) p, (select count(*) from lucid_storage where user_id = $1) s`, [A]);
  assert.deepEqual([Number(left.rows[0].u), Number(left.rows[0].r), Number(left.rows[0].p), Number(left.rows[0].s)], [0, 0, 0, 0]);
  const bLeft = await db.query(`select count(*) n from lucid_records where user_id = $1`, [B]);
  assert.equal(Number(bLeft.rows[0].n), 2, 'other users untouched');
  assert.equal((await db.query(`select record_count from lucid_storage where user_id = $1`, [B])).rows[0].record_count, 2);
});
