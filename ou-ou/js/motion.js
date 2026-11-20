/* או או — תנועה. דקורטיבי בלבד: בלי הקובץ הזה הכול עובד ומוצג. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  root.classList.add('js');

  /* ---------- hero: deal the cards, then let the votes breathe ---------- */
  var hero = $('.hero');
  if (hero) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-in'); }); });
    setTimeout(function () { hero.classList.add('is-settled'); }, reduce ? 0 : 1500);

    var art = $('.hero__art'), fan = $('.fan');
    if (art && fan && finePointer && !reduce) {
      // pointer tilt with eased follow (a cheap spring): decorative, desktop only
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      var tick = function () {
        cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
        fan.style.transform = 'perspective(900px) rotateX(' + cy.toFixed(2) + 'deg) rotateY(' + cx.toFixed(2) + 'deg)';
        raf = (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) ? requestAnimationFrame(tick) : null;
      };
      art.addEventListener('pointermove', function (e) {
        var r = art.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 10;
        ty = -((e.clientY - r.top) / r.height - 0.5) * 8;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      art.addEventListener('pointerenter', function () { if (hero.classList.contains('is-settled')) art.classList.add('is-spread'); });
      art.addEventListener('pointerleave', function () { tx = 0; ty = 0; art.classList.remove('is-spread'); if (!raf) raf = requestAnimationFrame(tick); });
    }
  }

  /* ---------- scroll reveals, staggered per group ---------- */
  var SEL = '.h2, main .sub, .why__item, .who__item, .opt, .uses li, .inbox li, .assure li, .price, .qty-row, .faq details, .story__text p, .quote, .box, .bigfacts li, .cues li, .note, .vid__frame, .steps--3 li, .more, .row-actions, .last__h, .form .field';
  var targets = $$(SEL).filter(function (el) { return !el.closest('.hero, .drawer, .mnav, .top, .panel'); });
  if ('IntersectionObserver' in window && !reduce) {
    targets.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return targets.indexOf(c) > -1; });
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 70 + 'ms');
      el.setAttribute('data-reveal', '');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- whatsapp bubble: arrive after the first impression ---------- */
  var wa = $('.wa');
  if (wa) setTimeout(function () { wa.classList.add('is-in'); }, reduce ? 0 : 1800);

  /* ---------- tabs: a sliding pill ---------- */
  $$('.tabs').forEach(function (tabs) {
    var pill = document.createElement('span'); pill.className = 'tabs__pill'; pill.setAttribute('aria-hidden', 'true');
    tabs.appendChild(pill); tabs.classList.add('has-pill');
    var place = function (instant) {
      var t = $('[aria-selected="true"]', tabs); if (!t) return;
      if (instant) pill.style.transition = 'none';
      pill.style.width = t.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + t.offsetLeft + 'px)';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    };
    place(true);
    new MutationObserver(function () { place(false); }).observe(tabs, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
    window.addEventListener('resize', function () { place(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(true); });
  });

  /* ---------- pull-a-card: soften the word swap on re-draws ---------- */
  var big = $('[data-bigcard]');
  if (big) {
    var back = document.createElement('span'); back.className = 'stack-hint'; back.setAttribute('aria-hidden', 'true');
    var back2 = document.createElement('span'); back2.className = 'bigcard__shadow'; back2.setAttribute('aria-hidden', 'true');
    big.appendChild(back); big.appendChild(back2);
    var status = $('[data-draw-status]');
    new MutationObserver(function () {
      if (reduce) return;
      big.classList.add('is-swap'); if (status) status.classList.add('is-swap');
      setTimeout(function () { big.classList.remove('is-swap'); if (status) status.classList.remove('is-swap'); }, 160);
    }).observe($('[data-pick="0"]'), { childList: true, characterData: true, subtree: true });
  }

  /* ---------- cart badge: pulse when the count changes ---------- */
  var badge = $('[data-cart-count]');
  if (badge) {
    var last = badge.textContent;
    new MutationObserver(function () {
      if (badge.textContent === last) return; last = badge.textContent;
      badge.classList.remove('is-bump'); void badge.offsetWidth; badge.classList.add('is-bump');
    }).observe(badge, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- how-to-play: progress bar inside the active caption ---------- */
  var vid = $('[data-howto-video]');
  if (vid) {
    var cues = $$('[data-cue]'), starts = cues.map(function (c) { return parseFloat(c.dataset.cue); });
    var loop = function () {
      var t = vid.currentTime, d = vid.duration || 15;
      cues.forEach(function (c, i) {
        var s = starts[i], e = i + 1 < starts.length ? starts[i + 1] : d;
        var p = t < s ? 0 : t >= e ? 1 : (t - s) / (e - s);
        c.style.setProperty('--p', p.toFixed(3));
      });
      if (!vid.paused) requestAnimationFrame(loop);
    };
    vid.addEventListener('play', function () { requestAnimationFrame(loop); });
    vid.addEventListener('seeked', loop);
    if (!vid.paused) requestAnimationFrame(loop);
  }
})();
