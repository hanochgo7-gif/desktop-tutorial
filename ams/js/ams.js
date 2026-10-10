(() => {
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-hero]');
  const sticky = document.querySelector('.sticky-cta');
  const root = document.documentElement;

  // גלילה חלקה בגלגלת העכבר (Lenis, הקובץ מאוחסן באתר, בלי צד שלישי).
  // במגע נשארת הגלילה הרגילה של המכשיר. לא פועלת עם "הפחתת תנועה" או "עצירת אנימציות".
  let lenis = null;
  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smooth = () => {
    const want = !!window.Lenis && !motionOff.matches && !root.classList.contains('a11y-still');
    if (want && !lenis) {
      lenis = new window.Lenis({
        autoRaf: true,
        lerp: 0.1,
        allowNestedScroll: true,
        prevent: (node) => node.matches('.menu, .a11y-panel'),
      });
      if (document.body.classList.contains('menu-open')) lenis.stop();
    } else if (!want && lenis) {
      lenis.destroy();
      lenis = null;
    }
  };
  smooth();
  motionOff.addEventListener('change', smooth);
  new MutationObserver(smooth).observe(root, { attributes: true, attributeFilter: ['class'] });

  // קישור לסעיף באותו דף: גלילה חלקה, והפוקוס עובר לסעיף (כמו בקישור רגיל) למי שמשתמש במקלדת
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!lenis || !a || a.classList.contains('skip') || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target);
    history.pushState(null, '', '#' + id);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // כותרת עליונה מקבלת רקע אחרי גלילה; כפתור וואטסאפ צף מופיע אחרי ה־hero
  // הכפתור הצף מוסתר כשהסגירה או הפוטר על המסך (יש שם כבר כפתור), כדי לא לכסות תוכן
  let nearEnd = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 40);
    const past = hero ? y > hero.offsetHeight - window.innerHeight * 0.5 : y > 480;
    if (sticky) sticky.classList.toggle('is-visible', past && !nearEnd);
  };
  if (sticky && 'IntersectionObserver' in window) {
    const ends = document.querySelectorAll('.closing, .site-footer');
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
      nearEnd = seen.size > 0;
      onScroll();
    });
    ends.forEach((el) => io.observe(el));
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // תפריט מסך מלא (בדף הנחיתה אין תפריט)
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-btn-label').textContent = open ? 'סגירה' : 'תפריט';
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.querySelectorAll('main, footer, .sticky-cta').forEach((el) => { el.inert = open; });
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
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
  if (subBtn && sub && window.matchMedia('(max-width: 760px)').matches) {
    subBtn.setAttribute('aria-expanded', 'false');   // בטלפון רשימת השירותים נפתחת רק בלחיצה
    sub.hidden = true;
  }
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

  }

  // HERO: רצף פריימים שמתקדם עם הגלילה. שמירה -> אגרוף -> חזרה לשמירה.
  // הפריים הראשון והאחרון זהים, כך שגלילה קדימה ואחורה נראית רציפה.
  const canvas = document.querySelector('[data-hero-canvas]');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('a11y-still');
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
    // טקסט מוגדל במסך צר: אין מקום ללוחם מעל הכותרת, אז מפנים לו מקום כדי שלא יישב מאחורי הטקסט
    const measure = () => {
      const top = () => content.getBoundingClientRect().top - stage.getBoundingClientRect().top;
      hero.classList.remove('is-tall');
      textTop = top();
      if (stage.clientWidth < stage.clientHeight && textTop < header.offsetHeight + window.innerHeight * 0.3) {
        hero.classList.add('is-tall');
        textTop = top();
      }
    };

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
      const V = Math.min(H, window.innerHeight * dpr);   // כשהטקסט מוגדל הבמה גבוהה מהמסך
      const room = Math.max(V * 0.3, textTop * dpr - top - 10 * dpr);
      const size = Math.min(V * 0.44, W, room);
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

  // מדידה והסכמה. כל עוד אין מזהה מדידה ב־build (window.AMS_ANALYTICS), לא נאסף ולא נשמר שום דבר.
  // כשיש מזהה: שום סקריפט מדידה לא נטען ושום אירוע לא נרשם עד שהגולש מאשר בבאנר.
  // נתיב השורש של האתר (לפי מיקום גיליון הסגנונות), לקישורים שנבנים כאן
  const cssLink = document.querySelector('link[rel="stylesheet"][href$="css/ams.css"]');
  const ROOT = cssLink ? cssLink.getAttribute('href').replace('css/ams.css', '') : '';
  const cfg = window.AMS_ANALYTICS || null;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* בלי אחסון */ } },
  };
  let consent = cfg ? store.get('ams_consent') : null;
  const tracking = () => !!cfg && consent === 'granted';
  let source = '';
  let loaded = false;

  const loadAnalytics = () => {
    if (loaded || !tracking()) return;
    loaded = true;
    // מקור ההגעה (utm_source מהקישור באינסטגרם או במודעה) נשמר לסשן ומצורף לאירועים
    try {
      source = new URLSearchParams(location.search).get('utm_source') || sessionStorage.getItem('ams_src') || '';
      if (source) sessionStorage.setItem('ams_src', source);
    } catch (e) { /* בלי אחסון */ }
    if (cfg.ga4) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', cfg.ga4);
    }
    if (cfg.pixel && !window.fbq) {
      const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
      window.fbq('init', cfg.pixel);
      window.fbq('track', 'PageView');
    }
  };

  const banner = () => {
    let el = document.querySelector('[data-consent]');
    if (el) { el.hidden = false; return; }
    el = document.createElement('section');
    el.className = 'consent';
    el.setAttribute('data-consent', '');
    el.setAttribute('aria-label', 'הסכמה לעוגיות');
    el.innerHTML = '<p>האתר רוצה להשתמש בעוגיות מדידה כדי להבין מאיפה מגיעים אליו ומה עוזר לגולשים. זה יקרה רק אם תאשר. ' +
      '<a href="' + ROOT + 'privacy.html">מדיניות פרטיות</a></p>' +
      '<div class="consent-actions"><button type="button" class="btn btn-gold" data-consent-yes>אישור</button>' +
      '<button type="button" class="btn btn-line" data-consent-no>דחייה</button></div>';
    document.body.appendChild(el);
    el.querySelector('[data-consent-yes]').addEventListener('click', () => {
      consent = 'granted'; store.set('ams_consent', consent); el.hidden = true; loadAnalytics();
    });
    el.querySelector('[data-consent-no]').addEventListener('click', () => {
      const was = consent;
      consent = 'denied'; store.set('ams_consent', consent); el.hidden = true;
      if (was === 'granted') location.reload();   // כדי לפרוק סקריפטים שכבר נטענו
    });
  };

  if (cfg) {
    if (consent === 'granted') loadAnalytics();
    else if (consent !== 'denied') banner();
    document.querySelectorAll('[data-consent-open]').forEach((b) => b.addEventListener('click', banner));
  }

  // "שלחו לחבר": משלימים להודעה המוכנה את כתובת העמוד (הכתובת הקנונית כשיש דומיין)
  const canon = document.querySelector('link[rel="canonical"]');
  const pageUrl = canon ? canon.href : location.origin + location.pathname;
  document.querySelectorAll('[data-share]').forEach((a) => {
    a.href = 'https://wa.me/?text=' + encodeURIComponent(a.dataset.share + ' ' + pageUrl + (a.dataset.shareAnchor || ''));
  });

  // מדידת לחיצות על WhatsApp ועל היומן: רק אחרי הסכמה
  document.addEventListener('click', (e) => {
    if (!tracking()) return;
    const a = e.target.closest('a[href^="https://wa.me"], a[data-booking]');
    if (!a) return;
    const booking = a.hasAttribute('data-booking');
    const where = a.dataset.cta || a.dataset.booking || (a.closest('section[id]') || {}).id || 'other';
    const event = a.hasAttribute('data-share') ? 'share_click'
      : booking ? 'booking_click' : (/guide/.test(where) ? 'guide_request' : 'whatsapp_click');
    if (typeof window.gtag === 'function') window.gtag('event', event, { cta: where, page: location.pathname, source });
    if (typeof window.fbq === 'function' && event !== 'share_click') {
      window.fbq('track', event === 'guide_request' ? 'Lead' : (booking ? 'Schedule' : 'Contact'), { cta: where });
    }
  });

  // תפריט נגישות: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, גופן קריא, עצירת אנימציות.
  // ההגדרות נשמרות בדפדפן בלבד (localStorage) ומוחלות כבר ב־<head> כדי שלא יהבהבו.
  (() => {
    const html = document.documentElement;
    let prefs = {};
    try { prefs = JSON.parse(store.get('ams_a11y') || '{}') || {}; } catch (e) { prefs = {}; }
    const save = () => store.set('ams_a11y', JSON.stringify(prefs));
    const apply = () => {
      if (prefs.size) html.setAttribute('data-a11y-size', prefs.size); else html.removeAttribute('data-a11y-size');
      ['contrast', 'links', 'font', 'still'].forEach((k) => html.classList.toggle('a11y-' + k, !!prefs[k]));
      window.dispatchEvent(new Event('resize'));
    };
    const toggles = [['contrast', 'ניגודיות גבוהה'], ['links', 'הדגשת קישורים'], ['font', 'גופן קריא'], ['still', 'עצירת אנימציות']];

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'a11y-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'a11y-panel');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2" fill="currentColor"/>' +
      '<path d="M4 8.5l8 1.5 8-1.5M12 10v5m0 0l-4 6m4-6l4 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>נגישות</span>';

    const panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.id = 'a11y-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-labelledby', 'a11y-title');
    panel.innerHTML = '<p class="a11y-title" id="a11y-title">הגדרות נגישות</p>' +
      '<div class="a11y-size" role="group" aria-label="גודל טקסט"><span>גודל טקסט</span>' +
      '<button type="button" data-a11y-size="-1" aria-label="הקטנת טקסט">א−</button>' +
      '<output data-a11y-level aria-live="polite">100%</output>' +
      '<button type="button" data-a11y-size="1" aria-label="הגדלת טקסט">א+</button></div>' +
      toggles.map(([k, t]) => '<button type="button" class="a11y-toggle" data-a11y="' + k + '" aria-pressed="false">' + t + '</button>').join('') +
      '<button type="button" class="a11y-reset" data-a11y-reset>איפוס הגדרות</button>' +
      '<a class="a11y-link" href="' + ROOT + 'accessibility.html">הצהרת נגישות</a>';

    const levels = ['100%', '115%', '130%', '150%'];
    const sync = () => {
      panel.querySelector('[data-a11y-level]').textContent = levels[prefs.size || 0];
      panel.querySelectorAll('[data-a11y]').forEach((b) => b.setAttribute('aria-pressed', prefs[b.dataset.a11y] ? 'true' : 'false'));
    };
    const close = (focus) => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); };
    btn.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.querySelector('button').focus();
    });
    panel.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.a11ySize) prefs.size = Math.max(0, Math.min(3, (prefs.size || 0) + Number(t.dataset.a11ySize)));
      else if (t.dataset.a11y) prefs[t.dataset.a11y] = !prefs[t.dataset.a11y];
      else if (t.hasAttribute('data-a11y-reset')) prefs = {};
      if (!prefs.size) delete prefs.size;
      apply(); sync(); save();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(true); });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(false); });
    // הכפתור יושב בכותרת העליונה (תמיד גלוי ולא מסתיר טקסט); בדף בלי כותרת הוא צף בפינה
    const slot = document.querySelector('.header-actions');
    const wrap = document.createElement('div');
    wrap.className = slot ? 'a11y a11y-in-header' : 'a11y';
    wrap.append(btn, panel);
    if (slot) slot.prepend(wrap); else document.body.appendChild(wrap);
    apply(); sync();
  })();

  // סרטון אימון: מתנגן בלי קול כשמגיעים אליו, עם כפתור עצירה; ב"הפחתת תנועה" רק בלחיצה
  document.querySelectorAll('[data-clip]').forEach((video) => {
    const btn = video.parentElement.querySelector('[data-clip-toggle]');
    const big = video.parentElement.querySelector('[data-clip-play]');
    const mark = () => video.parentElement.classList.toggle('is-playing', !video.paused);
    video.addEventListener('play', mark);
    video.addEventListener('pause', mark);
    if (big) big.addEventListener('click', () => { video.play().catch(() => {}); });
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let userPaused = still;
    const label = () => { btn.textContent = video.paused ? 'הפעלה' : 'עצירה'; };
    btn.hidden = false;
    label();
    btn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); }
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

  // ניווט פנימי בדף שירות: מסמן את המקטע שעל המסך
  const subnav = document.querySelector('[data-subnav]');
  if (subnav && 'IntersectionObserver' in window) {
    const links = [...subnav.querySelectorAll('a[href^="#"]')];
    const map = new Map(links.map((a) => [document.querySelector(a.getAttribute('href')), a]).filter(([s]) => s));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(en.target);
        a.setAttribute('aria-current', 'true');
        a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, s) => io.observe(s));
  }

  // המלצות בטלפון: רמז שאפשר להחליק הצידה
  document.querySelectorAll('.reviews-grid').forEach((grid) => {
    if (grid.children.length < 2) return;
    const hint = document.createElement('p');
    hint.className = 'reviews-hint';
    const more = grid.children.length - 1;
    hint.textContent = more === 1 ? 'החליקו הצידה להמלצה נוספת' : 'החליקו הצידה לעוד ' + more + ' המלצות';
    grid.after(hint);
  });

  // הגדלת תמונות בגלריה
  const box = document.querySelector('[data-lightbox]');
  if (box && typeof box.showModal === 'function') {
    const big = box.querySelector('img');
    document.querySelectorAll('[data-lightbox-src]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const img = btn.querySelector('img');
        big.src = btn.dataset.lightboxSrc;
        big.alt = img ? img.alt : '';
        box.showModal();
      });
    });
    box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('[data-lightbox-close]')) box.close(); });
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
