// תפריט נייד
const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
}

// מאתר טיפול לפי מטרה
const goals = Array.from(document.querySelectorAll('.goal'));
goals.forEach((btn) => {
  btn.addEventListener('click', () => {
    goals.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
      document.getElementById(b.getAttribute('aria-controls')).hidden = !active;
    });
  });
});

// שנה בפוטר
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
