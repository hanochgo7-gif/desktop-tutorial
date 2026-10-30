// lucid-ai request handler. Dependencies (auth, database, Claude client, clock) are injected so the
// handler can be tested without credentials; index.ts wires the real ones.
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1.3.0/helpers/zod';
import {
  Request as RequestSchema, UNITS, WritingEvaluation, RoleplayTurn, RoleplayFeedback,
  clampEvaluation, clampFeedback, type Request,
} from './schemas.ts';
import { writingSystem, roleplaySystem, feedbackSystem, tutorSystem, writingUserMessage, roleplayMessages, tutorMessages } from './prompts.ts';

export interface Deps {
  env: { allowedOrigins: string[]; model: string; hourlyUnits: number; dailyUnits: number };
  authenticate(token: string): Promise<{ id: string } | null>;
  profile(userId: string): Promise<{ consent_ai_at: string | null } | null>;
  unitsUsedSince(userId: string, since: Date): Promise<number>;
  recordUsage(row: { user_id: string; route: Request['task']; units: number; input_tokens: number | null; output_tokens: number | null }): Promise<void>;
  claude: Pick<Anthropic, 'beta'>;
  now(): Date;
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

    // ---- authentication ----
    const token = (r.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return fail(401, 'unauthenticated', 'Sign in to use AI features.');
    const user = await deps.authenticate(token).catch(() => null);
    if (!user) return fail(401, 'unauthenticated', 'Your session has expired. Please sign in again.');

    // ---- input ----
    const raw = await r.text();
    if (raw.length > MAX_BODY) return fail(413, 'too_large', 'The request is too large.');
    let body: Request;
    try {
      const parsed = RequestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return fail(400, 'invalid_request', parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
      body = parsed.data;
    } catch {
      return fail(400, 'invalid_json', 'The request body must be JSON.');
    }

    // ---- consent and limits ----
    const profile = await deps.profile(user.id);
    if (!profile) return fail(403, 'no_profile', 'Finish creating your profile first.');
    if (!profile.consent_ai_at) return fail(403, 'ai_consent_required', 'Turn on AI feedback in Settings to use this feature.');
    const units = UNITS[body.task];
    const now = deps.now();
    const [hour, day] = await Promise.all([
      deps.unitsUsedSince(user.id, new Date(now.getTime() - 3600_000)),
      deps.unitsUsedSince(user.id, new Date(now.getTime() - 86_400_000)),
    ]);
    if (hour + units > deps.env.hourlyUnits || day + units > deps.env.dailyUnits) {
      return fail(429, 'rate_limited', day + units > deps.env.dailyUnits
        ? 'You have reached today\'s AI limit. Your lessons and automatic checks still work.'
        : 'You have reached this hour\'s AI limit. Please try again a little later.');
    }

    // ---- model call ----
    try {
      const { result, usage } = await run(deps, body);
      await deps.recordUsage({ user_id: user.id, route: body.task, units, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null })
        .catch((e) => console.error('usage log failed', e));
      return reply(200, result);
    } catch (e) {
      if (e instanceof Refusal) return fail(422, 'declined', 'The AI could not respond to this request. Try rephrasing it.');
      if (e instanceof Incomplete) return fail(502, 'incomplete', 'The AI response was incomplete. Please try again.');
      const status = (e as { status?: number })?.status;
      console.error('lucid-ai error', status, (e as Error)?.message);
      if (status === 429 || status === 529) return fail(503, 'busy', 'The AI service is busy. Please try again in a minute.');
      return fail(502, 'upstream_error', 'The AI service is unavailable right now. Please try again later.');
    }
  };
}

class Refusal extends Error {}
class Incomplete extends Error {}

type Usage = { input_tokens: number; output_tokens: number } | undefined;

function check(msg: { stop_reason: string | null }) {
  if (msg.stop_reason === 'refusal') throw new Refusal();
  if (msg.stop_reason === 'max_tokens') throw new Incomplete();
}

async function run(deps: Deps, body: Request): Promise<{ result: unknown; usage: Usage }> {
  const model = deps.env.model;
  const claude = deps.claude;
  switch (body.task) {
    case 'evaluate_writing': {
      const msg = await claude.beta.messages.parse({
        model, max_tokens: 16000, ...FALLBACK,
        output_config: { effort: 'high', format: zodOutputFormat(WritingEvaluation) },
        system: [{ type: 'text', text: writingSystem(), cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: writingUserMessage(body) }],
      });
      check(msg);
      if (!msg.parsed_output) throw new Incomplete();
      return { result: { evaluation: clampEvaluation(msg.parsed_output, body.text) }, usage: msg.usage };
    }
    case 'roleplay_turn': {
      const msg = await claude.beta.messages.parse({
        model, max_tokens: 4000, ...FALLBACK,
        output_config: { effort: 'low', format: zodOutputFormat(RoleplayTurn) },
        system: [{ type: 'text', text: roleplaySystem(), cache_control: { type: 'ephemeral' } }],
        messages: roleplayMessages(body, 'turn'),
      });
      check(msg);
      if (!msg.parsed_output) throw new Incomplete();
      return { result: msg.parsed_output, usage: msg.usage };
    }
    case 'roleplay_feedback': {
      const msg = await claude.beta.messages.parse({
        model, max_tokens: 8000, ...FALLBACK,
        output_config: { effort: 'medium', format: zodOutputFormat(RoleplayFeedback) },
        system: [{ type: 'text', text: feedbackSystem(), cache_control: { type: 'ephemeral' } }],
        messages: roleplayMessages(body, 'feedback'),
      });
      check(msg);
      if (!msg.parsed_output) throw new Incomplete();
      return { result: { feedback: clampFeedback(msg.parsed_output) }, usage: msg.usage };
    }
    case 'tutor_turn': {
      const msg = await claude.beta.messages.create({
        model, max_tokens: 6000, ...FALLBACK,
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: tutorSystem(), cache_control: { type: 'ephemeral' } }],
        messages: tutorMessages(body),
      });
      check(msg);
      const reply = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n').trim();
      if (!reply) throw new Incomplete();
      return { result: { reply }, usage: msg.usage };
    }
  }
}
