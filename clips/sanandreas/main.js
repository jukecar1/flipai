import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* ------------------------------------------------------------------ *
 *  "What if the San Andreas Fault ruptured?"  — deterministic 62s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 *
 *  Setting: a Los Angeles rooftop overlooking a palm-lined boulevard, a freeway
 *  overpass and the downtown skyline, with the San Gabriel Mountains behind.
 */

const T_END = 62; // master (video) time in seconds

// Master time -> scene time. The calm intro runs in real time (scene time -10..2),
// then the eruption, flow, collapse and aftermath play in slow motion.
const WARP = [[0, 0], [9, 9], [19, 12], [22, 15], [28, 21], [38, 28], [46, 36], [52, 40], [58, 44], [62, 46]];
const warpM = (() => {
  const n = WARP.length, h = [], d = [], m = new Array(n);
  for (let k = 0; k < n - 1; k++) { h[k] = WARP[k + 1][0] - WARP[k][0]; d[k] = (WARP[k + 1][1] - WARP[k][1]) / h[k]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] > 0) { const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1]; m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]); } else m[k] = 0;
  }
  return { h, m };
})();
function warp(T) {
  if (T <= WARP[0][0]) return WARP[0][1] + (T - WARP[0][0]);
  for (let k = 0; k < WARP.length - 1; k++) {
    if (T <= WARP[k + 1][0]) {
      const h = warpM.h[k], x = (T - WARP[k][0]) / h, x2 = x * x, x3 = x2 * x;
      return (2 * x3 - 3 * x2 + 1) * WARP[k][1] + (x3 - 2 * x2 + x) * h * warpM.m[k] + (-2 * x3 + 3 * x2) * WARP[k + 1][1] + (x3 - x2) * h * warpM.m[k + 1];
    }
  }
  return WARP[WARP.length - 1][1];
}
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
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: +(P.get('msaa') ?? 0) }));
composer.setSize(innerWidth * DPR, innerHeight * DPR);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * DPR, innerHeight * DPR), 0.15, 0.4, 1.6);
if (P.get('bloom') !== '0') composer.addPass(bloom);
composer.addPass(new OutputPass());
{
  const fxaa = new ShaderPass(FXAAShader);
  fxaa.material.uniforms['resolution'].value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR));
  composer.addPass(fxaa);
}

/* ---------- sky ---------- */
const SUN_DIR = new THREE.Vector3(0.52, 0.40, 0.62).normalize(); // golden afternoon sun, behind-right of the camera
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

