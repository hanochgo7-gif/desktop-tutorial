// LB-01 guard (BLK-04): accounts and AI only at Lucid's own address (NEW_HOME) or in local development; never on
// *.github.io, whatever the configuration says. And the deploy check that refuses such a configuration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { originOf, originAllowed, isOldCopy, ACCOUNT_ORIGINS, NEW_HOME, OLD_HOME } from '../../js/core/home.js';
import { serverAllowed, configured } from '../../js/core/api.js';
import { configProblems } from '../../tools/build/verify.mjs';

const ON = { supabaseUrl: 'https://abc.supabase.co', supabaseKey: 'sb_publishable_x' };

test('originOf takes the origin of absolute http(s) addresses only', () => {
  assert.equal(originOf('https://lucid.example.org/'), 'https://lucid.example.org');
  assert.equal(originOf('https://hanochgo7-gif.github.io/desktop-tutorial/lucid/'), 'https://hanochgo7-gif.github.io');
  for (const bad of ['', null, 42, 'lucid/', 'javascript:alert(1)', 'data:text/html,x', 'ftp://x.org/']) assert.equal(originOf(bad), '', String(bad));
});

test('originAllowed: never *.github.io (even when listed), local development yes, otherwise only a listed origin', () => {
  assert.equal(originAllowed('https://hanochgo7-gif.github.io', ['https://hanochgo7-gif.github.io']), false);
  assert.equal(originAllowed('https://GitHub.io', ['https://GitHub.io']), false);
  assert.equal(originAllowed('https://evil.github.io', []), false);
  for (const local of ['http://localhost:8765', 'http://127.0.0.1:13001', 'http://localhost']) assert.equal(originAllowed(local, []), true, local);
  assert.equal(originAllowed('https://localhost.evil.org', []), false);
  assert.equal(originAllowed('http://localhost.evil.org:80', []), false);
  assert.equal(originAllowed('https://lucid.example.org', ['https://lucid.example.org']), true);
  assert.equal(originAllowed('https://other.example.org', ['https://lucid.example.org']), false);
  assert.equal(originAllowed('https://lucid.example.org', []), false, 'an empty allowlist refuses every real origin');
  assert.equal(originAllowed('', ['']), false);
  assert.equal(originAllowed('null', ['null']), false);
});

test('the allowlist is NEW_HOME\'s origin, so it is empty while NEW_HOME is (the launch state)', () => {
  assert.equal(NEW_HOME, '', 'config.js NEW_HOME stays empty until the owner sets it (docs/setup.md "Launch switch")');
  assert.deepEqual(ACCOUNT_ORIGINS, []);
  assert.equal(OLD_HOME, 'https://hanochgo7-gif.github.io/desktop-tutorial/lucid/');
});

test('serverAllowed needs a configured server AND an allowed origin; configured() is off in node (no location)', () => {
  assert.equal(serverAllowed(ON, 'https://hanochgo7-gif.github.io', ['https://hanochgo7-gif.github.io']), false);
  assert.equal(serverAllowed(ON, 'https://lucid.example.org', ['https://lucid.example.org']), true);
  assert.equal(serverAllowed(ON, 'https://lucid.example.org', []), false);
  assert.equal(serverAllowed({ supabaseUrl: '', supabaseKey: '' }, 'https://lucid.example.org', ['https://lucid.example.org']), false);
  assert.equal(serverAllowed(ON, 'http://localhost:8765'), true);
  assert.equal(configured(), false);
  // Every account, sync and AI path asks configured(); it is the only reader of supabaseUrl besides request().
  assert.match(readFileSync(new URL('../../js/core/api.js', import.meta.url), 'utf8'), /export const configured = \(\) => \{\n  const ok = serverAllowed\(\);/);
});

test('isOldCopy: only at OLD_HOME\'s origin, only once NEW_HOME is set, never at the new address itself', () => {
  const old = 'https://hanochgo7-gif.github.io';
  const opts = { newHome: 'https://lucid.example.org/', oldHome: OLD_HOME };
  assert.equal(isOldCopy(old, opts), true);
  assert.equal(isOldCopy('https://lucid.example.org', opts), false);
  assert.equal(isOldCopy('https://other.github.io', opts), false);
  assert.equal(isOldCopy(old, { newHome: '', oldHome: OLD_HOME }), false, 'NEW_HOME empty: nothing shows');
  assert.equal(isOldCopy(old), false, 'the shipped configuration shows nothing');
  assert.equal(isOldCopy(old, { newHome: 'https://hanochgo7-gif.github.io/other/', oldHome: OLD_HOME }), false, 'same origin is not a move');
});

test('the deploy check refuses a server switched on without Lucid\'s own https address (verify.mjs)', async () => {
  const cfg = (url, home) => `export const CONFIG={supabaseUrl:${JSON.stringify(url)},supabaseKey:"k",aiEnabled:!1};export const NEW_HOME=${JSON.stringify(home)};`;
  assert.deepEqual(await configProblems(cfg('', '')), []);
  assert.deepEqual(await configProblems(readFileSync(new URL('../../config.js', import.meta.url), 'utf8')), []);
  assert.match((await configProblems(cfg('https://a.supabase.co', '')))[0], /NEW_HOME is not an https address/);
  assert.match((await configProblems(cfg('https://a.supabase.co', 'http://lucid.example.org/')))[0], /not an https address/);
  assert.match((await configProblems(cfg('https://a.supabase.co', 'https://x.github.io/lucid/')))[0], /github\.io/);
  assert.deepEqual(await configProblems(cfg('https://a.supabase.co', 'https://lucid.example.org/')), []);
  assert.match((await configProblems('export const CONFIG = {'))[0], /does not load/);
});
