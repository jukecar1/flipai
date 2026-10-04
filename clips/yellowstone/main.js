import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ *
 *  "What if Yellowstone erupted?"  — deterministic 17s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 *
 *  Setting: the Upper Geyser Basin seen from a boardwalk overlook —
 *  thermal pools, Old Faithful, tourists, bison and a log lodge, with
 *  the eruption rising behind the forested hills.
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
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const wrap = document.getElementById('sceneWrap');
const accCanvas = document.getElementById('acc');
accCanvas.width = innerWidth * DPR; accCanvas.height = innerHeight * DPR;
const actx = accCanvas.getContext('2d');
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: 4 }));
composer.setSize(innerWidth * DPR, innerHeight * DPR);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * DPR, innerHeight * DPR), 0.15, 0.4, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- sky ---------- */
const SUN_DIR = new THREE.Vector3(-0.58, 0.36, 0.62).normalize(); // low golden sun, behind-left of the camera
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
scene.add(new THREE.Mesh(new THREE.SphereGeometry(6000, 24, 16), skyMat));


/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0xaac8ee, 0x6a6a44, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 3);
sun.position.copy(SUN_DIR).multiplyScalar(520).add(new THREE.Vector3(0, 0, -60));
sun.target.position.set(0, 0, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 1, far: 1300 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);

const CRATER = new THREE.Vector3(0, 450, -1400);
const craterLight = new THREE.PointLight(0xff6a20, 0, 0, 2);
craterLight.position.set(0, 500, -1380);
scene.add(craterLight);

/* ---------- materials that gather ash ---------- */
const ashTargets = [];
const ASH = new THREE.Color(0xa09e98);
function ashMat(color, k, start = 7, extra = {}) {
  const m = new THREE.MeshLambertMaterial({ color, ...extra });
  ashTargets.push({ mat: m, base: new THREE.Color(color), k, start });
  return m;
}

/* ------------------------------------------------------------------ *
 *  Procedural textures
 * ------------------------------------------------------------------ */
const hexRGB = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const shade = (h, f) => { const [r, g, b] = hexRGB(h); return `rgb(${Math.min(255, r * f) | 0},${Math.min(255, g * f) | 0},${Math.min(255, b * f) | 0})`; };
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// horizontal log wall, 6m x 4m tile with two windows
function makeLogWall(seed, base) {
  const rand = rng(seed);
  const c = mkCanvas(512, 340), e = mkCanvas(512, 340);
  const x = c.getContext('2d'), ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 340);
  const rows = 14, rh = 340 / rows;
  for (let r = 0; r < rows; r++) {
    const g = x.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
    const j = 0.82 + rand() * 0.3;
    g.addColorStop(0, shade(base, j * 1.12)); g.addColorStop(0.5, shade(base, j)); g.addColorStop(1, shade(base, j * 0.62));
    x.fillStyle = g; x.fillRect(0, r * rh, 512, rh);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, (r + 1) * rh - 2, 512, 2);
    for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(rand() * 512, r * rh + rand() * rh, 30 + rand() * 60, 1.5); }
  }
  for (const wx of [70, 330]) {
    const wy = 112, ww = 112, wh = 128;
    x.fillStyle = '#d9cdb2'; x.fillRect(wx - 10, wy - 10, ww + 20, wh + 20);
    const gr = x.createLinearGradient(wx, wy, wx + ww * 0.6, wy + wh); gr.addColorStop(0, '#a9c2d4'); gr.addColorStop(1, '#2d3d4c');
    x.fillStyle = gr; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = '#d9cdb2'; x.fillRect(wx + ww / 2 - 3, wy, 6, wh); x.fillRect(wx, wy + wh * 0.4, ww, 5);
    if (rand() < 0.65) { ex.fillStyle = `rgb(255,${180 + (rand() * 30) | 0},${100 + (rand() * 30) | 0})`; ex.fillRect(wx, wy, ww, wh); }
  }
  return { map: toTex(c), emissiveMap: toTex(e) };
}
const logDebrisTex = (() => {
  const c = mkCanvas(128, 64), x = c.getContext('2d'), r = rng(5);
  for (let i = 0; i < 4; i++) { const g = x.createLinearGradient(0, i * 16, 0, i * 16 + 16); g.addColorStop(0, '#9a7447'); g.addColorStop(1, '#4b3520'); x.fillStyle = g; x.fillRect(0, i * 16, 128, 16); }
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(r() * 128, r() * 64, 20 + r() * 30, 1.5); }
  return toTex(c);
})();
const deckTex = (() => {
  const c = mkCanvas(256, 128), x = c.getContext('2d'), r = rng(6);
  for (let i = 0; i < 8; i++) {
    const j = 0.85 + r() * 0.3;
    x.fillStyle = shade(0x9b7a55, j); x.fillRect(0, i * 16, 256, 16);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, i * 16 + 14, 256, 2);
    for (let k = 0; k < 14; k++) { x.fillStyle = 'rgba(40,25,10,.16)'; x.fillRect(r() * 256, i * 16 + r() * 14, 16 + r() * 50, 1); }
  }
  return toTex(c);
})();
const poolTex = (() => {
  const c = mkCanvas(512, 512), x = c.getContext('2d'), r = rng(3);
  const rings = [['#7f4a26', 1.0], ['#c9702a', 0.93], ['#e2b640', 0.84], ['#a6cc58', 0.73], ['#33b2a6', 0.6], ['#1c8cc4', 0.42], ['#0e4a86', 0.22]];
  const ph = [r() * 6, r() * 6, r() * 6];
  for (const [col, k] of rings) {
    x.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const j = 1 + 0.045 * Math.sin(a * 3 + ph[0]) + 0.03 * Math.sin(a * 5 + ph[1]) + 0.02 * Math.sin(a * 9 + ph[2]);
      const rr = 250 * k * j;
      i ? x.lineTo(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr) : x.moveTo(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr);
    }
    x.fillStyle = col; x.fill();
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
})();

/* ------------------------------------------------------------------ *
 *  Terrain (geyser basin ringed by forested hills)
 * ------------------------------------------------------------------ */
const hash2 = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, z * 4.3) * 0.17;
function hAt(x, z) {
  const d = Math.hypot(x * 0.75, z + 110);
  const rim = smooth((d - 230) / 520);
  return rim * (60 + fbm(x * 0.006, z * 0.006) * 120) + smooth((d - 110) / 160) * fbm(x * 0.02, z * 0.02) * 5;
}
const POOLS = [[-70, -135, 40], [64, -108, 30], [-38, -195, 24], [30, -30, 11], [-22, -26, 8]];
const GEYSER = new THREE.Vector3(88, 0, -170);
const LODGE = new THREE.Vector3(-58, 0, -48);
const nearPool = (x, z, pad = 0) => POOLS.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + pad);

const grassTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(14);
  x.fillStyle = '#d9d9cf'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) { const v = 150 + r() * 105; x.fillStyle = `rgba(${v},${v - 6},${v - 30},${0.25 + r() * 0.4})`; x.fillRect(r() * 256, r() * 256, 1 + r() * 2, 2 + r() * 5); }
  for (let i = 0; i < 240; i++) { x.fillStyle = `rgba(70,60,40,${0.07 + r() * 0.08})`; x.beginPath(); x.arc(r() * 256, r() * 256, 3 + r() * 9, 0, 6.3); x.fill(); }
  const t = toTex(c); t.repeat.set(240, 240); return t;
})();
const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: grassTex });
const terrainGeo = new THREE.PlaneGeometry(2600, 2600, 220, 220);
terrainGeo.rotateX(-Math.PI / 2);
terrainGeo.translate(0, 0, -350);
{
  const pos = terrainGeo.attributes.position, col = new Float32Array(pos.count * 3);
  const pale = new THREE.Color(0x9a9658), sage = new THREE.Color(0x66763f), sinter = new THREE.Color(0xcfc9b2), forest = new THREE.Color(0x27432a), rock = new THREE.Color(0x77736a), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = hAt(x, z);
    pos.setY(i, h);
    const n = fbm(x * 0.04, z * 0.04);
    c.copy(pale).lerp(sage, n).lerp(_cb.set(0x4d6130), smooth((fbm(x * 0.013 + 9, z * 0.013) - 0.5) * 4) * 0.55);
    let pd = 1e9; for (const [px, pz, r] of POOLS) pd = Math.min(pd, Math.hypot(x - px, z - pz) / r);
    c.lerp(sinter, smooth(1 - (pd - 0.95) / 0.9) * 0.85);
    c.lerp(forest, smooth((h - 6) / 36));
    c.lerp(rock, smooth((h - 85) / 45));
    const j = 0.92 + 0.16 * hash2(Math.round(x / 6), Math.round(z / 6));
    col[i * 3] = c.r * j; col[i * 3 + 1] = c.g * j; col[i * 3 + 2] = c.b * j;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  terrainGeo.computeVertexNormals();
}
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.receiveShadow = true;
scene.add(terrain);
const ashLayer = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ color: 0xb4b2ac, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
ashLayer.position.y = 0.12; ashLayer.receiveShadow = true;
scene.add(ashLayer);
const farGround = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: 0x4f6240 }));
farGround.rotation.x = -Math.PI / 2; farGround.position.y = -1.5;
scene.add(farGround);

