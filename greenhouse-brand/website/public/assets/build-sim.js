/* MIFTAH: "How a net house is built". A scroll-driven 3D illustration (three.js r128, self-hosted).
   The page supplies the chapter cards; this script builds the scene and maps scroll progress P (0..N) onto it.
   Every steel part is galvanized silver. Sizes are illustrative, not a specification. */
(function () {
  "use strict";
  var root = document.getElementById("sim");
  if (!root) return;
  var cv = document.getElementById("sim-cv"), stage = document.getElementById("sim-stage"), track = document.getElementById("sim-track");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia && matchMedia("(max-width: 760px)").matches;
  var N = root.querySelectorAll(".sim-ch").length || 10;

  function fail() { root.classList.add("nogl"); }
  if (!window.WebGLRenderingContext) { fail(); return; }
  var started = false, EV = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"];
  function start() {  // three.js (600 KB) is fetched only now, so the page itself loads light
    if (started) return; started = true; EV.forEach(function (e) { window.removeEventListener(e, start, true); });
    if (window.THREE) { init(); return; }
    var sc = document.createElement("script"); sc.src = root.dataset.three; sc.onload = function () { if (window.THREE) init(); else fail(); }; sc.onerror = fail; document.head.appendChild(sc);
  }
  EV.forEach(function (e) { window.addEventListener(e, start, { passive: true, capture: true }); });
  if (window.scrollY > 0) start();

  function init() {
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !small, powerPreference: "high-performance" }); } catch (e) { fail(); return; }
  if (!renderer.getContext()) { fail(); return; }
  root.classList.add("gl");
  renderer.setPixelRatio(Math.min(small ? 1.5 : 2, window.devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, 1, .1, 2000);

  // ---------------------------------------------------------------- helpers
  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function sm(a, b, v) { var t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function backOut(t) { var s = 1.4; t = t - 1; return t * t * ((s + 1) * t + s) + 1; }
  function rnd(seed) { var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function lin(c) { return new THREE.Color(c).convertSRGBToLinear(); }
  function std(o) { var m = new THREE.MeshStandardMaterial(o); if (o.color !== undefined) m.color.convertSRGBToLinear(); if (o.emissive !== undefined) m.emissive.convertSRGBToLinear(); return m; }
  function canvasTex(w, h, draw, rep) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }
  function vis(o, v) { o.visible = v > .002; }

  // ---------------------------------------------------------------- sky
  var SKY = {
    day: [new THREE.Color(0x6FA3C8), new THREE.Color(0xDCE8EA)],
    storm: [new THREE.Color(0x3B474D), new THREE.Color(0x77858A)],
    winter: [new THREE.Color(0x8FA7B8), new THREE.Color(0xE4E9EC)],
    gold: [new THREE.Color(0x5D86B0), new THREE.Color(0xF2D6B0)]
  };
  var skyU = { top: { value: SKY.day[0].clone() }, hor: { value: SKY.day[1].clone() }, sunDir: { value: new THREE.Vector3(.5, .45, .35).normalize() }, sunAmt: { value: 1 } };
  var skyMat = new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform float sunAmt; varying vec3 vP;" +
      "void main(){ float h = max(vP.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.55));" +
      "float s = max(dot(vP, sunDir), 0.0); c += vec3(1.0,0.86,0.62) * (pow(s, 600.0) * 2.0 + pow(s, 8.0) * 0.18) * sunAmt;" +
      "if (vP.y < 0.0) c = hor * 0.92; gl_FragColor = vec4(c, 1.0); }"
  });
  var sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), skyMat);
  scene.add(sky);
  scene.fog = new THREE.Fog(SKY.day[1].getHex(), 170, 760);

  // environment map from a neutral sky, for believable galvanized metal
  (function () {
    var pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    var g = new THREE.SphereGeometry(10, 32, 16), col = [], p = g.attributes.position, c = new THREE.Color();
    for (var i = 0; i < p.count; i++) { var y = p.getY(i) / 10; c.set(y > 0 ? 0xCFE0EA : 0x8C8270).lerp(new THREE.Color(0xF4F6F4), y > 0 ? 1 - y : .2); if (y > .92) c.set(0xFFFFFF); c.convertSRGBToLinear(); col.push(c.r, c.g, c.b); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    scene.environment = pm.fromScene(es, .04).texture;
    pm.dispose();
  })();

  // ---------------------------------------------------------------- light
  var hemi = new THREE.HemisphereLight(lin(0xDCEBF2), lin(0x7A6A4E), .65); scene.add(hemi);
  var sun = new THREE.DirectionalLight(lin(0xFFF3E0), 2.6);
  sun.position.set(40, 42, 28); sun.castShadow = true;
  var SM = small ? 1024 : 2048; sun.shadow.mapSize.set(SM, SM);
  var sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 30; sc.bottom = -30; sc.near = 5; sc.far = 140;
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  scene.add(sun); scene.add(sun.target);

  // ---------------------------------------------------------------- site dimensions (illustrative)
  var NX = 8, NZ = 5, SX = 4.5, SZ = 6, H = 4.2;
  var LX = (NX - 1) * SX, LZ = (NZ - 1) * SZ, X0 = -LX / 2, Z0 = -LZ / 2;
  var ROADZ = Z0 + LZ + 11;

  // ---------------------------------------------------------------- land
  (function () {
    var S = 900, seg = small ? 90 : 140, g = new THREE.PlaneGeometry(S, S, seg, seg); g.rotateX(-Math.PI / 2);
    var p = g.attributes.position, col = [], c = new THREE.Color(), dry = new THREE.Color(0xB7AE7A), green = new THREE.Color(0x7E9A5A), dark = new THREE.Color(0x5E7A48);
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z * 1.2);
      var n = Math.sin(x * .021) + Math.sin(z * .027 + 1.3) * .8 + Math.sin((x + z) * .011 + 2) * 1.2 + Math.sin(x * .06 + z * .04) * .25;
      var ramp = sm(70, 260, r), y = ramp * (n * 9 + 12 * sm(200, 420, r)) - .05;
      if (r < 60) y = -.05;
      p.setY(i, y);
      var m = .5 + .5 * Math.sin(x * .09 + Math.cos(z * .07) * 2);
      c.copy(dry).lerp(green, m * .7 + .15 * Math.sin(z * .2)); if (ramp > .4) c.lerp(dark, .35);
      c.convertSRGBToLinear(); col.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    var land = new THREE.Mesh(g, std({ vertexColors: true, roughness: 1, metalness: 0 })); land.receiveShadow = true; scene.add(land);

    // the plot: worked soil with furrows
    var soil = canvasTex(512, 512, function (x, w, h) {
      x.fillStyle = "#9A7B57"; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 9000; i++) { var v = Math.random(); x.fillStyle = v < .5 ? "rgba(70,50,30," + (Math.random() * .16) + ")" : "rgba(200,170,130," + (Math.random() * .12) + ")"; var s = 1 + Math.random() * 3; x.fillRect(Math.random() * w, Math.random() * h, s, s); }
      for (var j = 0; j < h; j += 32) { var gr = x.createLinearGradient(0, j, 0, j + 32); gr.addColorStop(0, "rgba(60,42,25,.0)"); gr.addColorStop(.5, "rgba(60,42,25,.22)"); gr.addColorStop(1, "rgba(60,42,25,.0)"); x.fillStyle = gr; x.fillRect(0, j, w, 32); }
    }, [6, 5]);
    var plot = new THREE.Mesh(new THREE.PlaneGeometry(LX + 16, LZ + 14), std({ map: soil, roughness: 1 }));
    plot.rotation.x = -Math.PI / 2; plot.position.y = .005; plot.receiveShadow = true; scene.add(plot);
    // dirt road with tyre tracks
    var rt = canvasTex(256, 128, function (x, w, h) {
      x.fillStyle = "#C9B28A"; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 2500; i++) { x.fillStyle = "rgba(120,96,64," + Math.random() * .18 + ")"; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      x.fillStyle = "rgba(110,88,60,.28)"; x.fillRect(0, h * .22, w, h * .12); x.fillRect(0, h * .66, w, h * .12);
    }, [60, 1]);
    var road = new THREE.Mesh(new THREE.PlaneGeometry(900, 5.5), std({ map: rt, roughness: 1 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, .01, ROADZ); road.receiveShadow = true; scene.add(road);

    // windbreak of cypresses and neighbouring orchards, for scale and context
    var cyp = [], k;
    for (k = 0; k < 26; k++) cyp.push([X0 - 16 + k * 3.1, Z0 - 15]);
    for (k = 0; k < 16; k++) cyp.push([X0 - 17, Z0 - 13 + k * 3.2]);
    var cg = new THREE.ConeGeometry(.9, 7, 8); cg.translate(0, 3.5, 0);
    var cm = new THREE.InstancedMesh(cg, std({ color: 0x2F4A2C, roughness: .9 }), cyp.length), d = new THREE.Object3D();
    cyp.forEach(function (q, i) { var s = .8 + rnd(i) * .45; d.position.set(q[0], 0, q[1]); d.scale.set(s, s * (.9 + rnd(i + 9) * .3), s); d.updateMatrix(); cm.setMatrixAt(i, d.matrix); });
    cm.castShadow = true; scene.add(cm);
    var orch = [], blocks = [[48, -30, 9, 7], [44, 30, 8, 6], [-70, 24, 10, 7], [10, -70, 12, 6], [-40, -64, 9, 6]];
    blocks.forEach(function (b) { for (var i = 0; i < b[2]; i++) for (var j = 0; j < b[3]; j++) orch.push([b[0] + i * 4.2, b[1] + j * 5]); });
    var og = new THREE.IcosahedronGeometry(1.6, 1); og.translate(0, 2, 0);
    var om = new THREE.InstancedMesh(og, std({ color: 0x55783F, roughness: .95, flatShading: true }), orch.length);
    orch.forEach(function (q, i) { var s = .8 + rnd(i * 3) * .4; d.position.set(q[0], 0, q[1]); d.scale.set(s, s * .85, s); d.rotation.y = i; d.updateMatrix(); om.setMatrixAt(i, d.matrix); });
    om.castShadow = true; scene.add(om);
  })();

  // ---------------------------------------------------------------- materials
  var steel = std({ color: 0xD6DCE0, metalness: .92, roughness: .3, envMapIntensity: 1.15 });
  var steelCable = std({ color: 0xC4CBCF, metalness: .9, roughness: .42 });
  var concrete = std({ color: 0xC2BDB3, roughness: .95 });
  var dark = std({ color: 0x2A2F2E, roughness: .8 });
  var pipe = std({ color: 0x1F2423, roughness: .6 });
  var white = std({ color: 0xF4F4F0, roughness: .6 });
  var hivis = std({ color: 0xF2A23A, roughness: .7 });
  var lift = std({ color: 0xE3B23C, roughness: .55, metalness: .2 });
  var skin = std({ color: 0xB98B66, roughness: .8 });
  var cloth = std({ color: 0x415A6B, roughness: .9 });

  // ---------------------------------------------------------------- 0: plan lines on the ground
  var planPts = [], i, k;
  for (i = 0; i < NX; i++) planPts.push(X0 + i * SX, .03, Z0 - 2.5, X0 + i * SX, .03, Z0 + LZ + 2.5);
  for (k = 0; k < NZ; k++) planPts.push(X0 - 2.5, .03, Z0 + k * SZ, X0 + LX + 2.5, .03, Z0 + k * SZ);
  var planG = new THREE.BufferGeometry(); planG.setAttribute("position", new THREE.Float32BufferAttribute(planPts, 3));
  var planM = new THREE.LineDashedMaterial({ color: lin(0x0E4239), dashSize: .7, gapSize: .4, transparent: true });
  var plan = new THREE.LineSegments(planG, planM); plan.computeLineDistances(); scene.add(plan);
  var planCount = planPts.length / 3;

  var POLES = [];
  for (i = 0; i < NX; i++) for (k = 0; k < NZ; k++) POLES.push({ x: X0 + i * SX, z: Z0 + k * SZ, i: i, k: k, edge: i === 0 || i === NX - 1 || k === 0 || k === NZ - 1 });

  // ---------------------------------------------------------------- 1: marking out
  var flagTex = canvasTex(8, 8, function (x) { x.fillStyle = "#F06A2A"; x.fillRect(0, 0, 8, 8); });
  var stakeG = new THREE.CylinderGeometry(.03, .03, .7, 5); stakeG.translate(0, .35, 0);
  var flagG = new THREE.PlaneGeometry(.28, .18); flagG.translate(.14, .6, 0);
  var stakes = new THREE.Group(); scene.add(stakes);
  POLES.forEach(function (p) { var s = new THREE.Group(); s.add(new THREE.Mesh(stakeG, std({ color: 0xE8DCC2, roughness: .9 }))); var f = new THREE.Mesh(flagG, std({ map: flagTex, side: THREE.DoubleSide })); s.add(f); s.position.set(p.x, 0, p.z); s.userData.p = p; stakes.add(s); });
  var strings = [];
  for (k = 0; k < NZ; k++) { var sg = new THREE.CylinderGeometry(.012, .012, LX, 4); sg.rotateZ(Math.PI / 2); sg.translate(LX / 2, 0, 0); var st = new THREE.Mesh(sg, white); st.position.set(X0, .5, Z0 + k * SZ); scene.add(st); strings.push(st); }
  // total station on a tripod
  var tstation = new THREE.Group();
  for (i = 0; i < 3; i++) { var lg = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.6, 5), std({ color: 0xD7C9A8 })); var a = i * 2.1; lg.position.set(Math.cos(a) * .32, .75, Math.sin(a) * .32); lg.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); tstation.add(lg); }
  var head = new THREE.Mesh(new THREE.BoxGeometry(.28, .32, .22), std({ color: 0xF2C318, roughness: .5 })); head.position.y = 1.65; tstation.add(head);
  var lens = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .3, 10), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.68, .18); tstation.add(lens);
  tstation.position.set(X0 - 4, 0, Z0 + LZ + 3); tstation.rotation.y = -.7; tstation.traverse(function (m) { m.castShadow = true; }); scene.add(tstation);

  // people: simple figures in hi-vis vests and white hard hats
  function person(vest) {
    var g = new THREE.Group(), legs = [];
    for (var s = -1; s <= 1; s += 2) { var l = new THREE.Mesh(new THREE.BoxGeometry(.14, .82, .16), cloth); l.geometry.translate(0, -.41, 0); l.position.set(s * .1, .84, 0); g.add(l); legs.push(l); }
    var body = new THREE.Mesh(new THREE.BoxGeometry(.42, .6, .24), vest || hivis); body.position.y = 1.16; g.add(body);
    for (var t = -1; t <= 1; t += 2) { var arm = new THREE.Mesh(new THREE.BoxGeometry(.1, .56, .12), cloth); arm.geometry.translate(0, -.28, 0); arm.position.set(t * .27, 1.44, 0); arm.rotation.z = t * .06; g.add(arm); legs.push(arm); }
    var hd = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), skin); hd.position.y = 1.6; g.add(hd);
    var hat = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), white); hat.position.y = 1.65; g.add(hat);
    var brim = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .015, 14), white); brim.position.y = 1.65; g.add(brim);
    g.traverse(function (m) { m.castShadow = true; });
    g.userData.limbs = legs; return g;
  }
  var crew = [person(), person(), person(std({ color: 0xC8E05A, roughness: .7 }))];
  crew.forEach(function (c) { scene.add(c); });
  // crew positions per chapter (x, z, facing)
  var CREW = [
    [[X0 - 3, Z0 + LZ + 4, 2.4], [X0 - 1.5, Z0 + LZ + 1, 2.8], [X0 + 2, Z0 + LZ + 1.5, 3.4]],          // marking
    [[X0 + 6, Z0 + LZ + 2.2, 3.1], [X0 + 10, Z0 + LZ + 1.6, 2.9], [X0 + 15, Z0 + LZ + 3.2, 3.6]],       // poles
    [[X0 + 3, Z0 + LZ - 1, 3.0], [X0 + 9, Z0 + LZ + 1.5, 2.6], [X0 - 1.5, Z0 + 4, 1.6]],                // cables
    [[X0 + 12, Z0 + LZ + 1.2, 3.0], [X0 + 20, Z0 + LZ + 1.4, 3.2], [X0 + 26, Z0 + LZ + 2, 3.3]],        // net
    [[X0 + 3 * SX - 1.6, Z0 + LZ + 2, 3.1], [X0 + 3 * SX + 1.8, Z0 + LZ + 2.4, 3.3], [X0 + 3 * SX + .3, Z0 + LZ + 3.6, 3.0]] // closing
  ];

  // ---------------------------------------------------------------- 2: truck, footings, poles
  var truck = new THREE.Group();
  (function () {
    var cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.3), std({ color: 0xF2F2EE, roughness: .4, metalness: .1 })); cab.position.set(3.4, 1.55, 0); truck.add(cab);
    var win = new THREE.Mesh(new THREE.BoxGeometry(.05, .8, 1.9), std({ color: 0x23343A, roughness: .15, metalness: .5 })); win.position.set(4.52, 1.95, 0); truck.add(win);
    var bed = new THREE.Mesh(new THREE.BoxGeometry(6.4, .25, 2.4), std({ color: 0x5D6466, roughness: .7, metalness: .3 })); bed.position.set(-1, .95, 0); truck.add(bed);
    var chassis = new THREE.Mesh(new THREE.BoxGeometry(9, .35, 1.4), dark); chassis.position.set(.2, .7, 0); truck.add(chassis);
    var wg = new THREE.CylinderGeometry(.5, .5, .35, 18); wg.rotateX(Math.PI / 2);
    [[3.4, 1.1], [3.4, -1.1], [-2.6, 1.1], [-2.6, -1.1], [-1.4, 1.1], [-1.4, -1.1]].forEach(function (w) { var m = new THREE.Mesh(wg, dark); m.position.set(w[0], .5, w[1]); truck.add(m); });
    // bundle of galvanized poles on the bed
    var bundle = new THREE.Group(), pg = new THREE.CylinderGeometry(.085, .085, 6, 10); pg.rotateZ(Math.PI / 2);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 6 - r; c++) { var m = new THREE.Mesh(pg, steel); m.position.set(-1, 1.16 + r * .16, -.45 + c * .18 + r * .09); bundle.add(m); }
    truck.add(bundle); truck.userData.bundle = bundle;
    truck.traverse(function (m) { m.castShadow = true; m.receiveShadow = true; });
  })();
  scene.add(truck);

  var footG = new THREE.CylinderGeometry(.24, .26, .14, 14); footG.translate(0, .07, 0);
  var poleG = new THREE.CylinderGeometry(.075, .085, H, 14); poleG.translate(0, H / 2, 0);
  var capG = new THREE.CylinderGeometry(.13, .13, .05, 14); capG.translate(0, H + .02, 0);
  var brG = new THREE.BoxGeometry(.32, .12, .06); brG.translate(0, H - .12, 0);
  var poles = [], foots = [], dust = [];
  var dustTex = canvasTex(64, 64, function (x, w) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(190,165,125,.75)"); g.addColorStop(1, "rgba(190,165,125,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  POLES.forEach(function (p) {
    var f = new THREE.Mesh(footG, concrete); f.position.set(p.x, 0, p.z); f.receiveShadow = true; scene.add(f); foots.push(f);
    var g = new THREE.Group(); g.add(new THREE.Mesh(poleG, steel)); g.add(new THREE.Mesh(capG, steel)); var br = new THREE.Mesh(brG, steel); br.rotation.y = Math.PI / 2; g.add(br);
    g.position.set(p.x, 0, p.z); g.traverse(function (m) { m.castShadow = true; }); scene.add(g); poles.push(g);
    var dm = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 })); dm.position.set(p.x, .4, p.z); dm.scale.set(1.6, .9, 1); scene.add(dm); dust.push(dm);
  });

  // ---------------------------------------------------------------- 3: cables, anchors, lift
  function tubeAlong(a, b, sag, r, m) {
    var mid = a.clone().lerp(b, .5); mid.y -= sag;
    var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    var g = new THREE.TubeGeometry(curve, 40, r, 5, false);
    var mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.userData.n = g.index.count; return mesh;
  }
  var cables = [];
  for (k = 0; k < NZ; k++) { var c1 = tubeAlong(new THREE.Vector3(X0, H, Z0 + k * SZ), new THREE.Vector3(X0 + LX, H, Z0 + k * SZ), .06, .022, steelCable); scene.add(c1); cables.push(c1); }
  for (i = 0; i < NX; i++) { var c2 = tubeAlong(new THREE.Vector3(X0 + i * SX, H - .03, Z0), new THREE.Vector3(X0 + i * SX, H - .03, Z0 + LZ), .05, .018, steelCable); scene.add(c2); cables.push(c2); }
  var guys = [], anchorsM = [];
  POLES.filter(function (p) { return p.edge; }).forEach(function (p) {
    var dx = p.i === 0 ? -1 : p.i === NX - 1 ? 1 : 0, dz = p.k === 0 ? -1 : p.k === NZ - 1 ? 1 : 0;
    var top = new THREE.Vector3(p.x, H, p.z), gnd = new THREE.Vector3(p.x + dx * 2.6, .08, p.z + dz * 2.6);
    var gw = tubeAlong(top, gnd, 0, .016, steelCable); scene.add(gw); guys.push(gw);
    var an = new THREE.Group(); var plate = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .06, 12), steel); plate.position.y = .03; an.add(plate);
    var tb = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .45, 8), steel); tb.position.y = .3; var dir = top.clone().sub(gnd).normalize(); tb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); tb.position.copy(dir.clone().multiplyScalar(.35)).setY(.32); an.add(tb);
    an.position.copy(gnd).setY(0); an.traverse(function (m) { m.castShadow = true; }); scene.add(an); anchorsM.push(an);
  });
  // scissor lift with a worker on the platform
  var liftG = new THREE.Group(), arms = [];
  (function () {
    var base = new THREE.Mesh(new THREE.BoxGeometry(2.4, .5, 1.2), lift); base.position.y = .45; liftG.add(base);
    var wg = new THREE.CylinderGeometry(.22, .22, .18, 14); wg.rotateX(Math.PI / 2);
    [[.85, .62], [.85, -.62], [-.85, .62], [-.85, -.62]].forEach(function (w) { var m = new THREE.Mesh(wg, dark); m.position.set(w[0], .22, w[1]); liftG.add(m); });
    for (var s = 0; s < 4; s++) { var arm = new THREE.Mesh(new THREE.BoxGeometry(2.3, .08, .06), dark); arm.userData.s = s; liftG.add(arm); arms.push(arm); }
    var plat = new THREE.Group(); var deck = new THREE.Mesh(new THREE.BoxGeometry(2.5, .12, 1.25), lift); plat.add(deck);
    var rail = std({ color: 0xE3B23C, roughness: .5 });
    [[0, .55, .6, 2.5, .04, .04], [0, .55, -.6, 2.5, .04, .04], [1.23, .55, 0, .04, .04, 1.2], [-1.23, .55, 0, .04, .04, 1.2]].forEach(function (b) { var m = new THREE.Mesh(new THREE.BoxGeometry(b[3], b[4], b[5]), rail); m.position.set(b[0], b[1], b[2]); plat.add(m); });
    [[1.2, .6], [1.2, -.6], [-1.2, .6], [-1.2, -.6]].forEach(function (q) { var m = new THREE.Mesh(new THREE.BoxGeometry(.04, .55, .04), rail); m.position.set(q[0], .3, q[1]); plat.add(m); });
    var w = person(); w.position.set(.2, .06, 0); w.rotation.y = Math.PI / 2; plat.add(w); plat.userData.worker = w;
    liftG.add(plat); liftG.userData.plat = plat;
    liftG.traverse(function (m) { m.castShadow = true; });
  })();
  scene.add(liftG);
  function setLift(h) { // h = platform height above ground
    var plat = liftG.userData.plat; plat.position.y = .76 + h;
    var span = 2.1, rise = h / 2, ang = Math.atan2(rise, span);
    arms.forEach(function (a) { var lvl = a.userData.s >> 1, sign = a.userData.s & 1 ? 1 : -1; a.position.set(0, .76 + rise * (lvl + .5), sign * .5); a.rotation.z = (lvl % 2 ? -1 : 1) * ang; a.scale.x = Math.hypot(span, rise) / 2.3 * 1.05; });
  }

  // ---------------------------------------------------------------- 4: the net
  var netTex = canvasTex(128, 128, function (x, w, h) {
    x.clearRect(0, 0, w, h); x.fillStyle = "rgba(248,250,248,.5)"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2;
    for (var s = 0; s <= w; s += 16) { x.beginPath(); x.moveTo(s, 0); x.lineTo(s, h); x.stroke(); }
    x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1.5;
    for (var r = 0; r <= h; r += 16) { x.beginPath(); x.moveTo(0, r); x.lineTo(w, r); x.stroke(); }
  });
  function netMat(rx, ry) { var t = netTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return std({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: .85, color: 0xFFFFFF, emissive: 0x24302D, emissiveIntensity: .1, opacity: .92 }); }
  var SEGX = small ? 36 : 60, SEGZ = 8;
  var strips = [];
  for (k = 0; k < NZ - 1; k++) {
    // local y (plane height) runs along world x, so drawRange reveals the strip from one end to the other
    var g = new THREE.PlaneGeometry(SZ, LX, SEGZ, SEGX);
    var pos = g.attributes.position, base = new Float32Array(pos.count * 2);
    for (var v = 0; v < pos.count; v++) { base[v * 2] = pos.getX(v); base[v * 2 + 1] = pos.getY(v); }
    var m = new THREE.Mesh(g, netMat(SZ / 1.4, LX / 1.4)); m.userData = { base: base, k: k, idx: g.index.count };
    scene.add(m); strips.push(m);
  }
  function shapeStrip(m, t, fold, wind) {
    var pos = m.geometry.attributes.position, b = m.userData.base, zc = Z0 + m.userData.k * SZ + SZ / 2;
    for (var v = 0; v < pos.count; v++) {
      var lz = b[v * 2], ly = b[v * 2 + 1];
      var wx = X0 + LX / 2 - ly;                         // world x (local +y = start at X0)
      var u = (lz + SZ / 2) / SZ;                         // 0..1 across the bay
      var sag = .16 * Math.sin(Math.PI * u);
      var wv = wind * (.05 * Math.sin(wx * .7 + t * 2.1 + u * 3) * Math.sin(Math.PI * u));
      var y = H - sag + wv;
      // folded for winter: pleats bunch towards X0
      if (fold > 0) { var f = (wx - X0) / LX; var nx = X0 + f * LX * (1 - .9 * fold); y += fold * .25 * Math.abs(Math.sin(f * 60)) * Math.sin(Math.PI * u); wx = nx; }
      pos.setXYZ(v, wx, y, zc + lz);
    }
    pos.needsUpdate = true;
  }
  strips.forEach(function (m) { shapeStrip(m, 0, 0, 0); m.geometry.computeVertexNormals(); });
  var rolls = strips.map(function (m) { var r = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, SZ - .3, 18), std({ color: 0xEDEFEA, roughness: .9 })); r.rotation.x = Math.PI / 2; r.castShadow = true; scene.add(r); return r; });
  // side nets hang from the edge cables; door in the front
  var sides = [];
  function sideNet(len, x, z, ry) { var g = new THREE.PlaneGeometry(len, H); g.translate(0, -H / 2, 0); var m = new THREE.Mesh(g, netMat(len / 1.1, H / 1.1)); m.position.set(x, H, z); m.rotation.y = ry; scene.add(m); sides.push(m); return m; }
  sideNet(LX, X0 + LX / 2, Z0, 0); sideNet(LZ, X0, 0, Math.PI / 2); sideNet(LZ, X0 + LX, 0, Math.PI / 2); sideNet(LX, X0 + LX / 2, Z0 + LZ, 0);
  var door = new THREE.Group(), leaf = new THREE.Group();
  (function () {
    var pst = new THREE.BoxGeometry(.1, 2.8, .1);
    var a = new THREE.Mesh(pst, steel); a.position.set(-1.3, 1.4, 0); door.add(a);
    var b = a.clone(); b.position.x = 1.3; door.add(b);
    var top = new THREE.Mesh(new THREE.BoxGeometry(2.7, .1, .1), steel); top.position.set(0, 2.8, 0); door.add(top);
    var frame = [[0, 2.6, 2.5, .06], [0, .1, 2.5, .06], [-1.22, 1.35, .06, 2.5], [1.22, 1.35, .06, 2.5]];
    frame.forEach(function (f) { var m = new THREE.Mesh(new THREE.BoxGeometry(f[2], f[3], .05), steel); m.position.set(f[0] + 1.25, f[1], 0); leaf.add(m); });
    var pnl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.45), netMat(2.2, 2.2)); pnl.position.set(1.25, 1.35, 0); leaf.add(pnl);
    leaf.position.set(-1.25, 0, .06); door.add(leaf);
    door.traverse(function (m) { if (m.isMesh && m.material === steel) m.castShadow = true; });
  })();
  door.position.set(X0 + 3 * SX + SX / 2, 0, Z0 + LZ + .02); scene.add(door);

  // ---------------------------------------------------------------- 6: irrigation and trees
  var lanes = []; for (k = 0; k < NZ - 1; k++) lanes.push(Z0 + k * SZ + SZ / 2);
  var drips = lanes.map(function (z) { var g = new THREE.CylinderGeometry(.03, .03, LX - 1, 6); g.rotateZ(Math.PI / 2); g.translate((LX - 1) / 2, 0, 0); var m = new THREE.Mesh(g, pipe); m.position.set(X0 + .5, .06, z + .45); scene.add(m); return m; });
  var header = (function () { var g = new THREE.CylinderGeometry(.07, .07, LZ, 8); g.rotateX(Math.PI / 2); var m = new THREE.Mesh(g, std({ color: 0x2F5F8A, roughness: .5 })); m.position.set(X0 + .3, .1, 0); scene.add(m); return m; })();
  var valve = (function () { var gr = new THREE.Group(); var b = new THREE.Mesh(new THREE.BoxGeometry(.8, .7, .6), std({ color: 0x2F5F8A, roughness: .5 })); b.position.y = .35; gr.add(b); var f = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .9, 12), std({ color: 0x3C78A8, roughness: .4 })); f.position.set(.6, .45, 0); gr.add(f); gr.position.set(X0 - 1.6, 0, Z0 + 3); gr.traverse(function (m) { m.castShadow = true; }); scene.add(gr); return gr; })();
  var TR = []; lanes.forEach(function (z, li) { for (var t = 0; t < 14; t++) TR.push({ x: X0 + 1.4 + t * (LX - 2.8) / 13, z: z, d: (li * 14 + t) / (lanes.length * 14), s: .85 + rnd(li * 31 + t) * .3 }); });
  var trunkG = new THREE.CylinderGeometry(.06, .11, 1.2, 7); trunkG.translate(0, .6, 0);
  var crownG = (function () {
    var a = new THREE.IcosahedronGeometry(.85, 1); a.translate(0, 1.8, 0);
    var b = new THREE.IcosahedronGeometry(.6, 1); b.translate(.45, 1.5, .2);
    var c = new THREE.IcosahedronGeometry(.55, 1); c.translate(-.4, 1.55, -.25);
    return mergeGeos([a, b, c]);
  })();
  function mergeGeos(list) {
    var pos = [], nrm = [];
    list.forEach(function (g) { g = g.index ? g.toNonIndexed() : g; pos.push.apply(pos, g.attributes.position.array); nrm.push.apply(nrm, g.attributes.normal.array); });
    var o = new THREE.BufferGeometry(); o.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); return o;
  }
  var leafM = std({ color: 0x4E8A3E, roughness: .85, flatShading: true });
  var trunks = new THREE.InstancedMesh(trunkG, std({ color: 0x6E5A44, roughness: .95 }), TR.length);
  var crowns = new THREE.InstancedMesh(crownG, leafM, TR.length);
  trunks.castShadow = crowns.castShadow = true; crowns.receiveShadow = true; scene.add(trunks); scene.add(crowns);
  var FR = []; TR.forEach(function (t, n) { for (var f = 0; f < 7; f++) { var a = rnd(n * 7 + f) * 6.28, h = 1.25 + rnd(n * 13 + f) * .9, r = .55 + rnd(n * 17 + f) * .35; FR.push({ x: t.x + Math.cos(a) * r, y: h, z: t.z + Math.sin(a) * r, t: n }); } });
  var fruit = new THREE.InstancedMesh(new THREE.SphereGeometry(.085, 8, 6), std({ color: 0xC0392B, roughness: .45 }), FR.length); scene.add(fruit);
  var dm = new THREE.Object3D();

  // water drops from the drippers
  var WD = small ? 120 : 260, wdp = new Float32Array(WD * 3), wdv = new Float32Array(WD);
  for (i = 0; i < WD; i++) { wdp[i * 3] = X0 + 1 + rnd(i) * (LX - 2); wdp[i * 3 + 1] = rnd(i + 3) * .4; wdp[i * 3 + 2] = lanes[i % lanes.length] + .45; }
  var wdg = new THREE.BufferGeometry(); wdg.setAttribute("position", new THREE.BufferAttribute(wdp, 3));
  var dropTex = canvasTex(32, 32, function (x) { var g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
  var water = new THREE.Points(wdg, new THREE.PointsMaterial({ color: lin(0x7EC8F0), size: .12, map: dropTex, transparent: true, depthWrite: false, opacity: 0 })); water.frustumCulled = false; scene.add(water);

  // ---------------------------------------------------------------- 7: storm, hail
  var HN = small ? 700 : 1600, hp = new Float32Array(HN * 3), hv = new Float32Array(HN), hb = new Uint8Array(HN);
  function seedHail(n, top) { hp[n * 3] = X0 - 12 + Math.random() * (LX + 24); hp[n * 3 + 1] = top ? 18 + Math.random() * 14 : Math.random() * 30; hp[n * 3 + 2] = Z0 - 12 + Math.random() * (LZ + 24); hv[n] = -(14 + Math.random() * 8); hb[n] = 0; }
  for (i = 0; i < HN; i++) seedHail(i, false);
  var hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.BufferAttribute(hp, 3));
  var hailM = new THREE.PointsMaterial({ color: 0xFFFFFF, size: .5, map: dropTex, transparent: true, opacity: 0, depthWrite: false });
  var hail = new THREE.Points(hg, hailM); hail.frustumCulled = false; scene.add(hail);
  // ice that settles on the net
  var IN = small ? 500 : 1400, ip = new Float32Array(IN * 3);
  for (i = 0; i < IN; i++) { ip[i * 3] = X0 + rnd(i * 2) * LX; ip[i * 3 + 2] = Z0 + rnd(i * 5) * LZ; var u = ((ip[i * 3 + 2] - Z0) % SZ) / SZ; ip[i * 3 + 1] = H - .16 * Math.sin(Math.PI * u) + .03; }
  var ig = new THREE.BufferGeometry(); ig.setAttribute("position", new THREE.BufferAttribute(ip, 3));
  var ice = new THREE.Points(ig, new THREE.PointsMaterial({ color: 0xFFFFFF, size: .22, map: dropTex, transparent: true, depthWrite: false })); ice.frustumCulled = false; scene.add(ice);
  // clouds
  var clouds = new THREE.Group(), cloudM = std({ color: 0x5C686C, roughness: 1, transparent: true, opacity: 0, depthWrite: false, flatShading: true });
  for (i = 0; i < 18; i++) { var cg2 = new THREE.IcosahedronGeometry(8 + rnd(i) * 7, 1); var cm2 = new THREE.Mesh(cg2, cloudM); cm2.position.set(-70 + rnd(i * 3) * 140, 34 + rnd(i * 7) * 10, -60 + rnd(i * 11) * 110); cm2.scale.y = .45; clouds.add(cm2); }
  scene.add(clouds);
  // rain streaks
  var RN = small ? 300 : 700, rp = new Float32Array(RN * 6);
  for (i = 0; i < RN; i++) { var rx = X0 - 30 + rnd(i) * (LX + 60), ry = rnd(i + 1) * 30, rz = Z0 - 30 + rnd(i + 2) * (LZ + 60); rp.set([rx, ry, rz, rx - .15, ry - 1.1, rz], i * 6); }
  var rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  var rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: lin(0xC9D6DC), transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);

  // ---------------------------------------------------------------- camera path (one key per chapter)
  var KEYS = [
    [[40, 30, 46], [0, 0, 0]],
    [[-3, 4.2, 22], [X0 + 3, .8, Z0 + LZ - 2]],
    [[24, 9, 30], [2, 1.8, 2]],
    [[-6, 8, 17], [-4, 4, 2]],
    [[18, 21, 30], [0, 3, 0]],
    [[7, 3.8, 29], [X0 + 3 * SX + SX / 2, 2, Z0 + LZ]],
    [[-26, 3.2, 13], [0, 2, 0]],
    [[24, 6.5, 30], [0, 3.6, 0]],
    [[30, 22, 26], [0, 2, 0]],
    [[30, 13, 33], [0, 2.2, 0]]
  ];
  var posCurve = new THREE.CatmullRomCurve3(KEYS.map(function (q) { return new THREE.Vector3().fromArray(q[0]); }), false, "centripetal");
  var tgtCurve = new THREE.CatmullRomCurve3(KEYS.map(function (q) { return new THREE.Vector3().fromArray(q[1]); }), false, "centripetal");
  var cp = new THREE.Vector3(), ct = new THREE.Vector3();
  function camAt(P, t) {
    var u = cl((P - .5) / (KEYS.length - 1));
    // ease within each chapter so the camera rests while you read, and flies between
    var seg = u * (KEYS.length - 1), si = Math.floor(seg), f = seg - si, e = si + sm(.15, .85, f);
    var uu = cl(e / (KEYS.length - 1));
    posCurve.getPoint(uu, cp); tgtCurve.getPoint(uu, ct);
    if (small) { cp.sub(ct).multiplyScalar(1.18).add(ct); }
    var orb = sm(8.7, 9.5, P);
    if (orb > 0 && !reduce) { var a = Math.sin(t * .12) * .32 * orb, r = Math.hypot(cp.x, cp.z), a0 = Math.atan2(cp.z, cp.x); cp.x = Math.cos(a0 + a) * r; cp.z = Math.sin(a0 + a) * r; }
    camera.position.copy(cp); camera.lookAt(ct);
  }

  // ---------------------------------------------------------------- the timeline
  var cA = new THREE.Color(), cB = new THREE.Color(), leafGreen = lin(0x4E8A3E), leafWinter = lin(0x8C7B5A), sunDay = lin(0xFFF3E0), sunGold = lin(0xFFC98A);
  var flash = 0;
  function moveCrew(P, t) {
    var on = sm(1.02, 1.25, P) * (1 - sm(5.85, 6.1, P));
    var ch = Math.max(0, P - 1), a = Math.min(4, Math.floor(ch)), f = a < 4 ? sm(.78, .98, ch - a) : 0;
    crew.forEach(function (c, n) {
      vis(c, on);
      var A = CREW[a][n], B = CREW[Math.min(4, a + 1)][n];
      var x = lerp(A[0], B[0], f), z = lerp(A[1], B[1], f), walking = f > .02 && f < .98;
      c.position.set(x, 0, z);
      c.rotation.y = walking ? Math.atan2(B[0] - A[0], B[1] - A[1]) : lerp(A[2], B[2], f);
      var sw = walking && !reduce ? Math.sin(t * 7 + n) * .45 : 0;
      c.userData.limbs.forEach(function (l, j) { l.rotation.x = (j % 2 ? 1 : -1) * sw; });
      c.position.y = walking && !reduce ? Math.abs(Math.sin(t * 7 + n)) * .04 : 0;
    });
  }
  function apply(P, t, dt) {
    // 0 plan
    var p0 = sm(.05, .85, P); planG.setDrawRange(0, Math.round(planCount * p0 / 2) * 2); planM.opacity = 1 - .8 * sm(2.2, 3, P); vis(plan, p0 * (1 - sm(3.2, 3.6, P)));
    // 1 marking
    stakes.children.forEach(function (s, n) { var d = n / stakes.children.length, v = backOut(sm(1.05 + d * .4, 1.2 + d * .4, P)) * (1 - sm(2.1 + d * .6, 2.25 + d * .6, P)); s.scale.setScalar(Math.max(.001, v)); vis(s, v); s.children[1].rotation.y = Math.sin(t * 3 + n) * .3; });
    strings.forEach(function (s, n) { var v = sm(1.3 + n * .07, 1.65 + n * .07, P), off = 1 - sm(2.6, 2.95, P); s.scale.x = Math.max(.001, v); vis(s, v * off); });
    var ts = sm(1.0, 1.2, P) * (1 - sm(2.0, 2.2, P)); tstation.scale.setScalar(Math.max(.001, ts)); vis(tstation, ts);
    moveCrew(P, t);
    // 2 truck and poles
    var tin = sm(1.95, 2.25, P), tout = sm(5.9, 6.25, P);
    truck.position.set(lerp(-90, X0 + 4, tin) + tout * 120, 0, ROADZ - .2); vis(truck, tin * (1 - sm(6.2, 6.25, P)));
    truck.userData.bundle.scale.set(1, Math.max(.05, 1 - sm(2.2, 2.95, P)), Math.max(.05, 1 - sm(2.2, 2.95, P)));
    poles.forEach(function (g, n) {
      var p = POLES[n], d = (p.i * NZ + p.k) / POLES.length, a = 2.2 + d * .7, v = sm(a, a + .1, P);
      g.position.y = (1 - backOut(v)) * 5.5; g.rotation.z = (1 - v) * .15; vis(g, v);
      var fo = sm(2.1 + d * .7, 2.2 + d * .7, P); foots[n].scale.set(1, Math.max(.001, fo), 1); vis(foots[n], fo);
      var dv = sm(a + .08, a + .12, P) * (1 - sm(a + .14, a + .3, P)); dust[n].material.opacity = reduce ? 0 : dv * .8; dust[n].scale.set(1 + dv * 1.6, .7 + dv * .7, 1); vis(dust[n], dv);
    });
    // 3 cables, guys, lift
    cables.forEach(function (c, n) { var d = n / cables.length, v = sm(3.08 + d * .55, 3.25 + d * .55, P); c.geometry.setDrawRange(0, Math.floor(c.userData.n * v / 6) * 6); vis(c, v); });
    guys.forEach(function (g, n) { var d = n / guys.length, v = sm(3.5 + d * .35, 3.6 + d * .35, P); g.geometry.setDrawRange(0, Math.floor(g.userData.n * v / 6) * 6); vis(g, v); anchorsM[n].scale.setScalar(Math.max(.001, sm(3.45 + d * .35, 3.55 + d * .35, P))); vis(anchorsM[n], v + .01); });
    var lv = sm(2.95, 3.15, P) * (1 - sm(5.75, 5.95, P));
    vis(liftG, lv);
    if (lv > 0) {
      var lx, lz, lh;
      if (P < 4) { var q = sm(3.1, 3.9, P); lx = lerp(X0 + 1, X0 + LX - 1, q); lz = Z0 + SZ * 2 + 1.1; lh = lerp(.3, H - 1.9, sm(3, 3.2, P)); }
      else { var q2 = sm(4.05, 4.9, P); lx = lerp(X0 + 1, X0 + LX - 1, q2); lz = Z0 + SZ * 1 + 1.1; lh = H - 1.9; }
      if (P > 4.95) { lh = lerp(H - 1.9, .3, sm(5.1, 5.6, P)); lz = Z0 + LZ + 4; lx = X0 + LX + 4; }
      liftG.position.set(lx, 0, lz); setLift(lh);
      var wk = liftG.userData.plat.userData.worker; wk.userData.limbs.forEach(function (l, j) { if (j > 1) l.rotation.x = reduce ? -2.4 : -2.4 + Math.sin(t * 4 + j) * .25; });
    }
    // 4 net strips unroll; 8 fold in winter and spread again
    var fold = sm(8.1, 8.5, P) * (1 - sm(8.6, 8.95, P));
    var wind = reduce ? 0 : sm(7.0, 7.3, P) * (1 - sm(7.9, 8.1, P)) * 1.8;  // the net only moves in the storm
    strips.forEach(function (m, n) {
      var d = n / strips.length, a = 4.05 + d * .55, v = sm(a, a + .35, P);
      var rows = Math.floor((SEGX) * v), cnt = rows * SEGZ * 6;
      m.geometry.setDrawRange(0, cnt); vis(m, v);
      if (v > 0) shapeStrip(m, t, fold, wind);
      var r = rolls[n], front = X0 + LX * v;
      r.position.set(front, H + .34, Z0 + n * SZ + SZ / 2); r.rotation.y = -front * 1.6; r.scale.set(1 - v * .55, 1, 1 - v * .55);
      vis(r, v > .001 && v < .999 ? 1 : 0);
    });
    // folded bundles at the X0 end in winter
    // 5 side nets drop, door
    sides.forEach(function (s, n) { var v = sm(5.05 + n * .1, 5.4 + n * .1, P); s.scale.y = Math.max(.001, v); vis(s, v); });
    var dv = sm(5.45, 5.7, P); door.scale.set(1, Math.max(.001, dv), 1); vis(door, dv);
    leaf.rotation.y = -1.25 * sm(5.75, 5.95, P) * (1 - sm(6.0, 6.2, P));
    // 6 irrigation, trees, fruit
    drips.forEach(function (d, n) { var v = sm(6.02 + n * .05, 6.22 + n * .05, P); d.scale.x = Math.max(.001, v); vis(d, v); });
    var hv2 = sm(6.0, 6.15, P); header.scale.set(1, 1, Math.max(.001, hv2)); vis(header, hv2); valve.scale.setScalar(Math.max(.001, hv2)); vis(valve, hv2);
    var winter = sm(8.1, 8.4, P) * (1 - sm(8.6, 8.9, P));
    TR.forEach(function (tr, n) {
      var v = sm(6.18 + tr.d * .3, 6.34 + tr.d * .3, P) * tr.s;
      dm.position.set(tr.x, 0, tr.z); dm.rotation.set(0, n * 1.7, 0); dm.scale.setScalar(Math.max(.001, v)); dm.updateMatrix(); trunks.setMatrixAt(n, dm.matrix);
      var cs = v * (1 - .55 * winter); dm.scale.set(Math.max(.001, cs), Math.max(.001, cs * (1 - .2 * winter)), Math.max(.001, cs)); dm.updateMatrix(); crowns.setMatrixAt(n, dm.matrix);
    });
    trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
    leafM.color.copy(leafGreen).lerp(leafWinter, winter);
    var fv = sm(6.6, 6.85, P) * (1 - winter);
    FR.forEach(function (f, n) { var v = fv * sm(0, 1, (fv * 1.4) - (n % 7) * .05); dm.position.set(f.x, f.y, f.z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(Math.max(.001, v)); dm.updateMatrix(); fruit.setMatrixAt(n, dm.matrix); });
    fruit.instanceMatrix.needsUpdate = true; vis(fruit, fv);
    var wv = sm(6.1, 6.25, P) * (1 - sm(6.9, 7.0, P)); water.material.opacity = wv * .9; vis(water, wv);
    if (wv > 0 && !reduce) { for (i = 0; i < WD; i++) { wdp[i * 3 + 1] -= dt * (1.2 + (i % 5) * .2); if (wdp[i * 3 + 1] < 0) wdp[i * 3 + 1] = .35; } wdg.attributes.position.needsUpdate = true; }
    // 7 storm
    var storm = sm(6.95, 7.25, P) * (1 - sm(7.85, 8.1, P));
    var hOn = sm(7.15, 7.3, P) * (1 - sm(7.8, 7.95, P));
    hailM.opacity = hOn; vis(hail, hOn);
    cloudM.opacity = storm * .92; vis(clouds, storm); clouds.position.x = reduce ? 0 : (t * .8) % 30 - 15;
    rain.material.opacity = storm * .35; vis(rain, storm);
    var iceOn = sm(7.3, 7.8, P) * (1 - sm(7.95, 8.2, P)); ig.setDrawRange(0, Math.floor(IN * iceOn)); vis(ice, iceOn);
    if (hOn > 0 && !reduce) {
      var roofOn = fold < .5;
      for (i = 0; i < HN; i++) {
        var j = i * 3; hv[i] -= 28 * dt; hp[j + 1] += hv[i] * dt;
        var inside = hp[j] > X0 && hp[j] < X0 + LX && hp[j + 2] > Z0 && hp[j + 2] < Z0 + LZ;
        if (!hb[i] && roofOn && inside && hp[j + 1] < H + .05 && hp[j + 1] > H - .6) { hp[j + 1] = H + .06; hv[i] = Math.abs(hv[i]) * .25; hb[i] = 1; hp[j] += (Math.random() - .5) * .4; hp[j + 2] += (Math.random() - .5) * .4; }
        else if (hb[i] && hp[j + 1] < H + .04) { if (Math.random() < dt * 2) seedHail(i, true); else { hp[j + 1] = H + .04; hv[i] = 0; } }
        else if (hp[j + 1] < .05) { if (Math.random() < dt * 3) seedHail(i, true); else { hp[j + 1] = .05; hv[i] = 0; } }
      }
      hg.attributes.position.needsUpdate = true;
      for (i = 0; i < RN; i++) { var b2 = i * 6; rp[b2 + 1] -= dt * 30; rp[b2 + 4] -= dt * 30; if (rp[b2 + 4] < 0) { rp[b2 + 1] += 30; rp[b2 + 4] += 30; } }
      rg.attributes.position.needsUpdate = true;
      if (storm > .8 && Math.random() < dt * .35) flash = 1;
    }
    flash = Math.max(0, flash - dt * 5);
    // light and sky: day, storm, winter, golden hour
    var gold = sm(9.0, 9.6, P);
    cA.copy(SKY.day[0]).lerp(SKY.storm[0], storm).lerp(SKY.winter[0], winter).lerp(SKY.gold[0], gold);
    cB.copy(SKY.day[1]).lerp(SKY.storm[1], storm).lerp(SKY.winter[1], winter).lerp(SKY.gold[1], gold);
    skyU.top.value.copy(cA); skyU.hor.value.copy(cB); scene.fog.color.copy(cB).convertSRGBToLinear();
    skyU.sunAmt.value = 1 - storm * .95;
    var sdir = new THREE.Vector3(lerp(.5, .9, gold), lerp(.45, .16, gold), lerp(.35, .3, gold)).normalize(); skyU.sunDir.value.copy(sdir);
    sun.position.copy(sdir).multiplyScalar(70); sun.color.copy(sunDay).lerp(sunGold, gold);
    sun.intensity = (2.3 - 1.9 * storm - .5 * winter) * (1 - .25 * gold);
    hemi.intensity = .55 - .15 * storm + flash * 1.6;
    renderer.toneMappingExposure = 1.05 - .1 * storm + flash * .5;
  }

  // ---------------------------------------------------------------- scroll, resize, loop
  var Pt = 0, P = 0;
  function chH() { var c = root.querySelector(".sim-ch"); return (c && c.offsetHeight) || window.innerHeight; }
  function readScroll() { var r = track.getBoundingClientRect(), vh = window.innerHeight; Pt = Math.max(0, Math.min(N - .001, (-r.top + vh * .5) / chH())); }
  window.addEventListener("scroll", readScroll, { passive: true });
  function size() {
    var w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h); camera.fov = camera.aspect < .8 ? 54 : camera.aspect < 1.2 ? 44 : 36; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", size); if (window.ResizeObserver) new ResizeObserver(size).observe(stage);
  size();
  var running = true, last = performance.now();
  var pending = false;
  function kick() { if (!pending && running && !document.hidden) { pending = true; last = performance.now(); requestAnimationFrame(frame); } }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { running = es[0].isIntersecting; kick(); }, { rootMargin: "100px" }).observe(track);
  document.addEventListener("visibilitychange", kick);
  var rail = root.querySelectorAll(".sim-rail button"), stepEl = document.getElementById("sim-step"), bar = document.getElementById("sim-bar");
  // a dot goes to its step on click, and on keyboard focus too, so the focused dot is always on screen
  rail.forEach(function (b, n) { function go() { var r = track.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top + n * chH() + 4, behavior: reduce ? "auto" : "smooth" }); } b.addEventListener("click", go); b.addEventListener("focus", function () { if (b.matches(":focus-visible")) go(); }); });
  var t0 = performance.now(), cur = -1, first = true;
  function frame(now) {
    pending = false;
    if (!running || document.hidden) return;
    now = now || performance.now();
    var dt = Math.min(.1, (now - last) / 1000); last = now;
    if (Math.abs(Pt - P) > 1) P = Pt - (Pt > P ? 1 : -1);  // never more than one step behind the scroll
    P += (Pt - P) * (reduce ? 1 : 1 - Math.pow(.9, dt * 60));
    var t = (now - t0) / 1000;
    var moving = Math.abs(Pt - P) > 1e-4 || first;
    var live = !reduce && ((P > 6.1 && P < 8.1) || P > 8.7 || flash > 0);  // drips, storm, final swing
    if (moving || live) { apply(P, t, dt); camAt(P, t); renderer.render(scene, camera); if (first) { root.classList.add("live"); first = false; } }
    var s = Math.min(N - 1, Math.floor(Pt));
    if (s !== cur) {
      cur = s; rail.forEach(function (b, n) { if (n === s) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      if (stepEl) stepEl.textContent = (s + 1 < 10 ? "0" : "") + (s + 1) + " / " + (N < 10 ? "0" : "") + N;
    }
    if (bar) bar.style.transform = "scaleX(" + (P / N).toFixed(4) + ")";
    if (moving || live) kick(); else pending = false;
  }
  window.addEventListener("scroll", kick, { passive: true });
  readScroll(); P = Pt;
  kick();
  }
})();
