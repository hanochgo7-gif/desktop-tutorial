# אתר המותג "אֶלֶף": פרויקט קונספט של HG Studio (מותג בדיוני). מייצר את elef/index.html ואת elef/en.html.
# כל התמונות והסרט מתוך פרסומת "אלף" שנוצרה בבינה מלאכותית. אין רכישה באתר: הכפתור מוביל ל-HG Studio.
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'elef')


def img(name, alt, cls='', sizes='100vw', w=1600, h=900, eager=False):
    load = 'fetchpriority="high"' if eager else 'loading="lazy"'
    c = f' class="{cls}"' if cls else ''
    return (f'<img{c} src="media/{name}-1600.webp" srcset="media/{name}-800.webp 800w, media/{name}-1600.webp 1600w" '
            f'sizes="{sizes}" alt="{alt}" width="{w}" height="{h}" {load} decoding="async">')


CSS = r'''
:root{--soil:#11150c;--soil-2:#181d11;--olive:#3f4a2a;--gold:#c9a227;--gold-hi:#e3c661;--stone:#9a9385;--lime:#ece6d7;--dawn:#2e3b4e;
--f-d:'Frank Ruhl Libre',Georgia,serif;--f-b:'Rubik',system-ui,sans-serif;--g:clamp(20px,5vw,72px)}
*{box-sizing:border-box}html{scroll-behavior:smooth}@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--soil);color:var(--lime);font-family:var(--f-b);font-size:1.0625rem;line-height:1.75;-webkit-font-smoothing:antialiased}
img,video{display:block;max-width:100%;height:auto}
a{color:inherit}
:focus-visible{outline:2px solid var(--gold-hi);outline-offset:4px;border-radius:2px}
.skip{position:absolute;inset-inline-start:12px;top:-60px;z-index:50;background:var(--gold);color:var(--soil);padding:10px 16px;border-radius:6px;font-weight:500;text-decoration:none}
.skip:focus{top:12px}
.topbar{position:absolute;top:0;inset-inline:0;z-index:5}
.concept{margin:0;max-width:none;background:rgba(63,74,42,.92);color:var(--lime);text-align:center;font-size:.875rem;padding:8px var(--g)}
.concept a{color:var(--gold-hi)}
/* כותרת */
.top{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:18px var(--g)}
.mark{display:flex;align-items:baseline;gap:.6rem;text-decoration:none}
.mark b{font-family:var(--f-d);font-weight:400;font-size:2.4rem;line-height:1;color:var(--gold)}
.mark span{font-family:var(--f-d);font-size:1.15rem;letter-spacing:.02em}
.top nav{display:flex;gap:clamp(.8rem,2.4vw,2rem);font-size:.95rem}
.top nav a{text-decoration:none;opacity:.86;min-height:44px;display:inline-flex;align-items:center}
.top nav a:hover{opacity:1;color:var(--gold-hi)}
@media (max-width:820px){.top nav .sec{display:none}}
/* פתיחה */
.hero{position:relative;min-height:100svh;display:grid;align-items:end;overflow:hidden;isolation:isolate}
.hero video,.hero .poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.hero::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(17,21,12,.55) 0%,rgba(17,21,12,.05) 35%,rgba(17,21,12,.35) 62%,rgba(17,21,12,.96) 100%)}
.hero-in{padding:0 var(--g) clamp(48px,9vh,110px);max-width:1180px}
.aleph{font-family:var(--f-d);font-size:clamp(7rem,22vw,17rem);line-height:.8;color:var(--gold);margin:0 0 .1em;display:block}
.hero h1{font-family:var(--f-d);font-weight:400;font-size:clamp(2.6rem,6vw,4.6rem);line-height:1.05;margin:0}
.hero .tag{font-family:var(--f-d);font-size:clamp(1.3rem,2.4vw,1.8rem);color:var(--gold-hi);margin:.4rem 0 1rem}
.hero .lede{max-width:46ch;color:rgba(236,230,215,.88);margin:0 0 1.6rem}
.btn{display:inline-flex;align-items:center;gap:.6rem;min-height:48px;padding:.7rem 1.4rem;border-radius:99px;border:1px solid var(--gold);color:var(--lime);text-decoration:none;font-weight:500;background:rgba(17,21,12,.35);backdrop-filter:blur(6px)}
.btn:hover{background:var(--gold);color:var(--soil)}
.btn-gold{background:var(--gold);color:var(--soil)}
.btn-gold:hover{background:var(--gold-hi)}
/* טפטוף: הסמן היחיד שזז עם הגלילה */
.drip{position:fixed;inset-inline-start:clamp(8px,1.6vw,22px);top:0;width:2px;height:100vh;z-index:4;pointer-events:none}
.drip i{position:absolute;inset-inline-start:0;top:0;width:2px;height:calc(var(--p,0) * 100%);background:linear-gradient(180deg,rgba(201,162,39,0),var(--gold) 30%,var(--gold-hi));border-radius:2px}
.drip i::after{content:"";position:absolute;bottom:-7px;inset-inline-start:-4px;width:10px;height:12px;background:var(--gold-hi);border-radius:50% 50% 50% 50%/60% 60% 40% 40%}
@media (prefers-reduced-motion:reduce){.drip{display:none}}
/* מקטעים */
section{position:relative}
.wrap{max-width:1180px;margin:0 auto;padding:0 var(--g)}
.kicker{font-size:.9rem;color:var(--gold-hi);margin:0 0 .6rem}
h2{font-family:var(--f-d);font-weight:400;font-size:clamp(2.1rem,4.6vw,3.6rem);line-height:1.1;margin:0 0 1rem}
.lead{font-family:var(--f-d);font-size:clamp(1.35rem,2.4vw,1.85rem);line-height:1.5;max-width:30ch;margin:0}
p{max-width:62ch}
.grove{padding:clamp(80px,14vh,160px) 0 0}
.grove .split{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(24px,5vw,80px);align-items:end}
.grove .wide{margin-top:clamp(40px,8vh,90px);position:relative}
.grove .wide img{width:100%;height:clamp(320px,62vh,720px);object-fit:cover}
.grove .wide figcaption{position:absolute;inset-inline-start:var(--g);bottom:24px;font-size:.9rem;color:rgba(236,230,215,.85)}
.bark{display:grid;grid-template-columns:.75fr 1.25fr;gap:clamp(24px,5vw,80px);align-items:center;padding-block:clamp(60px,10vh,120px)}
.bark img{width:100%;aspect-ratio:4/5;max-height:72vh;object-fit:cover}
/* השנה של הטיפה */
.year{background:var(--soil-2);padding:clamp(80px,14vh,160px) 0}
.steps{list-style:none;margin:clamp(36px,6vh,64px) 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,26px)}
.steps li{display:flex;flex-direction:column;gap:.7rem}
.steps figure{margin:0;overflow:hidden;aspect-ratio:3/4;background:#0c0f08}
.steps img,.steps video{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.steps li:hover img{transform:scale(1.04)}
.steps time{font-size:.9rem;color:var(--gold-hi)}
.steps h3{font-family:var(--f-d);font-weight:400;font-size:1.5rem;margin:0;line-height:1.2}
.steps p{margin:0;color:rgba(236,230,215,.82);font-size:.98rem}
/* הטעם */
.taste{padding:clamp(90px,16vh,180px) 0;text-align:center}
.taste .lead{margin:0 auto;max-width:24ch;font-size:clamp(1.7rem,3.6vw,2.8rem)}
.notes{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;list-style:none;padding:0;margin:2.2rem 0 0}
.notes li{border:1px solid rgba(201,162,39,.55);border-radius:99px;padding:.45rem 1.1rem;font-size:.98rem}
.spec{display:grid;grid-template-columns:repeat(4,auto);justify-content:center;gap:0;margin:3rem auto 0;padding:0;list-style:none;border-block:1px solid rgba(236,230,215,.16)}
.spec li{padding:1rem clamp(14px,2.6vw,34px);text-align:center}
.spec li+li{border-inline-start:1px solid rgba(236,230,215,.16)}
.spec b{display:block;font-weight:400;font-size:.85rem;color:var(--stone)}
.bottle{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(24px,5vw,80px);padding-bottom:clamp(80px,14vh,150px)}
.bottle img{width:100%;aspect-ratio:4/3;object-fit:cover}
/* הסרט */
.film{padding:clamp(70px,12vh,140px) 0;background:#0b0e07}
.player{position:relative;margin-top:2rem;aspect-ratio:16/9;background:#000;overflow:hidden}
.player video{width:100%;height:100%;object-fit:contain}
/* שולחן */
.table{padding:clamp(80px,14vh,160px) 0}
.table .pair{display:grid;grid-template-columns:1fr 1fr;gap:clamp(14px,2vw,26px);margin-top:2rem}
.table img{width:100%;aspect-ratio:4/3;object-fit:cover}
.quote{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(24px,5vw,80px);padding-bottom:clamp(80px,14vh,160px)}
.quote img{width:100%;aspect-ratio:4/5;max-height:76vh;object-fit:cover}
.quote blockquote{margin:0;font-family:var(--f-d);font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.2}
.quote cite{display:block;margin-top:1rem;font-style:normal;font-family:var(--f-b);font-size:.95rem;color:var(--stone)}
/* סוף */
.end{border-top:1px solid rgba(236,230,215,.12);padding:clamp(60px,10vh,110px) 0 40px}
.end .cta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1.4rem}
.end h2{font-size:clamp(1.8rem,3.6vw,2.6rem);margin:0}
.end small{display:block;margin-top:3rem;color:var(--stone);font-size:.875rem;line-height:1.7;max-width:80ch}
.end nav{display:flex;flex-wrap:wrap;gap:.2rem 1.4rem;margin-top:1rem;font-size:.875rem}
.end nav a{color:var(--stone);min-height:44px;display:inline-flex;align-items:center}
/* הופעה עדינה אחת לכל מקטע */
.motion .rise{opacity:0;transform:translateY(24px);transition:opacity 1s ease,transform 1s cubic-bezier(.2,.7,.2,1)}
.motion .rise.in{opacity:1;transform:none}
@media (max-width:900px){
  .grove .split,.bark,.bottle,.quote{grid-template-columns:1fr}
  .steps{grid-template-columns:1fr 1fr}
  .spec{grid-template-columns:1fr 1fr}
  .spec li:nth-child(3){border-inline-start:0}
  .spec li:nth-child(n+3){border-top:1px solid rgba(236,230,215,.16)}
}
@media (max-width:520px){.steps{grid-template-columns:1fr}.steps figure{aspect-ratio:4/3}.table .pair{grid-template-columns:1fr}}
'''

