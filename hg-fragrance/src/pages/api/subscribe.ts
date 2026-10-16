/**
 * POST /api/subscribe — { email, company } (JSON or form).
 * `company` is a honeypot: bots fill it, people never see it.
 * Forwards to NEWSLETTER_WEBHOOK_URL, or appends to SUBSCRIBERS_FILE on a persistent
 * Node host (dev writes to data/subscribers.jsonl). With neither, answers 503.
 */
import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export const prerender = false;

const env = (name: string) => process.env[name] || (import.meta.env[name] as string | undefined) || '';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request }) => {
  let email = '';
  let company = '';
  let source = '';
  try {
    if ((request.headers.get('content-type') || '').includes('application/json')) {
      const body = await request.json();
      email = String(body?.email ?? '');
      company = String(body?.company ?? '');
      source = String(body?.source ?? '');
    } else {
      const form = await request.formData();
      email = String(form.get('email') ?? '');
      company = String(form.get('company') ?? '');
    }
  } catch {
    return json({ error: 'invalid_request' }, 400);
  }

  // Honeypot filled: pretend it worked, store nothing.
  if (company.trim()) return json({ ok: true });

  email = email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return json({ error: 'invalid_email' }, 422);

  const entry = { email, source: source.slice(0, 80) || request.headers.get('referer') || 'site', at: new Date().toISOString() };

  const webhook = env('NEWSLETTER_WEBHOOK_URL');
  const file = env('SUBSCRIBERS_FILE') || (import.meta.env.DEV ? 'data/subscribers.jsonl' : '');

  try {
    if (webhook) {
      const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    } else if (file) {
      await mkdir(dirname(file), { recursive: true });
      await appendFile(file, JSON.stringify(entry) + '\n', 'utf8');
    } else {
      return json({ error: 'not_configured' }, 503);
    }
  } catch (err) {
    console.error('[subscribe]', err instanceof Error ? err.message : err);
    return json({ error: 'subscribe_failed' }, 502);
  }
  return json({ ok: true });
};
