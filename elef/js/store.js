/* אלף: נתוני מוצרים, סל קניות ורכיבים משותפים לכל העמודים */
(function () {
  'use strict';

  var FREE_SHIPPING = 250;

  var PRODUCTS = [
    {
      id: 'early', profile: 'חריף ומר', cat: 'bottles', name: 'קטיף ראשון', size: '500 מ״ל', price: 94,
      badge: 'קטיף 2026',
      img: 'images/p-early', alt: 'בקבוק אלף קטיף ראשון על גדר אבן בזריחה',
      gallery: ['images/harvest-hands', 'images/olive-dew'],
      short: 'סורי שנקטף ירוק בשבוע הראשון של העונה. חריף, מר ועשבי.',
      long: 'הזיתים הראשונים של העונה, עוד ירוקים על העץ. יוצא מהם פחות שמן, אבל זה השמן הכי חי שלנו: ריח של עשב קצוץ ועלה עגבנייה, מרירות נעימה בהתחלה ועקצוץ בגרון בסוף. העקצוץ הזה מגיע מהפוליפנולים, והוא סימן לשמן טרי.',
      taste: { bitter: 4, pungent: 5, fruity: 3 },
      notes: 'עשב קצוץ, עלה עגבנייה, ארטישוק ירוק',
      pair: 'לבנה, סלט עגבניות, לחם חם, מרק עדשים',
      variety: 'סורי', harvest: '4–9 באוקטובר 2026', acidity: '0.19%', poly: '640 מ״ג/ק״ג'
    },
    {
      id: 'souri', profile: 'מאוזן ופירותי', cat: 'bottles', name: 'סורי מהגליל', size: '750 מ״ל', price: 112,
      img: 'images/p-souri', alt: 'בקבוק אלף סורי מהגליל על גדר טרסה',
      gallery: ['images/grove-path', 'images/millstone'],
      short: 'הזן הוותיק של הגליל, בשיא הבשלות. ארטישוק וסיומת פלפלית.',
      long: 'סורי הוא הזן שגדל בגליל מאות שנים, והוא רוב העצים שלנו. אנחנו קוטפים אותו כשחצי מהזיתים כבר מתחילים להשחיר, ומקבלים שמן מאוזן: פירותי באף, מעט מר, ועם סיומת פלפלית ארוכה. השמן שאנחנו שמים על השולחן בבית כל יום.',
      taste: { bitter: 3, pungent: 3, fruity: 4 },
      notes: 'ארטישוק, שקד ירוק, פלפל שחור',
      pair: 'חומוס, ירקות קלויים, דגים על הגריל, גבינות קשות',
      variety: 'סורי', harvest: '12–30 באוקטובר 2026', acidity: '0.22%', poly: '480 מ״ג/ק״ג'
    },
    {
      id: 'ancient', profile: 'עגול ועמוק', cat: 'bottles', name: 'עצים עתיקים', size: '375 מ״ל', price: 138,
      badge: 'מהדורה ממוספרת',
      img: 'images/p-ancient', alt: 'בקבוק אלף עצים עתיקים על אבן מכוסה חזזית',
      gallery: ['images/bark', 'images/farmer-profile'],
      short: 'רק מ-41 העצים הוותיקים בכרם. 1,200 בקבוקים ממוספרים בשנה.',
      long: 'בטרסה העליונה עומדים 41 עצים שגילם מוערך בין 600 ל-1,000 שנה. הם נותנים מעט מאוד פרי, ואנחנו קוטפים וכותשים אותם בנפרד. השמן עגול ועמוק, עם ריח של תאנה ירוקה ועשבי תיבול. כל בקבוק ממוספר ביד.',
      taste: { bitter: 3, pungent: 4, fruity: 4 },
      notes: 'תאנה ירוקה, זעתר, עלי זית',
      pair: 'בטפטוף בסוף: על קרפצ׳יו, בורטה, גלידת וניל',
      variety: 'סורי, עצים בני 600+ שנה', harvest: '20 באוקטובר 2026', acidity: '0.17%', poly: '590 מ״ג/ק״ג'
    },
    {
      id: 'daily', profile: 'עדין ופירותי', cat: 'bottles', name: 'יום־יום', size: '1 ליטר', price: 86,
      badge: 'הכי נמכר',
      img: 'images/p-daily', alt: 'בקבוק אלף יום־יום ליטר על קיר אבן',
      gallery: ['images/bread-drop', 'images/bread-bowl'],
      short: 'ברנע וקורונייקי. עדין ופירותי, לבישול, לסלטים ולכל דבר.',
      long: 'שמן עדין יותר, מעצים צעירים של ברנע וקורונייקי בטרסות התחתונות. מעט מרירות, הרבה פרי, ומחיר שמאפשר להשתמש בו בנדיבות: לטיגון קל, לאפייה, לרטבים ולסלט של ארוחת הערב.',
      taste: { bitter: 2, pungent: 2, fruity: 4 },
      notes: 'תפוח ירוק, בננה ירוקה, שקד',
      pair: 'ביצים, פסטה, אפייה, טיגון קל, סלט ירוק',
      variety: 'ברנע, קורונייקי', harvest: 'אוקטובר–נובמבר 2026', acidity: '0.28%', poly: '310 מ״ג/ק״ג'
    },
    {
      id: 'tin', profile: 'מאוזן ופירותי', cat: 'tins', name: 'פח מבית הבד', size: '4 ליטר', price: 329,
      img: 'images/p-tin', alt: 'שמן זית טרי זורם מברז פליז לכד חרס',
      gallery: ['images/spout', 'images/pour-jug'],
      short: 'סורי ישר מהמיכל, כמו שקונים אצלנו בבית הבד. למשפחות שגומרות שמן מהר.',
      long: 'בכפר קונים שמן בפחים: נוסעים לבית הבד, ממלאים לשנה שלמה. זה אותו שמן כמו הסורי בבקבוק, בפח מתכת אטום לאור עם ברז שפיכה. כדאי להעביר לבקבוק קטן לשימוש יומי ולשמור את הפח סגור במקום קריר.',
      taste: { bitter: 3, pungent: 3, fruity: 4 },
      notes: 'ארטישוק, שקד ירוק, פלפל שחור',
      pair: 'הכול, כל השנה',
      variety: 'סורי', harvest: 'אוקטובר 2026', acidity: '0.22%', poly: '480 מ״ג/ק״ג'
    },
    {
      id: 'gift', profile: 'שלושה טעמים במארז', cat: 'gifts', name: 'מארז חנוכה', size: '3 בקבוקים של 250 מ״ל', price: 189,
      badge: 'חדש לחנוכה',
      img: 'images/p-gift', alt: 'ידיים בוצעות לחם כפרי לצד קערית שמן זית',
      gallery: ['images/p-gift-2', 'images/bread-drop'],
      short: 'קטיף ראשון, סורי ויום־יום בקופסת עץ, עם כרטיס ברכה בכתב יד.',
      long: 'שלושת השמנים שלנו בבקבוקים קטנים, בקופסת עץ אורן עם מכסה הזזה. מצרפים כרטיס עם הסבר קצר על כל שמן והצעה מה לטבול בו, ואם תרצו גם ברכה שתכתבו בהזמנה. אפשר לשלוח ישירות לכתובת של מקבל המתנה.',
      taste: { bitter: 3, pungent: 3, fruity: 4 },
      notes: 'שלושה פרופילים: חריף, מאוזן ועדין',
      pair: 'ערב טעימות עם לחם טוב ומלח גס',
      variety: 'סורי, ברנע, קורונייקי', harvest: 'אוקטובר 2026', acidity: 'לפי השמן', poly: 'לפי השמן'
    }
  ];

  function byId(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }

  function money(n) { return '₪' + n.toLocaleString('he-IL'); }

  /* ---------- סל ---------- */
  var KEY = 'elef-cart-v1';
  var memory = [];
  var lastRemoved = null; /* לביטול הסרה מהסל */

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(function (l) { return byId(l.id) && l.qty > 0; });
      }
    } catch (e) { return memory; }
    return memory.length ? memory : [];
  }

  function write(lines) {
    memory = lines;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* פרטי, חסום: נשאר בזיכרון */ }
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  var Cart = {
    lines: read,
    count: function () { return read().reduce(function (s, l) { return s + l.qty; }, 0); },
    subtotal: function () { return read().reduce(function (s, l) { return s + byId(l.id).price * l.qty; }, 0); },
    add: function (id, qty) {
      var lines = read(), found = false;
      lines.forEach(function (l) { if (l.id === id) { l.qty = Math.min(20, l.qty + qty); found = true; } });
      if (!found) lines.push({ id: id, qty: qty });
      write(lines);
    },
    set: function (id, qty) {
      var lines = read().map(function (l) { if (l.id === id) l.qty = Math.max(0, Math.min(20, qty)); return l; })
        .filter(function (l) { return l.qty > 0; });
      write(lines);
    },
    clear: function () { write([]); }
  };

  /* ---------- רכיבים ---------- */
  function picture(base, alt, sizes, cls) {
    var big = base.indexOf('images/p-') === 0 ? 1000 : 2000;
    var small = base.indexOf('images/p-') === 0 ? 600 : 1000;
    return '<img class="' + (cls || '') + '" src="' + base + '-' + small + '.webp" srcset="' + base + '-' + small + '.webp ' + small + 'w, ' + base + '-' + big + '.webp ' + big + 'w" sizes="' + sizes + '" alt="' + alt + '" loading="lazy" decoding="async">';
  }

  function card(p) {
    return '' +
      '<article class="product" data-cat="' + p.cat + '">' +
        '<a class="product__media" href="product.html?p=' + p.id + '" tabindex="-1" aria-hidden="true">' +
          picture(p.img, p.alt, '(min-width: 1100px) 30vw, (min-width: 640px) 45vw, 92vw') +
          (p.badge ? '<span class="product__badge">' + p.badge + '</span>' : '') +
        '</a>' +
        '<div class="product__body">' +
          '<h3 class="product__name"><a href="product.html?p=' + p.id + '">' + p.name + '</a></h3>' +
          '<p class="product__meta"><span>' + p.size + '</span><span class="product__profile">' + p.profile + '</span></p>' +
          '<p class="product__short">' + p.short + '</p>' +
          '<div class="product__foot">' +
            '<span class="product__price">' + money(p.price) + '</span>' +
            '<button class="btn btn--small" type="button" data-add="' + p.id + '">הוספה לסל</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- מגירת הסל ---------- */
  function renderDrawer() {
    var body = document.querySelector('[data-cart-lines]');
    if (!body) return;
    var lines = Cart.lines();
    var sub = Cart.subtotal();
    var foot = document.querySelector('[data-cart-foot]');
    var bar = document.querySelector('[data-ship-bar]');
    var msg = document.querySelector('[data-ship-msg]');

    var undo = lastRemoved ? '<div class="line-undo" role="status"><span>' + byId(lastRemoved.id).name + ' הוסר מהסל.</span><button type="button" class="link-btn" data-undo>החזרה לסל</button></div>' : '';
    if (!lines.length) {
      body.innerHTML = undo + '<div class="cart-empty"><p>הסל ריק.</p><a class="btn btn--ghost" href="index.html#shop" data-close-cart>לבחירת שמן</a></div>';
      foot.hidden = true;
    } else {
      body.innerHTML = undo + lines.map(function (l) {
        var p = byId(l.id);
        return '<div class="line">' +
          '<img src="' + p.img + '-600.webp" alt="" width="72" height="90">' +
          '<div class="line__info"><a href="product.html?p=' + p.id + '" class="line__name">' + p.name + '</a>' +
          '<span class="line__size">' + p.size + '</span>' +
          '<div class="qty" aria-label="כמות ' + p.name + '">' +
            '<button type="button" data-qty="' + p.id + '" data-step="1" aria-label="הוספת יחידה">+</button>' +
            '<output>' + l.qty + '</output>' +
            '<button type="button" data-qty="' + p.id + '" data-step="-1" aria-label="הורדת יחידה">−</button>' +
          '</div></div>' +
          '<div class="line__end"><span>' + money(p.price * l.qty) + '</span>' +
          '<button type="button" class="line__remove" data-remove="' + p.id + '">הסרה</button></div>' +
        '</div>';
      }).join('');
      foot.hidden = false;
      document.querySelector('[data-cart-sub]').textContent = money(sub);
      var shipEl = document.querySelector('[data-cart-ship]');
      if (shipEl) shipEl.textContent = sub >= FREE_SHIPPING ? 'חינם' : '₪29';
    }
    var left = FREE_SHIPPING - sub;
    if (bar) bar.style.setProperty('--p', Math.min(1, sub / FREE_SHIPPING));
    if (msg) msg.textContent = sub === 0 ? 'משלוח חינם בהזמנה מעל ' + money(FREE_SHIPPING)
      : left > 0 ? 'עוד ' + money(left) + ' למשלוח חינם' : 'ההזמנה שלכם במשלוח חינם';
  }

  function updateCount() {
    var n = Cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    document.querySelectorAll('[data-cart-label]').forEach(function (el) {
      el.setAttribute('aria-label', 'סל הקניות, ' + n + ' פריטים');
    });
  }

  var lastFocus = null;
  function openCart() {
    var d = document.getElementById('cart');
    if (!d) return;
    lastFocus = document.activeElement;
    renderDrawer();
    d.hidden = false;
    requestAnimationFrame(function () { d.classList.add('is-open'); });
    document.documentElement.classList.add('no-scroll');
    d.querySelector('.drawer__close').focus();
  }
  function closeCart() {
    var d = document.getElementById('cart');
    if (!d || d.hidden) return;
    d.classList.remove('is-open');
    lastRemoved = null;
    document.documentElement.classList.remove('no-scroll');
    setTimeout(function () { d.hidden = true; }, 320);
    if (lastFocus) lastFocus.focus();
  }

  var toastTimer;
  function toast(text) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) {
      var qtyInput = document.querySelector('[data-add-qty]');
      var qty = add.hasAttribute('data-use-qty') && qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
      Cart.add(add.getAttribute('data-add'), qty);
      var p = byId(add.getAttribute('data-add'));
      if (!document.querySelector('[data-added-note]')) toast(p.name + ' נוסף לסל');
      add.classList.add('is-added');
      lastRemoved = null;
      document.querySelectorAll('[data-cart-count]').forEach(function (b) {
        b.classList.remove('is-bumped'); void b.offsetWidth; b.classList.add('is-bumped');
      });
      var note = document.querySelector('[data-added-note]');
      if (note) note.hidden = false;
      var label = add.textContent;
      add.textContent = 'נוסף לסל';
      setTimeout(function () { add.textContent = label; add.classList.remove('is-added'); }, 1600);
      return;
    }
    if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openCart(); return; }
    if (e.target.closest('[data-close-cart]')) { closeCart(); return; }
    var q = e.target.closest('[data-qty]');
    if (q) {
      var id = q.getAttribute('data-qty');
      var cur = Cart.lines().filter(function (l) { return l.id === id; })[0];
      var next = (cur ? cur.qty : 0) + parseInt(q.getAttribute('data-step'), 10);
      lastRemoved = next <= 0 && cur ? { id: id, qty: cur.qty } : null;
      Cart.set(id, next);
      focusAfterChange(lastRemoved ? '[data-undo]' : '[data-qty="' + id + '"][data-step="' + q.getAttribute('data-step') + '"]');
      return;
    }
    var r = e.target.closest('[data-remove]');
    if (r) {
      var rid = r.getAttribute('data-remove');
      var line = Cart.lines().filter(function (l) { return l.id === rid; })[0];
      lastRemoved = line ? { id: rid, qty: line.qty } : null;
      Cart.set(rid, 0);
      focusAfterChange('[data-undo]');
      return;
    }
    if (e.target.closest('[data-undo]') && lastRemoved) {
      var back = lastRemoved; lastRemoved = null;
      Cart.add(back.id, back.qty);
      focusAfterChange('[data-remove="' + back.id + '"]');
    }
  });

  /* אחרי שהסל מצטייר מחדש, הפוקוס חוזר לכפתור הגיוני ולא נופל לראש העמוד */
  function focusAfterChange(sel) {
    var el = document.querySelector('#cart ' + sel);
    if (el) el.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCart();
    var d = document.getElementById('cart');
    if (e.key === 'Tab' && d && !d.hidden) {
      var f = d.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('cart:change', function () { updateCount(); renderDrawer(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateCount(); renderDrawer(); } });

  /* כותרת: רקע כשגוללים, תפריט נייד */
  function initHeader() {
    var h = document.querySelector('.site-header');
    if (!h) return;
    var onScroll = function () { h.classList.toggle('is-solid', window.scrollY > 40 || !h.hasAttribute('data-over-hero')); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    var tgl = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (tgl && nav) {
      tgl.addEventListener('click', function () {
        var open = tgl.getAttribute('aria-expanded') === 'true';
        tgl.setAttribute('aria-expanded', String(!open));
        nav.classList.toggle('is-open', !open);
        h.classList.toggle('menu-open', !open);
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) { tgl.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); h.classList.remove('menu-open'); }
      });
    }
  }


  function initSignup() {
    var form = document.querySelector('[data-signup]');
    var msg = document.querySelector('[data-signup-msg]');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.textContent = 'נראה שחסר משהו בכתובת. בדקו שיש בה @ ונקודה.'; form.email.focus(); return; }
      msg.textContent = 'נרשמתם. קוד ההנחה שלכם להזמנה הראשונה: ELEF10';
      form.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initSignup();
    updateCount();
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  });

  window.Elef = { PRODUCTS: PRODUCTS, byId: byId, money: money, Cart: Cart, card: card, picture: picture, toast: toast, FREE_SHIPPING: FREE_SHIPPING, openCart: openCart };
})();