// thermal pools
const poolMats = [];
for (const [px, pz, r] of POOLS) {
  const m = ashMat(0xffffff, 0.92, 7.2, { map: poolTex, transparent: true });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.06, 72), m);
  pool.rotation.x = -Math.PI / 2; pool.position.set(px, 0.08, pz);
  scene.add(pool);
}
for (const [px, pz, r] of POOLS) {
  const rim = new THREE.Mesh(new THREE.RingGeometry(r * 1.0, r * 1.22, 72, 1), ashMat(0xcfc9b0, 0.9, 7.2));
  rim.rotation.x = -Math.PI / 2; rim.position.set(px, 0.045, pz); rim.receiveShadow = true;
  scene.add(rim);
}
// Old Faithful's sinter cone
const moundMat = ashMat(0xcfc9b6, 0.9, 7.2);
const mound = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 15, 3.6, 18), moundMat);
mound.position.set(GEYSER.x, 1.7, GEYSER.z); mound.receiveShadow = true; mound.castShadow = true;
scene.add(mound);

/* ---------- distant mountains + the volcano ---------- */
const mountMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const R = rng(11);
function rugged(geo, lo, mid, hi, snowAmt, yMin, yMax, jit = 0.14) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), snow = new THREE.Color(0xdfe3ea);
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i);
    const h = (y0 - yMin) / (yMax - yMin);
    const ang = Math.atan2(z0, x0), j = hash2(Math.round(ang * 40), Math.round(y0 / 30)) - 0.5;
    const rad = Math.hypot(x0, z0) * (1 + j * jit * (1 - h * 0.5));
    pos.setXYZ(i, Math.cos(ang) * rad, y0 + j * 26 * (1 - h), Math.sin(ang) * rad);
    if (h < 0.4) c.set(lo).lerp(_ca.set(mid), h / 0.4); else c.set(mid).lerp(_ca.set(hi), (h - 0.4) / 0.6);
    if (snowAmt && h > 0.8) c.lerp(snow, (h - 0.8) / 0.2 * snowAmt);
    const n = 0.88 + 0.24 * hash2(Math.round(ang * 40), Math.round(y0 / 30) + 7);
    col[i * 3] = c.r * n; col[i * 3 + 1] = c.g * n; col[i * 3 + 2] = c.b * n;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
}
const volcanoGeo = new THREE.CylinderGeometry(120, 760, 450, 14, 5);
rugged(volcanoGeo, 0x244029, 0x57534b, 0x8a867e, 0.55, -225, 225);
const volcanoMat = ashMat(0xffffff, 0.5, 8, { flatShading: true, vertexColors: true });
const volcano = new THREE.Mesh(volcanoGeo, volcanoMat);
volcano.position.set(0, 225, -1400);
scene.add(volcano);
for (let i = 0; i < 26; i++) {
  const a = (i / 26) * Math.PI, rad = 1500 + R() * 800, h = 220 + R() * 360, r = 380 + R() * 420;
  const x = Math.cos(a) * rad * 1.3, z = -Math.sin(a) * rad - 300;
  if (Math.abs(x) < 600 && z < -900) continue;
  const g = new THREE.ConeGeometry(r, h, 8, 3);
  g.translate(0, h / 2, 0);
  rugged(g, 0x2d4a30, 0x5f5e55, 0x8a8880, 0.8, 0, h);
  const m = new THREE.Mesh(g, mountMat);
  m.position.set(x, -10, z); m.rotation.y = R() * 3; scene.add(m);
}

/* ------------------------------------------------------------------ *
 *  Boardwalk + our observation platform
 * ------------------------------------------------------------------ */
const woodMat = ashMat(0x6a4a2c, 0.8, 7.2);
const deckMat = ashMat(0xffffff, 0.9, 7.2, { map: deckTex });
const boardSegs = [];
{
  for (let zc = 14; zc > -140; zc -= 8) {
    const g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 8), deckMat);
    const uv = deck.geometry.attributes.uv;
    for (let i = 8; i < 12; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 5); // top face planks
    deck.position.y = 0.6; deck.castShadow = true; deck.receiveShadow = true;
    g.add(deck);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 8), woodMat); rail.position.set(s * 1.5, 1.65, 0);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 8), woodMat); mid.position.set(s * 1.5, 1.2, 0);
      rail.castShadow = true;
      g.add(rail, mid);
      for (const pz of [-3.8, 0, 3.8]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), woodMat); post.position.set(s * 1.5, 1.15, pz); post.castShadow = true; g.add(post);
      }
    }
    for (const pz of [-3, 3]) for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), woodMat); leg.position.set(s * 1.4, 0.3, pz); g.add(leg);
    }
    g.position.set(0, 0, zc);
    scene.add(g);
    boardSegs.push({ g, x: 0, y: 0, z: zc, kind: 'plank', k: 0.7, spin: hash2(zc, 3) * 2 - 1 });
  }
}
{ // overlook platform with railing (foreground, like the reference's balcony rail)
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 10), deckMat);
  const uv = deck.geometry.attributes.uv;
  for (let i = 8; i < 12; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 5);
  deck.position.set(-1, 3.6, 30.5); deck.receiveShadow = true; deck.castShadow = true;
  g.add(deck);
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(16, 0.14, 0.2), woodMat); railTop.position.set(-1, 4.75, 26);
  const railMid = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 0.12), woodMat); railMid.position.set(-1, 4.2, 26);
  g.add(railTop, railMid);
  for (let x = -8.6; x <= 6.7; x += 0.75) {
    const bal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), woodMat); bal.position.set(x, 4.25, 26); g.add(bal);
  }
  for (const x of [-8.6, 6.6]) for (const z of [25.8, 35.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 0.4), woodMat); leg.position.set(x, 1.8, z); g.add(leg);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
}

/* ------------------------------------------------------------------ *
 *  Log lodge + cabins
 * ------------------------------------------------------------------ */
