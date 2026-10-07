import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* ------------------------------------------------------------------ *
 *  "What if the dinosaur-killing asteroid hit today?"  — deterministic 62s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 *
 *  Setting: first person, walking an avenue in Manhattan; the asteroid hits ~35 km away.
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
    sunAmt: { value: 1 }, cloudAmt: { value: 1 }, time: { value: 0 },
  },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 top, hor, sunDir, sunCol; uniform float sunAmt, cloudAmt, time; varying vec3 vP;
    float ch(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float cnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(ch(i), ch(i+vec2(1,0)), f.x), mix(ch(i+vec2(0,1)), ch(i+vec2(1,1)), f.x), f.y); }
    void main(){
      float h = clamp(vP.y, 0.0, 1.0);
      vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.42, h), 0.55));
      vec2 cu = vP.xz / (vP.y + 0.12) * 0.55;
      float cn = cnoise(cu * 1.3 + vec2(time * 0.004, 0.0)) * 0.55 + cnoise(cu * 2.7 + 7.0) * 0.3 + cnoise(cu * 6.1 + 3.0) * 0.15;
      float cm = smoothstep(0.5, 0.78, cn) * smoothstep(0.02, 0.2, vP.y) * cloudAmt;
      vec3 ccol = mix(vec3(0.62,0.64,0.7), vec3(1.0,0.95,0.86), clamp(0.55 + (0.3 - cn) * 1.4, 0.0, 1.0));
      c = mix(c, ccol * (0.85 + 0.3 * pow(max(dot(normalize(vP), sunDir), 0.0), 3.0)), cm * 0.85);
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
const smokeMat = new THREE.MeshBasicMaterial({ map: puffTex, transparent: true, depthWrite: false, fog: false });
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
 *  First person, walking an avenue in Manhattan (2,600 km from the impact)
 * ------------------------------------------------------------------ */
const fmod = (a, n) => ((a % n) + n) % n;
const NO_SHADOW = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x7a6a58, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8c0, 3);
sun.target.position.set(0, 0, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(+(P.get('shadow') ?? 2048), +(P.get('shadow') ?? 2048));
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 120, bottom: -120, near: 1, far: 1700 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 650, cy * 650, -60 + cz * 650);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}
const [concreteImg] = await Promise.all([new Promise((res) => new THREE.TextureLoader().load('../assets/brick_diffuse.jpg', (t) => res(t), undefined, () => res(null)))]);

/* ---------- facades (reused generators) ---------- */
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


