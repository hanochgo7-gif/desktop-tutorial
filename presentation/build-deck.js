const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Fa = require("react-icons/fa");

// ---------- palette ----------
const C = {
  ink: "0E1116",      // near-black background
  ink2: "171C24",     // card on dark
  sand: "D9B78C",     // warm accent
  sandDeep: "B8925C",
  paper: "F6F3EE",    // light background
  paper2: "ECE7DF",   // card on light
  text: "1C1F26",
  muted: "6B7280",
  mutedL: "A7ADB8",
  olive: "6F7A5E",
};
const FONT = "Arial";

async function icon(Comp, color, px = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.rtlMode = true;
pres.lang = "he-IL";
pres.title = "7.10 – הסיפור שלי";
pres.author = "חנוך";
const W = 13.333, H = 7.5;

const T = (o) => Object.assign({ fontFace: FONT, rtlMode: true, lang: "he-IL", isTextBox: true, margin: 0, align: "right", valign: "top" }, o);

function bg(s, color) { s.background = { color }; }

function pageNum(s, n, dark) {
  s.addText(String(n), T({ x: 0.5, y: H - 0.6, w: 0.6, h: 0.3, fontSize: 10, color: dark ? C.mutedL : C.muted, align: "left" }));
}

function photoSlot(s, x, y, w, h, label, dark, camIcon) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.15,
    fill: { color: dark ? C.ink2 : C.paper2 },
    line: { color: dark ? "3A4150" : "C9C2B6", width: 1.25, dashType: "dash" },
  });
  const ic = 0.6;
  s.addImage({ data: camIcon, x: x + w / 2 - ic / 2, y: y + h / 2 - ic / 2 - 0.35, w: ic, h: ic });
  s.addText("תמונה: " + label, T({
    x: x + 0.3, y: y + h / 2 + 0.25, w: w - 0.6, h: 0.7, fontSize: 12, color: dark ? C.mutedL : C.muted, align: "center", valign: "top",
  }));
}

function sectionSlide(s, num, title, sub, n, titleSize = 44) {
  bg(s, C.ink);
  s.addText(num, T({ x: 0.9, y: 1.4, w: W - 1.8, h: 1.6, fontSize: 96, bold: true, color: C.sand, align: "right", valign: "top" }));
  s.addText(title, T({ x: 0.9, y: 3.2, w: W - 1.8, h: 1.2, fontSize: titleSize, bold: true, color: "FFFFFF" }));
  if (sub) s.addText(sub, T({ x: 0.9, y: 4.6, w: W - 1.8, h: 1.2, fontSize: 20, color: C.mutedL }));
  pageNum(s, n, true);
}

function titleText(s, txt, dark, opts = {}) {
  s.addText(txt, T(Object.assign({ x: 0.9, y: 0.6, w: W - 1.8, h: 1.0, fontSize: 36, bold: true, color: dark ? "FFFFFF" : C.text }, opts)));
}