function brickFill(ctx, x, y, w, h, base, rand, rowH = 10, brickW = 32) {
  ctx.fillStyle = '#5a5148'; ctx.fillRect(x, y, w, h);
  for (let r = 0; r * rowH < h; r++) {
    const off = (r % 2) * brickW / 2;
    for (let bx = -brickW; bx < w + brickW; bx += brickW) {
      ctx.fillStyle = shade(base, 0.8 + rand() * 0.38);
      const rx = Math.max(x, x + bx + off + 1), rw = Math.min(x + w, x + bx + off + brickW - 1) - rx;
      if (rw > 0) ctx.fillRect(rx, y + r * rowH + 1, rw, Math.min(rowH - 2, h - r * rowH));
    }
  }
  for (let i = 0; i < w * h / 70; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.09})`; ctx.fillRect(x + rand() * w, y + rand() * h, 2, 2); }
}

// 2 bays x 4 floors  = 7.2m x 13.6m
const BAY = 3.6, FLOOR = 3.4, TILE_W = BAY * 2, TILE_H = FLOOR * 4;
function makeFacade(base, seed) {
  const rand = rng(seed);
  const c = mkCanvas(512, 1024), e = mkCanvas(512, 1024);
  const x = c.getContext('2d'), ex = e.getContext('2d');
  brickFill(x, 0, 0, 512, 1024, base, rand);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 1024);
  for (let f = 0; f < 4; f++) {
    x.fillStyle = 'rgba(205,194,172,.55)'; x.fillRect(0, f * 256 + 246, 512, 8); // floor course
    for (let b = 0; b < 2; b++) {
      const x0 = b * 256 + 64, y0 = f * 256 + 46, ww = 128, wh = 168;
      x.fillStyle = '#d0c5b1'; x.fillRect(x0 - 10, y0 - 18, ww + 20, 16);              // lintel
      x.fillStyle = '#cbbfa9'; x.fillRect(x0 - 12, y0 + wh + 6, ww + 24, 12);          // sill
      x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(x0 - 12, y0 + wh + 18, ww + 24, 7);  // shadow under sill
      x.fillStyle = '#271f1a'; x.fillRect(x0 - 6, y0 - 6, ww + 12, wh + 12);           // frame
      const g = x.createLinearGradient(x0, y0, x0 + ww * 0.5, y0 + wh);
      g.addColorStop(0, '#94b4cc'); g.addColorStop(1, '#2f4154');
      x.fillStyle = g; x.fillRect(x0, y0, ww, wh);
      const st = Math.floor(rand() * 5);
      if (st === 1) { x.fillStyle = 'rgba(236,224,196,.88)'; x.fillRect(x0, y0, ww * 0.46, wh); }
      else if (st === 2) { x.fillStyle = 'rgba(214,206,190,.85)'; for (let yy = y0; yy < y0 + wh * 0.7; yy += 9) x.fillRect(x0, yy, ww, 6); }
      else if (st === 3) { x.fillStyle = 'rgba(20,18,18,.72)'; x.fillRect(x0, y0, ww, wh); }
      x.fillStyle = '#271f1a'; x.fillRect(x0 + ww / 2 - 3, y0, 6, wh); x.fillRect(x0, y0 + wh * 0.38, ww, 5);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.moveTo(x0, y0 + wh * 0.5); x.lineTo(x0 + ww * 0.55, y0); x.lineTo(x0 + ww * 0.85, y0); x.lineTo(x0, y0 + wh * 0.95); x.fill();
      if (rand() < 0.42) { ex.fillStyle = `rgb(255,${176 + (rand() * 40) | 0},${96 + (rand() * 30) | 0})`; ex.fillRect(x0, y0, ww, wh); }
    }
  }
  return { map: toTex(c), emissiveMap: toTex(e) };
}
// 2 bays x 4.6m shop strip
const SHOP_H = 4.6;
function makeShop(base, awnA, awnB, seed) {
  const rand = rng(seed);
  const c = mkCanvas(512, 327), e = mkCanvas(512, 327);
  const x = c.getContext('2d'), ex = e.getContext('2d');
  brickFill(x, 0, 0, 512, 327, base, rand);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 327);
  x.fillStyle = '#2a2724'; x.fillRect(0, 8, 512, 56);                                    // sign band
  for (let b = 0; b < 2; b++) {
    const bx = b * 256;
    x.fillStyle = shade(0xd8c9a8, 0.8 + rand() * 0.3); x.fillRect(bx + 36, 22, 100 + rand() * 80, 20); // fake lettering
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? awnA : awnB; x.beginPath(); x.moveTo(bx + 14 + i * 28, 70); x.lineTo(bx + 42 + i * 28, 70); x.lineTo(bx + 46 + i * 28, 122); x.lineTo(bx + 10 + i * 28, 122); x.fill(); }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx + 10, 122, 232, 10);
    const door = b === (seed % 2);
    const wx = bx + 26, wy = 138, ww = door ? 120 : 204, wh = 150;
    x.fillStyle = '#1e1a17'; x.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
    const g = x.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, '#3f5560'); g.addColorStop(1, '#141c20');
    x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    if (rand() < 0.7) { ex.fillStyle = `rgb(255,${190 + (rand() * 40) | 0},${110 + (rand() * 40) | 0})`; ex.fillRect(wx, wy, ww, wh); }
    x.fillStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.moveTo(wx, wy + wh * 0.6); x.lineTo(wx + ww * 0.5, wy); x.lineTo(wx + ww * 0.8, wy); x.lineTo(wx, wy + wh); x.fill();
    if (door) { x.fillStyle = '#231a14'; x.fillRect(bx + 164, 146, 66, 181); x.fillStyle = 'rgba(120,150,160,.5)'; x.fillRect(bx + 174, 156, 46, 90); }
    x.fillStyle = '#cfc4ae'; x.fillRect(bx + 14, 288, 228, 10);
  }
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 300, 512, 27);
  return { map: toTex(c), emissiveMap: toTex(e) };
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

const camW = new THREE.Vector3(), camQ = new THREE.Quaternion();
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
const SMOKE_N = 7000;
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
  const dx = x - camW.x, dy = y - camW.y, dz = z - camW.z;
  p.d = dx * dx + dy * dy + dz * dz;
  p.a *= smooth((Math.sqrt(p.d) - 10) / 50); // soft-particle fade so nothing becomes a flat wall in front of the lens
}
const puffTmp = new THREE.Object3D(), puffCol = new THREE.Color();
function flushSmoke() {
  const list = puffPool.slice(0, pc).sort((a, b) => b.d - a.d);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    puffTmp.position.set(p.x, p.y, p.z);
    puffTmp.quaternion.copy(camQ);
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


/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x7a6a58, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.target.position.set(0, 0, -200);
sun.castShadow = true;
sun.shadow.mapSize.set(+(P.get('shadow') ?? 2048), +(P.get('shadow') ?? 2048));
Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 1700 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 650, cy * 650, cz * 650 - 200);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}

/* ---------- environment maps so the glass towers actually reflect the sky ---------- */
const pmrem = new THREE.PMREMGenerator(renderer);
function makeEnv(hor, top, sunAmt) {
  const sc = new THREE.Scene();
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: THREE.UniformsUtils.clone(skyMat.uniforms), vertexShader: skyMat.vertexShader, fragmentShader: skyMat.fragmentShader });
  m.uniforms.hor.value.set(hor); m.uniforms.top.value.set(top); m.uniforms.sunAmt.value = sunAmt;
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(100, 24, 16), m));
  return pmrem.fromScene(sc, 0, 1, 400).texture;
}
const ENVS = [makeEnv(0xf3dcc0, 0x5f95d6, 1), makeEnv(0xb59673, 0x7a6a62, 0.1), makeEnv(0xd9803a, 0x3a2b35, 0.5)];

/* ------------------------------------------------------------------ *
 *  Textures
 * ------------------------------------------------------------------ */
function stuccoFill(ctx, w, h, base, rand) {
  ctx.fillStyle = shade(base, 1); ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 55; i++) { ctx.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${rand() * 0.06})` : `rgba(255,255,255,${rand() * 0.08})`; ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 3, 2 + rand() * 3); }
}
function makeStucco(base, seed) {
  const rand = rng(seed), c = mkCanvas(512, 1024), x = c.getContext('2d');
  stuccoFill(x, 512, 1024, base, rand);
  for (let f = 0; f < 4; f++) {
    x.fillStyle = 'rgba(0,0,0,.09)'; x.fillRect(0, f * 256 + 248, 512, 8);
    for (let b = 0; b < 2; b++) {
      const x0 = b * 256 + 62, y0 = f * 256 + 56, ww = 132, wh = 148;
      const st = Math.floor(rand() * 7);
      if (st === 5) { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f0ece0' : (rand() < 0.5 ? '#b5453a' : '#2f6a54'); x.beginPath(); x.moveTo(x0 - 8 + i * 18, y0 - 30); x.lineTo(x0 + 10 + i * 18, y0 - 30); x.lineTo(x0 + 14 + i * 18, y0 - 4); x.lineTo(x0 - 12 + i * 18, y0 - 4); x.fill(); } }
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(x0 - 10, y0 - 10, ww + 20, wh + 22);
      x.fillStyle = '#f4f1ea'; x.fillRect(x0 - 6, y0 - 6, ww + 12, wh + 12);
      const g = x.createLinearGradient(x0, y0, x0 + ww * 0.5, y0 + wh); g.addColorStop(0, '#a6c2d8'); g.addColorStop(1, '#34495c');
      x.fillStyle = g; x.fillRect(x0, y0, ww, wh);
      if (st === 1) { x.fillStyle = 'rgba(236,224,196,.88)'; x.fillRect(x0, y0, ww * 0.45, wh); }
      else if (st === 2) { x.fillStyle = 'rgba(214,206,190,.85)'; for (let yy = y0; yy < y0 + wh * 0.75; yy += 9) x.fillRect(x0, yy, ww, 6); }
      else if (st === 3) { x.fillStyle = 'rgba(20,18,18,.7)'; x.fillRect(x0, y0, ww, wh); }
      else if (st === 4) { x.fillStyle = '#aab0b4'; x.fillRect(x0 + 24, y0 + wh + 10, ww - 48, 32); x.fillStyle = '#7d8488'; x.fillRect(x0 + 30, y0 + wh + 16, ww - 60, 6); }
      x.fillStyle = '#f4f1ea'; x.fillRect(x0 + ww / 2 - 3, y0, 6, wh); x.fillRect(x0, y0 + wh * 0.45, ww, 5);
      x.fillStyle = 'rgba(255,255,255,.13)'; x.beginPath(); x.moveTo(x0, y0 + wh * 0.5); x.lineTo(x0 + ww * 0.55, y0); x.lineTo(x0 + ww * 0.85, y0); x.lineTo(x0, y0 + wh * 0.95); x.fill();
    }
  }
  return { map: toTex(c) };
}
function makeGlassTile(seed) { // 4x4 panes
  const rand = rng(seed), c = mkCanvas(256, 256), x = c.getContext('2d');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const g = x.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64);
    const h = 188 + rand() * 30, s = 28 + rand() * 24, l = 34 + rand() * 24;
    g.addColorStop(0, `hsl(${h},${s}%,${l + 10}%)`); g.addColorStop(1, `hsl(${h + 6},${s}%,${l - 10}%)`);
    x.fillStyle = g; x.fillRect(i * 64, j * 64, 64, 64);
  }
  x.fillStyle = '#23303a';
  for (let k = 0; k <= 4; k++) { x.fillRect(k * 64 - 2, 0, 4, 256); x.fillRect(0, k * 64 - 2, 256, 4); }
  return toTex(c);
}
const frondTex = (() => {
  const c = mkCanvas(128, 512), x = c.getContext('2d');
  x.strokeStyle = '#2f5a24'; x.lineWidth = 5; x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 512); x.stroke();
  for (let i = 0; i < 46; i++) {
    const y = 14 + i * 10.6, len = 56 * Math.sin(Math.PI * Math.min(1, (i + 6) / 52)) + 8;
    x.lineWidth = 4.5; x.strokeStyle = i % 2 ? '#3f7a2c' : '#4b8a34';
    x.beginPath(); x.moveTo(64, y); x.lineTo(64 - len, y + 20 + i * 0.1); x.moveTo(64, y); x.lineTo(64 + len, y + 20 + i * 0.1); x.stroke();
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
})();
const asphaltTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(8);
  x.fillStyle = '#403f43'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 44 + r() * 38; x.fillStyle = `rgb(${v},${v},${v + 3})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  for (let i = 0; i < 14; i++) { x.strokeStyle = 'rgba(10,10,10,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(r() * 256, r() * 256); x.lineTo(r() * 256, r() * 256); x.stroke(); }
  const t = toTex(c); t.repeat.set(5, 120); return t;
})();
const concreteTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(9);
  x.fillStyle = '#bdb6aa'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { const v = 150 + r() * 50; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  x.strokeStyle = 'rgba(70,64,58,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254);
  return toTex(c);
})();

/* ------------------------------------------------------------------ *
 *  Ground, boulevard, cross streets
 * ------------------------------------------------------------------ */
const groundMat = new THREE.MeshLambertMaterial({ color: 0x9a8f7c });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const STREET_HALF = 12, WALK = 5;
const CROSS = [-98, -208, -322];
const roadMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: asphaltTex });
const road = new THREE.Mesh(new THREE.PlaneGeometry(STREET_HALF * 2, 800), roadMat);
road.rotation.x = -Math.PI / 2; road.position.set(0, 0.05, -330); road.receiveShadow = true; scene.add(road);
for (const cz of CROSS) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(340, 15), new THREE.MeshLambertMaterial({ color: 0x47464a }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.06, cz); m.receiveShadow = true; scene.add(m);
}
const walkMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: concreteTex });
for (const s of [-1, 1]) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(WALK, 0.22, 800), walkMat);
  w.position.set(s * (STREET_HALF + WALK / 2), 0.11, -330); w.receiveShadow = true;
  const uv = w.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 160);
  scene.add(w);
}
{ // lane markings
  const yel = new THREE.MeshLambertMaterial({ color: 0xe9c43a }), wht = new THREE.MeshLambertMaterial({ color: 0xece9e0 });
  for (const dx of [-0.2, 0.2]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 800), yel); m.rotation.x = -Math.PI / 2; m.position.set(dx, 0.075, -330); scene.add(m); }
  const dashes = [];
  for (const lx of [-6.2, 6.2]) for (let z = 40; z > -700; z -= 9) dashes.push([lx, z]);
  const dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 3.2), wht, dashes.length), d = new THREE.Object3D();
  dashes.forEach(([x, z], i) => { d.position.set(x, 0.075, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); dm.setMatrixAt(i, d.matrix); });
  scene.add(dm);
  const bars = [];
  for (const cz of [-14, ...CROSS]) for (let x = -STREET_HALF + 1; x < STREET_HALF; x += 1.6) bars.push([x, cz + 8.6]);
  const bm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 3.4), wht, bars.length);
  bars.forEach(([x, z], i) => { d.position.set(x, 0.08, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); bm.setMatrixAt(i, d.matrix); });
  scene.add(bm);
}

/* ------------------------------------------------------------------ *
 *  Buildings
 * ------------------------------------------------------------------ */
const brickCols = [0x9e4a37, 0x8a3d33, 0xb28a5e, 0x7d4d3c];
const stuccoCols = [0xe9dcc0, 0xdcbfa0, 0xf0efe9, 0xcbd8c6, 0xe7c9a8, 0xbccbdb, 0xe8ac92, 0xd8d0b8];
const FACADES = [
  ...brickCols.map((c, i) => ({ tex: makeFacade(c, 100 + i).map, style: 'brick', col: c })),
  ...stuccoCols.map((c, i) => ({ tex: makeStucco(c, 300 + i).map, style: 'stucco', col: c })),
];
const shopHex = (n) => '#' + n.toString(16).padStart(6, '0');
const SHOPS = [[0x2f5a3c, 0xe8e1cf], [0x1f3b6b, 0xe8e1cf], [0xa3262c, 0xe8e1cf], [0xc9962a, 0x2a2724]].map(([a, b], i) => makeShop(brickCols[i % 4], shopHex(a), shopHex(b), 200 + i).map);
const facadeMats = FACADES.map((f) => new THREE.MeshLambertMaterial({ map: f.tex }));
const shopMats = SHOPS.map((t) => new THREE.MeshLambertMaterial({ map: t }));
const roofMat = new THREE.MeshLambertMaterial({ color: 0x77736c });
const stoneMat = new THREE.MeshLambertMaterial({ color: 0xcfc6b4 });
const tankMat = new THREE.MeshLambertMaterial({ color: 0x7a5a40 });
const unitMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a4 });

function texBox(w, h, d, sideMat, topMat, tileW, tileH) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const side = f < 2 || f > 3, [fw, fh] = dims[f];
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * fw / (side ? tileW : 8), uv.getY(k) * fh / (side ? tileH : 8)); }
  }
  const m = new THREE.Mesh(g, [sideMat, sideMat, topMat, topMat, sideMat, sideMat]);
  m.castShadow = true; m.receiveShadow = true; return m;
}

// scripted failures (scene seconds): the camera's own rooftop never fails
const FAILS = [
  { side: -1, z: -46, kind: 'topple', t: 17.0, brick: true, floors: 5 },
  { side: 1, z: -84, kind: 'topple', t: 18.7, brick: true, floors: 4 },
  { side: -1, z: -128, kind: 'topple', t: 20.4, brick: true, floors: 6 },
  { side: 1, z: -214, kind: 'pancake', t: 29.6, floors: 9 },
  { side: -1, z: -262, kind: 'pancake', t: 32.8, floors: 8 },
  { side: 1, z: -332, kind: 'topple', t: 35.2, floors: 7 },
];
const buildings = [];
{
  const r = rng(21);
  const FLOORH = 3.6;
  const place = (side, zStart, zEnd) => {
    let z = zStart;
    while (z > zEnd) {
      const bays = 4 + Math.floor(r() * 3), dz = bays * BAY;
      const cx = CROSS.find((c) => z - dz < c + 8 && z > c - 8);
      if (cx !== undefined) { z = cx - 8; continue; }
      const zc = z - dz / 2;
      let fail = FAILS.find((f) => f.side === side && !f.used && Math.abs(f.z - zc) < 14);
      if (fail) fail.used = true;
      let floors = zc > -140 ? 2 + Math.floor(r() * 4) : 3 + Math.floor(r() * 5), brick = r() < 0.28;
      if (fail) { floors = fail.floors; brick = !!fail.brick; }
      const vi = brick ? Math.floor(r() * 4) : 4 + Math.floor(r() * stuccoCols.length);
      const depthX = 24;
      const g = new THREE.Group();
      const shop = texBox(depthX, SHOP_H, dz, shopMats[Math.floor(r() * 4)], roofMat, TILE_W, SHOP_H); shop.position.y = SHOP_H / 2;
      const hh = floors * FLOORH;
      const up = texBox(depthX, hh, dz, facadeMats[vi], roofMat, TILE_W, TILE_H); up.position.y = SHOP_H + hh / 2;
      const cor = new THREE.Mesh(new THREE.BoxGeometry(depthX + 0.8, 0.7, dz + 0.8), stoneMat); cor.position.y = SHOP_H + hh + 0.35; cor.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(depthX - 0.4, 0.5, dz - 0.4), roofMat); roof.position.y = SHOP_H + hh + 0.5;
      g.add(shop, up, cor, roof);
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const m = r() < 0.25 ? new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8), tankMat) : new THREE.Mesh(new THREE.BoxGeometry(1.5 + r() * 2.5, 1 + r() * 1.3, 1.5 + r() * 2.5), unitMat);
        m.position.set((r() - 0.5) * (depthX - 6), SHOP_H + hh + 1.8, (r() - 0.5) * (dz - 4)); m.castShadow = true; g.add(m);
      }
      const x = side * (STREET_HALF + WALK + depthX / 2);
      g.position.set(x, 0, zc);
      scene.add(g);
      buildings.push({ g, x, z: zc, w: depthX, d: dz, h: SHOP_H + hh, side, fail, seed: r() * 6.28, y: 0 });
      z -= dz + (r() < 0.22 ? 2 + r() * 3 : 0);
    }
  };
  for (const side of [-1, 1]) place(side, 12, -430);
}
// the building under our feet (roof overlook), never fails
const ROOF_Y = 46;
{
  const g = new THREE.Group();
  const w = 24, d = 44, h = ROOF_Y;
  const body = texBox(w, h, d, facadeMats[5], roofMat, TILE_W, TILE_H); body.position.y = h / 2;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), new THREE.MeshLambertMaterial({ color: 0x5b5855 })); roof.position.y = h + 0.25;
  g.add(body, roof);
  g.position.set(STREET_HALF + WALK + w / 2, 0, 36);
  scene.add(g);
}

/* ---------- downtown skyline (glass, reflective) ---------- */
const glassTexA = makeGlassTile(41), glassTexB = makeGlassTile(42);
const glassMats = [glassTexA, glassTexB].map((t) => new THREE.MeshLambertMaterial({ map: t, envMap: ENVS[0], reflectivity: 0.5, combine: THREE.MixOperation }));
const crownMat = new THREE.MeshLambertMaterial({ color: 0xb9c4cc, envMap: ENVS[0], reflectivity: 0.45, combine: THREE.MixOperation });
const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const towers = [];
{
  const r = rng(55);
  const spec = [];
  for (let i = 0; i < 34; i++) {
    const cxn = (r() - 0.5) * 760, depth = -820 - r() * 330;
    const centre = 1 - Math.min(1, Math.abs(cxn) / 380);
    spec.push({ x: cxn, z: depth, w: 28 + r() * 34, d: 28 + r() * 34, h: 70 + centre * (60 + r() * 230) + r() * 40 });
  }
  spec.sort((a, b) => b.z - a.z);
  spec.forEach((s, i) => {
    const g = new THREE.Group();
    const body = texBox(s.w, s.h, s.d, glassMats[i % 2], crownMat, 12.8, 14.4); body.position.y = s.h / 2; g.add(body);
    if (r() < 0.55) { const t2 = texBox(s.w * 0.7, s.h * 0.12, s.d * 0.7, glassMats[(i + 1) % 2], crownMat, 12.8, 14.4); t2.position.y = s.h + s.h * 0.06; g.add(t2); }
    if (r() < 0.5) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, s.h * 0.18, 6), crownMat); sp.position.y = s.h * 1.12 + s.h * 0.09; g.add(sp); const b = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 4), beaconMat); b.position.y = s.h * 1.12 + s.h * 0.18 + 1; g.add(b); }
    g.position.set(s.x, 0, s.z); scene.add(g);
    towers.push({ g, h: s.h, ph: r() * 6.28, f: 0.35 + 18 / s.h * 0.35, amp: 0.012 + r() * 0.006 });
  });
}
{ // sea of low-rise behind the boulevard
  const r = rng(77), N = 900, m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), N), d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * 1300, z = -480 - r() * 420, w = 14 + r() * 22, h = 8 + Math.pow(r(), 2) * 50, dd = 14 + r() * 22;
    d.position.set(x, h / 2, z); d.scale.set(w, h, dd); d.rotation.set(0, 0, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    m.setColorAt(i, c.set(stuccoCols[Math.floor(r() * stuccoCols.length)]).multiplyScalar(0.8 + r() * 0.25));
  }
  scene.add(m);
}
{ // far foothills + the San Gabriel Mountains
  const R = rng(11);
  const mountMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const rugged = (geo, lo, mid, hi, snowAmt, yMin, yMax) => {
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), snow = new THREE.Color(0xe6e9ee), a = new THREE.Color(), b = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i), h = (y0 - yMin) / (yMax - yMin);
      const ang = Math.atan2(z0, x0), j = hash2(Math.round(ang * 40), Math.round(y0 / 40)) - 0.5, rad = Math.hypot(x0, z0) * (1 + j * 0.16 * (1 - h * 0.5));
      pos.setXYZ(i, Math.cos(ang) * rad, y0 + j * 40 * (1 - h), Math.sin(ang) * rad);
      a.set(lo); b.set(mid);
      if (h < 0.45) c.copy(a).lerp(b, h / 0.45); else c.copy(b).lerp(a.set(hi), (h - 0.45) / 0.55);
      if (snowAmt && h > 0.78) c.lerp(snow, (h - 0.78) / 0.22 * snowAmt);
      const n = 0.88 + 0.24 * hash2(Math.round(ang * 40), Math.round(y0 / 40) + 7);
      col[i * 3] = c.r * n; col[i * 3 + 1] = c.g * n; col[i * 3 + 2] = c.b * n;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  };
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 16; i++) {
    const x = -4200 + i * 560 + (R() - 0.5) * 380 + layer * 170, h = (layer === 2 ? 800 : 1050) + R() * (layer === 2 ? 700 : 900) - layer * 150, rr = 600 + R() * 600;
    const g = new THREE.ConeGeometry(rr, h, 11, 5); g.translate(0, h / 2, 0); g.scale(2.1 + R() * 1.2, 1, 0.85);
    rugged(g, layer === 2 ? 0x6a6a52 : 0x66654f, layer === 2 ? 0x77705f : 0x7a7064, layer === 2 ? 0x8f8a80 : 0x9b958d, layer === 2 ? 0.35 : 0.9, 0, h);
    const m = new THREE.Mesh(g, mountMat); m.position.set(x, -20, -3300 - layer * 520 - R() * 300); m.rotation.y = (R() - 0.5) * 0.5; scene.add(m);
  }
  for (let i = 0; i < 14; i++) {
    const x = -1800 + i * 260 + (R() - 0.5) * 100, h = 120 + R() * 260, rr = 320 + R() * 280;
    const g = new THREE.ConeGeometry(rr, h, 8, 3); g.translate(0, h / 2, 0); rugged(g, 0x75704f, 0x857a66, 0x9a9486, 0, 0, h);
    const m = new THREE.Mesh(g, mountMat); m.position.set(x, -10, -1500 - R() * 400); scene.add(m);
  }
}

/* ------------------------------------------------------------------ *
 *  Freeway overpass across the boulevard
 * ------------------------------------------------------------------ */
const FWY_Z = -150, FWY_Y = 11, SEG = 28, NSEG = 14;
const concMat = new THREE.MeshLambertMaterial({ color: 0xa7a299 });
const deckAsphalt = new THREE.MeshLambertMaterial({ color: 0x3d3c40 });
const barrierMat = new THREE.MeshLambertMaterial({ color: 0xbab5aa });
function makeCarLite(col) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.9), mat); body.position.y = 0.7;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.75, 1.6), new THREE.MeshLambertMaterial({ color: 0x1b2430 })); cab.position.set(-0.1, 1.4, 0);
  g.add(body, cab); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
const carColsLA = [0xd9d9d3, 0x1a1a1c, 0x2b4a86, 0xb21f24, 0xc8cacc, 0x6c7378, 0xe0b92a, 0x2f6b4a, 0xf2f2ee, 0x25282c];
const fwySegs = [];
{
  const r = rng(91);
  for (let i = 0; i < NSEG; i++) {
    const xc = -((NSEG - 1) / 2) * SEG + i * SEG, g = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(SEG - 0.3, 1.5, 24), concMat); deck.position.y = FWY_Y; deck.castShadow = true; deck.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(SEG - 0.3, 0.05, 22), deckAsphalt); top.position.y = FWY_Y + 0.78;
    g.add(deck, top);
    for (const zz of [-11.7, 11.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(SEG - 0.3, 1.0, 0.6), barrierMat); b.position.set(0, FWY_Y + 1.3, zz); b.castShadow = true; g.add(b); }
    for (const zz of [-6, 6]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, FWY_Y - 0.8, 10), concMat); c.position.set(0, (FWY_Y - 0.8) / 2, zz); c.castShadow = true; g.add(c); }
    const cars = [];
    for (let k = 0; k < 3; k++) {
      const car = makeCarLite(carColsLA[Math.floor(r() * carColsLA.length)]); const lane = [-7.5, -2.5, 2.5, 7.5][k + (k > 1 ? 0 : 0)];
      car.position.set(0, FWY_Y + 0.82, lane); car.rotation.y = lane > 0 ? 0 : Math.PI; g.add(car);
      cars.push({ car, lane, ph: r(), v: 0.18 + r() * 0.12 });
    }
    g.position.set(xc, 0, FWY_Z); scene.add(g);
    fwySegs.push({ g, xc, i, cars, t: 24.0 + 0.33 * Math.abs(i - (NSEG - 1) / 2 + 0.5) + (r() - 0.5) * 0.3, dir: i % 2 ? 1 : -1 });
  }
}

/* ------------------------------------------------------------------ *
 *  Palm trees (instanced, sway + snap)
 * ------------------------------------------------------------------ */
const PALMS = [];
{
  const r = rng(131);
  for (const side of [-1, 1]) for (let z = 8; z > -430; z -= 14.5) {
    if (CROSS.some((c) => Math.abs(z - c) < 9)) continue;
    PALMS.push({ x: side * (STREET_HALF + 2.2), z: z + (r() - 0.5) * 3, h: 10 + r() * 7, ph: r() * 6.28, f: 1.0 + r() * 0.5, fall: r() < 0.14 ? 18 + r() * 9 : 1e9, side });
  }
}
const trunkGeo = new THREE.CylinderGeometry(0.22, 0.4, 1, 8); trunkGeo.translate(0, 0.5, 0);
const palmTrunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x8c7b66 }), PALMS.length);
palmTrunks.castShadow = true; palmTrunks.frustumCulled = false; scene.add(palmTrunks);
const FROND_N = 9;
const frondGeo = new THREE.PlaneGeometry(1.5, 5.6, 1, 8);
{
  const p = frondGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const s = (p.getY(i) + 2.8) / 5.6; p.setXYZ(i, p.getX(i) * (1 - 0.35 * s), -0.9 * s * s, s * 5.6); }
  frondGeo.computeVertexNormals();
}
const palmFronds = new THREE.InstancedMesh(frondGeo, new THREE.MeshLambertMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide }), PALMS.length * FROND_N);
palmFronds.castShadow = true; palmFronds.frustumCulled = false; scene.add(palmFronds);
{ const c = new THREE.Color(); let k = 0; for (let i = 0; i < PALMS.length; i++) for (let j = 0; j < FROND_N; j++) palmFronds.setColorAt(k++, c.setRGB(0.8 + hash2(i, j) * 0.35, 0.9 + hash2(j, i) * 0.2, 0.75 + hash2(i + j, 3) * 0.2)); }

/* ------------------------------------------------------------------ *
 *  Traffic, pedestrians
 * ------------------------------------------------------------------ */
const NO_SHADOW = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
const LANES = [-9, -3.4, 3.4, 9];
const cars = [];
const carBodyGeo = new THREE.BoxGeometry(1.85, 0.8, 4.5), carCabGeo = new THREE.BoxGeometry(1.6, 0.72, 2.4), wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
const glassDark = new THREE.MeshLambertMaterial({ color: 0x1b2430 }), tyreMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
function makeCar(col, kind) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
  const sc = kind === 'suv' ? 1.18 : kind === 'van' ? 1.45 : 1;
  const body = new THREE.Mesh(carBodyGeo, mat); body.position.y = 0.72; body.scale.set(1, 1, kind === 'van' ? 1.12 : 1);
  const cab = new THREE.Mesh(carCabGeo, glassDark); cab.position.set(0, 1.4 + (sc - 1) * 0.5, kind === 'van' ? 0.2 : 0.1); cab.scale.set(1, sc, kind === 'van' ? 1.35 : 1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.1, 2.2 * (kind === 'van' ? 1.35 : 1)), mat); roof.position.set(0, 1.78 + (sc - 1) * 0.9, kind === 'van' ? 0.2 : 0.1);
  g.add(body, cab, roof);
  for (const [wx, wz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) { const w = new THREE.Mesh(wheelGeo, tyreMat); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
{
  const r = rng(41);
  for (let i = 0; i < 46; i++) {
    const parked = i >= 34;
    const lane = parked ? (r() < 0.5 ? -10.8 : 10.8) : LANES[i % 4];
    const kind = r() < 0.18 ? 'suv' : r() < 0.08 ? 'van' : 'sedan';
    const col = r() < 0.07 ? 0xe8b923 : carColsLA[Math.floor(r() * carColsLA.length)];
    const g = makeCar(col, kind); NO_SHADOW(g);
    const z0 = parked ? 6 - (i - 34) * 34 - r() * 10 : 30 - r() * 460;
    const dir = lane > 0 ? -1 : 1;
    g.rotation.y = parked ? (lane > 0 ? 0 : Math.PI) : (dir < 0 ? 0 : Math.PI);
    g.position.set(lane, 0.05, z0); scene.add(g);
    cars.push({ g, lane, z0, dir: parked ? 0 : dir, v: 7 + r() * 5, parked, baseRot: g.rotation.y, i, slide: r() < 0.3 ? (r() < 0.5 ? -1 : 1) : 0 });
  }
}
const people = [];
{
  const r = rng(51);
  for (let i = 0; i < 30; i++) {
    const pr = makePerson(r), g = pr.g; NO_SHADOW(g);
    const side = r() < 0.5 ? -1 : 1, cross = i % 5 === 0;
    const z = cross ? [-14, ...CROSS][i % 4] + 8.6 : 6 - r() * 330;
    g.scale.setScalar(0.92 + r() * 0.08);
    people.push({ g, legs: pr.legs, arms: pr.arms, side, cross, z0: z, x0: cross ? (r() - 0.5) * 20 : side * (STREET_HALF + 1.2 + r() * 3), dirv: r() < 0.5 ? -1 : 1, sp: 0.9 + r() * 0.5, ph: r() * 6.28, fallT: 15.2 + r() * 2.8, fx: (r() - 0.5) * 1.6 });
    scene.add(g);
  }
}

/* ------------------------------------------------------------------ *
 *  Our rooftop: deck + rail ride the shaking rig so only the world appears to jump
 * ------------------------------------------------------------------ */
const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);



/* ------------------------------------------------------------------ *
 *  Debris, glass, cracks, fires, sparks
 * ------------------------------------------------------------------ */
const failB = buildings.filter((b) => b.fail);
failB.forEach((b) => { b.t0 = b.fail.t; b.kind = b.fail.kind; });
const debris = [];
{
  const r = rng(1234), cols = [0x9a4a38, 0x8a8780, 0xb9b2a4, 0x7d7a74, 0xc9a37c];
  for (const b of failB) {
    const n = b.kind === 'pancake' ? 110 : 70;
    for (let k = 0; k < n; k++) debris.push({
      b, ox: (r() - 0.5) * b.w, oy: 2 + r() * (b.h - 2), oz: (r() - 0.5) * b.d, vx: -b.side * (2 + r() * 16), vy: 2 + r() * 14, vz: (r() - 0.35) * 22,
      sx: 0.8 + r() * 2.6, sy: 0.5 + r() * 1.4, sz: 0.5 + r() * 1.6, spin: (r() - 0.5) * 7, col: cols[Math.floor(r() * cols.length)], dly: r() * (b.kind === 'pancake' ? 2.2 : 1.0),
    });
  }
}
const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), debris.length);
debMesh.frustumCulled = false; debMesh.castShadow = true; scene.add(debMesh);
{ const c = new THREE.Color(); debris.forEach((d, i) => debMesh.setColorAt(i, c.set(d.col).multiplyScalar(0.85 + hash2(i, 5) * 0.3))); }

// window glass raining off the facades
const glassPool = buildings.filter((b) => !b.fail && b.z < 6 && b.z > -330);
const SHARDS = 420, shards = [];
{
  const r = rng(808);
  for (let i = 0; i < SHARDS; i++) {
    const b = glassPool[Math.floor(r() * glassPool.length)];
    shards.push({ b, t0: 15.4 + r() * 11, y0: 5 + r() * (b.h - 6), oz: (r() - 0.5) * b.d, s: 0.5 + r() * 1.1, spin: (r() - 0.5) * 9, drift: 1 + r() * 4 });
  }
}
const shardMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xcfefff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), SHARDS);
shardMesh.frustumCulled = false; scene.add(shardMesh);

// cracks tearing across the boulevard
const crackMat = new THREE.MeshBasicMaterial({ color: 0x0c0907 });
const cracks = [];
{
  const r = rng(321);
  const paths = [[-3, -8, 0.15, -1], [0, -36, 1.57, 1], [6.5, -86, 0.1, -1], [-5, -176, 0.2, -1]];
  for (const [x0, z0, ang0, dir] of paths) {
    let x = x0, z = z0, a = ang0;
    for (let k = 0; k < 9; k++) {
      const len = 5 + r() * 3, m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), crackMat);
      const dx = Math.sin(a) * len * (ang0 > 1 ? 1 : 0.35) + (ang0 > 1 ? len * dir : 0), dz = ang0 > 1 ? Math.sin(a - 1.57) * len * 0.5 : -len;
      m.position.set(x + dx / 2, 0.09, z + dz / 2); m.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
      m.visible = false; scene.add(m);
      cracks.push({ m, len: Math.hypot(dx, dz), k, w: 0.35 + r() * 0.5 });
      x += dx; z += dz; a += (r() - 0.5) * 0.9;
    }
  }
}

// fires + sparks
const FIRES = [[-27, 22, -112, 31.2], [30, 27, -178, 33.0], [-31, 24, -236, 35.0], [20, 33, -292, 36.4], [-23, 19, -62, 34.2], [42, 25, -96, 37.5], [-60, 6, -346, 38.8]];
const SPARKS = [[-14.5, 8, -32, 16.4], [14.5, 8, -72, 18.1], [-14.5, 8, -122, 21.6], [14.5, 8, -184, 26.0]];


/* ---------- soft sprites: haze ---------- */
const hazeLayers = [];
{
  const r = rng(606);
  for (const [n, size] of [[110, 44], [90, 20], [60, 90]]) hazeLayers.push(pointsLayer(n, size, 0xd9b890, () => [(r() - 0.5) * 120, 3 + r() * 50, 28 - r() * 250, r() * 6.28]));
}
const dimSun = new THREE.Points((() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([260, 330, -4600]), 3)); return g; })(),
  new THREE.PointsMaterial({ color: 0xff9248, size: 800, map: sprite, transparent: true, opacity: 0, depthWrite: false, fog: false }));
dimSun.frustumCulled = false; scene.add(dimSun);
const cloudsLA = pointsLayer(18, 380, 0xffffff, (i) => [(hash2(i, 11) - 0.5) * 3600, 380 + hash2(i, 12) * 420, -1800 - hash2(i, 13) * 1600, hash2(i, 14)]);

/* ------------------------------------------------------------------ *
 *  Per-frame update  (t = scene seconds)
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
const SKY_H = [[0, 0xf1dcc2], [14, 0xf1dcc2], [18, 0xcdb08f], [26, 0xb59673], [34, 0xa07a58], [40, 0xd8803c], [46, 0xe0703a]];
const SKY_T = [[0, 0x5f95d6], [14, 0x5f95d6], [18, 0x7d8c9e], [26, 0x7a6a62], [34, 0x5a4a4c], [40, 0x3a2b35], [46, 0x2d2230]];
const CAM0 = new THREE.Vector3(17.4, ROOF_Y + 0.5 + 1.7, 14.6); // the roof's NW corner
const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mC = new THREE.Matrix4(), eA = new THREE.Euler(), qA = new THREE.Quaternion(), vA = new THREE.Vector3(), vS = new THREE.Vector3();

function shakeEnv(t) {
  const e = smooth((t - 15) / 1.3) * (1 - smooth((t - 36) / 7.5)) * (0.78 + 0.22 * Math.sin(t * 2.3));
  const pw = smooth((t - 12) / 0.2) * (1 - smooth((t - 12.8) / 0.9)) * 0.2;
  const af = smooth((t - 41) / 0.15) * (1 - smooth((t - 41.6) / 1.2)) * 0.42;
  return Math.max(e, pw, af);
}
const fmod = (a, n) => ((a % n) + n) % n;

function update(t) {
  pc = 0;
  const E = shakeEnv(t);

  /* sky / fog / lights */
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [15, 0.6], [26, 0], [46, 0]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00026], [14, 0.0003], [17, 0.0005], [26, 0.0009], [34, 0.0013], [40, 0.0016], [46, 0.0019]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [26, 1.0], [40, 1.08], [46, 1.12]]);
  setSun(kf(t, [[0, 33], [14, 31], [30, 25], [40, 15], [46, 9]]));
  sun.intensity = Math.PI * kf(t, [[0, 2.8], [14, 2.7], [17, 2.0], [30, 1.2], [40, 0.85], [46, 0.65]]);
  kfc(t, [[0, 0xffe4b8], [30, 0xe8b890], [40, 0xff9a5a], [46, 0xff8a48]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [15, 0.95], [30, 0.7], [40, 0.55], [46, 0.5]]);
  hemi.color.copy(horC).lerp(topC, 0.55);
  hemi.groundColor.set(0x7a6a58);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.08], [26, 0.92], [40, 0.88], [46, 0.9]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [30, 1.08], [46, 1.1]]).toFixed(3)})`;
  const env = t < 17 ? ENVS[0] : t < 36 ? ENVS[1] : ENVS[2];
  glassMats.forEach((m) => { m.envMap = env; }); crownMat.envMap = env;
  beaconMat.color.set(0xff2a2a).multiplyScalar(0.35 + 0.65 * (Math.sin(t * 4.2) > 0 ? 1 : 0));

  /* camera rig: world appears to shake because the rig (camera + our rail) does */
  const lookYaw = kf(t, [[0, 17], [6, 14], [12, 13], [15, 20], [16.5, 28], [18, 28], [19, 4], [20.5, -3], [22, 6], [24, 7], [27, 5], [29, 1], [32, 0], [33.5, 10], [36, 10], [38, 3], [42, 5], [46, -3]]);
  const lookPitch = kf(t, [[0, -18], [6, -16], [12, -14], [15, -15], [16.5, -17], [19, -12], [22, -10], [26, -9], [30, -8], [34, -8], [38, -4], [46, 0]]);
  const fov = kf(t, [[0, 63], [6, 59], [15, 58], [30, 56], [46, 60]]);
  const sh = (a, b) => Math.sin(t * a + b);
  rig.position.set(CAM0.x + E * 0.34 * (sh(17.3, 1) + 0.6 * sh(9.7, 2) + 0.4 * sh(31, 3)), CAM0.y + E * 0.16 * (sh(23.1, 4) + 0.5 * sh(12.4, 5)), CAM0.z + E * 0.3 * (sh(13.7, 6) + 0.5 * sh(27, 7)));
  rig.rotation.set(E * 0.012 * sh(7.7, 8), E * 0.006 * sh(5.9, 9), E * 0.016 * sh(6.1, 10));
  camera.position.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(lookPitch) + 0.0012 * sh(1.3, 1), THREE.MathUtils.degToRad(lookYaw) + 0.0016 * sh(0.8, 2), 0.0015 * sh(1.1, 3));
  if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);

  /* buildings: tremble, then fail on cue */
  for (const b of buildings) {
    const g = b.g, tr = E * 0.0035 * Math.sin(t * 8.5 + b.seed);
    g.rotation.set(E * 0.0025 * Math.sin(t * 7.1 + b.seed * 2), 0, tr);
    g.position.set(b.x + E * 0.14 * Math.sin(t * 11 + b.seed), 0, b.z);
    g.scale.set(1, 1, 1);
    if (b.fail) {
      const p = smooth((t - b.t0) / (b.kind === 'pancake' ? 2.6 : 2.2));
      if (b.kind === 'pancake') {
        const q = Math.pow(p, 1.6);
        g.scale.y = 1 - 0.9 * q; g.rotation.z += b.side * 0.07 * q; g.rotation.x += 0.05 * q * Math.sin(b.seed); g.position.x += b.side * -2.5 * q;
      } else {
        g.rotation.z = b.side * 0.62 * p * p + tr; g.rotation.x += 0.12 * p; g.position.y = -4.5 * p; g.position.x += -b.side * 2.2 * p; g.scale.y = 1 - 0.5 * p;
      }
    }
  }
  /* towers sway on their long period */
  const TW = smooth((t - 15) / 2.5) * (1 - smooth((t - 40) / 8)) + 0.18 * smooth((t - 12) / 0.3) * (1 - smooth((t - 14) / 1));
  for (const tw of towers) {
    const a = TW * tw.amp * (tw.h / 200), br = 0.0012 * Math.sin(t * 0.5 + tw.ph);
    tw.g.rotation.set(a * Math.sin(t * tw.f * 6.28 + tw.ph + 1) + br, 0, a * Math.sin(t * tw.f * 6.28 + tw.ph));
  }
  /* freeway: busy, then it drops */
  for (const s of fwySegs) {
    const p = smooth((t - s.t) / 2.0), q = Math.pow(p, 1.4);
    s.g.position.set(s.xc + E * 0.2 * Math.sin(t * 9 + s.i), -q * (FWY_Y - 1.6), FWY_Z);
    s.g.rotation.set(0, 0, s.dir * q * 0.4 + E * 0.004 * Math.sin(t * 6 + s.i));
    const drive = Math.min(t, 12.1);
    for (const c of s.cars) { c.car.position.x = (fmod(c.ph + drive * c.v + 0.5, 1) - 0.5) * (SEG - 6) * (c.lane > 0 ? -1 : 1); }
  }

  /* palms */
  const PF = [];
  for (let i = 0; i < PALMS.length; i++) {
    const pl = PALMS[i], pf = smooth((t - pl.fall) / 1.9);
    const sz = 0.012 * Math.sin(t * 0.8 + pl.ph) + E * 0.13 * Math.sin(t * pl.f * 4.1 + pl.ph) + pl.side * pf * 1.42;
    const sx = 0.01 * Math.sin(t * 0.7 + pl.ph * 2) + E * 0.1 * Math.sin(t * pl.f * 3.3 + pl.ph * 1.7);
    eA.set(sx, 0, sz, 'XYZ'); qA.setFromEuler(eA);
    mA.compose(vA.set(pl.x, 0, pl.z), qA, vS.set(1, 1, 1));
    mC.copy(mA).scale(vS.set(1, pl.h, 1)); palmTrunks.setMatrixAt(i, mC);
    for (let j = 0; j < FROND_N; j++) {
      const yaw = (j / FROND_N) * 6.283 + pl.ph, pit = -0.55 + 0.2 * Math.sin(j * 1.7) + E * 0.3 * Math.sin(t * 9 + j * 2 + pl.ph) + 0.05 * Math.sin(t * 1.4 + j);
      eA.set(pit, yaw, 0, 'YXZ'); qA.setFromEuler(eA);
      mB.compose(vA.set(0, pl.h, 0), qA, vS.set(1, 1, 1)); mC.multiplyMatrices(mA, mB);
      palmFronds.setMatrixAt(i * FROND_N + j, mC);
    }
  }
  palmTrunks.instanceMatrix.needsUpdate = true; palmFronds.instanceMatrix.needsUpdate = true;

  /* cars */
  for (const c of cars) {
    const brake = t < 12.2 ? t : 12.2 + 0.75 * (1 - Math.exp(-(t - 12.2) / 0.75));
    let z = c.z0 + c.dir * c.v * brake;
    if (c.dir !== 0 && t < 12.2) z = fmod(z + 440, 480) - 440;
    else if (c.dir !== 0) { z = fmod(c.z0 + c.dir * c.v * 12.2 + 440, 480) - 440 + c.dir * c.v * 0.75 * (1 - Math.exp(-(t - 12.2) / 0.75)); }
    let x = c.lane + E * 0.3 * Math.sin(t * 13 + c.i), yaw = c.baseRot;
    if (c.slide) { const sp = smooth((t - 15.6) / 2.6); x += c.slide * sp * (1.2 + (c.i % 3)); yaw += c.slide * sp * (0.25 + 0.15 * (c.i % 4)); }
    c.g.position.set(x, 0.05 + E * 0.05 * Math.abs(Math.sin(t * 15 + c.i)), z);
    c.g.rotation.set(E * 0.025 * Math.sin(t * 11 + c.i), yaw, E * 0.03 * Math.sin(t * 9 + c.i));
  }
  /* people: stroll, freeze at the P-wave, fall when the S-wave arrives */
  for (const p of people) {
    const tt = Math.min(t, 12.4);
    let x, z, face;
    if (p.cross) { x = fmod(p.x0 + p.dirv * p.sp * tt + 12, 24) - 12; z = p.z0; face = p.dirv > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = p.x0; z = fmod(p.z0 + p.dirv * p.sp * tt + 330, 340) - 330; face = p.dirv > 0 ? Math.PI : 0; }
    const f = smooth((t - p.fallT) / 0.45), moving = t < 12.4;
    const sw = moving ? Math.sin(tt * 6 + p.ph) * 0.45 : 0;
    p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8;
    if (!moving && f < 1) { p.arms[0].rotation.x = -0.9 * (1 - f) - 1.2 * f; p.arms[1].rotation.x = -0.9 * (1 - f) - 1.2 * f; }
    const jig = E * 0.12 * Math.sin(t * 14 + p.ph);
    p.g.position.set(x + jig + p.fx * f * 0.6, 0.3 + (p.cross ? 0 : 0.22) - 0.22 * f, z);
    p.g.rotation.set(-1.5 * f, face, (p.fx > 0 ? 1 : -1) * 0.3 * f + E * 0.03 * Math.sin(t * 12 + p.ph));
  }

  /* ground cracks */
  for (const c of cracks) {
    const w = c.w * smooth((t - 15.3 - c.k * 0.12) / 1.6) * (1 + 0.4 * smooth((t - 22) / 8));
    c.m.visible = w > 0.02; c.m.scale.set(c.len * 1.04, 1, w);
  }

  /* collapse debris + glass */
  for (let i = 0; i < debris.length; i++) {
    const d = debris[i], s = t - d.b.t0 - d.dly;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const y = d.b.y + d.oy + d.vy * s - 0.5 * 22 * s * s;
      dummy.position.set(d.b.x + d.ox + d.vx * s, Math.max(0.45 * d.sy, y), d.b.z + d.oz + d.vz * s * (1 - Math.exp(-s)));
      dummy.scale.set(d.sx, d.sy, d.sz); dummy.rotation.set(Math.min(s, 2.5) * d.spin, Math.min(s, 2.5) * d.spin * 0.6, 0);
    }
    dummy.updateMatrix(); debMesh.setMatrixAt(i, dummy.matrix);
  }
  debMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < SHARDS; i++) {
    const h = shards[i], s = t - h.t0;
    if (s < 0 || s > 7) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const y = h.y0 - 0.5 * 9.8 * s * s;
      dummy.position.set(h.b.x - h.b.side * (h.b.w / 2 + h.drift * s), Math.max(0.2, y), h.b.z + h.oz); dummy.scale.set(h.s, h.s, 1);
      dummy.rotation.set(s * h.spin, s * h.spin * 0.7, s * h.spin * 0.4);
    }
    dummy.updateMatrix(); shardMesh.setMatrixAt(i, dummy.matrix);
  }
  shardMesh.instanceMatrix.needsUpdate = true;

  /* sparks */
  SPARKS.forEach(([x, y, z, tf]) => { const s = t - tf; if (s > 0 && s < 0.5) addPuff(x, y, z, 9 + s * 30, s * 40, 2.2, 2.6, 3.2, 0.9 * Math.exp(-s * 6) * (0.6 + 0.4 * Math.sin(s * 90))); });

  /* smoke: dust bursts when buildings fail */
  const dustL = kf(t, [[0, 1], [26, 0.85], [40, 0.5], [46, 0.45]]);
  failB.forEach((b, bi) => {
    const sT = t - b.t0;
    if (sT < -0.1 || sT > 9) return;
    const n = b.kind === 'pancake' ? 24 : 14, a = 0.62 * Math.exp(-sT * 0.5) * clamp(sT * 2.4);
    for (let k = 0; k < n; k++) {
      const hx = hash2(bi * 9 + k, 1) - 0.5, hz = hash2(bi * 9 + k, 2) - 0.5, hh = hash2(bi * 9 + k, 3);
      addPuff(b.x + hx * b.w * (1 + sT * 0.18), b.y + 3 + hh * b.h * 0.6 + sT * 2.6, b.z + hz * b.d * (1 + sT * 0.15) + sT * 1.5, (8 + hh * 8 + sT * 4.5), hx * 2, 0.7 * dustL, 0.6 * dustL, 0.5 * dustL, a);
    }
  });
  /* smoke: freeway collapse dust */
  for (const s of fwySegs) {
    const sT = t - s.t;
    if (sT < 0 || sT > 8) continue;
    const a = 0.55 * Math.exp(-sT * 0.5) * clamp(sT * 2.5);
    for (let k = 0; k < 5; k++) { const hx = hash2(s.i * 5 + k, 7) - 0.5; addPuff(s.xc + hx * SEG, 2 + k * 2 + sT * 2.4, FWY_Z + (hash2(s.i * 5 + k, 8) - 0.5) * 20, 9 + sT * 4.5, hx * 3, 0.72 * dustL, 0.64 * dustL, 0.55 * dustL, a); }
  }
  /* smoke: burst water mains */
  [[-6, -30, 19.5], [8, -76, 21.5], [-9, -140, 24.0]].forEach(([x, z, t0]) => {
    if (t < t0) return;
    for (let k = 0; k < 14; k++) {
      const ph = fmod((t - t0) * 1.9 + k / 14, 1), vx = (hash2(k, 3) - 0.5) * 3.2, vz = (hash2(k, 4) - 0.5) * 3.2;
      addPuff(x + vx * ph * 1.6, 0.6 + 30 * ph * (1 - ph) * 4 * (0.8 + 0.2 * hash2(k, 5)), z + vz * ph * 1.6, 0.9 + ph * 1.6, k, 0.98, 0.99, 1.0, 0.5 * (1 - ph * 0.5) * smooth((t - t0) / 0.4));
    }
  });
  /* smoke: fires + black columns (sunset glow lights the smoke from below) */
  const smokeBase = kf(t, [[30, 0.16], [40, 0.1], [46, 0.085]]);
  FIRES.forEach(([x, y, z, t0], fi) => {
    if (t < t0) return;
    const age = t - t0, rampUp = smooth(age / 2.5);
    for (let k = 0; k < 7; k++) {
      const fl = 0.7 + 0.3 * Math.sin(t * (9 + k) + fi + k);
      addPuff(x + (hash2(fi, k) - 0.5) * 7, y + hash2(k, fi) * 5, z + (hash2(fi + 3, k) - 0.5) * 6, (4 + k * 0.7) * (0.6 + 0.4 * rampUp) * fl, k, 1.6, 0.62, 0.2, 0.8 * rampUp);
    }
    for (let k = 0; k < 30; k++) {
      const ph = fmod(age * 0.16 + k / 30, 1), w = 12 + ph * 60;
      addPuff(x + (hash2(fi, k + 9) - 0.5) * 8 + ph * 38, y + 3 + ph * 150, z + (hash2(fi + 5, k) - 0.5) * 8 - ph * 10, w, k * 1.3,
        smokeBase * (1 + (1 - ph) * 0.9), smokeBase * (0.95 + (1 - ph) * 0.35), smokeBase * 0.9, 0.88 * rampUp * (1 - ph * 0.55) * clamp(ph * 6));
    }
  });
  /* smoke: the dust that fills the boulevard */
  const ambA = kf(t, [[14.8, 0], [18, 0.06], [26, 0.07], [40, 0.1], [46, 0.09]]);
  if (ambA > 0.01) for (let i = 0; i < 34; i++) {
    const zz = -40 - fmod(hash2(i, 3) * 300 + (t - 14) * 3, 300);
    addPuff((hash2(i, 1) - 0.5) * 90 + Math.sin(t * 0.3 + i) * 4 + (t - 14) * 0.6, 4 + hash2(i, 2) * 50, zz, 30 + hash2(i, 4) * 40, i, 0.62 * dustL, 0.53 * dustL, 0.45 * dustL, ambA);
  }
  /* cumulus (burn off as the sky fills with smoke) */
  {
    const ca = 1 - smooth((t - 16) / 6);
    if (ca > 0.01) for (let c = 0; c < 10; c++) {
      const cx = (hash2(c, 21) - 0.5) * 2600, cy = 420 + hash2(c, 22) * 300, cz = -1700 - hash2(c, 23) * 1200, cw = 140 + hash2(c, 24) * 200;
      for (let k = 0; k < 8; k++) {
        const ox = (hash2(c * 9 + k, 31) - 0.5) * cw * 2.2, oy = (hash2(c * 9 + k, 32) - 0.35) * cw * 0.5, sz = cw * (0.55 + hash2(c * 9 + k, 33) * 0.7);
        const L = 0.97 - Math.max(0, -oy / cw) * 0.14;
        addPuff(cx + ox + t * 3, cy + oy, cz + (hash2(c * 9 + k, 34) - 0.5) * 100, sz, hash2(c * 9 + k, 35) * 0.5 - 0.25, L, L * 0.98, L * 0.94, 0.72 * ca);
      }
    }
  }
  flushSmoke();

  hazeLayers.forEach((L, li) => {
    L.pts.material.opacity = kf(t, [[0, 0.03], [14.8, 0.04], [18, 0.06], [30, 0.08], [46, 0.08]]) * (li === 2 ? 0.7 : 1);
    L.pts.material.color.set(0xd9b890).lerp(tmpC.set(0x8a6a58), smooth((t - 26) / 12));
    for (let i = 0; i < L.seed.length; i++) { const s = L.seed[i]; L.pos[i * 3] = s[0] + Math.sin(t * 0.4 + s[3]) * 3 + t * 0.5; L.pos[i * 3 + 1] = s[1] + Math.sin(t * 0.3 + s[3] * 2) * 2; L.pos[i * 3 + 2] = fmod(s[2] + t * 1.2 + 230, 250) - 230 + 28; }
    L.geo.attributes.position.needsUpdate = true;
  });
  cloudsLA.pts.material.opacity = 0;
  dimSun.material.opacity = 0.85 * smooth((t - 38) / 5);
}