const logSets = [0x7b5532, 0x6a4a2c, 0x8a6840].map((c, i) => makeLogWall(300 + i, c));
const litMat = (set, k) => {
  const m = new THREE.MeshLambertMaterial({ map: set.map, emissive: 0xffffff, emissiveMap: set.emissiveMap, emissiveIntensity: 0 });
  ashTargets.push({ mat: m, base: new THREE.Color(0xffffff), k, start: 7.5, light: true }); return m;
};
const logMats = logSets.map((s) => litMat(s, 0.4));
const roofMat = ashMat(0x4a3d33, 0.95, 6.7);
const stoneMat = ashMat(0x8b8780, 0.7, 7.2);
const TILE_W = 6, TILE_H = 4;
function texBox(w, h, d, sideMat, topMat, tileW, tileH) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const side = f < 2 || f > 3, [fw, fh] = dims[f];
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * fw / (side ? tileW : 8), uv.getY(k) * fh / (side ? tileH : 8)); }
  }
  const m = new THREE.Mesh(g, [sideMat, sideMat, topMat, topMat, sideMat, sideMat]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function gable(w, d, h, mat) { // ridge along x
  const s = new THREE.Shape(); s.moveTo(-d / 2 - 1.2, 0); s.lineTo(d / 2 + 1.2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w + 2, bevelEnabled: false });
  g.translate(0, 0, -(w + 2) / 2); g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
const buildings = [];
function addBuilding(x, z, w, d, h, rotY, matIdx, roofH, front) {
  const g = new THREE.Group();
  const body = texBox(w, h, d, logMats[matIdx], roofMat, TILE_W, TILE_H);
  body.position.y = h / 2;
  const roof = gable(w, d, roofH, roofMat);
  roof.position.y = h;
  g.add(body, roof);
  if (front) { // stone chimney
    const ch = new THREE.Mesh(new THREE.BoxGeometry(2.4, roofH + 6, 2.4), stoneMat);
    ch.position.set(w * 0.28, h + (roofH + 6) / 2 - 1.5, 0); ch.castShadow = true; g.add(ch);
  }
  g.position.set(x, hAt(x, z), z); g.rotation.y = rotY;
  scene.add(g);
  buildings.push({ g, x, z, y: hAt(x, z), w: Math.max(w, d), d: Math.max(w, d), h: h + roofH, rotY, front });
}
{
  // the Inn: main block + two wings
  addBuilding(LODGE.x, LODGE.z, 30, 18, 12, 0.5, 0, 10, true);
  const c = Math.cos(0.5), s = Math.sin(0.5);
  for (const sx of [-1, 1]) addBuilding(LODGE.x + c * sx * 22, LODGE.z - s * sx * 22, 14, 12, 8, 0.5, 1, 6, false);
  const r = rng(61);
  for (let i = 0; i < 9; i++) {
    const x = -135 + r() * 100, z = -95 + r() * 80;
    if (Math.hypot(x - LODGE.x, z - LODGE.z) < 36 || nearPool(x, z, 10)) continue;
    addBuilding(x, z, 7 + r() * 3, 6 + r() * 2, 4, r() * 3, Math.floor(r() * 3), 3.2, false);
  }
}

/* ---------- boardwalk lanterns ---------- */
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0x555044 });
const lampLights = [];
{
  const poleM = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  let n = 0;
  for (let z = 6; z > -130; z -= 16) for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), poleM); pole.position.set(s * 1.9, 1.9, z); pole.castShadow = true;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lampBulbMat); bulb.position.set(s * 1.9, 3.3, z);
    scene.add(pole, bulb);
    if (s > 0 && n++ < 4) { const L = new THREE.PointLight(0xffb866, 0, 60, 2); L.position.set(0, 3.6, z - 6); scene.add(L); lampLights.push(L); }
  }
}

/* ------------------------------------------------------------------ *
 *  Old Faithful
 * ------------------------------------------------------------------ */
const JET_N = 260;
const jetData = [];
{
  const r = rng(71);
  for (let i = 0; i < JET_N; i++) jetData.push({ f: r(), a: r() * 6.283, u: r(), w: r() * 6.283, s: 0.8 + r() * 0.8 });
}
const jetMat = new THREE.MeshLambertMaterial({ color: 0xf2f7fb, emissive: 0x5d7488 });
const jet = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), jetMat, JET_N);
jet.frustumCulled = false; scene.add(jet);

/* ------------------------------------------------------------------ *
 *  Things the blast can toss
 * ------------------------------------------------------------------ */
const tossables = boardSegs.slice();
const bisonFur = new THREE.MeshLambertMaterial({ color: 0x3a2a1e });
const bisonMane = new THREE.MeshLambertMaterial({ color: 0x25190f });
function makeBison() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 3.1), bisonFur); body.position.set(0, 1.45, 0);
  const hump = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.1, 1.5), bisonMane); hump.position.set(0, 2.1, 0.7);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.95), bisonMane); head.position.set(0, 1.25, 1.95);
  const horn = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: 0x151515 })); horn.position.set(0, 1.75, 1.95);
  g.add(body, hump, head, horn);
  for (const [lx, lz] of [[-0.5, -1.1], [0.5, -1.1], [-0.5, 1.0], [0.5, 1.0]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), bisonMane); l.position.set(lx, 0.5, lz); g.add(l); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
{
  const r = rng(81);
  let n = 0;
  while (n < 12) {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (60 + r() * 100), z = -50 - r() * 130;
    if (nearPool(x, z, 6) || Math.hypot(x - LODGE.x, z - LODGE.z) < 50 || Math.hypot(x - GEYSER.x, z - GEYSER.z) < 30) continue;
    const g = makeBison();
    const rot = r() * 6.283;
    g.position.set(x, hAt(x, z), z); g.rotation.y = rot;
    scene.add(g); n++;
    tossables.push({ g, x, y: hAt(x, z), z, kind: 'bison', k: 1, spin: r() * 2 - 1, baseRot: rot, rot0: rot, drive: 0.4 + r() * 0.5, flee: 7 + r() * 4, fleeT: 2.4 + r() * 0.6, dirx: Math.sin(rot), dirz: Math.cos(rot) });
  }
}
const jackets = [0xd33a2c, 0x2f6fb3, 0xf0c534, 0xf2f2f2, 0x2a9d5a, 0xe8802c, 0x7a4fb0, 0x1d1d22, 0x3fa7c9];
const pantsCols = [0x2a3347, 0x3b3b3f, 0x5a4a35, 0x23303d, 0x6b6b70];
const skins = [0xc89b7b, 0xe3b895, 0x8a5a3a, 0xf0c9a8, 0x6e4630];
const hairs = [0x1b1410, 0x3a2616, 0x8a6a3a, 0xc9b27a, 0x777777];
const umbrellaCols = [0xd33a2c, 0xf0c534, 0x2f6fb3];
const lm = (c) => new THREE.MeshLambertMaterial({ color: c });
function limb(w, h, d, mat) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, -h / 2, 0); return new THREE.Mesh(g, mat); }
function makePerson(r) {
  const g = new THREE.Group();
  const jm = lm(jackets[Math.floor(r() * jackets.length)]), pm = lm(pantsCols[Math.floor(r() * pantsCols.length)]), sm = lm(skins[Math.floor(r() * skins.length)]);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.3), jm); torso.position.y = 1.22;
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.28), pm); pelvis.position.y = 0.86;
  const legL = limb(0.19, 0.8, 0.22, pm), legR = limb(0.19, 0.8, 0.22, pm); legL.position.set(-0.12, 0.84, 0); legR.position.set(0.12, 0.84, 0);
  const armL = limb(0.13, 0.6, 0.15, jm), armR = limb(0.13, 0.6, 0.15, jm); armL.position.set(-0.33, 1.5, 0); armR.position.set(0.33, 1.5, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), sm); head.position.y = 1.78;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.205, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), lm(hairs[Math.floor(r() * hairs.length)])); hair.position.y = 1.8; hair.rotation.x = -0.25;
  g.add(torso, pelvis, legL, legR, armL, armR, head, hair);
  if (r() < 0.4) { const bp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.2), lm(jackets[Math.floor(r() * jackets.length)])); bp.position.set(0, 1.25, -0.25); g.add(bp); }
  if (r() < 0.3) { const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), lm(0x5a4a35)); brim.position.y = 1.92; const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.12, 10), lm(0x5a4a35)); crown.position.y = 1.99; g.add(brim, crown); }
  if (r() < 0.14) { const um = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.32, 12), lm(umbrellaCols[Math.floor(r() * 3)])); um.position.y = 2.55; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), lm(0x222222)); pole.position.y = 2.1; g.add(um, pole); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, legs: [legL, legR], arms: [armL, armR] };
}
{
  const r = rng(91);
  for (let i = 0; i < 52; i++) {
    const pr = makePerson(r), g = pr.g;
    const x = (r() - 0.5) * 2.4, z = 20 - r() * 150, y = 0.7;
    const child = r() < 0.14;
    g.scale.setScalar(child ? 0.66 : 0.9 + r() * 0.08);
    g.position.set(x, y, z); scene.add(g);
    const drive = (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5);
    tossables.push({ g, x, y, z, kind: 'ped', k: 1, spin: r() * 2 - 1, drive, flee: 4.8 + r() * 2.2, fleeT: 2.15 + r() * 0.5, dirx: 0, dirz: 1, zCap: 21, legs: pr.legs, arms: pr.arms, phase: r() * 6.28 });
  }
}