JS = r'''
(function(){
  var d=document.documentElement, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce) d.classList.add('motion');
  var drip=document.querySelector('.drip i');
  function onScroll(){var h=d.scrollHeight-innerHeight; if(drip) drip.parentNode.style.setProperty('--p', h>0?Math.min(1,scrollY/h):0);}
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -10% 0px'});
    document.querySelectorAll('.rise').forEach(function(el){io.observe(el);});
    // לולאות שקטות מתנגנות רק כשהן על המסך
    var vo=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target; if(e.isIntersecting){if(!v.src){v.src=(innerWidth<700&&v.dataset.srcM)||v.dataset.src;} if(!reduce) v.play().catch(function(){});} else v.pause();});},{threshold:.2});
    document.querySelectorAll('video[data-src]').forEach(function(v){vo.observe(v);});
  } else document.querySelectorAll('.rise').forEach(function(el){el.classList.add('in');});
})();
'''


def page(lang):
    he = lang == 'he'
    T = (lambda a, b: a) if he else (lambda a, b: b)
    other = 'en.html' if he else './'
    film = 'elef.mp4' if he else 'elef-en.mp4'
    film_m = 'elef-m.mp4' if he else 'elef-en-m.mp4'
    return f'''<!doctype html>
<html lang="{lang}" dir="{T('rtl', 'ltr')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{T('אֶלֶף · שמן זית מהגליל · פרויקט קונספט של HG Studio', 'Elef · Olive oil from the Galilee · An HG Studio concept')}</title>
<meta name="description" content="{T('אתר מותג קונספט לשמן זית בדיוני מהגליל, שעיצב ובנה HG Studio. כל התמונות והסרט נוצרו בבינה מלאכותית.', 'A concept brand site for a fictional olive oil from the Galilee, designed and built by HG Studio. Every image and the film were made with AI.')}">
<link rel="canonical" href="https://hgpro.io/elef/{'' if he else 'en.html'}">
<link rel="alternate" hreflang="he" href="https://hgpro.io/elef/">
<link rel="alternate" hreflang="en" href="https://hgpro.io/elef/en.html">
<meta property="og:title" content="{T('אֶלֶף · אלף שנה בטיפה אחת', 'Elef · A thousand years in a single drop')}">
<meta property="og:image" content="https://hgpro.io/elef/media/s8-poster.webp">
<meta name="theme-color" content="#11150c">
<link rel="icon" href="../images/icon-180.png">
<link rel="preload" as="font" type="font/woff2" href="../fonts/g/frank-ruhl-libre-{T('hebrew-096aa4', 'latin-ce3b5a')}.woff2" crossorigin>
<link rel="stylesheet" href="../css/fonts.css">
<link rel="preload" as="image" href="media/s8-poster.webp" fetchpriority="high">
<style>{CSS}</style>
<script src="../js/consent.js" defer></script>
<script src="../js/ga.js" defer></script>
</head>
<body data-root="../">
<a class="skip" href="#main">{T('דלגו לתוכן', 'Skip to content')}</a>
<div class="topbar">
<p class="concept">{T('פרויקט קונספט של <a href="../work.html">HG Studio</a>. אֶלֶף הוא מותג בדיוני, וכל התמונות והסרט נוצרו בבינה מלאכותית.', 'An <a href="../en-work.html">HG Studio</a> concept project. Elef is a fictional brand, and every image and the film were made with AI.')}</p>
<header class="top">
  <a class="mark" href="#main" aria-label="{T('אֶלֶף, לראש העמוד', 'Elef, back to top')}"><b aria-hidden="true">א</b><span>{T('אֶלֶף', 'Elef')}</span></a>
  <nav aria-label="{T('ניווט', 'Navigation')}">
    <a class="sec" href="#grove">{T('החורשה', 'The grove')}</a>
    <a class="sec" href="#year">{T('מהעץ לבקבוק', 'Tree to bottle')}</a>
    <a class="sec" href="#taste">{T('הטעם', 'The taste')}</a>
    <a class="sec" href="#film">{T('הסרט', 'The film')}</a>
    <a href="{other}" lang="{T('en', 'he')}">{T('English', 'עברית')}</a>
  </nav>
</header>
</div>
<div class="drip" aria-hidden="true"><i></i></div>
<main id="main">
<section class="hero" aria-labelledby="h1">
  <img class="poster" src="media/s8-poster.webp" alt="" width="1600" height="900" fetchpriority="high">
  <video muted loop playsinline preload="none" poster="media/s8-poster.webp" data-src="media/s8-loop.mp4" data-src-m="media/s8-loop-m.mp4" aria-hidden="true"></video>
  <div class="hero-in">
    <span class="aleph" aria-hidden="true">א</span>
    <h1 id="h1">{T('אֶלֶף', 'Elef')}</h1>
    <p class="tag">{T('אלף שנה בטיפה אחת.', 'A thousand years in a single drop.')}</p>
    <p class="lede">{T('שמן זית כתית מעולה מהגליל העליון. זיתים שנמסקים ביד, נכבשים באותו יום על אבן, ונכנסים לבקבוק כהה. בלי לקצר אף שלב.', 'Extra virgin olive oil from the Upper Galilee. Olives picked by hand, pressed on stone the same day, and poured into dark glass. No step rushed.')}</p>
    <a class="btn" href="#film">{T('לצפייה בסרט', 'Watch the film')} <span aria-hidden="true">{T('↙', '↘')}</span></a>
  </div>
</section>

<section class="grove" id="grove" aria-labelledby="grove-t">
  <div class="wrap split rise">
    <div>
      <p class="kicker">{T('החורשה', 'The grove')}</p>
      <h2 id="grove-t">{T('העצים האלה ראו הכול.', 'These trees have seen it all.')}</h2>
    </div>
    <p class="lead">{T('על הטרסות של הגליל עומדים עצים מפותלים, שורשים בתוך אבן. אנחנו לא ממהרים אותם. רק מגיעים בזמן.', 'On the Galilee terraces stand twisted trees with roots in the rock. We never hurry them. We just arrive on time.')}</p>
  </div>
  <figure class="wide rise">{img('s1', T('גבעות הגליל בשחר, ערפל בעמקים וחורשת זיתים עתיקה', 'Galilee hills at dawn, mist in the valleys and an ancient olive grove'))}<figcaption>{T('הגליל העליון, השעה שלפני הזריחה', 'Upper Galilee, the hour before sunrise')}</figcaption></figure>
  <div class="wrap bark">
    <figure class="rise" style="margin:0">{img('s4', T('איכר מבוגר נוגע בגזע של עץ זית עתיק בערפל של בוקר', 'An old farmer touches the trunk of an ancient olive tree in morning mist'), sizes='(max-width:900px) 100vw, 40vw', h=900)}</figure>
    <div class="rise">
      <p class="lead">{T('כל עץ מכיר את היד שקוטפת ממנו. אותה משפחה, אותה חורשה, דור אחרי דור.', 'Every tree knows the hand that picks it. The same family, the same grove, generation after generation.')}</p>
      <p style="color:rgba(236,230,215,.8)">{T('הקליפה הסדוקה, הטל והאור הראשון הם חלק מהשמן. לכן הסיפור של אֶלֶף מתחיל כאן, לא בבית הבד.', 'The cracked bark, the dew and the first light are part of the oil. That is why the story of Elef starts here, not at the press.')}</p>
    </div>
  </div>
</section>

<section class="year" id="year" aria-labelledby="year-t">
  <div class="wrap">
    <p class="kicker rise">{T('מהעץ לבקבוק', 'Tree to bottle')}</p>
    <h2 class="rise" id="year-t">{T('יום אחד, ארבעה שלבים.', 'One day, four steps.')}</h2>
    <ol class="steps">
      <li class="rise"><figure>{img('s5', T('ידיים מוסקות זיתים לסל נצרים', 'Hands picking olives into a wicker basket'), sizes='(max-width:520px) 100vw, (max-width:900px) 50vw, 25vw', w=800, h=450)}</figure><time>{T('אוקטובר, עם שחר', 'October, at dawn')}</time><h3>{T('המסיק', 'The harvest')}</h3><p>{T('זית אחרי זית, ביד, אל סל נצרים. רק זיתים שלמים.', 'Olive by olive, by hand, into a wicker basket. Only whole fruit.')}</p></li>
      <li class="rise"><figure>{img('s7', T('אבן ריחיים עתיקה מסתובבת בבית בד מאבן', 'An ancient millstone turning in a stone press house'), sizes='(max-width:520px) 100vw, (max-width:900px) 50vw, 25vw', w=800, h=450)}</figure><time>{T('באותו יום', 'The same day')}</time><h3>{T('אבן הריחיים', 'The millstone')}</h3><p>{T('הזיתים נטחנים לאט על אבן, בלי חום, כדי שהטעם יישאר.', 'The olives are crushed slowly on stone, without heat, so the flavor stays.')}</p></li>
      <li class="rise"><figure><video muted loop playsinline preload="none" poster="media/s6-poster.webp" data-src="media/s6-loop.mp4" data-src-m="media/s6-loop-m.mp4" aria-label="{T('טיפה נוטפת מזית על הענף', 'A drop falling from an olive on the branch')}"></video></figure><time>{T('הטיפה הראשונה', 'The first drop')}</time><h3>{T('כבישה אחת', 'One pressing')}</h3><p>{T('שמן ירוק־זהוב שזורם פעם אחת בלבד. מה שלא יצא, לא נכנס לבקבוק.', 'Green-gold oil that flows only once. Whatever does not run free stays out of the bottle.')}</p></li>
      <li class="rise"><figure>{img('s12', T('בקבוק זכוכית כהה על חומת אבן בחורשה', 'A dark glass bottle on a stone wall in the grove'), sizes='(max-width:520px) 100vw, (max-width:900px) 50vw, 25vw', w=800, h=450)}</figure><time>{T('אל הבקבוק', 'Into the bottle')}</time><h3>{T('זכוכית כהה', 'Dark glass')}</h3><p>{T('הזכוכית שומרת על השמן מהאור, כמו שהאבן שמרה עליו בבית הבד.', 'The glass keeps the oil from the light, just as the stone kept it at the press.')}</p></li>
    </ol>
  </div>
</section>

<section class="taste" id="taste" aria-labelledby="taste-t">
  <div class="wrap">
    <p class="kicker rise">{T('הטעם', 'The taste')}</p>
    <h2 class="rise" id="taste-t" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">{T('הטעם', 'The taste')}</h2>
    <p class="lead rise">{T('ירוק כמו עשב אחרי גשם, מריר כמו שקד, ועוקצני בסוף הגרון.', 'Green like grass after rain, bitter like almond, with a peppery catch at the back of the throat.')}</p>
    <ul class="notes rise" aria-label="{T('תווי טעם', 'Tasting notes')}"><li>{T('עשב קצור', 'Cut grass')}</li><li>{T('עלה עגבנייה', 'Tomato leaf')}</li><li>{T('שקד מר', 'Bitter almond')}</li><li>{T('פלפל שחור', 'Black pepper')}</li></ul>
    <ul class="spec rise">
      <li><b>{T('סוג', 'Grade')}</b>{T('כתית מעולה', 'Extra virgin')}</li>
      <li><b>{T('זן', 'Variety')}</b>{T('סורי', 'Souri')}</li>
      <li><b>{T('כבישה', 'Pressing')}</b>{T('אחת, קרה', 'Single, cold')}</li>
      <li><b>{T('בקבוק', 'Bottle')}</b>{T('500 מ״ל, זכוכית כהה', '500 ml, dark glass')}</li>
    </ul>
  </div>
</section>
<div class="wrap bottle">
  <figure class="rise" style="margin:0">{img('s3', T('קרני שמש ראשונות בין עצי הזית בערפל של בוקר', 'First sunbeams through the olive trees in morning mist'), sizes='(max-width:900px) 100vw, 50vw')}</figure>
  <div class="rise">
    <p class="lead">{T('הזית מבשיל לאט, בין גשם ראשון לשמש של סתיו. את הסבלנות הזאת טועמים.', 'The olive ripens slowly, between the first rain and the autumn sun. You can taste that patience.')}</p>
  </div>
</div>

<section class="film" id="film" aria-labelledby="film-t">
  <div class="wrap">
    <p class="kicker">{T('הסרט', 'The film')}</p>
    <h2 id="film-t">{T('אלף שנה, בדקה אחת.', 'A thousand years, in one minute.')}</h2>
    <div class="player"><video controls playsinline preload="none" poster="../work/film/elef.webp" aria-label="{T('הסרט של אֶלֶף, 60 שניות', 'The Elef film, 60 seconds')}">
      <source src="../work/film/{film_m}" type="video/mp4" media="(max-width: 700px)">
      <source src="../work/film/{film}" type="video/mp4">
      <track kind="captions" srclang="{lang}" label="{T('עברית', 'English')}" src="../work/film/elef.{lang}.vtt" default>
    </video></div>
  </div>
</section>

<section class="table" aria-labelledby="table-t">
  <div class="wrap">
    <p class="kicker rise">{T('על השולחן', 'At the table')}</p>
    <h2 class="rise" id="table-t">{T('לחם חם, מלח גס ושמן. זה כל המתכון.', 'Warm bread, coarse salt and oil. That is the whole recipe.')}</h2>
    <div class="pair">
      <figure class="rise" style="margin:0">{img('s10', T('ידיים בוצעות כיכר לחם חם ליד קערית שמן', 'Hands tearing a warm loaf beside a small bowl of oil'), sizes='(max-width:520px) 100vw, 50vw')}</figure>
      <figure class="rise" style="margin:0">{img('s11', T('פרוסת לחם עם טיפת שמן זית זהובה', 'A slice of bread with a golden drop of olive oil'), sizes='(max-width:520px) 100vw, 50vw')}</figure>
    </div>
  </div>
</section>
<div class="wrap quote">
  <figure class="rise" style="margin:0">{img('s9b', T('פניו של האיכר באור הבוקר, עיניים עצומות', 'The farmer in the morning light, eyes closed'), sizes='(max-width:900px) 100vw, 50vw')}</figure>
  <blockquote class="rise">{T('״יש דברים שאי אפשר למהר.״', '“Some things cannot be rushed.”')}<cite>{T('מתוך הסרט של אֶלֶף', 'From the Elef film')}</cite></blockquote>
</div>
</main>
<footer class="end">
  <div class="wrap">
    <div class="cta">
      <h2>{T('רוצים אתר כזה לעסק שלכם?', 'Want a site like this for your business?')}</h2>
      <a class="btn btn-gold" href="../{T('index.html', 'en.html')}#brief">{T('לדבר עם HG Studio', 'Talk to HG Studio')} <span aria-hidden="true">{T('←', '→')}</span></a>
    </div>
    <small>{T('אֶלֶף הוא מותג בדיוני. האתר הוא פרויקט קונספט שעיצב ובנה HG Studio, ואין בו מכירה. כל התמונות, הסרט והקריינות נוצרו בבינה מלאכותית; המוזיקה בסרט: הסוויטה לצ׳לו מס׳ 1 של באך, בהקלטה בנחלת הכלל.', 'Elef is a fictional brand. This site is a concept project designed and built by HG Studio, and nothing is sold here. Every image, the film and the voiceover were made with AI; the music in the film is Bach’s Cello Suite No. 1, in a public-domain recording.')}</small>
    <nav aria-label="{T('מידע משפטי', 'Legal')}"><a href="../{T('privacy.html', 'en-privacy.html')}">{T('מדיניות פרטיות', 'Privacy policy')}</a><a href="../{T('accessibility.html', 'en-accessibility.html')}">{T('הצהרת נגישות', 'Accessibility statement')}</a><a href="#" data-consent-open>{T('הגדרות עוגיות', 'Cookie settings')}</a><a href="../{T('work.html', 'en-work.html')}">{T('לתיק העבודות של HG Studio', 'HG Studio portfolio')}</a></nav>
  </div>
</footer>
<script>{JS}</script>
</body>
</html>
'''


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for lang, name in (('he', 'index.html'), ('en', 'en.html')):
        open(os.path.join(OUT, name), 'w', encoding='utf-8').write(page(lang))
    print('elef pages 2')
