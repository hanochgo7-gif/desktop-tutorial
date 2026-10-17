/**
 * The bag: a small persisted store (localStorage) plus its two views —
 * the slide-in drawer and the full /bag page. Prices always come from the
 * catalogue shipped by the server; the server re-prices at checkout.
 */
import { boot, money, s } from './boot';
import { createOverlay, type Overlay } from './overlay';

interface Line {
  id: string;
  qty: number;
}

const KEY = 'hg.bag.v1';
const listeners = new Set<() => void>();

const clamp = (n: number) => Math.max(1, Math.min(boot.maxQty, Math.round(n) || 1));

function read(): Line[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((l) => l && typeof l.id === 'string' && boot.catalog[l.id]?.available)
      .map((l) => ({ id: l.id, qty: clamp(Number(l.qty)) }));
  } catch {
    return [];
  }
}

let lines = read();

function write(next: Line[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* private mode: bag still works for this page view */
  }
  listeners.forEach((fn) => fn());
}

export const bag = {
  lines: () => lines,
  count: () => lines.reduce((n, l) => n + l.qty, 0),
  subtotal: () => lines.reduce((n, l) => n + (boot.catalog[l.id]?.price ?? 0) * l.qty, 0),
  add(id: string, qty = 1) {
    if (!boot.catalog[id]?.available) return;
    const existing = lines.find((l) => l.id === id);
    write(
      existing
        ? lines.map((l) => (l.id === id ? { ...l, qty: clamp(l.qty + qty) } : l))
        : [...lines, { id, qty: clamp(qty) }],
    );
  },
  set(id: string, qty: number) {
    write(lines.map((l) => (l.id === id ? { ...l, qty: clamp(qty) } : l)));
  },
  remove(id: string) {
    write(lines.filter((l) => l.id !== id));
  },
  clear() {
    write([]);
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    lines = read();
    listeners.forEach((fn) => fn());
  }
});

/* ---------- rendering ---------- */

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function lineHTML(l: Line, thumbs: Record<string, string>) {
  const p = boot.catalog[l.id];
  if (!p) return '';
  const thumb = thumbs[p.slug] || '';
  return `
  <article class="line-item" data-line="${esc(l.id)}">
    <a class="line-item__img" href="/fragrances/${esc(p.slug)}" tabindex="-1" aria-hidden="true">
      ${thumb ? `<img src="${esc(thumb)}" alt="" width="240" height="300" loading="lazy" />` : ''}
    </a>
    <div>
      <div class="line-item__top">
        <div>
          <h3 class="line-item__name"><a href="/fragrances/${esc(p.slug)}">${esc(p.name)}</a></h3>
          <p class="line-item__meta">${esc(p.label)}</p>
        </div>
        <p class="serif" style="font-size:1.2rem">${money(p.price * l.qty)}</p>
      </div>
      <div class="line-item__actions">
        <div class="qty" role="group" aria-label="Quantity for ${esc(p.name)} ${esc(p.label)}">
          <button type="button" data-qty="-1" aria-label="${esc(s('bag.decrease'))}" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
          <output aria-live="polite">${l.qty}</output>
          <button type="button" data-qty="1" aria-label="${esc(s('bag.increase'))}" ${l.qty >= boot.maxQty ? 'disabled' : ''}>+</button>
        </div>
        <button class="text-btn" type="button" data-remove>${esc(s('bag.remove'))}</button>
      </div>
    </div>
  </article>`;
}

function emptyHTML() {
  return `
  <div class="bag-empty">
    <p class="h3">${esc(s('bag.empty'))}</p>
    <p class="muted">${esc(s('bag.emptyHint'))}</p>
    <a class="btn" href="/fragrances">${esc(s('bag.explore'))}<span class="arrow" aria-hidden="true"></span></a>
  </div>`;
}

function bindLines(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const line = target.closest<HTMLElement>('[data-line]');
    if (!line) return;
    const id = line.dataset.line!;
    const current = lines.find((l) => l.id === id);
    if (!current) return;
    const qtyBtn = target.closest<HTMLElement>('[data-qty]');
    if (qtyBtn) {
      bag.set(id, current.qty + Number(qtyBtn.dataset.qty));
      // keep focus on the same control after re-render
      requestAnimationFrame(() =>
        root.querySelector<HTMLElement>(`[data-line="${CSS.escape(id)}"] [data-qty="${qtyBtn.dataset.qty}"]:not([disabled])`)?.focus(),
      );
    }
    if (target.closest('[data-remove]')) bag.remove(id);
  });
}

