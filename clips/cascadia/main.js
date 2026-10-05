import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* ------------------------------------------------------------------ *
 *  "What if the Cascadia Subduction Zone ruptured?"  — deterministic 62s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 *
 *  Setting: a beachfront hotel in Seaside, Oregon, facing the Pacific.
 */

const T_END = 62; // master (video) time in seconds

// Master time -> scene time. The calm intro runs in real time (scene time -10..2),
// then the eruption, flow, collapse and aftermath play in slow motion.
const WARP = [[0, 0], [9, 9], [19, 12], [22, 15], [32, 28], [37, 35], [44, 42], [50, 50], [57, 60], [62, 66]];
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
const SUN_DIR = new THREE.Vector3(0.35, 0.55, 0.75).normalize(); // clear afternoon sun behind the camera
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
      vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.42, h), 0.55));
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
 *  Lights, terrain, sea
 * ------------------------------------------------------------------ */
const NO_SHADOW = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x7a6a58, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.target.position.set(0, 0, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(+(P.get('shadow') ?? 2048), +(P.get('shadow') ?? 2048));
Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 1, far: 1500 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 600, cy * 600, cz * 600 + 40);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}

// Coordinates: camera looks toward -z (west, the Pacific). Shoreline z=-60, town z -14..140, forested hills inland (+z) and a headland to the left (-x).
function gh(x, z) {
  let y;
  if (z < -60) y = Math.max(-34, (z + 60) * 0.075);
  else if (z < -22) y = (z + 60) / 38 * 3.0 + 0.0;
  else if (z < 150) y = 3.0;
  else y = 3 + smooth((z - 150) / 420) * 170 * (0.55 + fbm(x * 0.004, z * 0.004));
  const hx = smooth((-x - 150) / 330);
  y += hx * (smooth((z + 150) / 170) * (90 + fbm(x * 0.006 + 3, z * 0.006) * 90));
  const mx = smooth((x - 300) / 420);
  y += mx * smooth((z + 40) / 120) * (40 + fbm(x * 0.005 + 9, z * 0.005 + 2) * 90);
  y += fbm(x * 0.03, z * 0.03) * (y > 8 ? 4 : 0.35);
  return y;
}
const tileXs = [], tileZs = [];
for (let x = -2400; x < -420; x += 120) tileXs.push(x);
for (let x = -420; x < 420; x += 6) tileXs.push(x);
for (let x = 420; x <= 2400; x += 120) tileXs.push(x);
for (let z = -1800; z < -420; z += 120) tileZs.push(z);
for (let z = -420; z < 700; z += 6) tileZs.push(z);
for (let z = 700; z <= 1900; z += 120) tileZs.push(z);
const terrainGeo = new THREE.PlaneGeometry(1, 1, tileXs.length - 1, tileZs.length - 1);
{
  const pos = terrainGeo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
  for (let j = 0; j < tileZs.length; j++) for (let i = 0; i < tileXs.length; i++) {
    const k = j * tileXs.length + i, x = tileXs[i], z = tileZs[j], y = gh(x, z);
    pos.setXYZ(k, x, y, z);
    if (y < -0.6) c.set(0x6d7458).lerp(c2.set(0x2d4a52), smooth(-y / 22)); // seabed
    else if (z < -22 && x > -250) c.set(0xd9c8a4).lerp(c2.set(0xc2ae88), fbm(x * 0.05, z * 0.05)); // beach
    else if (y < 6) c.set(0x6f8450).lerp(c2.set(0x8a9468), fbm(x * 0.03, z * 0.03)); // grass / town ground
    else if (y < 90) c.set(0x2c4a2d).lerp(c2.set(0x365a36), fbm(x * 0.02, z * 0.02));
    else c.set(0x3d5a3d).lerp(c2.set(0x7e8a78), smooth((y - 100) / 90));
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  terrainGeo.computeVertexNormals();
}
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
terrain.receiveShadow = true;
scene.add(terrain);

// sea surface: height field driven in update()
const seaGeo = new THREE.PlaneGeometry(1, 1, tileXs.length - 1, tileZs.length - 1);
const seaPos = seaGeo.attributes.position, seaTurb = new Float32Array(seaPos.count), seaFoam = new Float32Array(seaPos.count);
seaGeo.setAttribute('aTurb', new THREE.BufferAttribute(seaTurb, 1));
seaGeo.setAttribute('aFoam', new THREE.BufferAttribute(seaFoam, 1));
const NX = tileXs.length, NZ = tileZs.length;
const seaGround = new Float32Array(NX * NZ);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { seaPos.setXYZ(j * NX + i, tileXs[i], 0, tileZs[j]); seaGround[j * NX + i] = gh(tileXs[i], tileZs[j]); }
const seaMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: true,
  uniforms: { time: { value: 0 }, sunDir: { value: SUN_DIR }, skyHor: { value: new THREE.Color() }, skyTop: { value: new THREE.Color() }, fogCol: { value: new THREE.Color() }, fogDen: { value: 0.0003 }, deep: { value: new THREE.Color(0x1a5a72) }, mud: { value: new THREE.Color(0x4f4333) }, sunCol: { value: new THREE.Color(0xffe0b0) } },
  vertexShader: `attribute float aTurb; attribute float aFoam; varying vec3 vW; varying float vT; varying float vF; varying float vD;
    void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vT = aTurb; vF = aFoam; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float time; uniform vec3 sunDir, skyHor, skyTop, fogCol, deep, mud, sunCol; uniform float fogDen; varying vec3 vW; varying float vT; varying float vF; varying float vD;
    void main(){
      vec2 p = vW.xz;
      float dx = 0.0, dz = 0.0;
      dx += cos(p.x*0.11 + p.y*0.05 + time*0.9)*0.05 + cos(p.x*0.31 - p.y*0.2 + time*1.7)*0.03 + cos(p.x*0.9 + p.y*0.7 + time*2.6)*0.012;
      dz += cos(p.y*0.13 - p.x*0.04 + time*0.8)*0.05 + cos(p.y*0.29 + p.x*0.18 + time*1.5)*0.03 + cos(p.y*0.8 - p.x*0.6 + time*2.3)*0.012;
      vec3 n = normalize(vec3(-dx, 1.0, -dz));
      vec3 V = normalize(cameraPosition - vW);
      float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      vec3 refl = mix(skyHor, skyTop, 0.35);
      vec3 col = mix(deep, mud, vT);
      col = mix(col, refl, clamp(0.08 + fr*0.7, 0.0, 1.0) * (1.0 - vT*0.55));
      vec3 R = reflect(-V, n);
      float sp = max(dot(R, normalize(sunDir)), 0.0);
      col += sunCol * (pow(sp, 240.0) * 2.4 + pow(sp, 30.0) * 0.18) * (1.0 - vT*0.7);
      col = mix(col, vec3(0.9,0.92,0.92), clamp(vF, 0.0, 1.0) * 0.55 * (0.65 + 0.35*sin(p.x*0.35+p.y*0.2+time*2.0)));
      float f = 1.0 - exp(-fogDen*fogDen*vD*vD);
      col = mix(col, fogCol, clamp(f, 0.0, 1.0));
      gl_FragColor = vec4(col, 0.96);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.frustumCulled = false; sea.renderOrder = 2;
scene.add(sea);

/* ------------------------------------------------------------------ *
 *  Town
 * ------------------------------------------------------------------ */
function winTex(base, seed, floors, bays) {
  const w = 64 * bays, h = 64 * floors, c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = shade(base, 1); x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1200; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.04})`; x.fillRect(r() * w, r() * h, 3, 3); }
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const wx = b * 64 + 14, wy = f * 64 + 14;
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(wx - 2, wy - 2, 40, 36);
    x.fillStyle = r() < 0.25 ? '#e9d49a' : '#2c3b4d'; x.fillRect(wx, wy, 36, 32);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(wx, wy, 36, 8);
    x.fillStyle = 'rgba(244,240,230,.9)'; x.fillRect(wx + 17, wy, 2, 32); x.fillRect(wx, wy + 15, 36, 2);
  }
  const t = toTex(c); return t;
}
const PASTELS = [0xe4d8c0, 0xd8b99a, 0xc9d6d8, 0xe9c8b4, 0xb7c9b4, 0xd7cfa8, 0xcdbcd0, 0xe6a98d, 0xf0ecdf, 0xa9c1d6];
const roofCols = [0x5b4e48, 0x4a4f55, 0x6b4a3c, 0x3d4650];
const hexMat = (c) => new THREE.MeshLambertMaterial({ color: c });
const roofMats = roofCols.map(hexMat);
function gableGeo(w, d, hgt) { // ridge along x
  const g = new THREE.BufferGeometry(), hw = w / 2 + 0.6, hd = d / 2 + 0.6;
  const v = [-hw, 0, -hd, hw, 0, -hd, 0, 0, 0]; void v;
  const P_ = [[-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd], [-hw, hgt, 0], [hw, hgt, 0]];
  const idx = [[0, 1, 5], [0, 5, 4], [2, 3, 4], [2, 4, 5], [3, 0, 4], [1, 2, 5]];
  const pos = []; idx.forEach((t) => t.forEach((i) => pos.push(...P_[i])));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const buildings = [];
const BH = (b) => b.h;
function addBuilding(x, z, w, d, floors, seed, opts = {}) {
  const r = rng(seed), fh = 3.2, h = floors * fh, bays = Math.max(2, Math.round(w / 4.2));
  const base = PASTELS[Math.floor(r() * PASTELS.length)];
  const tex = winTex(base, seed, floors, bays); tex.repeat.set(1, 1);
  const g = new THREE.Group();
  const sideM = new THREE.MeshLambertMaterial({ map: tex });
  const plain = hexMat(base);
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0);
  const body = new THREE.Mesh(geo, [plain, plain, plain, plain, sideM, sideM]); // +z, -z faces carry windows
  body.castShadow = true; body.receiveShadow = true; g.add(body);
  const flat = floors >= 5 || r() < 0.3;
  if (flat) { const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), hexMat(0x77736c)); cap.position.y = h + 0.25; cap.castShadow = true; g.add(cap); }
  else { const roof = new THREE.Mesh(gableGeo(w, d, 2.2 + r() * 1.6), roofMats[Math.floor(r() * 4)]); roof.position.y = h; roof.castShadow = true; g.add(roof); }
  g.position.set(x, gh(x, z), z);
  scene.add(g);
  const b = { g, x, z, w, d, h, seed, y0: g.position.y, fail: opts.fail || null, floors, wash: 0 };
  buildings.push(b); return b;
}
{
  const r = rng(7);
  // row 1: beachfront motels, z ~ 6..30
  for (let x = -300; x < 140; x += 14 + r() * 5) { addBuilding(x, 10 + r() * 4, 9 + r() * 5, 11 + r() * 5, 2 + Math.floor(r() * 3), 100 + Math.round(x)); }
  // row 2: mixed
  for (let x = -300; x < 140; x += 17 + r() * 7) { if (x > 4 && x < 70) continue; addBuilding(x, 40 + r() * 6, 10 + r() * 8, 13 + r() * 6, 2 + Math.floor(r() * 5), 400 + Math.round(x)); }
  // row 3
  for (let x = -300; x < 200; x += 22 + r() * 10) addBuilding(x, 98 + r() * 12, 12 + r() * 8, 12 + r() * 6, 2 + Math.floor(r() * 2), 700 + Math.round(x));
}
// Our hotel: camera sits on its roof
const HOTEL = { x: 40, z: 74, w: 40, d: 26, floors: 8 };
const hotel = addBuilding(HOTEL.x, HOTEL.z, HOTEL.w, HOTEL.d, HOTEL.floors, 31);
// scripted failures: two older brick buildings near the middle fall
const failTargets = buildings.filter((b) => b !== hotel && b.z < 30 && Math.abs(b.x) < 120).sort((a, b) => Math.abs(a.x) - Math.abs(b.x)).slice(0, 3);
failTargets.forEach((b, i) => { b.fail = { t: 21.5 + i * 3.1, dir: i % 2 ? 1 : -1, pancake: i === 1 }; });
const ROOF_Y = gh(HOTEL.x, HOTEL.z) + HOTEL.floors * 3.2 + 0.6;
const CAM0 = new THREE.Vector3(HOTEL.x - HOTEL.w / 2 + 3, ROOF_Y + 1.2, HOTEL.z - HOTEL.d / 2 - 0.4);