(async () => {
  const camD = await icon(Fa.FaCamera, C.mutedL);
  const camL = await icon(Fa.FaCamera, C.muted);
  const ic = {
    home: await icon(Fa.FaHome, C.ink),
    users: await icon(Fa.FaUsers, C.ink),
    seed: await icon(Fa.FaSeedling, C.ink),
    tag: await icon(Fa.FaTag, C.ink),
    mountain: await icon(Fa.FaMountain, C.ink),
    weight: await icon(Fa.FaWeightHanging, C.ink),
    userFriends: await icon(Fa.FaUserFriends, C.ink),
    brain: await icon(Fa.FaBrain, C.ink),
    hand: await icon(Fa.FaHandHoldingMedical, C.ink),
    hospital: await icon(Fa.FaHospital, C.ink),
    heart: await icon(Fa.FaHeartBroken, C.ink),
    road: await icon(Fa.FaRoad, C.ink),
    dice: await icon(Fa.FaDice, C.ink),
    step: await icon(Fa.FaShoePrints, C.ink),
    hammer: await icon(Fa.FaHammer, C.ink),
    grad: await icon(Fa.FaGraduationCap, C.ink),
    brief: await icon(Fa.FaBriefcase, C.ink),
    mic: await icon(Fa.FaMicrophoneAlt, C.ink),
    target: await icon(Fa.FaBullseye, C.ink),
    rocket: await icon(Fa.FaRocket, C.ink),
    chart: await icon(Fa.FaChartLine, C.ink),
    quoteS: await icon(Fa.FaQuoteRight, C.sand),
    quoteD: await icon(Fa.FaQuoteRight, C.sandDeep),
  };
  let n = 0;

  // ---------- 1. cover ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    photoSlot(s, 0.5, 0.5, 5.6, 6.5, "חנוך היום – תמונה חזקה, מבט למצלמה", true, camD);
    s.addText("7.10", T({ x: 6.6, y: 1.5, w: 6.2, h: 1.7, fontSize: 110, bold: true, color: C.sand }));
    s.addText("הסיפור שלי", T({ x: 6.6, y: 3.3, w: 6.2, h: 1.0, fontSize: 48, bold: true, color: "FFFFFF" }));
    s.addText("חנוך  |  לוחם סיירת נח״ל, פצוע 7 באוקטובר", T({ x: 6.6, y: 4.4, w: 6.2, h: 0.6, fontSize: 18, color: C.mutedL }));
    s.addText("הרצאה על בחירה, פציעה, ומה עושים אחרי", T({ x: 6.6, y: 5.0, w: 6.2, h: 0.5, fontSize: 16, color: C.mutedL }));
    s.addNotes("שקף פתיחה. לא מדברים עליו. הוא נשאר על המסך כשהקהל נכנס.");
  }

  // ---------- 2. hook ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addImage({ data: ic.quoteS, x: W - 1.9, y: 1.1, w: 0.9, h: 0.9 });
    s.addText("ב־7 באוקטובר קיבלתי החלטה\nשאולי הייתה אחת ההחלטות\nהכי חשובות בחיים שלי.", T({ x: 1.0, y: 2.1, w: W - 2.9, h: 2.6, fontSize: 40, bold: true, color: "FFFFFF", valign: "top" }));
    s.addText("לא ידעתי אז שהיא תשנה את כל החיים שלי.", T({ x: 1.0, y: 4.9, w: W - 2.9, h: 0.8, fontSize: 24, color: C.sand }));
    pageNum(s, n, true);
    s.addNotes("פתיחה – 3 דקות.\nלא מתחילים בילדות. לא מתחילים ב־7 באוקטובר. מתחילים מהרגע שבו הקהל כבר בתוך הסיפור.\nלהגיד את המשפט. ואז לעצור. לא להסביר עדיין. המטרה: ליצור סקרנות.");
  }

  // ---------- 3. section: who I was ----------
  { const s = pres.addSlide(); n++; sectionSlide(s, "01", "מי הייתי לפני הכול", "רק עכשיו חוזרים אחורה. לא כל הילדות – רק הרגעים שמסבירים.", n);
    s.addNotes("מי הייתי לפני הכול – 7 דקות.\nלבחור 3–4 רגעים בלבד שהסבירו מי היית. הקהל צריך להבין שאתה לא 'הגיבור שנולד גיבור'."); }

  // ---------- 4. who I am: facts + photo ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    titleText(s, "חנוך, בן 24, מיישובי גדרות", false);
    photoSlot(s, 0.9, 1.9, 4.6, 4.6, "ילדות במושב – תמונה משפחתית או מהשדות", false, camL);
    const rows = [
      [ic.home, "ילדות מושבניקית", "גדלתי בגדרות – שדות, טרקטורים, חופש, ומעט מאוד גבולות."],
      [ic.users, "אח בכור לארבעה", "מגיל צעיר הייתי זה שאמורים להסתכל עליו."],
      [ic.seed, "הרבה סימני שאלה", "לא ילד שידעו לאן הוא הולך – לא ההורים, לא המורים, ולא אני."],
    ];
    rows.forEach((r, i) => {
      const y = 2.0 + i * 1.45;
      s.addShape(pres.ShapeType.ellipse, { x: W - 0.9 - 0.8, y, w: 0.8, h: 0.8, fill: { color: C.sand }, line: { color: C.sand } });
      s.addImage({ data: r[0], x: W - 0.9 - 0.8 + 0.2, y: y + 0.2, w: 0.4, h: 0.4 });
      s.addText(r[1], T({ x: 5.9, y, w: W - 0.9 - 1.1 - 5.9, h: 0.45, fontSize: 22, bold: true, color: C.text }));
      s.addText(r[2], T({ x: 5.9, y: y + 0.5, w: W - 0.9 - 1.1 - 5.9, h: 0.8, fontSize: 15, color: C.muted }));
    });
    pageNum(s, n, false);
    s.addNotes("אני חנוך, בן 24, מיישובי גדרות. ילדות מושבניקית. אח בכור לארבעה.\n(להוסיף פרט אחד קטן ומצחיק מהילדות שמחבר את הקהל.)");
  }

  // ---------- 5. "problem child" ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addText("״ילד בעייתי״", T({ x: 0.9, y: 1.3, w: W - 1.8, h: 1.6, fontSize: 84, bold: true, color: C.sand, align: "center" }));
    s.addText("ככה הגדירו אותי כבר מהגן. ומאז – הסתבכתי הרבה.", T({ x: 1.5, y: 3.1, w: W - 3.0, h: 0.7, fontSize: 26, color: "FFFFFF", align: "center" }));
    s.addText("כשאומרים לך משהו מספיק פעמים, אתה מתחיל להאמין לזה.", T({ x: 1.5, y: 3.9, w: W - 3.0, h: 0.6, fontSize: 20, color: C.mutedL, align: "center" }));
    photoSlot(s, 4.2, 4.8, 4.9, 2.2, "חנוך ילד (גן / בית ספר יסודי)", true, camD);
    pageNum(s, n, true);
    s.addNotes("מהגן הגדירו אותי כ'ילד בעייתי' והייתי מסתבך הרבה.\nלתת דוגמה אחת קונקרטית – אירוע אחד, לא רשימה.");
  }

  // ---------- 6. 10th grade turning point ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    titleText(s, "כיתה י׳: הרגע שבו הכול התהפך", false);
    s.addShape(pres.ShapeType.roundRect, { x: 0.9, y: 1.8, w: 5.6, h: 4.9, rectRadius: 0.15, fill: { color: C.ink }, line: { color: C.ink } });
    s.addImage({ data: ic.quoteS, x: 5.6, y: 2.1, w: 0.6, h: 0.6 });
    s.addText("״לא היה לי שום קשר לזה.״", T({ x: 1.3, y: 2.9, w: 4.9, h: 1.2, fontSize: 30, bold: true, color: "FFFFFF" }));
    s.addText("האשימו אותי בבית הספר בסחר בסמים. משהו שלא עשיתי.\nוהבנתי: אם אני לא אכתוב את הסיפור שלי – מישהו אחר יכתוב אותו בשבילי.", T({ x: 1.3, y: 4.2, w: 4.9, h: 2.2, fontSize: 16, color: C.mutedL, paraSpaceAfter: 8 }));
    const steps = [
      ["1", "ההאשמה", "האשימו אותי בסחר בסמים – ולא היה לי שום קשר לזה."],
      ["2", "ההבנה", "בסוף האמינו לי. אבל נשאר חותם: יכולים לחשוד בי בדבר כל כך חמור. אני לא ״ילד רע״ – זו תדמית, לא אני."],
      ["3", "ההחלטה", "לכתוב את הסיפור שלי בעצמי, ולשנות את התדמית."],
    ];
    steps.forEach((st, i) => {
      const y = 1.9 + i * 1.6;
      s.addShape(pres.ShapeType.ellipse, { x: W - 0.9 - 0.75, y, w: 0.75, h: 0.75, fill: { color: C.sand }, line: { color: C.sand } });
      s.addText(st[0], T({ x: W - 0.9 - 0.75, y, w: 0.75, h: 0.75, fontSize: 22, bold: true, color: C.ink, align: "center", valign: "middle" }));
      s.addText(st[1], T({ x: 6.9, y, w: W - 0.9 - 1.0 - 6.9, h: 0.5, fontSize: 22, bold: true, color: C.text }));
      s.addText(st[2], T({ x: 6.9, y: y + 0.55, w: W - 0.9 - 1.0 - 6.9, h: 0.9, fontSize: 15, color: C.muted }));
    });
    pageNum(s, n, false);
    s.addNotes("אירוע אחד בכיתה י' ששינה לי את כל התפיסה. האשימו אותי בבית הספר בסחר בסמים ולא היה לי שום קשר לזה.\nבסוף השיחה הם האמינו לי – אבל זה השאיר בי חותם: שיכולים לחשוד בי בדבר כל כך חמור.\nזו הפעם הראשונה שהחלטתי לקחת את ההחלטות בחיים שלי בעצמי.\nמשם הבנתי שאני לא 'ילד רע', וקיבלתי החלטה 'לכתוב את הסיפור שלי' ולשנות את התדמית.\nמאותו רגע: חיפוש שנת שירות איכותית, שאיפה לשירות קרבי משמעותי.");
  }

  // ---------- 7. message ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addText("העבר שלך מסביר אותך.", T({ x: 1.0, y: 2.2, w: W - 2.0, h: 1.1, fontSize: 44, bold: true, color: C.mutedL, align: "center" }));
    s.addText("אבל הוא לא חייב להגדיר אותך.", T({ x: 1.0, y: 3.4, w: W - 2.0, h: 1.2, fontSize: 48, bold: true, color: C.sand, align: "center" }));
    pageNum(s, n, true);
    s.addNotes("המסר של הפרק. לעצור עליו רגע. הקהל צריך להבין: לא הגיבור שנולד גיבור – נער עם הרבה סימני שאלה.");
  }

  // ---------- 8. section: the choice ----------
  { const s = pres.addSlide(); n++; sectionSlide(s, "02", "הבחירה", "סיירת נח״ל. אבל זה לא סיפור צבאי – זו הפעם הראשונה שבחרתי מי אני רוצה להיות.", n);
    s.addImage({ path: "nahal-sand.png", x: 1.0, y: 1.6, w: 4.2, h: 4.2 * 124 / 226 });
    s.addNotes("הבחירה – 7 דקות. המעבר לסיירת נח״ל. לא להפוך את זה ל'סיפור צבאי'. הנושא: הפעם הראשונה שבה בחרת מי אתה רוצה להיות."); }

  // ---------- 9. four cards ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    titleText(s, "סיירת נח״ל – מה באמת קרה שם", false, { w: W - 1.8 - 2.2 });
    s.addImage({ path: "nahal-dark.png", x: 0.9, y: 0.35, w: 2.7, h: 2.7 * 124 / 226 });
    photoSlot(s, 0.9, 1.8, 3.4, 4.9, "מהמסלול / טקס סיום / הצוות", false, camL);
    const cards = [
      [ic.mountain, "למה רציתי להגיע לשם", "כי אני אוהב אתגרים. ורציתי להוכיח לעצמי שאני באמת תותח כמו שאני מרגיש – בניגוד למה שאמרו לי כל הזמן."],
      [ic.weight, "מה זה עלה לי", "קושי פיזי ומנטלי, ובמקביל – כל מיני קשיים בבית שלא עצרו בשביל המסלול."],
      [ic.userFriends, "מי השפיע עליי", "קליין וברנש, המפקצ׳ והמג״ד שלי. שני אנשים שונים לגמרי – ושני שיעורים שנשארו איתי (בשקף הבא)."],
      [ic.brain, "מה הצבא לימד אותי על עצמי", "שהכול בראש. ושתמיד אפשר להשתפר ולהיות יותר ויותר טוב."],
    ];
    const cx0 = 4.7, cw = (W - 0.9 - cx0 - 0.3) / 2, ch = 2.3;
    cards.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      // RTL: first card at the right
      const x = W - 0.9 - cw - col * (cw + 0.3);
      const y = 1.8 + row * (ch + 0.3);
      s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.12, fill: { color: "FFFFFF" }, line: { color: "E2DCD2", width: 0.75 } });
      s.addShape(pres.ShapeType.ellipse, { x: x + cw - 0.3 - 0.6, y: y + 0.3, w: 0.6, h: 0.6, fill: { color: C.sand }, line: { color: C.sand } });
      s.addImage({ data: c[0], x: x + cw - 0.3 - 0.6 + 0.15, y: y + 0.45, w: 0.3, h: 0.3 });
      s.addText(c[1], T({ x: x + 0.3, y: y + 0.3, w: cw - 1.3, h: 0.6, fontSize: 17, bold: true, color: C.text, valign: "middle" }));
      s.addText(c[2], T({ x: x + 0.3, y: y + 1.0, w: cw - 0.6, h: ch - 1.2, fontSize: 13, color: C.muted }));
    });
    pageNum(s, n, false);
    s.addNotes("לדבר על: למה רציתי להגיע לשם (אוהב אתגרים, להוכיח לעצמי). המחיר (קושי פיזי ומנטלי + קשיים בבית). האנשים שהשפיעו – קליין וברנש, המפקצ' והמג\"ד. מה הצבא לימד אותי – שהכל בראש ושתמיד אפשר להשתפר.");
  }

  // ---------- 9b. two commanders ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    titleText(s, "שני מפקדים. שני שיעורים.", true);
    const cw = (W - 1.8 - 0.4) / 2, y = 1.8, ch = 4.7;
    const cols = [
      ["קליין", "המפקצ׳", "מצוינות. מקצועיות. לעשות דברים כמו שצריך – ועד הסוף.", "המסגרת שהוא הכניס אותנו אליה לא נגמרה בשחרור. עד היום אני במשטר אימונים בגללו."],
      ["ברנש", "המג״ד", "קודם כל בן אדם.", "הגיע משלדג, פיקד בתפקידים רבים, עטור שבחים והישגים בכל תחום. ובכל זאת: ידע את השמות של רוב החיילים, התייעץ איתנו על דברים מבצעיים, ודיבר איתנו כחבר – לא כמג״ד לחייל."],
    ];
    cols.forEach((c, i) => {
      const x = W - 0.9 - cw - i * (cw + 0.4);
      s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.14, fill: { color: C.ink2 }, line: { color: "2A313C", width: 0.75 } });
      s.addText(c[0], T({ x: x + 0.4, y: y + 0.35, w: cw - 0.8, h: 0.8, fontSize: 40, bold: true, color: C.sand }));
      s.addText(c[1], T({ x: x + 0.4, y: y + 1.15, w: cw - 0.8, h: 0.4, fontSize: 14, color: C.mutedL }));
      s.addText(c[2], T({ x: x + 0.4, y: y + 1.75, w: cw - 0.8, h: 1.1, fontSize: 22, bold: true, color: "FFFFFF" }));
      s.addText(c[3], T({ x: x + 0.4, y: y + 2.95, w: cw - 0.8, h: 1.6, fontSize: 14.5, color: C.mutedL }));
    });
    pageNum(s, n, true);
    s.addNotes("קליין – תמיד דחף אותנו למצוינות ומקצועיות, לעשות דברים כמו שצריך ועד הסוף. עד היום אני במשטר אימונים בגלל המסגרת שהוא הכניס אותנו אליה.\nברנש – הגיע משלדג, פיקד בתפקידים רבים, עטור שבחים, הישגים מרשימים בכל התחומים. ובכל זאת קודם כל היה אדם: ידע שמות של רוב החיילים, התייעץ איתנו על דברים מבצעיים, דיבר איתנו בשיח חברי ולא כמג\"ד-חייל.\nהשיעור: אפשר להיות הכי טוב ועדיין להישאר בן אדם.");
  }

  // ---------- 10. key idea ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addText("מוטיבציה מביאה אותך להתחלה.", T({ x: 1.0, y: 2.2, w: W - 2.0, h: 1.1, fontSize: 44, bold: true, color: C.mutedL, align: "center" }));
    s.addText("משמעת מביאה אותך לסוף.", T({ x: 1.0, y: 3.4, w: W - 2.0, h: 1.2, fontSize: 52, bold: true, color: C.sand, align: "center" }));
    pageNum(s, n, true);
    s.addNotes("הרעיון המרכזי של הפרק. להגיד, לעצור, ולתת דוגמה של יום אחד במסלול שבו המוטיבציה נגמרה ורק המשמעת נשארה.");
  }

  // ---------- 11. section: Oct 7 ----------
  { const s = pres.addSlide(); n++; sectionSlide(s, "03", "7 באוקטובר", "לא ״בשעה X קרה Y״. מה חשבתי בכל שלב.", n);
    s.addNotes("7 באוקטובר – 15 דקות. הלב הרגשי של ההרצאה, אבל לא כל ההרצאה. לספר כמו סרט. לא רק מה קרה – מה חשבת בכל שלב."); }

  // ---------- 12. timeline ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    titleText(s, "שבעה שלבים באותו יום", true);
    const stages = ["לפני", "ההבנה שמשהו לא רגיל קורה", "הכניסה ללחימה", "המארב", "הפציעה", "ההחלטה להמשיך", "הפינוי"];
    const left = 0.9, right = W - 0.9, gap = 0.18;
    const bw = (right - left - gap * (stages.length - 1)) / stages.length;
    const ly = 3.2;
    s.addShape(pres.ShapeType.line, { x: left + bw / 2, y: ly, w: right - left - bw, h: 0, line: { color: "3A4150", width: 2 } });
    stages.forEach((st, i) => {
      const x = right - bw - i * (bw + gap); // RTL order
      const cx = x + bw / 2;
      const hot = i === 3 || i === 4;
      s.addShape(pres.ShapeType.ellipse, { x: cx - 0.3, y: ly - 0.3, w: 0.6, h: 0.6, fill: { color: hot ? C.sand : C.ink2 }, line: { color: C.sand, width: 1.5 } });
      s.addText(String(i + 1), T({ x: cx - 0.3, y: ly - 0.3, w: 0.6, h: 0.6, fontSize: 14, bold: true, color: hot ? C.ink : C.sand, align: "center", valign: "middle" }));
      s.addText(st, T({ x, y: ly + 0.55, w: bw, h: 1.5, fontSize: 15, bold: hot, color: hot ? C.sand : "FFFFFF", align: "center" }));
    });
    s.addText("בכל שלב – משפט אחד על מה שעבר לי בראש. זה מה שהופך אירוע צבאי לסיפור אנושי.", T({ x: 0.9, y: 5.6, w: W - 1.8, h: 0.8, fontSize: 16, color: C.mutedL, align: "center" }));
    pageNum(s, n, true);
    s.addNotes("לבנות את זה בשלבים: לפני ← ההבנה שמשהו לא רגיל קורה ← הכניסה ללחימה ← המארב ← הפציעה ← ההחלטה להמשיך ← הפינוי.\nבכל שלב: מה חשבתי. לא רק מה קרה.");
  }

  // ---------- 13. inside the moment ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    photoSlot(s, 0.9, 0.9, 5.2, 5.7, "מהיום עצמו / מהגזרה (אם יש) – או תמונה של הצוות לפני", true, camD);
    s.addImage({ data: ic.quoteS, x: W - 1.8, y: 1.3, w: 0.8, h: 0.8 });
    s.addText("״באותו רגע עוד לא הבנתי שאני פצוע.", T({ x: 6.6, y: 2.4, w: W - 0.9 - 6.6, h: 1.2, fontSize: 32, bold: true, color: "FFFFFF" }));
    s.addText("הדבר היחיד שעבר לי בראש היה…״", T({ x: 6.6, y: 3.7, w: W - 0.9 - 6.6, h: 1.0, fontSize: 32, bold: true, color: C.sand }));
    s.addText("״תמיד אמרו לנו: מי שלא מתפקד – מקבל פוסט־טראומה.״", T({ x: 6.6, y: 5.0, w: W - 0.9 - 6.6, h: 1.0, fontSize: 20, color: C.mutedL }));
    pageNum(s, n, true);
    s.addNotes("הרגע של הפציעה. לעצור אחרי 'הדבר היחיד שעבר לי בראש היה…' – שנייה של שקט – ואז: תמיד אמרו לנו שמי שלא מתפקד מקבל פוסט טראומה. אז תפקדתי.\n(אם רוצים אפקט: להשאיר את השורה התחתונה מוסתרת ולחשוף בלחיצה.)\nזו ההחלטה השנייה – אותה החלטה מכיתה י': לפעול, לא לתת לדברים לקרות לי.");
  }

  // ---------- 14. the twist ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.sand);
    s.addText("האמת?", T({ x: 1.0, y: 1.9, w: W - 2.0, h: 1.2, fontSize: 60, bold: true, color: C.ink, align: "center" }));
    s.addText("הקרב היה החלק הקל.", T({ x: 1.0, y: 3.2, w: W - 2.0, h: 1.4, fontSize: 64, bold: true, color: C.ink, align: "center" }));
    s.addText("הקהל מצפה שהשיא היה 7 באוקטובר. הוא לא.", T({ x: 1.0, y: 4.9, w: W - 2.0, h: 0.6, fontSize: 18, color: "5A4A30", align: "center" }));
    s.addNotes("הטוויסט של ההרצאה. הקהל מצפה שהשיא היה 7 באוקטובר – ואתה אומר: הקרב היה החלק הקל.\nמכאן ההרצאה עוברת מסיפור מלחמה לסיפור חיים.");
  }

  // ---------- 15. section: and then it all ended ----------
  { const s = pres.addSlide(); n++; sectionSlide(s, "04", "ואז הכול נגמר", "מה שמגיע אחרי הקרב.", n);
    s.addNotes("ואז הכול נגמר – 8 דקות."); }

  // ---------- 16. numbers ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    const stats = [
      ["19", "חברים ויותר שאיבדתי באותו יום"],
      ["10", "חברים נוספים, כמעט, במהלך המלחמה"],
      ["3", "חודשי אשפוז בתל השומר"],
      ["2", "פציעות: יד ועין"],
    ];
    const bw = (W - 1.8 - 0.3 * 3) / 4;
    stats.forEach((st, i) => {
      const x = W - 0.9 - bw - i * (bw + 0.3);
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.6, w: bw, h: 3.6, rectRadius: 0.12, fill: { color: C.ink2 }, line: { color: "2A313C", width: 0.75 } });
      s.addText(st[0], T({ x: x + 0.2, y: 2.0, w: bw - 0.4, h: 1.6, fontSize: 64, bold: true, color: C.sand, align: "center", valign: "middle" }));
      s.addText(st[1], T({ x: x + 0.3, y: 3.7, w: bw - 0.6, h: 1.2, fontSize: 16, color: "FFFFFF", align: "center" }));
    });
    s.addText("הדבר הכי קשה אחרי השביעי: לא הפציעה. האובדן. הדברים שהם לא יספיקו לעשות, והמשפחות השכולות.", T({ x: 0.9, y: 5.6, w: W - 1.8, h: 0.9, fontSize: 18, color: C.mutedL, align: "center" }));
    pageNum(s, n, true);
    s.addNotes("איבדתי מעל 19 חברים באותו יום, ובמהלך המלחמה עוד כמעט עשרה. זה הדבר שהיה לי הכי קשה אחרי השביעי.\n(אפשר להגיד שם אחד או שניים – זה מקרב את הקהל.)");
  }

  // ---------- 17. what came after ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    titleText(s, "מה שאף אחד לא מכין אותך אליו", false);
    photoSlot(s, 0.9, 1.8, 3.6, 4.9, "מהשיקום בתל השומר", false, camL);
    const items = [
      [ic.hand, "הפציעה", "נפצעתי ביד מהחוסם עורקים, ובעין מרסיס."],
      [ic.hospital, "השיקום", "ארוך ומתיש. הייתי לבד רוב הזמן. שלושה חודשים בתל השומר – בלי משככי כאבים."],
      [ic.heart, "האובדן", "מעל 19 חברים באותו יום, ועוד כמעט עשרה במהלך המלחמה."],
      [ic.road, "החיים שאחרי", "לוחם ← פצוע ← אזרח, בתוך זמן קצר. מבלבל. לא סמכתי על אנשים, התרחקתי מחברים, ברחתי ממקומות רועשים והומים."],
    ];
    items.forEach((it, i) => {
      const y = 1.8 + i * 1.25;
      s.addShape(pres.ShapeType.ellipse, { x: W - 0.9 - 0.7, y, w: 0.7, h: 0.7, fill: { color: C.sand }, line: { color: C.sand } });
      s.addImage({ data: it[0], x: W - 0.9 - 0.7 + 0.17, y: y + 0.17, w: 0.36, h: 0.36 });
      s.addText(it[1], T({ x: 4.9, y, w: W - 0.9 - 0.95 - 4.9, h: 0.4, fontSize: 19, bold: true, color: C.text }));
      s.addText(it[2], T({ x: 4.9, y: y + 0.42, w: W - 0.9 - 0.95 - 4.9, h: 0.8, fontSize: 13.5, color: C.muted }));
    });
    pageNum(s, n, false);
    s.addNotes("הפציעה – יד (חוסם עורקים) ועין (רסיס).\nהשיקום – ארוך ומתיש, לבד רוב הזמן, בלי משככי כאבים, 3 חודשים בתל השומר. (לא להיכנס לסיבה – זה אישי ולא חלק מההרצאה.)\nהאובדן.\nהחיים שאחרי – המעבר המהיר בין לוחם לפצוע לאזרח. בעיה לסמוך על אנשים, התרחקות מחברים ומהחברה, קושי במקומות רועשים.\nכאן ההרצאה עוברת מסיפור מלחמה לסיפור חיים.");
  }

  // ---------- 18. turning back ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    photoSlot(s, 0.9, 0.9, 5.2, 5.7, "מהריטריט בפנמה – האנשים שפגשת שם", true, camD);
    s.addText("פנמה.", T({ x: 6.6, y: 1.3, w: W - 0.9 - 6.6, h: 1.1, fontSize: 60, bold: true, color: C.sand }));
    s.addText("בריטריט, רחוק מהכול, פגשתי אנשים ממש טובים.", T({ x: 6.6, y: 2.6, w: W - 0.9 - 6.6, h: 1.2, fontSize: 26, bold: true, color: "FFFFFF" }));
    s.addText("וראיתי שבאמת קיימים כאלה.", T({ x: 6.6, y: 3.8, w: W - 0.9 - 6.6, h: 0.8, fontSize: 26, bold: true, color: "FFFFFF" }));
    s.addText("משם התחלתי לחזור לאנשים. עברתי תהליך ארוך עד שהבנתי כמה משמעותיים הקשרים בחיים שלי. היום אני הרבה יותר פתוח.", T({ x: 6.6, y: 4.9, w: W - 0.9 - 6.6, h: 1.6, fontSize: 16, color: C.mutedL }));
    pageNum(s, n, true);
    s.addNotes("הרגע שבו הפסקתי להתרחק מאנשים: אחרי ריטריט בפנמה. פגשתי אנשים ממש טובים וראיתי שבאמת קיימים כאלה.\nלספר: מה עשית שם, מי היו האנשים, מה הרגע הספציפי שבו משהו נפתח.");
  }

  // ---------- 19. section: what to do ----------
  { const s = pres.addSlide(); n++; sectionSlide(s, "05", "מה עושים כשהחיים לא חוזרים להיות מה שהיו?", "שלושה עקרונות.", n, 34);
    s.addNotes("מה עושים כשהחיים לא חוזרים להיות מה שהיו – 10 דקות. החלק החדש. עליו הדגש."); }

  // ---------- 20. three principles ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    titleText(s, "שלושה עקרונות", false);
    const P = [
      [ic.dice, "1", "אתה לא שולט במה שקורה לך", "אבל אתה כן שולט במה שאתה עושה עם זה."],
      [ic.step, "2", "לא חייבים לדעת את כל הדרך", "צריך לדעת רק מה הצעד הבא."],
      [ic.hammer, "3", "זהות לא מקבלים. בונים.", "הפציעה לא מגדירה אותך. העבר לא מגדיר אותך. גם מה שקרה לך לא מגדיר בהכרח את האדם שתהיה."],
    ];
    const cw = (W - 1.8 - 0.4 * 2) / 3, ch = 4.6;
    P.forEach((p, i) => {
      const x = W - 0.9 - cw - i * (cw + 0.4), y = 1.8;
      s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.14, fill: { color: i === 2 ? C.ink : "FFFFFF" }, line: { color: i === 2 ? C.ink : "E2DCD2", width: 0.75 } });
      s.addShape(pres.ShapeType.ellipse, { x: x + cw - 0.4 - 0.9, y: y + 0.4, w: 0.9, h: 0.9, fill: { color: C.sand }, line: { color: C.sand } });
      s.addImage({ data: p[0], x: x + cw - 0.4 - 0.9 + 0.22, y: y + 0.62, w: 0.46, h: 0.46 });
      s.addText("עיקרון " + p[1], T({ x: x + 0.4, y: y + 0.5, w: cw - 1.9, h: 0.7, fontSize: 14, color: i === 2 ? C.mutedL : C.muted, valign: "middle" }));
      s.addText(p[2], T({ x: x + 0.4, y: y + 1.6, w: cw - 0.8, h: 1.3, fontSize: 24, bold: true, color: i === 2 ? "FFFFFF" : C.text }));
      s.addText(p[3], T({ x: x + 0.4, y: y + 3.0, w: cw - 0.8, h: 1.4, fontSize: 15, color: i === 2 ? C.mutedL : C.muted }));
    });
    pageNum(s, n, false);
    s.addNotes("עיקרון 1 – אתה לא שולט במה שקורה לך, אבל אתה כן שולט במה שאתה עושה עם זה.\nעיקרון 2 – לא חייבים לדעת את כל הדרך. רק את הצעד הבא.\nעיקרון 3 – זהות לא מקבלים. בונים.\nלכל עיקרון: דוגמה אחת מהחיים שלך מאז הפציעה.");
  }

  // ---------- 21. section: turn pain into something ----------
  { const s = pres.addSlide(); n++; sectionSlide(s, "06", "להפוך כאב למשהו", "מה אני עושה היום.", n);
    s.addNotes("להפוך כאב למשהו – 7 דקות."); }

  // ---------- 22. today ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    titleText(s, "מה אני עושה עם זה היום", false);
    const items = [
      [ic.grad, "לימודים", "הנדסאי בניין, ובקרוב – יזמות וקיימות באוניברסיטת רייכמן."],
      [ic.brief, "עבודה", "עבדתי בכל מיני עבודות – כל אחת לימדה אותי משהו."],
      [ic.mic, "הרצאות", "לעמוד מול אנשים ולספר. לא בשביל רחמים."],
      [ic.rocket, "קורסים והתנסויות", "מיציתי את עצמי עד הקצה: קורסים, טיולים בעולם, ניסיון בכל דבר."],
      [ic.target, "שאיפות", "יש לי שאיפות גדולות. אני לא יודע את כל הדרך – אני יודע מה הצעד הבא."],
      [ic.chart, "הרצון להתפתח", "לא לעצור. תמיד אפשר להיות יותר טוב."],
    ];
    const cw = (W - 1.8 - 0.3 * 2) / 3, ch = 2.15;
    items.forEach((it, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = W - 0.9 - cw - col * (cw + 0.3), y = 1.8 + row * (ch + 0.3);
      s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.12, fill: { color: "FFFFFF" }, line: { color: "E2DCD2", width: 0.75 } });
      s.addShape(pres.ShapeType.ellipse, { x: x + cw - 0.3 - 0.6, y: y + 0.3, w: 0.6, h: 0.6, fill: { color: C.sand }, line: { color: C.sand } });
      s.addImage({ data: it[0], x: x + cw - 0.3 - 0.6 + 0.15, y: y + 0.45, w: 0.3, h: 0.3 });
      s.addText(it[1], T({ x: x + 0.3, y: y + 0.3, w: cw - 1.3, h: 0.6, fontSize: 18, bold: true, color: C.text, valign: "middle" }));
      s.addText(it[2], T({ x: x + 0.3, y: y + 1.0, w: cw - 0.6, h: ch - 1.15, fontSize: 13.5, color: C.muted }));
    });
    pageNum(s, n, false);
    s.addNotes("לימודים, עבודה, הרצאות, מטרות, בניית עתיד, הרצון להתפתח.\nהמסר: לא תמיד אפשר לבחור את הסיפור שקיבלת. אפשר לבחור מה אתה עושה איתו.");
  }

  // ---------- 23. why I'm here ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addText("למה אני עומד פה?", T({ x: 0.9, y: 0.8, w: W - 1.8, h: 0.8, fontSize: 28, bold: true, color: C.mutedL, align: "center" }));
    s.addText("לא בשביל שירחמו עליי.   לא בשביל ״איזה גיבור״.", T({ x: 0.9, y: 1.7, w: W - 1.8, h: 0.7, fontSize: 22, color: "FFFFFF", align: "center" }));
    s.addShape(pres.ShapeType.roundRect, { x: 1.4, y: 2.9, w: W - 2.8, h: 2.9, rectRadius: 0.15, fill: { color: C.ink2 }, line: { color: "2A313C", width: 0.75 } });
    s.addImage({ data: ic.quoteS, x: W - 1.4 - 0.4 - 0.7, y: 3.2, w: 0.7, h: 0.7 });
    s.addText("״אני מספר לכם את הסיפור שלי כי אם בן אדם אחד כאן יחליט לקחת אחריות על החיים שלו בגלל משהו שהוא שמע ממני – היה שווה לי לספר אותו.״", T({ x: 1.9, y: 3.4, w: W - 2.8 - 1.0 - 0.9, h: 2.2, fontSize: 24, bold: true, color: "FFFFFF", valign: "middle" }));
    s.addText("לא תמיד אפשר לבחור את הסיפור שקיבלת. אפשר לבחור מה אתה עושה איתו.", T({ x: 0.9, y: 6.1, w: W - 1.8, h: 0.6, fontSize: 18, color: C.sand, align: "center" }));
    pageNum(s, n, true);
    s.addNotes("למה אתה בכלל עומד מול הקהל. לא בשביל שירחמו. לא בשביל 'איזה גיבור'. אלא בשביל בן אדם אחד שיחליט לקחת אחריות.");
  }

  // ---------- 23b. and the country? ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.paper);
    s.addText("ומה עם המדינה?", T({ x: 0.9, y: 0.9, w: W - 1.8, h: 0.8, fontSize: 28, bold: true, color: C.muted, align: "center" }));
    s.addText("אין בי כעס.", T({ x: 1.0, y: 2.0, w: W - 2.0, h: 1.2, fontSize: 60, bold: true, color: C.text, align: "center" }));
    s.addText("לא על ״ההפקרה״, לא על המדינה, לא על אף אחד.", T({ x: 1.0, y: 3.3, w: W - 2.0, h: 0.7, fontSize: 22, color: C.muted, align: "center" }));
    s.addText("אני מקווה שנתאחד כעם.", T({ x: 1.0, y: 4.4, w: W - 2.0, h: 0.9, fontSize: 36, bold: true, color: C.sandDeep, align: "center" }));
    s.addText("זה הדבר הראשון שצריך לקרות בשביל שינוי אמיתי.", T({ x: 1.0, y: 5.3, w: W - 2.0, h: 0.7, fontSize: 20, color: C.text, align: "center" }));
    pageNum(s, n, false);
    s.addNotes("הקהל תמיד שואל את זה, אז עדיף להקדים. אין בי כעס על ההפקרה, על המדינה או על מישהו. אני מקווה שנתאחד בתור עם – זה הדבר הראשון שצריך לקרות בשביל שינוי אמיתי.\nלא להיכנס לפוליטיקה. משפט אחד וממשיכים.");
  }

  // ---------- 24. closing callback ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addText("אז חשבתי שההחלטה הכי חשובה שקיבלתי", T({ x: 1.0, y: 1.5, w: W - 2.0, h: 0.8, fontSize: 28, color: C.mutedL, align: "center" }));
    s.addText("הייתה להמשיך להילחם.", T({ x: 1.0, y: 2.3, w: W - 2.0, h: 0.9, fontSize: 34, bold: true, color: C.mutedL, align: "center" }));
    s.addText("היום אני מבין שההחלטה החשובה באמת הייתה", T({ x: 1.0, y: 3.7, w: W - 2.0, h: 0.8, fontSize: 28, color: "FFFFFF", align: "center" }));
    s.addText("מה אני עושה אחרי שהמלחמה נגמרה.", T({ x: 1.0, y: 4.5, w: W - 2.0, h: 1.1, fontSize: 42, bold: true, color: C.sand, align: "center" }));
    pageNum(s, n, true);
    s.addNotes("הסיום – 3 דקות. חוזרים למשפט מהפתיחה.");
  }

  // ---------- 24b. the same decision, three times ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.ink);
    s.addText("ההחלטה הייתה לקחת את ההחלטות בחיים שלי בעצמי.", T({ x: 0.9, y: 0.7, w: W - 1.8, h: 1.0, fontSize: 30, bold: true, color: "FFFFFF", align: "center" }));
    s.addText("אותה החלטה. שלוש פעמים.", T({ x: 0.9, y: 1.6, w: W - 1.8, h: 0.6, fontSize: 18, color: C.mutedL, align: "center" }));
    const cw = (W - 1.8 - 0.4 * 2) / 3, y = 2.6, ch = 3.6;
    const items = [
      ["כיתה י׳", "כשהאשימו אותי – החלטתי לכתוב את הסיפור שלי בעצמי."],
      ["7.10", "כשנפצעתי – החלטתי לתפקד ולהמשיך."],
      ["היום", "כשהחיים לא חזרו למה שהיו – החלטתי לבנות אותם מחדש."],
    ];
    items.forEach((it, i) => {
      const x = W - 0.9 - cw - i * (cw + 0.4);
      s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.14, fill: { color: C.ink2 }, line: { color: "2A313C", width: 0.75 } });
      s.addText(it[0], T({ x: x + 0.4, y: y + 0.4, w: cw - 0.8, h: 1.0, fontSize: 40, bold: true, color: C.sand, align: "center", valign: "middle" }));
      s.addText(it[1], T({ x: x + 0.4, y: y + 1.6, w: cw - 0.8, h: 1.7, fontSize: 17, color: "FFFFFF", align: "center" }));
    });
    pageNum(s, n, true);
    s.addNotes("כאן סוגרים את המעגל מהפתיחה: 'ההחלטה' לא הייתה רק להמשיך להילחם. ההחלטה הייתה לקחת החלטות ולפעול בחיים של עצמי – כמו שעשיתי כילד, כמו שעשיתי בקרב, כמו שאני עושה היום.");
  }

  // ---------- 25. final ----------
  {
    const s = pres.addSlide(); n++;
    bg(s, C.sand);
    s.addText("לא תמיד אנחנו בוחרים את מה שקורה לנו.", T({ x: 1.0, y: 2.0, w: W - 2.0, h: 1.0, fontSize: 36, bold: true, color: "5A4A30", align: "center" }));
    s.addText("אבל אנחנו כן בוחרים מה אנחנו עושים מכאן.", T({ x: 1.0, y: 3.1, w: W - 2.0, h: 1.3, fontSize: 46, bold: true, color: C.ink, align: "center" }));
    s.addText("תודה.", T({ x: 1.0, y: 5.2, w: W - 2.0, h: 0.8, fontSize: 28, bold: true, color: C.ink, align: "center" }));
    s.addText("חנוך  |  054-5522053  |  Instagram: hanoch234", T({ x: 1.0, y: 6.1, w: W - 2.0, h: 0.5, fontSize: 14, color: "5A4A30", align: "center" }));
    s.addNotes("המשפט האחרון. לעצור. לא להוסיף כלום אחריו.");
  }

  await pres.writeFile({ fileName: "hanoch-7-10.pptx" });
  console.log("written", n, "slides");
})();