/* ---------- checkout ---------- */

async function startCheckout(button: HTMLButtonElement, status: HTMLElement) {
  if (!lines.length) return;
  if (boot.demo) {
    // A demonstration site never calls the payment endpoint: say so plainly.
    status.textContent = s('checkout.demo');
    status.removeAttribute('data-tone');
    status.hidden = false;
    return;
  }
  const label = button.innerHTML;
  button.disabled = true;
  button.textContent = s('checkout.redirecting');
  status.hidden = true;
  status.removeAttribute('data-tone');
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.url === 'string' && data.url.startsWith('https://')) {
      window.location.assign(data.url);
      return;
    }
    // 503: not configured; 404/405: a static host with no checkout endpoint (e.g. GitHub Pages).
    const off = [503, 404, 405].includes(res.status);
    status.textContent = off ? s('checkout.notConfigured') : s('checkout.error');
    if (!off) status.dataset.tone = 'error';
  } catch {
    status.textContent = s('checkout.error');
    status.dataset.tone = 'error';
  }
  status.hidden = false;
  button.disabled = false;
  button.innerHTML = label;
}

/* ---------- init ---------- */

export function initBag() {
  const drawer = document.querySelector<HTMLElement>('[data-bag-drawer]');
  const scrim = document.querySelector<HTMLElement>('[data-bag-scrim]');
  let thumbs: Record<string, string> = {};
  try {
    thumbs = JSON.parse(drawer?.dataset.thumbs || '{}');
  } catch {
    /* no thumbnails */
  }
  const counters = document.querySelectorAll<HTMLElement>('[data-bag-count]');
  let overlay: Overlay | undefined;

  const views = [...document.querySelectorAll<HTMLElement>('[data-bag-lines]')];
  views.forEach(bindLines);

  const render = () => {
    const n = bag.count();
    counters.forEach((c) => {
      c.textContent = String(n);
      c.setAttribute('aria-label', `${n} ${n === 1 ? 'item' : 'items'} in bag`);
    });
    document.querySelectorAll('[data-bag-count-inline]').forEach((c) => (c.textContent = n ? `(${n})` : ''));
    views.forEach((v) => (v.innerHTML = lines.length ? lines.map((l) => lineHTML(l, thumbs)).join('') : emptyHTML()));
    document.querySelectorAll<HTMLElement>('[data-bag-foot]').forEach((f) => (f.hidden = !lines.length));
    document.querySelectorAll('[data-bag-subtotal]').forEach((el) => (el.textContent = money(bag.subtotal())));
  };

  render();
  bag.subscribe(render);

  if (drawer) {
    overlay = createOverlay(drawer, {
      scrim,
      initialFocus: () => drawer.querySelector('[data-bag-close]'),
    });
    drawer.querySelector('[data-bag-close]')?.addEventListener('click', () => overlay!.close());
  }

  // Bag triggers open the drawer, except on the /bag page itself.
  document.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest('[data-open-bag]');
    if (!trigger || !overlay || location.pathname.replace(/\/$/, '') === '/bag') return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('hg:close-menu'));
    overlay.open(trigger);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-checkout]').forEach((btn) => {
    const status = btn.parentElement!.querySelector<HTMLElement>('[data-checkout-status]')!;
    btn.addEventListener('click', () => startCheckout(btn, status));
  });

  // Add-to-bag forms (product page).
  document.querySelectorAll<HTMLFormElement>('form[data-add-to-bag]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const id = String(data.get('variant') || '');
      const qty = Number(data.get('qty') || 1);
      if (!boot.catalog[id]) return;
      bag.add(id, qty);
      counters.forEach((c) => {
        c.classList.remove('is-bump');
        void c.offsetWidth;
        c.classList.add('is-bump');
      });
      const submit = form.querySelector<HTMLElement>('[type="submit"]');
      overlay?.open(submit);
    });
  });

  return { open: (opener?: Element) => overlay?.open(opener) };
}
