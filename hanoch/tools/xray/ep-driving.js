/* פרק: אתר של מורה לנהיגה. העסק בדיוני ("בכביש הנכון"), והמספר 050-000-0000 לא אמיתי */
window.EP = {
  slug: 'driving-instructor',
  biz: 'אתר של מורה לנהיגה',
  fict: 'עסק בדיוני',
  call: 'לשיעור ניסיון',

  // העמוד כמו שהוא היום. האזור והכותרת החדשה כבר בפנים, מוסתרים, והתיקונים חושפים אותם
  site:
    '<div class="site">' +
    '<div class="hd"><span class="brand"><i></i>בכביש הנכון</span><span class="burger"></span></div>' +
    '<div class="hero"><div class="road"><i></i><i></i></div></div>' +
    '<div class="body">' +
    '<div class="heads"><h1 class="old">בית הספר לנהיגה המוביל<span class="strike"></span></h1><h1 class="new">לומדים לנהוג, בלי לחץ ובקצב שלכם.</h1></div>' +
    '<div class="area"><span>איסוף מהבית בגבעתיים וברמת גן</span></div>' +
    '<p>ניסיון רב שנים בהכשרת נהגים חדשים, עם רכבים חדישים ומורים מקצועיים לכל סוגי הרישיונות.</p>' +
    '<span class="more">למידע נוסף</span>' +
    '</div>' +
    '<h2>סוגי רישיונות</h2>' +
    '<div class="cards"><div class="card"><i></i>רכב פרטי, ידני ואוטומט</div><div class="card"><i></i>אופנוע</div><div class="card"><i></i>רענון לנהגים ותיקים</div></div>' +
    '<h2>למה אנחנו</h2>' +
    '<div class="about"><p>אנחנו מאמינים בגישה אישית, בסבלנות ובהכנה יסודית לטסט. נשמח לעמוד לרשותכם בכל שאלה.</p></div>' +
    '<h2>גלריה</h2>' +
    '<div class="gal"><i></i><i></i><i></i><i></i></div>' +
    '<div class="ft"><b>להרשמה</b>השאירו פרטים ונחזור אליכם:<div class="lform"><span>שם מלא</span><span>טלפון</span><span>סוג רישיון</span><span>שעות נוחות</span><span class="send">שליחה</span></div></div>' +
    '</div>',

  hook: 'רוצים להתחיל ללמוד נהיגה.<br><em>למה לא נרשמים?</em>',

  // שלוש בעיות. fix: bar (פס חיוג קבוע), area (שורה שנפתחת), head (כותרת מתחלפת)
  steps: [
    { title: 'ההרשמה היא טופס ארוך בסוף', scroll: 'bottom', target: '.ft .lform', tag: 'ארבעה שדות, ואז מחכים',
      fix: 'bar', fixTarget: '.callbar', fixTag: 'וואטסאפ קבוע, בלחיצה אחת' },
    { title: 'לא כתוב מאיפה אוספים', scroll: 'top', target: '.heads', tag: 'גבעתיים? רמת גן? לא כתוב',
      fix: 'area', fixTarget: '.area span', fixTag: 'שורה אחת, והשאלה נסגרה' },
    { title: 'הכותרת מתפארת', scroll: 'top', target: '.old', tag: '"המוביל" לא מרגיע אף אחד',
      fix: 'head', fixTarget: 'h1.new', fixTag: 'הפחד, במילים של התלמיד' }
  ],

  compare: { title: 'אותו אתר.<br><em>שלושה תיקונים.</em>', before: 'לפני', after: 'אחרי' },
  end: { title: 'רוצים רנטגן<br><em>לאתר שלכם?</em>', sub: 'שלחו לי את הכתובת בהודעה. אעבור עליו בטלפון, כמו לקוח, ואגיד לכם מה הייתי משנה.' },

  // שמונה שקפים. phone: מצב הטלפון בשקף. mark: סימון על הטלפון
  slides: [
    { kind: 'cover', title: 'רוצים ללמוד נהיגה.<br><em>למה לא נרשמים?</em>', sub: 'רנטגן לאתר של מורה לנהיגה, ו-<b>3 דברים</b> שעוצרים הרשמה.', phone: { scan: 46 } },
    { kind: 'text', title: 'מי נכנס<br><em>לאתר הזה?</em>', sub: 'מישהו שמתלבט כבר חודשים, ואולי קצת לחוץ מהכביש. הוא בטלפון, ורוצה לדעת דבר אחד: <b>יהיה לי נעים איתכם?</b>' },
    { kind: 'phone', n: 1, title: 'ההרשמה היא<br>טופס ארוך בסוף', sub: 'ארבעה שדות בתחתית העמוד, ואז מחכים שיחזרו. מי שמתלבט <b>לא ממלא טפסים.</b>', phone: { scroll: 'bottom' }, mark: { sel: '.ft .lform' } },
    { kind: 'phone', n: 1, fix: true, title: 'התיקון:<br><em>וואטסאפ קבוע</em>', sub: 'פס בתחתית המסך: שיעור ניסיון ווואטסאפ. שאלה אחת בהודעה <b>קלה יותר מטופס.</b>', phone: { scroll: 520, bar: true }, mark: { sel: '.callbar', fix: true } },
    { kind: 'phone', n: 2, title: 'לא כתוב<br>מאיפה אוספים', sub: 'התלמיד מרמת גן לא יודע אם אתם מגיעים אליו. שורה אחת מתחת לכותרת <b>חוסכת לו את השאלה.</b>', phone: { bar: true, area: true }, mark: { sel: '.area span', fix: true } },
    { kind: 'phone', n: 3, title: 'הכותרת<br>מתפארת', sub: '"המוביל" לא מרגיע אף אחד. כותרת טובה מדברת על <b>מה שהתלמיד מרגיש לפני השיעור הראשון.</b>', phone: { bar: true, area: true, head: true }, mark: { sel: 'h1.new', fix: true } },
    { kind: 'compare', title: 'אותו אתר.<br><em>שלושה תיקונים.</em>', sub: 'לפעמים לא צריך אתר חדש. צריך לשים את מה שהתלמיד מחפש <b>במקום שבו הוא מחפש.</b>' },
    { kind: 'end', title: 'רוצים רנטגן<br><em>לאתר שלכם?</em>', sub: 'שלחו לי את כתובת האתר בהודעה. אעבור עליו בטלפון, כמו לקוח, ואגיד לכם <b>מה הייתי משנה.</b>' }
  ]
};