/* ---------- road, sidewalks, crosswalks ---------- */
const AVE = 13, WALKW = 6, DEPTH = 26;
const INTS = [-34, -116, -198, -280, -362, -444, -526, -608, -690, -772];
const roadTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(8);
  x.fillStyle = '#3b3b40'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) { const v = 44 + r() * 40; x.fillStyle = `rgb(${v},${v},${v + 3})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  for (let i = 0; i < 20; i++) { x.strokeStyle = 'rgba(8,8,8,.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(r() * 256, r() * 256); x.lineTo(r() * 256, r() * 256); x.stroke(); }
  x.fillStyle = '#e6c03a'; x.fillRect(125, 0, 3, 256); x.fillRect(131, 0, 3, 256);
  x.fillStyle = 'rgba(235,235,235,.85)'; for (const lx of [64, 192]) for (let k = 0; k < 2; k++) x.fillRect(lx - 1, k * 128 + 10, 3, 54);
  const t = toTex(c); t.repeat.set(1, 56); return t;
})();
const walkTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(9);
  x.fillStyle = '#a9a69f'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) { const v = 140 + r() * 50; x.fillStyle = `rgba(${v},${v - 2},${v - 6},.7)`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  x.strokeStyle = 'rgba(60,58,54,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke();
  const t = toTex(c); t.repeat.set(WALKW / 2, 120); return t;
})();
const zebraTex = (() => {
  const c = mkCanvas(256, 64), x = c.getContext('2d'); x.clearRect(0, 0, 256, 64);
  x.fillStyle = 'rgba(236,236,230,.92)'; for (let i = 0; i < 13; i++) x.fillRect(i * 20 + 4, 0, 11, 64);
  return toTex(c);
})();
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: 0x55565a })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(AVE * 2, 1100), new THREE.MeshLambertMaterial({ map: roadTex })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -420); road.receiveShadow = true; scene.add(road);
  for (const sx of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(WALKW, 0.16, 1100), new THREE.MeshLambertMaterial({ map: walkTex })); sw.position.set(sx * (AVE + WALKW / 2), 0.08, -420); sw.receiveShadow = true; scene.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 1100), new THREE.MeshLambertMaterial({ color: 0xb8b4aa })); curb.position.set(sx * (AVE + 0.05), 0.1, -420); scene.add(curb);
  }
  for (const z0 of INTS) {
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(240, 18), new THREE.MeshLambertMaterial({ map: roadTex.clone() })); cs.material.map.repeat.set(1, 1); cs.rotation.x = -Math.PI / 2; cs.rotation.z = Math.PI / 2; cs.position.set(0, 0.03, z0); cs.receiveShadow = true; scene.add(cs);
    for (const dz of [-11.4, 11.4]) { const zb = new THREE.Mesh(new THREE.PlaneGeometry(AVE * 2, 4), new THREE.MeshBasicMaterial({ map: zebraTex, transparent: true, depthWrite: false })); zb.rotation.x = -Math.PI / 2; zb.position.set(0, 0.045, z0 + dz); scene.add(zb); }
  }
}

/* ---------- buildings: tall NYC blocks ---------- */
const glassTexN = [makeGlassTile(41), makeGlassTile(42)];
const glassMatsN = glassTexN.map((t) => new THREE.MeshLambertMaterial({ map: t }));
const NYC_FAC = [0, 1, 2, 3, 4, 7, 9, 11].map((i) => facadeMats[i]);
const buildings = [];
const FARTOW = [];
const SHEDS = [];
{
  const r = rng(212);
  const seg = (a, b) => ({ a, b });
  const segs = []; let zc = 60;
  for (const z0 of INTS) { segs.push(seg(zc, z0 + 9)); zc = z0 - 9; }
  segs.push(seg(zc, zc - 82));
  for (const side of [-1, 1]) for (const sg of segs) {
    let z = sg.a;
    while (z - 14 > sg.b) {
      const dz = Math.min(z - sg.b, 14 + Math.floor(r() * 4) * 3 + r() * 4);
      if (dz < 10) break;
      const zcn = z - dz / 2, near = zcn > -300;
      const floors = near ? 6 + Math.floor(r() * 16) : 10 + Math.floor(r() * 24);
      const glass = r() < 0.22 && floors > 12, brickIdx = Math.floor(r() * NYC_FAC.length);
      const g = new THREE.Group(), hh = floors * 3.4, setback = floors > 16;
      const x = side * (AVE + WALKW + DEPTH / 2);
      const shop = texBox(DEPTH, SHOP_H, dz, shopMats[Math.floor(r() * 4)], roofMat, TILE_W, SHOP_H); shop.position.y = SHOP_H / 2; g.add(shop);
      const lowH = setback ? hh * 0.7 : hh;
      const up = texBox(DEPTH, lowH, dz, glass ? glassMatsN[Math.floor(r() * 2)] : NYC_FAC[brickIdx], roofMat, glass ? 12 : TILE_W, glass ? 12 : TILE_H); up.position.y = SHOP_H + lowH / 2; g.add(up);
      if (setback) { const up2 = texBox(DEPTH * 0.7, hh - lowH, dz * 0.82, glass ? glassMatsN[0] : NYC_FAC[brickIdx], roofMat, glass ? 12 : TILE_W, glass ? 12 : TILE_H); up2.position.set(-side * DEPTH * 0.13, SHOP_H + lowH + (hh - lowH) / 2, 0); g.add(up2); }
      const top = SHOP_H + hh;
      const cor = new THREE.Mesh(new THREE.BoxGeometry(DEPTH + 0.8, 0.8, dz + 0.8), stoneMat); cor.position.y = SHOP_H + lowH + 0.4; cor.castShadow = true; g.add(cor);
      if (r() < 0.45) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 3.4, 10), tankMat); tk.position.set((r() - 0.5) * 8, top + 2.4, (r() - 0.5) * dz * 0.5); tk.castShadow = true; g.add(tk); const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 10), tankMat); cap.position.copy(tk.position); cap.position.y += 2.3; g.add(cap); }
      g.position.set(x, 0, zcn); scene.add(g);
      const b = { g, x, z: zcn, w: DEPTH, d: dz, h: top, side, brick: !glass, seed: r() * 6.28, lowH, glass };
      buildings.push(b);
      z -= dz + (r() < 0.12 ? 2 + r() * 3 : 0);
    }
  }
  // far downtown towers closing the avenue
  const gm = new THREE.MeshLambertMaterial({ map: glassTexN[1] });
  for (let i = 0; i < 26; i++) { const w = 28 + r() * 26, h = 120 + r() * 220, d = 28 + r() * 26; const m = texBox(w, h, d, gm, roofMat, 12, 12); m.position.set((r() - 0.5) * 360, h / 2, -900 - r() * 700); scene.add(m); FARTOW.push({ m, h, seed: r() }); }
  // the older brick buildings that shed their facade
  for (const b of buildings) if (b.z < 40 && b.z > -420) SHEDS.push(b);
}
/* ---------- street furniture ---------- */
const lampMat = new THREE.MeshLambertMaterial({ color: 0x2e3336 });
const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 8, 8); poleGeo.translate(0, 4, 0);
const SIGNALS = [];
for (let z = 30; z > -820; z -= 30) for (const sx of [-1, 1]) { const m = new THREE.Mesh(poleGeo, lampMat); m.position.set(sx * (AVE + 0.6), 0.16, z); m.castShadow = true; scene.add(m); const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), lampMat); arm.position.set(-sx * 1.3, 7.6, 0); m.add(arm); const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.35), new THREE.MeshBasicMaterial({ color: 0xe8e6da })); head.position.set(-sx * 2.5, 7.55, 0); m.add(head); }
const sigG = new THREE.BoxGeometry(0.4, 1.1, 0.35);
for (const z0 of INTS) for (const sx of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 8), lampMat); post.position.set(sx * (AVE + 1.0), 1.9, z0 + 11); scene.add(post);
  const box = new THREE.Mesh(sigG, lampMat); box.position.set(sx * (AVE + 1.0), 4.0, z0 + 11); scene.add(box);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0x35e07a })); lamp.position.set(sx * (AVE + 1.0), 4.2, z0 + 10.8); scene.add(lamp); SIGNALS.push({ lamp, z0, sx });
}
{ // hydrants, trash cans, newsstands, subway rails
  const r = rng(77), hyd = new THREE.CylinderGeometry(0.18, 0.2, 0.7, 10), hm = new THREE.MeshLambertMaterial({ color: 0xc4261d }), tcm = new THREE.MeshLambertMaterial({ color: 0x2f4a3a });
  for (let i = 0; i < 18; i++) { const side = r() < 0.5 ? -1 : 1, z = 20 - r() * 700; const h = new THREE.Mesh(hyd, hm); h.position.set(side * (AVE + 0.9), 0.5, z); h.castShadow = true; scene.add(h); }
  for (let i = 0; i < 26; i++) { const side = r() < 0.5 ? -1 : 1, z = 25 - r() * 700; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.95, 10), tcm); t.position.set(side * (AVE + 1.5 + r() * 1.5), 0.62, z); t.castShadow = true; scene.add(t); }
}
const steam = { x: 5.5, z: -150 };
{ const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.62 - k * 0.02, 0.72 - k * 0.02, 0.5, 14), new THREE.MeshLambertMaterial({ color: k % 2 ? 0xf2f0ea : 0xe8741f })); s.position.y = 0.25 + k * 0.5; g.add(s); } g.position.set(steam.x, 0.02, steam.z); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g); }
/* ---------- billboards (the one digital thing you see: they black out at the first tremor) ---------- */
const adCanvas = mkCanvas(512, 256), adCtx = adCanvas.getContext('2d');
const adTex = new THREE.CanvasTexture(adCanvas); adTex.colorSpace = THREE.SRGBColorSpace;
const adMat = new THREE.MeshBasicMaterial({ map: adTex });
const ADS = ['NEW YORK', 'WATCH LIVE', 'SALE 50%', 'BROADWAY', 'FRESH', 'GO'];
const adMeshes = [];
for (const b of buildings.filter((q) => q.z < 10 && q.z > -330 && q.h > 35).filter((q, i) => i % 5 === 0).slice(0, 9)) { const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), adMat); m.position.set(b.x - b.side * (DEPTH / 2 + 0.2), 12 + (b.seed % 1) * 10, b.z); m.rotation.y = -b.side * Math.PI / 2; scene.add(m); adMeshes.push(m); }
function drawAd(T) {
  const W = 512, H = 256, dead = T > 14.4;
  if (dead) { adCtx.fillStyle = '#0b0b0d'; adCtx.fillRect(0, 0, W, H); }
  else { const k = Math.floor(T * 0.8), ph = (T * 0.8) % 1, hue = (k * 67) % 360; const g = adCtx.createLinearGradient(0, 0, W, H); g.addColorStop(0, `hsl(${hue},85%,55%)`); g.addColorStop(1, `hsl(${(hue + 50) % 360},90%,40%)`); adCtx.fillStyle = g; adCtx.fillRect(0, 0, W, H); adCtx.fillStyle = '#fff'; adCtx.font = '700 70px "Helvetica Neue", Arial, "Liberation Sans", sans-serif'; adCtx.textAlign = 'center'; adCtx.fillText(ADS[k % ADS.length], W / 2 + (1 - smooth(ph * 3)) * 40, H / 2 + 24); }
  adTex.needsUpdate = true;
}

/* ---------- vehicles ---------- */
const cars = [];
{
  const r = rng(61), cols = [0xf6c30e, 0xf6c30e, 0xf6c30e, 0xf6c30e, 0x1a1a1c, 0xd9d9d3, 0x2b4a86, 0x8a1f24, 0xc8cacc, 0x25282c];
  const bodyG = new THREE.BoxGeometry(1.9, 0.78, 4.7); bodyG.translate(0, 0.66, 0); const cabG = new THREE.BoxGeometry(1.7, 0.72, 2.5); cabG.translate(0, 1.38, -0.1);
  const glassM = new THREE.MeshLambertMaterial({ color: 0x1b2430 }), wheelG = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12), wheelM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (let i = 0; i < 40; i++) {
    const col = cols[Math.floor(r() * cols.length)], g = new THREE.Group(), body = new THREE.Mesh(bodyG, new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.2 })), cab = new THREE.Mesh(cabG, glassM);
    body.castShadow = cab.castShadow = true; g.add(body, cab);
    for (const [wx, wz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) { const w = new THREE.Mesh(wheelG, wheelM); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w); }
    if (col === 0xf6c30e) { const sg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.28), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); sg.position.set(0, 1.84, -0.1); g.add(sg); }
    scene.add(g);
    const dir = i % 2 ? 1 : -1, lane = dir > 0 ? (r() < 0.5 ? 3.6 : 9.4) : (r() < 0.5 ? -3.6 : -9.4);
    cars.push({ g, dir, lane, z0: 30 - r() * 760, v: 7 + r() * 5, i, col, slide: r() < 0.5 ? -1 : 1, burn: i % 4 === 1 ? 49 + r() * 5 : null });
  }
}
/* ---------- pedestrians ---------- */

/* ---------- pedestrians: jointed humans (tapered limbs, bending knees and elbows) ---------- */
const H_SKIN = [0xe3b895, 0xc89b7b, 0x8a5a3a, 0xf0c9a8, 0x6e4630, 0xd8a47c].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const H_HAIR = [0x1b1410, 0x3a2616, 0x8a6a3a, 0xc9b27a, 0x777777, 0x0e0c0a].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const H_TOP = [0x1f2a3a, 0x2c2c30, 0x6b2b2b, 0xd8d4c8, 0x3c5a7a, 0x4a5a3a, 0xb8782a, 0x2a2a2a, 0x7a6a8a, 0xa8b0b8].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const H_PANT = [0x1c2434, 0x2a2a2e, 0x4a4036, 0x5a6270, 0x161616, 0x6a5a48].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const H_SHOE = [0x1a1a1a, 0xe8e6e0, 0x3a2a20].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const GEO = {
  thigh: new THREE.CapsuleGeometry(0.082, 0.34, 4, 10), shin: new THREE.CapsuleGeometry(0.062, 0.34, 4, 10), foot: new THREE.BoxGeometry(0.1, 0.075, 0.27),
  torso: new THREE.CapsuleGeometry(0.15, 0.26, 4, 12), pelvis: new THREE.CapsuleGeometry(0.15, 0.06, 4, 12), uarm: new THREE.CapsuleGeometry(0.048, 0.24, 4, 8), farm: new THREE.CapsuleGeometry(0.04, 0.22, 4, 8),
  hand: new THREE.SphereGeometry(0.043, 8, 6), head: new THREE.SphereGeometry(0.105, 14, 12), hair: new THREE.SphereGeometry(0.112, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), neck: new THREE.CylinderGeometry(0.05, 0.056, 0.1, 8),
  coat: new THREE.CylinderGeometry(0.17, 0.25, 0.55, 14, 1, true), pack: new THREE.BoxGeometry(0.3, 0.38, 0.14), bag: new THREE.BoxGeometry(0.28, 0.2, 0.1), glasses: new THREE.BoxGeometry(0.16, 0.035, 0.03),
};
function makeHuman(r) {
  const g = new THREE.Group(), pick = (a) => a[Math.floor(r() * a.length)];
  const skin = pick(H_SKIN), hair = pick(H_HAIR), top = pick(H_TOP), pant = pick(H_PANT), shoe = pick(H_SHOE), sleeveSkin = r() < 0.22, coat = r() < 0.34;
  const mk = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const hips = new THREE.Group(); hips.position.y = 0.94; g.add(hips);
  mk(GEO.pelvis, pant, 0, 0.0, 0, hips).scale.set(1.05, 1, 0.75);
  const torso = mk(GEO.torso, top, 0, 0.3, 0, hips); torso.scale.set(1.12, 1, 0.72);
  if (coat) { const c = mk(GEO.coat, top, 0, -0.1, 0, hips); c.scale.set(1, 1, 0.8); c.material = top.clone(); c.material.side = THREE.DoubleSide; }
  mk(GEO.neck, skin, 0, 0.62, 0, hips); const head = mk(GEO.head, skin, 0, 0.74, 0.01, hips); head.scale.set(0.9, 1.08, 1);
  const hr = mk(GEO.hair, hair, 0, 0.76, -0.005, hips); hr.rotation.x = -0.2; hr.scale.set(0.95, 1.05, 1.02);
  if (r() < 0.3) mk(GEO.glasses, new THREE.MeshLambertMaterial({ color: 0x111111 }), 0, 0.75, 0.098, hips);
  if (r() < 0.32) { const pk = mk(GEO.pack, pick(H_TOP), 0, 0.3, -0.16, hips); }
  else if (r() < 0.3) { const bg = mk(GEO.bag, pick(H_SHOE), 0.22, -0.05, 0.02, hips); }
  const leg = (sx) => {
    const th = new THREE.Group(); th.position.set(sx * 0.095, 0, 0); hips.add(th);
    mk(GEO.thigh, pant, 0, -0.2, 0, th);
    const sh = new THREE.Group(); sh.position.set(0, -0.4, 0); th.add(sh);
    mk(GEO.shin, pant, 0, -0.2, 0, sh); mk(GEO.foot, shoe, 0, -0.42, 0.06, sh);
    return { th, sh };
  };
  const arm = (sx) => {
    const ua = new THREE.Group(); ua.position.set(sx * 0.2, 0.46, 0); hips.add(ua);
    mk(GEO.uarm, top, 0, -0.15, 0, ua);
    const fa = new THREE.Group(); fa.position.set(0, -0.3, 0); ua.add(fa);
    mk(GEO.farm, sleeveSkin ? skin : top, 0, -0.14, 0, fa); mk(GEO.hand, skin, 0, -0.29, 0, fa);
    return { ua, fa };
  };
  const L = leg(-1), R = leg(1), AL = arm(-1), AR = arm(1);
  if (r() < 0.28) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0xf4f1ea })); cup.position.set(0, -0.32, 0.05); AR.fa.add(cup); AR.hold = true; }
  const sc = 0.93 + r() * 0.12; g.scale.setScalar(sc);
  return { g, hips, L, R, AL, AR };
}
function poseHuman(h, ph, amp, panic, fall) {
  const s = Math.sin(ph), c = Math.cos(ph);
  h.L.th.rotation.x = -0.55 * amp * s; h.R.th.rotation.x = 0.55 * amp * s;
  h.L.sh.rotation.x = 0.9 * amp * Math.max(0, c); h.R.sh.rotation.x = 0.9 * amp * Math.max(0, -c);
  const swing = 0.45 * amp;
  h.AL.ua.rotation.set(swing * s * 1.0 * (1 - panic) - 1.5 * panic, 0, 0.06 + 0.4 * panic); h.AR.ua.rotation.set(-swing * s * (1 - panic) - 1.3 * panic, 0, -0.06 - 0.4 * panic);
  if (h.AR.hold) h.AR.ua.rotation.set(-0.5 * (1 - panic) - 1.3 * panic, 0, -0.06);
  h.AL.fa.rotation.x = -(0.25 + 0.25 * Math.max(0, -s)) * (1 - panic) - 0.5 * panic; h.AR.fa.rotation.x = -(0.25 + 0.25 * Math.max(0, s)) * (1 - panic) - 0.5 * panic - (h.AR.hold ? 1.2 * (1 - panic) : 0);
  h.hips.position.y = 0.94 + 0.022 * Math.abs(c) * amp; h.hips.rotation.y = 0.06 * s * amp; h.hips.rotation.x = 0.05 * amp;
}
const people = [];
{
  const r = rng(52);
  for (let i = 0; i < 64; i++) {
    const pr = makeHuman(r), g = pr.g; scene.add(g);
    const cross = i % 6 === 0, side = r() < 0.5 ? -1 : 1, ci = Math.floor(r() * 5);
    people.push({ g, h: pr, side, cross, z0: cross ? INTS[ci] + 11.4 + (r() - 0.5) * 2 : 14 - Math.pow(r(), 1.7) * 330, x0: cross ? (r() - 0.5) * 24 : side * (AVE + 1.8 + r() * 3.8), dirv: r() < 0.5 ? -1 : 1, sp: 1.0 + r() * 0.7, ph: r() * 6.28, fallT: 24.4 + r() * 3, fx: (r() - 0.5) * 1.6, runT: 31 + r() * 5, run: r() < 0.45 });
  }
}
/* ---------- the person we are: a hand with a coffee ---------- */
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
const hand = new THREE.Group(); camera.add(hand);
const skin = new THREE.MeshLambertMaterial({ color: 0xd2a285 });
const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0x2f3a4a })); sleeve.rotation.x = Math.PI / 2 - 0.35; sleeve.position.set(0.05, -0.13, 0.28); hand.add(sleeve);
const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.1, 10), skin); wrist.rotation.x = Math.PI / 2 - 0.3; wrist.position.set(0.03, -0.065, 0.0); hand.add(wrist);
const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.09), skin); palm.position.set(0.02, -0.03, -0.075); hand.add(palm);
for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.03, 4, 8), skin); fg.rotation.z = Math.PI / 2; fg.position.set(-0.04, 0.05 - f * 0.024, -0.14); fg.rotation.y = 0.5 - f * 0.1; hand.add(fg); }
const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 4, 8), skin); thumb.position.set(0.05, 0.06, -0.12); thumb.rotation.set(0.3, 0, 0.6); hand.add(thumb);
const mug = new THREE.Group();
{
  const cm = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.105, 18), cm); mug.add(body);
  const sleeveC = new THREE.Mesh(new THREE.CylinderGeometry(0.0415, 0.0365, 0.05, 18), new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 })); sleeveC.position.y = -0.01; mug.add(sleeveC);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.041, 0.012, 18), new THREE.MeshStandardMaterial({ color: 0x26211c, roughness: 0.5 })); lid.position.y = 0.058; mug.add(lid);
}
mug.position.set(-0.012, 0.03, -0.12); mug.scale.setScalar(0.95); hand.add(mug);
hand.position.set(0.19, -0.27, -0.5); hand.rotation.set(0.15, 0.2, -0.05);
const mugW = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.105, 14), new THREE.MeshLambertMaterial({ color: 0xf4f1ea })); mugW.visible = false; scene.add(mugW);
const CUPS = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03 + hash2(i, 5) * 0.03, 0.006, 0.025 + hash2(i, 6) * 0.03), new THREE.MeshLambertMaterial({ color: 0xf4f1ea })); m.visible = false; scene.add(m); return { m, vx: (hash2(i, 7) - 0.5) * 1.6, vz: (hash2(i, 8) - 0.5) * 1.6, vy: 0.6 + hash2(i, 9) * 1.2 }; });

/* ---------- falling glass + facade chunks + cracks ---------- */
const SHARDS_N = 1100, shards = [];
{
  const r = rng(808), pool = buildings.filter((b) => b.z < 40 && b.z > -420);
  for (let i = 0; i < SHARDS_N; i++) { const b = pool[Math.floor(r() * pool.length)]; shards.push({ b, t0: 23.5 + r() * 14, y0: 10 + r() * Math.min(60, b.h - 10), oz: (r() - 0.5) * b.d, s: 0.35 + r() * 0.8, spin: (r() - 0.5) * 9, drift: 0.5 + r() * 3 }); }
}
const shardMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xcfefff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), SHARDS_N);
shardMesh.frustumCulled = false; scene.add(shardMesh);
const CHUNK_N = SHEDS.length * 12, chunks = [];
{
  const r = rng(909); SHEDS.forEach((b, bi) => { for (let k = 0; k < 12; k++) chunks.push({ b, t0: 25.5 + bi * 1.1 + r() * 3, y0: Math.min(b.h, 14 + r() * 40), oz: (r() - 0.5) * b.d, sx: k < 3 ? 0.5 + r() * 0.4 : 0.1 + r() * 0.2, sy: k < 3 ? 0.3 + r() * 0.25 : 0.06 + r() * 0.12, sz: k < 3 ? 0.4 + r() * 0.3 : 0.1 + r() * 0.18, drift: 1 + r() * 9, spin: (r() - 0.5) * 8, col: r() < 0.65 ? 0x6b3226 : 0x8f8678 }); });
}
const chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), CHUNK_N);
chunkMesh.frustumCulled = false; chunkMesh.castShadow = true; scene.add(chunkMesh);
{ const c = new THREE.Color(); chunks.forEach((d, i) => chunkMesh.setColorAt(i, c.set(d.col).multiplyScalar(0.85 + hash2(i, 5) * 0.3))); }
const crackMat = new THREE.MeshBasicMaterial({ color: 0x0c0907 });
const cracks = [];
{
  const r = rng(321);
  for (const [x0, z0] of [[-12, -14], [-12, -48], [12, -86], [-12, -130], [12, -172]]) { let x = x0, z = z0; const dir = x0 < 0 ? 1 : -1; for (let k = 0; k < 9; k++) { const len = 2.6 + r() * 2.4, m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), crackMat); const dx = dir * len, dz = (r() - 0.5) * 3; m.position.set(x + dx / 2, 0.06, z + dz / 2); m.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; m.visible = false; scene.add(m); cracks.push({ m, len: Math.hypot(dx, dz), k, w: 0.05 + r() * 0.1 }); x += dx; z += dz; } }
}
const PIG_N = 180;
const pigeons = pointsLayer(PIG_N, 3, 0x2a2a2e, () => 0); pigeons.pts.material.sizeAttenuation = false; pigeons.pts.material.size = 2.8; pigeons.pts.material.fog = false;
const PIG = Array.from({ length: PIG_N }, (_, i) => ({ x: (hash2(i, 1) - 0.5) * 30, z: 6 - hash2(i, 2) * 150, vx: (hash2(i, 3) - 0.5) * 10, vz: -4 - hash2(i, 4) * 8, vy: 6 + hash2(i, 5) * 8, ph: hash2(i, 6) * 6 }));
// fires + embers once the sky heats up
const NBF = 22;
const BFIRE = Array.from({ length: NBF }, (_, i) => { const b = buildings.filter((q) => q.z < 0 && q.z > -360)[Math.floor(hash2(i, 31) * 60)] || buildings[i]; return { x: b.x - b.side * (DEPTH / 2 + 0.3), y: 6 + hash2(i, 32) * 30, z: b.z + (hash2(i, 33) - 0.5) * b.d, t0: 49.5 + hash2(i, 34) * 6, ph: hash2(i, 35) * 6.28 }; });
const bfGlow = pointsLayer(NBF, 16, 0xff6a20, () => 0); bfGlow.pts.material.blending = THREE.AdditiveBlending; bfGlow.pts.material.fog = false;
const carGlow = pointsLayer(cars.length, 12, 0xff7a24, () => 0); carGlow.pts.material.blending = THREE.AdditiveBlending; carGlow.pts.material.fog = false;
const EMB_N = 600;
const embers = pointsLayer(EMB_N, 1.1, 0xff8a30, () => 0); embers.pts.material.blending = THREE.AdditiveBlending; embers.pts.material.fog = false;
const EMB = Array.from({ length: EMB_N }, (_, i) => ({ x: (hash2(i, 11) - 0.5) * 50, z: 20 - hash2(i, 12) * 140, y0: hash2(i, 13) * 60, sp: 1 + hash2(i, 14) * 4, ph: hash2(i, 15) }));

/* ------------------------------------------------------------------ *
 *  Update (t = master time)
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
const SKY_H = [[0, 0xe9dcc4], [40, 0xe9dcc4], [46, 0xd8b890], [50, 0xd4651f], [56, 0xe5502a]];
const SKY_T = [[0, 0x4f8fd8], [40, 0x4f8fd8], [46, 0x6f7a9a], [50, 0x5a2a2a], [56, 0x3a1412]];
const T_IMP = 14.4, T_FR0 = 17.0, V_FRONT = 75, Z_FAR = -520;
const hitT = (z) => T_FR0 + (z - Z_FAR) / V_FRONT;
const NY_H = [[0, 0xe9dcc4], [12, 0xe9dcc4], [13.9, 0xfff6e4], [15.4, 0xffd9a0], [17, 0xe8742a], [24, 0xd4501c], [34, 0xc84010]];
const NY_T = [[0, 0x4f8fd8], [12, 0x4f8fd8], [13.9, 0xfff0d8], [15.4, 0xffb870], [17, 0xb0501c], [24, 0x6a2410], [34, 0x4a1c10]];
const RUB_PER = 7;
const rubMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), buildings.length * RUB_PER);
rubMesh.frustumCulled = false; rubMesh.castShadow = true; rubMesh.receiveShadow = true; scene.add(rubMesh);
const RUBD = buildings.map((b, bi) => Array.from({ length: RUB_PER }, (_, k) => ({ ox: (hash2(bi * 7 + k, 1) - 0.5) * b.w * 0.8, oz: (hash2(bi * 7 + k, 2) - 0.5) * b.d * 0.9, sx: 3 + hash2(bi * 7 + k, 3) * 6, sy: 0.7 + hash2(bi * 7 + k, 4) * 2.2 * (0.45 + Math.min(1, b.h / 110)), sz: 3 + hash2(bi * 7 + k, 5) * 7, ry: hash2(bi * 7 + k, 6) * 3.14 })));
{ const c = new THREE.Color(), cols = [0x3c3a38, 0x4a433c, 0x2e2c2b, 0x57493d, 0x6b3b2c]; for (let i = 0; i < buildings.length * RUB_PER; i++) rubMesh.setColorAt(i, c.set(cols[Math.floor(hash2(i, 9) * cols.length)])); }
const EJ_N = 1; const ejecta = { pts: { material: {} }, geo: { attributes: { position: {} } }, pos: [] };
let curT = 0;
function update(Tm) {
  pc = 0;
  const t = Tm;
  const hotK = smooth((t - 15.3) / 1.0);
  kfc(t, NY_H, horC); kfc(t, NY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.cloudAmt.value = kf(t, [[0, 0.9], [13, 0.8], [15, 0.2]]); skyMat.uniforms.time.value = t;
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [13, 1], [14.4, 3], [16, 0.2]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00045], [15, 0.0005], [24, 0.0008], [31, 0.0032]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [13.4, 1.0], [14.2, 1.7], [15.5, 1.1], [32, 1.1]]);
  setSun(kf(t, [[0, 52], [13, 50], [14.2, 62], [16, 40], [34, 20]]));
  sun.intensity = Math.PI * kf(t, [[0, 3.0], [12.5, 3.1], [14.2, 9.0], [15.3, 3.2], [17, 1.8], [34, 1.0]]);
  kfc(t, [[0, 0xfff0d0], [13, 0xffe6c0], [14.2, 0xffffff], [16, 0xff9a50], [24, 0xff6a30]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [13, 0.9], [14.2, 2.4], [16, 0.8], [34, 0.5]]);
  hemi.color.copy(horC).lerp(topC, 0.55); hemi.groundColor.set(0x6a6258);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.05], [16, 1.0], [30, 0.95]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [16, 1.08], [30, 1.12]]).toFixed(3)})`;

  /* the person: walks, stops to look up at the sky, flinches at the flash, is hit by the front */
  const walk = 1 - smooth((t - 9.6) / 0.9);
  const wz = lerp(26, 6.0, smooth(t / 10.4)), wx = 15.4 + Math.sin(t * 0.3) * 0.3 * walk;
  const hitC = smooth((t - hitT(6.0)) / 0.7);
  const flinch = smooth((t - 14.2) / 0.5) * (1 - smooth((t - 17.5) / 1.5));
  const bob = walk * 0.04 * Math.sin(t * 11.0) + (1 - walk) * 0.004 * Math.sin(t * 1.5);
  const sh = (a, b) => Math.sin(t * a + b);
  const E = 0.1 * smooth((t - 15.3) / 0.5) + 0.9 * smooth((t - hitT(14) + 1.0) / 1.2);
  rig.position.set(wx + E * 0.1 * (sh(17.3, 1) + 0.6 * sh(9.7, 2)), 1.7 - 0.55 * flinch + bob + E * 0.06 * sh(23.1, 4), wz + E * 0.08 * sh(13.7, 6) + 1.5 * hitC);
  rig.rotation.set(E * 0.03 * sh(7.7, 8) + 0.25 * flinch, E * 0.02 * sh(5.9, 9), E * 0.05 * sh(6.1, 10) + walk * 0.01 * Math.sin(t * 5.5));
  const yaw = kf(t, [[0, 6], [8, 3], [10, 8], [12.5, 14], [14.2, 18], [16, 6], [24, 1], [31, 0]]);
  const pitch = kf(t, [[0, 1], [8.6, 3], [10.2, 20], [12.5, 30], [14.2, 36], [15.8, -6], [17, 2], [26, 3], [32, 6]]);
  camera.position.set(0, 0, 0); camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(pitch) + 0.002 * sh(1.3, 1) + E * 0.03 * sh(14, 2), THREE.MathUtils.degToRad(yaw) + 0.003 * sh(0.8, 2) + E * 0.03 * sh(11, 4), 0.002 * sh(1.1, 3));
  const fov = kf(t, [[0, 66], [34, 66]]); if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);
  const dropT = 14.55, held = t < dropT;
  mug.visible = held;
  hand.position.set(0.19 + 0.012 * Math.sin(t * 11.0) * walk, -0.27 + 0.014 * Math.sin(t * 11.0 + 1) * walk - kf(t, [[14.2, 0], [14.9, 0.1], [17, 0.2]]) + 0.1 * flinch, -0.5 + 0.12 * flinch);
  hand.rotation.set(0.15 + kf(t, [[14.2, 0], [15, -0.5]]), 0.2, -0.05 + kf(t, [[14.2, 0], [15, 0.5]]));
  if (held) for (let q = 0; q < 3; q++) { const ph = fmod(t * 0.9 + q / 3, 1), wp = new THREE.Vector3(0.0, 0.08 + ph * 0.16, 0); mug.localToWorld(wp); addPuff(wp.x, wp.y, wp.z, 0.04 + ph * 0.06, q, 1, 1, 1, 0.15 * (1 - ph) * smooth(t / 1.0)); }
  if (t >= dropT) {
    const s = t - dropT, x0 = rig.position.x + 0.2, z0 = rig.position.z - 0.5, y0 = 1.3, g = 0.2;
    const y = y0 - 4.9 * s * s, hit = y <= g, sT = Math.sqrt(Math.max(0, (y0 - g) / 4.9));
    mugW.visible = !hit && t < hitT(6); mugW.position.set(x0, Math.max(g, y), z0); mugW.rotation.set(s * 3, 0, s * 4);
    CUPS.forEach((c) => { c.m.visible = hit && t < hitT(6); if (hit) { const u = s - sT; c.m.position.set(x0 + c.vx * Math.min(u, 0.5) * 0.7, 0.19 + Math.max(0, c.vy * u - 4.9 * u * u) * 0.25, z0 + c.vz * Math.min(u, 0.5) * 0.7); c.m.rotation.set(0, c.vx * 3, 0); } });
  } else { mugW.visible = false; CUPS.forEach((c) => { c.m.visible = false; }); }
  drawAd(Tm);
  for (const s of SIGNALS) { const ph = fmod(t * 0.12 + s.z0 * 0.01, 1); s.lamp.material.color.set(t > 14.4 ? 0x1a1a1a : ph < 0.55 ? 0x35e07a : ph < 0.65 ? 0xf1c232 : 0xe03a3a); }

  /* the descent: a bright streak crossing the strip of sky above the avenue (about 7 real seconds) */
  if (t > 7.4 && t < 14.5) {
    const u = (t - 7.6) / 6.8, A = [-90, 520, -420], B = [-30, 60, -260];
    for (let k = 0; k < 40; k++) {
      const uu = u - k * 0.014; if (uu < 0) break;
      const x = lerp(A[0], B[0], uu * uu), y = lerp(A[1], B[1], uu * uu), z = lerp(A[2], B[2], uu * uu), f = k / 40;
      addPuff(x, y, z, (10 + k * 1.6) * (0.6 + 1.6 * uu), k, 5.0 - f * 3.4, 3.6 - f * 2.6, 2.4 - f * 1.8, (1.0 - f * 0.8) * clamp((t - 7.6) / 0.4));
    }
    addPuff(lerp(A[0], B[0], u * u), lerp(A[1], B[1], u * u), lerp(A[2], B[2], u * u), 40 + 380 * u * u * u, 0, 8, 7, 6, 1.0);
  }

  /* buildings: untouched, then the front strips and collapses them */
  let nb = 0;
  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi], hT = hitT(b.z), pr = (t - hT) / 1.7, p = smooth(pr), q = Math.pow(p, 1.1);
    b.g.visible = p < 0.985;
    b.g.scale.set(1 + 0.12 * q, Math.max(0.03, 1 - 0.97 * q), 1 + 0.12 * q); b.g.rotation.set(0.12 * q * Math.sin(b.seed * 3), 0, b.side * 0.34 * q * (0.5 + 0.5 * Math.sin(b.seed * 5))); b.g.position.x = b.x - b.side * 3.0 * q; b.g.position.y = -0.5 * q;
    for (let k = 0; k < RUB_PER; k++) { const d = RUBD[bi][k], s = smooth((p - 0.2) / 0.7); dummy.position.set(b.x + d.ox, 0.5 * d.sy * s, b.z + d.oz); dummy.scale.set(Math.max(0.001, d.sx * s), Math.max(0.001, d.sy * s), Math.max(0.001, d.sz * s)); dummy.rotation.set(0, d.ry, 0); dummy.updateMatrix(); rubMesh.setMatrixAt(bi * RUB_PER + k, dummy.matrix); }
    if (b.z > -420 && b.z < 40 && nb < 70 && t > hT - 0.1 && t < hT + 14) { nb++; const sT = t - hT, a = 0.5 * Math.exp(-sT * 0.22) * clamp(sT * 3); for (let k = 0; k < 11; k++) { const hx = hash2(nb * 9 + k, 1) - 0.5, hh = hash2(nb * 9 + k, 3); const fire = k < 5 && sT > 0.5; addPuff(b.x - b.side * (b.w / 2 + hx * 14), 2 + hh * b.h * 0.5 * (1 - 0.6 * q) + sT * (fire ? 3.2 : 2.2), b.z + (hash2(nb * 9 + k, 2) - 0.5) * b.d, (fire ? 7 : 8) + hh * 10 + sT * (fire ? 3 : 5), hx * 3, fire ? 1.7 : 0.62, fire ? 0.62 : 0.55, fire ? 0.2 : 0.48, fire ? 0.7 * Math.min(1, sT / 1.2) : a); } }
  }
  rubMesh.instanceMatrix.needsUpdate = true; if (rubMesh.instanceColor) rubMesh.instanceColor.needsUpdate = true;
  for (const f of FARTOW) { const p = smooth((t - 17.0 - f.seed * 1.8) / 1.6); f.m.visible = p < 0.985; f.m.scale.set(1 + 0.1 * p, Math.max(0.03, 1 - 0.97 * p), 1 + 0.1 * p); f.m.position.y = f.h / 2 * (1 - 0.97 * p); if (p > 0.1 && p < 1) addPuff(f.m.position.x, 10 + f.h * 0.3 * (1 - p), f.m.position.z, 60 + f.seed * 40, f.seed * 4, 0.62, 0.5, 0.42, 0.45 * (1 - p * 0.4)); }
  /* vehicles: brake at the flash, ignite in the heat, are thrown by the front */
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i], tb = 14.0, drive = t < tb ? t : tb + 0.7 * (1 - Math.exp(-(t - tb) / 0.7));
    let z = fmod(c.z0 + c.dir * c.v * drive + 760, 800) - 760 + 40, x = c.lane, y = 0.05, yaw = c.dir > 0 ? Math.PI : 0, rx = 0, rz = 0;
    const s = Math.max(0, t - hitT(z));
    if (s > 0) { const lv = 22 + (c.i % 5) * 4; z += lv * Math.min(s, 1.6) + 0.5 * lv * Math.max(0, s - 1.6) * 0.0; x += c.slide * (3 + c.i % 4) * Math.min(s, 2); y += Math.max(0, 7 * s - 4.9 * s * s * 0.9); rx = s * 2.2 * c.slide; rz = s * 1.4; yaw += s * 1.6 * c.slide; }
    c.g.position.set(x, y, z); c.g.rotation.set(rx, yaw, rz);
    const ig = c.i % 3 === 0 ? 17.0 + (c.i % 7) * 0.3 : null, burn = ig === null ? 0 : smooth((t - ig) / 0.8);
    if (burn > 0.02) {
      carGlow.pos[i * 3] = x; carGlow.pos[i * 3 + 1] = y + 1.6; carGlow.pos[i * 3 + 2] = z;
      const fl = 0.8 + 0.2 * Math.sin(t * 19 + c.i * 5);
      for (let q = 0; q < 5; q++) { const u = q / 5; addPuff(x + Math.sin(t * 0.8 + c.i + q) * 0.8 + q * 0.8, y + 1.6 + q * 3.2, z + Math.cos(t * 0.7 + q) * 0.6, 2.2 + q * 2.4, c.i + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.45 * fl : 0.34 * (1 - u * 0.7)) * burn); }
    } else carGlow.pos[i * 3 + 1] = -60;
  }
  carGlow.geo.attributes.position.needsUpdate = true; carGlow.pts.material.opacity = 0.9;
  /* pedestrians: stop and look up, flinch at the flash, are knocked down by the front */
  for (const p of people) {
    const tt = Math.min(t, 10.0 + p.ph * 0.3);
    let x, z, face;
    if (p.cross) { x = fmod(p.x0 + p.dirv * p.sp * tt + 13, 26) - 13; z = p.z0; face = p.dirv > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = p.x0; z = fmod(p.z0 + p.dirv * p.sp * tt + 340, 360) - 340 + 30; face = p.dirv > 0 ? Math.PI : 0; }
    const moving = t < 10.0 + p.ph * 0.3, s = Math.max(0, t - hitT(z)), f = smooth(s / 0.4) * (1 - 0);
    const startled = smooth((t - 14.3) / 0.4);
    poseHuman(p.h, tt * 6.4 + p.ph, moving ? 1.0 : 0.0, Math.max(0.55 * startled, f), f);
    p.g.position.set(x + p.dirv * 0 + (f > 0 ? 6 * Math.min(s, 1.5) * (p.fx > 0 ? 1 : -1) : 0), 0.16 + (f > 0 ? Math.max(0, 3 * s - 4.9 * s * s * 0.8) : 0) - 0.4 * startled * 0.2, z + (f > 0 ? 9 * Math.min(s, 2) : 0));
    p.g.rotation.set(-1.45 * f - 0.25 * startled * (1 - f), face, (p.fx > 0 ? 1 : -1) * 0.3 * f);
  }
  /* shock front: glass, brick, cracks, dust wall */
  for (const c of cracks) { const w = c.w * smooth((t - hitT(c.m.position.z) - c.k * 0.05) / 0.8); c.m.visible = w > 0.01; c.m.scale.set(c.len * 1.04, 1, w * 3); }
  for (let i = 0; i < SHARDS_N; i++) {
    const h = shards[i], t0 = hitT(h.b.z) + (h.t0 % 3) * 0.15, s = t - t0;
    if (s < 0 || s > 7) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else { const y = h.y0 - 0.5 * 9.8 * s * s; dummy.position.set(h.b.x - h.b.side * (h.b.w / 2 + (h.drift * 3 + 2) * s), Math.max(0.2, y), h.b.z + h.oz + 18 * s); dummy.scale.set(h.s, h.s, 1); dummy.rotation.set(s * h.spin, s * h.spin * 0.7, s * h.spin * 0.4); }
    dummy.updateMatrix(); shardMesh.setMatrixAt(i, dummy.matrix);
  }
  shardMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < CHUNK_N; i++) {
    const d = chunks[i], t0 = hitT(d.b.z) + (d.t0 % 2) * 0.2, s = t - t0;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else { const y = d.y0 - 0.5 * 9.8 * s * s, g = 0.25 * d.sy; dummy.position.set(d.b.x - d.b.side * (d.b.w / 2 + 0.6 + d.drift * Math.min(s, 1.6) * 2), Math.max(g + 0.1, y), d.b.z + d.oz + 12 * Math.min(s, 2.5)); dummy.scale.set(d.sx, d.sy, d.sz); dummy.rotation.set(Math.min(s, 2.4) * d.spin, Math.min(s, 2.4) * d.spin * 0.6, 0); }
    dummy.updateMatrix(); chunkMesh.setMatrixAt(i, dummy.matrix);
  }
  chunkMesh.instanceMatrix.needsUpdate = true;
  // the front itself: a wall of dust and fire sweeping toward the camera
  if (t > T_FR0 - 0.2) {
    const zf = Z_FAR + (t - T_FR0) * V_FRONT;
    for (let k = 0; k < 36; k++) { const hx = (hash2(k, 71) - 0.5) * 40, hh = hash2(k, 72), back = hash2(k, 73) * 70; addPuff(hx, 3 + hh * 40, zf - back, 24 + hh * 30, k, 0.55 + hh * 0.3, 0.42 + hh * 0.15, 0.34, 0.5 * (1 - back / 90)); }
    for (let k = 0; k < 18; k++) { const hx = (hash2(k, 74) - 0.5) * 30, hh = hash2(k, 75); addPuff(hx, 1 + hh * 18, zf - 6 - hash2(k, 76) * 30, 14 + hh * 18, k, 1.8, 0.7, 0.22, 0.45 * (1 - hash2(k, 76))); }
  }
  /* the heat: windows and shopfronts ignite everywhere at once */
  for (let i = 0; i < NBF; i++) {
    const f = BFIRE[i], t0 = 16.2 + hash2(i, 34) * 2.4, burn = smooth((Tm - t0) / 1.0);
    if (burn <= 0.02) { bfGlow.pos[i * 3 + 1] = -200; continue; }
    bfGlow.pos[i * 3] = f.x; bfGlow.pos[i * 3 + 1] = f.y; bfGlow.pos[i * 3 + 2] = f.z;
    const fl = 0.8 + 0.2 * Math.sin(Tm * 17 + f.ph * 7);
    for (let q = 0; q < 6; q++) { const u = q / 6; addPuff(f.x - Math.sign(f.x) * (q * 0.5), f.y + 2 + q * 8, f.z + Math.cos(Tm * 0.7 + q) * 1.5, 5 + q * 5, f.ph + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.5 * fl : 0.36 * (1 - u * 0.7)) * burn); }
  }
  bfGlow.geo.attributes.position.needsUpdate = true; bfGlow.pts.material.opacity = 0.9;
  embers.pts.material.opacity = 0.9 * smooth((t - 16.4) / 1.5);
  if (t > 16.4) for (let i = 0; i < EMB_N; i++) { const e = EMB[i], y = 60 - fmod(e.y0 + t * e.sp * 3, 62); embers.pos[i * 3] = e.x + Math.sin(t * 0.7 + e.ph * 6) * 3; embers.pos[i * 3 + 1] = Math.max(0.2, y); embers.pos[i * 3 + 2] = e.z + Math.cos(t * 0.6 + e.ph * 5) * 2.5; }
  embers.geo.attributes.position.needsUpdate = true;
  for (let k = 0; k < 26; k++) { const ph = fmod(t * 0.22 + k / 26, 1), w = 1.6 + ph * 7; addPuff(steam.x + Math.sin(t * 0.5 + k) * 0.7 + ph * 5, 3.2 + ph * 26, steam.z + Math.cos(k) * 0.6, w, k, 0.97, 0.97, 0.97, 0.5 * (1 - ph) * clamp(ph * 5)); }
  const bt = t - 14.3;
  for (let i = 0; i < PIG_N; i++) { const b = PIG[i]; if (bt < 0 || bt > 12) { pigeons.pos[i * 3 + 1] = -200; continue; } pigeons.pos[i * 3] = b.x + b.vx * bt + Math.sin(bt * 4 + b.ph) * 1.2; pigeons.pos[i * 3 + 1] = 2 + b.vy * Math.min(bt, 4) + Math.sin(bt * 6 + b.ph) * 0.7; pigeons.pos[i * 3 + 2] = b.z + b.vz * bt; }
  pigeons.geo.attributes.position.needsUpdate = true; pigeons.pts.material.opacity = 0.9 * (1 - smooth((bt - 8) / 3));
  { const ca = 1 - smooth((t - 12) / 2); if (ca > 0.01) for (let c = 0; c < 8; c++) { const cx = (hash2(c, 21) - 0.5) * 900, cy = 380 + hash2(c, 22) * 260, cz = -1500 - hash2(c, 23) * 900, cw = 130 + hash2(c, 24) * 160; for (let k = 0; k < 8; k++) { const ox = (hash2(c * 9 + k, 31) - 0.5) * cw * 2.2, oy = (hash2(c * 9 + k, 32) - 0.35) * cw * 0.5, sz = cw * (0.55 + hash2(c * 9 + k, 33) * 0.7); const L = 0.97 - Math.max(0, -oy / cw) * 0.14; addPuff(cx + ox + t * 3, cy + oy, cz, sz, hash2(c * 9 + k, 35) * 0.5 - 0.25, L, L * 0.98, L * 0.94, 0.72 * ca); } } }
  flushSmoke();
}

