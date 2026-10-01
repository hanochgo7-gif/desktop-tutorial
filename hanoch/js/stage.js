/* הבמה: האות ח מזכוכית, ושישה חפצים של לקוחות שמקיפים אותה.
   Three.js כמודול מ-jsdelivr. בלי WebGL 2, או ב"הפחתת תנועה", הקובץ לא עושה כלום
   והפתיחה נשארת עם החלקיקים או עם הטקסט הרגיל. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const root = document.documentElement;
const hero = document.querySelector('.hero');
const HET = [[[0.2463,-0.5],[0.2443,-0.5],[0.2423,-0.5],[0.2403,-0.4999],[0.2383,-0.4999],[0.2363,-0.4998],[0.2343,-0.4997],[0.2323,-0.4996],[0.2303,-0.4995],[0.2283,-0.4993],[0.2263,-0.4992],[0.2243,-0.499],[0.2224,-0.4988],[0.2204,-0.4986],[0.2186,-0.4984],[0.2167,-0.4981],[0.2149,-0.4979],[0.2131,-0.4976],[0.2114,-0.4973],[0.2097,-0.497],[0.208,-0.4967],[0.208,-0.4834],[0.2102,-0.4797],[0.2122,-0.476],[0.2141,-0.4722],[0.2157,-0.4685],[0.2171,-0.4646],[0.2184,-0.4608],[0.2194,-0.4569],[0.2202,-0.453],[0.2209,-0.4491],[0.2213,-0.4451],[0.2216,-0.4407],[0.2219,-0.4356],[0.2221,-0.4298],[0.2224,-0.4233],[0.2225,-0.416],[0.2227,-0.408],[0.2228,-0.3992],[0.2229,-0.3897],[0.2229,-0.3795],[0.223,-0.3686],[0.223,-0.124],[0.2231,-0.1077],[0.2235,-0.092],[0.2242,-0.077],[0.2251,-0.0627],[0.2263,-0.0491],[0.2278,-0.0361],[0.2295,-0.0238],[0.2315,-0.0121],[0.2337,-0.0012],[0.2363,0.0092],[0.239,0.0189],[0.2417,0.0281],[0.2444,0.0368],[0.2472,0.045],[0.25,0.0526],[0.2528,0.0598],[0.2557,0.0664],[0.2586,0.0725],[0.2616,0.0781],[0.2646,0.0832],[0.2674,0.0878],[0.2701,0.0921],[0.2725,0.0959],[0.2747,0.0994],[0.2766,0.1025],[0.2783,0.1053],[0.2798,0.1076],[0.2811,0.1096],[0.2821,0.1111],[0.2829,0.1123],[0.2829,0.1156],[-0.2413,0.1156],[-0.2508,0.1159],[-0.2602,0.1168],[-0.2693,0.1182],[-0.2783,0.1202],[-0.287,0.1227],[-0.2956,0.1258],[-0.3039,0.1295],[-0.3121,0.1337],[-0.32,0.1386],[-0.3278,0.1439],[-0.3351,0.1502],[-0.3416,0.1577],[-0.3473,0.1664],[-0.3523,0.1764],[-0.3565,0.1876],[-0.3599,0.2],[-0.3626,0.2137],[-0.3645,0.2286],[-0.3657,0.2447],[-0.3661,0.2621],[-0.3659,0.2736],[-0.3656,0.2851],[-0.365,0.2963],[-0.3642,0.3075],[-0.3631,0.3184],[-0.3619,0.3293],[-0.3603,0.3399],[-0.3586,0.3504],[-0.3566,0.3608],[-0.3544,0.371],[-0.3521,0.381],[-0.3497,0.3907],[-0.3473,0.4001],[-0.345,0.4091],[-0.3426,0.4178],[-0.3401,0.4263],[-0.3377,0.4344],[-0.3352,0.4421],[-0.3328,0.4496],[-0.3303,0.4567],[-0.3279,0.4635],[-0.3257,0.4697],[-0.3236,0.4753],[-0.3218,0.4804],[-0.3201,0.485],[-0.3186,0.4891],[-0.3173,0.4926],[-0.3162,0.4956],[-0.3152,0.4981],[-0.3145,0.5],[-0.2829,0.5],[-0.2829,0.4817],[-0.2827,0.4749],[-0.2824,0.4686],[-0.2818,0.4628],[-0.281,0.4573],[-0.28,0.4524],[-0.2787,0.4479],[-0.2772,0.4438],[-0.2754,0.4402],[-0.2734,0.437],[-0.2712,0.4343],[-0.2687,0.4319],[-0.2658,0.4298],[-0.2624,0.4279],[-0.2587,0.4263],[-0.2546,0.4249],[-0.25,0.4238],[-0.2451,0.4229],[-0.2398,0.4223],[-0.2341,0.4219],[-0.228,0.4218],[0.3195,0.4218],[0.3283,0.4213],[0.3362,0.42],[0.3432,0.4178],[0.3493,0.4146],[0.3544,0.4106],[0.3586,0.4056],[0.3619,0.3998],[0.3642,0.393],[0.3656,0.3854],[0.3661,0.3769],[0.3661,0.1373],[0.3511,0.1173],[0.3472,0.1116],[0.3437,0.1052],[0.3405,0.098],[0.3376,0.09],[0.3351,0.0813],[0.3328,0.0719],[0.3309,0.0617],[0.3293,0.0507],[0.3279,0.0391],[0.327,0.0266],[0.3262,0.0136],[0.3257,0.0001],[0.3254,-0.0138],[0.3254,-0.0282],[0.3255,-0.0431],[0.3259,-0.0583],[0.3264,-0.0741],[0.3272,-0.0902],[0.3282,-0.1069],[0.3295,-0.124],[0.3461,-0.3453],[0.3471,-0.3608],[0.3474,-0.3755],[0.3471,-0.3894],[0.3461,-0.4024],[0.3444,-0.4145],[0.3421,-0.4258],[0.3391,-0.4363],[0.3354,-0.4459],[0.3311,-0.4547],[0.3261,-0.4626],[0.3205,-0.4697],[0.3144,-0.476],[0.3078,-0.4817],[0.3006,-0.4865],[0.2928,-0.4906],[0.2846,-0.494],[0.2758,-0.4966],[0.2665,-0.4985],[0.2566,-0.4996],[0.2463,-0.5]],[[-0.3012,-0.5],[-0.3032,-0.5],[-0.3051,-0.5],[-0.3071,-0.4999],[-0.309,-0.4999],[-0.3109,-0.4998],[-0.3128,-0.4997],[-0.3147,-0.4996],[-0.3166,-0.4995],[-0.3185,-0.4993],[-0.3203,-0.4992],[-0.3221,-0.499],[-0.3239,-0.4988],[-0.3257,-0.4986],[-0.3275,-0.4984],[-0.3292,-0.4981],[-0.331,-0.4979],[-0.3327,-0.4976],[-0.3344,-0.4973],[-0.3361,-0.497],[-0.3378,-0.4967],[-0.3378,-0.4834],[-0.3371,-0.4819],[-0.3363,-0.4804],[-0.3355,-0.4786],[-0.3346,-0.4767],[-0.3336,-0.4746],[-0.3326,-0.4724],[-0.3315,-0.47],[-0.3303,-0.4674],[-0.3291,-0.4646],[-0.3278,-0.4617],[-0.3265,-0.4584],[-0.3254,-0.4545],[-0.3244,-0.45],[-0.3235,-0.445],[-0.3228,-0.4393],[-0.3222,-0.433],[-0.3217,-0.4261],[-0.3214,-0.4186],[-0.3212,-0.4105],[-0.3211,-0.4018],[-0.3211,-0.124],[-0.3209,-0.1111],[-0.3203,-0.0986],[-0.3193,-0.0864],[-0.3178,-0.0744],[-0.3159,-0.0628],[-0.3136,-0.0515],[-0.3109,-0.0404],[-0.3078,-0.0297],[-0.3043,-0.0193],[-0.3003,-0.0092],[-0.2961,0.0006],[-0.2919,0.0101],[-0.2876,0.0192],[-0.2833,0.0279],[-0.2789,0.0362],[-0.2745,0.0442],[-0.27,0.0518],[-0.2655,0.059],[-0.2609,0.0659],[-0.2562,0.0724],[-0.2517,0.0785],[-0.2476,0.0842],[-0.2438,0.0894],[-0.2403,0.0942],[-0.2371,0.0986],[-0.2343,0.1025],[-0.2318,0.106],[-0.2296,0.1091],[-0.2278,0.1118],[-0.2263,0.114],[-0.2263,0.1522],[-0.1614,0.1522],[-0.1614,0.1156],[-0.1638,0.11],[-0.1665,0.1038],[-0.1694,0.097],[-0.1724,0.0897],[-0.1757,0.0817],[-0.1793,0.0732],[-0.183,0.0641],[-0.187,0.0544],[-0.1911,0.0441],[-0.1955,0.0333],[-0.1997,0.0217],[-0.2035,0.0092],[-0.2067,-0.0043],[-0.2094,-0.0186],[-0.2115,-0.0339],[-0.2132,-0.0501],[-0.2143,-0.0672],[-0.2149,-0.0852],[-0.215,-0.1041],[-0.2146,-0.124],[-0.2047,-0.3819],[-0.2043,-0.3929],[-0.2044,-0.4035],[-0.2051,-0.4135],[-0.2064,-0.423],[-0.2082,-0.432],[-0.2105,-0.4405],[-0.2135,-0.4484],[-0.2169,-0.4559],[-0.2209,-0.4628],[-0.2255,-0.4692],[-0.2306,-0.4751],[-0.2362,-0.4803],[-0.2424,-0.4849],[-0.2492,-0.4889],[-0.2564,-0.4923],[-0.2643,-0.4951],[-0.2727,-0.4972],[-0.2816,-0.4988],[-0.2911,-0.4997],[-0.3012,-0.5]]];

// סדר החפצים זהה לסדר הפרויקטים בעמוד
const RELICS = [
  { id: 'gotovski', file: '3d/nozzle.glb', label: 'אקדח תדלוק' },
  { id: 'ams', file: '3d/glove.glb', label: 'כפפת אגרוף' },
  { id: 'allenbis', file: '3d/bag.glb', label: 'שקית חטיפים' },
  { id: 'clinic', file: '3d/bottle.glb', label: 'בקבוקון סרום', glass: '#f3c9c3' },
  { id: 'falafel', file: '3d/pita.glb', label: 'פיתה פלאפל' },
  { id: 'rachel', file: '3d/pi.glb', label: 'π' }
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
  hero.prepend(canvas);
  const label = document.createElement('div');
  label.className = 'relic-label mono';
  label.setAttribute('aria-hidden', 'true');
  hero.appendChild(label);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }
  let dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
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
    const hr = hero.getBoundingClientRect();
    ctx.fillStyle = '#ede8de';
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    document.querySelectorAll('.hero-title span').forEach((s) => {
      const rr = s.getBoundingClientRect(), cs = getComputedStyle(s);
      ctx.font = '900 ' + cs.fontSize + ' "Frank Ruhl Libre", serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      ctx.fillText(s.textContent.trim(), rr.right - hr.left, rr.top - hr.top + rr.height * 0.5);
    });
    typeTex.needsUpdate = true;
    const ph = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - PLANE_Z);
    typePlane.scale.set(ph * camera.aspect, ph, 1);
  }

  /* ---------- האות ח מזכוכית ---------- */
  const shapes = HET.map((c) => new THREE.Shape(c.map((p) => new THREE.Vector2(p[0], p[1]))));
  const hetGeo = new THREE.ExtrudeGeometry(shapes, {
    depth: 0.3, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.035, bevelSegments: 10
  });
  hetGeo.center();
  hetGeo.computeVertexNormals();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.7, ior: 1.52,
    dispersion: 7, iridescence: 0.25, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400],
    clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1,
    attenuationColor: new THREE.Color('#fff1e8'), attenuationDistance: 9
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
  const wire = new THREE.MeshBasicMaterial({ color: 0x3d7bff, wireframe: true, transparent: true, opacity: 0.55 });
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  RELICS.forEach((r, i) => {
    const pivot = new THREE.Group();
    pivot.userData = { i, id: r.id, hover: 0, scale: 0 };
    orbit.add(pivot);
    relics.push(pivot);
    loader.load(r.file, (gltf) => {
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
    });
  });

  /* ---------- מצב ---------- */
  const S = {
    w: 1, h: 1, mx: 0, my: 0, tx: 0, ty: 0, px: -1, py: -1,
    appear: 0, prog: 0, xray: false, hover: null, visible: true, running: false,
    R: 3.1, Rz: 1.7, relicSize: 0.95, hetScale: 2.9, hetX: 0, hetY: 0.15, speed: 1
  };

  function layout() {
    S.laid = true;
    const r = hero.getBoundingClientRect();
    S.w = r.width; S.h = r.height;
    renderer.setSize(S.w, S.h, false);
    camera.aspect = S.w / S.h;
    camera.updateProjectionMatrix();
    const narrow = S.w < 700;
    S.hetScale = narrow ? 2.15 : Math.min(3.1, 2.4 + (S.w / S.h - 1) * 0.8);
    S.R = narrow ? 1.75 : Math.min(3.6, 2.4 * camera.aspect);
    S.Rz = narrow ? 1.1 : 1.7;
    S.relicSize = narrow ? 0.62 : 0.95;
    S.hetY = narrow ? 0.45 : 0.15;
    drawType(S.w, S.h);
  }

  /* ---------- קלט ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    S.tx = (e.clientX / window.innerWidth) * 2 - 1;
    S.ty = (e.clientY / window.innerHeight) * 2 - 1;
    const r = hero.getBoundingClientRect();
    S.px = e.clientX - r.left; S.py = e.clientY - r.top;
    S.inside = S.py >= 0 && S.py <= r.height;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { S.inside = false; });

  function pick() {
    if (!S.inside || S.px < 0) return null;
    ndc.set((S.px / S.w) * 2 - 1, -(S.py / S.h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(relics, true);
    for (const h of hits) if (h.object.userData.relic) return h.object.userData.relic;
    return null;
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
    const r = hero.getBoundingClientRect();
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
      label.innerHTML = '<b>' + num + '</b> ' + name + '<span>' + (fine ? 'לחצו לסיפור המלא' : 'הקישו לסיפור המלא') + '</span>';
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

  /* ---------- לולאה ---------- */
  const clock = new THREE.Clock();
  let t = 0, frames = 0, slow = 0, first = true;
  const lerp = THREE.MathUtils.lerp;

  function frame() {
    if (!S.running) return;
    requestAnimationFrame(frame);
    if (!S.laid) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    // איכות מסתגלת: אם הפריימים איטיים, מורידים רזולוציה פעם אחת
    if (frames < 120) {
      frames++;
      if (dt > 0.03) slow++;
      if (frames === 120 && slow > 50 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); layout(); }
    }

    const hr = hero.getBoundingClientRect();
    S.prog = Math.min(1, Math.max(0, -hr.top / hr.height));
    S.mx = lerp(S.mx, S.tx, 0.05);
    S.my = lerp(S.my, S.ty, 0.05);

    const a = S.appear;
    const ease = 1 - Math.pow(1 - a, 3);
    world.rotation.y = S.mx * 0.32;
    world.rotation.x = S.my * 0.16 + S.prog * 0.5;
    world.position.y = S.prog * 1.6;

    // האות: נכנסת בסיבוב, מתנדנדת לאט, ובגלילה מתפרקת לשרטוט
    const hs = S.hetScale * (0.55 + 0.45 * ease) * (1 - S.prog * 0.25);
    hetPivot.scale.setScalar(hs);
    hetPivot.position.set(S.hetX, S.hetY, 0);
    het.rotation.y = (1 - ease) * -Math.PI * 1.2 + Math.sin(t * 0.35) * 0.38 + S.mx * 0.25 + S.prog * 1.4;
    het.rotation.x = Math.sin(t * 0.27) * 0.08 - S.my * 0.12;
    hetEdges.material.opacity = S.xray ? 0.95 : Math.min(0.9, S.prog * 1.6);

    // החפצים: מסלול נטוי סביב האות. מתקרבים מרחוק בכניסה, ומתרחקים בגלילה
    const hovered = pick();
    setHover(hovered);
    S.speed = lerp(S.speed, hovered ? 0.12 : 1, 0.06);
    orbit.userData.a = (orbit.userData.a || 0) + dt * 0.16 * S.speed;
    const spread = (1 + (1 - ease) * 2.2) * (1 + S.prog * 0.9);
    relics.forEach((p, i) => {
      const th = orbit.userData.a + (i / relics.length) * Math.PI * 2;
      p.position.set(
        Math.cos(th) * S.R * spread,
        Math.sin(th) * 0.62 + Math.sin(t * 0.8 + i) * 0.08 + S.hetY * 0.5,
        Math.sin(th) * S.Rz * spread
      );
      const target = p === hovered ? 1.4 : (hovered ? 0.82 : 1);
      p.userData.hover = lerp(p.userData.hover, target, 0.1);
      p.userData.scale = lerp(p.userData.scale, p.userData.ready ? 1 : 0, 0.06);
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
    if (first) { first = false; root.classList.add('stage-on'); }
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
