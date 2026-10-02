/* הבמה: האות ח מזכוכית, ושישה חפצים של לקוחות שמקיפים אותה.
   Three.js כמודול מ-jsdelivr. בלי WebGL 2, או ב"הפחתת תנועה", הקובץ לא עושה כלום
   והפתיחה נשארת עם החלקיקים או עם הטקסט הרגיל. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const root = document.documentElement;
const EN = root.lang === 'en';
const T = (he, en) => (EN ? en : he);
const hero = document.querySelector('.hero');
// החלק שנצמד למסך בזמן הצלילה; כל מה שמצויר ונמדד יושב בתוכו
const pin = hero ? (hero.querySelector('.hero-pin') || hero) : null;
// בתצוגה המקדימה המודלים מוגשים כ-glTF JSON (שם אין קובצי .glb)
const EXT = window.HG_MODEL_EXT || '.glb';
const HET = [[[-0.4755,0.4975],[-0.4755,0.4949],[-0.4752,0.4919],[-0.4748,0.4885],[-0.4743,0.4847],[-0.4736,0.4805],[-0.4728,0.4759],[-0.4718,0.471],[-0.4706,0.4656],[-0.4687,0.4595],[-0.4667,0.4531],[-0.4646,0.4467],[-0.4623,0.4402],[-0.46,0.4335],[-0.4575,0.4268],[-0.4549,0.4199],[-0.4522,0.4129],[-0.4451,0.3962],[-0.4379,0.3811],[-0.4305,0.3677],[-0.4231,0.3558],[-0.4155,0.3456],[-0.4078,0.337],[-0.4,0.3299],[-0.3921,0.3245],[-0.3875,0.3084],[-0.3835,0.2937],[-0.3801,0.2805],[-0.3774,0.2687],[-0.3752,0.2584],[-0.3737,0.2495],[-0.3728,0.2421],[-0.3725,0.2362],[-0.3725,0.2319],[-0.3728,0.2204],[-0.3731,0.2016],[-0.3737,0.1755],[-0.3744,0.1421],[-0.3752,0.1014],[-0.3762,0.0534],[-0.3774,-0.0018],[-0.3785,-0.0759],[-0.3795,-0.141],[-0.3804,-0.1972],[-0.381,-0.2445],[-0.3816,-0.2828],[-0.382,-0.3122],[-0.3822,-0.3326],[-0.3823,-0.3442],[-0.3846,-0.3546],[-0.3867,-0.3645],[-0.3886,-0.3738],[-0.3903,-0.3825],[-0.3917,-0.3907],[-0.3929,-0.3982],[-0.3938,-0.4052],[-0.3945,-0.4117],[-0.3945,-0.4165],[-0.3945,-0.4211],[-0.3945,-0.4255],[-0.3945,-0.4298],[-0.3945,-0.4338],[-0.3945,-0.4377],[-0.3945,-0.4413],[-0.3945,-0.4448],[-0.3939,-0.4484],[-0.3932,-0.4517],[-0.3924,-0.4548],[-0.3915,-0.4577],[-0.3905,-0.4603],[-0.3895,-0.4627],[-0.3884,-0.4649],[-0.3872,-0.4669],[-0.3825,-0.4727],[-0.3784,-0.4778],[-0.3747,-0.4823],[-0.3715,-0.4862],[-0.3689,-0.4894],[-0.3667,-0.4919],[-0.365,-0.4938],[-0.3639,-0.4951],[-0.362,-0.4962],[-0.3602,-0.4971],[-0.3583,-0.4977],[-0.3565,-0.4982],[-0.3547,-0.4984],[-0.3528,-0.4983],[-0.351,-0.498],[-0.3491,-0.4975],[-0.3467,-0.4968],[-0.3444,-0.4959],[-0.3421,-0.4947],[-0.3399,-0.4933],[-0.3378,-0.4916],[-0.3358,-0.4897],[-0.3338,-0.4876],[-0.332,-0.4853],[-0.3269,-0.4798],[-0.3213,-0.4733],[-0.3153,-0.4657],[-0.309,-0.4571],[-0.3022,-0.4473],[-0.2949,-0.4365],[-0.2873,-0.4246],[-0.2792,-0.4117],[-0.2756,-0.4062],[-0.2721,-0.4007],[-0.2687,-0.3953],[-0.2654,-0.3899],[-0.2622,-0.3845],[-0.2592,-0.3792],[-0.2563,-0.3739],[-0.2534,-0.3687],[-0.2505,-0.364],[-0.2479,-0.3597],[-0.2456,-0.3557],[-0.2436,-0.3521],[-0.2419,-0.349],[-0.2406,-0.3462],[-0.2395,-0.3438],[-0.2387,-0.3417],[-0.2382,-0.3393],[-0.2378,-0.3371],[-0.2376,-0.335],[-0.2375,-0.3331],[-0.2376,-0.3314],[-0.2378,-0.3298],[-0.2382,-0.3283],[-0.2387,-0.327],[-0.2388,-0.3263],[-0.239,-0.3255],[-0.2394,-0.3246],[-0.2399,-0.3236],[-0.2406,-0.3225],[-0.2415,-0.3212],[-0.2425,-0.3199],[-0.2436,-0.3184],[-0.2454,-0.3165],[-0.2468,-0.3144],[-0.2481,-0.3122],[-0.2491,-0.3098],[-0.25,-0.3073],[-0.2505,-0.3046],[-0.2509,-0.3018],[-0.251,-0.2988],[-0.2516,-0.298],[-0.2521,-0.2969],[-0.2525,-0.2956],[-0.2528,-0.2939],[-0.2531,-0.2919],[-0.2533,-0.2896],[-0.2534,-0.287],[-0.2534,-0.284],[-0.2541,-0.2805],[-0.2547,-0.2771],[-0.2553,-0.2739],[-0.2559,-0.2709],[-0.2565,-0.268],[-0.2571,-0.2654],[-0.2577,-0.263],[-0.2583,-0.2607],[-0.255,-0.2124],[-0.2524,-0.168],[-0.2504,-0.1276],[-0.2491,-0.0911],[-0.2486,-0.0586],[-0.2487,-0.03],[-0.2495,-0.0053],[-0.251,0.0153],[-0.2524,0.0265],[-0.2543,0.0398],[-0.2566,0.0552],[-0.2593,0.0727],[-0.2624,0.0923],[-0.2659,0.114],[-0.2699,0.1379],[-0.2743,0.1638],[-0.2766,0.1811],[-0.2786,0.1966],[-0.2803,0.2105],[-0.2817,0.2227],[-0.2827,0.2332],[-0.2835,0.242],[-0.284,0.2492],[-0.2841,0.2546],[-0.283,0.2664],[-0.282,0.278],[-0.2811,0.2893],[-0.2804,0.3003],[-0.2799,0.3111],[-0.2795,0.3215],[-0.2793,0.3318],[-0.2792,0.3417],[-0.2508,0.3457],[-0.2219,0.3492],[-0.1926,0.352],[-0.163,0.3543],[-0.1328,0.356],[-0.1023,0.3571],[-0.0713,0.3577],[-0.0399,0.3577],[-0.0102,0.3559],[0.0201,0.3517],[0.051,0.3451],[0.0824,0.3362],[0.1145,0.3249],[0.1471,0.3112],[0.1803,0.2951],[0.214,0.2767],[0.238,0.2541],[0.2594,0.2304],[0.2785,0.2056],[0.295,0.1798],[0.3091,0.1528],[0.3208,0.1248],[0.33,0.0958],[0.3367,0.0656],[0.3368,0.0617],[0.3369,0.0573],[0.3371,0.0524],[0.3374,0.0469],[0.3377,0.041],[0.3381,0.0346],[0.3386,0.0277],[0.3392,0.0202],[0.3359,-0.0188],[0.3335,-0.0556],[0.3319,-0.0901],[0.3312,-0.1224],[0.3313,-0.1524],[0.3323,-0.1801],[0.3341,-0.2056],[0.3367,-0.2288],[0.3367,-0.2313],[0.3361,-0.2455],[0.3354,-0.2592],[0.3346,-0.2725],[0.3337,-0.2853],[0.3327,-0.2976],[0.3317,-0.3095],[0.3306,-0.3209],[0.3294,-0.3319],[0.3281,-0.3428],[0.3268,-0.3528],[0.3254,-0.362],[0.3239,-0.3702],[0.3223,-0.3776],[0.3206,-0.3841],[0.3189,-0.3897],[0.3171,-0.3945],[0.3143,-0.4007],[0.3106,-0.4073],[0.3061,-0.4141],[0.3009,-0.4212],[0.2948,-0.4285],[0.2879,-0.4361],[0.2802,-0.444],[0.2717,-0.4521],[0.2625,-0.4606],[0.2537,-0.4682],[0.2454,-0.4749],[0.2377,-0.4807],[0.2304,-0.4856],[0.2236,-0.4896],[0.2174,-0.4928],[0.2116,-0.4951],[0.2116,-0.5],[0.2224,-0.4988],[0.2333,-0.4975],[0.2443,-0.4963],[0.2555,-0.4951],[0.2667,-0.4939],[0.2781,-0.4926],[0.2896,-0.4914],[0.3012,-0.4902],[0.3247,-0.4865],[0.3462,-0.4827],[0.3656,-0.479],[0.3831,-0.4752],[0.3985,-0.4713],[0.4118,-0.4674],[0.4231,-0.4635],[0.4324,-0.4595],[0.4392,-0.4559],[0.4452,-0.4525],[0.4505,-0.4492],[0.4551,-0.446],[0.4591,-0.443],[0.4624,-0.4402],[0.4649,-0.4375],[0.4668,-0.435],[0.4691,-0.4312],[0.471,-0.4271],[0.4726,-0.4227],[0.4739,-0.4181],[0.4748,-0.4132],[0.4753,-0.4081],[0.4755,-0.4026],[0.4754,-0.3969],[0.4747,-0.3944],[0.4738,-0.3904],[0.4727,-0.385],[0.4714,-0.3782],[0.4699,-0.37],[0.4683,-0.3604],[0.4664,-0.3493],[0.4644,-0.3368],[0.4625,-0.3229],[0.4607,-0.3087],[0.4588,-0.2942],[0.457,-0.2794],[0.4551,-0.2644],[0.4533,-0.2492],[0.4515,-0.2336],[0.4496,-0.2178],[0.446,-0.184],[0.4424,-0.1509],[0.4389,-0.1184],[0.4355,-0.0865],[0.4322,-0.0552],[0.4289,-0.0245],[0.4257,0.0055],[0.4226,0.035],[0.422,0.0407],[0.4215,0.0456],[0.421,0.0498],[0.4205,0.0531],[0.42,0.0556],[0.4196,0.0573],[0.4193,0.0582],[0.419,0.0583],[0.411,0.1067],[0.4013,0.1512],[0.3898,0.1918],[0.3766,0.2285],[0.3616,0.2614],[0.3449,0.2904],[0.3264,0.3155],[0.3061,0.3368],[0.2875,0.3537],[0.2681,0.3695],[0.2478,0.3841],[0.2266,0.3975],[0.2046,0.4099],[0.1816,0.421],[0.1578,0.431],[0.1331,0.4399],[0.1295,0.4405],[0.125,0.4413],[0.1195,0.4421],[0.1131,0.4429],[0.1057,0.4439],[0.0974,0.4449],[0.0881,0.4461],[0.0778,0.4472],[0.0778,0.4473],[0.0777,0.4474],[0.0775,0.4476],[0.0772,0.4479],[0.0769,0.4482],[0.0765,0.4486],[0.076,0.4491],[0.0754,0.4497],[0.0748,0.4497],[0.0742,0.4497],[0.0736,0.4497],[0.0729,0.4497],[0.0723,0.4497],[0.0717,0.4497],[0.0711,0.4497],[0.0705,0.4497],[0.0696,0.4497],[0.0683,0.4497],[0.0664,0.4497],[0.064,0.4497],[0.0612,0.4497],[0.0578,0.4497],[0.054,0.4497],[0.0496,0.4497],[0.0254,0.4515],[-0.0007,0.4533],[-0.0286,0.455],[-0.0583,0.4567],[-0.0899,0.4584],[-0.1234,0.46],[-0.1587,0.4616],[-0.1958,0.4632],[-0.2106,0.4632],[-0.2251,0.4633],[-0.2391,0.4635],[-0.2528,0.4638],[-0.2661,0.4641],[-0.2791,0.4646],[-0.2916,0.4651],[-0.3037,0.4656],[-0.314,0.4656],[-0.3233,0.4655],[-0.3316,0.4653],[-0.339,0.465],[-0.3454,0.4647],[-0.3509,0.4643],[-0.3554,0.4638],[-0.359,0.4632],[-0.3728,0.4627],[-0.3866,0.4637],[-0.4005,0.4661],[-0.4145,0.4699],[-0.4285,0.4753],[-0.4425,0.4821],[-0.4565,0.4903],[-0.4706,0.5],[-0.4706,0.4975]]];

// סדר החפצים זהה לסדר הפרויקטים בעמוד
const RELICS = [
  { id: 'gotovski', file: '3d/nozzle' + EXT, label: T('אקדח תדלוק', 'fuel nozzle') },
  { id: 'ams', file: '3d/glove' + EXT, label: T('כפפת אגרוף', 'boxing glove') },
  { id: 'allenbis', file: '3d/bag' + EXT, label: T('שקית חטיפים', 'snack bag') },
  { id: 'clinic', file: '3d/bottle' + EXT, label: T('בקבוקון סרום', 'serum bottle'), glass: '#f3c9c3' },
  { id: 'falafel', file: '3d/pita' + EXT, label: T('פיתה פלאפל', 'falafel pita') },
  { id: 'rachel', file: '3d/pi' + EXT, label: 'π' }
];

function supported() {
  if (!root.classList.contains('motion') || !hero) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

if (supported()) start();

function start() {
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'stage';
  canvas.setAttribute('aria-hidden', 'true');
  pin.prepend(canvas);
  const caseEl = document.querySelector('.case');
  const flash = pin.querySelector('.hero-flash');
  const heroUi = pin.querySelector('.hero-ui');
  const label = document.createElement('div');
  label.className = 'relic-label mono';
  label.setAttribute('aria-hidden', 'true');
  pin.appendChild(label);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }
  // מתחילים ברזולוציה מתונה; עולים רק אם המכשיר עומד בזה, ויורדים אם לא
  const maxDpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
  let dpr = Math.min(maxDpr, 1);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // סביבת הסטודיו (נוצרה ב-Higgsfield) נותנת לכרום ולזכוכית השתקפויות אמיתיות
  const pmrem = new THREE.PMREMGenerator(renderer);
  new THREE.TextureLoader().load('3d/studio.jpg', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
  });
  scene.environmentIntensity = 1.15;
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xff4f1a, 18, 14, 1.6);
  rim.position.set(3.5, -1.5, -2.5);
  scene.add(rim);

  /* ---------- הטקסט מאחורי הזכוכית ---------- */
  const typeCanvas = document.createElement('canvas');
  const typeTex = new THREE.CanvasTexture(typeCanvas);
  typeTex.colorSpace = THREE.SRGBColorSpace;
  const typePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: typeTex, toneMapped: false })
  );
  const PLANE_Z = -2.6;
  typePlane.position.z = PLANE_Z;
  scene.add(typePlane);

  function drawType(w, h) {
    const r = Math.min(window.devicePixelRatio || 1, 2);
    typeCanvas.width = Math.round(w * r);
    typeCanvas.height = Math.round(h * r);
    const ctx = typeCanvas.getContext('2d');
    ctx.scale(r, r);
    // רקע אטום: הזכוכית שוברת רק מה שאטום, אז הטקסט והרקע הם משטח אחד
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, w, h);
    // הילה חמה מאחורי האות: לזכוכית יש אור לשבור
    const gx = w * 0.5, gy = h * (w < 700 ? 0.38 : 0.45), gr = Math.max(w, h) * 0.42;
    let g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, 'rgba(255,79,26,.22)');
    g.addColorStop(0.45, 'rgba(255,79,26,.06)');
    g.addColorStop(1, 'rgba(255,79,26,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    g = ctx.createRadialGradient(gx * 0.8, gy * 0.6, 0, gx * 0.8, gy * 0.6, gr * 0.6);
    g.addColorStop(0, 'rgba(237,232,222,.10)');
    g.addColorStop(1, 'rgba(237,232,222,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // רשת שרטוט עדינה: האתר "בשלבי בנייה"
    ctx.strokeStyle = 'rgba(61,123,255,.09)';
    ctx.lineWidth = 1;
    const step = w < 700 ? 48 : 80;
    for (let x = w % step / 2; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = h % step / 2; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const hr = pin.getBoundingClientRect();
    ctx.fillStyle = '#ede8de';
    ctx.textBaseline = 'middle';
    document.querySelectorAll('.hero-title span').forEach((s) => {
      const rr = s.getBoundingClientRect(), cs = getComputedStyle(s);
      // the canvas copy follows the span: its font, and its reading direction (rtl anchors right, ltr anchors left)
      const ltr = cs.direction === 'ltr';
      ctx.direction = ltr ? 'ltr' : 'rtl';
      ctx.textAlign = ltr ? 'left' : 'right';
      // Hebrew keeps the regular cut it always drew with; English draws the span's real weight so the widths match
      ctx.font = (ltr ? cs.fontWeight + ' ' : '') + cs.fontSize + ' ' + cs.fontFamily;
      if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      ctx.fillText(s.textContent.trim(), (ltr ? rr.left : rr.right) - hr.left, rr.top - hr.top + rr.height * 0.5);
    });
    typeTex.needsUpdate = true;
    const ph = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - PLANE_Z);
    typePlane.scale.set(ph * camera.aspect, ph, 1);
  }

  /* ---------- האות ח מזכוכית ---------- */
  const shapes = HET.map((c) => new THREE.Shape(c.map((p) => new THREE.Vector2(p[0], p[1]))));
  const hetGeo = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.26, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.014, bevelSegments: 8
  });
  hetGeo.center();
  hetGeo.computeVertexNormals();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.7, ior: 1.52,
    dispersion: 7, iridescence: 0.25, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400],
    clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1,
    attenuationColor: new THREE.Color('#fff1e8'), attenuationDistance: 9
  });
  const lite = new THREE.MeshPhysicalMaterial({
    color: 0x1a1412, metalness: 0.15, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03,
    iridescence: 0.5, iridescenceIOR: 1.3, transparent: true, opacity: 0.78, envMapIntensity: 1.6
  });
  const het = new THREE.Mesh(hetGeo, glass);
  const hetEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hetGeo, 28),
    new THREE.LineBasicMaterial({ color: 0x3d7bff, transparent: true, opacity: 0, depthTest: false })
  );
  het.add(hetEdges);

  const world = new THREE.Group();
  scene.add(world);
  const hetPivot = new THREE.Group();
  hetPivot.add(het);
  world.add(hetPivot);

  /* ---------- אבק באוויר, לעומק ---------- */
  const dustN = mobile ? 220 : 520;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 12;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 0.5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xede8de, size: 0.018, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(dust);

  /* ---------- החפצים ---------- */
  const orbit = new THREE.Group();
  world.add(orbit);
  const relics = [];
  const hits = [];
  const glassMeshes = [];
  const hitGeo = new THREE.SphereGeometry(0.6, 12, 8);
  const hitMat = new THREE.MeshBasicMaterial();
  const wire = new THREE.MeshBasicMaterial({ color: 0x3d7bff, wireframe: true, transparent: true, opacity: 0.55 });
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  // בטלפון החפצים נטענים אחרי הפתיחה, כדי שהיא תקבל את כל רוחב הפס. הם ממילא צומחים פנימה כשהם מוכנים
  const deferRelics = window.innerWidth < 700 && !(window.HG && window.HG.introDone);
  const later = [];
  const loadRelic = deferRelics ? (fn) => later.push(fn) : (fn) => fn();
  if (deferRelics) {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    const flush = () => idle(() => later.splice(0).forEach((fn) => fn()), { timeout: 1200 });
    window.addEventListener('hg:intro', flush, { once: true });
    setTimeout(flush, 6000); // רשת ביטחון אם הפתיחה לא הגיעה
  }

  RELICS.forEach((r, i) => {
    const pivot = new THREE.Group();
    pivot.userData = { i, id: r.id, hover: 0, scale: 0 };
    orbit.add(pivot);
    relics.push(pivot);
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.visible = false;
    hit.userData.relic = pivot;
    pivot.add(hit);
    hits.push(hit);
    loadRelic(() => loader.load(r.file, (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      obj.position.sub(c);
      const holder = new THREE.Group();
      holder.add(obj);
      holder.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
      obj.traverse((m) => {
        if (!m.isMesh) return;
        m.userData.relic = pivot;
        if (r.glass) {
          m.userData.lite = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(r.glass), roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1, iridescence: 0.4
          });
          glassMeshes.push(m);
          m.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(r.glass), transmission: 1, thickness: 0.6, roughness: 0.08, ior: 1.45,
            iridescence: 0.3, clearcoat: 1, attenuationColor: new THREE.Color(r.glass), attenuationDistance: 0.8
          });
        } else if (m.material) {
          m.material.envMapIntensity = 1.2;
        }
        m.userData.mat = m.material;
      });
      pivot.add(holder);
      pivot.userData.ready = true;
      applyXray();
    }));
  });

  /* ---------- מצב ---------- */
  const S = {
    w: 1, h: 1, mx: 0, my: 0, tx: 0, ty: 0, px: -1, py: -1,
    appear: 0, prog: 0, xray: false, hover: null, visible: true, running: false,
    R: 3.1, Rz: 1.7, relicSize: 0.95, hetScale: 2.9, hetX: 0, hetY: 0.15, speed: 1
  };

  function layout() {
    S.laid = true;
    const r = pin.getBoundingClientRect();
    S.w = r.width; S.h = r.height;
    renderer.setSize(S.w, S.h, false);
    camera.aspect = S.w / S.h;
    camera.updateProjectionMatrix();
    const narrow = S.w < 700;
    S.hetScale = narrow ? 2.1 : Math.min(3.1, 2.4 + (S.w / S.h - 1) * 0.8);
    S.R = narrow ? 1.35 : Math.min(3.6, 2.4 * camera.aspect);
    S.Rz = narrow ? 1.1 : 1.7;
    S.relicSize = narrow ? 0.46 : 0.88; // החפצים ממסגרים את השם, ה-ח והדמות, לא מתחרים בהם
    S.hetY = narrow ? -0.05 : 0.15;
    drawType(S.w, S.h);
  }

  /* ---------- קלט ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    S.tx = (e.clientX / window.innerWidth) * 2 - 1;
    S.ty = (e.clientY / window.innerHeight) * 2 - 1;
    const r = pin.getBoundingClientRect();
    S.px = e.clientX - r.left; S.py = e.clientY - r.top;
    S.inside = S.py >= 0 && S.py <= r.height && !(S.prog > 0.12);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { S.inside = false; });

  function pick() {
    if (!S.inside || S.px < 0) return null;
    ndc.set((S.px / S.w) * 2 - 1, -(S.py / S.h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const found = ray.intersectObjects(hits, false);
    return found.length ? found[0].object.userData.relic : null;
  }

  hero.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    const p = S.hover || (e.pointerType !== 'mouse' ? pickAt(e) : null);
    if (!p) return;
    const li = document.querySelector('.project[data-id="' + p.userData.id + '"]');
    if (window.HG && window.HG.sfx) window.HG.sfx.whoosh();
    if (window.HG && li) window.HG.openCase(p.userData.id, li);
  });
  function pickAt(e) {
    const r = pin.getBoundingClientRect();
    S.px = e.clientX - r.left; S.py = e.clientY - r.top; S.inside = true;
    return pick();
  }

  function setHover(p) {
    if (p === S.hover) return;
    S.hover = p;
    hero.classList.toggle('relic-hover', !!p);
    if (p) {
      const li = document.querySelector('.project[data-id="' + p.userData.id + '"]');
      const num = String(p.userData.i + 1).padStart(2, '0');
      const name = li ? li.querySelector('.p-name').textContent : '';
      label.innerHTML = name + '<span>' + (fine ? T('לחצו לסיפור המלא', 'Click for the full story') : T('הקישו לסיפור המלא', 'Tap for the full story')) + '</span>';
      if (window.HG && window.HG.sfx) window.HG.sfx.ting(p.userData.i);
    }
  }

  function applyXray() {
    const on = root.classList.contains('xray');
    S.xray = on;
    relics.forEach((p) => p.traverse((m) => { if (m.isMesh && m.userData.mat) m.material = on ? wire : m.userData.mat; }));
  }
  new MutationObserver(applyXray).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ---------- כניסה אחרי הפתיח ---------- */
  function appear() {
    const g = window.gsap;
    if (g) g.to(S, { appear: 1, duration: 2.6, ease: 'expo.out' });
    else S.appear = 1;
  }
  if (window.HG && window.HG.introDone) appear();
  else window.addEventListener('hg:intro', appear, { once: true });

  // מצב קל: בלי transmission בכלל, כך שהסצנה מצוירת פעם אחת לכל פריים
  function goLite() {
    het.material = lite;
    glassMeshes.forEach((m) => { m.userData.mat = m.userData.lite; if (!S.xray) m.material = m.userData.lite; });
  }
  /* ---------- לולאה ---------- */
  const clock = new THREE.Clock();
  let t = 0, frames = 0, slow = 0, span = 0, first = true;
  const lerp = THREE.MathUtils.lerp;

  function frame() {
    if (!S.running) return;
    requestAnimationFrame(frame);
    if (!S.laid) return;
    if (caseEl && !caseEl.hidden) { clock.getDelta(); return; }
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    t += dt;

    // איכות מסתגלת: אם הפריימים איטיים, מורידים רזולוציה פעם אחת
    // מדרגות איכות: רזולוציה ← זכוכית קלה ← 30 פריימים בשנייה. ומכשיר מהיר עולה ברזולוציה
    frames++;
    if (raw > 0.022) slow++;
    span += raw;
    if (span >= 1.2 && frames >= 4) {
      if (slow / frames > 0.4) {
        if (dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); layout(); }
        else if (het.material === glass) { goLite(); }
        else S.half = true;
      } else if (slow / frames < 0.05 && dpr < maxDpr && het.material === glass && !S.half) {
        dpr = Math.min(maxDpr, dpr + 0.25); renderer.setPixelRatio(dpr); layout();
      }
      frames = 0; slow = 0; span = 0;
    }
    if (S.half && (S.odd = !S.odd)) return;

    // התקדמות הצלילה: 0 בראש העמוד, 1 כשהקטע הנצמד נגמר
    const hr = hero.getBoundingClientRect();
    const travel = Math.max(1, hr.height - window.innerHeight);
    S.prog = Math.min(1, Math.max(0, -hr.top / travel));
    const dive = S.prog < 0.12 ? 0 : Math.pow((S.prog - 0.12) / 0.88, 1.6);
    camera.position.z = 10 - dive * 11.2;
    camera.position.y = lerp(0, S.hetY * 0.9, Math.min(1, dive * 1.4));
    camera.lookAt(0, camera.position.y, -4);
    renderer.toneMappingExposure = 1.05 + Math.max(0, dive - 0.6) * 2.2;
    if (flash) flash.style.opacity = Math.max(0, (S.prog - 0.86) / 0.14).toFixed(3);
    if (heroUi) heroUi.style.opacity = Math.max(0, 1 - S.prog * 7).toFixed(3);
    const k = 1 - Math.exp(-dt * 3);
    S.mx = lerp(S.mx, S.tx, k);
    S.my = lerp(S.my, S.ty, k);

    const a = S.appear;
    const ease = 1 - Math.pow(1 - a, 3);
    world.rotation.y = S.mx * 0.32;
    world.rotation.x = S.my * 0.16 * (1 - dive);

    // האות: נכנסת בסיבוב, מתנדנדת לאט, ובגלילה מתפרקת לשרטוט
    const hs = S.hetScale * (0.55 + 0.45 * ease);
    hetPivot.scale.setScalar(hs);
    hetPivot.position.set(S.hetX, S.hetY, 0);
    het.rotation.y = ((1 - ease) * -Math.PI * 1.2 + Math.sin(t * 0.35) * 0.38 + S.mx * 0.25) * (1 - dive);
    het.rotation.x = Math.sin(t * 0.27) * 0.08 - S.my * 0.12;
    hetEdges.material.opacity = S.xray ? 0.95 : Math.min(0.85, dive * 1.4);

    // החפצים: מסלול נטוי סביב האות. מתקרבים מרחוק בכניסה, ומתרחקים בגלילה
    const hovered = pick();
    setHover(hovered);
    S.speed = lerp(S.speed, hovered ? 0.12 : 1, 1 - Math.exp(-dt * 4));
    orbit.userData.a = (orbit.userData.a || 0) + dt * 0.16 * S.speed;
    const spread = (1 + (1 - ease) * 2.2) * (1 + dive * 2.6);
    relics.forEach((p, i) => {
      const th = orbit.userData.a + (i / relics.length) * Math.PI * 2;
      p.position.set(
        Math.cos(th) * S.R * spread,
        Math.sin(th) * 0.62 + Math.sin(t * 0.8 + i) * 0.08 + S.hetY * 0.5,
        Math.sin(th) * S.Rz * spread
      );
      const target = p === hovered ? 1.4 : (hovered ? 0.82 : 1);
      p.userData.hover = lerp(p.userData.hover, target, 1 - Math.exp(-dt * 7));
      p.userData.scale = lerp(p.userData.scale, p.userData.ready ? 1 : 0, 1 - Math.exp(-dt * 3.5));
      p.scale.setScalar(S.relicSize * p.userData.hover * p.userData.scale * ease);
      p.rotation.y += dt * (p === hovered ? 1.4 : 0.45);
      p.rotation.x = Math.sin(t * 0.5 + i * 1.7) * 0.25;
    });

    dust.rotation.y = t * 0.012;
    dust.position.y = Math.sin(t * 0.2) * 0.1;
    rim.intensity = 14 + Math.sin(t * 0.9) * 5;

    if (hovered && S.inside) {
      label.style.transform = 'translate(' + (S.px + 18) + 'px,' + (S.py + 18) + 'px)';
    }

    renderer.render(scene, camera);
    if (first) { first = false; root.classList.add('stage-on'); window.dispatchEvent(new Event('hg:stage')); }
  }

  function run(on) {
    if (on === S.running) return;
    S.running = on;
    if (on) { clock.getDelta(); requestAnimationFrame(frame); }
  }

  const io = new IntersectionObserver((en) => { S.visible = en[0].isIntersecting; run(S.visible && !document.hidden); });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => run(S.visible && !document.hidden));

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  ready.then(() => { layout(); run(true); });
}
