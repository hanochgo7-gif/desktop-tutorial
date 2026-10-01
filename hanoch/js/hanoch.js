/* חנוך גוטובסקי, אתר אישי: כל ההתנהגות.
   בלי GSAP, או כשביקשו "הפחתת תנועה": הכול מוצג מיד, בלי פתיח, בלי חלקיקים ובלי הצמדות. */
(function () {
  'use strict';

  var root = document.documentElement;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.remove('motion');
  var motion = root.classList.contains('motion');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var live = $('#live');
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

  /* ---------- נתוני הפרויקטים ---------- */
  var DATA = {
    gotovski: {
      name: 'ש. גוטובסקי', sub: 'תשתיות דלק מאז 1972', kind: 'עיצוב ובנייה מחדש · עברית / English', url: 'gotovski.co.il', color: '#1c82ad',
      story: 'חברה משפחתית שבונה תחנות דלק מאז 1972, עם לקוחות כמו פז, סונול ואמזון, ואתר שלא שידר שום דבר מזה. בניתי שפה שמרגישה כמו קבוצת בנייה גדולה: טיפוגרפיה כבדה, צילום על כל המסך, ותנועה בטוחה ושקולה כמו מנוף.',
      points: [
        'הדמיה חיה של הפסקת חשמל בחוות שרתים: רואים בזמן אמת איך מערכת הדלק מחזיקה את הגנרטורים. בעברית ובאנגלית.',
        'פרויקטים בגלילה אופקית מוצמדת, ורשימת תחומים עם תמונה שעוקבת אחרי העכבר.',
        'מעבר דומיין בלי לאבד דירוג: כל כתובת ישנה שגוגל מכיר מופנית לעמוד המתאים באתר החדש.',
        'תפריט נגישות עם עצירת אנימציות, ואתר בלי תנועה למי שביקש את זה ממערכת ההפעלה.'
      ],
      metrics: [['טעינה בטלפון (LCP)', '2.9s', '1.7s'], ['משקל העמוד', '1.26MB', '0.9MB']],
      palette: ['#111111', '#1c82ad', '#4fbbea', '#ede8de'], fonts: ['Heebo', 'Frank Ruhl Libre', 'Cousine']
    },
    ams: {
      name: 'AMS', sub: 'אביב משה שדמון · אגרוף תאילנדי ואימון אישי', kind: 'אתר חדש · תנועה אמיתית מתוך סרטון', url: 'ams · מזכרת בתיה', color: '#d4a24c',
      story: 'אביב מלמד מואי תאי, והשפה שלו היא תנועה, אז האתר היה צריך לזוז כמו שהוא זז. לקחתי סרטון אמיתי של אביב, העברתי את התנועה שלו לדמות מונפשת בזירה, והגלילה של המבקר היא שמניעה אותה.',
      points: [
        'פתיח מוצמד: 13 פריימים מצוירים על canvas. גוללים, ואביב עובר משמירה לברך תאילנדית וחוזר.',
        'התנועה אמיתית, מתוך סרטון של אביב, והועברה לדמות המונפשת ב-Higgsfield.',
        'כותרות בסגנון כרזת קרב, ו"איך מתחילים" בנוי על חבלי זירה.',
        'דף נפרד לכל שירות, ותפריט מסך מלא עם כל השירותים.'
      ],
      frames: 13,
      palette: ['#16110c', '#d4a24c', '#f2ece0', '#000000'], fonts: ['Karantina', 'IBM Plex Sans Hebrew', 'Archivo 125%']
    },
    allenbis: {
      name: 'אלנביס', sub: 'שתייה, חטיפים ומה שביניהם עד הבית', kind: 'שיפור חנות קיימת · בלי ספריות', url: 'allenbis.co.il', color: '#ffd84d',
      story: 'חנות משלוחים שכבר עבדה ומכרה, אבל רצה על שתי חבילות React כבדות, ולקוח בטלפון חיכה. בניתי אותה מחדש בלי ספריות בכלל: אותו קטלוג של 199 מוצרים ואותם מחירים, עם פי 24 פחות JavaScript.',
      points: [
        'בונה סל לפי תקציב: כותבים סכום ומקבלים סל מוכן.',
        'מחליקים מוצר כדי להסיר אותו מהסל, עם אפשרות לבטל.',
        'אימות גיל למוצרי 18+, וחיפוש שמבין מילים נרדפות.',
        'שלט ניאון "פתוח 24/7" ומצב לילה, לחנות שעובדת גם בלילה.'
      ],
      metrics: [['JavaScript', '480KB', '20KB'], ['נתונים בטעינה', '950KB', '365KB'], ['בקשות לשרת', '32', '19'], ['הצגה ראשונה', '260ms', '75ms']],
      palette: ['#1b4396', '#ffd84d', '#c8102e', '#0a0f1e'], fonts: ['Secular One', 'Assistant']
    },
    clinic: {
      name: 'רותם גוטובסקי', sub: 'קליניקה לקוסמטיקה טיפולית', kind: 'אתר וחנות · טיפול לפי מטרה', url: 'רותם גוטובסקי · p.m.e', color: '#c98f8a',
      story: 'רותם מטפלת לפי מטרה ולא לפי מכשיר, אז גם האתר מתחיל מהבעיה של המטופלת ולא מרשימת טיפולים. נייר רך, סריף עדין, ואיורים של צוות זעיר שעובד על המוצרים.',
      points: [
        'מאתר טיפול: בוחרים מה מפריע, אקנה, צלקות, פיגמנטציה או קמטים, ומגיעים לטיפול הנכון.',
        'חנות מוצרים עם סינון לפי מותג וסוג, חיפוש, מיון ותצוגה מהירה.',
        'הסרת שיער בלייזר ופדיקור טיפולי לסוכרתיים, כל אחד עם הסבר משלו.',
        'לפני ואחרי, שאלות נפוצות וקביעת תור.'
      ],
      palette: ['#fbf2ec', '#f0c7c2', '#c98f8a', '#000000'], fonts: ['Noto Serif Hebrew', 'Assistant']
    },
    falafel: {
      name: 'קייטרינג 4X4', sub: 'ניסים שרון · פלאפל וסביח לאירועים', kind: 'אתר חדש · שפה של דוכן רחוב', url: 'קייטרינג 4X4', color: '#f2b705',
      story: 'ניסים שרון מגיע עם ג׳יפ 4X4 לכל מקום, ממצוקי דרגות ועד שולחן על חוף ים המלח. האתר מדבר כמו דוכן רחוב טוב: צהוב שמש, כותרות של כרזת שוק, והאוכל בחזית.',
      points: [
        'כותרות ענקיות בסגנון כרזה, וצבעים שנלקחו מהלוגו ומהאיור.',
        'אירועים אמיתיים מהשטח: מצוקי דרגות, ים המלח, המכביה בחיפה.',
        'מצב כהה מלא, לגלישה בערב שלפני האירוע.',
        'וואטסאפ וטלפון בהישג יד מכל מקום בעמוד.'
      ],
      palette: ['#151314', '#f2b705', '#22b8dc', '#f1e7d0'], fonts: ['Karantina', 'Rubik']
    },
    rachel: {
      name: 'רחלי הורנשטיין', sub: 'שיעורי מתמטיקה פרטיים בזום', kind: 'אתר חדש · מחברת משבצות', url: 'rachelimath', color: '#2d8cff',
      story: 'הורה שמחפש מורה פרטית צריך להרגיש תוך חמש שניות שהילד בידיים טובות. לכן האתר נראה כמו מחברת חשבון טובה: נייר משבצות, כתב יד, ופנים אמיתיות של מורה עם 28 שנות ניסיון.',
      points: [
        'רקע של מחברת משבצות וכותרות בכתב יד.',
        'שאלות נפוצות שעונות על החששות של ההורים: האם זום עובד, מה עם ילד ביישן, האם יש התחייבות.',
        'מחירים שקופים לשיעור יחיד, לזוג ולקבוצה.',
        'נתונים מובנים לגוגל (עסק מקומי ושאלות נפוצות), ושיעור ניסיון בלחיצה בוואטסאפ.'
      ],
      palette: ['#1e3a8a', '#fffdf9', '#f28c9b', '#fff0ad', '#1fae82'], fonts: ['Assistant', 'Amatic SC', 'Secular One']
    }
  };
  var ORDER = $$('.project').map(function (li) { return li.dataset.id; });

  /* ---------- שעון ---------- */
  var clock = $('.clock');
  function tick() {
    try {
      clock.textContent = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }).format(new Date());
    } catch (e) { clock.textContent = ''; }
  }
  tick(); setInterval(tick, 20000);

  /* ---------- גלילה חלקה ---------- */
  var lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id === '#top' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { duration: 1.6 });
      else if (id === '#top') window.scrollTo({ top: 0, behavior: motion ? 'smooth' : 'auto' });
      else el.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
      if (el.tabIndex < 0 && el !== document.body) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
    });
  });

  /* ---------- חלקיקים ---------- */
  var P = null, glOn = false;
  var hero = $('.hero'), contact = $('.contact'), canvas = $('.gl');
  var st = { scatter: 1, intro: 1, mx: -9999, my: -9999, tx: -9999, ty: -9999, vx: 0, vy: 0, xray: 0 };
  var lastW = 0;

  function shapeItems(section, els) {
    var sr = section.getBoundingClientRect();
    return els.map(function (el) {
      var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return {
        text: el.textContent.trim(),
        font: '900 ' + cs.fontSize + ' "Frank Ruhl Libre"',
        letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
        x: r.right - sr.left,
        y: r.top - sr.top + r.height * 0.5
      };
    });
  }

  function buildShapes() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    P.resize(w, h, dpr);
    var count = Math.round(clamp(w * h / 46, 9000, 26000));
    var A = Particles.sample(shapeItems(hero, $$('.hero-title span')), w, hero.offsetHeight, count);
    var B = Particles.sample(shapeItems(contact, [$('.contact-title')]), w, contact.offsetHeight, count);
    P.setShapes(A, B);
    lastW = w;
  }

  function startParticles() {
    if (!motion || !window.Particles) return Promise.resolve();
    P = Particles.create(canvas);
    if (!P) return Promise.resolve();
    var fontReady = document.fonts && document.fonts.load
      ? Promise.race([
          Promise.all([document.fonts.load('900 100px "Frank Ruhl Libre"', 'חנוך'), document.fonts.ready]),
          new Promise(function (r) { setTimeout(r, 2500); })
        ])
      : Promise.resolve();
    return fontReady.catch(function () { }).then(function () {
      buildShapes();
      glOn = true;
      root.classList.add('gl-on');
      var resizeT;
      window.addEventListener('resize', function () {
        clearTimeout(resizeT);
        resizeT = setTimeout(function () {
          if (Math.abs(window.innerWidth - lastW) > 40) buildShapes();
          else P.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
        }, 200);
      });
    });
  }

  function onPointer(x, y) { st.tx = x; st.ty = y; }
  window.addEventListener('pointermove', function (e) { onPointer(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('pointerdown', function (e) { onPointer(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', function () { st.tx = -9999; st.ty = -9999; });

  var paperCol = [0.93, 0.91, 0.87], hotCol = [1, 0.31, 0.1], blueCol = [0.24, 0.48, 1], whiteCol = [1, 1, 1];
  var colNow = paperCol.slice(), hotNow = hotCol.slice();

  function frame(time) {
    if (!glOn || document.hidden) return;
    var vh = window.innerHeight;
    var hr = hero.getBoundingClientRect(), cr = contact.getBoundingClientRect();
    var heroProg = clamp(-hr.top / hr.height, 0, 1);
    var contactProg = clamp(1 - cr.top / vh, 0, 1);

    // עכבר עם השהיה, ומהירות שדועכת
    if (st.tx < -9000) { st.mx = st.tx; st.my = st.ty; }
    else {
      if (st.mx < -9000) { st.mx = st.tx; st.my = st.ty; }
      var nx = st.mx + (st.tx - st.mx) * 0.14, ny = st.my + (st.ty - st.my) * 0.14;
      st.vx = st.vx * 0.86 + (nx - st.mx) * 1.6;
      st.vy = st.vy * 0.86 + (ny - st.my) * 1.6;
      st.mx = nx; st.my = ny;
    }

    var inContact = contactProg > 0;
    var scatter = inContact ? Math.pow(1 - contactProg, 1.4) : Math.max(st.intro, heroProg * 1.15);
    var visible = root.classList.contains('stage-on') ? inContact : (heroProg < 1 || inContact);
    var k = st.xray ? 1 : 0;
    for (var i = 0; i < 3; i++) {
      colNow[i] += ((k ? blueCol : paperCol)[i] - colNow[i]) * 0.08;
      hotNow[i] += ((k ? whiteCol : hotCol)[i] - hotNow[i]) * 0.08;
    }
    if (!visible && st.blank) return;
    st.blank = !visible;
    P.draw({
      time: time, mx: st.mx, my: st.my, vx: clamp(st.vx, -260, 260), vy: clamp(st.vy, -260, 260),
      rad: Math.min(window.innerWidth, vh) * 0.13,
      offA: hr.top, offB: cr.top,
      morph: inContact ? 1 : 0,
      scatter: clamp(scatter, 0, 1.6),
      alpha: visible ? 1 : 0,
      col: colNow, hot: hotNow
    });
  }

  /* ---------- פתיח ---------- */
  function runIntro() {
    var intro = $('.intro');
    if (!motion) { if (intro) intro.remove(); st.intro = 0; return Promise.resolve(); }
    var quick = false;
    try { quick = sessionStorage.getItem('hg-intro') === '1'; sessionStorage.setItem('hg-intro', '1'); } catch (e) { }
    if (lenis) lenis.stop();

    var svg = $('.intro-grid'), ns = 'http://www.w3.org/2000/svg';
    var vw = window.innerWidth, vh = window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    var lines = [];
    function line(x1, y1, x2, y2, major) {
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      if (major) l.setAttribute('class', 'major');
      var len = Math.hypot(x2 - x1, y2 - y1);
      l.style.strokeDasharray = len; l.style.strokeDashoffset = len;
      svg.appendChild(l); lines.push(l);
    }
    var cols = vw < 700 ? 4 : 12, rows = vw < 700 ? 8 : 6;
    for (var c = 1; c < cols; c++) line(vw * c / cols, 0, vw * c / cols, vh, c === cols / 2);
    for (var r = 1; r < rows; r++) line(0, vh * r / rows, vw, vh * r / rows, r === rows / 2);
    line(0, 0, vw, vh, false); line(vw, 0, 0, vh, false);

    var text = 'חנוך גוטובסקי', out = $('.intro-text'), pct = $('.intro-pct');
    var counter = { n: 0, c: 0 };
    var tl = gsap.timeline();
    tl.to(lines, { strokeDashoffset: 0, duration: quick ? 0.4 : 1.1, ease: 'expo.inOut', stagger: quick ? 0.01 : 0.035 }, 0)
      .to(counter, {
        c: text.length, duration: quick ? 0.3 : 0.75, ease: 'none',
        onUpdate: function () { out.textContent = text.slice(0, Math.round(counter.c)); }
      }, quick ? 0.05 : 0.3)
      .to(counter, {
        n: 100, duration: quick ? 0.5 : 1.5, ease: 'power2.inOut',
        onUpdate: function () { pct.textContent = String(Math.round(counter.n)).padStart(3, '0'); }
      }, 0)
      .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, quick ? 0.6 : 1.75)
      .to(st, { intro: 0, duration: 2.4, ease: 'expo.out' }, quick ? 0.75 : 1.95);

    function skip() { tl.timeScale(4); }
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, skip, { once: true, passive: true }); });

    return new Promise(function (resolve) {
      tl.eventCallback('onComplete', function () {
        intro.remove();
        if (lenis) lenis.start();
        resolve();
      });
      // אחרי שהמסך נחשף, הגלילה פתוחה גם אם החלקיקים עוד מתיישבים
      tl.call(function () { if (lenis) lenis.start(); }, null, quick ? 1.2 : 2.5);
      // הבמה התלת־ממדית נכנסת יחד עם החשיפה
      tl.call(function () { HG.introDone = true; window.dispatchEvent(new Event('hg:intro')); }, null, quick ? 0.7 : 1.85);
    });
  }

  /* ---------- מניפסט: מילה אחרי מילה ---------- */
  function initManifesto() {
    var el = $('[data-words]');
    if (!el || !motion) return;
    var hl = ['השנייה', 'הראשונה:'];
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span class="w' + (hl.indexOf(w) > -1 ? ' hl' : '') + '" aria-hidden="true">' + w + '</span>';
    }).join(' ');
    var spans = $$('.w', el);
    ScrollTrigger.create({
      trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: true,
      onUpdate: function (s) {
        var n = Math.round(s.progress * spans.length);
        spans.forEach(function (sp, i) { sp.classList.toggle('on', i < n); });
      }
    });
  }

  /* ---------- עבודות ---------- */
  function initProjects() {
    $$('.project').forEach(function (li) {
      var media = $('.p-media', li), view = $('.browser-view', li), img = $('.p-tall', li);

      // המסך "חי": במעבר עכבר העמוד נגלל בתוך הדפדפן
      media.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        var max = img.offsetHeight - view.offsetHeight;
        if (max <= 0) return;
        img.style.setProperty('--dur', Math.max(2.4, max / 520) + 's');
        img.style.setProperty('--y', -max + 'px');
      });
      media.addEventListener('pointerleave', function () {
        img.style.setProperty('--dur', '1.1s');
        img.style.setProperty('--y', '0px');
      });
      media.addEventListener('click', function () { openCase(li.dataset.id, li); });
      $('.p-open', li).addEventListener('click', function () { openCase(li.dataset.id, li); });

      if (!motion) return;
      var browser = $('.browser', li), phone = $('.p-phone', li), info = $$('.p-info > *', li);
      gsap.set(browser, { clipPath: 'inset(100% 0% 0% 0% round 14px)' });
      gsap.set(img, { scale: 1.2, transformOrigin: '50% 0%' });
      gsap.set(phone, { autoAlpha: 0, y: 80 });
      gsap.set(info, { autoAlpha: 0, y: 34 });
      gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 80%', once: true } })
        .to(browser, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.4, ease: 'expo.out' })
        .to(img, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'scale' }, 0)
        .to(phone, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out' }, 0.35)
        .to(info, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07 }, 0.2);
      gsap.to(phone, { yPercent: -22, ease: 'none', scrollTrigger: { trigger: li, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    if (!motion) return;
    // הטיה לפי מהירות הגלילה
    var skew = { v: 0 };
    var set = gsap.quickSetter('.p-media', 'skewY', 'deg');
    var lim = gsap.utils.clamp(-4, 4);
    ScrollTrigger.create({
      trigger: '.projects', start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) {
        var v = lim(s.getVelocity() / -380);
        if (Math.abs(v) > Math.abs(skew.v)) {
          skew.v = v;
          gsap.to(skew, { v: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: function () { set(skew.v); } });
        }
      }
    });
  }

  /* ---------- סיפור פרויקט ---------- */
  var caseEl = $('.case'), caseBg = $('.case-bg'), caseScroll = $('.case-scroll'), caseBrowser = $('.case-browser');
  var current = null, opener = null, framesTimer = null;

  function fillCase(id) {
    var d = DATA[id], i = ORDER.indexOf(id);
    current = id;
    caseEl.dataset.id = id;
    caseEl.style.setProperty('--p', d.color);
    $('.case-url').textContent = d.url;
    var poster = $('.case-poster');
    poster.src = 'work/' + id + '-poster.webp';
    poster.alt = 'דף הבית של ' + d.name;
    $('.case-num').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(ORDER.length).padStart(2, '0');
    $('#case-title').textContent = d.name;
    $('.case-sub').textContent = d.sub;
    $('.case-kind').textContent = d.kind;
    $('.case-story').textContent = d.story;
    $('.case-points').innerHTML = d.points.map(function (p) { return '<li><span>' + p + '</span></li>'; }).join('');
    $('.swatches').innerHTML = d.palette.map(function (c) { return '<li><i style="background:' + c + '"></i>' + c + '</li>'; }).join('');
    $('.case-fonts').innerHTML = d.fonts.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    var m = $('.case-metrics');
    m.innerHTML = d.metrics ? '<h3 class="label mono">לפני → אחרי</h3>' + d.metrics.map(function (r) {
      return '<div><span>' + r[0] + '</span><b><s>' + r[1] + '</s>' + r[2] + '</b></div>';
    }).join('') : '';
    var ph = $('.case-phone');
    ph.src = 'work/' + id + '-mob.webp';
    ph.alt = d.name + ' בטלפון';
    var next = ORDER[(i + 1) % ORDER.length];
    $('.case-next-name').textContent = DATA[next].name;
    $('.case-next').dataset.next = next;

    // ב-AMS: הפריימים האמיתיים מהפתיח, מונעים בתנועת העכבר
    clearInterval(framesTimer);
    var old = $('.case-frames');
    if (old) old.remove();
    if (d.frames) {
      var box = document.createElement('figure');
      box.className = 'case-frames';
      box.innerHTML = '<img alt="אביב בזירה, משמירה לברך תאילנדית" width="480" height="480"><figcaption class="mono">הזיזו את העכבר מצד לצד: אלה 13 הפריימים מהפתיח</figcaption>';
      $('.case-main').appendChild(box);
      var fimg = $('img', box), frames = [];
      for (var f = 1; f <= d.frames; f++) { frames.push('work/ams/f' + String(f).padStart(3, '0') + '.webp'); new Image().src = frames[f - 1]; }
      fimg.src = frames[0];
      var auto = 0;
      box.addEventListener('pointermove', function (e) {
        clearInterval(framesTimer);
        var r = box.getBoundingClientRect();
        var p = clamp((r.right - e.clientX) / r.width, 0, 0.999);
        fimg.src = frames[Math.floor(p * frames.length)];
      });
      if (motion) framesTimer = setInterval(function () {
        auto = (auto + 1) % (frames.length * 2 - 2);
        var idx = auto < frames.length ? auto : frames.length * 2 - 2 - auto;
        fimg.src = frames[idx];
      }, 140);
    }
  }

  function openCase(id, li) {
    opener = li;
    fillCase(id);
    var src = $('.browser', li).getBoundingClientRect();
    $('.p-tall', li).style.setProperty('--y', '0px');
    caseEl.hidden = false;
    caseScroll.scrollTop = 0;
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    $('.case-close').focus({ preventScroll: true });
    say('נפתח: ' + DATA[id].name);
    if (!motion) return;

    var tgt = caseBrowser.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = src.width / tgt.width;
    var reveal = $$('.case-head > *, .case-grid, .case-next');
    gsap.set(reveal, { autoAlpha: 0, y: 40 });
    gsap.timeline()
      .fromTo(caseBg,
        { clipPath: 'inset(' + src.top + 'px ' + (vw - src.right) + 'px ' + (vh - src.bottom) + 'px ' + src.left + 'px round 14px)' },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1, ease: 'expo.inOut' }, 0)
      .fromTo(caseBrowser,
        { x: src.left - tgt.left, y: src.top - tgt.top, scale: s, transformOrigin: '0 0' },
        { x: 0, y: 0, scale: 1, duration: 1.1, ease: 'expo.inOut' }, 0)
      .fromTo('.case-close', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.6)
      .to(reveal, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.75);
  }

  function closeCase() {
    if (caseEl.hidden) return;
    clearInterval(framesTimer);
    function done() {
      caseEl.hidden = true;
      if (window.gsap) gsap.set(caseEl, { clearProps: 'opacity,transform' });
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      if (opener) $('.p-open', opener).focus({ preventScroll: true });
    }
    if (!motion) return done();
    gsap.to(caseEl, { autoAlpha: 0, scale: 0.98, duration: 0.45, ease: 'power3.in', onComplete: function () { gsap.set(caseEl, { autoAlpha: 1 }); done(); } });
  }

  function nextCase() {
    var next = $('.case-next').dataset.next;
    opener = $('.project[data-id="' + next + '"]');
    if (!motion) { fillCase(next); caseScroll.scrollTop = 0; return; }
    var body = $$('.case-hero, .case-body');
    gsap.to(body, {
      autoAlpha: 0, y: -30, duration: 0.45, ease: 'power3.in', onComplete: function () {
        fillCase(next);
        caseScroll.scrollTop = 0;
        gsap.fromTo(body, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 });
        say('נפתח: ' + DATA[next].name);
      }
    });
  }

  $('.case-close').addEventListener('click', closeCase);
  $('.case-next').addEventListener('click', nextCase);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCase();
    if (e.key === 'Tab' && !caseEl.hidden) {
      var f = $$('button, a[href]', caseEl).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- לפני / אחרי ---------- */
  function initCompare() {
    var screen = $('.phone-screen'), after = $('.ba-after'), handle = $('.ba-handle'), range = $('.ba-range');
    var s = { t: 50, c: 50, v: 0 }, dragging = false, running = false, visible = false;

    function render(time) {
      var prev = s.c;
      s.c += (s.t - s.c) * (motion ? 0.12 : 1);
      s.v = s.v * 0.9 + Math.abs(s.c - prev);
      var amp = motion ? 0.6 + Math.min(s.v, 6) * 0.9 : 0;
      var pts = ['0% 0%'];
      var steps = 28;
      for (var i = 0; i <= steps; i++) {
        var y = i / steps;
        var x = s.c + Math.sin(y * 9 + time * 2.2) * amp + Math.sin(y * 23 - time * 3.1) * amp * 0.45;
        pts.push(x.toFixed(2) + '% ' + (y * 100).toFixed(2) + '%');
      }
      pts.push('0% 100%');
      after.style.clipPath = 'polygon(' + pts.join(',') + ')';
      handle.style.setProperty('--x', s.c + '%');
    }
    function loop() {
      if (!running) return;
      render(performance.now() / 1000);
      requestAnimationFrame(loop);
    }
    function setFrom(e) {
      var r = screen.getBoundingClientRect();
      s.t = clamp((e.clientX - r.left) / r.width * 100, 0, 100);
      range.value = Math.round(s.t);
      if (!motion) render(0);
    }
    screen.addEventListener('pointerdown', function (e) { dragging = true; screen.setPointerCapture(e.pointerId); setFrom(e); });
    screen.addEventListener('pointermove', function (e) { if (dragging || e.pointerType === 'mouse') setFrom(e); });
    screen.addEventListener('pointerup', function () { dragging = false; });
    screen.addEventListener('pointercancel', function () { dragging = false; });
    range.addEventListener('input', function () { s.t = +range.value; if (!motion) render(0); });
    render(0);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !running && motion) { running = true; loop(); }
        if (!visible) running = false;
      }).observe(screen);
    }

    if (!motion) return;
    ScrollTrigger.create({
      trigger: '.ba-stage', start: 'top 70%', once: true,
      onEnter: function () {
        gsap.timeline()
          .to(s, { t: 88, duration: 1.1, ease: 'power3.inOut' })
          .to(s, { t: 14, duration: 1.3, ease: 'power3.inOut' })
          .to(s, { t: 50, duration: 1, ease: 'power3.inOut', onComplete: function () { range.value = 50; } });
      }
    });

    // המספרים מתכווצים מול העיניים
    $$('.metric').forEach(function (m, i) {
      var b = $('b', m), from = +m.dataset.from, to = +m.dataset.to, unit = m.dataset.unit;
      var o = { n: from };
      b.textContent = from + unit;
      ScrollTrigger.create({
        trigger: m, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(o, {
            n: to, duration: 1.8, delay: i * 0.12, ease: 'expo.inOut',
            onUpdate: function () { b.textContent = Math.round(o.n) + unit; },
            onComplete: function () { m.classList.add('done'); }
          });
        }
      });
    });
  }

  /* ---------- תהליך: הכרטיס נבנה ---------- */
  function initCraft() {
    var spec = $('.specimen'), steps = $$('.step'), capN = $('.cap-n'), capT = $('.cap-t');
    var names = ['שרטוט', 'שלד', 'חומר', 'תנועה'];
    function stage(n) {
      if (spec.dataset.stage === String(n)) return;
      spec.dataset.stage = n;
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === n); });
      capN.textContent = '0' + (n + 1);
      capT.textContent = names[n];
    }
    if (!motion) {
      stage(2);
      steps.forEach(function (s) { s.classList.add('is-on'); });
      return;
    }
    ScrollTrigger.create({
      trigger: '.craft', start: 'top top', end: '+=260%', pin: true, pinSpacing: true, anticipatePin: 1,
      onUpdate: function (s) { stage(Math.min(3, Math.floor(s.progress * 4))); }
    });
  }

  /* ---------- סמן ומגנטים ---------- */
  function initCursor() {
    if (!motion || !finePointer) return;
    root.classList.add('has-cursor');
    var cur = $('.cursor'), label = $('.cursor-label');
    var xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    var yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) {
      xTo(e.clientX); yTo(e.clientY);
      var t = e.target;
      var view = (t.closest && t.closest('.p-media')) || ($('.hero').classList.contains('relic-hover') && t.closest && t.closest('.hero'));
      var drag = t.closest && t.closest('.phone-screen, .p-relic, .case-relic');
      var link = t.closest && t.closest('a, button, input');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-drag', !view && !!drag);
      cur.classList.toggle('is-link', !view && !drag && !!link);
      label.textContent = view ? 'פתיחה' : drag ? (drag.classList.contains('phone-screen') ? 'גררו' : 'סובבו') : '';
    }, { passive: true });

    $$('.magnetic').forEach(function (el) {
      var inner = el.firstElementChild;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: dx * 0.35, y: dy * 0.35, duration: 0.5, ease: 'power3' });
        gsap.to(inner, { x: dx * 0.15, y: dy * 0.15, duration: 0.5, ease: 'power3' });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to([el, inner], { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, .35)' });
      });
    });
  }

  /* ---------- רנטגן ---------- */
  function initXray() {
    var btn = $('.xray-toggle'), lens = $('.lens'), box = $('.inspect'), lab = $('.inspect-label');
    var px = -999, py = -999, raf = 0;
    function setX(on) {
      root.classList.toggle('xray', on);
      root.classList.toggle('lens-on', on && finePointer);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      st.xray = on ? 1 : 0;
      if (!on) box.classList.remove('on');
      say(on ? 'מצב רנטגן פעיל: רואים את השלד שמתחת לעיצוב' : 'מצב רנטגן כבוי');
    }
    btn.addEventListener('click', function () { setX(!root.classList.contains('xray')); });
    $('.foot-xray').addEventListener('click', function () { setX(!root.classList.contains('xray')); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'x' || e.key === 'X' || e.key === 'ס') && !e.metaKey && !e.ctrlKey && !e.altKey && !/input|textarea|select/i.test(e.target.tagName)) {
        setX(!root.classList.contains('xray'));
      }
    });

    function describe(el) {
      var cs = getComputedStyle(el), r = el.getBoundingClientRect();
      var cls = (typeof el.className === 'string' && el.className.trim()) ? '.' + el.className.trim().split(/\s+/)[0] : '';
      var fam = cs.fontFamily.split(',')[0].replace(/["']/g, '');
      return el.tagName.toLowerCase() + cls + '  ' + Math.round(r.width) + '×' + Math.round(r.height) +
        '  ·  ' + fam + ' ' + cs.fontWeight + ' / ' + Math.round(parseFloat(cs.fontSize)) + 'px';
    }
    function inspect() {
      raf = 0;
      if (finePointer) { lens.style.transform = 'translate(' + px + 'px,' + py + 'px)'; }
      var el = document.elementFromPoint(px, py);
      if (!el || el === document.body || el === root || el.tagName === 'MAIN' || el.tagName === 'CANVAS' || el.closest('.bar')) {
        box.classList.remove('on'); return;
      }
      var r = el.getBoundingClientRect();
      box.style.transform = 'translate(' + r.left + 'px,' + r.top + 'px)';
      box.style.width = r.width + 'px';
      box.style.height = r.height + 'px';
      box.classList.toggle('flip', r.top < 40);
      lab.textContent = describe(el);
      box.classList.add('on');
    }
    function queue(e) {
      if (!root.classList.contains('xray')) return;
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(inspect);
    }
    window.addEventListener('pointermove', queue, { passive: true });
    window.addEventListener('pointerdown', queue, { passive: true });
    window.addEventListener('scroll', function () { if (root.classList.contains('xray') && px > -999 && !raf) raf = requestAnimationFrame(inspect); }, { passive: true });
  }

  /* ---------- צלילים: מסונתזים בדפדפן, כבויים עד שמבקשים ---------- */
  var sfx = (function () {
    var ctx = null, master = null, on = false, drone = null;
    var notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // סולם פנטטוני
    function ensure() {
      if (ctx) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      return true;
    }
    function startDrone() {
      if (drone) return;
      var g = ctx.createGain(); g.gain.value = 0.05;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      [55, 82.41, 110.3].forEach(function (hz, i) {
        var o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = hz; o.detune.value = i * 4;
        o.connect(f); o.start();
      });
      f.connect(g); g.connect(master); drone = g;
    }
    function env(node, peak, decay) {
      var t = ctx.currentTime;
      node.gain.setValueAtTime(0.0001, t);
      node.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      node.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    }
    return {
      toggle: function () {
        if (!ensure()) return false;
        on = !on;
        if (ctx.state === 'suspended') ctx.resume();
        if (on) startDrone();
        master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.25);
        return on;
      },
      ting: function (i) {
        if (!on) return;
        var hz = notes[i % notes.length];
        [1, 2.76, 5.4].forEach(function (m, k) { // צליל זכוכית: יסוד ועליונים לא הרמוניים
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = hz * m; o.connect(g); g.connect(master);
          env(g, [0.14, 0.05, 0.02][k], [1.6, 0.9, 0.5][k]);
          o.start(); o.stop(ctx.currentTime + 1.7);
        });
      },
      whoosh: function () {
        if (!on) return;
        var len = ctx.sampleRate * 0.9, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.4;
        f.frequency.setValueAtTime(300, ctx.currentTime);
        f.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.7);
        src.connect(f); f.connect(g); g.connect(master);
        env(g, 0.22, 0.85); src.start();
      }
    };
  })();
  var soundBtn = $('.sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', function () {
    var on = sfx.toggle();
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    root.classList.toggle('sound-on', on);
    say(on ? 'צלילים פעילים' : 'צלילים כבויים');
  });

  var HG = window.HG = { openCase: function (id, li) { openCase(id, li); }, introDone: !motion, sfx: sfx };

  /* ---------- הפעלה ---------- */
  initManifesto();
  initProjects();
  initCompare();
  initCraft();
  initCursor();
  initXray();

  if (motion) {
    gsap.ticker.add(frame);
    var introDone = runIntro();
    startParticles();
    introDone.then(function () { ScrollTrigger.refresh(); });
    // הצמדה משנה גבהים: מחשבים מחדש אחרי שהגופנים נטענו
    if (document.fonts) document.fonts.ready.then(function () { ScrollTrigger.refresh(); }, function () { });
  } else {
    runIntro();
  }
})();
