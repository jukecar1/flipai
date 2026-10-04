import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  "What if Yellowstone erupted?"  — deterministic 17s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 * ------------------------------------------------------------------ */

const T_END = 17;
const P = new URLSearchParams(location.search);
const DPR = +(P.get('dpr') || 1);

/* ---------- helpers ---------- */
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 2.2);
function kf(t, pts) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t < pts[i][0]) {
      const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
      return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
  }
  return pts[pts.length - 1][1];
}
const _ca = new THREE.Color(), _cb = new THREE.Color();
function kfc(t, pts, out) {
  out = out || new THREE.Color();
  if (t <= pts[0][0]) return out.set(pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (t < pts[i][0]) {
      const [t0, c0] = pts[i - 1], [t1, c1] = pts[i];
      _ca.set(c0); _cb.set(c1);
      return out.copy(_ca).lerp(_cb, (t - t0) / (t1 - t0));
    }
  }
  return out.set(pts[pts.length - 1][1]);
}

/* ---------- renderer / scene ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf2b27a, 0.0003);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 9000);

/* ---------- sky ---------- */
const SUN_DIR = new THREE.Vector3(-0.38, 0.2, -0.9).normalize();
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new THREE.Color(0x6f98c9) },
    hor: { value: new THREE.Color(0xf2b27a) },
    sunDir: { value: SUN_DIR },
    sunCol: { value: new THREE.Color(0xffd9a0) },
    sunAmt: { value: 1 },
  },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 top, hor, sunDir, sunCol; uniform float sunAmt; varying vec3 vP;
    void main(){
      float h = clamp(vP.y, 0.0, 1.0);
      vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.7, h), 0.65));
      float s = max(dot(normalize(vP), sunDir), 0.0);
      c += sunCol * (pow(s, 12.0) * 0.35 + pow(s, 600.0) * 2.2) * sunAmt;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 24, 16), skyMat);
scene.add(sky);

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0xaac0e0, 0x4a3f30, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc48c, 3);
sun.position.copy(SUN_DIR).multiplyScalar(400).add(new THREE.Vector3(0, 0, -120));
sun.target.position.set(0, 0, -120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 260, bottom: -260, near: 1, far: 900 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

const CRATER = new THREE.Vector3(0, 420, -950);
const craterLight = new THREE.PointLight(0xff6a20, 0, 0, 2);
craterLight.position.set(0, 470, -930);
scene.add(craterLight);

/* ---------- materials that gather ash ---------- */
const ashTargets = []; // {mat, base, k, start}
const ASH = new THREE.Color(0x9b9993);
function ashMat(color, k, start = 7, extra = {}) {
  const m = new THREE.MeshLambertMaterial({ color, ...extra });
  ashTargets.push({ mat: m, base: new THREE.Color(color), k, start });
  return m;
}

/* ---------- ground / road / mountains ---------- */
const groundMat = ashMat(0x8d7c46, 0.95, 7.2);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const roadMat = ashMat(0x3b3a3f, 0.9, 7.4);
const road = new THREE.Mesh(new THREE.PlaneGeometry(11, 560), roadMat);
road.rotation.x = -Math.PI / 2; road.position.set(0, 0.06, -250);
road.receiveShadow = true;
scene.add(road);
const dashMat = ashMat(0xd8c98a, 0.95, 7.2);
for (let z = 10; z > -520; z -= 9) {
  const d = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3.6), dashMat);
  d.rotation.x = -Math.PI / 2; d.position.set(0, 0.09, z);
  scene.add(d);
}

const mountMat = ashMat(0x6a7488, 0.55, 8, { flatShading: true });
const volcanoMat = ashMat(0xffffff, 0.5, 8, { flatShading: true, vertexColors: true });
const R = rng(11);
const volcano = new THREE.Mesh(new THREE.CylinderGeometry(95, 860, 420, 11, 3), volcanoMat);
{
  const g = volcano.geometry, pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const lo = new THREE.Color(0x3c4a37), mid = new THREE.Color(0x7d6d62), hi = new THREE.Color(0xa59a90), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) + 210) / 420;
    if (h < 0.4) c.copy(lo).lerp(mid, h / 0.4); else c.copy(mid).lerp(hi, (h - 0.4) / 0.6);
    const n = 0.9 + 0.2 * Math.abs(Math.sin(pos.getX(i) * 0.05 + pos.getZ(i) * 0.031));
    col[i * 3] = c.r * n; col[i * 3 + 1] = c.g * n; col[i * 3 + 2] = c.b * n;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
