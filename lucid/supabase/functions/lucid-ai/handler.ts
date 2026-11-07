// lucid-ai request handler. Dependencies (auth, profile lookup, the usage ledger, the Claude client) are
// injected so the handler can be tested without credentials; index.ts wires the real ones.
// Order of checks: origin, declared size, sign-in, byte-counted body, schema, consent, then an atomic
// reservation of units (per-learner hour, day and in-flight limits plus the project's daily budget) before
// the model is called. A reserved call stays metered whether it succeeds, is refused, is cut off or fails.
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1.3.0/helpers/zod';
import {
  Request as RequestSchema, UNITS, WritingEvaluation, type WritingEvaluation as WritingEvaluationT, RoleplayTurn, RoleplayFeedback,
  postProcess, clampFeedback, type Request,
} from './schemas.ts';
import { writingSystem, roleplaySystem, feedbackSystem, tutorSystem, writingUserMessage, roleplayMessages, tutorMessages, applicabilityFor } from './prompts.ts';

export type Outcome = 'ok' | 'refused' | 'incomplete' | 'error';
export type Reservation = { ok: true; id: number } | { ok: false; reason: 'daily' | 'hourly' | 'in_flight' | 'global' };

export interface Deps {
  env: {
    allowedOrigins: string[]; model: string; evalRuns?: number;
    hourlyUnits: number; dailyUnits: number; globalDailyUnits: number; maxInFlight: number;
  };
  authenticate(token: string): Promise<{ id: string } | null>;
  profile(userId: string): Promise<{ consent_ai_at: string | null } | null>;
  // One atomic step (lucid_ai_reserve, migration 002): check the learner's hour, day and in-flight limits and the
  // project's daily budget, and if they all pass, write a pending usage row. Called before the model.
  reserve(r: { user_id: string; route: Request['task']; units: number; hourly: number; daily: number; globalDaily: number; maxInFlight: number }): Promise<Reservation>;
  // Record how a reserved call ended. The reserved units stay counted whatever the outcome.
  settle(id: number, r: { outcome: Outcome; input_tokens: number | null; output_tokens: number | null }): Promise<void>;
  claude: Pick<Anthropic, 'beta'>;
}

const MAX_BODY = 64 * 1024;
// Server-side fallback: if the model declines for policy reasons, the API retries on its default
// fallback model inside the same call.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[], fallbacks: 'default' as const };

