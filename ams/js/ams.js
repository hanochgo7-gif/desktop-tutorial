(() => {
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-hero]');
  const sticky = document.querySelector('.sticky-cta');

  // כותרת עליונה מקבלת רקע אחרי גלילה; כפתור וואטסאפ צף מופיע אחרי ה־hero
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (sticky && hero) sticky.classList.toggle('is-visible', y > hero.offsetHeight * 0.7);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // תפריט נייד
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });

  // התפר בין "גוף" ל"תודעה" עוקב אחרי העכבר (רק בעכבר, ורק בלי העדפת הפחתת תנועה)
  const fine = window.matchMedia('(pointer: fine)').matches;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hero && fine && !calm) {
    let target = 50, current = 50, raf = 0;
    const tick = () => {
      current += (target - current) * 0.08;
      hero.style.setProperty('--split', current.toFixed(2) + '%');
      raf = Math.abs(target - current) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const aim = (v) => { target = v; if (!raf) raf = requestAnimationFrame(tick); };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width; // 0..1
      aim(35 + x * 30);                          // 35%..65%
    });
    hero.addEventListener('pointerleave', () => aim(50));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
