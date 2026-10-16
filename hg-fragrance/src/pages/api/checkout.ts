/**
 * POST /api/checkout — { lines: [{ id, qty }] } → { url } of a Stripe Checkout session.
 * Every line is re-priced from the catalogue; the browser's prices are never used.
 * Without STRIPE_SECRET_KEY it answers 503 and nothing is charged.
 */
import type { APIRoute } from 'astro';
import { findVariant, isPurchasable } from '../../data/catalog';
import { commerce } from '../../config/site';
import { stripe, stripeKey } from '../../lib/stripe';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request, url }) => {
  let payload: { lines?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const raw = Array.isArray(payload?.lines) ? payload.lines.slice(0, 20) : [];
  const items = raw.flatMap((l) => {
    const id = typeof l?.id === 'string' ? l.id : '';
    const match = findVariant(id);
    if (!match || !match.variant.available || !isPurchasable(match.product)) return [];
    const qty = Math.max(1, Math.min(commerce.maxQuantityPerLine, Math.round(Number(l?.qty)) || 1));
    return [{ ...match, qty }];
  });
  if (!items.length) return json({ error: 'empty_bag' }, 422);

  if (!stripeKey()) return json({ error: 'payments_not_configured' }, 503);

  const origin = (process.env.SITE_URL || import.meta.env.SITE_URL || url.origin).replace(/\/$/, '');
  try {
    const session = await stripe<{ url: string }>('/checkout/sessions', {
      method: 'POST',
      params: {
        mode: 'payment',
        line_items: items.map(({ product, variant, qty }) => ({
          quantity: qty,
          price_data: {
            currency: commerce.currency.toLowerCase(),
            unit_amount: Math.round(variant.price * 100),
            product_data: { name: `HG ${product.name} — ${variant.label}`, metadata: { sku: variant.id } },
          },
        })),
        shipping_address_collection: { allowed_countries: [...commerce.shippingCountries] },
        billing_address_collection: 'auto',
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/bag`,
      },
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', err instanceof Error ? err.message : err);
    return json({ error: 'checkout_failed' }, 502);
  }
};
