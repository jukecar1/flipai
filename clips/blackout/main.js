import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* ------------------------------------------------------------------ *
 *  "What if all internet and data went down forever?"  — deterministic 62s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 *
 *  Setting: a high balcony over a downtown skyline; a phone in hand.
 */

const T_END = 62; // master (video) time in seconds

// Master time -> scene time. The calm intro runs in real time (scene time -10..2),
// then the eruption, flow, collapse and aftermath play in slow motion.
const WARP = [[0, 0], [62, 62]];
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
if (P.get('bloom') === '1') composer.addPass(bloom);
composer.addPass(new OutputPass());
{
  const fxaa = new ShaderPass(FXAAShader);
  fxaa.material.uniforms['resolution'].value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR));
  composer.addPass(fxaa);
}

/* ---------- sky ---------- */
const SUN_DIR = new THREE.Vector3(0.35, 0.55, 0.75).normalize(); // golden afternoon sun, behind-right of the camera
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




/* ------------------------------------------------------------------ *
 *  A downtown from a balcony as the networks die and never come back
 *  (time-lapse: day 0 -> ~6 months)
 * ------------------------------------------------------------------ */
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x3a3a44, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.castShadow = false;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 900, cy * 900, cz * 900);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}
renderer.shadowMap.enabled = false;
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color(), ashH = new THREE.Color(0x4d3c32), ashT = new THREE.Color(0x15171f);

