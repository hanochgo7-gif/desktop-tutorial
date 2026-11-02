// lucid-ai: server-side proxy for every AI feature in Lucid (writing evaluation, roleplay, tutor).
// The Anthropic API key never leaves the server. Deploy with:
//   supabase secrets set ANTHROPIC_API_KEY=... LUCID_ALLOWED_ORIGINS=https://example.com
//   supabase functions deploy lucid-ai
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase runtime.
// Needs migration 002 (lucid_ai_reserve and the outcome column on lucid_ai_usage).
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { createHandler, type Reservation } from './handler.ts';

const env = (k: string, d?: string) => Deno.env.get(k) ?? d ?? '';
// A missing or malformed number falls back to the default instead of becoming NaN (which would disable a limit).
const int = (k: string, d: number) => {
  const n = Number.parseInt(env(k, String(d)), 10);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const handler = createHandler({
  env: {
    allowedOrigins: env('LUCID_ALLOWED_ORIGINS', 'http://localhost:8765').split(',').map((s) => s.trim()).filter(Boolean),
    model: env('LUCID_MODEL', 'claude-opus-5-5'),
    hourlyUnits: int('LUCID_HOURLY_UNITS', 40),
    dailyUnits: int('LUCID_DAILY_UNITS', 200),
    globalDailyUnits: int('LUCID_GLOBAL_DAILY_UNITS', 1000),
    maxInFlight: int('LUCID_MAX_IN_FLIGHT', 2),
    evalRuns: int('LUCID_EVAL_RUNS', 1),
  },
  async authenticate(token) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  async profile(userId) {
    const { data } = await admin.from('lucid_profiles').select('consent_ai_at').eq('id', userId).maybeSingle();
    return data;
  },
  async reserve(r) {
    const { data, error } = await admin.rpc('lucid_ai_reserve', {
      p_user: r.user_id, p_route: r.route, p_units: r.units,
      p_hourly: r.hourly, p_daily: r.daily, p_global_daily: r.globalDaily, p_max_in_flight: r.maxInFlight,
    });
    if (error) throw error;
    return data as Reservation;
  },
  async settle(id, r) {
    const { error } = await admin.from('lucid_ai_usage').update(r).eq('id', id);
    if (error) throw error;
  },
  claude: new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), maxRetries: 2, timeout: 120_000 }),
});

Deno.serve(handler);