volcano.position.set(0, 210, -950);
scene.add(volcano);
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI * 1.0 + 0.0;
  const rad = 1300 + R() * 700;
  const h = 160 + R() * 300, r = 320 + R() * 380;
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(R() * 3)), mountMat);
  const x = Math.cos(a) * rad * 1.35, z = -Math.sin(a) * rad - 400;
  if (Math.abs(x) < 450 && z < -700) continue; // keep the view to the volcano clear
  m.position.set(x, h / 2 - 8, z);
  m.rotation.y = R() * 3;
  scene.add(m);
}
// low foothills
for (let i = 0; i < 16; i++) {
  const h = 40 + R() * 70, r = 160 + R() * 160;
  const side = i % 2 ? 1 : -1;
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mountMat);
  m.position.set(side * (380 + R() * 700), h / 2 - 4, -480 - R() * 380);
  scene.add(m);
}

/* ---------- town ---------- */
const wallCols = [0xb5543a, 0xd8c7a0, 0x8a6a4a, 0x6d7f8c, 0xa94438, 0xc9a66b];
const wallMats = wallCols.map((c) => ashMat(c, 0.28, 7.6));
const roofMats = [0x4a3a35, 0x5b4a40, 0x38404a].map((c) => ashMat(c, 1.0, 6.6));
const winMat = new THREE.MeshBasicMaterial({ color: 0x3a4658, fog: true });
const houses = [];
{
  const r = rng(5);
  for (const side of [-1, 1]) {
    let z = -26 - r() * 6;
    while (z > -345) {
      const w = 11 + r() * 6, d = 11 + r() * 5, h = 7 + r() * 3.5;
      const g = new THREE.Group();
      const wm = wallMats[Math.floor(r() * wallMats.length)];
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm);
      wall.position.y = h / 2; wall.castShadow = true; wall.receiveShadow = true;
      const rh = 3.6 + r() * 2.2;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2 * w * 1.12, rh, 4), roofMats[Math.floor(r() * roofMats.length)]);
      roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; roof.position.y = h + rh / 2 - 0.05;
      roof.castShadow = true;
      g.add(wall, roof);
      // windows: street side + front
      const faceX = -side * (w / 2 + 0.05);
      for (const wz of [-d / 4, d / 4]) for (const wy of h > 9 ? [2.6, 6.2] : [3.4]) {
        const wmesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 1.9), winMat);
        wmesh.position.set(faceX, wy, wz); g.add(wmesh);
      }
      for (const wx of [-w / 4, w / 4]) for (const wy of h > 9 ? [2.6, 6.2] : [3.4]) {
        const wmesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.2), winMat);
        wmesh.position.set(wx, wy, d / 2 + 0.05); g.add(wmesh);
      }
      const x = side * (10.5 + w / 2 + r() * 3);
      g.position.set(x, 0, z);
      scene.add(g);
      houses.push({ g, x, z, w, d, h, hit: 0, wm, roof: roof.material });
      z -= d + 4 + r() * 6;
    }
  }
}

// street lamps
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0x555044 });
const lampLights = [];
{
  const poleM = new THREE.MeshLambertMaterial({ color: 0x2a2a2c });
  let n = 0;
  for (let z = -6; z > -160; z -= 34) for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 6), poleM);
    pole.position.set(s * 6.6, 3.75, z + (s > 0 ? -12 : 0)); pole.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.14), poleM);
    arm.position.set(s * 5.9, 7.4, pole.position.z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), lampBulbMat);
    bulb.position.set(s * 5.2, 7.2, pole.position.z);
    scene.add(pole, arm, bulb);
    if (n++ < 4) {
      const L = new THREE.PointLight(0xffb866, 0, 70, 2);
      L.position.copy(bulb.position).add(new THREE.Vector3(0, -0.4, 0));
      scene.add(L); lampLights.push(L);
    }
  }
}

/* ---------- balcony in the foreground ---------- */
{
  const dark = new THREE.MeshLambertMaterial({ color: 0x1d1c1e });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 0.16), dark);
  rail.position.set(0, 7.45, 14.2);
  scene.add(rail);
  for (let x = -6; x <= 6; x += 1.5) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), dark);
    post.position.set(x, 6.75, 14.2); scene.add(post);
  }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 0.4, 9), new THREE.MeshLambertMaterial({ color: 0x8a8074 }));
  deck.position.set(0, 6.8, 18.5);
  scene.add(deck);
}

