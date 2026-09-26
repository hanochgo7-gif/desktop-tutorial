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

  /* תפריט נייד */
  var toggle = $('.nav-toggle'), menu = $('#mobile-menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });
  }

  /* קישור פעיל בתפריט */
  var navLinks = $$('.menu a[href^="#"]');
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
      Array.from(t).forEach(function (ch, i) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; c.style.setProperty('--i', String(Math.min(i, 22))); row.appendChild(c); });
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
    var list = $('.marquee__list', track), w = list.getBoundingClientRect().width, x = 0, base = .6, want = base, cur = base, prevY = window.scrollY, mt;
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
      $('span', openNow).textContent = open ? 'פתוח עכשיו, עונים בוואטסאפ' : 'סגור כרגע. כתבו בוואטסאפ ונחזור בבוקר';
    }
  }
  if (clocks.length || openNow) { tickClock(); setInterval(tickClock, 15000); }

  /* שנה */
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  /* הודעה קופצת */
  var toast = $('#toast'), toastT;
  function showToast(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('is-on'); }, 2600); }

  /* ===== מוצרים ===== */
  var P = window.PRODUCTS || [];
  function waLink(p) { return WA + '?text=' + encodeURIComponent('היי, אני מעוניין/ת ב: ' + p.name + (p.size ? ' (' + p.size + ')' : '')); }
  function cardHtml(p, i) {
    var quick = '<button class="product-quick" type="button" data-qv="' + i + '">תצוגה מהירה</button>';
    var media = p.image
      ? '<figure class="product-media"><img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy" decoding="async">' + quick + '</figure>'
      : '<figure class="product-media product-media-empty"><span aria-hidden="true">תמונה בקרוב</span>' + quick + '</figure>';
    var price = p.price ? '<span class="price">₪ ' + p.price + '</span>' : '<span class="price-ask">מחיר בוואטסאפ</span>';
    var meta = [p.brand, p.size].filter(Boolean).join(' · ');
    return '<li class="product reveal" data-i="' + i + '">' + media +
      '<div class="product-info"><p class="product-meta">' + escapeHtml(meta) + '</p><h3>' + escapeHtml(p.name) + '</h3><p>' + escapeHtml(p.desc || '') + '</p>' +
      '<div class="product-row">' + price + '<a class="btn btn-solid" href="' + waLink(p) + '" target="_blank" rel="noopener">הזמנה בוואטסאפ</a></div></div></li>';
  }
  function afterRender(scope) {
    $$('.product-media img', scope).forEach(function (im) { if (im.complete) im.classList.add('is-loaded'); else im.addEventListener('load', function () { im.classList.add('is-loaded'); }, { once: true }); });
    $$('[data-stagger]', scope).concat(scope.hasAttribute && scope.hasAttribute('data-stagger') ? [scope] : []).forEach(function (box) { $$('.reveal', box).forEach(function (el, i) { el.style.setProperty('--i', String(Math.min(i % 8, 10))); }); });
    $$('.product .btn', scope).forEach(buildTw);
    observeReveals();
  }

  /* דף הבית: מוצרים נבחרים ורצועת מותגים */
  var featured = $('#featured');
  if (featured && P.length) {
    var pick = P.filter(function (p) { return p.image; });
    var chosen = [], seen = {};
    pick.forEach(function (p) { if (!seen[p.brand] && chosen.length < 4) { seen[p.brand] = 1; chosen.push(p); } });
    featured.innerHTML = chosen.map(function (p) { return cardHtml(p, P.indexOf(p)); }).join('');
    afterRender(featured);
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
    var brands = [], cats = [];
    P.forEach(function (p) { if (brands.indexOf(p.brand) < 0) brands.push(p.brand); if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    var catOrder = ['ניקוי', 'סרומים ובוסטרים', 'קרמים ולחות', 'מסכות', 'עיניים', 'הגנה מהשמש', 'ערכות וטיפול מקצועי'];
    cats.sort(function (a, b) { return catOrder.indexOf(a) - catOrder.indexOf(b); });
    var params = new URLSearchParams(location.search);
    var state = { brand: params.get('brand') || '', cat: params.get('cat') || '', q: params.get('q') || '', sort: params.get('sort') || 'brand' };
    if (brands.indexOf(state.brand) < 0) state.brand = ''; if (cats.indexOf(state.cat) < 0) state.cat = '';
    if (search) search.value = state.q; if (sort) sort.value = state.sort;

    function pills(box, key, items) {
      box.innerHTML = [''].concat(items).map(function (v) {
        var n = P.filter(function (p) { return (!v || p[key] === v); }).length;
        return '<button type="button" class="goal' + (state[key === 'brand' ? 'brand' : 'cat'] === v ? ' is-active' : '') + '" data-v="' + escapeHtml(v) + '" aria-pressed="' + (state[key === 'brand' ? 'brand' : 'cat'] === v) + '">' + (v ? escapeHtml(v) : 'הכול') + '<span class="count">' + n + '</span></button>';
      }).join('');
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        state[key === 'brand' ? 'brand' : 'cat'] = b.dataset.v;
        $$('button', box).forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        render();
      });
    }
    pills(brandBox, 'brand', brands); pills(catBox, 'category', cats);

    function filtered() {
      var q = state.q.trim().toLowerCase();
      return P.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
        var p = x.p;
        if (state.brand && p.brand !== state.brand) return false;
        if (state.cat && p.category !== state.cat) return false;
        if (q && (p.name + ' ' + (p.en || '') + ' ' + (p.desc || '') + ' ' + p.brand + ' ' + p.category).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
    }
    function render() {
      var list = filtered();
      var url = new URL(location.href); ['brand', 'cat', 'q', 'sort'].forEach(function (k) { if (state[k] && !(k === 'sort' && state[k] === 'brand')) url.searchParams.set(k, state[k]); else url.searchParams.delete(k); });
      history.replaceState(null, '', url);
      if (count) count.textContent = list.length ? list.length + ' מוצרים' : '';
      if (!list.length) { shopMain.innerHTML = '<div class="empty fade-up"><b>לא נמצא מוצר כזה</b>נסו מילה אחרת, או כתבו לנו בוואטסאפ ונבדוק אם אפשר להשיג.<br><br><a class="btn btn-gold" href="' + WA + '" target="_blank" rel="noopener">שאלה בוואטסאפ</a></div>'; return; }
      var groupKey = state.sort === 'category' ? 'category' : (state.sort === 'brand' ? 'brand' : null);
      var html = '';
      if (groupKey) {
        var order = groupKey === 'brand' ? brands : cats;
        order.forEach(function (g) {
          var items = list.filter(function (x) { return x.p[groupKey] === g; });
          if (!items.length) return;
          html += '<div class="shop-group"><div class="shop-group-head"><h2>' + escapeHtml(g) + '</h2></div><ul class="products" data-stagger>' + items.map(function (x) { return cardHtml(x.p, x.i); }).join('') + '</ul></div>';
        });
      } else {
        list.sort(function (a, b) { return a.p.name.localeCompare(b.p.name, 'he'); });
        html = '<ul class="products" data-stagger>' + list.map(function (x) { return cardHtml(x.p, x.i); }).join('') + '</ul>';
      }
      shopMain.innerHTML = html;
      afterRender(shopMain);
    }
    var st; if (search) search.addEventListener('input', function () { clearTimeout(st); st = setTimeout(function () { state.q = search.value; render(); }, 180); });
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; render(); });
    render();
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
  var qv = $('#qv');
  function openQv(i) {
    var p = P[i]; if (!p) return;
    if (!qv) { location.href = 'shop.html?q=' + encodeURIComponent(p.name); return; }
    $('#qv-media').innerHTML = p.image ? '<img src="' + p.image + '" alt="' + escapeHtml(p.name) + '">' : '<div class="product-media-empty" style="height:100%"><span>תמונה בקרוב</span></div>';
    $('#qv-meta').textContent = [p.brand, p.category, p.size].filter(Boolean).join(' · ');
    $('#qv-title').textContent = p.name;
    $('#qv-desc').textContent = p.desc || '';
    $('#qv-tags').innerHTML = [p.en, p.category].filter(Boolean).map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');
    $('#qv-price').textContent = p.price ? '₪ ' + p.price : 'המחיר נמסר בוואטסאפ';
    $('#qv-wa').href = waLink(p);
    if (typeof qv.showModal === 'function') qv.showModal(); else qv.setAttribute('open', '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qv]'); if (b) { openQv(parseInt(b.dataset.qv, 10)); return; }
    if (qv && e.target === qv) qv.close();
    if (e.target.closest('#qv-close')) qv.close();
    var wa = e.target.closest('a[href^="https://wa.me"]'); if (wa && wa.closest('.product, .qv')) showToast('פותחים וואטסאפ עם פרטי המוצר');
  });
})();