// ---- timeline: master time T -> days since the outage
const T_OUT = 8.0;
const DAYK = [[8, 0], [12, 0.4], [17, 1.5], [22, 3], [27, 5], [32, 8], [37, 14], [42, 30], [48, 60], [54, 120], [58, 180], [62, 180]];
function dayOf(T) {
  if (T <= T_OUT) return 0;
  for (let k = 0; k < DAYK.length - 1; k++) if (T <= DAYK[k + 1][0]) { const f = (T - DAYK[k][0]) / (DAYK[k + 1][0] - DAYK[k][0]); return Math.exp(lerp(Math.log(1 + DAYK[k][1]), Math.log(1 + DAYK[k + 1][1]), f)) - 1; }
  return 180;
}
const TofDay = (d) => { for (let k = 0; k < DAYK.length - 1; k++) if (d <= DAYK[k + 1][1]) { const f = (Math.log(1 + d) - Math.log(1 + DAYK[k][1])) / (Math.log(1 + DAYK[k + 1][1]) - Math.log(1 + DAYK[k][1])); return lerp(DAYK[k][0], DAYK[k + 1][0], f); } return 58; };
const hourLight = (T) => (T < T_OUT ? -0.45 + 0.45 * (T / T_OUT) : dayOf(T) * 24);
const localOf = (h) => (((18 + h) % 24) + 24) % 24; // 6:00 PM when it starts
const fmtClock = (L) => { const hh = Math.floor(L), mm = Math.floor((L - hh) * 60); const h12 = ((hh + 11) % 12) + 1; return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`; };
const sunElev = (h) => { const L = localOf(h); return L >= 6 && L <= 18 ? 58 * Math.sin((Math.PI * (L - 6)) / 12) + 1.5 : -12; };
const nightF = (h) => 1 - smooth((sunElev(h) + 3) / 12);
const SKY_H = [[-0.45, 0xf4b078], [0, 0xf0a070], [0.8, 0x8a5662], [1.7, 0x242b44], [3, 0x161c30], [10.5, 0x141a2c], [11.6, 0x3a3f5c], [12.6, 0xf0b080], [14, 0xe8d8c0], [18, 0xcfe0f0], [22, 0xe8d8b8], [24, 0xf0a070]];
const SKY_T = [[-0.45, 0x4a6a9a], [0, 0x3a5a8a], [0.8, 0x1c2a4a], [1.7, 0x0a1020], [3, 0x070b16], [10.5, 0x070b16], [11.6, 0x141c34], [12.6, 0x5f7fb0], [14, 0x5f95d6], [18, 0x3f7fd0], [22, 0x5a8ed0], [24, 0x3a5a8a]];

/* ---------- towers (each one loses power on its own day) ---------- */
function winMaps(variant) {
  const r = rng(900 + variant), cols = 4, rows = 6, cw = 64, rh = 64;
  const W = cols * cw, H = rows * rh, wallHex = [0x3a4458, 0x4b4f58, 0x5a5048, 0x2f3a46, 0x56606c, 0x44403c][variant % 6];
  const c = mkCanvas(W, H), x = c.getContext('2d'), e = mkCanvas(W, H), ex = e.getContext('2d');
  x.fillStyle = shade(wallHex, 1); x.fillRect(0, 0, W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const litP = 0.32 + (variant % 3) * 0.12;
  for (let ro = 0; ro < rows; ro++) for (let co = 0; co < cols; co++) {
    const wx = co * cw + 5, wy = ro * rh + 8, ww = cw - 10, wh = rh - 20;
    const g = x.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, '#6f8aa6'); g.addColorStop(1, '#2d3c50');
    x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(wx, wy, ww, 3);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh);
    if (r() < litP) {
      const warm = r() < 0.7, v = 0.55 + r() * 0.45;
      ex.fillStyle = warm ? `rgb(${255 * v},${200 * v},${120 * v})` : `rgb(${200 * v},${225 * v},${255 * v})`;
      ex.fillRect(wx, wy, ww, wh);
    }
  }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`; x.fillRect(r() * W, r() * H, 2, 2); }
  x.fillStyle = 'rgba(0,0,0,.28)'; for (let ro = 0; ro < rows; ro++) x.fillRect(0, ro * rh, W, 2);
  const map = toTex(c), em = toTex(e); map.anisotropy = 4; em.anisotropy = 4;
  return { map, em };
}
const TOWER_MATS = Array.from({ length: 6 }, (_, v) => { const { map, em } = winMaps(v); return new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.0 }); });
const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4d55 });
const TWM = 16, THM = 24;
function tower(w, h, d, variant) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const uv = g.attributes.uv, fw = [d, d, 0, 0, w, w];
  for (let f = 0; f < 6; f++) { if (f === 2 || f === 3) continue; for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * (fw[f] / TWM), uv.getY(i) * (h / THM)); } }
  const m = TOWER_MATS[variant % 6].clone();
  return { mesh: new THREE.Mesh(g, [m, m, roofMat, roofMat, m, m]), mat: m };
}
const PITCH = 78, TOWERS = [];
{
  const r = rng(404);
  for (let j = 1; j <= 20; j++) for (let i = -7; i <= 7; i++) {
    if (r() < 0.07) continue;
    const core = Math.exp(-((i * i) / 20 + ((j - 10) * (j - 10)) / 34));
    const h = 18 + 175 * core * (0.3 + 0.7 * r()) + r() * 22 + (j > 14 ? 10 : 0) - (j < 5 ? 10 : 0);
    const w = 32 + r() * 16, d = 32 + r() * 16;
    const x = i * PITCH + (r() - 0.5) * 8, z = -j * PITCH + (r() - 0.5) * 8;
    const tw = tower(w, h, d, Math.floor(r() * 6)); tw.mesh.position.set(x, 0, z); scene.add(tw.mesh);
    if (h > 60 && r() < 0.6) { const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 8 + r() * 10, d * 0.55), roofMat); cap.position.set(x, h + 4, z); scene.add(cap); }
    const u = r(), death = u < 0.12 ? 0.9 + r() * 1.2 : u < 0.45 ? 2 + r() * 2.2 : u < 0.8 ? 4 + r() * 6 : 10 + r() * 30; // day this tower goes dark
    TOWERS.push({ x, z, w, d, h, j, i, mat: tw.mat, death });
  }
}
const litFrac = (d) => { let n = 0; for (const t of TOWERS) n += d < t.death ? 1 : 0; return n / TOWERS.length; };
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshLambertMaterial({ color: 0x1c1e24 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  window.STREETM = new THREE.MeshLambertMaterial({ color: 0x3a3c45, emissive: 0xffb878, emissiveIntensity: 0 });
  for (let j = 0; j <= 21; j++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1500, 16), STREETM); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.06, -j * PITCH + PITCH / 2); scene.add(m); }
  for (let i = -8; i <= 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 1700), STREETM); m.rotation.x = -Math.PI / 2; m.position.set(i * PITCH + PITCH / 2, 0.06, -800); scene.add(m); }
}
/* street lamps: four circuits that fail on different days */
const LAMPD = [1.6, 3.2, 7, 18];
const lampL = LAMPD.map(() => pointsLayer(820, 5.5, 0xffc880, () => 0));
{
  const all = [];
  for (let j = 0; j <= 21; j++) for (let x = -560; x <= 560; x += 26) all.push([x, 9, -j * PITCH + PITCH / 2 + 7]);
  for (let i = -8; i <= 8; i++) for (let z = -40; z >= -1620; z -= 26) all.push([i * PITCH + PITCH / 2 + 7, 9, z]);
  const cnt = [0, 0, 0, 0];
  all.forEach((p, k) => { const c = k % 4; if (cnt[c] < 820) { lampL[c].pos.set(p, cnt[c] * 3); cnt[c]++; } });
  lampL.forEach((L, c) => { L.geo.setDrawRange(0, cnt[c]); L.geo.attributes.position.needsUpdate = true; L.pts.material.fog = false; });
}
const NCARS = 900;
const heads = pointsLayer(NCARS, 4.2, 0xfff0d6, (i) => i), tails = pointsLayer(NCARS, 3.6, 0xff3a28, (i) => i);
const CARS = Array.from({ length: NCARS }, (_, i) => { const r = rng(2000 + i); return { row: r() < 0.5, line: Math.floor(r() * 20), lane: (r() < 0.5 ? -1 : 1) * (2 + r() * 3), v: 14 + r() * 20, ph: r() * 3000, dir: r() < 0.5 ? 1 : -1, rank: i / NCARS }; });
heads.pts.material.fog = tails.pts.material.fog = false;
const traffic = (d) => (d < 0.25 ? 1 : d < 1 ? lerp(1, 0.5, (d - 0.25) / 0.75) : d < 3 ? lerp(0.5, 0.14, (d - 1) / 2) : d < 10 ? lerp(0.14, 0.02, (d - 3) / 7) : 0);
/* stars, beacons, aircraft */
const stars = pointsLayer(1400, 6, 0xffffff, () => 0);
{ const r = rng(7); for (let i = 0; i < 1400; i++) { const u = r() * 6.283, v = 0.08 + r() * 0.92, rr = 5200; stars.pos.set([Math.cos(u) * Math.sqrt(1 - v * v) * rr, v * rr, Math.sin(u) * Math.sqrt(1 - v * v) * rr - 800], i * 3); } stars.geo.attributes.position.needsUpdate = true; stars.pts.material.fog = false; }
const beacons = pointsLayer(80, 7, 0xff3030, () => 0);
let beaconN = 0;
{ for (const t of TOWERS) if (t.h > 110 && beaconN < 80) { beacons.pos.set([t.x, t.h + 14, t.z], beaconN * 3); t.beacon = beaconN; beaconN++; } beacons.geo.setDrawRange(0, beaconN); beacons.geo.attributes.position.needsUpdate = true; beacons.pts.material.fog = false; }
const planes = pointsLayer(9, 3.2, 0xffffff, () => 0); planes.pts.material.sizeAttenuation = false; planes.pts.material.size = 3.4; planes.pts.material.fog = false;
const PLANES = Array.from({ length: 9 }, (_, i) => { const r = rng(5000 + i); return { y: 700 + r() * 500, z: -2600 - r() * 1400, x0: (r() - 0.5) * 3500, v: (r() < 0.5 ? -1 : 1) * (60 + r() * 50), ph: r() * 5 }; });

