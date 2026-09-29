(() => {
  'use strict';

  const root = document.documentElement,
    key = 'allenbis-accessibility-v1',
    defaults = {
      text: 100,
      contrast: false,
      links: false,
      motion: false,
      spacing: false
    };
  let prefs = {
    ...defaults
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object') {
      if ([100, 125, 150, 175, 200].includes(saved.text)) prefs.text = saved.text;
      for (const k of ['contrast', 'links', 'motion', 'spacing']) prefs[k] = saved[k] === true;
    }
  } catch {}
  const open = document.createElement('button');
  open.id = 'a11yOpen';
  open.type = 'button';
  open.setAttribute('aria-label', 'פתיחת תפריט נגישות');
  open.setAttribute('aria-haspopup', 'dialog');
  open.setAttribute('aria-controls', 'a11yDialog');
  open.innerHTML = '<span aria-hidden="true">♿</span>';
  document.querySelector('.cartbar').append(open);
  const dialog = document.createElement('dialog');
  dialog.id = 'a11yDialog';
  dialog.className = 'sheet';
  dialog.setAttribute('aria-labelledby', 'a11yTitle');
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `<div class="panel a11y-panel"><div class="sheethead"><h2 id="a11yTitle">הגדרות נגישות</h2><button type="button" class="close" id="a11yClose" aria-label="סגירת תפריט הנגישות" autofocus>×</button></div><p>התאימו את התצוגה לנוחותכם. ההגדרות נשמרות בדפדפן זה בלבד.</p><div class="a11y-options"><fieldset><legend>גודל טקסט</legend><p id="a11yTextValue"></p><div class="a11y-text-controls"><button type="button" id="a11yLarger">הגדלת טקסט</button><button type="button" id="a11ySmaller">הקטנת טקסט</button><button type="button" id="a11yTextReset">איפוס גודל טקסט</button></div></fieldset><button type="button" data-a11y="contrast" aria-pressed="false">ניגודיות גבוהה <span aria-hidden="true"></span></button><button type="button" data-a11y="links" aria-pressed="false">הדגשת קישורים <span aria-hidden="true"></span></button><button type="button" data-a11y="motion" aria-pressed="false">הפחתת אנימציות <span aria-hidden="true"></span></button><button type="button" data-a11y="spacing" aria-pressed="false">ריווח טקסט מוגדל <span aria-hidden="true"></span></button><button type="button" id="a11yReset">איפוס כל הגדרות הנגישות</button><button type="button" id="a11yStatement" aria-controls="a11yStatementText" aria-expanded="false">הצהרת נגישות</button><section id="a11yStatementText" aria-labelledby="a11yStatementTitle" hidden><h3 id="a11yStatementTitle">הצהרת נגישות</h3><p>באתר Allenbis שולבו ניווט במקלדת, סימון מיקוד, מבנה עברי מימין לשמאל, תוויות לטפסים וחלונות נגישים. תפריט זה מאפשר הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים והפחתת תנועה.</p><p>ההגדרות הן כלי עזר נוסף ואינן מחליפות את הנגישות המובנית באתר. אין באמור אישור או הסמכה לעמידה בדין או לתאימות לכל טכנולוגיה מסייעת.</p><h4>דיווח על בעיית נגישות</h4><p>פרטי איש קשר וערוץ דיווח: OWNER REQUIRED — נדרשת השלמת בעל העסק. לצורך טיפול יש לציין עמוד, תיאור הקושי, מכשיר ודפדפן, בלי לשלוח סיסמאות או פרטים רגישים.</p><p>בדיקת קורא מסך אנושית ובחינה משפטית: MANUAL REQUIRED.</p></section></div><p id="a11yStatus" role="status" aria-live="polite" aria-atomic="true"></p></div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);
  function apply(message) {
    if (prefs.text === 100) root.style.removeProperty('font-size');else root.style.fontSize = prefs.text + '%';
    for (const k of ['contrast', 'links', 'motion', 'spacing']) {
      root.classList.toggle('a11y-' + k, prefs[k]);
      const button = dialog.querySelector('[data-a11y="' + k + '"]');
      button.setAttribute('aria-pressed', String(prefs[k]));
      button.querySelector('span').textContent = prefs[k] ? '✓' : '';
    }
    $('a11yTextValue').textContent = 'גודל טקסט: ' + prefs.text + '%';
    $('a11yLarger').setAttribute('aria-disabled', String(prefs.text === 200));
    $('a11ySmaller').setAttribute('aria-disabled', String(prefs.text === 100));
    if (message) $('a11yStatus').textContent = message;
  }
  function save(message) {
    apply(message);
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {}
  }
  open.onclick = () => dialog.showModal();
  $('a11yClose').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    if (document.activeElement === document.body || dialog.contains(document.activeElement)) open.focus();
  });
  $('a11yLarger').onclick = () => {
    prefs.text = Math.min(200, prefs.text + 25);
    save('גודל הטקסט ' + prefs.text + '%');
  };
  $('a11ySmaller').onclick = () => {
    prefs.text = Math.max(100, prefs.text - 25);
    save('גודל הטקסט ' + prefs.text + '%');
  };
  $('a11yTextReset').onclick = () => {
    prefs.text = 100;
    save('גודל הטקסט אופס');
  };
  for (const button of dialog.querySelectorAll('[data-a11y]')) button.onclick = () => {
    const k = button.dataset.a11y;
    prefs[k] = !prefs[k];
    save(button.childNodes[0].textContent.trim() + ': ' + (prefs[k] ? 'פעיל' : 'כבוי'));
  };
  $('a11yReset').onclick = () => {
    prefs = {
      ...defaults
    };
    save('כל הגדרות הנגישות אופסו');
  };
  $('a11yStatement').onclick = () => {
    const section = $('a11yStatementText');
    section.hidden = !section.hidden;
    $('a11yStatement').setAttribute('aria-expanded', String(!section.hidden));
  };
  apply();
})();