/* ---------- forest (instanced) ---------- */
const TREES = 1100;
const treeData = [];
{
  const r = rng(77);
  while (treeData.length < TREES) {
    const x = (r() - 0.5) * 1500, z = 60 - r() * 960;
    if (Math.abs(x) < 34 && z > -350) continue;       // street corridor
    if (z > -350 && Math.abs(x) < 60 && r() < 0.8) continue; // keep yards sparse
    if (z > 40) continue;
    treeData.push({ x, z, s: 0.8 + r() * 1.1, hue: r() });
  }
}
const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 5), new THREE.MeshLambertMaterial({ color: 0x4a3626 }), TREES);
const crownMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
const crownMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(3.4, 12, 6), crownMat, TREES);
crownMesh.castShadow = true; trunkMesh.castShadow = true;
scene.add(trunkMesh, crownMesh);
const treeBase = treeData.map((t) => new THREE.Color().setHSL(0.27 + t.hue * 0.05, 0.38, 0.17 + t.hue * 0.08));

/* ---------- eruption: plume ---------- */
const PLUME_N = 1100;
const plumeData = [];
{
  const r = rng(303);
  for (let i = 0; i < PLUME_N; i++) {
    plumeData.push({ tb: 2 + r() * 4.8, a: r() * Math.PI * 2, u: Math.sqrt(r()), u2: r(), sz: 0.7 + r() * 0.9, tint: r() });
  }
}
const plumeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
const plume = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), plumeMat, PLUME_N);
plume.frustumCulled = false;
scene.add(plume);

// lava bombs
const BOMBS = 90;
const bombData = [];
{
  const r = rng(909);
  for (let i = 0; i < BOMBS; i++) {
    bombData.push({ tb: 2 + r() * 3.2, vx: (r() - 0.5) * 140, vy: 120 + r() * 180, vz: (r() - 0.35) * 150, s: 3 + r() * 6, w: r() * 9 });
  }
}
const bombs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xff7a22, fog: false }), BOMBS);
bombs.frustumCulled = false;
scene.add(bombs);

/* ---------- pyroclastic flow ---------- */
const FLOW_N = 800;
const flowData = [];
{
  const r = rng(404);
  for (let i = 0; i < FLOW_N; i++) {
    flowData.push({ dz: Math.pow(r(), 1.2) * 260, u: r() * 2 - 1, hy: Math.pow(r(), 1.4), s: 0.55 + r() * 0.9, tint: r() });
  }
}
const flowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, emissive: 0x3a1c0c });
const flowLight = new THREE.PointLight(0xff7a2a, 0, 0, 2);
scene.add(flowLight);
const flow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), flowMat, FLOW_N);
flow.frustumCulled = false;
scene.add(flow);
const FLOW_T0 = 4.0, FLOW_T1 = 7.3, FLOW_Z0 = -880, FLOW_Z1 = 16;
const flowFront = (t) => FLOW_Z0 + (FLOW_Z1 - FLOW_Z0) * Math.pow(clamp((t - FLOW_T0) / (FLOW_T1 - FLOW_T0)), 1.35);
function flowArrival(z) { // inverse of flowFront
  let lo = FLOW_T0, hi = FLOW_T1 + 2;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (flowFront(m) < z) lo = m; else hi = m; }
  return lo;
}

/* ---------- debris from collapsing houses ---------- */
const DEB_PER = 9;
const debris = [];
{
  const r = rng(1234);
  for (const h of houses) {
    h.hit = flowArrival(h.z);
    for (let k = 0; k < DEB_PER; k++) {
      debris.push({
        h, ox: (r() - 0.5) * h.w, oy: 1 + r() * h.h, oz: (r() - 0.5) * h.d,
        vx: (r() - 0.5) * 24, vy: 14 + r() * 34, vz: 18 + r() * 40,
        s: 0.7 + r() * 1.7, spin: (r() - 0.5) * 8, col: r() < 0.5 ? h.wm.color : h.roof.color,
      });
    }
  }
}
const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), debris.length);
debMesh.frustumCulled = false;
scene.add(debMesh);

/* ---------- falling ash ---------- */
const ASH_N = 7000;
const ashPos = new Float32Array(ASH_N * 3), ashSeed = [];
{
  const r = rng(555);
  for (let i = 0; i < ASH_N; i++) ashSeed.push([r() * 200 - 100, r() * 80, r() * 260 - 220, 4 + r() * 5, r() * 6.28]);
}
const ashGeo = new THREE.BufferGeometry();
ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
const sprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
})();
const ashPts = new THREE.Points(ashGeo, new THREE.PointsMaterial({ color: 0xd6d1c8, size: 0.3, map: sprite, transparent: true, opacity: 0, depthWrite: false }));
ashPts.frustumCulled = false;
scene.add(ashPts);

/* ---------- per-frame state update ---------- */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color();
const horC = new THREE.Color(), topC = new THREE.Color();