/* ---------- meadow detail: tufts, wildflowers, rocks ---------- */
const meadow = (() => {
  const r = rng(131);
  const okSpot = (x, z) => {
    if (nearPool(x, z, 5) || (Math.abs(x) < 3.6 && z > -150)) return false;
    if (Math.hypot(x - GEYSER.x, z - GEYSER.z) < 18) return false;
    for (const b of buildings) if (Math.hypot(x - b.x, z - b.z) < b.w * 0.75 + 3) return false;
    return true;
  };
  const place = (n, build) => { const out = []; let g = 0; while (out.length < n && g++ < 60000) { const x = (r() - 0.5) * 520, z = 36 - r() * 380; if (hAt(x, z) > 14 || !okSpot(x, z)) continue; out.push(build(x, z)); } return out; };
  const tuftCols = [0x5f6e3a, 0x55663a, 0x8a8a4c, 0x6b7a3e, 0x4a5a30];
  const tufts = place(2600, (x, z) => ({ x, z, s: 0.35 + r() * 0.6, c: tuftCols[Math.floor(r() * tuftCols.length)] }));
  const tm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1.0, 5), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), tufts.length);
  const d = new THREE.Object3D(), c = new THREE.Color();
  tufts.forEach((o, i) => { d.position.set(o.x, hAt(o.x, o.z) + 0.38 * o.s, o.z); d.rotation.set(0, r() * 6, 0); d.scale.set(o.s * (0.8 + r() * 0.6), o.s * (0.7 + r() * 0.8), o.s * (0.8 + r() * 0.6)); d.updateMatrix(); tm.setMatrixAt(i, d.matrix); tm.setColorAt(i, c.set(o.c).multiplyScalar(0.85 + r() * 0.3)); });
  tm.castShadow = true; scene.add(tm);
  const flowerCols = [0xf2d23a, 0xf6f6ee, 0xa070d8, 0xd9533a, 0xf2d23a];
  const fl = place(1500, (x, z) => ({ x, z, c: flowerCols[Math.floor(r() * flowerCols.length)], k: fbm(x * 0.05, z * 0.05) }));
  const flo = fl.filter((o) => o.k > 0.5);
  const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), flo.length);
  flo.forEach((o, i) => { d.position.set(o.x, hAt(o.x, o.z) + 0.55, o.z); d.rotation.set(0, 0, 0); d.scale.setScalar(0.8 + r() * 0.8); d.updateMatrix(); fm.setMatrixAt(i, d.matrix); fm.setColorAt(i, c.set(o.c)); });
  scene.add(fm);
  const rocks = place(300, (x, z) => ({ x, z, s: 0.5 + Math.pow(r(), 2) * 1.8 }));
  const rm = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), rocks.length);
  rocks.forEach((o, i) => { d.position.set(o.x, hAt(o.x, o.z) + 0.25 * o.s, o.z); d.rotation.set(r() * 3, r() * 3, r() * 3); d.scale.set(o.s * 1.3, o.s * 0.7, o.s); d.updateMatrix(); rm.setMatrixAt(i, d.matrix); rm.setColorAt(i, c.set(0x8c887d).multiplyScalar(0.75 + r() * 0.5)); });
  rm.castShadow = true; rm.receiveShadow = true; scene.add(rm);
  return [tm, fm];
})();

/* ---------- forest (instanced) ---------- */
const TREES = 2400;
const treeData = [];
{
  const r = rng(77);
  let guard = 0;
  while (treeData.length < TREES && guard++ < 200000) {
    const x = (r() - 0.5) * 2400, z = 200 - r() * 1700;
    if (z > 40) continue;
    const h = hAt(x, z);
    const p = smooth((h - 3) / 22) * 0.95 + 0.012;
    if (r() > p) continue;
    if (nearPool(x, z, 10) || Math.abs(x) < 6 && z > -150) continue;
    if (Math.hypot(x - LODGE.x, z - LODGE.z) < 44 || Math.hypot(x - GEYSER.x, z - GEYSER.z) < 24) continue;
    if (z < -1050 && Math.abs(x) < 700) continue; // volcano footprint
    treeData.push({ x, z, y: h, s: 0.8 + r() * 1.5, hue: r(), aspen: r() < 0.06 });
  }
}
const N_TREES = treeData.length;
const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 3, 5), new THREE.MeshLambertMaterial({ color: 0x4a3626 }), N_TREES);
const crownMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(3.0, 14, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), N_TREES);
crownMesh.castShadow = true; trunkMesh.castShadow = true;
scene.add(trunkMesh, crownMesh);
const treeBase = treeData.map((t) => (t.aspen ? new THREE.Color(0xc9b24a) : new THREE.Color().setHSL(0.30 + t.hue * 0.05, 0.42, 0.14 + t.hue * 0.08)));

/* ---------- eruption: plume ---------- */
const PLUME_N = 1400;
const plumeData = [];
{
  const r = rng(303);
  for (let i = 0; i < PLUME_N; i++) plumeData.push({ tb: 2 + r() * 4.8, a: r() * Math.PI * 2, u: Math.sqrt(r()), u2: r(), sz: 0.7 + r() * 0.9, tint: r() });
}
const puffTex = (() => {
  const N = 256, c = mkCanvas(N, N), x = c.getContext('2d'), id = x.createImageData(N, N);
  const L = [-0.45, -0.75, 0.5], ll = Math.hypot(L[0], L[1], L[2]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = (i / N - 0.5) * 2, v = (j / N - 0.5) * 2, rr = Math.hypot(u, v);
    const n = fbm(u * 2.4 + 5, v * 2.4 + 9), n2 = fbm(u * 6 + 1, v * 6 + 3);
    const edge = 1 - smooth((rr - (0.46 + 0.3 * n)) / 0.34);
    const z = Math.sqrt(Math.max(0, 1 - rr * rr));
    const nx = u + (n2 - 0.5) * 0.7, ny = v + (n - 0.5) * 0.7, nz = z + 0.2, nl = Math.hypot(nx, ny, nz);
    const lit = clamp(0.52 + 0.55 * (nx * L[0] + ny * L[1] + nz * L[2]) / (nl * ll) + (n2 - 0.5) * 0.4, 0, 1);
    const k = (j * N + i) * 4, val = 255 * (0.3 + 0.7 * lit);
    id.data[k] = id.data[k + 1] = id.data[k + 2] = val; id.data[k + 3] = 255 * edge * (0.8 + 0.2 * n2);
  }
  x.putImageData(id, 0, 0);
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
})();
const AMB_N = 70, SMOKE_N = PLUME_N + 1100 + 12 * 22 + AMB_N + 40;
const smokeGeo = new THREE.PlaneGeometry(1, 1);
const smokeAlpha = new THREE.InstancedBufferAttribute(new Float32Array(SMOKE_N).fill(1), 1);
smokeGeo.setAttribute('aAlpha', smokeAlpha);
const smokeMat = new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false });
smokeMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAlpha;');
};
const smoke = new THREE.InstancedMesh(smokeGeo, smokeMat, SMOKE_N);
smoke.frustumCulled = false; smoke.renderOrder = 5; smoke.count = 0;
scene.add(smoke);
const puffPool = Array.from({ length: SMOKE_N }, () => ({ x: 0, y: 0, z: 0, s: 1, rot: 0, r: 1, g: 1, b: 1, a: 1, d: 0 }));
let pc = 0;
function addPuff(x, y, z, s, rot, r, g, b, a) {
  if (pc >= SMOKE_N || a <= 0.004 || s <= 0.05) return;
  const p = puffPool[pc++];
  p.x = x; p.y = y; p.z = z; p.s = s; p.rot = rot; p.r = r; p.g = g; p.b = b; p.a = a;
  const dx = x - camera.position.x, dy = y - camera.position.y, dz = z - camera.position.z;
  p.d = dx * dx + dy * dy + dz * dz;
  p.a *= smooth((Math.sqrt(p.d) - 14) / 70); // soft-particle fade so nothing becomes a flat wall in front of the lens
}
const puffTmp = new THREE.Object3D(), puffCol = new THREE.Color();
function flushSmoke() {
  const list = puffPool.slice(0, pc).sort((a, b) => b.d - a.d);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    puffTmp.position.set(p.x, p.y, p.z);
    puffTmp.quaternion.copy(camera.quaternion);
    puffTmp.rotateZ(p.rot);
    puffTmp.scale.set(p.s, p.s, 1);
    puffTmp.updateMatrix();
    smoke.setMatrixAt(i, puffTmp.matrix);
    smoke.setColorAt(i, puffCol.setRGB(p.r, p.g, p.b));
    smokeAlpha.array[i] = p.a;
  }
  smoke.count = list.length;
  smoke.instanceMatrix.needsUpdate = true;
  if (smoke.instanceColor) smoke.instanceColor.needsUpdate = true;
  smokeAlpha.needsUpdate = true;
}

const BOMBS = 90;
const bombData = [];
{
  const r = rng(909);
  for (let i = 0; i < BOMBS; i++) bombData.push({ tb: 2 + r() * 3.2, vx: (r() - 0.5) * 140, vy: 120 + r() * 180, vz: (r() - 0.35) * 150, s: 3 + r() * 6, w: r() * 9 });
}
const bombs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xff7a22, fog: false }), BOMBS);
bombs.frustumCulled = false; scene.add(bombs);