// street, promenade, parking, utility poles
const roadMat = new THREE.MeshLambertMaterial({ color: 0x7a7a80 });
for (const [zc, wd] of [[0, 9], [30, 7], [72 - 22, 7]]) {
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(900, wd), roadMat); rd.rotation.x = -Math.PI / 2; rd.position.set(0, 3.4, zc - (zc === 0 ? 0 : 0)); rd.receiveShadow = true; scene.add(rd);
}
{
  const side = new THREE.Mesh(new THREE.PlaneGeometry(900, 7), new THREE.MeshLambertMaterial({ color: 0xbdb6aa })); side.rotation.x = -Math.PI / 2; side.position.set(0, 3.41, -8); scene.add(side);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(900, 0.25), new THREE.MeshBasicMaterial({ color: 0xe0c24a })); line.rotation.x = -Math.PI / 2; line.position.set(0, 3.43, 0); scene.add(line);
}
for (const xr of [-170, -110, -50, 10, 70, 130]) {
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(7, 150), roadMat); rd.rotation.x = -Math.PI / 2; rd.position.set(xr, 3.4, 70); rd.receiveShadow = true; scene.add(rd);
}
const lot = new THREE.Mesh(new THREE.PlaneGeometry(64, 26), roadMat); lot.rotation.x = -Math.PI / 2; lot.position.set(40, 3.42, 47); lot.receiveShadow = true; scene.add(lot);
const poles = [];
{
  const pm = hexMat(0x5a4636), wire = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
  const pg = new THREE.CylinderGeometry(0.16, 0.2, 10, 6); pg.translate(0, 5, 0);
  for (let x = -300; x <= 300; x += 36) {
    const m = new THREE.Mesh(pg, pm); m.position.set(x, 3, 4.8); m.castShadow = true; scene.add(m);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.4), pm); arm.position.set(x, 12.2, 4.8); scene.add(arm);
    poles.push({ m, arm, x, ph: x * 0.07 });
  }
  const pts = []; for (let x = -300; x <= 300; x += 4) pts.push(new THREE.Vector3(x, 12 - 0.9 * Math.pow(Math.sin(((x + 300) % 36) / 36 * Math.PI), 1), 3.9));
  for (const dz of [0, 1, 1.9]) { const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y + 0.0, 3.9 + dz))); scene.add(new THREE.Line(g, wire)); }
}