/* fires: start on their own days and are never put out */
const NF = 36;
const FIRES = [];
{
  const r = rng(808);
  for (let k = 0; k < NF; k++) {
    const near = TOWERS.filter((q) => q.j >= 2 && q.j <= 9 && Math.abs(q.i) <= 3), t = near[Math.floor(r() * near.length)];
    const day = k < 3 ? 1.8 + r() * 1.0 : 2.5 + Math.pow(r(), 1.8) * 120;
    FIRES.push({ x: t.x + (r() - 0.5) * 50, z: t.z + (r() - 0.5) * 50, day, s: 0.8 + r() * 0.8, ph: r() * 6 });
  }
  FIRES.sort((a, b) => a.day - b.day);
}
const fireGlow = pointsLayer(NF, 38, 0xff6a20, () => 0); fireGlow.pts.material.fog = false; fireGlow.pts.material.blending = THREE.AdditiveBlending;

/* billboards */
const billCanvas = mkCanvas(512, 256), bctx = billCanvas.getContext('2d');
const billTex = new THREE.CanvasTexture(billCanvas); billTex.colorSpace = THREE.SRGBColorSpace;
const billMat = new THREE.MeshBasicMaterial({ map: billTex, fog: false });
const billTargets = TOWERS.filter((t) => t.h > 85 && t.j >= 6 && t.j <= 14 && Math.abs(t.i) <= 5).sort((a, b) => b.h - a.h).slice(0, 10);
const billMeshes = billTargets.map((t) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(34, 17), billMat); m.position.set(t.x, t.h * 0.62, t.z + t.d / 2 + 0.3); scene.add(m); m.userData.t = t; return m; });
const ADS = ['STREAM NOW', 'WATCH LIVE', 'FLASH SALE', 'RIDE HOME', 'ORDER IN', 'PLAY'];
function drawBill(T) {
  const W = 512, H = 256;
  if (T < T_OUT) {
    const k = Math.floor(T * 0.9), ph = (T * 0.9) % 1, hue = (k * 67) % 360;
    const g = bctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, `hsl(${hue},80%,52%)`); g.addColorStop(1, `hsl(${(hue + 60) % 360},85%,40%)`);
    bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
    bctx.fillStyle = 'rgba(255,255,255,.9)'; bctx.font = '700 64px "Helvetica Neue", Arial, "Liberation Sans", sans-serif'; bctx.textAlign = 'center'; bctx.fillText(ADS[k % ADS.length], W / 2 + (1 - smooth(ph * 3)) * 30, H / 2 + 22);
  } else if (T < T_OUT + 0.5) {
    const id = bctx.createImageData(W, H), r = rng(Math.floor(T * 60));
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    bctx.putImageData(id, 0, 0);
  } else {
    const bars = ['#c8c8c8', '#c8c800', '#00c8c8', '#00c800', '#c800c8', '#c80000', '#0000c8'];
    bars.forEach((c, i) => { bctx.fillStyle = c; bctx.fillRect((i * W) / 7, 0, W / 7 + 1, H * 0.7); });
    bctx.fillStyle = '#10131a'; bctx.fillRect(0, H * 0.7, W, H * 0.3);
    bctx.fillStyle = '#f4f1ea'; bctx.font = '700 46px "Helvetica Neue", Arial, "Liberation Sans", sans-serif'; bctx.textAlign = 'center';
    if (Math.sin(T * 3) > -0.6) bctx.fillText('NO SIGNAL', W / 2, H * 0.7 + 66);
  }
  billTex.needsUpdate = true;
}

