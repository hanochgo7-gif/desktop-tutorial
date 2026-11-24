/**
 * Motion system. Loaded only when the visitor has not asked for reduced motion.
 * Vocabulary:
 *   data-reveal="lines"  — words rise from a mask, staggered (headlines)
 *   data-reveal="fade"   — soft rise + fade (body, UI)
 *   data-reveal="mask"   — image frame wipes open, picture settles from 1.2 → 1
 *   data-parallax="8"    — image drifts ±8% inside its frame while scrolling
 *   data-speed="0.15"    — element drifts against the scroll (layered depth)
 *   data-drift="-30"     — horizontal drift in % across the section (oversized type)
 *   data-delay / data-immediate — timing hooks for above-the-fold elements
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'expo.out';

function splitWords(root: HTMLElement) {
  if (root.dataset.split === 'done') return;
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent || '').split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(root);
  root.dataset.split = 'done';
}

/* ---------- reveals: built lazily, triggered by IntersectionObserver ----------
 * Nothing is measured or animated up front (keeps the main thread free at load).
 * Initial hidden states come from CSS (html.motion …). A light scroll fallback
 * plays anything the page jumped past (fast scroll, anchors, restored position). */
const reveals: Record<string, (el: HTMLElement) => void> = {
  lines(el) {
    splitWords(el);
    gsap.fromTo(
      el.querySelectorAll('.wi'),
      { yPercent: 115, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.35, ease: EASE, stagger: 0.045, delay: Number(el.dataset.delay || 0) },
    );
  },
  fade(el) {
    gsap.fromTo(el, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', delay: Number(el.dataset.delay || 0) });
  },
  mask(el) {
    const pic = el.querySelector('picture, video');
    const tl = gsap.timeline({ delay: Number(el.dataset.delay || 0) });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
    if (pic) tl.fromTo(pic, { scale: 1.22 }, { scale: 1, duration: 2.2, ease: EASE }, 0.15);
  },
};

function initReveals() {
  const pending = new Set<HTMLElement>();
  const fire = (el: HTMLElement) => {
    if (!pending.delete(el)) return;
    io.unobserve(el);
    reveals[el.dataset.reveal!]?.(el);
  };
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => (e.isIntersecting || e.boundingClientRect.bottom < 0) && fire(e.target as HTMLElement)),
    { rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (!reveals[el.dataset.reveal!]) return;
    pending.add(el);
    if (el.dataset.immediate !== undefined) fire(el);
    else io.observe(el);
  });
  let queued = false;
  window.addEventListener(
    'scroll',
    () => {
      if (queued || !pending.size) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        // Fast scrolls and anchor jumps can skip an observer callback: reveal anything on or above the screen.
        pending.forEach((el) => el.getBoundingClientRect().top < window.innerHeight * 0.92 && fire(el));
      }, 150);
    },
    { passive: true },
  );
}

export function initMotion() {
  (window as unknown as { __hgMotion: boolean }).__hgMotion = true;
  // Dev-only handle so automated QA can advance the timeline in a background tab.
  if (import.meta.env.DEV) Object.assign(window, { __hgGsap: gsap, __hgST: ScrollTrigger });

  initReveals();

  // Hero intro: the film frame settles into place (runs immediately; no measuring).
  const heroMedia = document.querySelector<HTMLElement>('[data-hero] [data-hero-media]');
  if (heroMedia) gsap.fromTo(heroMedia, { scale: 1.12 }, { scale: 1, duration: 2.8, ease: 'power2.out' });

  // Scroll-scrubbed depth is set up when the browser is idle, after first paint.
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (idle) idle(initScrubbed, { timeout: 1500 });
  else setTimeout(initScrubbed, 300);
}

function initScrubbed() {
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((img) => {
    const amount = Number(img.dataset.parallax) || 8;
    gsap.set(img, { scale: 1 + amount / 50 });
    gsap.fromTo(
      img,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: { trigger: img.closest('.media') || img, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
    const speed = Number(el.dataset.speed) || 0.1;
    gsap.fromTo(
      el,
      { y: () => window.innerHeight * speed },
      {
        y: () => -window.innerHeight * speed,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      },
    );
  });

  gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((el) => {
    const rtl = document.documentElement.dir === 'rtl' ? -1 : 1;
    const amount = Number(el.dataset.drift) || -20;
    gsap.fromTo(
      el,
      { xPercent: 0 },
      {
        xPercent: amount * rtl,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  // Hero: the film frame slowly sinks and the type lifts away as the page scrolls.
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (hero) {
    const media = hero.querySelector<HTMLElement>('[data-hero-media]');
    if (media) {
      gsap.to(media, {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
    }
    const content = hero.querySelector<HTMLElement>('[data-hero-content]');
    if (content) {
      gsap.to(content, {
        yPercent: -14,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: true },
      });
    }
  }

  // The outlined footer monogram rises into place.
  const mark = document.querySelector<HTMLElement>('[data-footer-mark]');
  if (mark) {
    gsap.fromTo(
      mark,
      { yPercent: 40, opacity: 0 },
      { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true } },
    );
  }

  // Fonts and lazy images change layout — recalc once everything settles.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