// evergreen forest (instanced two-tier cones)
const TREES = [];
{
  const r = rng(77);
  for (let i = 0; i < 5200; i++) {
    const x = (r() - 0.5) * 1700, z = 135 + r() * 1100 - (r() < 0.12 ? 160 : 0);
    const y = gh(x, z);
    if (y < 4) continue;
    if (z < 215 && r() < 0.6) continue;
    TREES.push({ x, y, z, s: 7 + r() * 11, ph: r() * 6.28, tone: 0.72 + r() * 0.4 });
  }
  for (let i = 0; i < 700; i++) { // headland trees and scattered town trees
    const x = -150 - r() * 600, z = -80 + r() * 380, y = gh(x, z);
    if (y < 4 || (x > -180 && z < 200)) continue;
    TREES.push({ x, y, z, s: 7 + r() * 10, ph: r() * 6.28, tone: 0.7 + r() * 0.4 });
  }
  for (let i = 0; i < 160; i++) { const x = (r() - 0.5) * 640, z = 18 + r() * 110; if (buildings.some((b) => Math.abs(x - b.x) < b.w / 2 + 2.5 && Math.abs(z - b.z) < b.d / 2 + 2.5)) continue; TREES.push({ x, y: 3, z, s: 5 + r() * 5, ph: r() * 6.28, tone: 0.9 }); }
}
const coneA = new THREE.ConeGeometry(0.34, 0.62, 7); coneA.translate(0, 0.35, 0);
const coneB = new THREE.ConeGeometry(0.24, 0.5, 7); coneB.translate(0, 0.72, 0);
const treeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const treesA = new THREE.InstancedMesh(coneA, treeMat, TREES.length), treesB = new THREE.InstancedMesh(coneB, treeMat, TREES.length);
{
  const m = new THREE.Matrix4(), c = new THREE.Color();
  TREES.forEach((t, i) => {
    m.compose(new THREE.Vector3(t.x, t.y - 0.4, t.z), new THREE.Quaternion(), new THREE.Vector3(t.s, t.s * 1.35, t.s));
    treesA.setMatrixAt(i, m); treesB.setMatrixAt(i, m);
    c.setRGB(0.12 * t.tone, 0.26 * t.tone, 0.14 * t.tone); treesA.setColorAt(i, c); treesB.setColorAt(i, c);
  });
  treesA.castShadow = false; treesB.castShadow = false;
  scene.add(treesA, treesB);
}

// logs, beach grass tufts (cheap), rocks
{
  const r = rng(12), lg = new THREE.CylinderGeometry(0.35, 0.4, 7, 6); lg.rotateZ(Math.PI / 2);
  const lm_ = hexMat(0x7d6c57);
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(lg, lm_); m.position.set((r() - 0.5) * 600, 0.8 + 3 * 0.0, -30 - r() * 20); m.position.y = gh(m.position.x, m.position.z) + 0.4; m.rotation.y = r() * 3; m.scale.set(0.6 + r(), 1, 1); scene.add(m); }
  const rg = new THREE.DodecahedronGeometry(1, 0), rm = hexMat(0x6f6a64);
  for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(rg, rm); const x = (r() - 0.5) * 700, z = -60 - r() * 160; m.position.set(x, gh(x, z) + 0.5, z); m.scale.set(2 + r() * 4, 1.5 + r() * 3, 2 + r() * 4); m.rotation.set(r(), r(), r()); scene.add(m); }
}
// haystack rock offshore (iconic)
{
  const g = new THREE.ConeGeometry(14, 52, 9, 3); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = hash2(p.getX(i) * 3.1, p.getZ(i) * 3.1 + p.getY(i)); p.setX(i, p.getX(i) * (0.85 + k * 0.3)); p.setZ(i, p.getZ(i) * (0.85 + k * 0.3)); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, hexMat(0x55524e)); m.position.set(-120, 22, -190); m.castShadow = true; scene.add(m);
  const m2 = new THREE.Mesh(new THREE.ConeGeometry(5, 18, 7), hexMat(0x55524e)); m2.position.set(-88, 6, -168); scene.add(m2);
}