const SKY_H = [[0, 0xf2b27a], [2, 0xf2b27a], [3.5, 0xc07a52], [5, 0x9a6040], [7, 0x5c3e30], [9, 0x2b211d], [12, 0x3a3532], [13.5, 0x8c8a86], [17, 0x9a9894]];
const SKY_T = [[0, 0x6f98c9], [2, 0x6f98c9], [3.5, 0x4d5a70], [5, 0x2c3038], [7, 0x16171b], [9, 0x0e0e10], [12, 0x1e1f22], [13.5, 0x5e6064], [17, 0x6a6c70]];

function update(t) {
  /* sky / fog / lights */
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC);
  skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [3, 1], [5, 0.15], [7, 0], [13, 0], [14, 0.35], [17, 0.5]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00028], [2, 0.0003], [4, 0.0007], [6, 0.0014], [7, 0.0030], [8, 0.0042], [9, 0.0046], [11, 0.0038], [13, 0.0028], [14.5, 0.0033], [17, 0.0036]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [7, 1.1], [9, 1.55], [13, 1.35], [17, 1.2]]);
  sun.intensity = Math.PI * kf(t, [[0, 3.4], [3, 3.1], [4.5, 1.4], [6.5, 0.3], [8, 0.05], [13, 0.05], [13.6, 0.5], [17, 0.9]]);
  kfc(t, [[0, 0xffc48c], [4, 0xffb27a], [7, 0xcc9c80], [13, 0xcfcfcf], [17, 0xd8d8d8]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.25], [4, 0.95], [5.5, 0.85], [7.3, 0.7], [9, 0.5], [13, 1.0], [17, 1.15]]);
  hemi.color.copy(horC).lerp(topC, 0.5).lerp(tmpC.set(0xc07440), kf(t, [[3, 0], [4.5, 0.75], [7.3, 0.7], [9, 0.25], [11, 0]]));
  hemi.groundColor.set(0x4a3f30).lerp(tmpC.set(0x7a7873), smooth((t - 12) / 2));
  craterLight.intensity = kf(t, [[2, 0], [2.4, 2.4e5], [5, 1.6e5], [7, 6e4], [9, 0]]);
  const lampOn = smooth((t - 6.8) / 1.2);
  lampLights.forEach((L) => { L.intensity = lampOn * 700; });
  lampBulbMat.color.set(0x555044).lerp(tmpC.set(0xffd592), lampOn);
  winMat.color.set(0x3a4658).lerp(tmpC.set(0xffbd6a), smooth((t - 6.6) / 1.6)).lerp(tmpC.set(0x5a5650), smooth((t - 12.5) / 1.5));
  glCanvas.style.filter = `saturate(${kf(t, [[0, 1.05], [5, 0.85], [9, 0.8], [12.5, 0.8], [14, 0.32], [17, 0.28]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [8, 1.1], [14, 1.0]]).toFixed(3)})`;

  /* ash accumulation on materials */
  for (const a of ashTargets) {
    const f = smooth((t - a.start) / 3.2) * a.k;
    a.mat.color.copy(a.base).lerp(ASH, f);
  }
  ground.position.y = 1.0 * smooth((t - 7.2) / 4) - 0.0;

  /* camera */
  const pitch = kf(t, [[0, 3], [1.8, 3.5], [2.4, 6], [3.2, 30], [4.0, 39], [4.7, 24], [5.5, 7], [7, 5], [8, 9], [10, 13], [13, 8], [17, 5]]);
  const yaw = kf(t, [[0, 0.5], [2, 0], [4, -1], [6, 1], [8, -2], [12, 2], [17, 0]]);
  const amp = kf(t, [[0, 0.01], [1.4, 0.03], [2, 0.14], [2.7, 0.4], [4, 0.32], [4.6, 0.3], [6, 0.7], [7.3, 1.25], [8.6, 0.45], [10, 0.07], [13, 0.03], [17, 0.0]]);
  const sh = (a, b) => Math.sin(t * a + b);
  camera.position.set(
    amp * 0.16 * (sh(41, 1) + 0.6 * sh(23, 2)),
    9 + amp * 0.12 * (sh(37, 0) + 0.5 * sh(19, 4)), 22);
  camera.rotation.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = THREE.MathUtils.degToRad(yaw) + amp * 0.0035 * sh(29, 3);
  camera.rotation.x = THREE.MathUtils.degToRad(pitch) + amp * 0.004 * sh(33, 5);
  camera.rotation.z = amp * 0.008 * sh(17, 6);

  /* plume */
  for (let i = 0; i < PLUME_N; i++) {
    const p = plumeData[i], a = t - p.tb;
    if (a < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); dummy.updateMatrix(); plume.setMatrixAt(i, dummy.matrix); continue; }
    const h = CRATER.y + 1950 * (1 - Math.exp(-a * 0.78));
    const colR = 36 + (h - CRATER.y) * 0.075 + 90 * clamp(a * 0.2);
    const s = smooth((h - 1450) / 800);
    const umbR = (150 + 1500 * p.u2) * clamp(a * 0.55);
    const r = lerp(colR * p.u, umbR * (0.35 + 0.65 * p.u), s);
    const drift = a * (20 + 60 * s);
    dummy.position.set(Math.cos(p.a) * r, h + (s > 0 ? (p.u2 - 0.5) * 160 : 0), CRATER.z + Math.sin(p.a) * r + drift);
    const sz = (26 + a * 24 + (h - CRATER.y) * 0.03) * p.sz * (1 + s * 0.7);
    dummy.scale.setScalar(sz);
    dummy.rotation.set(p.a, p.u2 * 6, 0);
    dummy.updateMatrix(); plume.setMatrixAt(i, dummy.matrix);
    const hot = clamp(1 - a / 1.6);
    tmpC.setRGB(0.24, 0.215, 0.2).lerp(_ca.setRGB(0.36, 0.33, 0.3), p.tint * clamp((h - 900) / 1200)).lerp(_cb.setRGB(1.0, 0.36, 0.08), hot * 0.9);
    plume.setColorAt(i, tmpC);
  }
  plume.instanceMatrix.needsUpdate = true; if (plume.instanceColor) plume.instanceColor.needsUpdate = true;

  /* lava bombs */
  for (let i = 0; i < BOMBS; i++) {
    const b = bombData[i], a = t - b.tb;
    if (a < 0 || a > 6) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      dummy.position.set(CRATER.x + b.vx * a, Math.max(2, CRATER.y + b.vy * a - 0.5 * 55 * a * a), CRATER.z + b.vz * a);
      dummy.scale.setScalar(b.s * (1 - clamp((a - 3.5) / 2.5) * 0.6));
      dummy.rotation.set(a * b.w, a * b.w * 0.7, 0);
    }
    dummy.updateMatrix(); bombs.setMatrixAt(i, dummy.matrix);
  }
  bombs.instanceMatrix.needsUpdate = true;

  /* pyroclastic flow */
  const f = flowFront(t);
  const flowOn = t >= FLOW_T0 - 0.2;
  flowMat.opacity = 1 - smooth((t - 6.85) / 0.75);
  flow.visible = flowOn && flowMat.opacity > 0.01;
  flowLight.position.set(0, 45, f + 40);
  flowLight.intensity = flow.visible ? kf(t, [[4, 0], [4.6, 3e5], [7, 5e5], [8, 0]]) : 0;
  if (flow.visible) {
    const spread = 90 + Math.max(0, -(f - 20)) * 0.42;
    for (let i = 0; i < FLOW_N; i++) {
      const p = flowData[i];
      const sz = (44 + (f + 950) * 0.09) * p.s;
      dummy.position.set(p.u * spread, sz * 0.45 + p.hy * (110 + (f + 950) * 0.26), f - p.dz);
      dummy.scale.set(sz * 1.15, sz * 0.85, sz);
      dummy.rotation.set(0, i, 0);
      dummy.updateMatrix(); flow.setMatrixAt(i, dummy.matrix);
      flow.setColorAt(i, tmpC.setRGB(0.42, 0.35, 0.3).lerp(_ca.setRGB(0.7, 0.6, 0.52), p.tint));
    }
    flow.instanceMatrix.needsUpdate = true; if (flow.instanceColor) flow.instanceColor.needsUpdate = true;
  }

  /* houses collapse */
  for (const h of houses) {
    const p = clamp((f - h.z) / 36) * (t < FLOW_T0 ? 0 : 1);
    h.g.rotation.x = p * 0.95 * (h.x > 0 ? 1 : 0.85);
    h.g.rotation.z = p * 0.12 * (h.x > 0 ? 1 : -1);
    h.g.position.y = -p * 3.2;
    h.g.position.z = h.z + p * 14;
    h.g.scale.y = 1 - 0.55 * p;
  }
  for (let i = 0; i < debris.length; i++) {
    const d = debris[i], s = t - d.h.hit;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const y = d.oy + d.vy * s - 0.5 * 34 * s * s;
      dummy.position.set(d.h.x + d.ox + d.vx * s, Math.max(0.4, y), Math.min(14, d.h.z + d.oz + d.vz * s));
      dummy.scale.setScalar(d.s);
      dummy.rotation.set(s * d.spin, s * d.spin * 0.6, s * d.spin * 0.3);
    }
    dummy.updateMatrix(); debMesh.setMatrixAt(i, dummy.matrix);
    debMesh.setColorAt(i, d.col);
  }
  debMesh.instanceMatrix.needsUpdate = true; debMesh.instanceColor.needsUpdate = true;

  /* trees */
  const ashK = smooth((t - 7.5) / 3) * 0.85;
  for (let i = 0; i < TREES; i++) {
    const tr = treeData[i];
    const p = t < FLOW_T0 ? 0 : clamp((f - tr.z) / 44);
    const sway = Math.sin(t * 1.3 + i) * 0.015 * (1 - p);
    // crown
    dummy.position.set(tr.x + p * 0, 3 + 6 * tr.s, tr.z);
    dummy.rotation.set(p * 1.5 + sway, 0, 0);
    dummy.position.set(tr.x, (3 + 6 * tr.s) * (1 - p * 0.75), tr.z + p * 28 * tr.s);
    dummy.scale.set(tr.s, tr.s, tr.s);
    dummy.updateMatrix(); crownMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tr.x, 1.5 * tr.s * (1 - p * 0.7), tr.z + p * 10 * tr.s);
    dummy.rotation.set(p * 1.5, 0, 0);
    dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix);
    crownMesh.setColorAt(i, tmpC.copy(treeBase[i]).lerp(ASH, ashK));
  }
  crownMesh.instanceMatrix.needsUpdate = true; trunkMesh.instanceMatrix.needsUpdate = true; crownMesh.instanceColor.needsUpdate = true;

  /* falling ash */
  ashPts.material.opacity = kf(t, [[5.5, 0], [7.5, 0.85], [13, 0.9], [17, 0.9]]);
  ashPts.visible = ashPts.material.opacity > 0.01;
  if (ashPts.visible) {
    const tt = Math.max(0, t - 5.5);
    for (let i = 0; i < ASH_N; i++) {
      const s = ashSeed[i];
      ashPos[i * 3] = s[0] + Math.sin(tt * 0.6 + s[4]) * 2.5 + tt * 3;
      ashPos[i * 3 + 1] = ((s[1] - tt * s[3]) % 80 + 80) % 80;
      ashPos[i * 3 + 2] = s[2] + Math.cos(tt * 0.5 + s[4]) * 1.5;
    }
    ashGeo.attributes.position.needsUpdate = true;
    // wrap x
    for (let i = 0; i < ASH_N; i++) ashPos[i * 3] = ((ashPos[i * 3] + 100) % 200 + 200) % 200 - 100;
  }
}