/* ---------- pyroclastic flow sweeping the basin ---------- */
const FLOW_N = 1100;
const flowData = [];
{
  const r = rng(404);
  for (let i = 0; i < FLOW_N; i++) flowData.push({ dz: Math.pow(r(), 1.15) * 260, u: r() * 2 - 1, hy: Math.pow(r(), 1.3), s: 0.55 + r() * 0.9, tint: r() });
}
const flowLight = new THREE.PointLight(0xff7a2a, 0, 0, 2);
scene.add(flowLight);
const FLOW_T0 = 4.0, FLOW_T1 = 7.3, FLOW_Z0 = -1150, FLOW_Z1 = 26;
const flowFront = (t) => FLOW_Z0 + (FLOW_Z1 - FLOW_Z0) * Math.pow(clamp((t - FLOW_T0) / (FLOW_T1 - FLOW_T0)), 1.35);
function flowArrival(z) {
  let lo = FLOW_T0, hi = FLOW_T1 + 2;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (flowFront(m) < z) lo = m; else hi = m; }
  return lo;
}

/* ---------- log + plank debris ---------- */
const DEB_PER = 30;
const debris = [];
{
  const r = rng(1234);
  for (const b of buildings) {
    b.hit = flowArrival(b.z);
    const per = b.front ? DEB_PER * 2 : DEB_PER / 2;
    for (let k = 0; k < per; k++) {
      debris.push({
        b, ox: (r() - 0.5) * b.w, oy: 1 + r() * (b.h - 1), oz: (r() - 0.5) * b.d,
        vx: (r() - 0.5) * 24, vy: 6 + r() * 30, vz: 16 + r() * 48,
        sx: 1.2 + r() * 4, sy: 0.3 + r() * 0.5, sz: 0.3 + r() * 0.5, spin: (r() - 0.5) * 9, shade: 0.7 + r() * 0.3,
      });
    }
  }
}
const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: logDebrisTex }), debris.length);
debMesh.frustumCulled = false; scene.add(debMesh);

/* ---------- soft sprites: haze, steam, clouds, ash ---------- */
const sprite = (() => {
  const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
function pointsLayer(n, size, color, seedFn) {
  const pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push(seedFn(i));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: sprite, transparent: true, opacity: 0, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);
  return { pts, pos, seed, geo };
}
const hazeLayers = [];
{
  const r = rng(606);
  for (const [n, size] of [[140, 40], [120, 18], [90, 80]]) hazeLayers.push(pointsLayer(n, size, 0xcaa982, () => [(r() - 0.5) * 140, 2 + r() * 40, 30 - r() * 260, r() * 6.28]));
}
const steam = (() => {
  const r = rng(707);
  const items = [];
  POOLS.forEach(([px, pz, rad]) => { const n = Math.round(rad * 1.6); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * rad; items.push([px + Math.cos(a) * d, pz + Math.sin(a) * d, r(), 5 + r() * 9]); } });
  return pointsLayer(items.length, 16, 0xffffff, (i) => items[i]);
})();
const geyserSteam = pointsLayer(70, 46, 0xffffff, (i) => [hash2(i, 1) - 0.5, hash2(i, 2), hash2(i, 3), hash2(i, 4)]);
const clouds = pointsLayer(26, 340, 0xffffff, (i) => [(hash2(i, 11) - 0.5) * 3200, 260 + hash2(i, 12) * 520, -500 - hash2(i, 13) * 1500, hash2(i, 14)]);
const dimSun = new THREE.Points((() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1050, 1500, -4800]), 3)); return g; })(),
  new THREE.PointsMaterial({ color: 0xfff1d6, size: 900, map: sprite, transparent: true, opacity: 0, depthWrite: false, fog: false }));
dimSun.frustumCulled = false; scene.add(dimSun);
const ASH_N = 6000;
const ashPos = new Float32Array(ASH_N * 3), ashSeed = [];
{
  const r = rng(555);
  for (let i = 0; i < ASH_N; i++) ashSeed.push([r() * 200 - 100, r() * 80, r() * 260 - 220, 4 + r() * 5, r() * 6.28]);
}
const ashGeo = new THREE.BufferGeometry();
ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
const ashPts = new THREE.Points(ashGeo, new THREE.PointsMaterial({ color: 0xd6d1c8, size: 0.3, map: sprite, transparent: true, opacity: 0, depthWrite: false }));
ashPts.frustumCulled = false; scene.add(ashPts);

// birds
const BIRDS = 24;
const birdShape = new THREE.Shape(); birdShape.moveTo(-1, 0.1); birdShape.lineTo(0, 0); birdShape.lineTo(1, 0.1); birdShape.lineTo(0, 0.28); birdShape.closePath();
const birds = new THREE.InstancedMesh(new THREE.ShapeGeometry(birdShape), new THREE.MeshBasicMaterial({ color: 0x1b1b1d, side: THREE.DoubleSide, fog: true }), BIRDS);
birds.frustumCulled = false; scene.add(birds);
const birdData = Array.from({ length: BIRDS }, (_, i) => ({ a: hash2(i, 5) * 6.28, r: 40 + hash2(i, 6) * 120, y: 30 + hash2(i, 7) * 90, sp: 0.15 + hash2(i, 8) * 0.2, f: 6 + hash2(i, 9) * 4 }));

