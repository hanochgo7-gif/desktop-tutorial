// lucid-ai: server-side proxy for every AI feature in Lucid (writing evaluation, roleplay, tutor).
// The Anthropic API key never leaves the server. Deploy with:
//   supabase secrets set ANTHROPIC_API_KEY=... LUCID_ALLOWED_ORIGINS=https://example.com
//   supabase functions deploy lucid-ai
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase runtime.
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createHandler } from './handler.ts';

const env = (k: string, d?: string) => Deno.env.get(k) ?? d ?? '';

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const handler = createHandler({
  env: {
    allowedOrigins: env('LUCID_ALLOWED_ORIGINS', 'http://localhost:8765').split(',').map((s) => s.trim()).filter(Boolean),
    model: env('LUCID_MODEL', 'claude-opus-5-5'),
    hourlyUnits: Number(env('LUCID_HOURLY_UNITS', '40')),
    dailyUnits: Number(env('LUCID_DAILY_UNITS', '200')),
  },
  async authenticate(token) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  async profile(userId) {
    const { data } = await admin.from('lucid_profiles').select('consent_ai_at').eq('id', userId).maybeSingle();
    return data;
  },
  async unitsUsedSince(userId, since) {
    const { data, error } = await admin.from('lucid_ai_usage').select('units').eq('user_id', userId).gte('created_at', since.toISOString());
    if (error) throw error;
    return (data ?? []).reduce((a, r) => a + (r.units ?? 1), 0);
  },
  async recordUsage(row) {
    const { error } = await admin.from('lucid_ai_usage').insert(row);
    if (error) throw error;
  },
  claude: new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), maxRetries: 2, timeout: 120_000 }),
  now: () => new Date(),
});

Deno.serve(handler);
