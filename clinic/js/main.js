/* רותם גוטובסקי: סקריפט ראשי (דף הבית ודף החנות) */
(function () {
  'use strict';
  var root = document.documentElement, body = document.body;
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(pointer: fine)').matches;
  function noMotion() { return mq.matches; }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  var WA = 'https://wa.me/972545779379';
  var escapeHtml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* טעינה */
  window.addEventListener('load', function () { body.classList.add('is-loaded'); });
  requestAnimationFrame(function () { $$('[data-split]').forEach(function (el) { el.classList.add('is-in'); }); });

  /* פס התקדמות + כותרת נסתרת בגלילה + חזרה למעלה */
  var header = $('.site-header'), toTop = $('#to-top'), lastY = window.scrollY, ticking = false;
  var parallax = $$('[data-parallax]').map(function (el) { return { el: el, k: parseFloat(el.getAttribute('data-parallax')) || 0 }; });
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    root.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', y > 320 && y > lastY + 4 && !body.classList.contains('menu-open'));
    }
    if (toTop) toTop.classList.toggle('is-on', y > 600);
    if (parallax.length && !noMotion()) {
      var vh = window.innerHeight;
      parallax.forEach(function (d) {
        var r = d.el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = (r.top + r.height / 2 - vh / 2) * d.k;
        d.el.style.setProperty('--py', off.toFixed(1) + 'px');
      });
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: noMotion() ? 'auto' : 'smooth' }); });

  /* סמן מותאם */
  var cursor = $('.cursor');
  if (cursor && fine && !noMotion()) {
    var cx = 0, cy = 0, tx = 0, ty = 0, raf;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; cursor.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(tick); });
    function tick() { cx += (tx - cx) * .22; cy += (ty - cy) * .22; cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px'; raf = (Math.abs(tx - cx) > .2 || Math.abs(ty - cy) > .2) ? requestAnimationFrame(tick) : null; }
    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
    document.addEventListener('mouseover', function (e) { cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, input, select, .product')); });
  }

  /* וידאו ברקע: מכבדים הפחתת תנועה */
  function syncVideos() {
    var off = noMotion() || document.documentElement.classList.contains('a11y-motion');
    $$('video[autoplay]').forEach(function (v) { if (off) { v.pause(); } else if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } });
  }
  syncVideos(); window.syncSiteVideos = syncVideos;

  /* תפריט נייד */
  var toggle = $('.nav-toggle'), menu = $('#mobile-menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    if (open) { var first = $('a', menu); if (first) setTimeout(function () { first.focus(); }, 60); }
  }
  /* לכידת מיקוד בתוך התפריט הפתוח */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !menu || !menu.classList.contains('is-open')) return;
    var items = [toggle].concat($$('a, button', menu).filter(function (el) { return el.offsetParent !== null; }));
    var i = items.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
  }


  /* טופס הרשמה לתור: נפתח בוואטסאפ עם הפרטים */
  var bookForm = $('#book-form');
  if (bookForm) {
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('.spa-field', bookForm).forEach(function (f) {
        var el = f.querySelector('input, textarea'), bad = el.required && !el.value.trim();
        f.classList.toggle('is-invalid', bad); if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok) { showToast('חסרים שם וטלפון'); return; }
      var d = new FormData(bookForm);
      var lines = ['היי, אשמח לקבוע תור.', 'שם: ' + d.get('name'), 'טלפון: ' + d.get('phone'), 'מטרה: ' + d.get('goal'), 'מתי נוח: ' + d.get('when')];
      if ((d.get('message') || '').trim()) lines.push('הערה: ' + d.get('message').trim());
      window.open('https://wa.me/972545779379?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      var done = $('.spa-form__done', bookForm); if (done) done.hidden = false;
      showToast('הבקשה נפתחה בוואטסאפ, רק לשלוח');
    });
  }

  /* תפריט הטיפולים: טבלאות */
  var svcBox = $('#svc-tables');
  if (svcBox && window.SERVICES) {
    var COLS = [['name', 'טיפול'], ['includes', 'מה כולל'], ['who', 'מתאים ל'], ['tech', 'טכנולוגיה'], ['duration', 'משך'], ['series', 'סדרה'], ['interval', 'מרווח'], ['price', 'מחיר']];
    function priceCell(r) {
      if (r.price === 0) return '<b class="svc-free">ללא עלות</b>';
      if (typeof r.price === 'number') return '<b>₪ ' + r.price.toLocaleString('he-IL') + '</b>';
      return '<span class="svc-ask">לפי אבחון</span>';
    }
    function priceText(r) {
      if (r.price === 0) return 'ללא עלות';
      if (typeof r.price === 'number') return '₪ ' + r.price.toLocaleString('he-IL');
      return 'לפי אבחון';
    }
    svcBox.innerHTML = window.SERVICES.map(function (cat) {
      var total = cat.groups.reduce(function (n, g) { return n + g.rows.length; }, 0);
      var groups = cat.groups.map(function (g) {
        return '<div class="lux-group"><h3 class="lux-group__title"><span>' + escapeHtml(g.title) + '</span></h3><ol class="lux-list">' + g.rows.map(function (r) {
          var meta = [r.duration, r.series ? 'סדרה: ' + r.series : '', r.interval ? 'מרווח: ' + r.interval : ''].filter(Boolean);
          var who = [r.who ? 'מתאים ל' + r.who : '', r.tech ? r.tech : ''].filter(Boolean);
          return '<li class="lux-row">' +
            '<div class="lux-row__main"><div class="lux-row__head"><h4>' + escapeHtml(r.name) + (r.note ? '<small>' + escapeHtml(r.note) + '</small>' : '') + '</h4><span class="lux-leader" aria-hidden="true"></span><span class="lux-price' + (r.price === 0 ? ' is-free' : '') + '">' + priceText(r) + '</span></div>' +
            (r.includes ? '<p class="lux-row__desc">' + escapeHtml(r.includes) + '</p>' : '') +
            '<p class="lux-row__meta">' + who.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('') + meta.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('') +
            '<a class="lux-ask" href="' + WA.split('?')[0] + '?text=' + encodeURIComponent('היי, אשמח לשמוע על ' + r.name) + '" target="_blank" rel="noopener">שאלה בוואטסאפ</a></p></div></li>';
        }).join('') + '</ol></div>';
      }).join('');
      return '<section class="svc-cat lux-cat" id="' + cat.id + '"><div class="lux-cat__head reveal"><span class="lux-num">' + cat.num + '</span><h2>' + escapeHtml(cat.title) + '</h2><p>' + escapeHtml(cat.intro) + '</p><span class="lux-count">' + total + ' ' + (cat.id === 'laser-menu' ? 'אזורים' : 'טיפולים') + '</span></div>' + groups + '</section>';
    }).join('') + '<p class="svc-note reveal">משכי הטיפולים משוערים. את המחיר הסופי אני קובעת באבחון לפי האזור, סוג העור והתוכנית. מחירון מלא אפשר לקבל ממני בקליניקה ובוואטסאפ.</p>';
    afterRender(svcBox);
  }
  var mp = $('#menu-print'); if (mp) mp.addEventListener('click', function () { window.print(); });
  /* קישור פעיל בתפריט */
  var navLinks = $$('.menu a[href^="#"], .menu-nav a[href^="#"]').filter(function (a) { return a.getAttribute('href').length > 1; });
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach(function (s) { navIO.observe(s); });
  }

  /* פיצול מילים לכותרות */
  $$('[data-split]').forEach(function (el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var i = 0;
    function wrap(node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          var w = document.createElement('span'); w.className = 'w';
          var s = document.createElement('span'); s.textContent = t; s.style.setProperty('--i', String(i++));
          w.appendChild(s); frag.appendChild(w);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        Array.prototype.slice.call(node.childNodes).forEach(wrap);
      }
    }
    Array.prototype.slice.call(el.childNodes).forEach(wrap);
  });

  /* הופעה בגלילה */
  var reveals = $$('.reveal');
  $$('[data-stagger]').forEach(function (box) { $$('.reveal', box).forEach(function (el, i) { el.style.setProperty('--i', String(Math.min(i, 10))); }); });
  function observeReveals() {
    reveals = $$('.reveal:not(.is-visible)');
    if (noMotion() || !('IntersectionObserver' in window)) { reveals.forEach(function (el) { el.classList.add('is-visible'); }); return; }
    var revIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); revIO.unobserve(e.target); } });
    }, { threshold: .05, rootMargin: '0px 0px -4% 0px' });
    reveals.forEach(function (el) { revIO.observe(el); });
  }
  observeReveals();

  /* אותיות מתהפכות בכפתורים ובתפריט */
  function buildTw(el) {
    if (noMotion() || el.dataset.tw) return;
    var tn = Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
    if (!tn.length) return;
    var t = tn[0].textContent.trim(); if (t.length > 26) return;
    el.dataset.tw = '1'; el.classList.add('has-tw');
    var tw = document.createElement('span'); tw.className = 'tw';
    [0, 1].forEach(function () {
      var row = document.createElement('span');
      (t.match(/[A-Za-z0-9][A-Za-z0-9.\-]*|./g) || []).forEach(function (ch, i) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; c.style.setProperty('--i', String(Math.min(i, 22))); row.appendChild(c); });
      tw.appendChild(row);
    });
    tn[0].parentNode.replaceChild(tw, tn[0]);
  }
  $$('.btn, .menu > li > a').forEach(buildTw);

  /* כפתורים מגנטיים */
  if (fine && !noMotion()) {
    $$('.magnet').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * .25, y = (e.clientY - r.top - r.height / 2) * .35;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }


  /* גלילה חלקה עם אינרציה (עכבר בלבד, לא במצב הפחתת תנועה) */
  if (fine && !noMotion() && !('ontouchstart' in window)) {
    var sTarget = window.scrollY, sCur = sTarget, sRaf = null, sIdle = true;
    function sMax() { return document.documentElement.scrollHeight - window.innerHeight; }
    function sTo(y) { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
    function sStep() {
      sCur += (sTarget - sCur) * .11;
      if (Math.abs(sTarget - sCur) < .5) { sCur = sTarget; sTo(sCur); sRaf = null; sIdle = true; return; }
      sTo(sCur); sRaf = requestAnimationFrame(sStep);
    }
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || body.classList.contains('menu-open') || document.querySelector('dialog[open]')) return;
      var t = e.target.closest && e.target.closest('textarea, select, [data-native-scroll]');
      if (t && t.scrollHeight > t.clientHeight + 2) return;
      e.preventDefault();
      if (sIdle) { sTarget = sCur = window.scrollY; sIdle = false; }
      var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      sTarget = Math.max(0, Math.min(sMax(), sTarget + d));
      if (!sRaf) sRaf = requestAnimationFrame(sStep);
    }, { passive: false });
    window.addEventListener('scroll', function () { if (sIdle) { sTarget = sCur = window.scrollY; } }, { passive: true });
  }

  /* מסלול טיפולים: העמודה הדביקה מציגה איפה אנחנו ברשימה */
  $$('.service').forEach(function (sec) {
    var rows = $$('.treatments > li', sec), track = $('.track', sec);
    if (!rows.length || !track) return;
    var now = $('.track-now', track), bar = $('.track-bar i', track), cur = -1;
    function setCurrent(i) {
      if (i === cur) return; cur = i;
      rows.forEach(function (r, k) { r.classList.toggle('is-current', k === i); });
      now.textContent = String(i + 1).padStart(2, '0');
      bar.style.setProperty('--t', ((i + 1) / rows.length).toFixed(3));
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) setCurrent(rows.indexOf(en.target)); });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      rows.forEach(function (r) { io.observe(r); });
    }
    setCurrent(0);
  });

  /* מונים */
  function runCounter(el) {
    var end = parseInt(el.dataset.count, 10), suf = el.dataset.suffix || '', t0 = null, dur = 1400;
    if (noMotion()) { el.textContent = end + suf; return; }
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * e) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var cIO = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cIO.unobserve(e.target); } }); }, { threshold: .4 });
    counters.forEach(function (el) { cIO.observe(el); });
  } else counters.forEach(runCounter);

  /* מרקיז מודע לכיוון הגלילה */
  var track = $('.marquee__track');
  if (track && !noMotion()) {
    var list = $('.marquee__list', track), w = list.getBoundingClientRect().width, x = 0, base = 1, want = base, cur = base, prevY = window.scrollY, mt;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, d = y - prevY; prevY = y;
      want = base * (d < 0 ? -1 : 1) * Math.min(1 + Math.abs(d) / 12, 5);
      clearTimeout(mt); mt = setTimeout(function () { want = base * (d < 0 ? -1 : 1); }, 300);
    }, { passive: true });
    window.addEventListener('resize', function () { w = list.getBoundingClientRect().width; });
    (function loop() {
      cur += (want - cur) * .06; x += cur;
      if (x > w) x -= w; if (x < 0) x += w;
      track.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* מאתר טיפול */
  var goals = $$('.finder [role="tab"]');
  goals.forEach(function (btn) {
    btn.addEventListener('click', function () {
      goals.forEach(function (b) {
        var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on));
        var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
    });
  });

  /* שלבים אוטומטיים */
  $$('[data-steps]').forEach(function (box) {
    var items = $$('li', box), cur = 0, timer, paused = false, DUR = 4200;
    items.forEach(function (it) { var bar = document.createElement('span'); bar.className = 'steps__bar'; it.appendChild(bar); });
    function open(i) {
      cur = (i + items.length) % items.length;
      items.forEach(function (it, j) { it.classList.toggle('is-open', j === cur); var b = $('.steps__bar', it); if (b) { b.style.transition = 'none'; b.style.transform = 'scaleX(0)'; void b.offsetWidth; b.style.transition = ''; b.style.transform = ''; } });
      clearTimeout(timer); if (!paused && !noMotion()) timer = setTimeout(function () { open(cur + 1); }, DUR);
    }
    items.forEach(function (it, i) { it.addEventListener('click', function () { open(i); }); it.addEventListener('mouseenter', function () { paused = true; clearTimeout(timer); }); it.addEventListener('mouseleave', function () { paused = false; open(cur); }); });
    if ('IntersectionObserver' in window) {
      var sIO = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { open(0); sIO.disconnect(); } }); }, { threshold: .3 });
      sIO.observe(box);
    } else open(0);
  });

  /* שאלות: פתיחה מונפשת */
  $$('.faq-list details').forEach(function (d) {
    var sum = $('summary', d), p = $('p', d), anim = null;
    if (!sum || !p) return;
    sum.addEventListener('click', function (e) {
      if (noMotion()) return;
      e.preventDefault();
      if (anim) anim.cancel();
      var closing = d.open;
      var from = d.offsetHeight;
      if (!closing) d.open = true;
      var to = closing ? sum.offsetHeight : d.offsetHeight;
      d.style.overflow = 'hidden';
      anim = d.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
      anim.onfinish = function () { if (closing) d.open = false; d.style.overflow = ''; d.style.height = ''; anim = null; };
    });
  });

  /* שעון ופתוח עכשיו */
  var clocks = $$('.clock'), openNow = $('#open-now');
  function israelNow() {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
    var o = {}; f.formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); return o;
  }
  function tickClock() {
    var n = israelNow(); clocks.forEach(function (c) { c.textContent = n.hour + ':' + n.minute; });
    if (openNow) {
      var h = parseInt(n.hour, 10), wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].indexOf(n.weekday) > -1;
      var open = wd && h >= 9 && h < 19;
      openNow.classList.toggle('is-closed', !open);
      $('span', openNow).textContent = open ? 'פתוח עכשיו, אני עונה בוואטסאפ' : 'סגור כרגע. כתבו לי בוואטסאפ ואחזור בבוקר';
    }
  }
  if (clocks.length || openNow) { tickClock(); setInterval(tickClock, 15000); }

  /* שנה */
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* הודעה קופצת */
  var toast = $('#toast'), toastT;
  function showToast(msg, actionLabel, onAction) {
    if (!toast) return;
    toast.textContent = msg;
    if (actionLabel && onAction) { var b = document.createElement('button'); b.type = 'button'; b.className = 'toast__act'; b.textContent = actionLabel; b.addEventListener('click', function () { onAction(); toast.classList.remove('is-on'); }); toast.appendChild(b); }
    toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('is-on'); }, actionLabel ? 5000 : 2600);
  }

  /* ===== מוצרים ===== */
  var P = window.PRODUCTS || [];
  function waLink(p) { return WA + '?text=' + encodeURIComponent('היי, התעניינתי במוצר ' + p.name + (p.size ? ' (' + p.size + ')' : '') + (p.brand && p.name.indexOf(p.brand) < 0 ? ' של ' + p.brand : '')); }
  var HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.6 4 4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>';
  var LS = 'rotem-list', lastRemoved = null, undoT;
  function undoRemove() { if (lastRemoved && !saved.has(lastRemoved.i)) { saved.ids.splice(Math.min(lastRemoved.k, saved.ids.length), 0, lastRemoved.i); } lastRemoved = null; clearTimeout(undoT); persist(); syncList(); }
  var saved = { ids: [], has: function (i) { return this.ids.indexOf(i) >= 0; } };
  try { saved.ids = (JSON.parse(localStorage.getItem(LS) || '[]') || []).filter(function (i) { return P[i]; }); } catch (e) { saved.ids = []; }
  saved.qty = {};
  try { saved.qty = JSON.parse(localStorage.getItem(LS + '-qty') || '{}') || {}; } catch (e) { saved.qty = {}; }
  function qtyOf(i) { return Math.max(1, parseInt(saved.qty[i], 10) || 1); }
  function persist() { try { localStorage.setItem(LS, JSON.stringify(saved.ids)); localStorage.setItem(LS + '-qty', JSON.stringify(saved.qty)); } catch (e) {} }
  function listMessage() {
    var lines = saved.ids.map(function (i) { var p = P[i], q = qtyOf(i); return '• ' + (q > 1 ? q + ' × ' : '') + p.name + (p.size ? ' (' + p.size + ')' : '') + (p.brand && p.name.indexOf(p.brand) < 0 ? ' של ' + p.brand : ''); });
    var ship = $('input[name="list-ship"]:checked'), note = $('#list-note');
    var tail = '\n\n' + (ship ? ship.value : 'איסוף מהקליניקה') + (note && note.value.trim() ? '\nהערה: ' + note.value.trim() : '') + '\n\nאפשר לקבל מחירים וזמינות?';
    return WA + '?text=' + encodeURIComponent('היי, אשמח להזמין:\n' + lines.join('\n') + tail);
  }
  function syncList() {
    var n = saved.ids.length, bar = $('#list-bar'), cnt = $('#list-count'), items = $('#list-items');
    $$('[data-save]').forEach(function (b) { var i = parseInt(b.dataset.save, 10), on = saved.has(i); b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); if (b.id === 'qv-save') b.textContent = on ? 'ברשימה ✓' : 'הוספה לרשימה'; });
    if (bar) { bar.hidden = !n; if (cnt) cnt.textContent = n; }
    var nc = $('#nav-count'); if (nc) { nc.hidden = !n; nc.textContent = n; }
    ['#list-send', '#list-send-2'].forEach(function (s) { var a = $(s); if (a) a.href = listMessage(); });
    var sub = $('#list-sub'), opts = $('#list-opts');
    var units = saved.ids.reduce(function (a, i) { return a + qtyOf(i); }, 0);
    if (sub) sub.textContent = n ? (n === 1 ? 'מוצר אחד' : n + ' מוצרים') + (units > n ? ', ' + units + ' יחידות' : '') : 'עדיין ריקה';
    if (opts) opts.hidden = !n;
    if (items) {
      var undoRow = lastRemoved ? '<li class="list-undo"><span>הוסר: ' + escapeHtml(P[lastRemoved.i].name) + '</span><button type="button" data-undo="1">ביטול</button></li>' : '';
      items.innerHTML = undoRow + (n ? saved.ids.map(function (i) {
        var p = P[i], q = qtyOf(i);
        return '<li>' + (p.image ? '<img src="' + p.image + '" alt="">' : '<span class="list-ph">תמונה בקרוב</span>') +
          '<div><button type="button" class="list-name" data-qv="' + i + '">' + escapeHtml(p.name) + '</button><small>' + escapeHtml([p.brand, p.size].filter(Boolean).join(' · ')) + '</small>' +
          '<span class="list-qty" role="group" aria-label="כמות"><button type="button" data-qty="' + i + '" data-d="-1" aria-label="פחות">−</button><b>' + q + '</b><button type="button" data-qty="' + i + '" data-d="1" aria-label="יותר">+</button></span></div>' +
          '<button type="button" class="list-remove" data-unsave="' + i + '" aria-label="הסרה מהרשימה">×</button></li>';
      }).join('') : '<li class="list-empty"><b>הרשימה עדיין ריקה</b><span>לחיצה על הלב ליד מוצר מוסיפה אותו לכאן, ואז שולחים לי הכול בהודעה אחת.</span><span class="list-empty__acts"><button type="button" class="btn btn-gold btn-sm" id="list-go-shop">לכל המוצרים</button><button type="button" class="btn btn-light btn-sm" id="list-go-quiz">איזה מוצר מתאים לי?</button></span></li>');
    }
  }
  document.addEventListener('change', function (e) { if (e.target.closest('#list-opts')) syncList(); });
  document.addEventListener('input', function (e) { if (e.target.id === 'list-note') syncList(); });
  function toggleSave(i, btn) {
    var k = saved.ids.indexOf(i);
    if (k >= 0) {
      saved.ids.splice(k, 1); lastRemoved = { i: i, k: k };
      clearTimeout(undoT); undoT = setTimeout(function () { lastRemoved = null; syncList(); }, 6000);
      var inDrawer = $('#list') && $('#list').open;
      if (!inDrawer) showToast('הוסר מהרשימה', 'ביטול', undoRemove);
    }
    else { saved.ids.push(i); showToast('נוסף לרשימה. אפשר להמשיך לבחור ולשלוח הכול יחד'); if (btn) { btn.classList.add('is-pop'); setTimeout(function () { btn.classList.remove('is-pop'); }, 500); } }
    persist(); syncList();
  }
  function cardHtml(p, i) {
    var quick = '<button class="product-quick" type="button" data-qv="' + i + '">תצוגה מהירה</button>';
    var save = '<button class="product-save' + (saved.has(i) ? ' is-on' : '') + '" type="button" data-save="' + i + '" aria-label="הוספה לרשימה" aria-pressed="' + saved.has(i) + '">' + HEART + '</button>';
    var badge = (p.pick ? '<span class="product-badge">רותם ממליצה</span>' : '') + (p.model ? '<span class="product-badge product-badge--3d">360°</span>' : '');
    var media = p.image
      ? '<figure class="product-media"><img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy" decoding="async">' + save + badge + quick + '</figure>'
      : '<figure class="product-media product-media-empty"><span aria-hidden="true">תמונה בקרוב</span>' + save + badge + quick + '</figure>';
    var price = p.price ? '<span class="price">₪ ' + p.price + '</span>' : '<span class="price-ask">מחיר בוואטסאפ</span>';
    var meta = [p.brand, p.size].filter(Boolean).join(' · ');
    return '<li class="product reveal" data-i="' + i + '">' + media +
      '<div class="product-info"><p class="product-meta">' + escapeHtml(meta) + '</p><h3>' + escapeHtml(p.name) + '</h3><p>' + escapeHtml(p.desc || '') + '</p>' +
      '<div class="product-row">' + price + '<a class="btn btn-solid" href="' + waLink(p) + '" target="_blank" rel="noopener">הזמנה בוואטסאפ</a></div></div></li>';
  }
  function shelfItemHtml(p, i, k) {
    var save = '<button class="shelf-save' + (saved.has(i) ? ' is-on' : '') + '" type="button" data-save="' + i + '" aria-label="הוספה לרשימה" aria-pressed="' + saved.has(i) + '">' + HEART + '</button>';
    var badge = (p.pick ? '<span class="shelf-badge">רותם ממליצה</span>' : '') + (p.model ? '<span class="shelf-badge shelf-badge--3d">360°</span>' : '');
    var media = p.cut ? '<img src="' + p.cut + '" alt="" loading="lazy" decoding="async">'
      : p.image ? '<img src="' + p.image + '" alt="" loading="lazy" decoding="async">'
      : '<span class="shelf-ph" aria-hidden="true">תמונה בקרוב</span>';
    var cls = 'shelf-item' + (p.cut ? '' : p.image ? ' is-box' : ' is-empty');
    var price = p.price ? '<span class="price">₪ ' + p.price + '</span>' : '<span class="price-ask">מחיר בוואטסאפ</span>';
    return '<li class="' + cls + '" data-i="' + i + '" style="--i:' + (k % 8) + '">' + save + badge +
      '<button class="shelf-hit" type="button" aria-label="' + escapeHtml(p.name) + '">' + media + '<span class="shelf-hot" aria-hidden="true"></span><span class="shelf-plank" aria-hidden="true"></span></button>' +
      '<span class="shelf-label"><b>' + escapeHtml(p.name) + '</b><small>' + escapeHtml([p.brand, p.size].filter(Boolean).join(' · ')) + '</small>' + price + '</span></li>';
  }
  function shelfCols() { var w = window.innerWidth; return w <= 860 ? 2 : w <= 1024 ? 3 : 4; }
  /* קישוטי מדף: לא למכירה, אחד לכל מותג */
  var PROPS = {
    'bud-vase': { src: 'images/props/bud-vase.webp', h: .62 },
    'pampas': { src: 'images/props/pampas.webp', h: .98 },
    'diffuser': { src: 'images/props/diffuser.webp', h: .72 },
    'shell': { src: 'images/props/shell-frame.webp', h: .58 },
    'sage': { src: 'images/props/sage.webp', h: .3 }
  };
  var PROP_BY_BRAND = { 'חוה זינגבוים': 'pampas', 'KLAPP': 'bud-vase', 'SQT': 'diffuser', 'Arkana': 'sage', 'Dr. Spicule': 'diffuser' };
  var propOrder = ['bud-vase', 'diffuser', 'pampas', 'sage'], propK = 0, rowN = 0;
  function wallArtHtml() {
    rowN++; if (rowN % 3 !== 1) return '';
    var n = shelfCols(), k = 1 + (rowN % (n - 1 || 1)), x = 5 + k * (90 / n);
    return '<span class="wall-art" aria-hidden="true" style="--x:' + x.toFixed(1) + '%"><img src="' + PROPS.shell.src + '" alt="" loading="lazy" decoding="async"></span>';
  }
  function propHtml(key) {
    var p = PROPS[key]; if (!p) return '';
    return '<li class="shelf-prop" aria-hidden="true" style="--ph:' + p.h + '"><img src="' + p.src + '" alt="" loading="lazy" decoding="async"></li>';
  }
  function rowsHtml(items, propKey) {
    var n = shelfCols(), rows = [];
    for (var s = 0; s < items.length; s += n) {
      var html = items.slice(s, s + n).map(function (x, k) { return shelfItemHtml(x.p, x.i, k); }).join('');
      if (s + n > items.length && n > 1 && propKey !== false) html += propHtml(propKey || propOrder[propK++ % propOrder.length]);
      rows.push('<ul class="shelf-row" data-stagger>' + (propKey === false ? '' : wallArtHtml()) + html + '</ul>');
    }
    return '<div class="shelf-rows">' + rows.join('') + '</div>';
  }
  function wallHtml(title, items, count) {
    return '<section class="wall shop-group">' +
      (title ? '<div class="wall-head"><h2>' + escapeHtml(title) + '</h2>' + (count ? '<span>' + count + '</span>' : '') + '</div>' : '') +
      rowsHtml(items, title ? (PROP_BY_BRAND[title] || null) : null) + '</section>';
  }
  var rerenderFns = [], lastCols = shelfCols();
  window.addEventListener('resize', function () { var c = shelfCols(); if (c !== lastCols) { lastCols = c; rerenderFns.forEach(function (f) { f(); }); } });

  /* כרטיס מדף משותף */
  var shelfCard = $('#shelf-card'), openItem = null, closeT;
  function placeCard(li) {
    var hit = $('.shelf-hit', li) || li, r = hit.getBoundingClientRect();
    var cw = shelfCard.offsetWidth || 250, ch = shelfCard.offsetHeight || 150;
    var left = r.left + r.width / 2 - cw / 2; left = Math.max(10, Math.min(window.innerWidth - cw - 10, left));
    var top = r.bottom - 6; if (top + ch > window.innerHeight - 10) top = r.top - ch - 8; if (top < 10) top = 10;
    shelfCard.style.left = left + 'px'; shelfCard.style.top = top + 'px';
  }
  function openShelf(li) {
    if (!shelfCard) return; clearTimeout(closeT);
    var i = parseInt(li.dataset.i, 10), p = P[i]; if (!p) return;
    if (openItem && openItem !== li) openItem.classList.remove('is-open');
    openItem = li; li.classList.add('is-open');
    $('#sc-meta').textContent = [p.category, p.size].filter(Boolean).join(' · ');
    $('#sc-title').textContent = p.name;
    $('#sc-desc').textContent = (p.desc || '').split(/[.!?]/)[0].trim() + '.';
    $('#sc-price').textContent = p.price ? '₪ ' + p.price : 'מחיר בוואטסאפ';
    $('#sc-wa').href = waLink(p);
    var sv = $('#sc-save'); if (sv) sv.dataset.save = String(i);
    var mo = $('#sc-more'); if (mo) mo.dataset.qv = String(i);
    shelfCard.hidden = false; placeCard(li);
    requestAnimationFrame(function () { shelfCard.classList.add('is-on'); });
    syncList();
  }
  function closeShelf(now) {
    clearTimeout(closeT);
    closeT = setTimeout(function () {
      if (openItem) openItem.classList.remove('is-open'); openItem = null;
      if (shelfCard) { shelfCard.classList.remove('is-on'); setTimeout(function () { if (!openItem) shelfCard.hidden = true; }, 320); }
    }, now ? 0 : 240);
  }
  if (shelfCard) {
    document.addEventListener('click', function (e) {
      var hit = e.target.closest('.shelf-hit');
      if (hit) { var li = hit.closest('.shelf-item'); if (openItem === li) closeShelf(true); else openShelf(li); return; }
      if (openItem && !e.target.closest('.shelf-item') && !shelfCard.contains(e.target)) closeShelf(true);
    });
    if (fine) {
      document.addEventListener('mouseover', function (e) { var li = e.target.closest('.shelf-item'); if (li) openShelf(li); });
      document.addEventListener('mouseout', function (e) { var li = e.target.closest('.shelf-item'); if (li && !li.contains(e.relatedTarget) && !shelfCard.contains(e.relatedTarget)) closeShelf(); });
      shelfCard.addEventListener('mouseenter', function () { clearTimeout(closeT); });
      shelfCard.addEventListener('mouseleave', function () { closeShelf(); });
    }
    document.addEventListener('focusin', function (e) { var hit = e.target.closest('.shelf-hit'); if (hit) openShelf(hit.closest('.shelf-item')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openItem) closeShelf(true); });
    window.addEventListener('scroll', function () { if (openItem) placeCard(openItem); }, { passive: true });
    window.addEventListener('resize', function () { if (openItem) placeCard(openItem); });
  }

  function afterRender(scope) {
    $$('.product-media img', scope).forEach(function (im) { if (im.complete) im.classList.add('is-loaded'); else im.addEventListener('load', function () { im.classList.add('is-loaded'); }, { once: true }); });
    $$('[data-stagger]', scope).concat(scope.hasAttribute && scope.hasAttribute('data-stagger') ? [scope] : []).forEach(function (box) { $$('.reveal', box).forEach(function (el, i) { el.style.setProperty('--i', String(Math.min(i % 8, 10))); }); });
    $$('.product .btn', scope).forEach(buildTw);
    if (openItem) closeShelf(true);
    observeReveals();
  }

  /* דף הבית: מוצרים נבחרים ורצועת מותגים */
  var featured = $('#featured');
  if (featured && P.length) { syncList();
    var doorPicks = P.filter(function (p) { return p.cut && p.pick; }).slice(0, 4);
    if (doorPicks.length < 4) P.forEach(function (p) { if (doorPicks.length < 4 && p.cut && doorPicks.indexOf(p) < 0) doorPicks.push(p); });
    var drawFeatured = function () {
      var n = Math.min(shelfCols(), 4);
      featured.innerHTML = rowsHtml(doorPicks.slice(0, n).map(function (p) { return { p: p, i: P.indexOf(p) }; }), false);
      /* הקיר בדף הבית הוא תצוגה בלבד בתוך קישור אחד: בלי כפתורים וקישורים מקוננים */
      $$('a, button', featured).forEach(function (el) { var sp = document.createElement('span'); sp.className = el.className; sp.innerHTML = el.innerHTML; el.replaceWith(sp); });
    };
    drawFeatured(); rerenderFns.push(drawFeatured);
    var strip = $('#brand-strip');
    if (strip) {
      var brands = []; P.forEach(function (p) { if (brands.indexOf(p.brand) < 0) brands.push(p.brand); });
      strip.innerHTML = brands.map(function (b) { return '<a href="shop.html?brand=' + encodeURIComponent(b) + '">' + escapeHtml(b) + ' <span class="count">' + P.filter(function (p) { return p.brand === b; }).length + '</span></a>'; }).join('');
    }
  }

  /* דף החנות */
  var shopMain = $('#shop-main');
  if (shopMain && P.length) {
    var brandBox = $('#brand-filter'), catBox = $('#cat-filter'), search = $('#search'), sort = $('#sort'), count = $('#shop-count');
    var badge = $('#filter-badge'), clearAll = $('#clear-all'), clearBtn = $('#search-clear'), toggle = $('#filter-toggle'), bar = $('#shop-bar'), live = false, liveT;
    var brands = [], cats = [];
    P.forEach(function (p) { if (brands.indexOf(p.brand) < 0) brands.push(p.brand); if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    var catOrder = ['ניקוי', 'סרומים ובוסטרים', 'קרמים ולחות', 'מסכות', 'עיניים', 'הגנה מהשמש', 'ערכות וטיפול מקצועי'];
    cats.sort(function (a, b) { return catOrder.indexOf(a) - catOrder.indexOf(b); });
    var params = new URLSearchParams(location.search);
    var GOALS = ['אקנה ועור שמן', 'כתמים והבהרה', 'קמטים ומיצוק', 'לחות ויובש', 'עור רגיש', 'שגרה יומית'];
    var goalBox = $('#goal-filter');
    var state = { brand: params.get('brand') || '', cat: params.get('cat') || '', goal: params.get('goal') || '', q: params.get('q') || '', sort: params.get('sort') || 'brand' };
    if (brands.indexOf(state.brand) < 0) state.brand = ''; if (cats.indexOf(state.cat) < 0) state.cat = ''; if (GOALS.indexOf(state.goal) < 0) state.goal = '';
    if (goalBox) {
      goalBox.innerHTML = [''].concat(GOALS).map(function (v) {
        var n = v ? P.filter(function (p) { return (p.concerns || []).indexOf(v) >= 0; }).length : P.length;
        return '<button type="button" class="goal' + (state.goal === v ? ' is-active' : '') + '" data-v="' + escapeHtml(v) + '" aria-pressed="' + (state.goal === v) + '">' + (v ? escapeHtml(v) : 'הכול') + ' <span class="count">' + n + '</span></button>';
      }).join('');
      goalBox.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        state.goal = b.dataset.v;
        $$('button', goalBox).forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        live = true; render(); keepResultsVisible();
      });
    }
    function pillBox(box, values, key, countOf) {
      if (!box) return;
      box.innerHTML = [''].concat(values).map(function (v) {
        var n = v ? countOf(v) : P.length;
        return '<button type="button" class="goal' + (state[key] === v ? ' is-active' : '') + '" data-v="' + escapeHtml(v) + '" aria-pressed="' + (state[key] === v) + '">' + (v ? escapeHtml(v) : 'הכול') + ' <span class="count">' + n + '</span></button>';
      }).join('');
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        state[key] = b.dataset.v;
        $$('button', box).forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        live = true; render(); keepResultsVisible();
      });
    }
    pillBox(brandBox, brands, 'brand', function (v) { return P.filter(function (p) { return p.brand === v; }).length; });
    pillBox(catBox, cats, 'cat', function (v) { return P.filter(function (p) { return p.category === v; }).length; });
    function norm(s) { return String(s || '').toLowerCase().replace(/[\u0591-\u05c7]/g, '').replace(/[\-_.,'"()\/]+/g, ' ').replace(/\s+/g, ' ').trim(); }
    function filtered() {
      var words = norm(state.q).split(' ').filter(Boolean);
      return P.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
        var p = x.p;
        if (state.brand && p.brand !== state.brand) return false;
        if (state.cat && p.category !== state.cat) return false;
        if (state.goal && (p.concerns || []).indexOf(state.goal) < 0) return false;
        if (words.length) {
          var hay = norm(p.name + ' ' + (p.en || '') + ' ' + (p.desc || '') + ' ' + p.brand + ' ' + p.category + ' ' + (p.size || ''));
          for (var k = 0; k < words.length; k++) if (hay.indexOf(words[k]) < 0) return false;
        }
        return true;
      });
    }
    function render() {
      var list = filtered();
      var url = new URL(location.href); ['brand', 'cat', 'goal', 'q', 'sort'].forEach(function (k) { if (state[k] && !(k === 'sort' && state[k] === 'brand')) url.searchParams.set(k, state[k]); else url.searchParams.delete(k); });
      history.replaceState(null, '', url);
      var q = state.q.trim();
      if (count) count.textContent = !list.length ? '' : q ? list.length + ' תוצאות ל"' + q + '"' : list.length + ' מוצרים';
      var active = (state.brand ? 1 : 0) + (state.cat ? 1 : 0) + (state.goal ? 1 : 0);
      if (badge) { badge.hidden = !active; badge.textContent = active; }
      if (clearAll) clearAll.hidden = !(active || q);
      if (clearBtn) clearBtn.hidden = !q;
      if (!list.length) { shopMain.innerHTML = '<div class="empty fade-up"><b>לא נמצא מוצר כזה</b>נסו מילה אחרת, או כתבו לי בוואטסאפ ואבדוק אם אפשר להשיג.<br><br><a class="btn btn-gold" href="' + WA + '" target="_blank" rel="noopener">שאלה בוואטסאפ</a></div>'; return; }
      var groupKey = state.sort === 'category' ? 'category' : (state.sort === 'brand' ? 'brand' : null);
      var html = '';
      if (groupKey) {
        var order = groupKey === 'brand' ? brands : cats;
        order.forEach(function (g) {
          var items = list.filter(function (x) { return x.p[groupKey] === g; });
          if (!items.length) return;
          html += wallHtml(g, items, items.length + ' מוצרים');
        });
      } else {
        list.sort(function (a, b) { return a.p.name.localeCompare(b.p.name, 'he'); });
        html = wallHtml('', list, '');
      }
      shopMain.innerHTML = html;
      afterRender(shopMain);
      syncList();
      if (live) { shopMain.classList.add('is-live'); clearTimeout(liveT); liveT = setTimeout(function () { shopMain.classList.remove('is-live'); }, 600); }
      live = false;
    }
    function keepResultsVisible() {
      var bar = $('#shop-bar'), top = shopMain.getBoundingClientRect().top, barH = bar ? bar.getBoundingClientRect().bottom : 0;
      if (top < barH - 4 || top > window.innerHeight * .7) window.scrollTo({ top: window.scrollY + top - barH - 8, behavior: noMotion() ? 'auto' : 'smooth' });
    }
    var st; if (search) {
      search.addEventListener('input', function () { clearTimeout(st); st = setTimeout(function () { state.q = search.value; live = true; render(); keepResultsVisible(); }, 160); });
      search.addEventListener('keydown', function (e) { if (e.key === 'Enter') search.blur(); if (e.key === 'Escape') { search.value = ''; state.q = ''; live = true; render(); } });
    }
    if (clearBtn) clearBtn.addEventListener('click', function () { search.value = ''; state.q = ''; live = true; render(); search.focus(); });
    if (clearAll) clearAll.addEventListener('click', function () {
      state.q = ''; state.brand = ''; state.cat = ''; state.goal = ''; if (search) search.value = '';
      $$('#brand-filter button, #cat-filter button, #goal-filter button').forEach(function (b) { var on = !b.dataset.v; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      live = true; render(); keepResultsVisible();
    });
    if (toggle && bar) {
      var openBar = function (on) { bar.classList.toggle('is-open', on); toggle.setAttribute('aria-expanded', String(on)); if (on && search && window.innerWidth > 860) search.focus(); };
      toggle.addEventListener('click', function () { openBar(!bar.classList.contains('is-open')); });
      var done = $('#panel-done'); if (done) done.addEventListener('click', function () { openBar(false); keepResultsVisible(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bar.classList.contains('is-open')) openBar(false); });
      if (state.q) openBar(true);
    }
    rerenderFns.push(function () { render(); });
    ['#nav-quiz', '#m-nav-quiz'].forEach(function (sel) { var a = $(sel); if (a) a.addEventListener('click', function (e) { e.preventDefault(); body.classList.remove('menu-open'); var q = $('#quiz-open'); if (q) q.click(); }); });
    ['#nav-list', '#m-nav-list'].forEach(function (sel) { var a = $(sel); if (a) a.addEventListener('click', function (e) { e.preventDefault(); body.classList.remove('menu-open'); var l = $('#list-open'); if (l) l.click(); }); });
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; render(); });
    render();

    /* מאתר מוצרים בשלוש שאלות */
    var quiz = $('#quiz'), qOpen = $('#quiz-open');
    if (quiz && qOpen) {
      var ans = {}, steps = $$('.quiz-step', quiz), qResult = $('#quiz-result'), qBack = $('#quiz-back'), stepIdx = 0;
      $('#quiz-goals').innerHTML = GOALS.map(function (g) { return '<button type="button" data-v="' + escapeHtml(g) + '">' + escapeHtml(g) + '</button>'; }).join('');
      function showStep(k) {
        stepIdx = k;
        steps.forEach(function (s, i) { s.classList.toggle('is-on', i === k); });
        qResult.hidden = k < steps.length; qBack.hidden = k === 0;
        if (k === steps.length) buildResult();
      }
      function buildResult() {
        var goal = ans.goal, skin = ans.skin, age = ans.age;
        var skinTxt = { oily: 'לעור שמן כדאי מרקמים קלילים, ג\'ל ולחות נטולת שומן.', combo: 'לעור מעורב מאזנים: ניקוי עדין ולחות קלילה.', dry: 'לעור יבש מוסיפים לחות עשירה וחומצה היאלורונית.', sensitive: 'לעור רגיש בוחרים נוסחאות מרגיעות, בלי חומצות חזקות.' }[skin] || '';
        var ageTxt = age === '45' ? ' מגיל 45 מומלץ לשלב גם מיצוק ורטינול.' : age === '30-45' ? ' בגילאי 30 עד 45 כדאי להתחיל במניעה: סרום והגנה יומית.' : '';
        $('#quiz-result-title').textContent = goal;
        $('#quiz-result-text').textContent = 'סיננתי עבורך את המוצרים למטרה "' + goal + '". ' + skinTxt + ageTxt + ' את ההתאמה הסופית אני עושה באבחון בקליניקה.';
        $('#quiz-wa').href = WA + '?text=' + encodeURIComponent('היי, עשיתי את מאתר המוצרים באתר. עור: ' + ({ oily: 'שמן', combo: 'מעורב', dry: 'יבש', sensitive: 'רגיש' }[skin] || '') + ', מטרה: ' + goal + ', גיל: ' + ({ u30: 'עד 30', '30-45': '30 עד 45', '45': '45 ומעלה' }[age] || '') + '. אשמח להמלצה אישית.');
      }
      function openQuiz() { ans = {}; $$('.quiz-opts button', quiz).forEach(function (b) { b.classList.remove('is-on'); }); showStep(0); if (typeof quiz.showModal === 'function') quiz.showModal(); else quiz.setAttribute('open', ''); }
      qOpen.addEventListener('click', openQuiz);
      quiz.addEventListener('click', function (e) {
        var o = e.target.closest('.quiz-opts button');
        if (o) {
          var step = o.closest('.quiz-step'); ans[step.dataset.step] = o.dataset.v;
          $$('button', step).forEach(function (b) { b.classList.toggle('is-on', b === o); });
          setTimeout(function () { showStep(stepIdx + 1); }, 220); return;
        }
        if (e.target.closest('#quiz-back')) { showStep(Math.max(0, stepIdx - 1)); return; }
        if (e.target.closest('#quiz-close') || e.target === quiz) { quiz.close(); return; }
        if (e.target.closest('#quiz-apply')) {
          quiz.close();
          state.brand = ''; state.cat = ''; state.q = ''; state.goal = ans.goal; if (search) search.value = '';
          $$('#brand-filter button, #cat-filter button').forEach(function (b) { var on = !b.dataset.v; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
          $$('#goal-filter button').forEach(function (b) { var on = b.dataset.v === ans.goal; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
          if (bar && toggle) { bar.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); }
          live = true; render(); keepResultsVisible();
        }
      });
    }
  }


  /* תעודות: הגדלה */
  var lb = $('#lightbox');
  if (lb) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cert]');
      if (b) { $('img', lb).src = b.dataset.cert; $('img', lb).alt = $('img', b).alt; lb.showModal(); return; }
      if (e.target === lb || e.target.closest('#lightbox-close')) lb.close();
    });
  }

  /* תצוגה מהירה */
  /* מציג תלת-ממד: נטען רק כשלוחצים על 360° */
  var mvReady = null;
  function loadModelViewer() {
    if (window.customElements && customElements.get('model-viewer')) return Promise.resolve();
    if (mvReady) return mvReady;
    mvReady = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.type = 'module'; sc.src = 'js/model-viewer.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    return mvReady;
  }
  function mount3d(stage) {
    if (!stage || stage.dataset.mounted) return;
    stage.dataset.mounted = '1'; stage.innerHTML = '<span class="qv-3d__load">טוען דגם תלת-ממדי…</span>';
    loadModelViewer().then(function () {
      var mv = document.createElement('model-viewer');
      /* בתצוגה המקדימה של claude.ai קבצי glb לא מוגשים, שם הדגם מפורסם בסיומת wasm */
      var src = stage.dataset.model; if (/claude\.ai$/.test(location.hostname)) src = src.replace(/\.glb$/, '.glb.wasm');
      mv.setAttribute('src', src);
      mv.setAttribute('camera-controls', ''); mv.setAttribute('auto-rotate', ''); mv.setAttribute('rotation-per-second', '18deg'); mv.setAttribute('shadow-intensity', '.6'); mv.setAttribute('exposure', '1'); mv.setAttribute('camera-orbit', '25deg 78deg auto'); mv.setAttribute('touch-action', 'pan-y'); mv.setAttribute('alt', 'דגם תלת-ממדי של המוצר, אפשר לסובב');
      stage.innerHTML = ''; stage.appendChild(mv);
    }).catch(function () { stage.innerHTML = '<span class="qv-3d__load">לא הצלחתי לטעון את הדגם. נסו שוב מאוחר יותר.</span>'; delete stage.dataset.mounted; });
  }
  var v3d = null, v3dPrev = null;
  function open3d(model, poster, name) {
    if (!v3d) {
      v3d = document.createElement('div'); v3d.id = 'viewer3d'; v3d.className = 'viewer3d'; v3d.setAttribute('role', 'dialog'); v3d.setAttribute('aria-modal', 'true'); v3d.setAttribute('aria-label', 'תצוגה תלת-ממדית');
      v3d.innerHTML = '<div class="viewer3d__box"><div class="viewer3d__head"><h2 id="v3d-title"></h2><button type="button" class="drawer-close" id="v3d-close" aria-label="סגירה">×</button></div><div class="viewer3d__stage" id="v3d-stage"></div><p class="viewer3d__hint">גוררים כדי לסובב, גוללים או צובטים כדי להתקרב</p></div>';
      document.body.appendChild(v3d);
    }
    v3dPrev = document.activeElement;
    $('#v3d-title').textContent = name || '';
    var st = $('#v3d-stage'); st.innerHTML = ''; delete st.dataset.mounted; st.dataset.model = model; st.dataset.poster = poster || '';
    v3d.hidden = false; body.classList.add('v3d-open'); requestAnimationFrame(function () { v3d.classList.add('is-on'); });
    setTimeout(function () { mount3d(st); var c = $('#v3d-close'); if (c) c.focus(); }, 320);
  }
  function close3d() {
    if (!v3d || v3d.hidden) return;
    v3d.classList.remove('is-on'); body.classList.remove('v3d-open');
    setTimeout(function () { v3d.hidden = true; $('#v3d-stage').innerHTML = ''; delete $('#v3d-stage').dataset.mounted; if (v3dPrev && v3dPrev.focus) v3dPrev.focus(); }, 250);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && v3d && !v3d.hidden) close3d(); });
  var qv = $('#qv');
  function openQv(i) {
    var p = P[i]; if (!p) return;
    if (!qv) { location.href = 'shop.html?q=' + encodeURIComponent(p.name); return; }
    var imgHtml = p.image ? '<img src="' + p.image + '" alt="' + escapeHtml(p.name) + '">' : '<div class="product-media-empty" style="height:100%"><span>תמונה בקרוב</span></div>';
    $('#qv-media').innerHTML = p.model ? '<div class="qv-3d">' + imgHtml + '<button type="button" class="qv-3d__open" data-open3d="' + p.model + '" data-poster="' + (p.cut || p.image || '') + '" data-name="' + escapeHtml(p.name) + '">סיבוב 360°</button></div>' : imgHtml;
    $('#qv-meta').textContent = [p.brand, p.category, p.size].filter(Boolean).join(' · ');
    $('#qv-title').textContent = p.name;
    $('#qv-desc').textContent = p.desc || '';
    $('#qv-tags').innerHTML = [p.en, p.category].filter(Boolean).map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');
    $('#qv-price').textContent = p.price ? '₪ ' + p.price : 'המחיר נמסר בוואטסאפ';
    $('#qv-wa').href = waLink(p);
    var qs = $('#qv-save'); if (qs) qs.dataset.save = String(i);
    syncList();
    if (typeof qv.showModal === 'function') qv.showModal(); else qv.setAttribute('open', '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qv]'); if (b) { openQv(parseInt(b.dataset.qv, 10)); return; }
    var o3 = e.target.closest('[data-open3d]');
    if (o3) { if (qv && qv.open) qv.close(); open3d(o3.dataset.open3d, o3.dataset.poster, o3.dataset.name); return; }
    if (e.target.closest('#v3d-close') || (e.target.id === 'viewer3d')) { close3d(); return; }
    var sv = e.target.closest('[data-save]'); if (sv) { toggleSave(parseInt(sv.dataset.save, 10), sv); return; }
    var us = e.target.closest('[data-unsave]'); if (us) { toggleSave(parseInt(us.dataset.unsave, 10)); return; }
    if (e.target.closest('[data-undo]')) { undoRemove(); return; }
    var qb = e.target.closest('[data-qty]'); if (qb) { var qi = parseInt(qb.dataset.qty, 10), nq = qtyOf(qi) + parseInt(qb.dataset.d, 10); if (nq < 1) { toggleSave(qi); } else { saved.qty[qi] = Math.min(9, nq); persist(); syncList(); } return; }
    if (e.target.closest('#list-go-shop')) { var ld = $('#list'); if (ld && ld.close) ld.close(); var sm = $('#shop-main'); if (sm) sm.scrollIntoView({ behavior: 'smooth' }); return; }
    if (e.target.closest('#list-go-quiz')) { var ld2 = $('#list'); if (ld2 && ld2.close) ld2.close(); var nq2 = $('#nav-quiz'); if (nq2) nq2.click(); return; }
    var dlgHit = e.target.closest('dialog.drawer'); if (dlgHit && e.target === dlgHit && dlgHit.close) { dlgHit.close(); return; }
    var listDlg = $('#list');
    if (e.target.closest('#list-open') && listDlg) { syncList(); if (typeof listDlg.showModal === 'function') listDlg.showModal(); else listDlg.setAttribute('open', ''); return; }
    if (listDlg && (e.target.closest('#list-close') || e.target === listDlg)) { listDlg.close(); return; }
    if (e.target.closest('#list-clear')) { var backup = saved.ids.slice(); saved.ids = []; persist(); syncList(); showToast('הרשימה נוקתה', 'ביטול', function () { saved.ids = backup; persist(); syncList(); }); return; }
    if (e.target.closest('#list-send, #list-send-2')) { if (!saved.ids.length) { e.preventDefault(); showToast('הרשימה ריקה'); } else showToast('פותחים וואטסאפ עם הרשימה'); }
    if (qv && e.target === qv) qv.close();
    if (e.target.closest('#qv-close')) qv.close();
    var wa = e.target.closest('a[href^="https://wa.me"]'); if (wa && wa.closest('.product, .qv')) showToast('פותחים וואטסאפ עם פרטי המוצר');
  });
})();