/* ------------------------------------------------------------------ *
 *  Update
 * ------------------------------------------------------------------ */
const CAM = new THREE.Vector3(0, 128, 30);
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
const fmod = (a, n) => ((a % n) + n) % n;
const smokeAt = (d) => smooth((d - 2.2) / 40);
function update(T) {
  pc = 0;
  const d = dayOf(T), h = hourLight(T);
  const nf = lerp(nightF(h), 0.8, smooth((d - 2) / 1.6));
  const hh = h < 0 ? h : fmod(h, 24), blend = smooth((d - 2) / 2.2), sm = smokeAt(d);
  kfc(hh, SKY_H, horC); kfc(hh, SKY_T, topC);
  horC.lerp(ashH, blend * 0.9); topC.lerp(ashT, blend * 0.95);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  const elev = sunElev(h) * (1 - blend) - 12 * blend;
  skyMat.uniforms.sunAmt.value = elev > -3 ? 1 : 0;
  scene.fog.color.copy(horC).lerp(tmpC.set(0x0a0d18), nf * 0.4);
  scene.fog.density = 0.00042 + 0.0001 * nf + 0.0006 * sm;
  setSun(Math.max(elev, -8));
  sun.intensity = Math.PI * 2.8 * smooth((elev + 2) / 10);
  kfc(hh, [[-0.45, 0xffb880], [0.5, 0xff9a60], [1.5, 0xff8050], [11.5, 0xff9060], [13, 0xffd0a0], [16, 0xfff0d8], [22, 0xffe0b8], [24, 0xffa070]], sun.color);
  hemi.intensity = Math.PI * (0.16 + 0.85 * (1 - nf));
  hemi.color.copy(horC).lerp(topC, 0.5); hemi.groundColor.set(0x30303a);
  renderer.toneMappingExposure = 1.0 + 0.12 * nf;

  /* the city goes dark, tower by tower */
  const lit = litFrac(d);
  const base = 1.6 * smooth(nf * 1.15);
  for (const t of TOWERS) t.mat.emissiveIntensity = base * (1 - smooth((d - t.death) / (0.25 + 0.2 * t.death)));
  STREETM.emissiveIntensity = 0.17 * smooth(nf * 1.2) * (0.02 + 0.98 * lit);
  roofMat.emissive.set(0x6a5a50); roofMat.emissiveIntensity = 0.25 * nf * lit;
  lampL.forEach((L, c) => { L.pts.material.opacity = 0.95 * nf * (1 - smooth((d - LAMPD[c]) / (0.25 * LAMPD[c]))); });
  const tr = traffic(d);
  heads.pts.material.opacity = 0.35 + 0.65 * nf; tails.pts.material.opacity = 0.3 + 0.6 * nf;
  stars.pts.material.sizeAttenuation = false; stars.pts.material.size = 2.6; stars.pts.material.opacity = 0.9 * smooth((nf - 0.7) / 0.3) * (1 - smooth(blend * 1.2));
  for (let i = 0; i < NCARS; i++) {
    const c = CARS[i];
    if (c.rank > tr) { heads.pos[i * 3 + 1] = tails.pos[i * 3 + 1] = -60; continue; }
    const s = ((c.ph + c.dir * c.v * T * (1 - 0.6 * smooth((d - 0.5) / 3))) % 1700 + 1700) % 1700;
    let x, z;
    if (c.row) { x = -750 + s * 0.88; z = -c.line * PITCH + PITCH / 2 + c.lane; }
    else { x = (c.line - 10) * PITCH * 0.8 + PITCH / 2 + c.lane; z = -s + 40; }
    heads.pos[i * 3] = x; heads.pos[i * 3 + 1] = 0.9; heads.pos[i * 3 + 2] = z;
    tails.pos[i * 3] = x - (c.row ? c.dir * 1.6 : 0); tails.pos[i * 3 + 1] = 0.9; tails.pos[i * 3 + 2] = z + (c.row ? 0 : c.dir * 1.6);
  }
  heads.geo.attributes.position.needsUpdate = true; tails.geo.attributes.position.needsUpdate = true;
  beacons.pts.material.opacity = (0.35 + 0.65 * (Math.sin(T * 5) > 0 ? 1 : 0)) * (0.4 + 0.6 * nf) * (0.2 + 0.8 * lit);
  for (const bm of billMeshes) bm.visible = d < bm.userData.t.death;
  drawBill(T);
  /* aircraft: in the air at the start, never seen again */
  for (let i = 0; i < 9; i++) { const p = PLANES[i]; planes.pos[i * 3] = p.x0 + p.v * T; planes.pos[i * 3 + 1] = d < 0.9 ? p.y : -500; planes.pos[i * 3 + 2] = p.z; }
  planes.geo.attributes.position.needsUpdate = true; planes.pts.material.opacity = (Math.sin(T * 6 + 1) > -0.2 ? 1 : 0.15) * (1 - smooth((d - 0.4) / 0.5));
  /* fires + smoke */
  for (let k = 0; k < NF; k++) {
    const f = FIRES[k], burn = smooth((d - f.day) / 1.2);
    fireGlow.pos[k * 3] = f.x; fireGlow.pos[k * 3 + 1] = burn > 0.01 ? 8 : -80; fireGlow.pos[k * 3 + 2] = f.z;
    if (burn <= 0.01) continue;
    const fl = 0.8 + 0.2 * Math.sin(T * 17 + f.ph * 7) * Math.sin(T * 11 + f.ph);
    for (let q = 0; q < 14; q++) {
      const u = q / 14, wob = Math.sin(T * 0.9 + f.ph + q * 0.6) * 5;
      const py = 6 + q * 14 * f.s, sz = (16 + q * 6.5) * f.s;
      const hot = q < 3;
      addPuff(f.x + wob + q * 4 * (0.5 + f.ph * 0.05), py, f.z + wob * 0.6, sz, f.ph + q, hot ? 1.0 : 0.17 + 0.05 * (1 - u), hot ? 0.55 : 0.15 + 0.04 * (1 - u), hot ? 0.2 : 0.14 + 0.03 * (1 - u), (hot ? 0.4 * fl : 0.42 * (1 - u * 0.7)) * burn);
    }
  }
  fireGlow.geo.attributes.position.needsUpdate = true; fireGlow.pts.material.opacity = 0.75;
  /* haze of smoke over the whole city grows with the months */
  rig.position.set(CAM.x + Math.sin(T * 0.11) * 5, CAM.y + Math.sin(T * 0.07) * 1.2, CAM.z);
  camera.position.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  const shake = T > T_OUT && T < T_OUT + 0.45 ? (1 - (T - T_OUT) / 0.45) * 0.004 : 0;
  camera.rotation.set(THREE.MathUtils.degToRad(-8) + 0.0012 * Math.sin(T * 0.9) + shake * Math.sin(T * 90), THREE.MathUtils.degToRad(-8 + 7 * Math.sin(T * 0.08)) + shake * Math.cos(T * 77), 0);
  const fov = 56; if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);
  flushSmoke();
}

