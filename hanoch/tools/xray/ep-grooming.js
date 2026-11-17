/* פרק: אתר של מספרה לכלבים. העסק בדיוני ("זנב שמח"), והמספר 050-000-0000 לא אמיתי */
window.EP = {
  slug: 'dog-grooming',
  biz: 'אתר של מספרה לכלבים',
  fict: 'עסק בדיוני',
  call: 'לקביעת תור',

  // העמוד כמו שהוא היום. האזור והכותרת החדשה כבר בפנים, מוסתרים, והתיקונים חושפים אותם
  site:
    '<div class="site">' +
    '<div class="hd"><span class="brand"><i></i>זנב שמח</span><span class="burger"></span></div>' +
    '<div class="hero"><div class="tub"><b></b><i></i><i></i><i></i><i></i></div></div>' +
    '<div class="body">' +
    '<div class="heads"><h1 class="old">טיפוח מקצועי לכלבים מכל הסוגים<span class="strike"></span></h1><h1 class="new">הכלב חוזר הביתה נקי, ורגוע.</h1></div>' +
    '<div class="area"><span>כל הגדלים, גם כלבים חששנים</span></div>' +
    '<p>מספרה לכלבים עם ציוד מתקדם ומוצרים איכותיים, ליופי ולבריאות של חבר המשפחה שלכם.</p>' +
    '<span class="more">קראו עוד</span>' +
    '</div>' +
    '<h2>השירותים שלנו</h2>' +
    '<div class="cards"><div class="card"><i></i>רחצה וייבוש</div><div class="card"><i></i>תספורת לפי גזע</div><div class="card"><i></i>גזיזת ציפורניים</div></div>' +
    '<h2>אודות</h2>' +
    '<div class="about"><p>אנחנו אוהבים כלבים ומטפלים בכל כלב כאילו היה שלנו. מחכים לראות אתכם.</p></div>' +
    '<h2>גלריה</h2>' +
    '<div class="gal"><i></i><i></i><i></i><i></i></div>' +
    '<div class="ft"><b>צרו קשר</b>להזמנת תור התקשרו בימים א-ה:<br><span class="tel">050-000-0000</span></div>' +
    '</div>',

  hook: 'הכלב צריך תספורת.<br><em>למה לא קובעים תור?</em>',

  // שלוש בעיות. fix: bar (פס חיוג קבוע), area (שורה שנפתחת), head (כותרת מתחלפת)
  steps: [
    { title: 'תור רק בטלפון', scroll: 'bottom', target: '.ft', tag: 'בערב כבר אי אפשר לקבוע',
      fix: 'bar', fixTarget: '.callbar', fixTag: 'וואטסאפ קבוע, גם בערב' },
    { title: 'לא כתוב איזה כלבים מקבלים', scroll: 'top', target: '.heads', tag: 'כלב גדול? כלב לחוץ?',
      fix: 'area', fixTarget: '.area span', fixTag: 'שורה אחת שעונה על הפחד' },
    { title: 'הכותרת מדברת על המספרה', scroll: 'top', target: '.old', tag: '"מקצועי" לא אומר כלום לבעלים',
      fix: 'head', fixTarget: 'h1.new', fixTag: 'מה שהבעלים רוצים לראות' }
  ],

  compare: { title: 'אותו אתר.<br><em>שלושה תיקונים.</em>', before: 'לפני', after: 'אחרי' },
  end: { title: 'רוצים רנטגן<br><em>לאתר שלכם?</em>', sub: 'שלחו לי את הכתובת בהודעה. אעבור עליו בטלפון, כמו לקוח, ואגיד לכם מה הייתי משנה.' },

  // שמונה שקפים. phone: מצב הטלפון בשקף. mark: סימון על הטלפון
  slides: [
    { kind: 'cover', title: 'הכלב צריך תספורת.<br><em>למה לא קובעים תור?</em>', sub: 'רנטגן לאתר של מספרה לכלבים, ו-<b>3 דברים</b> שעוצרים תור.', phone: { scan: 46 } },
    { kind: 'text', title: 'מי נכנס<br><em>לאתר הזה?</em>', sub: 'מישהו שהכלב שלו כבר מזמן צריך תספורת. הוא בטלפון, בערב, אחרי העבודה, ושואל את עצמו: <b>יטפלו בו יפה שם?</b>' },
    { kind: 'phone', n: 1, title: 'תור רק בטלפון,<br>ורק בשעות מסוימות', sub: 'מספר בתחתית העמוד וימים א-ה. מי שנזכר בערב <b>כבר לא מתקשר.</b>', phone: { scroll: 'bottom' }, mark: { sel: '.ft' } },
    { kind: 'phone', n: 1, fix: true, title: 'התיקון:<br><em>וואטסאפ קבוע</em>', sub: 'פס בתחתית המסך: קביעת תור ווואטסאפ. הודעה אפשר לשלוח <b>גם באחת עשרה בלילה.</b>', phone: { scroll: 520, bar: true }, mark: { sel: '.callbar', fix: true } },
    { kind: 'phone', n: 2, title: 'לא כתוב<br>איזה כלבים מקבלים', sub: 'מי שיש לו כלב גדול, או כלב שמפחד ממייבש, לא בטוח שזה בשבילו. שורה אחת <b>סוגרת את השאלה.</b>', phone: { bar: true, area: true }, mark: { sel: '.area span', fix: true } },
    { kind: 'phone', n: 3, title: 'הכותרת מדברת<br>על המספרה', sub: '"מקצועי" זה מה שכולם כותבים. הבעלים רוצים לדעת דבר אחד: <b>איך הכלב יחזור הביתה.</b>', phone: { bar: true, area: true, head: true }, mark: { sel: 'h1.new', fix: true } },
    { kind: 'compare', title: 'אותו אתר.<br><em>שלושה תיקונים.</em>', sub: 'לפעמים לא צריך אתר חדש. צריך לענות על השאלה של הלקוח <b>לפני שהוא שואל אותה.</b>' },
    { kind: 'end', title: 'רוצים רנטגן<br><em>לאתר שלכם?</em>', sub: 'שלחו לי את כתובת האתר בהודעה. אעבור עליו בטלפון, כמו לקוח, ואגיד לכם <b>מה הייתי משנה.</b>' }
  ]
};