/* ------------------------------------------------------------------ *
 *  US map (beat 5)
 * ------------------------------------------------------------------ */
const mapCanvas = document.getElementById('map');
const mctx = mapCanvas.getContext('2d');
mapCanvas.width = innerWidth * DPR; mapCanvas.height = innerHeight * DPR;
const US = [[-124.7,48.4],[-123.2,48.2],[-122.8,49],[-95.2,49],[-94.6,48.7],[-93,48.6],[-91.4,48.1],[-89.6,48.0],[-88.4,48.3],[-84.8,46.9],[-83.0,46.0],[-82.5,43.0],[-83.1,42.0],[-79.0,42.8],[-79.0,43.3],[-76.5,43.6],[-75,44.9],[-71.5,45.0],[-70.2,46.5],[-69.2,47.4],[-67.8,47.0],[-67.0,44.8],[-70.0,43.7],[-70.7,42.7],[-70.0,41.8],[-71.5,41.4],[-73.7,40.9],[-74.0,40.5],[-74.1,39.7],[-75.0,38.8],[-75.5,37.5],[-76.0,36.9],[-75.5,35.3],[-77.5,34.5],[-79.0,33.5],[-81.0,32.0],[-81.4,30.5],[-80.0,26.8],[-80.4,25.2],[-81.2,25.3],[-82.6,27.5],[-83.0,29.0],[-84.0,30.1],[-86.5,30.4],[-88.0,30.3],[-89.5,30.2],[-89.2,29.0],[-91.0,29.2],[-93.8,29.7],[-95.0,29.0],[-97.2,27.8],[-97.2,26.0],[-99.1,26.4],[-100.5,28.5],[-101.5,29.8],[-103.0,29.0],[-104.5,29.7],[-106.5,31.8],[-108.2,31.8],[-108.2,31.3],[-111.0,31.3],[-114.8,32.5],[-117.1,32.5],[-118.5,34.0],[-120.6,34.6],[-121.9,36.6],[-122.5,37.8],[-123.8,39.5],[-124.3,40.4],[-124.1,42.0],[-124.5,43.0],[-124.0,46.2]];
const YS = [-110.6, 44.4];
function drawMap(t) {
  const W = mapCanvas.width, H = mapCanvas.height;
  const op = smooth((t - 9.85) / 0.5) * (1 - smooth((t - 13.0) / 0.45));
  mapCanvas.style.opacity = op;
  if (op <= 0.001) return;
  const k = clamp((t - 10.1) / 2.9);
  const e = easeOut(k);
  // projection: equirectangular scaled by cos(lat)
  const cosL = Math.cos((38 * Math.PI) / 180);
  const spanX = (125 - 66.5) * cosL, spanY = 50 - 24.5;
  const mw = W * 0.9, scale = mw / spanX, mh = spanY * scale;
  const ox = (W - mw) / 2, oy = H * 0.2;
  const px = (lon) => ox + (lon + 125) * cosL * scale;
  const py = (lat) => oy + (50 - lat) * scale;
  mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = '#0a0c11'; mctx.fillRect(0, 0, W, H);
  // faint graticule
  mctx.strokeStyle = 'rgba(120,140,170,.07)'; mctx.lineWidth = 1 * DPR;
  for (let lon = -125; lon <= -65; lon += 5) { mctx.beginPath(); mctx.moveTo(px(lon), oy - 20 * DPR); mctx.lineTo(px(lon), oy + mh + 20 * DPR); mctx.stroke(); }
  for (let lat = 25; lat <= 50; lat += 5) { mctx.beginPath(); mctx.moveTo(ox - 10 * DPR, py(lat)); mctx.lineTo(ox + mw + 10 * DPR, py(lat)); mctx.stroke(); }
  // country
  mctx.beginPath();
  US.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la))));
  mctx.closePath();
  mctx.fillStyle = '#171c27'; mctx.fill();
  mctx.strokeStyle = 'rgba(160,178,205,.45)'; mctx.lineWidth = 1.2 * DPR; mctx.stroke();
  // ash plume: stretched ellipse drifting east
  const cx = px(YS[0]), cy = py(YS[1]);
  const Rr = e * mw * 0.4;
  mctx.save();
  mctx.translate(cx, cy);
  mctx.scale(1, 0.8);
  const g = mctx.createRadialGradient(0, 0, 0, Rr * 0.95, 0, Rr);
  g.addColorStop(0, 'rgba(226,200,168,.92)');
  g.addColorStop(0.5, 'rgba(180,154,128,.58)');
  g.addColorStop(0.85, 'rgba(120,106,96,.26)');
  g.addColorStop(1, 'rgba(90,80,74,0)');
  mctx.fillStyle = g;
  mctx.beginPath(); mctx.arc(Rr * 0.95, 0, Rr, 0, Math.PI * 2); mctx.fill();
  mctx.restore();
  // re-stroke country on top so the outline stays crisp under ash
  mctx.beginPath();
  US.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la))));
  mctx.closePath(); mctx.strokeStyle = 'rgba(200,214,235,.5)'; mctx.lineWidth = 1.2 * DPR; mctx.stroke();
  // Yellowstone marker
  const pulse = 1 + 0.25 * Math.sin(t * 7);
  mctx.fillStyle = '#ff6a2a';
  mctx.beginPath(); mctx.arc(cx, cy, 5.5 * DPR * pulse, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = 'rgba(255,106,42,.5)'; mctx.lineWidth = 1.5 * DPR;
  mctx.beginPath(); mctx.arc(cx, cy, 12 * DPR * pulse, 0, Math.PI * 2); mctx.stroke();
  mctx.fillStyle = 'rgba(244,239,230,.85)';
  mctx.font = `700 ${10.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  mctx.textAlign = 'left';
  mctx.fillText('YELLOWSTONE', cx - 22 * DPR, cy - 20 * DPR);
  // cities light up as the ash reaches them
  const CITIES = [['Denver', -104.99, 39.74], ['Minneapolis', -93.27, 44.98], ['Dallas', -96.8, 32.78], ['Chicago', -87.63, 41.88], ['New York', -74.0, 40.71], ['Los Angeles', -118.24, 34.05]];
  mctx.font = `600 ${9.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  for (const [name, lo, la] of CITIES) {
    const x = px(lo), y = py(la);
    const ex = (x - (cx + Rr * 0.95)) / Rr, ey = (y - cy) / (0.8 * Rr);
    const hit = ex * ex + ey * ey < 0.8 && Rr > 4;
    mctx.fillStyle = hit ? '#ff7a35' : 'rgba(200,214,235,.7)';
    mctx.beginPath(); mctx.arc(x, y, (hit ? 3.6 : 2.6) * DPR, 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = hit ? 'rgba(255,214,190,.95)' : 'rgba(200,214,235,.55)';
    mctx.textAlign = 'center';
    mctx.fillText(name.toUpperCase(), x, y + 14 * DPR);
  }
  mctx.textAlign = 'left';
  mctx.fillStyle = 'rgba(244,239,230,.5)';
  mctx.fillText('ASH CLOUD SPREAD', ox, oy - 22 * DPR);
}

/* ------------------------------------------------------------------ *
 *  HUD / captions
 * ------------------------------------------------------------------ */
const elTitle = document.getElementById('title');
const hud = document.getElementById('hud');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const cap = document.getElementById('caption');
const end = document.getElementById('end');

function fmtElapsed(t) {
  if (t < 2) return 'A quiet afternoon';
  const E = Math.exp(Math.log(1.6e7) * clamp((t - 2) / 12));
  if (E < 60) return `T + ${Math.max(1, Math.round(E))} sec`;
  if (E < 3600) return `T + ${Math.round(E / 60)} min`;
  if (E < 86400) return `T + ${Math.round(E / 3600)} hours`;
  if (E < 86400 * 60) return `T + ${Math.round(E / 86400)} days`;
  return `T + ${Math.round(E / (86400 * 30))} months`;
}
const BEATS = [
  { a: 0, b: 2, label: 'Ground', value: () => 'Rising', cap: 'The ground has been rising for years.' },
  { a: 2, b: 4, label: 'Plume height', value: (k) => `${Math.round(30 * easeOut(k * 1.1))} mi`, cap: 'It throws a mountain into the sky.' },
  { a: 4, b: 7, label: 'Flow speed', value: (k) => `${Math.round(lerp(150, 450, smooth(k)))} mph`, cap: 'Nothing outruns it.' },
  { a: 7, b: 10, label: 'Ash depth', value: (k) => `${(3 * smooth(k)).toFixed(1)} ft`, cap: "By afternoon it's night." },
  { a: 10, b: 13, label: 'Sunlight', value: (k) => `${Math.round(100 - 40 * smooth(k))}%`, cap: 'Crops fail across the Midwest.' },
  { a: 13, b: 15, label: 'Global temperature', value: (k) => `−${Math.round(10 * smooth(k))} °F`, cap: 'Volcanic winter. Years of it.' },
];
function updateOverlay(t) {
  // title
  elTitle.style.opacity = smooth(t / 0.5) * (1 - smooth((t - 2.15) / 0.5));
  // HUD
  const beat = BEATS.find((b) => t >= b.a && t < b.b) || BEATS[BEATS.length - 1];
  const k = clamp((t - beat.a) / (beat.b - beat.a));
  hLabel.textContent = beat.label;
  hValue.textContent = beat.value(k);
  hSub.textContent = fmtElapsed(t);
  const sw = Math.min(smooth((t - beat.a) / 0.25), 1 - smooth((t - (beat.b - 0.12)) / 0.12));
  hud.style.opacity = (t < 15 ? Math.max(sw, 0.0) : 1 - smooth((t - 15) / 0.3)) * smooth((t - 0.3) / 0.4);
  // caption
  const cs = beat.a + (beat.a === 0 ? 0.5 : 0.15), ce = beat.b - 0.05;
  cap.textContent = beat.cap;
  const co = smooth((t - cs) / 0.35) * (1 - smooth((t - (ce - 0.3)) / 0.3));
  cap.style.opacity = t < 15 ? co : 0;
  cap.style.transform = `translateY(${(1 - smooth((t - cs) / 0.35)) * 6}px)`;
  // end card
  end.style.opacity = smooth((t - 14.8) / 0.5);
  end.querySelector('.a').style.opacity = smooth((t - 15.1) / 0.45);
  end.querySelector('.b').style.opacity = smooth((t - 15.6) / 0.45);
  end.querySelector('.c').style.opacity = smooth((t - 16.1) / 0.5) * 0.9;
}

/* film grain */
{
  const g = document.getElementById('grain'), c = g.getContext('2d');
  const id = c.createImageData(256, 256);
  const r = rng(99);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  g.style.width = '100%'; g.style.height = '100%';
}

/* ---------- public API ---------- */
function renderAt(t) {
  t = clamp(t, 0, T_END);
  update(t);
  renderer.render(scene, camera);
  drawMap(t);
  updateOverlay(t);
}
window.renderAt = renderAt;
window.dbg = { scene, flow, ground, volcano, plume, renderer, camera, sky };
window.T_END = T_END;
window.READY = true;

if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) {
  const t0 = performance.now();
  const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); };
  loop();
}
