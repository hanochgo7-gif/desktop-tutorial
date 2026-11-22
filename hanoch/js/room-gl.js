/* חדר ההקרנה ב-WebGL (רמה 1). נטען מ-js/room.js רק במכשיר שעומד בזה, ורק כשהפתיחה על המסך.
   המצלמה, הקו והפרקים מנוהלים ב-room.js; כאן רק מציירים: אור גב כתום שעוקב אחרי המסך שבמרכז, מילוי קריר,
   רצפה מבריקה עם השתקפויות (עותק הפוך של המסכים, בלי מעבר ציור נוסף), ערפל שנמדד מהמסך שבמרכז.
   כ-30 קריאות ציור, בלי post-processing, יחס פיקסלים מוגבל, וציור רק כש-room.js מבקש. */
import * as THREE from './vendor/three-0.169.0/three.module.min.js';

export function create(room, geom, urls) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  room.insertBefore(canvas, room.querySelector('.rm-scrim'));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance', alpha: false, stencil: false });
  const cap = (navigator.hardwareConcurrency || 8) <= 6 ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });

  const ENV = new THREE.Color('#101915'), KEY = new THREE.Color('#ff6a2b');
  const scene = new THREE.Scene();
  scene.background = ENV;
  scene.fog = new THREE.Fog(ENV, 8, 30);
  const camera = new THREE.PerspectiveCamera(geom.FOV, geom.vw / geom.vh, 0.1, 140);

  scene.add(new THREE.HemisphereLight(0x9fb8ad, 0x070908, 0.42));
  const fill = new THREE.DirectionalLight(0x86a79a, 0.35); scene.add(fill);
  const spot = new THREE.SpotLight(KEY, 700, 0, 0.62, 0.9, 2); scene.add(spot, spot.target);
  const front = new THREE.PointLight(0xffa070, 16, 0, 2); scene.add(front);
  const lineLight = new THREE.PointLight(KEY, 0, 6, 2); scene.add(lineLight);
  const yoursLight = new THREE.PointLight(0xff7a3d, 0, 9, 2); scene.add(yoursLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 80), new THREE.MeshStandardMaterial({ color: 0x141a17, roughness: 0.24, metalness: 0.25, transparent: true, opacity: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 2; scene.add(floor);
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { uEnv: { value: ENV }, uKey: { value: KEY }, uFocus: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uEnv; uniform vec3 uKey; uniform vec2 uFocus; varying vec3 vW;
      void main(){ vec2 d = (vW.xy - uFocus) / vec2(9.0, 4.2); float spill = exp(-dot(d, d)) * 0.045;
        gl_FragColor = vec4(uEnv * (1.08 - 0.22 * smoothstep(1.0, 9.0, vW.y)) + uKey * spill, 1.0);
        #include <colorspace_fragment>
      }`, depthWrite: false });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(240, 40), wallMat); scene.add(wall);

  const VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vView;
    #include <fog_pars_vertex>
    void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vView = -mvPosition.xyz; vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const FS = `uniform sampler2D map; uniform sampler2D mapOld; uniform vec4 uCov; uniform vec4 uCovOld; uniform float uMode; uniform float uSweep; uniform float uReset; uniform float uLine;
    uniform float uReflect; uniform float uDim; uniform vec3 uKey; uniform vec3 uEnv; uniform vec2 uGrid;
    varying vec2 vUv; varying vec3 vN; varying vec3 vView;
    #include <fog_pars_fragment>
    void main(){
      vec2 uv = vUv; vec3 col; float edge = 1.0 - uSweep;
      if (uMode < 0.5) { col = texture2D(map, uv * uCov.xy + uCov.zw).rgb; }
      else if (uMode < 1.5) {
        vec3 nw = texture2D(map, uv * uCov.xy + uCov.zw).rgb, od = texture2D(mapOld, uv * uCovOld.xy + uCovOld.zw).rgb;
        float m = smoothstep(edge - 0.003, edge + 0.003, uv.y);
        col = mix(mix(od, nw, m), od, uReset);
        float dd = uv.y - edge;
        col += uKey * uLine * (0.9 * exp(-abs(dd) * 120.0) + 0.2 * exp(-abs(dd) * 12.0));
      } else {
        vec2 g = abs(fract(uv * uGrid) - 0.5) * 2.0; float ln = 1.0 - smoothstep(0.93, 0.985, max(g.x, g.y));
        vec3 base = mix(vec3(0.008, 0.01, 0.009), vec3(0.05, 0.022, 0.012), uv.y);
        float m = smoothstep(edge - 0.003, edge + 0.003, uv.y);
        col = base + vec3(0.22, 0.12, 0.07) * (1.0 - ln) * m * 0.55;
        float dd = uv.y - edge;
        col += uKey * uLine * (0.9 * exp(-abs(dd) * 120.0) + 0.2 * exp(-abs(dd) * 12.0));
      }
      col *= uDim;
      float ndv = clamp(abs(dot(normalize(vN), normalize(vView))), 0.0, 1.0);
      col += uKey * pow(1.0 - ndv, 4.0) * 0.32;
      vec2 q = min(uv, 1.0 - uv); col *= 0.86 + 0.14 * smoothstep(0.0, 0.035, min(q.x, q.y * 1.4));
      if (uReflect > 0.5) { float f = 1.0 - smoothstep(0.0, 0.6, uv.y); col = mix(uEnv, col * 0.62, f * f); }
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`;
  const dark = new THREE.DataTexture(new Uint8Array([10, 14, 12, 255]), 1, 1); dark.needsUpdate = true;
  const mat = (mode, reflect) => new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      map: { value: dark }, mapOld: { value: dark }, uCov: { value: new THREE.Vector4(1, 1, 0, 0) }, uCovOld: { value: new THREE.Vector4(1, 1, 0, 0) },
      uMode: { value: mode }, uSweep: { value: 0 }, uReset: { value: 0 }, uLine: { value: 0 }, uReflect: { value: reflect ? 1 : 0 }, uDim: { value: 0 },
      uKey: { value: KEY }, uEnv: { value: ENV }, uGrid: { value: new THREE.Vector2(12, 8) } }]),
    vertexShader: VS, fragmentShader: FS, fog: true, side: reflect ? THREE.DoubleSide : THREE.FrontSide });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1b211e, metalness: 0.8, roughness: 0.3 });
  const frameMatR = frameMat.clone(); frameMatR.side = THREE.DoubleSide; frameMatR.color.set(0x111613);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x46504b, transparent: true, opacity: 0.7 });
  const plane = new THREE.PlaneGeometry(1, 1), box = new THREE.BoxGeometry(1, 1, 1);
  const N = 6, S = [];
  for (let i = 0; i < N; i++) {
    const mode = i === 0 ? 1 : i === 5 ? 2 : 0;
    const g = new THREE.Group(), r = new THREE.Group(), m = mat(mode, false), mr = mat(mode, true);
    const s = new THREE.Mesh(plane, m), sr = new THREE.Mesh(plane, mr), f = new THREE.Mesh(box, frameMat), fr = new THREE.Mesh(box, frameMatR);
    g.add(f, s); r.add(fr, sr); r.scale.y = -1; scene.add(g, r);
    S.push({ g, r, s, sr, f, fr, m, mr, wire: null, fade: 0, t0: 0 });
  }
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0, fog: false });
  const haloMat = new THREE.ShaderMaterial({ uniforms: { uO: { value: 0 }, uKey: { value: KEY } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uO; uniform vec3 uKey; varying vec2 vUv; void main(){ float y = (vUv.y - .5) * 2.; float x = abs(vUv.x - .5) * 2.; float a = exp(-y*y*9.) * (1. - smoothstep(.72, 1., x)) * uO * .5; gl_FragColor = vec4(uKey * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const blade = new THREE.Mesh(plane, bladeMat), halo = new THREE.Mesh(plane, haloMat), bladeR = new THREE.Mesh(plane, bladeMat), haloR = new THREE.Mesh(plane, haloMat);
  const blade5 = new THREE.Mesh(plane, bladeMat.clone()), halo5 = new THREE.Mesh(plane, haloMat.clone());
  S[0].g.add(blade, halo); S[0].r.add(bladeR, haloR); S[5].g.add(blade5, halo5);

  let G = geom;
  function resize(g) {
    G = g;
    renderer.setSize(g.vw, g.vh, false);
    camera.aspect = g.vw / g.vh; camera.fov = g.FOV;
    for (let i = 0; i < N; i++) {
      const p = g.POS[i], s = S[i];
      s.g.position.set(p.x, p.y, p.z); s.g.rotation.y = g.YAW[i];
      s.r.position.set(p.x, -p.y, p.z); s.r.rotation.y = g.YAW[i];
      s.s.scale.set(g.W, g.H, 1); s.sr.scale.set(g.W, g.H, 1);
      s.f.scale.set(g.W + 0.1, g.H + 0.1, 0.07); s.f.position.z = -0.037; s.fr.scale.copy(s.f.scale); s.fr.position.z = -0.037;
      if (s.wire) { s.g.remove(s.wire); s.wire.geometry.dispose(); }
      const wg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-g.W * .36, g.H / 2 + .05, -.03), new THREE.Vector3(-g.W * .36, 30, -.03),
        new THREE.Vector3(g.W * .36, g.H / 2 + .05, -.03), new THREE.Vector3(g.W * .36, 30, -.03)]);
      s.wire = new THREE.LineSegments(wg, wireMat); s.g.add(s.wire);
      s.m.uniforms.uGrid.value.set(g.portrait ? 6 : 12, g.portrait ? 13 : 8);
    }
    [blade, bladeR, blade5].forEach((b) => { b.scale.set(g.W + .34, .016, 1); b.position.z = .03; });
    [halo, haloR, halo5].forEach((h) => { h.scale.set(g.W + 1.1, .5, 1); h.position.z = .03; });
    floor.position.set(g.POS[2].x, 0, 0); wall.position.set(g.POS[2].x, 12, -9);
    if (orient !== g.portrait) { orient = g.portrait; loadAll(); } else covers();
  }

  /* textures: the same webp captures the CSS room already loaded (from the browser cache) */
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  let orient = null, tex = [];
  const get = (u) => new Promise((res) => u ? loader.load(u, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; res(t); }, undefined, () => res(null)) : res(null));
  function cover(t, sa, top) {
    if (!t || !t.image) return new THREE.Vector4(1, 1, 0, 0);
    const ta = t.image.width / t.image.height; let sx = 1, sy = 1;
    if (ta > sa) sx = sa / ta; else sy = ta / sa;
    return new THREE.Vector4(sx, sy, (1 - sx) / 2, top ? 1 - sy : (1 - sy) / 2);
  }
  function covers() {
    const sa = G.W / G.H;
    tex.forEach((pair, i) => {
      if (!pair) return;
      [S[i].m, S[i].mr].forEach((m) => {
        if (pair[0]) { m.uniforms.map.value = pair[0]; m.uniforms.uCov.value = cover(pair[0], sa, false); }
        if (pair[1]) { m.uniforms.mapOld.value = pair[1]; m.uniforms.uCovOld.value = cover(pair[1], sa, true); }
      });
    });
  }
  let first = null;
  function loadAll() {
    tex.forEach((p) => p && p.forEach((t) => t && t.dispose())); tex = [];
    const key = G.portrait ? 'p' : 'l';
    first = Promise.all(urls[0][key].map(get)).then((p) => { tex[0] = p; S[0].t0 = performance.now(); covers(); });
    first.then(() => Promise.all(urls.map((u, i) => i === 0 || !u ? null : Promise.all(u[key].map(get)))).then((all) => {
      all.forEach((p, i) => { if (i && p) { tex[i] = p; S[i].t0 = performance.now(); } });
      S[5].t0 = performance.now(); covers();
    }));
  }
  resize(geom);

  const tmp = new THREE.Vector3();
  function render(st) {
    if (lost) throw new Error('context lost');
    const c = st.cam;
    camera.position.set(c.p[0], c.p[1], c.p[2]); camera.lookAt(c.t[0], c.t[1], c.t[2]);
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -c.sx; camera.projectionMatrix.elements[9] = -c.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    scene.fog.near = c.d + 1.5; scene.fog.far = c.d + (G.portrait ? 24 : 26);
    spot.position.set(c.t[0] + 2.6, 6.0, c.t[2] - 4.2); spot.target.position.set(c.t[0] - 1.2, 0, c.t[2] + 3.2); spot.target.updateMatrixWorld();
    front.position.set(c.t[0] + 3, G.YC + 2.4, c.t[2] + 4.5); fill.position.set(c.t[0] - 6, 8, -4);
    wallMat.uniforms.uFocus.value.set(c.t[0] - 1.5, G.YC + .6);
    const now = performance.now();
    for (let i = 0; i < N; i++) {
      const v = S[i].t0 ? Math.min(1, (now - S[i].t0) / 700) : 0;
      S[i].m.uniforms.uDim.value = v * st.lit[i]; S[i].mr.uniforms.uDim.value = v * st.lit[i];
    }
    const sw = st.sweep;
    [S[0].m, S[0].mr].forEach((m) => { m.uniforms.uSweep.value = sw.s; m.uniforms.uReset.value = sw.reset; m.uniforms.uLine.value = sw.line; });
    const ly = G.H / 2 - sw.s * G.H;
    blade.position.y = halo.position.y = bladeR.position.y = haloR.position.y = ly;
    bladeMat.opacity = sw.line; haloMat.uniforms.uO.value = sw.line;
    scene.updateMatrixWorld();
    tmp.set(0, ly, .35).applyMatrix4(S[0].g.matrixWorld); lineLight.position.copy(tmp); lineLight.intensity = 7 * sw.line;
    S[5].m.uniforms.uSweep.value = st.yours; S[5].mr.uniforms.uSweep.value = st.yours; S[5].m.uniforms.uLine.value = st.yoursLine;
    blade5.position.y = halo5.position.y = G.H / 2 - st.yours * G.H;
    blade5.material.opacity = st.yoursLine; halo5.material.uniforms.uO.value = st.yoursLine;
    tmp.set(0, 0, 1.1).applyMatrix4(S[5].g.matrixWorld); yoursLight.position.copy(tmp); yoursLight.intensity = st.yoursLine > 0 || st.yours > 0 ? 9 : 0;
    renderer.render(scene, camera);
  }
  function dispose() {
    tex.forEach((p) => p && p.forEach((t) => t && t.dispose()));
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    renderer.dispose(); canvas.remove();
  }
  return first.then(() => ({ render, resize, dispose }));
}
