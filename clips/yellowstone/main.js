import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 *  "What if Yellowstone erupted?"  — deterministic 17s timeline.
 *  Everything is a pure function of t, so frames can be rendered in
 *  any order (see clips/render.mjs).
 *
 *  Setting: a brick downtown (think Bozeman, MT) seen from a 4th-floor
 *  balcony, street running straight at the volcano.
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

/* ---------- sky ---------- */
const SUN_DIR = new THREE.Vector3(0.5, 0.48, 0.7).normalize(); // behind & right of the camera
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
const hemi = new THREE.HemisphereLight(0xaac0e0, 0x4a3f30, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc48c, 3);
sun.position.copy(SUN_DIR).multiplyScalar(420).add(new THREE.Vector3(0, 0, -40));
sun.target.position.set(0, 0, -40);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 1000 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
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
const brickDebrisTex = (() => { const c = mkCanvas(128, 64); brickFill(c.getContext('2d'), 0, 0, 128, 64, 0xa0503b, rng(4), 8, 24); return toTex(c); })();
const asphaltTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(8);
  x.fillStyle = '#3d3c40'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 40 + r() * 34; x.fillStyle = `rgb(${v},${v},${v + 3})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  const t = toTex(c); t.repeat.set(4, 70); return t;
})();
const concreteTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(9);
  x.fillStyle = '#b9b2a6'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { const v = 150 + r() * 50; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  x.strokeStyle = 'rgba(70,64,58,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254);
  return toTex(c);
})();

/* ---------- ground / street ---------- */
const STREET_HALF = 8, WALK = 4;
const groundMat = ashMat(0x8d7c46, 0.95, 7.2);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);

const roadMat = ashMat(0xffffff, 0.92, 7.4, { map: asphaltTex });
const road = new THREE.Mesh(new THREE.PlaneGeometry(STREET_HALF * 2, 520), roadMat);
road.rotation.x = -Math.PI / 2; road.position.set(0, 0.05, -230); road.receiveShadow = true;
scene.add(road);
const walkMat = ashMat(0xffffff, 0.95, 7.0, { map: concreteTex });
for (const s of [-1, 1]) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(WALK, 0.28, 520), walkMat);
  w.position.set(s * (STREET_HALF + WALK / 2), 0.14, -230); w.receiveShadow = true;
  const uv = w.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 130);
  scene.add(w);
}
const paintMat = ashMat(0xe7ddb0, 0.95, 7.2);
const whiteMat = ashMat(0xe9e6df, 0.95, 7.2);
for (let z = 30; z > -490; z -= 8) for (const dx of [-0.25, 0.25]) {
  const d = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 5), paintMat);
  d.rotation.x = -Math.PI / 2; d.position.set(dx, 0.07, z); scene.add(d);
}
const CROSS = [-98, -214];
for (const cz of CROSS) {
  for (let x = -STREET_HALF + 0.8; x < STREET_HALF; x += 1.5) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.4), whiteMat);
    s.rotation.x = -Math.PI / 2; s.position.set(x, 0.08, cz + 7); scene.add(s);
  }
}

/* ---------- distant mountains ---------- */
const mountMat = ashMat(0x6a7488, 0.55, 8, { flatShading: true });
const volcanoMat = ashMat(0xffffff, 0.5, 8, { flatShading: true, vertexColors: true });
const R = rng(11);
const volcano = new THREE.Mesh(new THREE.CylinderGeometry(120, 760, 450, 14, 5), volcanoMat);
{
  const g = volcano.geometry, pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const lo = new THREE.Color(0x2e3a33), mid = new THREE.Color(0x5a555d), hi = new THREE.Color(0x8e8b96), snow = new THREE.Color(0xc9ccd6), c = new THREE.Color();
  const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i);
    const h = (y0 + 225) / 450;
    // rugged, deterministic ridges (same jitter for coincident vertices)
    const ang = Math.atan2(z0, x0), j = (hash(Math.round(ang * 40), Math.round(y0 / 30)) - 0.5);
    const rad = Math.hypot(x0, z0) * (1 + j * 0.16 * (1 - h * 0.5));
    pos.setXYZ(i, Math.cos(ang) * rad, y0 + j * 26 * (1 - h), Math.sin(ang) * rad);
    if (h < 0.35) c.copy(lo).lerp(mid, h / 0.35); else c.copy(mid).lerp(hi, (h - 0.35) / 0.65);
    if (h > 0.78) c.lerp(snow, (h - 0.78) / 0.22 * 0.8);
    const n = 0.88 + 0.24 * hash(Math.round(ang * 40), Math.round(y0 / 30) + 7);
    col[i * 3] = c.r * n; col[i * 3 + 1] = c.g * n; col[i * 3 + 2] = c.b * n;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
}
volcano.position.set(0, 225, -1400);
scene.add(volcano);
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI, rad = 1300 + R() * 700, h = 160 + R() * 300, r = 320 + R() * 380;
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(R() * 3)), mountMat);
  const x = Math.cos(a) * rad * 1.35, z = -Math.sin(a) * rad - 400;
  if (Math.abs(x) < 450 && z < -700) continue;
  m.position.set(x, h / 2 - 8, z); m.rotation.y = R() * 3; scene.add(m);
}
for (let i = 0; i < 16; i++) {
  const h = 40 + R() * 70, r = 160 + R() * 160, side = i % 2 ? 1 : -1;
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mountMat);
  m.position.set(side * (380 + R() * 700), h / 2 - 4, -480 - R() * 380); scene.add(m);
}

/* ------------------------------------------------------------------ *
 *  Downtown
 * ------------------------------------------------------------------ */
const brickCols = [0x9e4a37, 0x8a3d33, 0xb28a5e, 0x7d4d3c];
const facades = brickCols.map((c, i) => makeFacade(c, 100 + i));
const hex6 = (n) => '#' + n.toString(16).padStart(6, '0');
const shopSets = [[0x2f5a3c, 0xe8e1cf], [0x1f3b6b, 0xe8e1cf], [0xa3262c, 0xe8e1cf], [0xc9962a, 0x2a2724]]
  .map(([a, b], i) => makeShop(brickCols[i], hex6(a), hex6(b), 200 + i));
const litMat = (set, k) => {
  const m = new THREE.MeshLambertMaterial({ map: set.map, emissive: 0xffffff, emissiveMap: set.emissiveMap, emissiveIntensity: 0 });
  ashTargets.push({ mat: m, base: new THREE.Color(0xffffff), k, start: 7.5, light: true });
  return m;
};
const facadeMats = facades.map((f) => litMat(f, 0.45));
const shopMats = shopSets.map((f) => litMat(f, 0.4));
const roofMat = ashMat(0x3f3d3b, 1.0, 6.7);
const stoneMat = ashMat(0xcfc6b4, 0.5, 7.4);
const tankMat = ashMat(0x6d4f38, 0.9, 7);
const unitMat = ashMat(0x8c9094, 0.9, 7);

// BoxGeometry whose side-face UVs are in metres/tile so the brick + window pattern stays metric
function texBox(w, h, d, sideMat, topMat, tileW, tileH) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x,-x,+y,-y,+z,-z
  for (let f = 0; f < 6; f++) {
    const side = f < 2 || f > 3, [fw, fh] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * fw / (side ? tileW : 8), uv.getY(k) * fh / (side ? tileH : 8));
    }
  }
  const m = new THREE.Mesh(g, [sideMat, sideMat, topMat, topMat, sideMat, sideMat]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

const buildings = [];
{
  const r = rng(21);
  const place = (side, rowX, depthX, zStart, zEnd, floorsMin, floorsMax, front) => {
    let z = zStart;
    while (z > zEnd) {
      const bays = 4 + Math.floor(r() * 3), dz = bays * BAY;
      const cross = CROSS.find((cz) => z - dz < cz + 12 && z > cz - 4);
      if (cross !== undefined) { z = cross - 4; continue; }
      const floors = floorsMin + Math.floor(r() * (floorsMax - floorsMin + 1));
      const vi = Math.floor(r() * 4);
      const g = new THREE.Group();
      const shop = texBox(depthX, SHOP_H, dz, shopMats[vi], roofMat, TILE_W, SHOP_H);
      shop.position.y = SHOP_H / 2;
      const hh = floors * FLOOR;
      const up = texBox(depthX, hh, dz, facadeMats[vi], roofMat, TILE_W, TILE_H);
      up.position.y = SHOP_H + hh / 2;
      const cor = new THREE.Mesh(new THREE.BoxGeometry(depthX + 0.8, 0.7, dz + 0.8), stoneMat);
      cor.position.y = SHOP_H + hh + 0.35; cor.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(depthX - 0.4, 0.5, dz - 0.4), roofMat);
      roof.position.y = SHOP_H + hh + 0.5; roof.receiveShadow = true;
      g.add(shop, up, cor, roof);
      const n = 1 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const m = r() < 0.3 ? new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 8), tankMat)
          : new THREE.Mesh(new THREE.BoxGeometry(1.5 + r() * 2.5, 1 + r() * 1.3, 1.5 + r() * 2.5), unitMat);
        m.position.set((r() - 0.5) * (depthX - 4), SHOP_H + hh + 1.8, (r() - 0.5) * (dz - 4));
        m.castShadow = true; g.add(m);
      }
      const x = side * (rowX + depthX / 2);
      g.position.set(x, 0, z - dz / 2);
      scene.add(g);
      buildings.push({ g, x, z: z - dz / 2, w: depthX, d: dz, h: SHOP_H + hh, side, front });
      z -= dz + (r() < 0.3 ? 2 + r() * 3 : 0);
    }
  };
  for (const side of [-1, 1]) {
    place(side, STREET_HALF + WALK, 14, 40, -335, 5, 8, true);
    place(side, STREET_HALF + WALK + 30, 14, 40, -335, 3, 6, false);
  }
}

/* ---------- lamps ---------- */
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0x555044 });
const lampLights = [];
{
  const poleM = new THREE.MeshLambertMaterial({ color: 0x232325 });
  let n = 0;
  for (let z = -4; z > -240; z -= 30) for (const s of [-1, 1]) {
    const zz = z + (s > 0 ? -14 : 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 7.5, 6), poleM);
    pole.position.set(s * (STREET_HALF + 0.6), 3.75, zz); pole.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.12), poleM);
    arm.position.set(s * (STREET_HALF - 0.2), 7.4, zz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), lampBulbMat);
    bulb.position.set(s * (STREET_HALF - 1.0), 7.2, zz);
    scene.add(pole, arm, bulb);
    if (n++ < 4) {
      const L = new THREE.PointLight(0xffb866, 0, 70, 2);
      L.position.copy(bulb.position).add(new THREE.Vector3(0, -0.4, 0));
      scene.add(L); lampLights.push(L);
    }
  }
}

/* ---------- things the blast can toss: trees, cars, pedestrians ---------- */
const tossables = [];
const treeCanopyMat = ashMat(0x4f7a3a, 0.85, 7.4, { flatShading: true });
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3626 });
{
  const r = rng(31);
  for (let z = -2; z > -300; z -= 17) for (const s of [-1, 1]) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), trunkMat); trunk.position.y = 1.5; trunk.castShadow = true;
    const can = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1 + r() * 0.6, 0), treeCanopyMat); can.position.y = 4.3; can.scale.y = 1.15; can.castShadow = true;
    g.add(trunk, can);
    const x = s * (STREET_HALF + 1.3), zz = z + r() * 4;
    g.position.set(x, 0.28, zz); scene.add(g);
    tossables.push({ g, x, y: 0.28, z: zz, kind: 'tree', k: 0.6 + r() * 0.4, spin: r() * 2 - 1 });
  }
}
const carCols = [0x2b4a86, 0xb21f24, 0xd9d9d3, 0x1a1a1c, 0xe0b92a, 0x6c7378, 0x2f6b4a, 0x8e3b6e];
const carGlass = new THREE.MeshLambertMaterial({ color: 0x1b2430 });
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
function makeCar(col) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: col, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 4.5), mat); body.position.y = 0.72;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 2.4), carGlass); cab.position.set(0, 1.4, 0.1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.1, 2.2), mat); roof.position.set(0, 1.8, 0.1);
  g.add(body, cab, roof);
  for (const [wx, wz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10), wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
{
  const r = rng(41);
  for (let i = 0; i < 26; i++) {
    const parked = i < 20;
    const s = r() < 0.5 ? -1 : 1;
    const g = makeCar(carCols[Math.floor(r() * carCols.length)]);
    const z = 18 - (i / 26) * 300 + r() * 6;
    const x = parked ? s * (STREET_HALF - 1.3) : (s * 2.7);
    g.position.set(x, 0.05, z);
    g.rotation.y = parked ? 0 : (s > 0 ? 0 : Math.PI);
    scene.add(g);
    tossables.push({ g, x, y: 0.05, z, kind: 'car', k: 1, spin: r() * 2 - 1, drive: parked ? 0 : (s > 0 ? -1 : 1) * (5 + r() * 3), baseRot: g.rotation.y });
  }
}
const pedBodyCols = [0x384e7a, 0x8c3a3a, 0x2f2f33, 0xd1b36a, 0x5a7a5a, 0xc7c2b8];
{
  const r = rng(51);
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.8, 3, 6), new THREE.MeshLambertMaterial({ color: pedBodyCols[Math.floor(r() * pedBodyCols.length)] }));
    body.position.y = 1.05; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshLambertMaterial({ color: 0xc89b7b })); head.position.y = 1.85;
    g.add(body, head);
    const s = r() < 0.5 ? -1 : 1, x = s * (STREET_HALF + 0.8 + r() * 2.4), z = 10 - r() * 160;
    g.position.set(x, 0.28, z); scene.add(g);
    tossables.push({ g, x, y: 0.28, z, kind: 'ped', k: 1, spin: r() * 2 - 1, drive: (r() < 0.5 ? -1 : 1) * (1.1 + r() * 0.5) });
  }
}

/* ---------- forest beyond the city (instanced) ---------- */
const TREES = 900;
const treeData = [];
{
  const r = rng(77);
  while (treeData.length < TREES) {
    const x = (r() - 0.5) * 1500, z = 60 - r() * 960;
    if (z > -345) continue;
    treeData.push({ x, z, s: 0.8 + r() * 1.1, hue: r() });
  }
}
const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 5), new THREE.MeshLambertMaterial({ color: 0x4a3626 }), TREES);
const crownMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(3.4, 12, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), TREES);
scene.add(trunkMesh, crownMesh);
const treeBase = treeData.map((t) => new THREE.Color().setHSL(0.27 + t.hue * 0.05, 0.38, 0.17 + t.hue * 0.08));

/* ---------- eruption: plume ---------- */
const PLUME_N = 1100;
const plumeData = [];
{
  const r = rng(303);
  for (let i = 0; i < PLUME_N; i++) plumeData.push({ tb: 2 + r() * 4.8, a: r() * Math.PI * 2, u: Math.sqrt(r()), u2: r(), sz: 0.7 + r() * 0.9, tint: r() });
}
const plume = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), PLUME_N);
plume.frustumCulled = false;
scene.add(plume);

const BOMBS = 90;
const bombData = [];
{
  const r = rng(909);
  for (let i = 0; i < BOMBS; i++) bombData.push({ tb: 2 + r() * 3.2, vx: (r() - 0.5) * 140, vy: 120 + r() * 180, vz: (r() - 0.35) * 150, s: 3 + r() * 6, w: r() * 9 });
}
const bombs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xff7a22, fog: false }), BOMBS);
bombs.frustumCulled = false;
scene.add(bombs);

/* ---------- pyroclastic flow (channelled down the street) ---------- */
const FLOW_N = 900;
const flowData = [];
{
  const r = rng(404);
  for (let i = 0; i < FLOW_N; i++) flowData.push({ dz: Math.pow(r(), 1.15) * 240, u: r() * 2 - 1, hy: Math.pow(r(), 1.3), s: 0.55 + r() * 0.9, tint: r() });
}
const flowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, emissive: 0x160904 });
const flowLight = new THREE.PointLight(0xff7a2a, 0, 0, 2);
scene.add(flowLight);
let lumpy = new THREE.IcosahedronGeometry(1, 3);
{
  lumpy.deleteAttribute('normal'); lumpy.deleteAttribute('uv');
  lumpy = mergeVertices(lumpy, 1e-4);
  const p = lumpy.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.22 * Math.sin(x * 4.1 + y * 3.3) * Math.cos(z * 3.7 - y * 2.1) + 0.1 * Math.sin(x * 9 + z * 8);
    p.setXYZ(i, x * n, y * n, z * n);
  }
  lumpy.computeVertexNormals();
}
const flow = new THREE.InstancedMesh(lumpy, flowMat, FLOW_N);
flow.frustumCulled = false;
scene.add(flow);
const FLOW_T0 = 4.0, FLOW_T1 = 7.3, FLOW_Z0 = -1150, FLOW_Z1 = -22;
const flowFront = (t) => FLOW_Z0 + (FLOW_Z1 - FLOW_Z0) * Math.pow(clamp((t - FLOW_T0) / (FLOW_T1 - FLOW_T0)), 1.35);
function flowArrival(z) {
  let lo = FLOW_T0, hi = FLOW_T1 + 2;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (flowFront(m) < z) lo = m; else hi = m; }
  return lo;
}

/* ---------- brick debris from collapsing buildings ---------- */
const DEB_PER = 26;
const debris = [];
{
  const r = rng(1234);
  for (const b of buildings) {
    b.hit = flowArrival(b.z);
    for (let k = 0; k < DEB_PER; k++) {
      debris.push({
        b, ox: (r() - 0.5) * b.w, oy: 3 + r() * (b.h - 3), oz: (r() - 0.5) * b.d,
        vx: -b.side * (2 + r() * 20), vy: 6 + r() * 30, vz: 16 + r() * 48,
        sx: 0.8 + r() * 2.2, sy: 0.5 + r() * 1.2, sz: 0.3 + r() * 0.7, spin: (r() - 0.5) * 9, shade: 0.7 + r() * 0.3,
      });
    }
  }
}
const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: brickDebrisTex }), debris.length);
debMesh.frustumCulled = false;
scene.add(debMesh);

// loose papers carried by the shock-wind
const PAPERS = 90;
const paperData = [];
{
  const r = rng(808);
  for (let i = 0; i < PAPERS; i++) paperData.push({ x: (r() - 0.5) * 18, y: 1.5 + r() * 24, z0: -300 + r() * 280, vz: 22 + r() * 22, w: r() * 8, s: 0.5 + r() * 0.8 });
}
const papers = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1.3), new THREE.MeshLambertMaterial({ color: 0xece6d6, side: THREE.DoubleSide }), PAPERS);
papers.frustumCulled = false;
scene.add(papers);

/* ---------- dust haze layers + falling ash ---------- */
const sprite = (() => {
  const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const hazeLayers = [];
{
  const r = rng(606);
  for (const [n, size] of [[140, 34], [120, 16], [90, 70]]) {
    const pos = new Float32Array(n * 3), seed = [];
    for (let i = 0; i < n; i++) seed.push([(r() - 0.5) * 70, 2 + r() * 36, 12 - r() * 190, r() * 6.28]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcaa982, size, map: sprite, transparent: true, opacity: 0, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
    hazeLayers.push({ pts, pos, seed, geo });
  }
}
const ASH_N = 6000;
const ashPos = new Float32Array(ASH_N * 3), ashSeed = [];
{
  const r = rng(555);
  for (let i = 0; i < ASH_N; i++) ashSeed.push([r() * 200 - 100, r() * 80, r() * 260 - 220, 4 + r() * 5, r() * 6.28]);
}
const ashGeo = new THREE.BufferGeometry();
ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
const ashPts = new THREE.Points(ashGeo, new THREE.PointsMaterial({ color: 0xd6d1c8, size: 0.3, map: sprite, transparent: true, opacity: 0, depthWrite: false }));
ashPts.frustumCulled = false;
scene.add(ashPts);

/* ------------------------------------------------------------------ *
 *  Per-frame update
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color();
const horC = new THREE.Color(), topC = new THREE.Color();

const SKY_H = [[0, 0xf2b27a], [2, 0xf2b27a], [3.5, 0xc07a52], [5, 0x9a6040], [7, 0x5c3e30], [9, 0x2b211d], [12, 0x3a3532], [13.5, 0x8c8a86], [17, 0x9a9894]];
const SKY_T = [[0, 0x6f98c9], [2, 0x6f98c9], [3.5, 0x4d5a70], [5, 0x2c3038], [7, 0x16171b], [9, 0x0e0e10], [12, 0x1e1f22], [13.5, 0x5e6064], [17, 0x6a6c70]];
const CAM = new THREE.Vector3(10.2, 14.2, 4);

function toss(o, p, dz) {
  const g = o.g;
  if (p <= 0) { g.position.set(o.x, o.y, o.z + dz); g.rotation.set(0, o.baseRot || 0, 0); return; }
  const air = Math.sin(clamp(p) * Math.PI);
  g.position.set(o.x + o.spin * p * 6, o.y + air * (o.kind === 'car' ? 9 : 14) * o.k, o.z + dz + p * (o.kind === 'tree' ? 26 : 70) * o.k);
  g.rotation.set(p * 3.1 * o.k, (o.baseRot || 0) + p * 1.8 * o.spin, p * 2.4 * o.spin);
}

function update(t) {
  /* sky / fog / lights */
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC);
  skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [3, 1], [5, 0.15], [7, 0], [13, 0], [14, 0.35], [17, 0.5]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00045], [2, 0.0005], [4, 0.0008], [6, 0.0015], [7, 0.0030], [8, 0.0042], [9, 0.0046], [11, 0.0038], [13, 0.0028], [14.5, 0.0033], [17, 0.0036]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.05], [7, 1.1], [9, 1.3], [13, 1.3], [17, 1.2]]);
  sun.intensity = Math.PI * kf(t, [[0, 3.1], [3, 2.9], [4.5, 1.4], [6.5, 0.3], [8, 0.05], [13, 0.05], [13.6, 0.5], [17, 0.9]]);
  kfc(t, [[0, 0xffc48c], [4, 0xffb27a], [7, 0xcc9c80], [13, 0xcfcfcf], [17, 0xd8d8d8]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [4, 0.9], [5.5, 0.85], [7.3, 0.6], [8.4, 0.3], [10, 0.32], [13, 1.0], [17, 1.15]]);
  hemi.color.copy(horC).lerp(topC, 0.5).lerp(tmpC.set(0xc07440), kf(t, [[3, 0], [4.5, 0.75], [7.3, 0.7], [9, 0.25], [11, 0]]));
  hemi.groundColor.set(0x5a4a38).lerp(tmpC.set(0x7a7873), smooth((t - 12) / 2));
  craterLight.intensity = kf(t, [[2, 0], [2.4, 2.4e5], [5, 1.6e5], [7, 6e4], [9, 0]]);
  const lampOn = smooth((t - 6.8) / 1.2);
  lampLights.forEach((L) => { L.intensity = lampOn * 380; });
  lampBulbMat.color.set(0x555044).lerp(tmpC.set(0xffd592), lampOn);
  const winGlow = kf(t, [[0, 0], [6.6, 0], [8, 0.65], [11, 0.5], [13, 0.15], [17, 0]]);
  glCanvas.style.filter = `saturate(${kf(t, [[0, 1.02], [5, 0.85], [9, 0.8], [12.5, 0.8], [14, 0.32], [17, 0.28]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [8, 1.1], [14, 1.0]]).toFixed(3)})`;

  for (const a of ashTargets) {
    const f = smooth((t - a.start) / 3.2) * a.k;
    a.mat.color.copy(a.base).lerp(ASH, f);
    if (a.light) { a.mat.emissiveIntensity = winGlow; a.mat.color.lerp(tmpC.set(0x9a9892), f * 0.3); }
  }
  ground.position.y = 0.6 * smooth((t - 7.2) / 4);

  /* camera: balcony, looks down the street, ducks up to watch the plume */
  const pitch = kf(t, [[0, -4], [1.8, -3], [2.4, 4], [3.2, 22], [4.0, 26], [4.8, 10], [5.6, 2], [6.8, -1], [7.3, -6], [8, -4], [10, 2], [13, 0], [17, -3]]);
  const yaw = kf(t, [[0, 15], [2, 13], [2.6, 7], [4.0, 3], [4.8, 4], [5.6, 6], [6.8, 8], [7.3, 30], [7.8, 44], [9, 30], [11, 22], [14, 14], [17, 12]]);
  const amp = kf(t, [[0, 0.01], [1.4, 0.03], [2, 0.14], [2.7, 0.4], [4, 0.32], [4.6, 0.3], [6, 0.7], [7.3, 1.25], [8.6, 0.45], [10, 0.07], [13, 0.03], [17, 0.0]]);
  const sh = (a, b) => Math.sin(t * a + b);
  camera.position.set(
    CAM.x + amp * 0.16 * (sh(41, 1) + 0.6 * sh(23, 2)),
    CAM.y + amp * 0.12 * (sh(37, 0) + 0.5 * sh(19, 4)), CAM.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(0, 0, 0);
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
    dummy.scale.setScalar((26 + a * 24 + (h - CRATER.y) * 0.03) * p.sz * (1 + s * 0.7));
    dummy.rotation.set(p.a, p.u2 * 6, 0);
    dummy.updateMatrix(); plume.setMatrixAt(i, dummy.matrix);
    const hot = clamp(1 - a / 1.2);
    tmpC.setRGB(0.24, 0.215, 0.2).lerp(_ca.setRGB(0.36, 0.33, 0.3), p.tint * clamp((h - 900) / 1200)).lerp(_cb.setRGB(1.0, 0.36, 0.08), hot * 0.9);
    plume.setColorAt(i, tmpC);
  }
  plume.instanceMatrix.needsUpdate = true; if (plume.instanceColor) plume.instanceColor.needsUpdate = true;

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

  /* pyroclastic flow: a rolling wall inside the street canyon */
  const f = flowFront(t);
  flowMat.opacity = 1 - smooth((t - 6.75) / 0.55);
  flow.visible = t >= FLOW_T0 - 0.2 && flowMat.opacity > 0.01;
  flowLight.position.set(0, 25, f + 30);
  flowLight.intensity = flow.visible ? kf(t, [[4, 0], [4.6, 3e5], [7, 5e5], [8, 0]]) : 0;
  if (flow.visible) {
    for (let i = 0; i < FLOW_N; i++) {
      const p = flowData[i];
      const sz = (20 + (f + 1150) * 0.024) * p.s;
      dummy.position.set(p.u * (STREET_HALF + 7), sz * 0.55 + p.hy * (110 + (f + 1150) * 0.09), f - p.dz);
      dummy.scale.set(sz * 1.1, sz * 0.9, sz);
      dummy.rotation.set(0, i, 0);
      dummy.updateMatrix(); flow.setMatrixAt(i, dummy.matrix);
      flow.setColorAt(i, tmpC.setRGB(0.2, 0.16, 0.14).lerp(_ca.setRGB(0.42, 0.34, 0.29), p.tint));
    }
    flow.instanceMatrix.needsUpdate = true; if (flow.instanceColor) flow.instanceColor.needsUpdate = true;
  }

  /* buildings buckle as the front passes */
  for (const b of buildings) {
    const p = t < FLOW_T0 ? 0 : clamp((f - b.z) / 40);
    b.g.rotation.z = b.side * p * (b.front ? 0.5 : 0.28);
    b.g.rotation.x = p * 0.14;
    b.g.position.y = -p * 5;
    b.g.position.z = b.z + p * 10;
    b.g.scale.y = 1 - 0.5 * p;
  }
  for (let i = 0; i < debris.length; i++) {
    const d = debris[i], s = t - d.b.hit;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const y = d.oy + d.vy * s - 0.5 * 24 * s * s;
      dummy.position.set(d.b.x + d.ox + d.vx * s, Math.max(0.5, y), Math.min(16, d.b.z + d.oz + d.vz * s));
      dummy.scale.set(d.sx, d.sy, d.sz);
      dummy.rotation.set(s * d.spin, s * d.spin * 0.6, s * d.spin * 0.3);
    }
    dummy.updateMatrix(); debMesh.setMatrixAt(i, dummy.matrix);
    debMesh.setColorAt(i, tmpC.setScalar(d.shade));
  }
  debMesh.instanceMatrix.needsUpdate = true; debMesh.instanceColor.needsUpdate = true;

  /* papers in the shock-wind */
  for (let i = 0; i < PAPERS; i++) {
    const p = paperData[i], s = t - 3.2;
    if (s < 0 || t > 7.3) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      dummy.position.set(p.x + Math.sin(s * 3 + p.w) * 2.5, p.y + Math.sin(s * 2.2 + p.w) * 3, Math.min(14, p.z0 + s * p.vz));
      dummy.scale.setScalar(p.s);
      dummy.rotation.set(s * 6 + p.w, s * 4, s * 3);
    }
    dummy.updateMatrix(); papers.setMatrixAt(i, dummy.matrix);
  }
  papers.instanceMatrix.needsUpdate = true;

  /* cars, street trees, pedestrians */
  for (const o of tossables) {
    const p = t < FLOW_T0 ? 0 : clamp((f - o.z) / 24);
    const dz = o.drive ? o.drive * Math.min(t, o.kind === 'car' ? 2.2 : 99) : 0;
    toss(o, p, dz);
  }

  /* far forest */
  const ashK = smooth((t - 7.5) / 3) * 0.85;
  for (let i = 0; i < TREES; i++) {
    const tr = treeData[i];
    const p = t < FLOW_T0 ? 0 : clamp((f - tr.z) / 44);
    dummy.position.set(tr.x, (3 + 6 * tr.s) * (1 - p * 0.75), tr.z + p * 28 * tr.s);
    dummy.rotation.set(p * 1.5 + Math.sin(t * 1.3 + i) * 0.015 * (1 - p), 0, 0);
    dummy.scale.set(tr.s, tr.s, tr.s);
    dummy.updateMatrix(); crownMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(tr.x, 1.5 * tr.s * (1 - p * 0.7), tr.z + p * 10 * tr.s);
    dummy.rotation.set(p * 1.5, 0, 0);
    dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix);
    crownMesh.setColorAt(i, tmpC.copy(treeBase[i]).lerp(ASH, ashK));
  }
  crownMesh.instanceMatrix.needsUpdate = true; trunkMesh.instanceMatrix.needsUpdate = true; crownMesh.instanceColor.needsUpdate = true;

  /* haze */
  const dust = kf(t, [[0, 0.07], [3, 0.12], [4.5, 0.3], [6.5, 0.55], [7.4, 0.8], [10, 0.5], [13, 0.4], [17, 0.4]]);
  hazeLayers.forEach((L, li) => {
    L.pts.material.opacity = dust * (li === 2 ? 0.28 : 0.35);
    L.pts.material.color.set(0xcaa982).lerp(tmpC.set(0x8d8a86), smooth((t - 11) / 3));
    for (let i = 0; i < L.seed.length; i++) {
      const s = L.seed[i];
      L.pos[i * 3] = s[0] + Math.sin(t * 0.4 + s[3]) * 3;
      L.pos[i * 3 + 1] = s[1] + Math.sin(t * 0.3 + s[3] * 2) * 2;
      let z = s[2] + t * (t > 4 ? 6 : 1.5);
      z = ((z + 190) % 200 + 200) % 200 - 190 + 12;
      L.pos[i * 3 + 2] = z;
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
function renderAt(t) {
  t = clamp(t, 0, T_END);
  update(t);
  renderer.render(scene, camera);
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
