/* או או — רכיבים משותפים לכל העמודים: כותרת, תפריט נייד, פוטר, וואטסאפ, סל. */
(function () {
  'use strict';
  var page = document.body.dataset.page || 'home';
  var home = page === 'home' ? '' : 'index.html';

  var NAV = [
    ['how-to-play.html', 'איך משחקים', 'how'],
    [home + '#draw', 'שלפו קלף', 'draw'],
    ['business.html', 'לעסקים ומנחים', 'business'],
    ['about.html', 'הסיפור', 'about'],
    ['faq.html', 'שאלות', 'faq']
  ];
  function links() {
    return NAV.map(function (n) {
      return '<a href="' + n[0] + '"' + (n[2] === page ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
  }
  var mark = '<svg class="logo" viewBox="0 0 255 90" aria-hidden="true" focusable="false"><g fill="#C3DB5B"><rect x="-23.00" y="-100.00" width="46.00" height="66.00" rx="9.00" transform="translate(211.72 110.55) rotate(-12 0 0)"/></g><g fill="#5CC6DA"><rect x="-23.00" y="-100.00" width="46.00" height="66.00" rx="9.00" transform="translate(211.72 110.55) rotate(12 0 0)"/></g><clipPath id="hdrc"><rect x="-23.00" y="-100.00" width="46.00" height="66.00" rx="9.00" transform="translate(211.72 110.55) rotate(12 0 0)"/></clipPath><g clip-path="url(#hdrc)" fill="#2E9C93"><rect x="-23.00" y="-100.00" width="46.00" height="66.00" rx="9.00" transform="translate(211.72 110.55) rotate(-12 0 0)"/></g><path transform="translate(0 2.00) scale(0.62)" fill="currentColor" d="M240.32 116.16Q236.72 118.8 234.38 118.86Q232.04 118.92 230.48 117.47999999999999Q228.92 116.03999999999999 227.48 114.36L183.67999999999998 62.16Q182.0 60.239999999999995 180.98 58.199999999999996Q179.95999999999998 56.16 180.67999999999998 53.879999999999995Q181.39999999999998 51.599999999999994 185.12 48.959999999999994Q188.72 46.2 191.0 46.26Q193.28 46.31999999999999 194.89999999999998 47.879999999999995Q196.51999999999998 49.44 198.2 51.480000000000004L242.0 103.56Q243.56 105.36 244.45999999999998 107.22Q245.35999999999999 109.08 244.57999999999998 111.3Q243.79999999999998 113.52 240.32 116.16ZM183.32 117.6Q179.0 116.52 177.5 114.72Q176.0 112.92 176.18 110.58Q176.35999999999999 108.24 176.95999999999998 105.96L189.32 64.56L204.56 72.12L194.35999999999999 111.0Q193.76 113.39999999999999 192.85999999999999 115.32Q191.95999999999998 117.24 189.73999999999998 117.96Q187.51999999999998 118.67999999999999 183.32 117.6ZM225.32 96.0 218.0 86.75999999999999 227.12 54.0Q227.95999999999998 51.599999999999994 228.98 49.739999999999995Q230.0 47.879999999999995 232.22 47.22Q234.44 46.56 238.76 47.879999999999995Q242.95999999999998 49.08 244.27999999999997 50.94Q245.6 52.8 245.36 55.08Q245.12 57.36 244.27999999999997 59.879999999999995L238.04 82.56Q237.07999999999998 85.19999999999999 235.45999999999998 87.17999999999999Q233.83999999999997 89.16 231.32 91.08Q228.79999999999998 93.0 225.32 96.0Z M155.88 117.96Q151.56 117.96 149.64 116.63999999999999Q147.72 115.32 147.3 113.22Q146.88 111.11999999999999 146.88 108.84V55.8Q146.88 53.519999999999996 147.3 51.419999999999995Q147.72 49.31999999999999 149.64 47.99999999999999Q151.56 46.67999999999999 156.0 46.67999999999999Q160.44 46.67999999999999 162.3 48.059999999999995Q164.16 49.44 164.57999999999998 51.54Q165.0 53.64 165.0 55.919999999999995V108.96Q165.0 111.24 164.51999999999998 113.28Q164.04 115.32 162.18 116.63999999999999Q160.32 117.96 155.88 117.96Z M99.32000000000001 116.16Q95.72 118.8 93.38 118.86Q91.04 118.92 89.48 117.47999999999999Q87.92 116.03999999999999 86.48 114.36L42.68000000000001 62.16Q41.00000000000001 60.239999999999995 39.980000000000004 58.199999999999996Q38.96000000000001 56.16 39.68000000000001 53.879999999999995Q40.400000000000006 51.599999999999994 44.120000000000005 48.959999999999994Q47.720000000000006 46.2 50.0 46.26Q52.28 46.31999999999999 53.900000000000006 47.879999999999995Q55.52 49.44 57.2 51.480000000000004L101.0 103.56Q102.56 105.36 103.46000000000001 107.22Q104.36 109.08 103.58 111.3Q102.8 113.52 99.32000000000001 116.16ZM42.32000000000001 117.6Q38.00000000000001 116.52 36.50000000000001 114.72Q35.00000000000001 112.92 35.18000000000001 110.58Q35.36000000000001 108.24 35.96000000000001 105.96L48.32000000000001 64.56L63.56 72.12L53.36 111.0Q52.760000000000005 113.39999999999999 51.86000000000001 115.32Q50.96000000000001 117.24 48.74000000000001 117.96Q46.52 118.67999999999999 42.32000000000001 117.6ZM84.32 96.0 77.0 86.75999999999999 86.12 54.0Q86.96000000000001 51.599999999999994 87.98 49.739999999999995Q89.0 47.879999999999995 91.22 47.22Q93.44 46.56 97.76 47.879999999999995Q101.96000000000001 49.08 103.28 50.94Q104.60000000000001 52.8 104.36000000000001 55.08Q104.12 57.36 103.28 59.879999999999995L97.04 82.56Q96.08 85.19999999999999 94.46000000000001 87.17999999999999Q92.84 89.16 90.32000000000001 91.08Q87.80000000000001 93.0 84.32 96.0Z M14.880000000000006 117.96Q10.560000000000006 117.96 8.640000000000006 116.63999999999999Q6.720000000000007 115.32 6.300000000000007 113.22Q5.880000000000007 111.11999999999999 5.880000000000007 108.84V55.8Q5.880000000000007 53.519999999999996 6.300000000000007 51.419999999999995Q6.720000000000007 49.31999999999999 8.640000000000006 47.99999999999999Q10.560000000000006 46.67999999999999 15.000000000000007 46.67999999999999Q19.440000000000005 46.67999999999999 21.300000000000004 48.059999999999995Q23.160000000000007 49.44 23.580000000000005 51.54Q24.000000000000007 53.64 24.000000000000007 55.919999999999995V108.96Q24.000000000000007 111.24 23.520000000000007 113.28Q23.040000000000006 115.32 21.180000000000007 116.63999999999999Q19.320000000000007 117.96 14.880000000000006 117.96Z"/></svg>';

  var header =
    '<header class="top" id="top"><div class="wrap top__in">' +
      '<button class="menubtn" type="button" data-menu aria-expanded="false" aria-controls="mnav" aria-label="תפריט"><span></span><span></span><span></span></button>' +
      '<a href="' + (home || '#top') + '" class="mark" aria-label="או או – דף הבית">' + mark + '</a>' +
      '<nav class="nav" aria-label="ניווט ראשי">' + links() + '</nav>' +
      '<button class="cartbtn" type="button" data-open-cart aria-label="סל הקניות">' +
        '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>' +
        '<span class="cartbtn__n" data-cart-count hidden>0</span>' +
      '</button>' +
    '</div>' +
    '<nav class="mnav" id="mnav" aria-label="תפריט נייד" hidden>' + links() +
      '<button class="btn btn--main btn--wide" type="button" data-order>להזמנה · <span data-price>140</span> ₪</button>' +
    '</nav></header>';

  var footer =
    '<footer class="foot"><div class="wrap foot__in">' +
      '<div><a href="' + (home || '#top') + '" class="mark" aria-label="או או – דף הבית">' + mark + '</a>' +
      '<p>משחק קלפים להיכרות, לגילוי ולצחוק. נוצר על ידי רויטל, מנחת קבוצות.</p></div>' +
      '<div><h2 class="foot__h">המשחק</h2>' +
        '<p><a href="how-to-play.html">איך משחקים</a></p><p><a href="business.html">לעסקים, מנחים וסדנאות</a></p>' +
        '<p><a href="about.html">הסיפור</a></p><p><a href="faq.html">שאלות ותשובות</a></p></div>' +
      '<div><h2 class="foot__h">יצירת קשר</h2>' +
        '<p><a data-wa-link href="#">וואטסאפ: <span data-phone>050-7281161</span></a></p>' +
        '<p data-email-row hidden><a data-email-link href="#"></a></p>' +
        '<p data-ig-row hidden><a data-ig-link href="#" target="_blank" rel="noopener">אינסטגרם</a></p></div>' +
      '<div><h2 class="foot__h">מידע</h2>' +
        '<p><a href="terms.html">תקנון, משלוחים וביטולים</a></p><p><a href="privacy.html">מדיניות פרטיות</a></p>' +
        '<p><a href="accessibility.html">הצהרת נגישות</a></p><p><button type="button" class="linkbtn" data-consent-open hidden>הגדרות עוגיות</button></p></div>' +
    '</div><p class="wrap foot__c">© <span data-year></span> או או | מה אתה יותר?</p></footer>' +
    '<a class="wa" data-wa-link href="#" aria-label="שאלה בוואטסאפ"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3a2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg></a>';

  var steps = function (n) {
    var names = ['סל', 'פרטים', 'אישור בוואטסאפ'];
    return '<ol class="flow" aria-label="שלבי ההזמנה">' + names.map(function (t, i) {
      return '<li' + (i + 1 === n ? ' aria-current="step"' : '') + (i + 1 < n ? ' class="is-done"' : '') + '><span>' + (i + 1) + '</span>' + t + '</li>';
    }).join('') + '</ol>';
  };
  var assure =
    '<ul class="assure assure--sm">' +
      '<li>לא משלמים באתר. משלמים רק אחרי אישור מול רויטל</li>' +
      '<li>14 ימים לביטול, לפי חוק הגנת הצרכן</li>' +
      '<li>הגיע פגום? מחליפים בלי עלות</li>' +
    '</ul>';
  var qtyRow =
    '<div class="line"><div class="line__thumb" aria-hidden="true">' + '<img src="brand/symbol.svg" alt="" width="44" height="40">' + '</div>' +
    '<div class="line__info"><b>או או | מה אתה יותר?</b><span><span data-price>140</span> ₪ ליחידה · קופסה לקבוצה של עד <span dir="ltr">35</span></span></div>' +
    '<div class="qty qty--sm" role="group" aria-label="כמות"><button type="button" data-cart-qty="+1" aria-label="הוספת יחידה">+</button><output data-cart-qty-out aria-live="polite">1</output><button type="button" data-cart-qty="-1" aria-label="הורדת יחידה">−</button></div></div>';
  var field = function (id, name, label, attrs, hint) {
    return '<div class="field field--full" data-field="' + name + '"><label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" name="' + name + '" ' + attrs + ' aria-describedby="' + id + '-err' + (hint ? ' ' + id + '-hint' : '') + '">' +
      (hint ? '<small class="hint-inline" id="' + id + '-hint">' + hint + '</small>' : '') +
      '<p class="field__err" id="' + id + '-err" aria-live="polite"></p></div>';
  };

  var drawer =
    '<div class="scrim" data-scrim hidden></div>' +
    '<aside class="drawer" data-drawer role="dialog" aria-modal="true" aria-labelledby="cart-h" hidden>' +
      '<div class="drawer__head"><h2 id="cart-h" data-drawer-title tabindex="-1">הסל שלכם</h2><button type="button" class="x" data-close aria-label="סגירה">×</button></div>' +

      '<div class="drawer__body" data-view="cart">' + steps(1) +
        '<div data-cart-empty><p class="empty">הסל עדיין ריק.</p><button class="btn btn--main btn--wide" type="button" data-order>להזמנה · <span data-price>140</span> ₪</button></div>' +
        '<div data-cart-full hidden>' + qtyRow +
          '<dl class="sum"><div><dt>סכום ביניים</dt><dd><span data-subtotal>140</span> ₪</dd></div><div><dt>משלוח</dt><dd>מאושר מול רויטל לפני התשלום</dd></div></dl>' +
          '<p class="hint" data-free-hint hidden></p>' +
          '<button class="btn btn--main btn--wide" type="button" data-go-checkout>להמשך: פרטי משלוח</button>' +
          assure +
          '<p class="hint">מזמינים 10 ומעלה לצוות או לארגון? <a href="business.html">דברו איתנו</a></p>' +
        '</div>' +
      '</div>' +

      '<form class="drawer__body form" data-view="checkout" data-checkout novalidate hidden>' + steps(2) + qtyRow +
        '<fieldset><legend>הפרטים שלכם</legend>' +
          field('c-name', 'name', 'שם מלא', 'autocomplete="name" required') +
          field('c-phone', 'phone', 'טלפון נייד', 'type="tel" autocomplete="tel" inputmode="tel" required placeholder="050-1234567"', 'כאן רויטל תחזור אליכם לאישור') +
          field('c-email', 'email', 'מייל לקבלה <small>(לא חובה)</small>', 'type="email" autocomplete="email" inputmode="email"') +
        '</fieldset>' +
        '<fieldset><legend>משלוח</legend>' +
          '<div class="radios" data-ship-options role="radiogroup" aria-label="שיטת משלוח"></div>' +
          '<p class="hint-inline" data-ship-note>את מחיר המשלוח וזמן ההגעה רויטל מאשרת איתכם לפני התשלום. לא מתאים? מבטלים בלי עלות.</p>' +
          '<label class="check"><input type="checkbox" name="gift" data-gift-toggle> <span>זו מתנה: שלחו ישר למקבל/ת, עם ברכה</span></label>' +
          '<div class="gift" data-gift hidden>' +
            field('c-rname', 'rname', 'שם המקבל/ת', 'autocomplete="off"') +
            field('c-rphone', 'rphone', 'טלפון המקבל/ת', 'type="tel" inputmode="tel" autocomplete="off" placeholder="050-1234567"', 'לתיאום המשלוח בלבד') +
            '<div class="field field--full"><label for="c-note">ברכה שתצורף למשחק <small>(לא חובה)</small></label><textarea id="c-note" name="note" rows="2" maxlength="300"></textarea></div>' +
          '</div>' +
          field('c-city', 'city', '<span data-city-label>עיר</span>', 'autocomplete="address-level2" required') +
          field('c-addr', 'addr', '<span data-addr-label>רחוב ומספר בית</span>', 'autocomplete="street-address"') +
          '<details class="more-notes"><summary>+ הוספת הערה להזמנה</summary><div class="field field--full"><label for="c-notes" class="sr-only">הערות להזמנה</label><input id="c-notes" name="notes" placeholder="למשל: קומה, קוד לבניין, מועד נוח"></div></details>' +
        '</fieldset>' +
        '<label class="check"><input type="checkbox" name="agree" required aria-describedby="c-agree-err"> <span>קראתי ואני מסכים/ה ל<a href="terms.html" target="_blank" rel="noopener">תקנון<span class="sr-only"> (נפתח בחלון חדש)</span></a></span></label>' +
        '<p class="field__err" id="c-agree-err" aria-live="polite"></p>' +
        '<dl class="sum"><div><dt>סה"כ למוצרים</dt><dd><span data-subtotal>140</span> ₪</dd></div><div><dt>משלוח</dt><dd data-ship-sum>מאושר לפני התשלום</dd></div><div class="sum__total" data-total-row hidden><dt>סה"כ לתשלום</dt><dd><span data-total></span> ₪</dd></div></dl>' +
        '<p class="paynote" data-pay-note><b>עדיין לא משלמים.</b> בלחיצה ייפתח וואטסאפ עם הודעה מוכנה. שולחים אותה, ורויטל חוזרת אליכם לאישור המשלוח והסכום ולתשלום באשראי או בביט.</p>' +
        '<p class="form__err" data-err role="alert"></p>' +
        '<button class="btn btn--main btn--wide btn--wa" type="submit" data-submit-label>המשך לוואטסאפ לאישור ההזמנה</button>' +
        assure +
        '<button type="button" class="linkbtn" data-back>חזרה לסל</button>' +
      '</form>' +

      '<div class="drawer__body done" data-view="done" hidden>' + steps(3) +
        '<div class="done__icon" aria-hidden="true">✓</div>' +
        '<p class="done__h">עוד צעד אחד: שולחים את ההודעה בוואטסאפ</p>' +
        '<p>פתחנו לכם וואטסאפ עם פרטי ההזמנה (מספר <bdi class="nowrap" dir="ltr" data-order-id></bdi>). ההזמנה מגיעה לרויטל רק אחרי שלוחצים <b>״שליחה״</b> שם.</p>' +
        '<a class="btn btn--main btn--wide btn--wa" data-done-link href="#" target="_blank" rel="noopener">פתיחת וואטסאפ שוב</a>' +
        '<button class="btn btn--ghost btn--wide" type="button" data-sent>שלחתי את ההודעה ✓</button>' +
        '<p class="hint">רויטל חוזרת בדרך כלל באותו יום. אפשר גם להתקשר: <a data-tel href="#"><span data-phone>050-7281161</span></a></p>' +
      '</div>' +

      '<div class="drawer__body done" data-view="thanks" hidden>' +
        '<div class="done__icon" aria-hidden="true">♥</div>' +
        '<p class="done__h">תודה! ההזמנה אצל רויטל.</p>' +
        '<p>היא תחזור אליכם לאישור, לתשלום ולתיאום המשלוח. בינתיים, אפשר להציץ ב<a href="how-to-play.html">הוראות המשחק</a>.</p>' +
        '<button class="btn btn--ghost btn--wide" type="button" data-close>סגירה</button>' +
      '</div>' +
    '</aside>' +

    '<div class="buybar" data-buybar aria-hidden="true">' +
      '<div class="buybar__info"><b>או או</b><span><span data-price>140</span> ₪ · <span dir="ltr">2–35</span> משתתפים</span></div>' +
      '<button class="btn btn--main" type="button" data-order tabindex="-1">להזמנה</button>' +
    '</div>' +

    '<div class="consent" data-consent role="dialog" aria-labelledby="consent-h" hidden>' +
      '<p id="consent-h"><b>עוגיות ומדידה.</b> נשמח להשתמש בכלי מדידה כדי להבין מה עובד באתר ולשפר אותו. <a href="privacy.html">פרטים</a></p>' +
      '<div class="consent__btns"><button class="btn btn--main" type="button" data-consent-yes>מאשר/ת</button><button class="btn btn--ghost" type="button" data-consent-no>רק מה שהכרחי</button></div>' +
    '</div>';

  var skip = document.querySelector('.skip');
  (skip || document.body.firstChild).insertAdjacentHTML(skip ? 'afterend' : 'beforebegin', header);
  // נטען בסוף ה-body, אחרי config.js ולפני app.js
  document.currentScript.insertAdjacentHTML('beforebegin', footer + drawer);
})();
