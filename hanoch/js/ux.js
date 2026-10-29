/* חוויית גלילה בדף הבית: גלילה חלקה בגלגלת (Lenis, רק במחשב), פס התקדמות, כותרת שמתפנה בגלילה למטה וחוזרת למעלה,
   סימון החלק הנוכחי בתפריט, חלקים שנכנסים בעדינות, סרגל וואטסאפ שמופיע אחרי הפתיחה, ונקודות ניווט לחבילות בטלפון.
   מי שביקש פחות תנועה מקבל גלילה רגילה ובלי אנימציות כניסה. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  // פחות תנועה: לפי הגדרת המערכת או לפי "עצירת אנימציות" בתפריט הנגישות (ראו הסקריפט בראש index.html)
  var reduce = !document.documentElement.classList.contains('motion');
  var fine = matchMedia('(pointer: fine)').matches;
  var top = d.querySelector('.top'), dock = d.querySelector('.dock');
  var headH = function () { return top ? top.offsetHeight : 0; };

  /* ---------- גלילה חלקה ---------- */
  var lenis = null;
  if (!reduce && fine && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true,
      prevent: function (n) { return !!(n.closest && n.closest('.ht-panel, .ht-body, .a11y__panel, .cmp-wrap, .menu-sheet, [data-lenis-prevent]')); } });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
  }
  // משך הקפיצה לפי המרחק: קפיצה קצרה מגיבה מהר, מסע ארוך לא נגרר
  function travel(el) { var dist = Math.abs(el.getBoundingClientRect().top); return Math.min(1.5, Math.max(.6, .45 + .35 * Math.log2(1 + dist / innerHeight))); }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var el = d.getElementById(id.slice(1)); if (!el) return;
    e.preventDefault();
    var menu = d.querySelector('.menu[open]'); if (menu) menu.open = false;
    // בירידה הכותרת מתפנה, אז אין צורך להשאיר לה מקום. בעלייה היא חוזרת, ולכן משאירים מקום
    if (lenis) lenis.scrollTo(el, { offset: el.getBoundingClientRect().top > 0 ? -24 : -headH() - 8, duration: travel(el) });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
    if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });

  /* ---------- כותרת עליונה ופס התקדמות ---------- */
  var bar = null;
  if (top) { bar = d.createElement('div'); bar.className = 'scroll-bar'; bar.setAttribute('aria-hidden', 'true'); top.appendChild(bar); }
  var lastY = scrollY, ticking = false;
  function update() {
    ticking = false;
    var y = scrollY, max = root.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    if (top) {
      top.classList.toggle('is-scrolled', y > 8);
      var busy = d.querySelector('.menu[open]') || top.contains(d.activeElement);
      if (!busy && y > lastY + 4 && y > 220) top.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 220 || busy) top.classList.remove('is-hidden');
    }
    lastY = y;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
  if (top) top.addEventListener('focusin', function () { top.classList.remove('is-hidden'); });

  /* ---------- תפריט בטלפון: נסגר בלחיצה בחוץ או ב-Escape ---------- */
  var menuEl = d.querySelector('.menu');
  if (menuEl) {
    d.addEventListener('click', function (e) { if (menuEl.open && !menuEl.contains(e.target)) menuEl.open = false; });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuEl.open) { menuEl.open = false; menuEl.querySelector('summary').focus(); } });
  }

  if (!('IntersectionObserver' in window)) return;

  /* ---------- סימון החלק הנוכחי בתפריט ---------- */
  var navLinks = [].slice.call(d.querySelectorAll('.nav a[href^="#"], .menu-sheet a[href^="#"]'));
  var watched = navLinks.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (watched.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    watched.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- סרגל הוואטסאפ בטלפון: מופיע רק אחרי שכפתור הפתיחה יצא מהמסך ---------- */
  var heroCta = d.querySelector('#hero .cta-row');
  if (dock && heroCta) {
    dock.classList.add('is-away');
    new IntersectionObserver(function (es) { dock.classList.toggle('is-away', es[0].isIntersecting); }).observe(heroCta);
  }
  // כשמקלדת פתוחה בטופס, הסרגל מתפנה כדי לא להסתיר את השדה
  d.addEventListener('focusin', function (e) { if (dock && e.target.matches('input, textarea')) dock.classList.add('is-typing'); });
  d.addEventListener('focusout', function () { if (dock) dock.classList.remove('is-typing'); });

  /* ---------- חלקים שנכנסים בעדינות ---------- */
  if (!reduce) {
    var sel = 'main > section:not(#hero) .sec-head, .promises li, .card, .globe, .show-media, .show-txt, .check-box, .brief-form fieldset, .brief-form > .btn, .tiles li, .showroom, .steps li, .plan, .cmp, .faq-list details, .final > *';
    var items = [].slice.call(d.querySelectorAll(sel));
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < innerHeight) return; // מה שכבר על המסך לא מוסתר
      var sibs = [].slice.call(el.parentNode.children).filter(function (x) { return items.indexOf(x) > -1; });
      el.style.setProperty('--rd', Math.min(sibs.indexOf(el), 5) * 70 + 'ms');
      el.classList.add('rv'); rv.observe(el);
    });
  }

  /* ---------- נקודות ניווט לחבילות בטלפון ---------- */
  var grid = d.querySelector('.plan-grid');
  if (grid) {
    var cards = [].slice.call(grid.children);
    var order = cards.slice().sort(function (a, b) { return (a.classList.contains('plan-star') ? -1 : 0) - (b.classList.contains('plan-star') ? -1 : 0); });
    var dots = d.createElement('div'); dots.className = 'plan-dots';
    order.forEach(function (c) {
      var b = d.createElement('button'); b.type = 'button';
      b.setAttribute('aria-label', 'לחבילת ' + c.querySelector('.plan-name').textContent);
      b.addEventListener('click', function () {
        var pad = parseFloat(getComputedStyle(grid).paddingInlineStart) || 0, gr = grid.getBoundingClientRect(), cr = c.getBoundingClientRect();
        grid.scrollBy({ left: cr.right - (gr.right - pad), behavior: reduce ? 'auto' : 'smooth' });
      });
      c._dot = b; dots.appendChild(b);
    });
    grid.after(dots);
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.intersectionRatio > .6) order.forEach(function (c) { c._dot.classList.toggle('on', c === e.target); }); });
    }, { root: grid, threshold: [.6] });
    cards.forEach(function (c) { pio.observe(c); });
    order[0]._dot.classList.add('on');
  }

  /* ---------- אישור קצר אחרי שליחת טופס ---------- */
  [].forEach.call(d.querySelectorAll('.check-form, .brief-form'), function (f) {
    var note = d.createElement('p'); note.className = 'sent-note'; note.setAttribute('role', 'status'); f.appendChild(note);
    f.addEventListener('submit', function () {
      // מי שהשאיר טלפון יודע שאחזור אליו גם בלי ההודעה. במחשב, שאין בו וואטסאפ, יש גם שיחה חוזרת
      var tel = f.querySelector('input[type=tel]'), left = tel && tel.value.replace(/\D/g, '').length >= 9;
      note.textContent = 'נפתח לכם וואטסאפ עם ההודעה. ' + (left ? 'השארתם טלפון, אז אחזור אליכם גם אם לא תשלחו אותה.' : 'נשאר רק ללחוץ על שליחה.');
      if (!left && window.HTMLDialogElement && matchMedia('(pointer: fine)').matches) {
        var b = d.createElement('button'); b.type = 'button'; b.className = 'sent-cb'; b.setAttribute('data-callback', ''); b.textContent = 'שאחזור אליכם בשעה נוחה';
        note.append(' אין וואטסאפ במחשב? ', b);
      }
      note.classList.add('on');
    });
  });
})();