/* ------------------------------------------------------------------ *
 *  California map (rupture beat)
 * ------------------------------------------------------------------ */
const mapCanvas = document.getElementById('map');
const mctx = mapCanvas.getContext('2d');
mapCanvas.width = innerWidth * DPR; mapCanvas.height = innerHeight * DPR;
const CA = [[-124.2, 42.0], [-124.4, 40.4], [-123.8, 39.5], [-123.0, 38.3], [-122.5, 37.8], [-122.4, 37.2], [-121.9, 36.6], [-121.3, 35.7], [-120.6, 34.6], [-119.2, 34.1], [-118.5, 34.0], [-118.4, 33.75], [-117.9, 33.6], [-117.3, 33.0], [-117.12, 32.55], [-114.72, 32.72], [-114.5, 33.0], [-114.63, 33.8], [-114.4, 34.2], [-114.63, 35.0], [-120.0, 39.0], [-120.0, 42.0]];
const FAULT = [[-115.73, 33.35], [-116.1, 33.65], [-116.5, 33.95], [-117.0, 34.15], [-117.5, 34.28], [-118.0, 34.5], [-118.45, 34.68], [-118.8, 34.85], [-119.5, 35.1], [-120.0, 35.45], [-120.43, 35.9], [-121.0, 36.4], [-121.4, 36.8], [-121.9, 37.2], [-122.3, 37.55]];
const RUPT = FAULT.slice(0, 7); // Bombay Beach -> Lake Hughes (ShakeOut scenario)
const CITIES = [['Los Angeles', -118.24, 34.05], ['San Diego', -117.16, 32.72], ['Palm Springs', -116.55, 33.83], ['Bakersfield', -119.02, 35.37], ['Santa Barbara', -119.7, 34.42], ['Fresno', -119.8, 36.74]];
function ruptureAt(p) { // point along RUPT at fraction p
  const segs = [];
  let tot = 0;
  for (let i = 0; i < RUPT.length - 1; i++) { const l = Math.hypot(RUPT[i + 1][0] - RUPT[i][0], RUPT[i + 1][1] - RUPT[i][1]); segs.push(l); tot += l; }
  let d = p * tot; const pts = [RUPT[0]];
  for (let i = 0; i < segs.length; i++) {
    if (d >= segs[i]) { pts.push(RUPT[i + 1]); d -= segs[i]; } else { const f = d / segs[i]; pts.push([lerp(RUPT[i][0], RUPT[i + 1][0], f), lerp(RUPT[i][1], RUPT[i + 1][1], f)]); break; }
  }
  return pts;
}
function drawMap(T) {
  const W = mapCanvas.width, H = mapCanvas.height;
  const op = smooth((T - 8.6) / 0.7) * (1 - smooth((T - 18.8) / 0.6));
  mapCanvas.style.opacity = op;
  if (op <= 0.001) return;
  const pr = clamp((T - 9.9) / 8.2);
  const LON0 = -122.8, LON1 = -114.2, LAT0 = 32.4, LAT1 = 37.4, cosL = Math.cos((35 * Math.PI) / 180);
  const spanX = (LON1 - LON0) * cosL, spanY = LAT1 - LAT0;
  const mw = W * 0.9, scale = mw / spanX, mh = spanY * scale, ox = (W - mw) / 2, oy = H * 0.1;
  const px = (lon) => ox + (lon - LON0) * cosL * scale, py = (lat) => oy + (LAT1 - lat) * scale;
  mctx.clearRect(0, 0, W, H);
  const bg = mctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(9,12,18,1)'); bg.addColorStop(0.5, 'rgba(9,12,18,.97)'); bg.addColorStop(0.72, 'rgba(9,12,18,.6)'); bg.addColorStop(1, 'rgba(9,12,18,.38)');
  mctx.fillStyle = bg; mctx.fillRect(0, 0, W, H);
  mctx.save();
  mctx.beginPath(); mctx.rect(ox, oy, mw, mh); mctx.clip();
  mctx.fillStyle = '#0d1a2a'; mctx.fillRect(ox, oy, mw, mh);
  mctx.strokeStyle = 'rgba(120,150,190,.08)'; mctx.lineWidth = 1 * DPR;
  for (let lon = -122; lon <= -115; lon += 1) { mctx.beginPath(); mctx.moveTo(px(lon), oy); mctx.lineTo(px(lon), oy + mh); mctx.stroke(); }
  for (let lat = 33; lat <= 37; lat += 1) { mctx.beginPath(); mctx.moveTo(ox, py(lat)); mctx.lineTo(ox + mw, py(lat)); mctx.stroke(); }
  mctx.beginPath(); CA.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la)))); mctx.closePath();
  mctx.fillStyle = '#1a2230'; mctx.fill(); mctx.strokeStyle = 'rgba(170,190,215,.5)'; mctx.lineWidth = 1.2 * DPR; mctx.stroke();
  // the fault, dormant
  mctx.beginPath(); FAULT.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la))));
  mctx.strokeStyle = 'rgba(255,120,80,.5)'; mctx.lineWidth = 1.6 * DPR; mctx.stroke();
  // rupture: glow + core
  if (pr > 0) {
    const pts = ruptureAt(pr);
    const path = () => { mctx.beginPath(); pts.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la)))); };
    mctx.lineCap = 'round'; mctx.lineJoin = 'round';
    path(); mctx.strokeStyle = 'rgba(255,90,40,.14)'; mctx.lineWidth = 62 * DPR * (0.5 + 0.5 * pr); mctx.stroke();
    path(); mctx.strokeStyle = 'rgba(255,110,50,.22)'; mctx.lineWidth = 30 * DPR; mctx.stroke();
    path(); mctx.strokeStyle = '#ffd7a8'; mctx.lineWidth = 3.4 * DPR; mctx.stroke();
    const tip = pts[pts.length - 1], tx = px(tip[0]), ty = py(tip[1]);
    for (let k = 0; k < 3; k++) { const ph = fmod(T * 1.4 + k / 3, 1); mctx.strokeStyle = `rgba(255,150,80,${0.5 * (1 - ph)})`; mctx.lineWidth = 1.5 * DPR; mctx.beginPath(); mctx.arc(tx, ty, (6 + ph * 70) * DPR, 0, Math.PI * 2); mctx.stroke(); }
    mctx.fillStyle = '#fff3e0'; mctx.beginPath(); mctx.arc(tx, ty, 4.5 * DPR, 0, Math.PI * 2); mctx.fill();
  }
  // epicentre marker (Bombay Beach)
  const bx = px(RUPT[0][0]), by = py(RUPT[0][1]);
  mctx.fillStyle = '#ff6a2a'; mctx.beginPath(); mctx.arc(bx, by, 5 * DPR * (1 + 0.2 * Math.sin(T * 7)), 0, Math.PI * 2); mctx.fill();
  mctx.restore();
  mctx.font = `600 ${9.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  for (const [name, lo, la] of CITIES) {
    const x = px(lo), y = py(la), la_ = name === 'Los Angeles', hit = la_ && pr > 0.78;
    mctx.fillStyle = hit ? '#ff4a2a' : 'rgba(205,218,235,.75)';
    mctx.beginPath(); mctx.arc(x, y, (la_ ? 4.2 : 2.8) * DPR * (hit ? 1 + 0.25 * Math.sin(T * 12) : 1), 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = hit ? 'rgba(255,220,200,.98)' : 'rgba(205,218,235,.6)'; mctx.textAlign = 'left';
    mctx.fillText(name.toUpperCase(), x + 7 * DPR, y + 3 * DPR);
  }
  mctx.fillStyle = 'rgba(244,239,230,.85)'; mctx.font = `700 ${10 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  mctx.fillText('BOMBAY BEACH', bx + 9 * DPR, by + 15 * DPR);
  mctx.fillStyle = 'rgba(255,150,100,.8)'; mctx.fillText('SAN ANDREAS FAULT', px(-121.7), py(36.55));
  if (pr > 0.78) { mctx.fillStyle = 'rgba(255,225,205,.95)'; mctx.fillText('SHAKING ARRIVES', px(-118.24) + 7 * DPR, py(34.05) + 16 * DPR); }
  mctx.fillStyle = 'rgba(244,239,230,.5)'; mctx.font = `600 ${9.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  mctx.fillText('RUPTURE SCENARIO: MAGNITUDE 7.8', ox, oy - 12 * DPR);
}

/* ------------------------------------------------------------------ *
 *  HUD / captions / alert / end card
 * ------------------------------------------------------------------ */
const elTitle = document.getElementById('title');
const hud = document.getElementById('hud');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const cap = document.getElementById('caption');
const end = document.getElementById('end');
const alertEl = document.getElementById('alert');
const aTitle = alertEl.querySelector('.t'), aBody = alertEl.querySelector('.b');
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const BEATS = [
  { a: 0.6, b: 4.8, label: 'Local time', value: (k, T) => `4:11:${String(38 + Math.floor(T)).padStart(2, '0')} PM`, sub: () => 'Los Angeles, California' },
  { a: 4.8, b: 9.0, label: 'Last major rupture', value: () => '1857', sub: () => '169 years of stored strain' },
  { a: 9.0, b: 19.0, label: 'Rupture length', value: (k, T) => `${Math.round(200 * clamp((T - 9.9) / 8.2))} mi`, sub: () => 'Speed: 2 miles per second' },
  { a: 19.2, b: 22.0, label: 'Seconds until shaking', value: (k) => `${Math.max(0, Math.ceil(3 - 3 * k))}`, sub: () => 'Earthquake early warning' },
  { a: 22.0, b: 34.0, label: 'Peak ground shaking', value: (k) => `${(0.1 + 0.5 * smooth(k)).toFixed(2)} g`, sub: (k) => `Shaking ${mmss(35 * smooth(k))}` },
  { a: 34.0, b: 46.0, label: 'Shaking duration', value: (k) => mmss(35 + 23 * smooth(k)), sub: () => 'Magnitude 7.8' },
  { a: 46.0, b: 52.0, label: 'Fires burning', value: (k) => fmt(1600 * smooth(k)), sub: () => 'USGS ShakeOut scenario' },
  { a: 52.0, b: 58.0, label: 'Estimated damage', value: (k) => `$${Math.round(213 * smooth(k))}B`, sub: (k) => `Injured ${fmt(50000 * smooth(k))}` },
];
const CAPS = [
  [1.0, 4.6, 'Tens of millions of people live within reach of the San Andreas Fault.'],
  [5.0, 8.8, 'It runs 750 miles, and parts of it have been locked for over 150 years.'],
  [9.3, 13.2, 'The break begins far out in the desert.'],
  [13.5, 18.8, 'Then it unzips northwest at two miles per second.'],
  [19.3, 21.9, 'Your phone gives you a few seconds of warning.'],
  [22.3, 27.0, 'Then the S-waves hit.'],
  [27.4, 31.8, 'Old brick buildings fail first.'],
  [32.3, 37.0, 'Freeway overpasses fall onto the lanes below.'],
  [37.5, 42.0, 'Older concrete buildings pancake.'],
  [42.4, 45.6, 'Towers sway for nearly a minute.'],
  [46.4, 51.4, 'Then come the fires. Over a thousand of them.'],
  [51.8, 57.6, 'Water mains break. Power fails. Roads stay cut for weeks.'],
];
function updateOverlay(T) {
  elTitle.style.opacity = smooth(T / 0.8) * (1 - smooth((T - 4.4) / 0.7));
  const beat = BEATS.find((b) => T >= b.a && T < b.b);
  if (beat) {
    const k = clamp((T - beat.a) / (beat.b - beat.a));
    hLabel.textContent = beat.label; hValue.textContent = beat.value(k, T); hSub.textContent = beat.sub(k, T);
    hud.style.opacity = Math.min(smooth((T - beat.a) / 0.3), 1 - smooth((T - (beat.b - 0.15)) / 0.15));
  } else hud.style.opacity = 0;
  const cp = CAPS.find((c) => T >= c[0] - 0.05 && T < c[1] + 0.05);
  if (cp) {
    cap.textContent = cp[2];
    const fin = smooth((T - cp[0]) / 0.4);
    cap.style.opacity = fin * (1 - smooth((T - (cp[1] - 0.4)) / 0.4));
    cap.style.transform = `translateY(${(1 - fin) * 6}px)`;
  } else cap.style.opacity = 0;
  // phone alerts
  let ao = 0;
  if (T >= 5.4 && T < 8.9) { ao = smooth((T - 5.4) / 0.35) * (1 - smooth((T - 8.5) / 0.4)); aTitle.textContent = 'EARTHQUAKE ALERT'; aBody.textContent = 'Magnitude 7.8 detected 150 miles away. Expect strong shaking.'; }
  else if (T >= 19.0 && T < 22.4) { ao = smooth((T - 19.0) / 0.3) * (1 - smooth((T - 22.0) / 0.35)); aTitle.textContent = `SHAKING IN ${Math.max(0, Math.ceil(3 - (T - 19.2)))} s`; aBody.textContent = 'Drop. Cover. Hold on.'; }
  alertEl.style.opacity = ao; alertEl.style.transform = `translateY(${(1 - ao) * -14}px) rotate(${ao > 0.01 ? Math.sin(T * 55) * 0.25 * (T > 19 ? 1 : 0.6) : 0}deg)`;
  end.style.opacity = smooth((T - 57.8) / 0.7);
  end.querySelector('.a').style.opacity = smooth((T - 58.6) / 0.6);
  end.querySelector('.b').style.opacity = smooth((T - 59.8) / 0.6);
  end.querySelector('.c').style.opacity = smooth((T - 61.0) / 0.7) * 0.9;
}

{
  const g = document.getElementById('grain'), c = g.getContext('2d');
  const id = c.createImageData(256, 256), r = rng(99);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  g.style.width = '100%'; g.style.height = '100%';
}

/* ---------- public API ---------- */
function renderAt(T, sub = 1, dt = 1 / 60) {
  T = clamp(T, 0, T_END);
  const fi = Math.round(T * 30);
  const skip3D = T > 58.9 || (T >= 9.3 && T < 18.6 && fi % 3 !== 0) || (T >= 52.2 && T < 58.9 && fi % 2 !== 0);
  for (let j = 0; j < (skip3D ? 0 : sub); j++) {
    const Tj = clamp(T + (sub > 1 ? (j / (sub - 1) - 0.5) * dt : 0), 0, T_END);
    update(warp(Tj));
    composer.render();
    actx.globalAlpha = 1 / (j + 1);
    actx.drawImage(glCanvas, 0, 0);
  }
  actx.globalAlpha = 1;
  drawMap(T);
  updateOverlay(T);
}
window.renderAt = renderAt;
window.dbg = { scene, camera, renderer, sun, composer, bloom, warp, smoke, hazeLayers, debMesh, shardMesh, palmFronds, palmTrunks, people, cars, buildings, towers, fwySegs };
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