/* ------------------------------------------------------------------ *
 *  HUD / captions / alert / end card
 * ------------------------------------------------------------------ */
const elTitle = document.getElementById('title');
const hud = document.getElementById('hud');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const cap = document.getElementById('caption');
const end = document.getElementById('end');
const flash = document.getElementById('flash');
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const BEATS = [
  { a: 0.6, b: 4.8, label: 'Asteroid diameter', value: () => '10 km', sub: () => '6 miles: wider than Everest is tall' },
  { a: 4.8, b: 7.3, label: 'Impact speed', value: (k) => `${Math.round(20 * smooth(k * 1.4))} km/s`, sub: () => 'About 45,000 mph' },
  { a: 7.4, b: 14.4, label: 'Impact in', value: (k) => `0:0${Math.max(0, Math.ceil(7 * (1 - k)))}`, sub: () => 'Real time. Impact point: 35 km away' },
  { a: 16.2, b: 31.0, label: 'Illustrative reconstruction', value: () => 'Slowed', sub: () => 'No one would survive to see this' },
];
const CAPS = [
  [1.0, 4.6, 'A 10-kilometer asteroid is on its way. What if it hit New York?'],
  [5.0, 7.2, 'You would get about seven seconds of warning.'],
  [7.9, 13.9, 'The sky is the only sign.'],
  [15.6, 19.0, 'Heat first. Everything flammable ignites at once.'],
  [19.6, 24.0, 'Then the shock front tears down the avenue.'],
  [24.8, 30.2, 'Nothing inside the fireball survives.'],
];
const FACTS = [
  [35.4, 'Energy released', '100 million megatons', 'About 10,000x all nuclear weapons combined'],
  [38.2, 'Fireball radius', 'about 136 km', 'Collins, Melosh & Marcus (2005) formula. Manhattan is inside it'],
  [41.0, 'Crater', 'about 120 km wide', 'Same formulas. It excavates rock more than 20 km deep'],
  [43.8, 'Global heat pulse', 'an oven on broil, for about an hour', 'Melosh et al. 1990, Toon et al. 1997'],
  [46.6, 'Dark and cold', 'for about a decade', 'Dust, soot and aerosols block the sun'],
  [49.4, 'Species lost', 'about 75%', 'The K-Pg mass extinction, 66 million years ago'],
  [52.2, 'Known asteroid threats', 'none for 100+ years', 'NASA Planetary Defense'],
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
  {
    const fw = T < 31.5 ? Math.max(smooth((T - 13.7) / 0.7) * (1 - smooth((T - 15.4) / 1.0)), smooth((T - 30.4) / 0.9)) : 1;
    flash.style.background = T >= 31.6 ? '#000' : '#fff'; flash.style.opacity = fw;
    document.getElementById('heat').style.opacity = 0.7 * smooth((T - 16) / 3) * (1 - smooth((T - 30.6) / 0.8));
    const fe = document.getElementById('facts');
    fe.innerHTML = FACTS.filter((f) => T >= f[0]).map((f) => `<div class="f" style="opacity:${smooth((T - f[0]) / 0.7) * (1 - smooth((T - 56.6) / 0.6))}"><div class="fl">${f[1]}</div><div class="fv">${f[2]}</div><div class="fs">${f[3]}</div></div>`).join('');
  }
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
  const skip3D = T > 33.2;
  for (let j = 0; j < (skip3D ? 0 : sub); j++) {
    const Tj = clamp(T + (sub > 1 ? (j / (sub - 1) - 0.5) * dt : 0), 0, T_END);
    curT = Tj; update(Tj);
    composer.render();
    actx.globalAlpha = 1 / (j + 1);
    actx.drawImage(glCanvas, 0, 0);
  }
  actx.globalAlpha = 1;
  updateOverlay(T);
}
window.renderAt = renderAt;
window.dbg = { scene, camera, renderer, composer, warp };
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
