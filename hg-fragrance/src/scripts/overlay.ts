/**
 * Shared behaviour for modal layers (menu, bag, film): inert toggling,
 * focus trapping, Escape to close, scroll locking and focus return.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';

let openStack: Overlay[] = [];

export interface Overlay {
  el: HTMLElement;
  open: (opener?: Element | null) => void;
  close: () => void;
  isOpen: () => boolean;
}

const lockScroll = () => {
  const sbw = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.overflow = 'hidden';
  if (sbw > 0) document.body.style.paddingInlineEnd = `${sbw}px`;
};
const unlockScroll = () => {
  if (openStack.length) return;
  document.documentElement.style.overflow = '';
  document.body.style.paddingInlineEnd = '';
};

export function createOverlay(
  el: HTMLElement,
  opts: { scrim?: HTMLElement | null; onOpen?: () => void; onClose?: () => void; initialFocus?: () => HTMLElement | null } = {},
): Overlay {
  let returnTo: HTMLElement | null = null;
  let open = false;

  const onKey = (e: KeyboardEvent) => {
    if (openStack[openStack.length - 1] !== api) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      api.close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const api: Overlay = {
    el,
    isOpen: () => open,
    open(opener) {
      if (open) return;
      open = true;
      returnTo = (opener as HTMLElement) || (document.activeElement as HTMLElement);
      el.inert = false;
      el.classList.add('is-open');
      opts.scrim?.classList.add('is-open');
      openStack.push(api);
      lockScroll();
      document.addEventListener('keydown', onKey);
      opts.onOpen?.();
      requestAnimationFrame(() => {
        const target = opts.initialFocus?.() || el.querySelector<HTMLElement>(FOCUSABLE);
        target?.focus({ preventScroll: true });
      });
    },
    close() {
      if (!open) return;
      open = false;
      el.classList.remove('is-open');
      opts.scrim?.classList.remove('is-open');
      openStack = openStack.filter((o) => o !== api);
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      opts.onClose?.();
      // keep focusable until the close transition ends, then make inert
      window.setTimeout(() => {
        if (!open) el.inert = true;
      }, 650);
      returnTo?.focus({ preventScroll: true });
    },
  };

  opts.scrim?.addEventListener('click', () => api.close());
  return api;
}