function cors(origin: string | null, allowed: string[]) {
  const ok = origin && (allowed.includes(origin) || allowed.includes('*'));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : allowed[0] || 'null',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function createHandler(deps: Deps) {
  return async function handle(req: Request | globalThis.Request): Promise<Response> {
    const r = req as globalThis.Request;
    const origin = r.headers.get('origin');
    const headers = { ...cors(origin, deps.env.allowedOrigins), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    const fail = (status: number, code: string, message: string) => reply(status, { error: { code, message } });

    if (r.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (r.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');
    if (origin && !deps.env.allowedOrigins.includes(origin) && !deps.env.allowedOrigins.includes('*')) {
      return fail(403, 'origin_not_allowed', 'This origin may not call the Lucid AI service.');
    }

    // ---- size, before anything else is read ----
    if (Number(r.headers.get('content-length')) > MAX_BODY) return fail(413, 'too_large', 'The request is too large.');

    // ---- authentication ----
    const token = (r.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return fail(401, 'unauthenticated', 'Sign in to use AI features.');
    const user = await deps.authenticate(token).catch(() => null);
    if (!user) return fail(401, 'unauthenticated', 'Your session has expired. Please sign in again.');

    // ---- input ----
    const raw = await readBody(r, MAX_BODY);
    if (raw === null) return fail(413, 'too_large', 'The request is too large.');
    let body: Request;
    try {
      const parsed = RequestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return fail(400, 'invalid_request', parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
      body = parsed.data;
    } catch {
      return fail(400, 'invalid_json', 'The request body must be JSON.');
    }

    // ---- consent ----
    const profile = await deps.profile(user.id);
    if (!profile) return fail(403, 'no_profile', 'Finish creating your profile first.');
    if (!profile.consent_ai_at) return fail(403, 'ai_consent_required', 'Turn on AI feedback in Settings to use this feature.');

    // ---- reserve units, then call the model ----
    // The request is built first, so nothing can fail between the reservation and the call.
    let call: ReturnType<typeof prepare>;
    try {
      call = prepare(deps, body);
    } catch (e) {
      console.error('lucid-ai prepare failed', (e as Error)?.message);
      return fail(500, 'internal_error', 'Something went wrong on our side. Please try again later.');
    }
    const { env } = deps;
    const reservation = await deps.reserve({
      user_id: user.id, route: body.task, units: call.units,
      hourly: env.hourlyUnits, daily: env.dailyUnits, globalDaily: env.globalDailyUnits, maxInFlight: Math.max(1, env.maxInFlight),
    }).catch((e) => { console.error('lucid-ai reserve failed', (e as Error)?.message); return null; });
    if (!reservation) return fail(503, 'unavailable', 'The AI service is unavailable right now. Please try again later.');
    if (!reservation.ok) return fail(...LIMITS[reservation.reason]);
    const settle = (outcome: Outcome, usage?: Usage) => deps.settle(reservation.id, {
      outcome, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null,
    }).catch((e) => console.error('lucid-ai settle failed', (e as Error)?.message));

    try {
      const { result, usage } = await call.send();
      await settle('ok', usage);
      return reply(200, result);
    } catch (e) {
      // Refusals, truncations and upstream errors keep their reservation: the call may have been billed.
      if (e instanceof Refusal) {
        await settle('refused', e.usage);
        return fail(422, 'declined', 'The AI could not respond to this request. Try rephrasing it.');
      }
      if (e instanceof Incomplete) {
        await settle('incomplete', e.usage);
        return fail(502, 'incomplete', 'The AI response was incomplete. Please try again.');
      }
      await settle('error');
      const status = (e as { status?: number })?.status;
      console.error('lucid-ai error', status, (e as Error)?.message);
      if (status === 429 || status === 529) return fail(503, 'busy', 'The AI service is busy. Please try again in a minute.');
      return fail(502, 'upstream_error', 'The AI service is unavailable right now. Please try again later.');
    }
  };
}

const LIMITS: Record<Exclude<Reservation, { ok: true }>['reason'], [number, string, string]> = {
  daily: [429, 'rate_limited', 'You have reached today\'s AI limit. Your lessons and automatic checks still work.'],
  hourly: [429, 'rate_limited', 'You have reached this hour\'s AI limit. Please try again a little later.'],
  in_flight: [429, 'in_flight', 'Another AI request from your account is still running. Wait for it to finish, then try again.'],
  global: [503, 'budget_exhausted', 'Lucid\'s AI features have reached today\'s limit for all learners. Your lessons and automatic checks still work. Please try again tomorrow.'],
};

// Reads the body counting bytes (not UTF-16 code units) and stops as soon as it passes the limit, so a client
// that omits or understates Content-Length cannot make the function buffer more than MAX_BODY.
async function readBody(r: globalThis.Request, max: number): Promise<string | null> {
  if (!r.body) return '';
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

type Usage = { input_tokens: number; output_tokens: number } | undefined;

class Refusal extends Error {
  usage: Usage;
  constructor(usage: Usage) { super('refusal'); this.usage = usage; }
}
class Incomplete extends Error {
  usage: Usage;
  constructor(usage: Usage) { super('incomplete'); this.usage = usage; }
}

function check(msg: { stop_reason: string | null }, usage: Usage) {
  if (msg.stop_reason === 'refusal') throw new Refusal(usage);
  if (msg.stop_reason === 'max_tokens') throw new Incomplete(usage);
}

// Research E 8.6: essays can be scored several times (LUCID_EVAL_RUNS, default 1, max 3) and the median taken.
const evalRuns = (deps: Deps) => Math.max(1, Math.min(3, Math.floor(Number(deps.env.evalRuns ?? 1)) || 1));

// Builds the model request for a task and says what it costs. Units scale with the number of scoring runs,
// because each run is a full high-effort call.
function prepare(deps: Deps, body: Request): { units: number; send(): Promise<{ result: unknown; usage: Usage }> } {
  const model = deps.env.model;
  const claude = deps.claude;
  switch (body.task) {
    case 'evaluate_writing': {
      const runs = evalRuns(deps);
      const params = {
        model, max_tokens: 16000, ...FALLBACK,
        output_config: { effort: 'high' as const, format: zodOutputFormat(WritingEvaluation) },
        system: [{ type: 'text' as const, text: writingSystem(), cache_control: { type: 'ephemeral' as const } }],
        messages: [{ role: 'user' as const, content: writingUserMessage(body) }],
      };
      return {
        units: UNITS.evaluate_writing * runs,
        async send() {
          const msgs = await Promise.all(Array.from({ length: runs }, () => claude.beta.messages.parse({ ...params })));
          const usage = msgs.reduce((a, m) => ({ input_tokens: a.input_tokens + (m.usage?.input_tokens ?? 0), output_tokens: a.output_tokens + (m.usage?.output_tokens ?? 0) }), { input_tokens: 0, output_tokens: 0 });
          msgs.forEach((m) => check(m, usage));
          const parsed = msgs.map((m) => m.parsed_output).filter(Boolean) as WritingEvaluationT[];
          if (!parsed.length) throw new Incomplete(usage);
          return { result: { evaluation: postProcess(parsed, body.text, applicabilityFor(body.stage, body.exercise.kind)) }, usage };
        },
      };
    }
    case 'roleplay_turn': {
      const params = {
        model, max_tokens: 4000, ...FALLBACK,
        output_config: { effort: 'low' as const, format: zodOutputFormat(RoleplayTurn) },
        system: [{ type: 'text' as const, text: roleplaySystem(), cache_control: { type: 'ephemeral' as const } }],
        messages: roleplayMessages(body, 'turn'),
      };
      return {
        units: UNITS.roleplay_turn,
        async send() {
          const msg = await claude.beta.messages.parse(params);
          check(msg, msg.usage);
          if (!msg.parsed_output) throw new Incomplete(msg.usage);
          return { result: msg.parsed_output, usage: msg.usage };
        },
      };
    }
    case 'roleplay_feedback': {
      const params = {
        model, max_tokens: 8000, ...FALLBACK,
        output_config: { effort: 'medium' as const, format: zodOutputFormat(RoleplayFeedback) },
        system: [{ type: 'text' as const, text: feedbackSystem(), cache_control: { type: 'ephemeral' as const } }],
        messages: roleplayMessages(body, 'feedback'),
      };
      return {
        units: UNITS.roleplay_feedback,
        async send() {
          const msg = await claude.beta.messages.parse(params);
          check(msg, msg.usage);
          if (!msg.parsed_output) throw new Incomplete(msg.usage);
          return { result: { feedback: clampFeedback(msg.parsed_output, body) }, usage: msg.usage };
        },
      };
    }
    case 'tutor_turn': {
      const params = {
        model, max_tokens: 6000, ...FALLBACK,
        output_config: { effort: 'low' as const },
        system: [{ type: 'text' as const, text: tutorSystem(), cache_control: { type: 'ephemeral' as const } }],
        messages: tutorMessages(body),
      };
      return {
        units: UNITS.tutor_turn,
        async send() {
          const msg = await claude.beta.messages.create(params);
          check(msg, msg.usage);
          const reply = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n').trim();
          if (!reply) throw new Incomplete(msg.usage);
          return { result: { reply }, usage: msg.usage };
        },
      };
    }
  }
}