/* ------------------------------------------------------------------ *
 *  HUD / captions / systems panel / end card
 * ------------------------------------------------------------------ */
const elTitle = document.getElementById('title');
const hud = document.getElementById('hud');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const cap = document.getElementById('caption');
const end = document.getElementById('end');
const flash = document.getElementById('flash');
const phone = document.getElementById('phone'), screenEl = document.getElementById('screen');
const dayText = (d) => (d < 1 ? `${Math.max(0, Math.floor(d * 24))} hours` : d < 14 ? `Day ${Math.floor(d) + 1}` : d < 60 ? `Week ${Math.floor(d / 7) + 1}` : `Month ${Math.floor(d / 30) + 1}`);
const BEATS = [
  { a: 0.6, b: 4.8, label: 'Local time', value: (T) => fmtClock(localOf(hourLight(T))), sub: () => 'Everything is working' },
  { a: 4.8, b: 7.9, label: 'People using the internet', value: (T) => `${(5.5 * smooth((T - 4.8) / 1.2)).toFixed(1)} billion`, sub: () => 'About 68% of humanity (ITU, 2024)' },
];
const CAPS = [
  [5.0, 7.8, 'Almost everything runs on it.'],
  [8.3, 12.2, 'First to fail: money. Most of it only exists as data.'],
  [12.6, 16.8, 'Flights are grounded. Hospitals switch to paper.'],
  [17.2, 21.6, 'Stores run low. Most hold only about three days of food.'],
  [22.0, 26.5, 'Fuel stops flowing. Pumps can’t take payment.'],
  [27.0, 31.5, 'Power grids and water plants are run over networks. Blackouts spread.'],
  [32.0, 36.6, 'Hospital generators typically hold about four days of fuel.'],
  [37.2, 41.8, 'With dispatch down, fires burn unchecked.'],
  [42.3, 47.5, 'Over 80% of world trade moves by sea, routed over networks. Ships sit idle.'],
  [48.0, 53.0, 'Months in: no records, no payments, no coordination.'],
  [53.6, 57.4, 'Civilization doesn’t end overnight. It loses its systems one by one.'],
];
/* live status card: every value is read from the same state that drives the city, so it always matches what is on screen */
const burning = (d) => { let n = 0; for (const f of FIRES) if (d - f.day > 0.15) n++; return n; };
function pct(v, hi, lo) { return v >= hi ? 'ok' : v >= lo ? 'warn' : 'bad'; }
function rowsAt(T) {
  const d = dayOf(T), out = T >= T_OUT;
  const lit = litFrac(d) * 100, tr = traffic(d) * 100, fires = burning(d);
  const R = (name, cls, txt, just) => `<div class="sy ${cls}${just ? ' just' : ''}"><span class="dot"></span><span class="sn">${name}</span><span class="ss">${txt}</span></div>`;
  const j = (day) => out && d >= day && d < day + 0.2 + day * 0.1;
  return [
    R('Payments', out ? 'bad' : 'ok', out ? 'OFFLINE' : 'ONLINE', j(0)),
    R('Air travel', !out ? 'ok' : d < 0.9 ? 'warn' : 'bad', !out ? 'ONLINE' : d < 0.9 ? 'LANDING' : 'GROUNDED', j(0.9)),
    R('Road traffic', pct(tr, 70, 20), `${Math.round(tr)}%`, false),
    R('City power', pct(lit, 70, 15), `${Math.round(lit)}% lit`, false),
    R('Fires burning', fires === 0 ? 'ok' : fires < 6 ? 'warn' : 'bad', fires === 0 ? 'NONE' : String(fires), false),
    R('Hospitals', !out || d < 0.9 ? 'ok' : d < 6 ? 'warn' : 'bad', !out || d < 0.9 ? 'ONLINE' : d < 6 ? 'GENERATORS' : 'OFFLINE', j(6)),
    R('Food & fuel', d < 1 ? 'ok' : d < 3 ? 'warn' : 'bad', d < 1 ? 'STOCKED' : d < 3 ? 'LOW' : 'OUT', j(3)),
    R('Water plants', d < 4 ? 'ok' : d < 6 ? 'warn' : 'bad', d < 4 ? 'RUNNING' : d < 6 ? 'WEAK' : 'OFFLINE', j(6)),
    R('Shipping', d < 2 ? 'ok' : d < 30 ? 'warn' : 'bad', d < 2 ? 'MOVING' : d < 30 ? 'STALLED' : 'IDLE', j(30)),
  ];
}
let lastHTML = '';
function updatePanel(T) {
  const rows = rowsAt(T);
  const bad = rows.filter((r) => r.includes('class="sy bad')).length;
  const html = `<div class="ph">LIVE STATUS</div>${rows.join('')}<div class="pf"><b>${bad}</b> of ${rows.length} failed</div>`;
  if (html !== lastHTML) { screenEl.innerHTML = html; lastHTML = html; }
  const rise = smooth(T / 0.9);
  phone.style.transform = `translate(0, ${(1 - rise) * 4}vh)`;
  phone.style.opacity = rise;
}
function updateOverlay(T) {
  elTitle.style.opacity = smooth(T / 0.8) * (1 - smooth((T - 4.4) / 0.7));
  const d = dayOf(T), beat = BEATS.find((b) => T >= b.a && T < b.b);
  let show = 0;
  if (beat) { hLabel.textContent = beat.label; hValue.textContent = beat.value(T); hSub.textContent = beat.sub(T); show = Math.min(smooth((T - beat.a) / 0.3), 1 - smooth((T - (beat.b - 0.15)) / 0.15)); }
  else if (T >= T_OUT + 0.2 && T < 57.6) {
    hLabel.textContent = 'Time since the internet died'; hValue.textContent = dayText(d);
    hSub.textContent = d > 0.9 ? `City lights still on: ${Math.round(litFrac(d) * 100)}%` : 'Cards, ATMs and transfers fail';
    show = Math.min(smooth((T - T_OUT - 0.2) / 0.3), 1 - smooth((T - 57.2) / 0.3));
  }
  hud.style.opacity = show;
  const cp = CAPS.find((c) => T >= c[0] - 0.05 && T < c[1] + 0.05);
  if (cp) { cap.textContent = cp[2]; const fin = smooth((T - cp[0]) / 0.4); cap.style.opacity = fin * (1 - smooth((T - (cp[1] - 0.4)) / 0.4)); cap.style.transform = `translateY(${(1 - fin) * 6}px)`; } else cap.style.opacity = 0;
  const fl = T >= T_OUT && T < T_OUT + 0.55 ? (Math.sin((T - T_OUT) * 70) > 0 ? 0.55 : 0.08) * (1 - (T - T_OUT) / 0.55) : 0;
  flash.style.opacity = fl;
  wrap.style.transform = fl > 0.1 ? `translate(${(Math.sin(T * 91) * 4).toFixed(1)}px, ${(Math.cos(T * 77) * 3).toFixed(1)}px)` : 'none';
  phone.style.display = T > 58 ? 'none' : 'block';
  end.style.opacity = smooth((T - 57.8) / 0.7);
  end.querySelector('.a').style.opacity = smooth((T - 58.6) / 0.6);
  end.querySelector('.b').style.opacity = smooth((T - 59.8) / 0.6);
  end.querySelector('.c').style.opacity = smooth((T - 61.0) / 0.7) * 0.9;
  updatePanel(T);
}
{
  const g = document.getElementById('grain'), c = g.getContext('2d');
  const id = c.createImageData(256, 256), r = rng(99);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  c.putImageData(id, 0, 0);
  g.style.width = '100%'; g.style.height = '100%';
}
function renderAt(T, sub = 1, dt = 1 / 60) {
  T = clamp(T, 0, T_END);
  const skip3D = T > 58.9;
  for (let j = 0; j < (skip3D ? 0 : sub); j++) {
    const Tj = clamp(T + (sub > 1 ? (j / (sub - 1) - 0.5) * dt : 0), 0, T_END);
    update(Tj);
    composer.render();
    actx.globalAlpha = 1 / (j + 1);
    actx.drawImage(glCanvas, 0, 0);
  }
  actx.globalAlpha = 1;
  updateOverlay(T);
}
window.renderAt = renderAt;
window.dbg = { scene, camera, renderer, composer, bloom, TofDay, dayOf };
window.T_END = T_END;
await Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"')]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
