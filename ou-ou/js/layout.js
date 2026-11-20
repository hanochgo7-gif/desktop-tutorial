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
  var mark = '<span class="mark__a">או</span> <span class="mark__b">או</span>';

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
      '<button class="btn btn--main btn--wide" type="button" data-add>הוסיפו לסל · <span data-price>140</span> ₪</button>' +
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

  var drawer =
    '<div class="scrim" data-scrim hidden></div>' +
    '<aside class="drawer" data-drawer role="dialog" aria-modal="true" aria-labelledby="cart-h" hidden>' +
      '<div class="drawer__head"><h2 id="cart-h" data-drawer-title>הסל שלכם</h2><button type="button" class="x" data-close aria-label="סגירה">×</button></div>' +
      '<div class="drawer__body" data-view="cart">' +
        '<div data-cart-empty><p class="empty">הסל עדיין ריק.</p><button class="btn btn--main btn--wide" type="button" data-add>הוסיפו את או או · <span data-price>140</span> ₪</button></div>' +
        '<div data-cart-full hidden>' +
          '<div class="line"><div class="line__thumb" aria-hidden="true"><span class="mark__a">או</span><span class="mark__b">או</span></div>' +
          '<div class="line__info"><b>או או | מה אתה יותר?</b><span><span data-price>140</span> ₪ ליחידה</span></div>' +
          '<div class="qty qty--sm" role="group" aria-label="כמות בסל"><button type="button" data-cart-qty="+1" aria-label="הוספת יחידה">+</button><output data-cart-qty-out>1</output><button type="button" data-cart-qty="-1" aria-label="הורדת יחידה">−</button></div></div>' +
          '<dl class="sum"><div><dt>סכום ביניים</dt><dd><span data-subtotal>140</span> ₪</dd></div><div><dt>משלוח</dt><dd>נבחר בשלב הבא</dd></div></dl>' +
          '<p class="hint" data-free-hint hidden></p>' +
          '<button class="btn btn--main btn--wide" type="button" data-go-checkout>להמשך ההזמנה</button>' +
          '<p class="hint">מזמינים 10 ומעלה לצוות או לארגון? <a href="business.html">דברו איתנו</a></p>' +
        '</div>' +
      '</div>' +
      '<form class="drawer__body form" data-view="checkout" data-checkout novalidate hidden>' +
        '<fieldset><legend>פרטי המזמין</legend>' +
          '<div class="field field--full"><label for="c-name">שם מלא</label><input id="c-name" name="name" autocomplete="name" required></div>' +
          '<div class="field"><label for="c-phone">טלפון</label><input id="c-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>' +
          '<div class="field"><label for="c-email">מייל <small>(לקבלה)</small></label><input id="c-email" name="email" type="email" autocomplete="email"></div>' +
        '</fieldset>' +
        '<fieldset><legend>משלוח</legend>' +
          '<div class="radios" data-ship-options></div>' +
          '<label class="check"><input type="checkbox" name="gift" data-gift-toggle> זו מתנה, שלחו ישר למקבל</label>' +
          '<div class="gift" data-gift hidden>' +
            '<div class="field field--full"><label for="c-rname">שם המקבל</label><input id="c-rname" name="rname"></div>' +
            '<div class="field field--full"><label for="c-rphone">טלפון המקבל <small>(לתיאום המשלוח)</small></label><input id="c-rphone" name="rphone" type="tel" inputmode="tel"></div>' +
            '<div class="field field--full"><label for="c-note">ברכה שתצורף למשחק</label><textarea id="c-note" name="note" rows="2" maxlength="300"></textarea></div>' +
          '</div>' +
          '<div class="field field--full"><label for="c-city">עיר</label><input id="c-city" name="city" autocomplete="address-level2" required></div>' +
          '<div class="field field--full"><label for="c-addr">רחוב ומספר בית</label><input id="c-addr" name="addr" autocomplete="street-address"></div>' +
          '<div class="field field--full"><label for="c-notes">הערות להזמנה <small>(לא חובה)</small></label><input id="c-notes" name="notes"></div>' +
        '</fieldset>' +
        '<label class="check"><input type="checkbox" name="agree" required> קראתי ואני מסכים/ה ל<a href="terms.html" target="_blank" rel="noopener">תקנון</a></label>' +
        '<dl class="sum"><div><dt>סה"כ למוצרים</dt><dd><span data-subtotal>140</span> ₪</dd></div><div><dt>משלוח</dt><dd data-ship-sum>יאושר יחד עם ההזמנה</dd></div><div class="sum__total" data-total-row hidden><dt>סה"כ לתשלום</dt><dd><span data-total></span> ₪</dd></div></dl>' +
        '<p class="form__err" data-err role="alert"></p>' +
        '<button class="btn btn--main btn--wide" type="submit" data-submit-label>שליחת ההזמנה</button>' +
        '<p class="hint" data-pay-note>ההזמנה נשלחת לרויטל בוואטסאפ. היא תחזור אליכם לאישור, לתיאום המשלוח ולתשלום (אשראי או ביט).</p>' +
        '<button type="button" class="linkbtn" data-back>חזרה לסל</button>' +
      '</form>' +
      '<div class="drawer__body done" data-view="done" hidden>' +
        '<p class="done__h">תודה! ההזמנה בדרך לרויטל.</p>' +
        '<p>מספר הזמנה: <b data-order-id></b></p>' +
        '<p>אם חלון הוואטסאפ לא נפתח, <a data-done-link href="#" target="_blank" rel="noopener">לחצו כאן לשליחה</a>.</p>' +
        '<button class="btn btn--ghost btn--wide" type="button" data-close>סגירה</button>' +
      '</div>' +
    '</aside>' +
    '<div class="consent" data-consent role="dialog" aria-labelledby="consent-h" hidden>' +
      '<p id="consent-h"><b>עוגיות ומדידה.</b> נשמח להשתמש בכלי מדידה כדי להבין מה עובד באתר ולשפר אותו. <a href="privacy.html">פרטים</a></p>' +
      '<div class="consent__btns"><button class="btn btn--main" type="button" data-consent-yes>מאשר/ת</button><button class="btn btn--ghost" type="button" data-consent-no>רק מה שהכרחי</button></div>' +
    '</div>';

  var skip = document.querySelector('.skip');
  (skip || document.body.firstChild).insertAdjacentHTML(skip ? 'afterend' : 'beforebegin', header);
  // נטען בסוף ה-body, אחרי config.js ולפני app.js
  document.currentScript.insertAdjacentHTML('beforebegin', footer + drawer);
})();
