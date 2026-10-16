/**
 * Minimal Stripe REST client (no SDK). Runs on the server only.
 * The secret key is read from the environment and never sent to the browser.
 */
const API = 'https://api.stripe.com/v1';

export const stripeKey = () => process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY || '';

/** Encode nested params the way Stripe expects: a[b][0][c]=d */
function encode(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object' && v !== null) encode(v as Record<string, unknown>, `${name}[${i}]`, out);
        else out.append(`${name}[${i}]`, String(v));
      });
    } else if (typeof value === 'object') {
      encode(value as Record<string, unknown>, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

export async function stripe<T = Record<string, unknown>>(path: string, init: { method?: 'GET' | 'POST'; params?: Record<string, unknown> } = {}) {
  const key = stripeKey();
  if (!key) throw new Error('STRIPE_NOT_CONFIGURED');
  const method = init.method ?? 'GET';
  const body = init.params && method === 'POST' ? encode(init.params) : undefined;
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data;
}