/* ---------- cars ---------- */
const cars = [];
{
  const r = rng(61), cols = [0xd9d9d3, 0x1a1a1c, 0x2b4a86, 0xb21f24, 0xc8cacc, 0x6c7378, 0xe0b92a, 0x2f6b4a, 0xf2f2ee];
  const bodyG = new THREE.BoxGeometry(1.85, 0.8, 4.4); bodyG.translate(0, 0.65, 0);
  const cabG = new THREE.BoxGeometry(1.6, 0.7, 2.3); cabG.translate(0, 1.3, -0.1);
  const dark = hexMat(0x1b2430);
  for (let i = 0; i < 52; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bodyG, hexMat(cols[Math.floor(r() * cols.length)])), new THREE.Mesh(cabG, dark));
    NO_SHADOW(g); scene.add(g);
    const dir = r() < 0.5 ? 1 : -1;
    cars.push({ g, dir, lane: dir > 0 ? 1.8 : -1.8, x0: (r() - 0.5) * 560, v: 6 + r() * 4, i, park: i % 3 === 0 && i < 36, px: (r() - 0.5) * 520, ph: r() * 6, fixed: i >= 36 ? { x: 12 + ((i - 36) % 8) * 7, z: i < 44 ? 41 : 52, yaw: Math.PI } : null });
  }
}
/* ---------- people ---------- */
const people = [];
{
  const r = rng(52);
  for (let i = 0; i < 26; i++) {
    const pr = makePerson(r), g = pr.g; NO_SHADOW(g); g.scale.setScalar(0.95 + r() * 0.08);
    const onBeach = i < 18;
    people.push({ g, legs: pr.legs, arms: pr.arms, x0: (r() - 0.5) * (onBeach ? 150 : 200) + (onBeach ? 0 : 0), z0: onBeach ? -26 - r() * 18 : -8 + r() * 3, sp: 0.5 + r() * 0.6, ph: r() * 6.28, dirv: r() < 0.5 ? -1 : 1, fallT: 15.4 + r() * 2.5, fx: (r() - 0.5) * 1.5, runT: 32 + r() * 3, beach: onBeach });
    scene.add(g);
  }
}

/* ---------- rig (camera shakes with the hotel roof) ---------- */
const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);
rig.position.copy(CAM0);

/* ---------- debris carried by the wave (instanced boxes) ---------- */
const DEB_N = 260;
const debGeo = new THREE.BoxGeometry(1, 1, 1);
const debMesh = new THREE.InstancedMesh(debGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), DEB_N);
debMesh.frustumCulled = false; scene.add(debMesh);
const DEB = [];
{
  const r = rng(90), cs = [0xc9b79a, 0x6b4a3c, 0x8a8a86, 0x2b4a86, 0xb21f24, 0xd9d9d3, 0x55402f];
  for (let i = 0; i < DEB_N; i++) {
    const big = i < 50;
    DEB.push({ x: (r() - 0.5) * 520, off: 6 + r() * 70, sx: big ? 3 + r() * 5 : 0.6 + r() * 1.6, sy: big ? 1.5 + r() * 2.5 : 0.3 + r() * 0.8, sz: big ? 2.5 + r() * 4 : 0.6 + r() * 1.6, ph: r() * 6.28, spin: (r() - 0.5) * 3, lag: r() * 0.6, c: cs[Math.floor(r() * cs.length)] });
    debMesh.setColorAt(i, new THREE.Color(DEB[i].c));
  }
}
/* falling rubble from collapsing buildings and shaken-off pieces */
const RUB_N = 220;
const rubMesh = new THREE.InstancedMesh(debGeo, new THREE.MeshLambertMaterial({ color: 0xb5a58e }), RUB_N);
rubMesh.frustumCulled = false; scene.add(rubMesh);
const RUB = Array.from({ length: RUB_N }, (_, i) => { const r = rng(300 + i); return { k: Math.floor(r() * 3), ox: (r() - 0.5), oy: r(), oz: (r() - 0.5), vx: (r() - 0.5) * 7, vz: (r() - 0.2) * 6, s: 0.5 + r() * 1.4, spin: (r() - 0.5) * 6 }; });

