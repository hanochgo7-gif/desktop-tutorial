(() => {
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-hero]');
  const sticky = document.querySelector('.sticky-cta');

  // כותרת עליונה מקבלת רקע אחרי גלילה; כפתור וואטסאפ צף מופיע אחרי ה־hero
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (sticky) sticky.classList.toggle('is-visible', hero ? y > hero.offsetHeight - window.innerHeight * 0.5 : y > 480);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // תפריט מסך מלא
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-btn-label').textContent = open ? 'סגירה' : 'תפריט';
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.querySelectorAll('main, footer, .sticky-cta').forEach((el) => { el.inert = open; });
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { const first = menu.querySelector('a, button'); if (first) first.focus({ preventScroll: true }); }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });

  // תת־תפריט השירותים נפתח ונסגר
  const subBtn = menu.querySelector('[data-sub-toggle]');
  const sub = subBtn && document.getElementById(subBtn.getAttribute('aria-controls'));
  if (subBtn && sub) {
    subBtn.addEventListener('click', () => {
      const open = subBtn.getAttribute('aria-expanded') !== 'true';
      subBtn.setAttribute('aria-expanded', String(open));
      sub.hidden = !open;
    });
  }

  // התמונה בצד התפריט מתחלפת לפי הפריט שמצביעים עליו
  const figImg = menu.querySelector('[data-menu-img]');
  const figCap = menu.querySelector('[data-menu-cap]');
  const figSub = menu.querySelector('[data-menu-sub]');
  if (figImg) {
    menu.querySelectorAll('[data-img]').forEach((el) => {
      const show = () => {
        if (figImg.getAttribute('src') !== el.dataset.img) figImg.src = el.dataset.img;
        figCap.textContent = el.dataset.cap;
        figSub.textContent = el.dataset.sub;
      };
      el.addEventListener('mouseenter', show);
      el.addEventListener('focus', show);
    });
  }

  // HERO: רצף פריימים שמתקדם עם הגלילה. שמירה -> אגרוף -> חזרה לשמירה.
  // הפריים הראשון והאחרון זהים, כך שגלילה קדימה ואחורה נראית רציפה.
  const canvas = document.querySelector('[data-hero-canvas]');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hero && canvas && !calm) {
    const count = +hero.dataset.frames;
    const fx = +hero.dataset.fx || 0.5;      // מרכז הלוחם בפריים, בין 0 ל־1
    const ctx = canvas.getContext('2d');
    const size = () => (window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 900 ? 1280 : 720);
    let set = size();
    const frames = [];
    let current = -1, raf = 0;

    const src = (i) => hero.dataset.path.replace('{w}', set).replace('{n}', String(i + 1).padStart(3, '0'));
    const load = () => {
      for (let i = 0; i < count; i++) {
        const img = new Image();
        img.decoding = 'async';
        img.src = src(i);
        img.onload = () => { if (current < 0 || Math.abs(i - current) <= 1) draw(true); };
        frames[i] = img;
      }
    };

    const content = hero.querySelector('.hero-content');
    const stage = hero.querySelector('.hero-stage');
    let textTop = 0;
    const measure = () => { textTop = content.getBoundingClientRect().top - stage.getBoundingClientRect().top; };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };

    // איזה פריים מוצג: לפי ההתקדמות בתוך הסקשן הגבוה
    const progress = () => {
      const r = hero.getBoundingClientRect();
      const run = hero.offsetHeight - window.innerHeight;
      return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
    };

    const nearestLoaded = (i) => {
      for (let d = 0; d < count; d++) {
        const a = frames[i - d], b = frames[i + d];
        if (a && a.complete && a.naturalWidth) return a;
        if (b && b.complete && b.naturalWidth) return b;
      }
      return null;
    };

    // ההתקדמות בגלילה -> מספר פריים (לא שלם). רגע קצר של שמירה בהתחלה ובסוף.
    const position = () => {
      const t = Math.min(1, Math.max(0, (progress() - 0.12) / 0.76));
      return t * (count - 1);
    };

    const place = (img, W, H) => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (W / H >= 1) {
        // מסך רחב: גובה מלא, הלוחם בשליש השמאלי והטקסט מימין
        const s = H / ih;
        return { s, x: W * (canvas.clientWidth > 1100 ? 0.3 : 0.34) - iw * s * fx, y: 0 };
      }
      // מסך צר: הלוחם כולו, קטן ומעל הטקסט (כך גם התמונה חדה יותר), במרכז השטח הפנוי
      const dpr = W / canvas.clientWidth;
      const top = (header.offsetHeight + 6) * dpr;
      const room = Math.max(H * 0.3, textTop * dpr - top - 10 * dpr);
      const size = Math.min(H * 0.44, W, room);
      const s = size / ih;
      return { s, x: W / 2 - iw * s * fx, y: top + (room - size) / 2 };
    };

    const draw = (force) => {
      const f = position();
      if (Math.abs(f - current) < 0.01 && !force) return;
      const i = Math.floor(f), frac = f - i;
      const a = nearestLoaded(i);
      if (!a) return;
      // כל פריים נשאר חד; רק ב־25% האחרונים לפני המעבר הוא נמס לפריים הבא
      const mix = Math.max(0, (frac - 0.75) / 0.25);
      const b = mix > 0 ? frames[Math.min(count - 1, i + 1)] : null;
      current = f;
      const W = canvas.width, H = canvas.height;
      const { s, x, y } = place(a, W, H);
      const w = a.naturalWidth * s, h = a.naturalHeight * s;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0c0906';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(a, x, y, w, h);
      // מעבר רך בין פריים לפריים במקום קפיצות
      if (b && b.complete && b.naturalWidth) {
        ctx.globalAlpha = mix;
        ctx.drawImage(b, x, y, w, h);
        ctx.globalAlpha = 1;
      }
      // שולי התמונה נמסים אל הרקע
      const edge = Math.min(w * 0.18, W * 0.12);
      const fade = (from, to) => {
        const g = ctx.createLinearGradient(from, 0, to, 0);
        g.addColorStop(0, 'rgba(12,9,6,0)');
        g.addColorStop(1, 'rgba(12,9,6,1)');
        ctx.fillStyle = g;
      };
      if (x > 0) { fade(x + edge, x); ctx.fillRect(0, 0, x + edge, H); }
      if (x + w < W) { fade(x + w - edge, x + w); ctx.fillRect(x + w - edge, 0, W - (x + w) + edge, H); }
      if (y + h < H) {
        const g = ctx.createLinearGradient(0, y + h - edge, 0, y + h);
        g.addColorStop(0, 'rgba(12,9,6,0)'); g.addColorStop(1, 'rgba(12,9,6,1)');
        ctx.fillStyle = g; ctx.fillRect(0, y + h - edge, W, H - (y + h) + edge);
      }
      hero.classList.add('is-drawn');
    };

    const tick = () => { raf = 0; draw(false); };
    const request = () => { if (!raf) raf = requestAnimationFrame(tick); };

    hero.classList.add('is-scrub');
    fit();
    measure();
    if (document.fonts) document.fonts.ready.then(() => { measure(); draw(true); });
    load();
    window.addEventListener('scroll', () => {
      request();
      const cue = hero.querySelector('[data-hero-cue]');
      if (cue) cue.classList.toggle('is-hidden', window.scrollY > 40);
    }, { passive: true });
    window.addEventListener('resize', () => {
      const next = size();
      fit();
      measure();
      if (next !== set) { set = next; frames.length = 0; current = -1; load(); }
      draw(true);
    });
  }

  // התחלה מהירה: הבחירות נכנסות להודעת ה-WhatsApp
  const quick = document.querySelector('[data-quick]');
  if (quick) {
    const send = quick.querySelector('[data-quick-send]');
    const base = send.href.split('?')[0];
    const preview = quick.querySelector('[data-quick-preview]');
    const update = () => {
      const goal = quick.querySelector('input[name="goal"]:checked');
      const place = quick.querySelector('input[name="place"]:checked');
      let text = 'היי אביב, אשמח לתאם אימון ניסיון.';
      if (goal) text += '\nהמטרה שלי: ' + goal.value;
      if (place) text += '\nנוח לי: ' + place.value;
      send.href = base + '?text=' + encodeURIComponent(text);
      if (preview) preview.textContent = text.replace(/\n/g, ', ').replace('., ', '. ');
    };
    quick.addEventListener('change', update);
  }

  // מדידה: כל לחיצה על WhatsApp נרשמת (Google Tag Manager / GA4 / Meta Pixel אם הותקנו)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="https://wa.me"]');
    if (!a) return;
    const where = a.dataset.cta || (a.closest('section[id]') || {}).id || 'other';
    (window.dataLayer = window.dataLayer || []).push({ event: 'whatsapp_click', cta: where, page: location.pathname });
    if (typeof window.fbq === 'function') window.fbq('track', 'Contact', { cta: where });
  });

  // סרטון אימון: מתנגן בלי קול כשמגיעים אליו, עם כפתור עצירה; ב"הפחתת תנועה" רק בלחיצה
  document.querySelectorAll('[data-clip]').forEach((video) => {
    const btn = video.parentElement.querySelector('[data-clip-toggle]');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let userPaused = still;
    const label = () => { btn.textContent = video.paused ? 'הפעלה' : 'עצירה'; };
    btn.hidden = false;
    label();
    btn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; video.play(); } else { userPaused = true; video.pause(); }
    });
    video.addEventListener('play', label);
    video.addEventListener('pause', label);
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !userPaused) video.play().catch(() => {});
        else if (!en.isIntersecting && !video.paused) video.pause();
      });
    }, { threshold: 0.4 }).observe(video);
  });

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
