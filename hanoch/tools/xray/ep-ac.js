/* פרק: אתר של טכנאי מזגנים. העסק בדיוני ("קור בבית"), והמספר 050-000-0000 לא אמיתי */
window.EP = {
  slug: 'ac-technician',
  biz: 'אתר של טכנאי מזגנים',
  fict: 'עסק בדיוני',
  call: 'התקשרו עכשיו',

  // העמוד כמו שהוא היום. האזור והכותרת החדשה כבר בפנים, מוסתרים, והתיקונים חושפים אותם
  site:
    '<div class="site">' +
    '<div class="hd"><span class="brand"><i></i>קור בבית</span><span class="burger"></span></div>' +
    '<div class="hero"><div class="ac"></div></div>' +
    '<div class="body">' +
    '<div class="heads"><h1 class="old">ברוכים הבאים לאתר שלנו<span class="strike"></span></h1><h1 class="new">המזגן לא מקרר? מתקנים אצלכם בבית.</h1></div>' +
    '<div class="area"><span>מגיעים לחיפה, לקריות ולסביבה</span></div>' +
    '<p>אנו חברה מובילה בתחום המיזוג, עם שירות אמין ומקצועי ללקוחות פרטיים ועסקיים.</p>' +
    '<span class="more">קראו עוד</span>' +
    '</div>' +
    '<h2>השירותים שלנו</h2>' +
    '<div class="cards"><div class="card"><i></i>התקנת מזגנים</div><div class="card"><i></i>תיקון תקלות</div><div class="card"><i></i>ניקוי ותחזוקה</div></div>' +
    '<h2>קצת עלינו</h2>' +
    '<div class="about"><p>אנחנו מאמינים בשירות אישי, בעבודה נקייה ובעמידה בזמנים. הצוות שלנו ישמח לעמוד לרשותכם בכל שאלה.</p></div>' +
    '<h2>גלריה</h2>' +
    '<div class="gal"><i></i><i></i><i></i><i></i></div>' +
    '<div class="ft"><b>צרו קשר</b>טלפון: <span class="tel">050-000-0000</span><br>שעות פעילות: א׳ עד ה׳<br>כל הזכויות שמורות</div>' +
    '</div>',

  hook: 'המזגן התקלקל.<br><em>למה הלקוח לא מתקשר?</em>',

  // שלוש בעיות. fix: bar (פס חיוג קבוע), area (שורה שנפתחת), head (כותרת מתחלפת)
  steps: [
    { title: 'הטלפון קבור בתחתית', scroll: 'bottom', target: '.ft .tel', tag: 'צריך לגלול עד לכאן',
      fix: 'bar', fixTarget: '.callbar', fixTag: 'חיוג קבוע, בכל מקום בעמוד' },
    { title: 'לא כתוב לאן אתם מגיעים', scroll: 'top', target: '.heads', tag: 'חיפה? הקריות? לא כתוב',
      fix: 'area', fixTarget: '.area span', fixTag: 'שורה אחת, ואין מה לנחש' },
    { title: 'הכותרת מדברת עליכם', scroll: 'top', target: '.old', tag: '"ברוכים הבאים" לא עונה על כלום',
      fix: 'head', fixTarget: 'h1.new', fixTag: 'התקלה, במילים של הלקוח' }
  ],

  compare: { title: 'אותו אתר.<br><em>שלושה תיקונים.</em>', before: 'לפני', after: 'אחרי' },
  end: { title: 'רוצים רנטגן<br><em>לאתר שלכם?</em>', sub: 'שלחו לי את הכתובת בהודעה. אעבור עליו בטלפון, כמו לקוח, ואגיד לכם מה הייתי משנה.' },

  // שמונה שקפים. phone: מצב הטלפון בשקף. mark: סימון על הטלפון
  slides: [
    { kind: 'cover', title: 'המזגן התקלקל.<br><em>למה לא מתקשרים?</em>', sub: 'רנטגן לאתר של טכנאי מזגנים, ו-<b>3 דברים</b> שעוצרים שיחת טלפון.', phone: { scan: 46 } },
    { kind: 'text', title: 'מי נכנס<br><em>לאתר הזה?</em>', sub: 'מישהו שהמזגן שלו הפסיק לעבוד. הוא בטלפון, לא נוח לו, והוא רוצה לדעת דבר אחד: <b>אתם יכולים לבוא?</b>' },
    { kind: 'phone', n: 1, title: 'הטלפון קבור<br>בתחתית', sub: 'כדי להתקשר צריך לגלול עד הסוף. מי שלחוץ לא גולל. הוא <b>חוזר לגוגל.</b>', phone: { scroll: 'bottom' }, mark: { sel: '.ft .tel' } },
    { kind: 'phone', n: 1, fix: true, title: 'התיקון:<br><em>חיוג קבוע</em>', sub: 'פס בתחתית המסך עם חיוג ווואטסאפ. בכל מקום בעמוד, <b>במרחק אגודל.</b>', phone: { scroll: 520, bar: true }, mark: { sel: '.callbar', fix: true } },
    { kind: 'phone', n: 2, title: 'לא כתוב<br>לאן אתם מגיעים', sub: 'הלקוח מהקריות לא יודע אם אתם מגיעים אליו. שורה אחת מתחת לכותרת <b>חוסכת לו את השאלה.</b>', phone: { bar: true, area: true }, mark: { sel: '.area span', fix: true } },
    { kind: 'phone', n: 3, title: 'הכותרת<br>מדברת עליכם', sub: '"ברוכים הבאים" לא עונה על כלום. כותרת טובה מתארת <b>את התקלה, במילים של הלקוח.</b>', phone: { bar: true, area: true, head: true }, mark: { sel: 'h1.new', fix: true } },
    { kind: 'compare', title: 'אותו אתר.<br><em>שלושה תיקונים.</em>', sub: 'לפעמים לא צריך אתר חדש. צריך לשים את מה שהלקוח מחפש <b>במקום שבו הוא מחפש.</b>' },
    { kind: 'end', title: 'רוצים רנטגן<br><em>לאתר שלכם?</em>', sub: 'שלחו לי את כתובת האתר בהודעה. אעבור עליו בטלפון, כמו לקוח, ואגיד לכם <b>מה הייתי משנה.</b>' }
  ]
};