/* ------------------------------------------------------------------ *
 *  Update
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
const SKY_H = [[0, 0xf4d7b4], [14, 0xf4d7b4], [18, 0xcdb08f], [30, 0xb59f8c], [42, 0xb8a58f], [50, 0xcdb49a], [66, 0xc0a995]];
const SKY_T = [[0, 0x3f7fd6], [14, 0x3f7fd6], [18, 0x7d8c9e], [30, 0x7a8393], [42, 0x7c8796], [50, 0x8a95a3], [66, 0x7f8895]];
const fmod = (a, n) => ((a % n) + n) % n;
const sh = (t, a, b) => Math.sin(t * a + b);
function shakeEnv(t) {
  const e = smooth((t - 15) / 1.4) * (1 - smooth((t - 29) / 6)) * (0.8 + 0.2 * Math.sin(t * 2.1));
  const pw = smooth((t - 12) / 0.2) * (1 - smooth((t - 12.8) / 0.9)) * 0.2;
  return Math.max(e, pw);
}
// tsunami timeline (scene seconds)
const T_RECEDE0 = 34, T_RECEDE1 = 42, T_WAVE0 = 41.5, FRONT_V = 45; // front speed m/s inland
const frontZ = (t) => -400 + (t - T_WAVE0) * FRONT_V;
const seaLevel = (t) => 1.0 * smooth((t - 16) / 14) - 11 * smooth((t - T_RECEDE0) / (T_RECEDE1 - T_RECEDE0)) * (1 - smooth((t - T_WAVE0 - 3) / 3));
const waveAmp = (t) => 11 * smooth((t - T_WAVE0 + 1) / 5.5);
function waterY(x, z, t, idx) {
  const base = seaLevel(t);
  const rip = Math.sin(x * 0.07 + t * 1.3) * 0.18 + Math.sin(z * 0.09 - t * 1.1) * 0.14;
  let y = base + rip;
  if (t > T_WAVE0 - 1) {
    const zf = frontZ(t), dist = zf - z;
    const A = waveAmp(t);
    if (dist > -4) {
      const prof = A * (1 - 0.5 * smooth(dist / 260)) * (0.5 + 0.5 * fbm(x * 0.02 + 5, z * 0.02 + t * 0.05));
      const face = smooth((dist + 4) / 12); // steep leading face
      y = Math.max(y, 3 + prof * face - (z > -40 ? Math.max(0, (z + 40)) * 0.0 : 0)) ;
      if (z > -60) y = 3 + prof * face * (1 - 0.35 * smooth((z - 60) / 120));
      else y = Math.max(y, base + prof * face);
    }
  }
  return y;
}

function update(t) {
  pc = 0;
  const E = shakeEnv(t);
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [15, 0.9], [26, 0.2], [66, 0.1]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00028], [14, 0.0003], [17, 0.0005], [30, 0.0008], [44, 0.0009], [66, 0.001]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [30, 1.0], [66, 1.0]]);
  setSun(kf(t, [[0, 24], [14, 23], [34, 19], [66, 14]]));
  sun.intensity = Math.PI * kf(t, [[0, 2.8], [14, 2.7], [17, 2.1], [32, 1.5], [66, 1.0]]);
  kfc(t, [[0, 0xffdcaa], [30, 0xf0c090], [66, 0xe8b484]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.05], [15, 1.0], [30, 0.85], [66, 0.75]]);
  hemi.color.copy(horC).lerp(topC, 0.55); hemi.groundColor.set(0x7a6a58);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.08], [26, 0.95], [50, 0.9]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [40, 1.08]]).toFixed(3)})`;

  /* camera rig on the hotel roof, looking west over the beach */
  const yaw = kf(t, [[0, 28], [6, 26], [12, 25], [15, 29], [17, 32], [19, 24], [22, 22], [30, 21], [38, 21], [46, 20], [52, 16], [60, 12]]);
  const pitch = kf(t, [[0, -9], [6, -9], [12, -8], [20, -9], [30, -9], [38, -8], [46, -9], [52, -12], [60, -14]]);
  const fov = kf(t, [[0, 62], [12, 58], [30, 58], [46, 60], [60, 64]]);
  rig.position.set(CAM0.x + E * 0.34 * (sh(t, 17.3, 1) + 0.6 * sh(t, 9.7, 2)), CAM0.y + E * 0.16 * (sh(t, 23.1, 4) + 0.5 * sh(t, 12.4, 5)), CAM0.z + E * 0.3 * (sh(t, 13.7, 6) + 0.5 * sh(t, 27, 7)));
  rig.rotation.set(E * 0.012 * sh(t, 7.7, 8), E * 0.006 * sh(t, 5.9, 9), E * 0.016 * sh(t, 6.1, 10));
  camera.position.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(pitch) + 0.0012 * sh(t, 1.3, 1), THREE.MathUtils.degToRad(yaw) + 0.0016 * sh(t, 0.8, 2), 0.0015 * sh(t, 1.1, 3));
  if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);

  /* sea surface */
  const SU = seaMat.uniforms;
  SU.time.value = t; SU.skyHor.value.copy(horC); SU.skyTop.value.copy(topC); SU.fogCol.value.copy(horC); SU.fogDen.value = scene.fog.density;
  SU.sunDir.value.copy(skyMat.uniforms.sunDir.value); SU.sunCol.value.copy(sun.color);
  const zf = frontZ(t), waveOn = t > T_WAVE0 - 2;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = tileXs[i], z = tileZs[j], gy = seaGround[k];
    let y, turb = 0, foam = 0;
    if (!waveOn && z > -2) { y = -8; }
    else {
      y = waterY(x, z, t);
      if (waveOn) { const dist = zf - z; if (dist > -6 && dist < 18) foam = (1 - Math.abs(dist - 4) / 14) * 0.9; turb = clamp(((t - T_WAVE0) / 3)) * smooth((y - gy) / 2 + 0.3) * (dist > -2 ? 1 : 0.5); if (z < -60) turb *= 0.85; }
      if (waveOn && z > zf + 8) y = -8; // not reached yet
      else if (y - gy < 0.05 && z > -40) y = -8; // shallow ground above the surface hides the sheet
      if (!waveOn && gy > y - 0.05) y = gy - 0.4; // beach above the sea level
    }
    seaPos.setY(k, y); seaTurb[k] = turb; seaFoam[k] = foam;
    // near the edge of water over sand: foam rim at the waterline
  }
  seaPos.needsUpdate = true; seaGeo.attributes.aTurb.needsUpdate = true; seaGeo.attributes.aFoam.needsUpdate = true;

  /* buildings: tremble, a few fail, wave tears the beachfront row apart */
  for (const b of buildings) {
    const g = b.g;
    let tr = E * 0.004 * Math.sin(t * 8.5 + b.seed);
    let x = b.x, y = b.y0, z = b.z, rx = 0, rz = tr, ry = 0, sy = 1;
    if (b.fail) {
      const f = b.fail, k = clamp((t - f.t) / 2.4);
      if (f.pancake) { sy = 1 - 0.7 * smooth(k); x += E * 0.6 * Math.sin(t * 20); }
      else { rz += f.dir * 1.25 * Math.pow(k, 1.6); x += f.dir * 3 * smooth(k); y -= 1.5 * smooth(k); rx += 0.06 * smooth(k); }
      if (k > 0 && k < 1) { for (let q = 0; q < 3; q++) addPuff(x + (Math.random() - 0.5) * 0, y + 2 + q * 2, z - b.d / 2, 9 + 8 * k, (b.seed + q) * 1.3, 0.76, 0.7, 0.62, 0.35 * (1 - k * 0.5)); }
    }
    // tsunami hits
    const hit = clamp((t - (T_WAVE0 + (b.z + 400) / FRONT_V)) / 2.4);
    if (hit > 0 && b.z < 110 && b !== hotel) { const w = b.wash = hit; z += 6 * w * w * (1 + (b.seed % 3)) ; y -= 0.8 * w; rx += 0.45 * w * (b.seed % 2 ? 1 : -1); rz += 0.4 * w * ((b.seed % 5) / 5 - 0.4); }
    if (b === hotel) { rz = tr * 0.5; }
    g.position.set(x, y, z); g.rotation.set(rx, ry, rz); g.scale.set(1, sy, 1);
  }
  /* poles */
  for (const p of poles) { const lean = E * 0.015 * Math.sin(t * 6 + p.ph) + (p.x > -60 && p.x < 40 ? smooth((t - 22) / 8) * 0.12 : 0) + smooth((t - T_WAVE0 - 2 - (p.x * 0 )) / 6) * 0.05; p.m.rotation.z = lean; p.arm.position.x = p.x + Math.sin(lean) * 10; p.arm.rotation.z = lean; }
  /* trees sway during the quake (scale jitter on a sample) -- cheap: shake whole forest slightly */
  treesA.position.y = treesB.position.y = E * 0.12 * Math.sin(t * 17);
  treesA.position.x = treesB.position.x = E * 0.1 * Math.sin(t * 13);

  /* cars */
  for (const c of cars) {
    let x, z, yaw;
    if (c.fixed) { x = c.fixed.x; z = c.fixed.z; yaw = c.fixed.yaw; }
    else if (c.park) { x = c.px; z = c.dir > 0 ? 3.0 - 0.0 : 28.5; yaw = Math.PI / 2; }
    else { const tt = Math.min(t, 12.3); const x1 = c.x0 + c.dir * c.v * tt; x = fmod(x1 + 300, 600) - 300; if (t > 12.3) x += c.dir * c.v * 0.7 * (1 - Math.exp(-(t - 12.3) / 0.7)); z = c.dir > 0 ? 2.0 : -2.0; yaw = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    let y = 3.45 + E * 0.05 * Math.abs(Math.sin(t * 15 + c.i)), rr = 0, tilt = 0;
    const hit = clamp((t - (T_WAVE0 + (z + 400) / FRONT_V + 0.8)) / 4);
    if (hit > 0) { const sx = 8 + (c.i % 5) * 4; x += sx * hit; z += 28 * hit * hit * (1 + (c.i % 4) * 0.5); y += 3 * Math.sin(hit * 2) + 0.5 * hit; yaw += hit * 2 * (c.i % 2 ? 1 : -1); tilt = 0.6 * hit; rr = 0.5 * hit; }
    c.g.position.set(x + E * 0.3 * Math.sin(t * 13 + c.i), y, z);
    c.g.rotation.set(rr + E * 0.025 * Math.sin(t * 11 + c.i), yaw, tilt + E * 0.03 * Math.sin(t * 9 + c.i));
  }
  /* people */
  for (const p of people) {
    const tt = Math.min(t, 12.4);
    let x = p.x0 + p.dirv * p.sp * tt, z = p.z0, face = p.dirv > 0 ? Math.PI / 2 : -Math.PI / 2;
    const f = smooth((t - p.fallT) / 0.45), moving = t < 12.4;
    let sw = moving ? Math.sin(tt * 6 + p.ph) * 0.45 : 0;
    let y = gh(x, z) + 0.05;
    if (t > p.runT) { // run inland (toward +z), up the street
      const rt = t - p.runT, sp = 3.4;
      x = p.x0 + p.dirv * p.sp * 12.4 + p.fx * 4 * rt * 0.3; z = Math.min(p.z0 + sp * rt, 64); face = Math.PI; y = gh(x, z) + 0.05;
      sw = Math.sin(t * 11 + p.ph) * 0.8;
      p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw; p.arms[1].rotation.x = sw;
      p.g.position.set(x, y, z); p.g.rotation.set(0, face, 0);
      p.g.visible = true;
      continue;
    }
    p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8;
    if (!moving && f < 1) { p.arms[0].rotation.x = -0.9 * (1 - f) - 1.2 * f; p.arms[1].rotation.x = -0.9 * (1 - f) - 1.2 * f; }
    const getUp = smooth((t - (p.runT - 1.2)) / 1.2);
    const fall = f * (1 - getUp);
    const jig = E * 0.12 * Math.sin(t * 14 + p.ph);
    p.g.position.set(x + jig + p.fx * fall * 0.6, y - 0.22 * fall, z);
    p.g.rotation.set(-1.5 * fall, face, (p.fx > 0 ? 1 : -1) * 0.3 * fall + E * 0.03 * Math.sin(t * 12 + p.ph));
  }

  /* debris carried by the wave */
  for (let i = 0; i < DEB_N; i++) {
    const d = DEB[i];
    const zz = zf - d.off - d.lag * 20;
    const on = waveOn && t > T_WAVE0 + 0.5 && zz > -50 && zz < 190;
    if (on) {
      const wy = waterY(d.x, zz, t);
      const x = d.x + Math.sin(t * 0.7 + d.ph) * 2;
      dummy.position.set(x, Math.max(wy, 3) - 0.15 * d.sy + Math.sin(t * 1.6 + d.ph) * 0.4, zz);
      dummy.rotation.set(d.spin * 0.15 * Math.sin(t + d.ph), d.ph + d.spin * 0.2 * (t - T_WAVE0), d.spin * 0.12 * Math.cos(t * 0.9 + d.ph));
      dummy.scale.set(d.sx, d.sy, d.sz);
    } else dummy.scale.set(0.0001, 0.0001, 0.0001);
    dummy.updateMatrix(); debMesh.setMatrixAt(i, dummy.matrix);
  }
  debMesh.instanceMatrix.needsUpdate = true;
  if (debMesh.instanceColor) debMesh.instanceColor.needsUpdate = true;

  /* rubble from collapsing buildings and tumbling pieces */
  for (let i = 0; i < RUB_N; i++) {
    const rb = RUB[i], tgt = failTargets[rb.k];
    let on = false;
    if (tgt) {
      const dt_ = t - tgt.fail.t - 0.15 - (i % 7) * 0.12;
      if (dt_ > 0 && dt_ < 5.5) {
        const g = 9.8, py = tgt.y0 + tgt.h * rb.oy + 1 - 0.5 * g * dt_ * dt_ * 0.6;
        const yy = Math.max(py, tgt.y0 + 0.4);
        dummy.position.set(tgt.x + tgt.w * rb.ox + rb.vx * Math.min(dt_, 1.5) * 0.4, yy, tgt.z + tgt.d * rb.oz + rb.vz * Math.min(dt_, 1.5) * 0.4 + (tgt.z < 0 ? 0 : 0));
        dummy.rotation.set(rb.spin * dt_ * 0.3, rb.spin * dt_ * 0.2, 0);
        dummy.scale.set(rb.s, rb.s * 0.7, rb.s);
        on = true;
      }
    }
    if (!on) dummy.scale.set(0.0001, 0.0001, 0.0001);
    dummy.updateMatrix(); rubMesh.setMatrixAt(i, dummy.matrix);
  }
  rubMesh.instanceMatrix.needsUpdate = true;

  /* dust and spray puffs */
  const qs = smooth((t - 15) / 1.4) * (1 - smooth((t - 36) / 8));
  if (qs > 0.01) {
    for (let i = 0; i < 70; i++) {
      const r = hash2(i, 3.3), r2 = hash2(i, 9.1), r3 = hash2(i, 5.7);
      const x = -300 + r * 560 + Math.sin(t * 0.6 + i) * 3, zc = -4 + r2 * 120, yy = gh(x, zc) + 1 + ((t * (1.4 + r3) + i * 3) % 14);
      addPuff(x, yy, zc, 12 + r3 * 14, i, 0.74, 0.68, 0.6, 0.12 * qs);
    }
    // landslides on the headland
    for (let i = 0; i < 40; i++) {
      const r = hash2(i, 7.7), r2 = hash2(i, 1.9), x = -330 - r * 260, zc = -40 + r2 * 220, yy = gh(x, zc) + 4 + ((t * 5 + i * 5) % 26);
      addPuff(x, yy, zc, 20 + r * 20, i * 2, 0.62, 0.55, 0.46, 0.2 * qs);
    }
  }
  if (waveOn) { // spray on the leading face
    const ts = smooth((t - T_WAVE0) / 2);
    for (let i = 0; i < 90; i++) {
      const x = -420 + (i / 90) * 840 + hash2(i, 2) * 8, dist = hash2(i, 6) * 14 - 5, zz = zf - dist;
      if (zz < -40 || zz > 175) continue;
      const wy = Math.max(waterY(x, zz, t), 3);
      addPuff(x, wy + 1 + hash2(i, 8) * 6, zz, 7 + hash2(i, 4) * 9, i, 0.9, 0.93, 0.95, 0.4 * ts);
    }
  }
  /* mist over the retreating sea */
  const flushDust = smooth((t - T_RECEDE0) / 4) * (1 - smooth((t - T_WAVE0 - 6) / 6));
  if (flushDust > 0.01) for (let i = 0; i < 18; i++) addPuff(-280 + i * 32 + hash2(i, 1) * 10, 1.5, -190 - hash2(i, 5) * 160, 70, i, 0.85, 0.87, 0.9, 0.1 * flushDust);
  flushSmoke();
}

