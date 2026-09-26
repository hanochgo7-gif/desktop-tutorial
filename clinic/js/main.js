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

// רינדור החנות מתוך products.js, עם סינון לפי מותג
const WA = 'https://wa.me/972545779379';
const list = document.getElementById('products');
const filterBar = document.getElementById('brand-filter');
if (list && window.PRODUCTS) {
  const all = window.PRODUCTS;
  const render = (items) => {
    list.innerHTML = items.map((p) => {
      const msg = encodeURIComponent('היי, אני מעוניין/ת ב: ' + p.name);
      const media = p.image
        ? `<figure class="product-media${p.tall ? ' product-media-tall' : ''}"><img src="${p.image}" alt="${p.name}" loading="lazy"></figure>`
        : `<figure class="product-media product-media-empty" aria-hidden="true"><span>תמונה בקרוב</span></figure>`;
      const price = p.price ? `<span class="price">₪ ${p.price}</span>` : `<span class="price price-ask">מחיר בוואטסאפ</span>`;
      const meta = [p.brand, p.size].filter(Boolean).join(', ');
      return `<li class="product">${media}
        <div class="product-info">
          <p class="product-meta">${meta}</p>
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
          <div class="product-row">${price}<a class="link-line" href="${WA}?text=${msg}" target="_blank" rel="noopener">הזמנה בוואטסאפ</a></div>
        </div></li>`;
    }).join('');
  };

  if (filterBar) {
    const brands = [...new Set(all.map((p) => p.brand))];
    const options = [{ key: '', label: 'הכול', n: all.length }]
      .concat(brands.map((b) => ({ key: b, label: b, n: all.filter((p) => p.brand === b).length })));
    filterBar.innerHTML = options.map((o, i) =>
      `<button type="button" class="goal${i === 0 ? ' is-active' : ''}" data-brand="${o.key}" aria-pressed="${i === 0}">${o.label}<span class="count">${o.n}</span></button>`
    ).join('');
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-brand]');
      if (!btn) return;
      filterBar.querySelectorAll('button').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      const key = btn.dataset.brand;
      render(key ? all.filter((p) => p.brand === key) : all);
    });
  }
  render(all);
}
