import { reducedMotion, s } from './boot';
import { createOverlay } from './overlay';

/* ---------- header: solid after the hero, hides while reading down ---------- */
export function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  let last = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    const goingDown = y > last + 4;
    const goingUp = y < last - 4;
    if (goingDown && y > window.innerHeight * 0.6 && !header.contains(document.activeElement)) {
      header.classList.add('is-hidden');
    } else if (goingUp || y < 80) {
      header.classList.remove('is-hidden');
    }
    last = y;
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}

/* ---------- full-screen menu ---------- */
export function initMenu() {
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!menu || !toggle) return;
  const overlay = createOverlay(menu, {
    onOpen: () => toggle.setAttribute('aria-expanded', 'true'),
    onClose: () => toggle.setAttribute('aria-expanded', 'false'),
  });
  toggle.addEventListener('click', () => overlay.open(toggle));
  menu.querySelector('[data-menu-close]')?.addEventListener('click', () => overlay.close());
  document.addEventListener('hg:close-menu', () => overlay.close());
  // Same-page links (e.g. Home while on home) should simply close the menu.
  menu.querySelectorAll<HTMLAnchorElement>('.menu__list a').forEach((a) =>
    a.addEventListener('click', (e) => {
      if (a.pathname === location.pathname) {
        e.preventDefault();
        overlay.close();
        window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }),
  );
}

/* ---------- video posters load only as they approach the viewport (keeps them off the LCP path) ---------- */
export function initLazyPosters() {
  const vids = [...document.querySelectorAll<HTMLVideoElement>('video[data-poster]')];
  if (!vids.length) return;
  const portrait = window.matchMedia('(max-aspect-ratio: 4/5)');
  const apply = (v: HTMLVideoElement) => {
    v.poster = (portrait.matches && v.dataset.posterPortrait) || v.dataset.poster!;
    delete v.dataset.poster;
  };
  // The film modal is laid out even while closed, so its poster waits for the first "play the film" instead.
  const modal = vids.filter((v) => v.closest('[data-film-modal]'));
  if (modal.length)
    document.querySelectorAll('[data-open-film]').forEach((t) =>
      ['pointerenter', 'focus'].forEach((type) =>
        t.addEventListener(type, () => modal.forEach((v) => v.dataset.poster && apply(v)), { once: true }),
      ),
    );
  const inPage = vids.filter((v) => !modal.includes(v));
  if (!('IntersectionObserver' in window)) return inPage.forEach(apply);
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        apply(e.target as HTMLVideoElement);
        io.unobserve(e.target);
      }),
    { rootMargin: '600px 0px' },
  );
  inPage.forEach((v) => io.observe(v));
}

/* ---------- ambient videos: play only while visible, never under reduced motion / save-data ---------- */
export function initAmbientVideo() {
  const vids = document.querySelectorAll<HTMLVideoElement>('video[data-ambient]');
  if (!vids.length) return;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const allow = !reducedMotion() && !saveData;
  const portrait = window.matchMedia('(max-aspect-ratio: 4/5)');

  vids.forEach((v) => {
    if (!allow) return; // poster stays
    const src = (portrait.matches && v.dataset.srcPortrait) || v.dataset.src;
    if (!src) return;
    if (portrait.matches && v.dataset.posterPortrait) v.poster = v.dataset.posterPortrait;
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
  });
  if (!allow) return;

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting && !v.dataset.userPaused) v.play().catch(() => {});
        else v.pause();
      }),
    { threshold: 0.05 },
  );
  vids.forEach((v) => io.observe(v));
}