/* ------------------------------------------------------------------ *
 *  Pacific Northwest map (rupture beat)
 * ------------------------------------------------------------------ */
const mapCanvas = document.getElementById('map');
const mctx = mapCanvas.getContext('2d');
mapCanvas.width = innerWidth * DPR; mapCanvas.height = innerHeight * DPR;
const LAND = [[-124.4, 40.4], [-124.1, 41.0], [-124.2, 42.0], [-124.55, 42.8], [-124.1, 43.7], [-124.0, 44.6], [-123.95, 45.5], [-123.95, 46.25], [-124.1, 47.0], [-124.45, 47.7], [-124.7, 48.4], [-123.2, 48.15], [-122.7, 48.9], [-123.1, 49.3], [-124.8, 50.0], [-126.0, 50.8], [-127.2, 51.0], [-119.5, 51.0], [-119.5, 40.4]];
const ISLAND = [[-123.4, 48.4], [-124.4, 48.5], [-125.2, 49.0], [-126.5, 49.8], [-127.9, 50.6], [-128.4, 50.85], [-127.2, 50.75], [-125.5, 50.2], [-123.9, 49.2]];
const FAULT = [[-124.9, 40.4], [-125.3, 41.5], [-125.4, 43.0], [-125.2, 44.5], [-125.0, 46.0], [-125.5, 47.5], [-126.6, 48.6], [-127.8, 49.5], [-129.0, 50.4]];
const CITIES = [['Seattle', -122.33, 47.61], ['Portland', -122.68, 45.52], ['Vancouver', -123.12, 49.28], ['Eugene', -123.09, 44.05], ['Victoria', -123.37, 48.43], ['Seaside', -123.93, 46.0]];
function ruptureAt(p) {
  const segs = []; let tot = 0;
  for (let i = 0; i < FAULT.length - 1; i++) { const l = Math.hypot(FAULT[i + 1][0] - FAULT[i][0], FAULT[i + 1][1] - FAULT[i][1]); segs.push(l); tot += l; }
  let d = p * tot; const pts = [FAULT[0]];
  for (let i = 0; i < segs.length; i++) {
    if (d >= segs[i]) { pts.push(FAULT[i + 1]); d -= segs[i]; } else { const f = d / segs[i]; pts.push([lerp(FAULT[i][0], FAULT[i + 1][0], f), lerp(FAULT[i][1], FAULT[i + 1][1], f)]); break; }
  }
  return pts;
}
function drawMap(T) {
  const W = mapCanvas.width, H = mapCanvas.height;
  const op = smooth((T - 8.6) / 0.7) * (1 - smooth((T - 18.8) / 0.6));
  mapCanvas.style.opacity = op;
  if (op <= 0.001) return;
  const pr = clamp((T - 9.9) / 8.2);
  const LON0 = -130.4, LON1 = -119.6, LAT0 = 40.0, LAT1 = 51.0, cosL = Math.cos((45.5 * Math.PI) / 180);
  const spanX = (LON1 - LON0) * cosL, spanY = LAT1 - LAT0;
  const mw = W * 0.9, scale = mw / spanX, mh = spanY * scale, ox = (W - mw) / 2, oy = H * 0.08;
  const px = (lon) => ox + (lon - LON0) * cosL * scale, py = (lat) => oy + (LAT1 - lat) * scale;
  mctx.clearRect(0, 0, W, H);
  const bg = mctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(9,12,18,1)'); bg.addColorStop(0.55, 'rgba(9,12,18,.97)'); bg.addColorStop(0.8, 'rgba(9,12,18,.6)'); bg.addColorStop(1, 'rgba(9,12,18,.38)');
  mctx.fillStyle = bg; mctx.fillRect(0, 0, W, H);
  mctx.save();
  mctx.beginPath(); mctx.rect(ox, oy, mw, mh); mctx.clip();
  mctx.fillStyle = '#0d1a2a'; mctx.fillRect(ox, oy, mw, mh);
  mctx.strokeStyle = 'rgba(120,150,190,.08)'; mctx.lineWidth = 1 * DPR;
  for (let lon = -130; lon <= -120; lon += 2) { mctx.beginPath(); mctx.moveTo(px(lon), oy); mctx.lineTo(px(lon), oy + mh); mctx.stroke(); }
  for (let lat = 41; lat <= 50; lat += 2) { mctx.beginPath(); mctx.moveTo(ox, py(lat)); mctx.lineTo(ox + mw, py(lat)); mctx.stroke(); }
  for (const poly of [LAND, ISLAND]) {
    mctx.beginPath(); poly.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la)))); mctx.closePath();
    mctx.fillStyle = '#1a2230'; mctx.fill(); mctx.strokeStyle = 'rgba(170,190,215,.5)'; mctx.lineWidth = 1.2 * DPR; mctx.stroke();
  }
  mctx.beginPath(); FAULT.forEach(([lo, la], i) => (i ? mctx.lineTo(px(lo), py(la)) : mctx.moveTo(px(lo), py(la))));
  mctx.strokeStyle = 'rgba(255,120,80,.5)'; mctx.lineWidth = 1.6 * DPR; mctx.stroke();
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
  const bx = px(FAULT[0][0]), by = py(FAULT[0][1]);
  mctx.fillStyle = '#ff6a2a'; mctx.beginPath(); mctx.arc(bx, by, 5 * DPR * (1 + 0.2 * Math.sin(T * 7)), 0, Math.PI * 2); mctx.fill();
  mctx.restore();
  mctx.font = `600 ${9.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  for (const [name, lo, la] of CITIES) {
    const x = px(lo), y = py(la), se = name === 'Seaside', hit = se && pr > 0.5;
    mctx.fillStyle = hit ? '#ff4a2a' : 'rgba(205,218,235,.75)';
    mctx.beginPath(); mctx.arc(x, y, (se ? 4.2 : 2.8) * DPR * (hit ? 1 + 0.25 * Math.sin(T * 12) : 1), 0, Math.PI * 2); mctx.fill();
    mctx.fillStyle = hit ? 'rgba(255,220,200,.98)' : 'rgba(205,218,235,.6)'; mctx.textAlign = se ? 'right' : 'left';
    mctx.fillText(name.toUpperCase(), se ? x - 7 * DPR : x + 7 * DPR, y + 3 * DPR);
  }
  mctx.textAlign = 'left';
  mctx.fillStyle = 'rgba(255,150,100,.8)'; mctx.font = `700 ${10 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  mctx.fillText('CASCADIA SUBDUCTION ZONE', px(-129.6), py(43.0));
  mctx.fillStyle = 'rgba(244,239,230,.5)'; mctx.font = `600 ${9.5 * DPR}px "Helvetica Neue", Arial, "Liberation Sans", sans-serif`;
  mctx.fillText('RUPTURE SCENARIO: MAGNITUDE 9', ox, oy - 12 * DPR);
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
  { a: 0.6, b: 4.8, label: 'Local time', value: (k, T) => `4:52:${String(10 + Math.floor(T)).padStart(2, '0')} PM`, sub: () => 'Seaside, Oregon' },
  { a: 4.8, b: 9.0, label: 'Last full rupture', value: () => 'Jan. 26, 1700', sub: () => '326 years of stored strain' },
  { a: 9.0, b: 19.0, label: 'Rupture length', value: (k, T) => `${Math.round(600 * clamp((T - 9.9) / 8.2))} mi`, sub: () => 'Seafloor unzipping' },
  { a: 19.2, b: 22.0, label: 'Seconds until shaking', value: (k) => `${Math.max(0, Math.ceil(3 - 3 * k))}`, sub: () => 'Earthquake early warning' },
  { a: 22.0, b: 37.0, label: 'Shaking duration', value: (k) => mmss(270 * smooth(k)), sub: () => 'Magnitude 9, up to 5 minutes' },
  { a: 37.0, b: 44.0, label: 'Coastal land drops', value: (k) => `${(6 * smooth(k)).toFixed(1)} ft`, sub: () => 'Up to 6 feet in places' },
  { a: 44.0, b: 50.0, label: 'Time since the quake', value: (k) => mmss(300 + 540 * smooth(k)), sub: () => 'First wave: ~15 minutes' },
  { a: 50.0, b: 57.6, label: 'Wave height at shore', value: (k) => `${Math.round(30 * smooth(k))} ft`, sub: () => 'Worst-case scenarios exceed 80 ft' },
];
const CAPS = [
  [1.0, 4.6, 'Millions of people live in the shadow of the Cascadia Subduction Zone.'],
  [5.0, 8.8, 'It last ruptured in 1700. The tsunami was recorded in Japan.'],
  [9.3, 13.2, 'Two tectonic plates have been locked together for centuries.'],
  [13.5, 18.8, 'Then 600 miles of seafloor unzips.'],
  [19.3, 21.9, 'Your phone buzzes. You have seconds.'],
  [22.3, 27.0, 'Magnitude 9. The shaking lasts for minutes.'],
  [27.4, 31.8, 'Older buildings fail first.'],
  [32.3, 36.6, 'Then the shaking stops.'],
  [37.2, 43.5, 'The coast has dropped. And the ocean pulls away.'],
  [44.0, 49.5, 'You have about 15 minutes to reach high ground.'],
  [50.0, 57.0, 'Then the wave arrives.'],
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
  if (T >= 5.4 && T < 8.9) { ao = smooth((T - 5.4) / 0.35) * (1 - smooth((T - 8.5) / 0.4)); aTitle.textContent = 'EARTHQUAKE ALERT'; aBody.textContent = 'Magnitude 9 earthquake detected offshore. Strong shaking expected. A tsunami warning will follow.'; }
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
  const skip3D = T > 58.9 || (T >= 9.3 && T < 18.6 && fi % 3 !== 0);
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
window.dbg = { scene, camera, renderer, sun, composer, bloom, warp, smoke, buildings, people, cars };
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