/* ------------------------------------------------------------------ *
 *  Per-frame update
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color();
const horC = new THREE.Color(), topC = new THREE.Color();

const SKY_H = [[0, 0xe9dccb], [2, 0xe9dccb], [3.5, 0xc9b59a], [5, 0x9a7a60], [7, 0x5c3e30], [9, 0x2b211d], [12, 0x3a3532], [13.5, 0x8c8a86], [17, 0x9a9894]];
const SKY_T = [[0, 0x4a86cf], [2, 0x4a86cf], [3.5, 0x586f8a], [5, 0x2c3038], [7, 0x16171b], [9, 0x0e0e10], [12, 0x1e1f22], [13.5, 0x5e6064], [17, 0x6a6c70]];
const CAM = new THREE.Vector3(-1, 6.7, 30);

function toss(o, p, dz) {
  const g = o.g;
  const bx = o.x + (o.dirx || 0) * 0, bz = o.z + dz;
  if (p <= 0) { g.position.set(o.x + (o.dx || 0), o.y, bz); g.rotation.set(0, o.baseRot || 0, 0); return; }
  const air = Math.sin(clamp(p) * Math.PI);
  const big = o.kind === 'bison' ? 8 : o.kind === 'plank' ? 5 : 12;
  g.position.set(o.x + (o.dx || 0) + o.spin * p * 6, o.y + air * big * o.k, bz + p * (o.kind === 'plank' ? 6 : 60) * o.k);
  g.rotation.set(p * 3.1 * o.k, (o.baseRot || 0) + p * 1.8 * o.spin, p * 2.4 * o.spin);
}

function update(t) {
  /* sky / fog / lights */
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC);
  skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [3, 1], [5, 0.15], [7, 0], [13, 0], [14, 0.35], [17, 0.5]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00028], [2, 0.0003], [4, 0.0008], [6, 0.0015], [7, 0.0030], [8, 0.0036], [9, 0.0036], [11, 0.0026], [13, 0.0017], [14.5, 0.0016], [17, 0.0016]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [7, 1.05], [9, 1.3], [13, 1.3], [17, 1.2]]);
  sun.intensity = Math.PI * kf(t, [[0, 2.7], [3, 2.6], [4.5, 1.4], [6.5, 0.3], [8, 0.05], [13, 0.05], [13.6, 0.5], [17, 0.9]]);
  kfc(t, [[0, 0xffdcaa], [3, 0xffd2a0], [5, 0xe6b890], [7, 0xcc9c80], [13, 0xcfcfcf], [17, 0xd8d8d8]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 0.85], [4, 0.8], [5.5, 0.85], [7.3, 0.6], [8.4, 0.4], [10, 0.45], [13, 1.0], [17, 1.15]]);
  hemi.color.copy(horC).lerp(topC, 0.55).lerp(tmpC.set(0xc07440), kf(t, [[3, 0], [4.5, 0.7], [7.3, 0.7], [9, 0.25], [11, 0]]));
  hemi.groundColor.set(0x6a6a44).lerp(tmpC.set(0x7a7873), smooth((t - 12) / 2));
  craterLight.intensity = kf(t, [[2, 0], [2.4, 2.4e5], [5, 1.6e5], [7, 6e4], [9, 0]]);
  const lampOn = smooth((t - 6.8) / 1.2);
  lampLights.forEach((L) => { L.intensity = lampOn * 420; });
  lampBulbMat.color.set(0x555044).lerp(tmpC.set(0xffd592), lampOn);
  const winGlow = kf(t, [[0, 0], [6.4, 0], [7.6, 1.2], [11, 0.9], [13, 0.3], [17, 0]]);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.08], [5, 0.9], [9, 0.8], [12.5, 0.8], [14, 0.32], [17, 0.28]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [8, 1.1], [14, 1.0]]).toFixed(3)})`;

  for (const a of ashTargets) {
    const f = smooth((t - a.start) / 3.2) * a.k;
    a.mat.color.copy(a.base).lerp(ASH, f);
    if (a.light) { a.mat.emissiveIntensity = winGlow; a.mat.color.lerp(tmpC.set(0x9a9892), f * 0.3); }
  }
  ashLayer.material.opacity = 0.94 * smooth((t - 7.0) / 3.2);
  ashLayer.visible = ashLayer.material.opacity > 0.005;
  ashLayer.position.y = 0.12 + 0.55 * smooth((t - 7.3) / 4);

  /* camera: overlook platform */
  const pitch = kf(t, [[0, -3], [1.8, -2], [2.4, 5], [3.2, 26], [4.0, 34], [4.8, 14], [5.6, 3], [6.6, 0], [7.3, 1], [8, 3], [10, -3], [13, -5], [17, -5]]);
  const yaw = kf(t, [[0, -15], [1.6, -16], [2.6, -4], [4.0, 0], [5.6, 2], [6.6, 6], [7.2, 26], [7.8, 34], [9, 32], [11, 28], [14, 24], [17, 20]]);
  const amp = kf(t, [[0, 0.01], [1.4, 0.03], [2, 0.14], [2.7, 0.4], [4, 0.32], [4.6, 0.3], [6, 0.7], [7.3, 1.25], [8.6, 0.45], [10, 0.07], [13, 0.03], [17, 0.0]]);
  const sh = (a, b) => Math.sin(t * a + b);
  camera.position.set(CAM.x + amp * 0.16 * (sh(41, 1) + 0.6 * sh(23, 2)), CAM.y + amp * 0.12 * (sh(37, 0) + 0.5 * sh(19, 4)), CAM.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(0, 0, 0);
  camera.rotation.y = THREE.MathUtils.degToRad(yaw) + amp * 0.0035 * sh(29, 3);
  camera.rotation.x = THREE.MathUtils.degToRad(pitch) + amp * 0.004 * sh(33, 5);
  camera.rotation.z = amp * 0.008 * sh(17, 6);
  camera.position.x += 0.05 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 2.3 + 1);
  camera.position.y += 0.04 * Math.sin(t * 1.1 + 2);
  camera.rotation.y += 0.0016 * Math.sin(t * 0.8 + 1) ;
  camera.rotation.x += 0.0012 * Math.sin(t * 1.3);
  const fov = kf(t, [[0, 61], [4, 55], [7, 55], [9, 58], [17, 56]]);
  if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }

  /* Old Faithful: erupts for the tourists, then the world ends */
  const JH = 72 * smooth((t - 0.1) / 0.9) * (1 - smooth((t - 2.3) / 1.3));
  for (let i = 0; i < JET_N; i++) {
    const p = jetData[i];
    if (JH < 0.5) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const f = (p.f + t * 0.9) % 1;
      const h = f * JH;
      const sp = 0.5 + f * 6.5 * (0.3 + p.u * p.u);
      dummy.position.set(GEYSER.x + Math.cos(p.a + t) * sp, 3.4 + h, GEYSER.z + Math.sin(p.a + t) * sp);
      dummy.scale.setScalar((0.9 + (1 - f) * 0.7 + f * 1.7) * p.s);
    }
    dummy.rotation.set(p.w, p.w, 0);
    dummy.updateMatrix(); jet.setMatrixAt(i, dummy.matrix);
  }
  jet.instanceMatrix.needsUpdate = true;
  geyserSteam.pts.material.opacity = 0.5 * smooth((t - 0.5) / 1.0) * (1 - smooth((t - 3.0) / 2.2));
  for (let i = 0; i < geyserSteam.seed.length; i++) {
    const s = geyserSteam.seed[i];
    geyserSteam.pos[i * 3] = GEYSER.x + (s[0]) * 40 + t * 3 * s[2];
    geyserSteam.pos[i * 3 + 1] = 28 + s[1] * 40 + Math.max(0, JH) * 0.5;
    geyserSteam.pos[i * 3 + 2] = GEYSER.z + (s[3] - 0.5) * 30;
  }
  geyserSteam.geo.attributes.position.needsUpdate = true;

  /* pool steam, clouds, birds */
  steam.pts.material.opacity = 0.32 * (1 - smooth((t - 3.5) / 2.5));
  for (let i = 0; i < steam.seed.length; i++) {
    const s = steam.seed[i], ph = (s[2] + t * 0.12) % 1;
    steam.pos[i * 3] = s[0] + Math.sin(t * 0.7 + i) * 1.5 + ph * 3;
    steam.pos[i * 3 + 1] = 0.8 + ph * s[3];
    steam.pos[i * 3 + 2] = s[1];
  }
  steam.geo.attributes.position.needsUpdate = true;
  clouds.pts.material.opacity = 0.9 * (1 - smooth((t - 3.2) / 2.2));
  clouds.pts.material.color.set(0xffffff).lerp(tmpC.set(0xb59a85), smooth((t - 2.5) / 2));
  for (let i = 0; i < clouds.seed.length; i++) {
    const s = clouds.seed[i];
    clouds.pos[i * 3] = s[0] + t * 6; clouds.pos[i * 3 + 1] = s[1]; clouds.pos[i * 3 + 2] = s[2];
  }
  clouds.geo.attributes.position.needsUpdate = true;
  for (let i = 0; i < BIRDS; i++) {
    const b = birdData[i], flee = clamp((t - 2.2) / 2);
    const a = b.a + t * b.sp;
    dummy.position.set(Math.cos(a) * b.r + flee * flee * 400, b.y + flee * 60 + Math.sin(t * 2 + i) * 3, -90 + Math.sin(a) * b.r * 0.6 - flee * 20);
    dummy.scale.set(1.6, 1.0 + 0.7 * Math.sin(t * b.f + i), 1);
    dummy.rotation.set(0, -a + Math.PI / 2, 0);
    dummy.updateMatrix(); birds.setMatrixAt(i, dummy.matrix);
  }
  birds.instanceMatrix.needsUpdate = true;
  birds.visible = t < 7;

  /* smoke: eruption column (soft depth-sorted billboards) */
  pc = 0;
  const dayL = kf(t, [[0, 1], [3, 1], [5, 0.72], [7, 0.4], [10, 0.22], [13, 0.5], [17, 0.6]]);
  for (let i = 0; i < PLUME_N; i++) {
    const p = plumeData[i], a = t - p.tb;
    if (a < 0) continue;
    const h = CRATER.y + 1950 * (1 - Math.exp(-a * 0.78));
    const colR = 36 + (h - CRATER.y) * 0.075 + 90 * clamp(a * 0.2);
    const sp = smooth((h - 1450) / 800);
    const umbR = (150 + 1500 * p.u2) * clamp(a * 0.55);
    const r = lerp(colR * p.u, umbR * (0.35 + 0.65 * p.u), sp);
    const drift = a * (20 + 60 * sp);
    const rad = (26 + a * 24 + (h - CRATER.y) * 0.03) * p.sz * (1 + sp * 0.7);
    const hot = clamp(1 - a / 1.3), up = clamp((h - 700) / 1500);
    tmpC.setRGB(0.42, 0.37, 0.33).lerp(_ca.setRGB(0.95, 0.84, 0.72), up * (0.4 + 0.6 * p.tint)).multiplyScalar(dayL).lerp(_cb.setRGB(1.3, 0.5, 0.14), hot * 0.85);
    addPuff(Math.cos(p.a) * r, h + (sp > 0 ? (p.u2 - 0.5) * 160 : 0), CRATER.z + Math.sin(p.a) * r + drift, rad * 2.7, p.u2 * 0.7 - 0.35, tmpC.r, tmpC.g, tmpC.b, clamp(a * 2.5) * 0.95);
  }

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

  /* smoke: pyroclastic flow rolling across the basin */
  const f = flowFront(t);
  const flowA = 1 - smooth((t - 6.8) / 0.9);
  flowLight.position.set(0, 45, f + 70);
  flowLight.intensity = t >= FLOW_T0 && flowA > 0.02 ? kf(t, [[4, 0], [4.6, 1.4e5], [7, 1.8e5], [8, 0]]) : 0;
  if (t >= FLOW_T0 - 0.2 && flowA > 0.01) {
    const D = Math.max(0, 30 - f), fl = kf(t, [[4, 1], [6, 0.85], [7, 0.55]]);
    for (let i = 0; i < FLOW_N; i++) {
      const p = flowData[i];
      const sz = (22 + D * 0.026) * p.s;
      const warm = Math.pow(clamp(1 - p.dz / 90), 2) * 0.55;
      tmpC.setRGB(0.27, 0.22, 0.19).lerp(_ca.setRGB(0.52, 0.42, 0.34), p.tint).lerp(_cb.setRGB(1.0, 0.5, 0.2), warm).multiplyScalar(fl);
      addPuff(p.u * (70 + D * 0.55), sz * 0.7 + p.hy * (90 + D * 0.1), f - p.dz, sz * 2.7, p.tint * 1.2 - 0.6, tmpC.r, tmpC.g, tmpC.b, 0.92 * flowA);
    }
  }
  /* smoke: dust blown out of each collapsing building */
  const dustL = kf(t, [[5, 0.8], [8, 0.45], [10, 0.3], [13, 0.55], [17, 0.6]]);
  buildings.forEach((b, bi) => {
    const sT = t - b.hit;
    if (sT < 0 || sT > 5.5) return;
    const n = b.front ? 22 : 10, life = clamp(sT / 5.5), a = 0.5 * Math.exp(-sT * 0.55) * clamp(sT * 3);
    for (let k = 0; k < n; k++) {
      const hx = hash2(bi * 7 + k, 1) - 0.5, hz = hash2(bi * 7 + k, 2) - 0.5, hh = hash2(bi * 7 + k, 3);
      addPuff(b.x + hx * b.w * (1 + life), b.y + 2 + hh * b.h * 0.7 + sT * 2.2, b.z + hz * b.d * (1 + life) + sT * 4, 7 + hh * 7 + sT * 7, hx, 0.62 * dustL, 0.52 * dustL, 0.43 * dustL, a);
    }
  });
  /* smoke: the ash cloud we end up inside */
  const ambA = kf(t, [[6.6, 0], [8, 0.2], [10, 0.16], [13, 0.12], [17, 0.1]]);
  if (ambA > 0.01) for (let i = 0; i < AMB_N; i++) {
    const zz = 28 - (((hash2(i, 3) * 230 + (t - 6) * 5) % 230) + 230) % 230;
    addPuff((hash2(i, 1) - 0.5) * 170 + Math.sin(t * 0.3 + i) * 4, 3 + hash2(i, 2) * 50, zz, 55 + hash2(i, 4) * 55, i, 0.4 * dustL * 1.4, 0.35 * dustL * 1.4, 0.31 * dustL * 1.4, ambA);
  }
  flushSmoke();

  /* lodge + cabins buckle as the front passes */
  for (const b of buildings) {
    const p = t < FLOW_T0 ? 0 : clamp((f - b.z) / 40);
    b.g.rotation.x = p * (b.front ? 0.5 : 0.7);
    b.g.rotation.z = p * (b.front ? -0.22 : 0.3) * (b.x < -58 ? 1 : -1);
    b.g.rotation.y = b.rotY + p * 0.2;
    b.g.position.y = b.y - p * 3;
    b.g.position.z = b.z + p * 12;
    b.g.scale.y = 1 - 0.45 * p;
  }
  for (let i = 0; i < debris.length; i++) {
    const d = debris[i], s = t - d.b.hit;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const y = d.b.y + d.oy + d.vy * s - 0.5 * 24 * s * s;
      dummy.position.set(d.b.x + d.ox + d.vx * s, Math.max(0.5, y), Math.min(20, d.b.z + d.oz + d.vz * s));
      dummy.scale.set(d.sx, d.sy, d.sz);
      dummy.rotation.set(s * d.spin, s * d.spin * 0.6, s * d.spin * 0.3);
    }
    dummy.updateMatrix(); debMesh.setMatrixAt(i, dummy.matrix);
    debMesh.setColorAt(i, tmpC.setScalar(d.shade));
  }
  debMesh.instanceMatrix.needsUpdate = true; debMesh.instanceColor.needsUpdate = true;

  /* tourists, bison, boardwalk */
  for (const o of tossables) {
    const p = t < FLOW_T0 ? 0 : clamp((f - o.z) / 26);
    let dz = 0, dx = 0;
    if (o.drive) dz += o.drive * Math.min(t, o.fleeT || 99) * (o.kind === 'bison' ? (o.dirz !== undefined ? o.dirz : 1) : 1);
    if (o.flee && t > o.fleeT) {
      const sT = t - o.fleeT;
      dz += o.flee * sT;
      if (o.kind === 'bison') dx += (o.x > 0 ? 1 : -1) * 0.3 * o.flee * sT;
    }
    if (o.zCap !== undefined) dz = Math.min(dz, o.zCap - o.z);
    if (o.kind === 'bison') dz = Math.min(dz, 24 - o.z);
    o.dx = dx;
    o.g.visible = t < 8.6 || !(o.kind === 'ped' || o.kind === 'bison' || o.z > -10);
    if (o.kind === 'ped') o.baseRot = o.drive < 0 ? lerp(Math.PI, 0, smooth((t - o.fleeT) / 0.3)) : 0;
    else if (o.kind === 'bison') o.baseRot = lerp(o.rot0, 0, smooth((t - o.fleeT) / 0.5));
    toss(o, p, dz);
    if (o.legs) {
      const run = t > o.fleeT, ok = p <= 0.01;
      const sw = ok ? Math.sin(t * (run ? 12 : 5.5) + o.phase) * (run ? 0.95 : 0.42) : Math.sin(t * 16 + o.phase) * 1.2;
      o.legs[0].rotation.x = sw; o.legs[1].rotation.x = -sw;
      o.arms[0].rotation.x = ok ? -sw * (run ? 1.1 : 0.8) : -2.6 + Math.sin(t * 13 + o.phase) * 0.5;
      o.arms[1].rotation.x = ok ? sw * (run ? 1.1 : 0.8) : -2.6 + Math.sin(t * 13 + o.phase + 1.4) * 0.5;
    }
  }
  meadow.forEach((m) => { m.visible = t < 8.0; });
  bloom.strength = kf(t, [[0, 0.1], [2, 0.3], [5, 0.28], [8, 0.2], [13, 0.12], [17, 0.12]]);

  /* forest */
  const ashK = smooth((t - 7.5) / 3) * 0.85;
  for (let i = 0; i < N_TREES; i++) {
    const tr = treeData[i];
    const p = t < FLOW_T0 ? 0 : clamp((f - tr.z) / 44);
    dummy.position.set(tr.x, tr.y + (3 + 7 * tr.s) * (1 - p * 0.75), tr.z + p * 28 * tr.s);
    dummy.rotation.set(p * 1.5 + Math.sin(t * 1.3 + i) * 0.012 * (1 - p), 0, 0);
    dummy.scale.set(tr.s, tr.s, tr.s);
    dummy.updateMatrix(); crownMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tr.x, tr.y + 1.5 * tr.s * (1 - p * 0.7), tr.z + p * 10 * tr.s);
    dummy.rotation.set(p * 1.5, 0, 0);
    dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix);
    crownMesh.setColorAt(i, tmpC.copy(treeBase[i]).lerp(ASH, ashK));
  }
  crownMesh.instanceMatrix.needsUpdate = true; trunkMesh.instanceMatrix.needsUpdate = true; crownMesh.instanceColor.needsUpdate = true;

  dimSun.material.opacity = 0.75 * smooth((t - 12.8) / 1.6);

  /* haze */
  const dust = kf(t, [[0, 0.0], [3, 0.1], [4.5, 0.3], [6.5, 0.5], [7.4, 0.6], [10, 0.38], [13, 0.22], [17, 0.2]]);
  hazeLayers.forEach((L, li) => {
    L.pts.material.opacity = dust * (li === 2 ? 0.28 : 0.35);
    L.pts.material.color.set(0xcaa982).lerp(tmpC.set(0x8d8a86), smooth((t - 11) / 3));
    for (let i = 0; i < L.seed.length; i++) {
      const s = L.seed[i];
      L.pos[i * 3] = s[0] + Math.sin(t * 0.4 + s[3]) * 3;
      L.pos[i * 3 + 1] = s[1] + Math.sin(t * 0.3 + s[3] * 2) * 2;
      L.pos[i * 3 + 2] = ((s[2] + t * (t > 4 ? 6 : 1.5) + 230) % 260 + 260) % 260 - 230 + 30;
    }
    L.geo.attributes.position.needsUpdate = true;
  });

  /* falling ash */
  ashPts.material.opacity = kf(t, [[5.5, 0], [7.5, 0.85], [13, 0.9], [17, 0.9]]);
  ashPts.visible = ashPts.material.opacity > 0.01;
  if (ashPts.visible) {
    const tt = Math.max(0, t - 5.5);
    for (let i = 0; i < ASH_N; i++) {
      const s = ashSeed[i];
      ashPos[i * 3] = ((s[0] + Math.sin(tt * 0.6 + s[4]) * 2.5 + tt * 3 + 100) % 200 + 200) % 200 - 100 + 4;
      ashPos[i * 3 + 1] = ((s[1] - tt * s[3]) % 80 + 80) % 80;
      ashPos[i * 3 + 2] = s[2] + Math.cos(tt * 0.5 + s[4]) * 1.5;
    }
    ashGeo.attributes.position.needsUpdate = true;
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
  const cosL = Math.cos((38 * Math.PI) / 180);
  const spanX = (125 - 66.5) * cosL, spanY = 50 - 24.5;
  const mw = W * 0.9, scale = mw / spanX, mh = spanY * scale;
  const ox = (W - mw) / 2, oy = H * 0.2;
  const px = (lon) => ox + (lon + 125) * cosL * scale;
  const py = (lat) => oy + (50 - lat) * scale;
  mctx.clearRect(0, 0, W, H);
  {
    const bg = mctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(10,12,17,1)'); bg.addColorStop(0.5, 'rgba(10,12,17,.97)');
    bg.addColorStop(0.72, 'rgba(10,12,17,.6)'); bg.addColorStop(1, 'rgba(10,12,17,.38)');
    mctx.fillStyle = bg; mctx.fillRect(0, 0, W, H);
  }
  mctx.strokeStyle = 'rgba(120,140,170,.07)'; mctx.lineWidth = 1 * DPR;
  for (let lon = -125; lon <= -65; lon += 5) { mctx.beginPath(); mctx.moveTo(px(lon), oy - 20 * DPR); mctx.lineTo(px(lon), oy + mh + 20 * DPR); mctx.stroke(); }
  for (let lat = 25; lat <= 50; lat += 5) { mctx.beginPath(); mctx.moveTo(ox - 10 * DPR, py(lat)); mctx.lineTo(ox + mw + 10 * DPR, py(lat)); mctx.stroke(); }
  mctx.beginPath();
  US.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la))));
  mctx.closePath();
  mctx.fillStyle = '#171c27'; mctx.fill();
  mctx.strokeStyle = 'rgba(160,178,205,.45)'; mctx.lineWidth = 1.2 * DPR; mctx.stroke();
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
  mctx.beginPath();
  US.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la))));
  mctx.closePath(); mctx.strokeStyle = 'rgba(200,214,235,.5)'; mctx.lineWidth = 1.2 * DPR; mctx.stroke();
  const pulse = 1 + 0.25 * Math.sin(t * 7);
  mctx.fillStyle = '#ff6a2a';
  mctx.beginPath(); mctx.arc(cx, cy, 5.5 * DPR * pulse, 0, Math.PI * 2); mctx.fill();
  mctx.strokeStyle = 'rgba(255,106,42,.5)'; mctx.lineWidth = 1.5 * DPR;
  mctx.beginPath(); mctx.arc(cx, cy, 12 * DPR * pulse, 0, Math.PI * 2); mctx.stroke();
  mctx.fillStyle = 'rgba(244,239,230,.85)';
  mctx.font = `700 ${10.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  mctx.textAlign = 'left';
  mctx.fillText('YELLOWSTONE', cx - 22 * DPR, cy - 20 * DPR);
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
 *  HUD / captions  (primary stat + live secondary stat, like the reference)
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
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const BEATS = [
  { a: 0, b: 2, label: 'Ground', value: () => 'Rising', sub: (k) => `Quake M ${(4.6 + 2.6 * smooth(k)).toFixed(1)}`, cap: 'The ground has been rising for years.' },
  { a: 2, b: 4, label: 'Plume height', value: (k) => `${Math.round(30 * easeOut(k * 1.1))} mi`, sub: (k) => `Ejecta ${fmt(240 * smooth(k))} mi³`, cap: 'It throws a mountain into the sky.' },
  { a: 4, b: 7, label: 'Flow speed', value: (k) => `${Math.round(lerp(150, 450, smooth(k)))} mph`, sub: (k) => `Temp ${fmt(lerp(500, 1300, smooth(k)))} °F`, cap: 'Nothing outruns it.' },
  { a: 7, b: 10, label: 'Ash depth', value: (k) => `${(3 * smooth(k)).toFixed(1)} ft`, sub: (k) => `Visibility ${fmt(300 * (1 - smooth(k)))} ft`, cap: "By afternoon it's night." },
  { a: 10, b: 13, label: 'Sunlight', value: (k) => `${Math.round(100 - 40 * smooth(k))}%`, sub: (k) => fmtElapsed(10 + 3 * k), cap: 'Crops fail across the Midwest.' },
  { a: 13, b: 15, label: 'Global temperature', value: (k) => `−${Math.round(10 * smooth(k))} °F`, sub: (k) => fmtElapsed(13 + 2 * k), cap: 'Volcanic winter. Years of it.' },
];
function updateOverlay(t) {
  elTitle.style.opacity = smooth(t / 0.5) * (1 - smooth((t - 2.15) / 0.5));
  const beat = BEATS.find((b) => t >= b.a && t < b.b) || BEATS[BEATS.length - 1];
  const k = clamp((t - beat.a) / (beat.b - beat.a));
  hLabel.textContent = beat.label;
  hValue.textContent = beat.value(k);
  hSub.textContent = beat.sub(k);
  const sw = Math.min(smooth((t - beat.a) / 0.25), 1 - smooth((t - (beat.b - 0.12)) / 0.12));
  hud.style.opacity = (t < 15 ? Math.max(sw, 0.0) : 1 - smooth((t - 15) / 0.3)) * smooth((t - 0.3) / 0.4);
  const cs = beat.a + (beat.a === 0 ? 0.5 : 0.15), ce = beat.b - 0.05;
  cap.textContent = beat.cap;
  const co = smooth((t - cs) / 0.35) * (1 - smooth((t - (ce - 0.3)) / 0.3));
  cap.style.opacity = t < 15 ? co : 0;
  cap.style.transform = `translateY(${(1 - smooth((t - cs) / 0.35)) * 6}px)`;
  end.style.opacity = smooth((t - 14.8) / 0.5);
  end.querySelector('.a').style.opacity = smooth((t - 15.1) / 0.45);
  end.querySelector('.b').style.opacity = smooth((t - 15.6) / 0.45);
  end.querySelector('.c').style.opacity = smooth((t - 16.1) / 0.5) * 0.9;
}

{
  const g = document.getElementById('grain'), c = g.getContext('2d');
  const id = c.createImageData(256, 256), r = rng(99);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  g.style.width = '100%'; g.style.height = '100%';
}

/* ---------- public API ---------- */
// Renders one output frame. With sub > 1 the frame is the average of `sub` samples spread
// across `dt` seconds (motion blur).
function renderAt(t, sub = 1, dt = 1 / 60) {
  t = clamp(t, 0, T_END);
  for (let j = 0; j < sub; j++) {
    const tt = clamp(t + (sub > 1 ? (j / (sub - 1) - 0.5) * dt : 0), 0, T_END);
    update(tt);
    composer.render();
    actx.globalAlpha = 1 / (j + 1);
    actx.drawImage(glCanvas, 0, 0);
  }
  actx.globalAlpha = 1;
  drawMap(t);
  updateOverlay(t);
}
window.renderAt = renderAt;
window.dbg = { scene, camera, renderer };
window.T_END = T_END;

await Promise.all([
  document.fonts.load('500 40px "Cormorant Garamond"'),
  document.fonts.load('italic 500 30px "Cormorant Garamond"'),
]).catch(() => {});
window.READY = true;

if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) {
  const t0 = performance.now();
  const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); };
  loop();
}
