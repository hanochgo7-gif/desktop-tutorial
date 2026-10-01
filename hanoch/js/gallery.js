/* חפצי הלקוחות בתוך הפרויקטים: כל פרויקט מקבל את החפץ שלו בתלת־ממד, שאפשר לסובב בגרירה.
   קנבס אחד קבוע מעל העמוד מצייר כל חפץ בתוך המשבצת שלו (scissor), כך שיש הקשר WebGL יחיד
   וכל מודל נטען פעם אחת. בלי WebGL 2 או ב"הפחתת תנועה" המשבצות לא מוצגות. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const root = document.documentElement;
const EXT = window.HG_MODEL_EXT || '.glb';
const FILES = {
  gotovski: { file: 'nozzle' },
  ams: { file: 'glove' },
  allenbis: { file: 'bag' },
  clinic: { file: 'bottle', glass: '#f3c9c3' },
  falafel: { file: 'pita' },
  rachel: { file: 'pi' }
};

function supported() {
  if (!root.classList.contains('motion')) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}
if (supported()) start();

function start() {
  const canvas = document.createElement('canvas');
  canvas.className = 'gallery';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setScissorTest(true);
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  root.classList.add('gallery-on');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.15, 3.4);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  new THREE.TextureLoader().load('3d/studio.jpg', (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
  });
  scene.environmentIntensity = 1.2;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0xff4f1a, 6, 8, 1.6);
  rim.position.set(1.8, -0.6, -1.6);
  scene.add(rim);

  /* ---------- מודלים ---------- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const models = {};
  const wire = new THREE.MeshBasicMaterial({ color: 0x3d7bff, wireframe: true, transparent: true, opacity: 0.6 });
  function load(id) {
    if (models[id]) return models[id];
    const holder = new THREE.Group();
    holder.visible = false;
    holder.userData.ready = false;
    scene.add(holder);
    models[id] = holder;
    const f = FILES[id];
    loader.load('3d/' + f.file + EXT, (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      obj.position.sub(box.getCenter(new THREE.Vector3()));
      const inner = new THREE.Group();
      inner.add(obj);
      inner.scale.setScalar(1.4 / Math.max(size.x, size.y, size.z));
      obj.traverse((m) => {
        if (!m.isMesh) return;
        if (f.glass) {
          // בלי transmission: במשבצות קטנות זכוכית שקופה למחצה נראית טוב ועולה פחות
          m.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(f.glass), roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82,
            clearcoat: 1, iridescence: 0.4, sheen: 0.4, sheenColor: new THREE.Color('#ffffff')
          });
        } else if (m.material) {
          m.material.envMapIntensity = 1.25;
        }
        m.userData.mat = m.material;
      });
      holder.add(inner);
      holder.userData.ready = true;
      xray();
    });
    return holder;
  }

  function xray() {
    const on = root.classList.contains('xray');
    Object.values(models).forEach((h) => h.traverse((m) => { if (m.isMesh && m.userData.mat) m.material = on ? wire : m.userData.mat; }));
  }
  new MutationObserver(xray).observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ---------- משבצות ---------- */
  const caseEl = document.querySelector('.case');
  const slots = [];
  function addSlot(el, getId) {
    const s = { el, getId, ry: Math.random() * Math.PI * 2, vy: 0.55, rx: -0.12, drag: null, hover: 0, near: false, pop: 0 };
    slots.push(s);
    el.addEventListener('pointerdown', (e) => {
      s.drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (!s.drag) return;
      const dx = e.clientX - s.drag.x, dy = e.clientY - s.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) s.drag.moved = true;
      const now = performance.now(), dt = Math.max(1, now - s.drag.t);
      s.ry += dx * 0.012;
      s.rx = THREE.MathUtils.clamp(s.rx + dy * 0.008, -0.9, 0.9);
      s.vy = (dx * 0.012) / (dt / 1000);
      s.drag.x = e.clientX; s.drag.y = e.clientY; s.drag.t = now;
    });
    const end = () => { s.drag = null; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerenter', () => { s.hoverTarget = 1; });
    el.addEventListener('pointerleave', () => { s.hoverTarget = 0; });
    // גרירה היא לא לחיצה: לא פותחים את הפרויקט בטעות
    el.addEventListener('click', (e) => { e.stopPropagation(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => {
        s.near = en[0].isIntersecting;
        if (s.near) { const id = getId(); if (id) load(id); }
      }, { rootMargin: '600px 0px' }).observe(el);
    } else s.near = true;
  }
  document.querySelectorAll('.p-relic').forEach((el) => addSlot(el, () => el.dataset.relic));
  const caseSlot = document.querySelector('.case-relic');
  if (caseSlot) addSlot(caseSlot, () => caseEl && caseEl.dataset.id);

  /* ---------- ציור ---------- */
  const clock = new THREE.Clock();
  let t = 0, drew = false;
  function size() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  size();
  window.addEventListener('resize', size);

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const vw = window.innerWidth, vh = window.innerHeight;
    const caseOpen = caseEl && !caseEl.hidden;
    root.classList.toggle('case-open', !!caseOpen);
    const active = slots.some((s) => s.near && ((s.el === caseSlot) === !!caseOpen));
    if (!active) {
      if (drew) { renderer.setScissor(0, 0, vw, vh); renderer.setViewport(0, 0, vw, vh); renderer.clear(); drew = false; }
      return;
    }
    drew = true;
    renderer.setScissor(0, 0, vw, vh);
    renderer.setViewport(0, 0, vw, vh);
    renderer.clear();

    for (const s of slots) {
      const inCase = s.el === caseSlot;
      if (caseOpen !== inCase || !s.near) continue;
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width < 4) continue;
      // השקיפות שהאנימציה של הכניסה נתנה למשבצת
      const st = s.el.style, pst = s.el.parentElement ? s.el.parentElement.style : {};
      if (st.visibility === 'hidden') continue;
      const op = Math.min(parseFloat(st.opacity || 1), parseFloat(pst.opacity || 1));
      if (op < 0.04) continue;
      const id = s.getId();
      if (!id) continue;
      const m = load(id);
      if (!m.userData.ready) continue;

      s.hover += ((s.hoverTarget || 0) - s.hover) * (1 - Math.exp(-dt * 6));
      if (!s.drag) {
        const base = 0.55 + s.hover * 1.4;
        s.vy += (base - s.vy) * (1 - Math.exp(-dt * 2.2));
        s.ry += s.vy * dt;
        s.rx += (-0.12 - s.rx) * (1 - Math.exp(-dt * 1.5));
      }
      s.pop += (1 - s.pop) * (1 - Math.exp(-dt * 3));

      m.visible = true;
      m.rotation.set(s.rx, s.ry, Math.sin(t * 0.8 + r.top * 0.01) * 0.05);
      m.position.y = Math.sin(t * 1.3 + r.left * 0.01) * 0.04;
      m.scale.setScalar((0.55 + 0.45 * Math.min(op, s.pop)) * (1 + s.hover * 0.08));

      const x = r.left, y = vh - r.bottom;
      renderer.setViewport(x, y, r.width, r.height);
      renderer.setScissor(x, y, r.width, r.height);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      m.visible = false;
    }
  }
  requestAnimationFrame(frame);
}