/* ---------- film players (inline + modal) ---------- */
const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function bindPlayer(root: HTMLElement) {
  const video = root.querySelector('video')!;
  const cover = root.querySelector<HTMLButtonElement>('[data-player-play]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-player-toggle]')!;
  const mute = root.querySelector<HTMLButtonElement>('[data-player-mute]');
  const bar = root.querySelector<HTMLElement>('[data-player-progress]')!;
  const time = root.querySelector<HTMLElement>('[data-player-time]')!;

  const sync = () => {
    const playing = !video.paused && !video.ended;
    root.classList.toggle('is-playing', playing);
    toggle.textContent = playing ? s('film.pause') : s('film.resume');
    if (mute) mute.textContent = video.muted ? s('film.unmute') : s('film.mute');
  };
  const play = () => {
    root.classList.add('is-started');
    video.play().catch(() => {});
  };
  cover.addEventListener('click', () => {
    play();
    toggle.focus({ preventScroll: true });
  });
  toggle.addEventListener('click', () => (video.paused ? play() : video.pause()));
  mute?.addEventListener('click', () => {
    video.muted = !video.muted;
    sync();
  });
  video.addEventListener('click', () => (video.paused ? play() : video.pause()));
  ['play', 'pause', 'ended', 'volumechange'].forEach((ev) => video.addEventListener(ev, sync));
  video.addEventListener('timeupdate', () => {
    const d = video.duration || 20;
    bar.style.transform = `scaleX(${video.currentTime / d})`;
    time.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(d)}`;
  });
  video.addEventListener('ended', () => {
    root.classList.remove('is-started');
    video.currentTime = 0;
  });
  return { play, pause: () => video.pause() };
}

export function initFilm() {
  document.querySelectorAll<HTMLElement>('[data-player]:not([data-film-modal] [data-player])').forEach(bindPlayer);

  const modal = document.querySelector<HTMLElement>('[data-film-modal]');
  if (!modal) return;
  const player = bindPlayer(modal.querySelector('[data-player]')!);
  const overlay = createOverlay(modal, {
    onOpen: () => player.play(),
    onClose: () => player.pause(),
    initialFocus: () => modal.querySelector('[data-player-toggle]'),
  });
  modal.querySelector('[data-film-close]')?.addEventListener('click', () => overlay.close());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) overlay.close();
  });
  document.querySelectorAll<HTMLElement>('[data-open-film]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.open(btn);
    }),
  );
}

/* ---------- newsletter ---------- */
export function initNewsletter() {
  document.querySelectorAll<HTMLFormElement>('form[data-newsletter]').forEach((form) => {
    const status = form.querySelector<HTMLElement>('[data-status]')!;
    const input = form.querySelector<HTMLInputElement>('input[type="email"]')!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        status.textContent = s('newsletter.invalid');
        status.dataset.tone = 'error';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      button.disabled = true;
      status.textContent = s('newsletter.sending');
      delete status.dataset.tone;
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, company: (form.elements.namedItem('company') as HTMLInputElement)?.value || '' }),
        });
        if (res.ok) {
          status.textContent = s('newsletter.success');
          status.dataset.tone = 'success';
          form.reset();
        } else {
          status.textContent = res.status === 503 ? s('newsletter.unavailable') : res.status === 422 ? s('newsletter.invalid') : s('newsletter.error');
          status.dataset.tone = 'error';
        }
      } catch {
        status.textContent = s('newsletter.error');
        status.dataset.tone = 'error';
      } finally {
        button.disabled = false;
      }
    });
  });
}

/* ---------- sensory chapters: sticky image follows the chapter being read ---------- */
export function initChapters() {
  document.querySelectorAll<HTMLElement>('[data-chapters]').forEach((root) => {
    const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
    const frames = [...root.querySelectorAll<HTMLElement>('[data-chapter-frame]')];
    const counter = root.querySelector<HTMLElement>('[data-chapter-index]');
    const activate = (i: string) => {
      frames.forEach((f) => f.classList.toggle('is-active', f.dataset.chapterFrame === i));
      chapters.forEach((c) => c.classList.toggle('is-active', c.dataset.chapter === i));
      if (counter) counter.textContent = `0${Number(i) + 1}`;
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && activate((e.target as HTMLElement).dataset.chapter!)),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    chapters.forEach((c) => io.observe(c));
  });
}

/* ---------- "one flacon, four lights": the block in mid-viewport re-lights the pinned bottle ---------- */
export function initFourLights() {
  document.querySelectorAll<HTMLElement>('[data-fl]').forEach((root) => {
    const stage = root.querySelector<HTMLElement>('[data-fl-stage]')!;
    const steps = [...root.querySelectorAll<HTMLElement>('[data-fl-step]')];
    const groups = ['[data-fl-frame]', '[data-fl-word]', '[data-fl-tick]'].map((sel) => [...root.querySelectorAll<HTMLElement>(sel)]);
    const activate = (i: number) => {
      groups.forEach((els) => els.forEach((el, j) => el.classList.toggle('is-active', i === j)));
      stage.style.setProperty('--fl-accent', steps[i].dataset.accent!);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && activate(steps.indexOf(e.target as HTMLElement))),
      { rootMargin: '-50% 0px -50% 0px' },
    );
    steps.forEach((s) => io.observe(s));
  });
}

/* ---------- light through glass: a specular point and a faint spectral band that follow the pointer ----------
   Fine pointers steer it; on touch the band drifts with scroll; under reduced motion it stays put. */
export function initGlass() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-glass]')];
  if (!els.length || reducedMotion()) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  els.forEach((el) => {
    const area = el.closest<HTMLElement>('[data-glass-area]') || el;
    let tx = 62, ty = 38, x = tx, y = ty, raf = 0, visible = false;
    const paint = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty('--gx', `${x.toFixed(2)}%`);
      el.style.setProperty('--gy', `${y.toFixed(2)}%`);
      el.style.setProperty('--gs', `${(x * 0.9 + 5).toFixed(2)}%`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(paint) : 0;
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(paint);
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !fine) onScroll();
      kick();
    }).observe(el);
    if (fine) {
      area.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        tx = Math.max(-10, Math.min(110, ((e.clientX - r.left) / r.width) * 100));
        ty = Math.max(-10, Math.min(110, ((e.clientY - r.top) / r.height) * 100));
        kick();
      });
      area.addEventListener('pointerleave', () => {
        tx = 62;
        ty = 38;
        kick();
      });
    }
    function onScroll() {
      const r = el.getBoundingClientRect();
      const p = 1 - (r.top + r.height / 2) / (window.innerHeight + r.height); // 0 → 1 as it crosses
      tx = 15 + p * 75;
      ty = 30 + p * 20;
      kick();
    }
    if (!fine) window.addEventListener('scroll', () => visible && onScroll(), { passive: true });
  });
}

/* ---------- product gallery (mobile carousel dots + thumbnails) ---------- */
export function initGallery() {
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-gallery-track]')!;
    const slides = [...track.children] as HTMLElement[];
    const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-gallery-dot]')];
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const i = slides.indexOf(e.target as HTMLElement);
          dots.forEach((d, j) => d.setAttribute('aria-current', String(i === j)));
        }),
      { root: track, threshold: 0.6 },
    );
    slides.forEach((sl) => io.observe(sl));
    dots.forEach((d, i) =>
      d.addEventListener('click', () => slides[i].scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest', inline: 'start' })),
    );
  });
}

/* ---------- size selector updates the displayed price ---------- */
export function initVariantPicker() {
  document.querySelectorAll<HTMLFormElement>('form[data-add-to-bag]').forEach((form) => {
    const outs = document.querySelectorAll<HTMLElement>('[data-variant-price]');
    const update = () => {
      const checked = form.querySelector<HTMLInputElement>('input[name="variant"]:checked');
      if (checked) outs.forEach((o) => (o.textContent = checked.dataset.price || ''));
    };
    form.addEventListener('change', update);
    update();
  });
}

/* ---------- product page: compact purchase bar once the main purchase block has scrolled away (mobile) ---------- */
export function initPdpBar() {
  const bar = document.querySelector<HTMLElement>('[data-pdp-bar]');
  const buy = document.querySelector<HTMLElement>('[data-pdp-buy]');
  if (!bar || !buy) return;
  bar.hidden = false;
  bar.inert = true;
  // A scroll check (not an IntersectionObserver) so jumps past the block — anchors, restored scroll — count too.
  let queued = false;
  const check = () => {
    queued = false;
    const on = buy.getBoundingClientRect().bottom < 0;
    if (on === bar.classList.contains('is-on')) return;
    bar.classList.toggle('is-on', on);
    bar.inert = !on;
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(check);
    }
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  check();
  bar.querySelector<HTMLAnchorElement>('[data-pdp-notify]')?.addEventListener('click', (e) => {
    const input = document.querySelector<HTMLInputElement>(new URL((e.currentTarget as HTMLAnchorElement).href).hash);
    if (!input) return;
    e.preventDefault();
    input.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
  });
}

/* ---------- site-level "still" mode (WCAG 2.3.3): saved per device, applied before first paint ---------- */
export function initMotionToggle() {
  document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]').forEach((btn) => {
    let byChoice = false;
    try {
      byChoice = localStorage.getItem('hg.motion') === 'off';
    } catch {
      /* storage blocked: the toggle cannot persist */
    }
    const on = !reducedMotion();
    const state = btn.querySelector('[data-motion-state]');
    if (state) state.textContent = on ? 'On' : 'Off';
    btn.setAttribute('aria-pressed', String(!on));
    if (!on && !byChoice) {
      btn.disabled = true;
      btn.title = 'Motion is reduced by your system settings';
      return;
    }
    btn.addEventListener('click', () => {
      try {
        if (on) localStorage.setItem('hg.motion', 'off');
        else localStorage.removeItem('hg.motion');
      } catch {
        return;
      }
      location.reload();
    });
  });
}

/* ---------- gallery lightbox (native <dialog>) ---------- */
export function initLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox-dialog]');
  if (!dialog) return;
  const image = dialog.querySelector<HTMLImageElement>('img')!;
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]')!;
  const all = [...document.querySelectorAll<HTMLButtonElement>('[data-lightbox]')];
  // Navigate only within what is currently shown (gallery filters hide items).
  let triggers = all;
  let index = 0;
  const show = (i: number) => {
    index = (i + triggers.length) % triggers.length;
    const t = triggers[index];
    image.src = t.dataset.full!;
    image.alt = t.dataset.alt || '';
    caption.textContent = `${String(index + 1).padStart(2, '0')} / ${String(triggers.length).padStart(2, '0')} — ${t.dataset.caption || ''}`;
  };
  all.forEach((t) =>
    t.addEventListener('click', () => {
      const group = t.dataset.lightbox || '';
      triggers = all.filter((x) => !x.closest('[hidden]') && (x.dataset.lightbox || '') === group);
      show(triggers.indexOf(t));
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
    }),
  );
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    triggers[index]?.focus();
  });
  dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (e) => {
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'ArrowRight') show(index + (rtl ? -1 : 1));
    if (e.key === 'ArrowLeft') show(index + (rtl ? 1 : -1));
  });
}

/* ---------- gallery filters ---------- */
export function initFilters() {
  document.querySelectorAll<HTMLElement>('[data-filters]').forEach((bar) => {
    const target = document.getElementById(bar.dataset.filters!);
    if (!target) return;
    const items = [...target.querySelectorAll<HTMLElement>('[data-campaign]')];
    const status = bar.querySelector<HTMLElement>('[data-filter-status]');
    bar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
      if (!btn) return;
      const f = btn.dataset.filter!;
      bar.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let n = 0;
      items.forEach((it) => {
        const show = f === 'all' || it.dataset.campaign === f;
        it.hidden = !show;
        if (show) n++;
      });
      if (status) status.textContent = `${n} images`;
      window.dispatchEvent(new Event('resize')); // let ScrollTrigger re-measure
    });
  });
}

/* ---------- ambient video pause control (WCAG 2.2.2) ---------- */
export function initAmbientToggles() {
  document.querySelectorAll<HTMLButtonElement>('[data-ambient-toggle]').forEach((btn) => {
    const video = document.getElementById(btn.getAttribute('aria-controls') || '') as HTMLVideoElement | null;
    if (!video) return;
    if (reducedMotion()) {
      btn.hidden = true;
      return;
    }
    const sync = () => {
      const on = !video.paused;
      btn.setAttribute('aria-pressed', String(!on));
      btn.textContent = on ? 'Pause' : 'Play';
    };
    btn.addEventListener('click', () => {
      if (video.paused) {
        delete video.dataset.userPaused;
        video.play().catch(() => {});
      } else {
        video.dataset.userPaused = '1';
        video.pause();
      }
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
  });
}

/* ---------- desktop cursor + magnetic CTAs ---------- */
export function initPointer() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || reducedMotion()) return;
  const cursor = document.querySelector<HTMLElement>('[data-cursor-el]');
  const label = document.querySelector<HTMLElement>('[data-cursor-label]');
  if (!cursor || !label) return;
  let x = -100,
    y = -100,
    cx = x,
    cy = y;
  window.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      cursor.classList.add('is-visible');
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  const loop = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const media = t.closest<HTMLElement>('[data-cursor]');
    const link = t.closest('a, button, label, input, select');
    cursor.classList.toggle('is-media', !!media);
    cursor.classList.toggle('is-link', !media && !!link);
    label.textContent = media?.dataset.cursor || '';
  });

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    el.style.transition = 'transform 600ms cubic-bezier(.16,1,.3,1)';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${dx * 10}px, ${dy * 8}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}
