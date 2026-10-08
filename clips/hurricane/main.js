import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* "What if a Category 5 hurricane hit Miami?" — deterministic 62 s timeline, pure function of T.
   You are on the 3rd floor at the end of a Miami street, watching it through the window. 1 unit = 1 m. Street runs along -z toward the bay. */
const T_END = 62, T_SCENE = 54.6;
const P = new URLSearchParams(location.search), DPR = +(P.get('dpr') || 1);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
function kf(t, pts) { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; }

/* ---------- storm timeline ---------- */
const T_BREAK = 21.4, T_EYE0 = 36.2, T_EYE1 = 43.2;
// sustained wind (mph)
const WIND = [[0, 16], [5, 24], [8.5, 44], [11, 74], [13.5, 96], [15.5, 112], [17, 131], [18.8, 158], [22, 168], [30, 165], [34, 142], [36, 28], [37.5, 4], [42, 5], [43.8, 92], [45.2, 150], [47.5, 162], [50, 112], [52.6, 44], [54.6, 12]];
const windMph = (T) => kf(T, WIND);
const windDir = (T) => (T < 40 ? -1 : 1); // blows toward -x first, then the back wall blows the other way
const SEA = -1.83, SURGE_MAX = 3.32; // normal tide is 6 ft below the street; Andrew's measured peak surge was 16.9 ft
const waterLevel = (T) => kf(T, [[0, SEA], [23.2, SEA], [27, -0.2], [31.6, 2.0], [35.6, 3.2], [43, 3.32], [47, 3.1], [49.6, 1.4], [51.6, SEA], [62, SEA]]);
const eyeAmt = (T) => sm(T_EYE0 - 1.4, T_EYE0 + 0.8, T) * (1 - sm(T_EYE1 - 0.4, T_EYE1 + 1.0, T));
const rainAmt = (T) => clamp(kf(T, [[0, 0.1], [6, 0.35], [11, 0.75], [18, 1], [35, 1], [37, 0.06], [43, 0.06], [44.6, 1], [50, 0.9], [53, 0.25], [54.6, 0.12]]));

/* ---------- renderer ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const fogCol = new THREE.Color(0x7d8a8c);
scene.fog = new THREE.FogExp2(fogCol, 0.002);
const camera = new THREE.PerspectiveCamera(80, innerWidth / innerHeight, 0.1, 30000);
scene.add(camera);
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const wrap = document.getElementById('sceneWrap');
const accCanvas = document.getElementById('acc'); accCanvas.width = innerWidth * DPR; accCanvas.height = innerHeight * DPR;
const actx = accCanvas.getContext('2d');
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType }));
composer.setSize(innerWidth * DPR, innerHeight * DPR);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
{ const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms['resolution'].value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); composer.addPass(fxaa); }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const hexRGB = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const shade = (h, f) => { const [r, g, b] = hexRGB(h); return `rgb(${Math.min(255, r * f) | 0},${Math.min(255, g * f) | 0},${Math.min(255, b * f) | 0})`; };

/* ---------- sky ---------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x3d4a50) }, hor: { value: new THREE.Color(0x7d8a8c) }, eye: { value: 0 }, sunDir: { value: new THREE.Vector3(0.2, 0.9, -0.2).normalize() }, wall: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top, hor, sunDir; uniform float eye, wall; varying vec3 vP;
    void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.6, h), 0.55));
      vec3 blue = mix(vec3(0.62,0.78,0.95), vec3(0.2,0.45,0.85), smoothstep(0.55, 1.0, h));
      float hole = smoothstep(0.62, 0.9, h) * eye; c = mix(c, blue, hole);
      float s = max(dot(normalize(vP), sunDir), 0.0); c += vec3(1.0,0.92,0.75) * pow(s, 400.0) * 3.0 * eye;
      float ring = smoothstep(0.0, 0.5, h) * (1.0 - smoothstep(0.5, 0.62, h)) * eye; c = mix(c, vec3(0.28,0.3,0.32), ring * 0.7);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 24, 16), skyMat); scene.add(sky);
function cloudTex() {
  const N = 512, c = mkCanvas(N, N), x = c.getContext('2d'), id = x.createImageData(N, N), r = rng(11);
  const g = []; for (let k = 0; k < 6; k++) { const n = 8 << k, a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = r(); g.push([n, a]); }
  const samp = (n, a, u, v) => { const fx = u * n, fy = v * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, s = (i, j) => a[((j % n + n) % n) * n + ((i % n + n) % n)]; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return lerp(lerp(s(x0, y0), s(x0 + 1, y0), sx), lerp(s(x0, y0 + 1), s(x0 + 1, y0 + 1), sx), sy); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v = 0, amp = 0.5, tot = 0; for (let k = 0; k < 6; k++) { v += samp(g[k][0], g[k][1], i / N, j / N) * amp; tot += amp; amp *= 0.58; } v /= tot;
    const cov = smooth((v - 0.3) / 0.3), dk = 0.5 + 0.5 * smooth((v - 0.35) / 0.4), o = (j * N + i) * 4;
    id.data[o] = 255 * dk; id.data[o + 1] = 255 * dk; id.data[o + 2] = 255 * dk; id.data[o + 3] = 255 * cov;
  }
  x.putImageData(id, 0, 0); const t = toTex(c); t.repeat.set(5, 5); return t;
}
const cTex = cloudTex();
const cloudsLo = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshBasicMaterial({ map: cTex, color: 0x59626a, transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
cloudsLo.rotation.x = Math.PI / 2; cloudsLo.position.y = 650; scene.add(cloudsLo);
const cloudsHi = new THREE.Mesh(cloudsLo.geometry, new THREE.MeshBasicMaterial({ map: cTex, color: 0x424a52, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
cloudsHi.rotation.x = Math.PI / 2; cloudsHi.rotation.z = 1.1; cloudsHi.position.y = 1200; scene.add(cloudsHi);
// eyewall: ring of dark cloud around the horizon, only visible in the eye
const wallTex = (() => { const c = mkCanvas(64, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, 'rgba(60,66,70,.95)'); g.addColorStop(0.6, 'rgba(70,76,80,.8)'); g.addColorStop(1, 'rgba(90,96,100,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 256); const r = rng(5); for (let i = 0; i < 1200; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.04)'; x.fillRect(r() * 64, r() * 256, 4, 14); } return toTex(c); })();
wallTex.repeat.set(10, 1);
const eyeWall = new THREE.Mesh(new THREE.CylinderGeometry(3200, 3200, 2600, 48, 1, true), new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
eyeWall.position.y = 1300; scene.add(eyeWall);

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0xb7c4cb, 0x5a5448, 0.9); scene.add(hemi);
const dirL = new THREE.DirectionalLight(0xdfe6ee, 0.8); dirL.position.set(-120, 200, 80); scene.add(dirL);
const flashL = new THREE.PointLight(0x9dffd0, 0, 70, 1.5); scene.add(flashL);

/* ---------- ground, street ---------- */
const STREET_W = 18, ST_Z0 = 12, ST_Z1 = -170;
const asphalt = (() => { const c = mkCanvas(256, 512), x = c.getContext('2d'), r = rng(2); x.fillStyle = '#3a3b3d'; x.fillRect(0, 0, 256, 512); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() * 0.06})`; x.fillRect(r() * 256, r() * 512, 1 + r() * 2, 1 + r() * 2); } x.fillStyle = '#d9b43c'; x.fillRect(125, 0, 3, 512); x.fillRect(131, 0, 3, 512); x.fillStyle = 'rgba(230,230,230,.8)'; for (const lx of [64, 192]) for (let y = 0; y < 512; y += 64) x.fillRect(lx - 1.5, y, 3, 34); const t = toTex(c); t.repeat.set(1, 18); return t; })();
const road = new THREE.Mesh(new THREE.PlaneGeometry(STREET_W - 4, ST_Z0 - ST_Z1), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, (ST_Z0 + ST_Z1) / 2); scene.add(road);
const walkTex = (() => { const c = mkCanvas(128, 128), x = c.getContext('2d'), r = rng(3); x.fillStyle = '#9d9a92'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() * 0.07})`; x.fillRect(r() * 128, r() * 128, 2, 2); } x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, 128, 2); x.fillRect(0, 0, 2, 128); const t = toTex(c); t.repeat.set(2, 60); return t; })();
for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, ST_Z0 - ST_Z1), new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.95 })); sw.position.set(s * 8.4, 0.09, (ST_Z0 + ST_Z1) / 2); scene.add(sw); }
const lot = new THREE.Mesh(new THREE.PlaneGeometry(500, ST_Z0 - ST_Z1 + 40), new THREE.MeshStandardMaterial({ color: 0x6f7268, roughness: 1 })); lot.rotation.x = -Math.PI / 2; lot.position.set(0, -0.03, (ST_Z0 + ST_Z1) / 2 - 20); scene.add(lot);
const bayside = new THREE.Mesh(new THREE.BoxGeometry(80, 0.6, 14), new THREE.MeshStandardMaterial({ color: 0x8c8a82, roughness: 0.95 })); bayside.position.set(0, -0.3, ST_Z1 - 6); scene.add(bayside);

/* ---------- buildings (pastel Miami mid-rises) ---------- */
function facadeTextures(seed, hex, nB, nF) {
  const cw = 96, W = nB * cw, H = nF * cw, c = mkCanvas(W, H), e = mkCanvas(W, H), x = c.getContext('2d'), ex = e.getContext('2d'), r = rng(seed);
  x.fillStyle = shade(hex, 1); x.fillRect(0, 0, W, H); ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 40; i++) { x.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.05})` : `rgba(255,255,255,${r() * 0.06})`; x.fillRect(r() * W, r() * H, 2 + r() * 3, 2 + r() * 3); }
  for (let f = 0; f < nF; f++) {
    x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, f * cw + cw - 5, W, 5); x.fillStyle = 'rgba(255,255,255,.10)'; x.fillRect(0, f * cw + cw - 8, W, 3);
    for (let b = 0; b < nB; b++) {
      const x0 = b * cw + 20, y0 = f * cw + 20, ww = cw - 40, wh = cw - 46, st = r();
      if (st < 0.22) { x.fillStyle = '#74787b'; x.fillRect(x0 - 6, y0 - 4, ww + 12, wh + 10); x.fillStyle = 'rgba(0,0,0,.28)'; for (let yy = y0 - 2; yy < y0 + wh + 6; yy += 5) x.fillRect(x0 - 6, yy, ww + 12, 1.6); continue; } // accordion hurricane shutters
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(x0 - 3, y0 - 3, ww + 6, wh + 8); x.fillStyle = '#eeebe3'; x.fillRect(x0 - 2, y0 - 2, ww + 4, wh + 4);
      const g = x.createLinearGradient(x0, y0, x0 + ww, y0 + wh); g.addColorStop(0, '#8eaabd'); g.addColorStop(1, '#2e4252'); x.fillStyle = g; x.fillRect(x0, y0, ww, wh);
      if (r() < 0.4) { x.fillStyle = 'rgba(232,224,204,.85)'; x.fillRect(x0, y0, ww * (0.35 + r() * 0.3), wh); }
      x.fillStyle = '#eeebe3'; x.fillRect(x0 + ww / 2 - 1.5, y0, 3, wh);
      if (r() < 0.3) { x.fillStyle = 'rgba(40,40,44,.75)'; x.fillRect(x0 - 8, y0 + wh + 6, ww + 16, 3); for (let k = 0; k < 8; k++) x.fillRect(x0 - 8 + k * (ww + 14) / 7, y0 + wh - 4, 2, 10); }
      if (r() < 0.34) { ex.fillStyle = r() < 0.5 ? '#ffd9a0' : '#fff0cf'; ex.fillRect(x0, y0, ww, wh); }
    }
  }
  return { map: toTex(c), emissiveMap: toTex(e), W, H };
}
const PASTELS = [0xf0b6c0, 0xf3dc9a, 0xa9d8cf, 0xf4efe6, 0xe9c19b, 0xb7cde8, 0xf2a99b, 0xd8d0ea];
const bldgs = [], blown = [];
const br = rng(1234), blownQuad = [];
{
  for (const side of [-1, 1]) {
    let z = 4; let k = 0;
    while (z > -150) {
      const len = 18 + br() * 14, gap = br() < 0.3 ? 8 : 2.5, nF = 4 + Math.floor(br() * 9), nB = Math.max(3, Math.round(len / 3.2)), hex = PASTELS[Math.floor(br() * PASTELS.length)], depth = 22 + br() * 14;
      const fz = facadeTextures(100 + k * 7 + (side > 0 ? 500 : 0), hex, nB, nF), h = nF * 3.4;
      const mat = new THREE.MeshStandardMaterial({ map: fz.map, emissiveMap: fz.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.85 });
      const mats = [mat, mat, new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.9 }), mat, mat, mat];
      const m = new THREE.Mesh(new THREE.BoxGeometry(depth, h, len), mats);
      m.position.set(side * (10 + depth / 2), h / 2, z - len / 2); scene.add(m);
      const rf = new THREE.Mesh(new THREE.BoxGeometry(depth * 0.5, 2.2, len * 0.45), new THREE.MeshStandardMaterial({ color: 0x777b7e })); rf.position.set(side * (10 + depth * 0.5), h + 1.1, z - len / 2); scene.add(rf);
      const b = { m, mat, h, len, depth, side, z0: z, nB, nF, tOff: 13 + br() * 4.5 };
      bldgs.push(b);
      // windows that blow out once the wind is past ~120 mph
      const nBlown = 10 + Math.floor(br() * 14);
      for (let q = 0; q < nBlown; q++) { const bi = Math.floor(br() * nB), fi = 1 + Math.floor(br() * (nF - 1)); blownQuad.push({ side, x: side * 10.03, y: h - (fi + 0.5) * 3.4 + 0.3, z: z - (bi + 0.5) * (len / nB), w: len / nB * 0.5, hh: 1.5, t: 16 + br() * 8 + (side > 0 ? 1 : 0) + (br() < 0.2 ? 28 : 0), flap: br() < 0.5, p: br() * 6 }); }
      z -= len + gap; k++;
    }
  }
}
const qGeo = new THREE.PlaneGeometry(1, 1);
const blownIM = new THREE.InstancedMesh(qGeo, new THREE.MeshBasicMaterial({ color: 0x0b0c0d, side: THREE.DoubleSide }), blownQuad.length); scene.add(blownIM);
const curtains = blownQuad.filter((q) => q.flap);
const curIM = new THREE.InstancedMesh(qGeo, new THREE.MeshStandardMaterial({ color: 0xe7e1d3, side: THREE.DoubleSide, roughness: 0.9 }), curtains.length); scene.add(curIM);
// distant skyline across the bay and flat horizon
{ const r = rng(4); for (let i = 0; i < 26; i++) { const h = 30 + r() * 110; const m = new THREE.Mesh(new THREE.BoxGeometry(20 + r() * 40, h, 20 + r() * 40), new THREE.MeshStandardMaterial({ color: 0x8b9396, roughness: 1 })); m.position.set(-900 + i * 70 + r() * 30, h / 2 - 3, -2600 - r() * 400); scene.add(m); } }

/* ---------- palms ---------- */
const frondTex = (() => { const c = mkCanvas(128, 256), x = c.getContext('2d'); x.clearRect(0, 0, 128, 256); x.strokeStyle = '#4b5a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(64, 256); x.lineTo(64, 0); x.stroke(); const r = rng(9); for (let i = 0; i < 40; i++) { const y = 250 - i * 6, len = 52 * (1 - Math.abs(0.5 - (y / 256)) * 0.3) * (0.45 + 0.55 * Math.sin((1 - y / 256) * 3 + 0.4)); for (const s of [-1, 1]) { x.strokeStyle = `hsl(${88 + r() * 16},${44 + r() * 14}%,${24 + r() * 12}%)`; x.lineWidth = 2.2; x.beginPath(); x.moveTo(64, y); x.quadraticCurveTo(64 + s * len * 0.6, y - 4, 64 + s * len, y + 14 + r() * 8); x.stroke(); } } return toTex(c); })();
const frondGeo = (() => { const g = new THREE.PlaneGeometry(1.5, 4.0, 1, 6); g.translate(0, 2.0, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -0.18 * y * y / 4); p.setY(i, y * 0.97); } g.computeVertexNormals(); return g; })();
const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.95 });
const palms = [], pr = rng(77);
for (const side of [-1, 1]) for (let z = 1, i = 0; z > -150; z -= 11 + pr() * 6, i++) {
  const H = 8.5 + pr() * 5, root = new THREE.Group(); root.position.set(side * (8.0 + pr() * 0.8), 0.15, z); scene.add(root);
  const segs = [], N = 4; let parent = root;
  for (let s = 0; s < N; s++) { const g = new THREE.Group(); g.position.y = s === 0 ? 0 : H / N; parent.add(g); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - s * 0.025, 0.23 - s * 0.025, H / N, 8), trunkMat); m.position.y = H / (2 * N); g.add(m); segs.push(g); parent = g; }
  const crown = new THREE.Group(); crown.position.y = H / N; parent.add(crown);
  const fronds = []; for (let f = 0; f < 12; f++) { const m = new THREE.Mesh(frondGeo, frondMat), a = (f / 12) * Math.PI * 2 + pr() * 0.3; m.rotation.order = 'YXZ'; m.rotation.y = a; m.rotation.x = 0.5 + pr() * 0.4; m.scale.setScalar(0.9 + pr() * 0.4); crown.add(m); fronds.push({ m, a, p: pr() * 6, x0: m.rotation.x }); }
  palms.push({ root, segs, crown, fronds, H, side, z, snap: pr() < 0.28 ? 17.5 + pr() * 6 : null, seed: pr() * 10 });
}

/* ---------- poles / lights / signs ---------- */
const poleMat = new THREE.MeshStandardMaterial({ color: 0x5b5047, roughness: 0.9 }), metal = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.5, metalness: 0.5 });
const poles = [];
for (const side of [-1, 1]) for (let z = -6, i = 0; z > -150; z -= 38, i++) {
  const g = new THREE.Group(); g.position.set(side * 9.3, 0, z); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 11, 8), poleMat); p.position.y = 5.5; g.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.15), poleMat); arm.position.set(0, 10.3, 0); g.add(arm);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), metal); tr.position.set(-side * 0.8, 9.2, 0); g.add(tr);
  scene.add(g); poles.push({ g, side, z, tf: 12.5 + (i * 1.7 + (side > 0 ? 0.9 : 0)) % 9 });
}
// power lines across the street (sag + sway)
const lineMat = new THREE.LineBasicMaterial({ color: 0x151515 }); const lines = [];
for (let i = 0; i < poles.length; i++) { const a = poles[i], b = poles.find((q) => q.side !== a.side && Math.abs(q.z - a.z) < 20); if (b && a.side < 0) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 12), 3)); const l = new THREE.Line(geo, lineMat); l.frustumCulled = false; scene.add(l); lines.push({ l, a, b }); } }
// traffic signal at the T end, swinging
const sig = new THREE.Group(); { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 8), metal); bar.position.set(0, 0, 0); sig.add(bar); const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x2b2d30 })); box.position.set(0, -0.9, -2); sig.add(box); const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0xff3b2a })); lamp.position.set(0.0, -0.55, -2.21); sig.add(lamp); sig.position.set(0, 6.4, -10); scene.add(sig); }

/* ---------- parked cars (float and drift in the surge) ---------- */
const cars = [], cr = rng(555), CAR_COLS = [0xb8bcc2, 0x1d2a3c, 0x7a1f26, 0xe8e5dd, 0x2c2e31, 0x4d6a8c, 0xc4a14a, 0x2f5a3f];
for (let i = 0; i < 26; i++) {
  const side = i % 2 ? 1 : -1, z0 = -5 - Math.floor(i / 2) * 9.5 - cr() * 2, g = new THREE.Group(), col = CAR_COLS[Math.floor(cr() * CAR_COLS.length)];
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 4.5), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 })); body.position.y = 0.65; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.6, 2.3), new THREE.MeshStandardMaterial({ color: 0x24313b, roughness: 0.2, metalness: 0.4 })); cab.position.set(0, 1.25, 0.2); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 2.2), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.3 })); roof.position.set(0, 1.58, 0.2); g.add(roof);
  for (const [wx, wz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12), new THREE.MeshStandardMaterial({ color: 0x151515 })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.34, wz); g.add(w); }
  scene.add(g); cars.push({ g, side, x0: side * 5.4, z0, ex: (cr() - 0.5) * 22, ez: 14 + cr() * 24 + (i % 5) * 3, eyaw: (cr() - 0.5) * 3.4, etilt: (cr() - 0.5) * 0.9, tf: 26.5 + cr() * 3.5, st: (cr() < 0.2 ? 1 : 0) });
}

/* ---------- debris ---------- */
const DN = 150, dr = rng(901);
const dGeo = [new THREE.BoxGeometry(2.4, 0.05, 1.2), new THREE.BoxGeometry(0.35, 0.12, 0.25), frondGeo, new THREE.BoxGeometry(0.5, 0.7, 0.5), new THREE.BoxGeometry(1.4, 0.9, 0.04)];
const dMat = [0xcbb487, 0xb5523b, 0x6c8a3a, 0x3d6a8c, 0xe9e6dc];
const dIM = dGeo.map((g, k) => { const m = new THREE.InstancedMesh(g, k === 2 ? frondMat : new THREE.MeshStandardMaterial({ color: dMat[k], roughness: 0.8 }), DN); m.frustumCulled = false; scene.add(m); return m; });
const debris = []; for (let i = 0; i < DN * 5; i++) { const k = i % 5, ph = dr() < 0.72 ? 0 : 1; debris.push({ k, idx: Math.floor(i / 5), t0: ph === 0 ? 8.5 + dr() * 28 : 43.4 + dr() * 7, life: 1.3 + dr() * 1.8, y0: 2 + dr() * 26, z0: 4 - dr() * 120, dy: (dr() - 0.5) * 4, spin: [dr() * 8, dr() * 8, dr() * 8], ph, sc: k === 4 ? 1 : 0.8 + dr() * 0.6 }); }
const dummy = new THREE.Object3D();
// glass shards that come through the window when it breaks
const SHN = 60, shIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.12), new THREE.MeshBasicMaterial({ color: 0xbcd4de, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), SHN); shIM.frustumCulled = false; scene.add(shIM);
const sh = []; for (let i = 0; i < SHN; i++) sh.push({ vx: (dr() - 0.5) * 5, vy: (dr() - 0.3) * 4, vz: 3 + dr() * 9, s: dr() * 6 });

/* ---------- water ---------- */
const waterMat = new THREE.ShaderMaterial({
  transparent: false, fog: false,
  uniforms: { uT: { value: 0 }, uLevel: { value: SEA }, uSky: { value: new THREE.Color(0x6b7a80) }, uFog: { value: new THREE.Color(0x7d8a8c) }, uDens: { value: 0.002 }, uAmp: { value: 1 }, uFlow: { value: 0 }, uWind: { value: -1 }, uCam: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uT, uLevel, uDens, uAmp, uFlow, uWind; uniform vec3 uSky, uFog, uCam; varying vec3 vW;
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += vn(p)*a; p = p*2.03 + 7.1; a *= 0.5; } return s; }
    void main(){
      vec2 p = vW.xz;
      vec2 q = p*0.06 + vec2(uWind*uT*0.9, uFlow*uT*0.35);
      float e = 0.6; float h0 = fbm(q), hx = fbm(q + vec2(e,0.0)*0.06), hz = fbm(q + vec2(0.0,e)*0.06);
      vec2 q2 = p*0.3 + vec2(uWind*uT*2.2, uFlow*uT*0.9); float c0 = fbm(q2), cx = fbm(q2+vec2(0.12,0.0)), cz = fbm(q2+vec2(0.0,0.12));
      vec3 n = normalize(vec3(-(hx-h0)*6.0*uAmp - (cx-c0)*1.6*uAmp, 1.0, -(hz-h0)*6.0*uAmp - (cz-c0)*1.6*uAmp));
      vec3 V = normalize(uCam - vW); float fr = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
      vec3 deep = vec3(0.07, 0.075, 0.055), shallow = vec3(0.17, 0.15, 0.1);
      vec3 col = mix(deep, shallow, smoothstep(0.35, 0.75, h0));
      col = mix(col, uSky*0.55, clamp(fr*0.5 + 0.03, 0.0, 1.0));
      float foam = smoothstep(0.78, 0.95, fbm(p*0.45 + vec2(uWind*uT*1.6, uFlow*uT*0.8)) + h0*0.25) * clamp(uAmp,0.0,1.0);
      col = mix(col, vec3(0.8,0.82,0.8), foam*0.5);
      float d = length(vW - uCam); float f = 1.0 - exp(-pow(d*uDens, 2.0)); col = mix(col, uFog, clamp(f,0.0,1.0));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), waterMat); water.rotation.x = -Math.PI / 2; scene.add(water);
// floating junk once the street is flooded
const FN = 30, fr = rng(321), floaters = [];
const fGeo = [new THREE.BoxGeometry(2.4, 0.08, 1.2), new THREE.CylinderGeometry(0.15, 0.15, 3.5, 7), new THREE.BoxGeometry(0.55, 0.8, 0.55), frondGeo];
for (let i = 0; i < FN; i++) { const k = i % 4, m = new THREE.Mesh(fGeo[k], k === 3 ? frondMat : new THREE.MeshStandardMaterial({ color: [0xcbb487, 0x7a6a52, 0x3d6a8c][k] || 0x6c8a3a, roughness: 0.9 })); scene.add(m); floaters.push({ m, k, x: (fr() - 0.5) * 16, z: -8 - fr() * 120, ez: 20 + fr() * 30, ph: fr() * 6, yaw: fr() * 6 }); }

/* ---------- rain ---------- */
const RN = 9000;
const rainGeo = (() => { const g = new THREE.BufferGeometry(), rr = rng(42), seed = new Float32Array(RN * 6), end = new Float32Array(RN * 2); for (let i = 0; i < RN; i++) { const a = rr(), b = rr(), c = rr(); for (let v = 0; v < 2; v++) { seed.set([a, b, c], (i * 2 + v) * 3); end[i * 2 + v] = v; } } g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 6), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1)); return g; })();
const rainMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: { uT: { value: 0 }, uVel: { value: new THREE.Vector3() }, uInt: { value: 1 }, uCam: { value: new THREE.Vector3() }, uGlass: { value: 1 }, uFog: { value: new THREE.Color(0xaab4b8) } },
  vertexShader: `attribute vec3 aSeed; attribute float aEnd; uniform float uT; uniform vec3 uVel, uCam; varying vec3 vW; varying float vA;
    void main(){ vec3 box = vec3(120.0, 50.0, 110.0); vec3 p = aSeed*box + uVel*uT; p = mod(p, box); vec3 w = vec3(uCam.x - 60.0 + p.x, uCam.y - 14.0 + p.y, uCam.z + 12.0 - p.z);
      vec3 d = normalize(uVel); w -= d * aEnd * (2.6 + aSeed.x*3.4); vW = w; vA = 1.0 - smoothstep(30.0, 110.0, length(w - uCam)); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
  fragmentShader: `uniform float uInt, uGlass; uniform vec3 uFog; varying vec3 vW; varying float vA; void main(){ if (uGlass > 0.5 && vW.z > 4.3) discard; gl_FragColor = vec4(uFog, 0.42 * uInt * (0.35 + vA)); }`,
});
const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);
// far rain sheets for depth
const sheetTex = (() => { const c = mkCanvas(128, 256), x = c.getContext('2d'), r = rng(8); for (let i = 0; i < 420; i++) { x.strokeStyle = `rgba(210,220,225,${0.06 + r() * 0.12})`; x.lineWidth = 1; const xx = r() * 128, yy = r() * 256; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - 3, yy + 34); x.stroke(); } const t = toTex(c); t.repeat.set(5, 2); return t; })();
const sheets = [].map((z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(130, 70), new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true, depthWrite: false, fog: false, opacity: 0 })); m.position.set(0, 20, z); scene.add(m); return m; });

/* ---------- the room: window frame, curtains ---------- */
const room = new THREE.Group(); scene.add(room);
const WZ = 4.4, CAM = new THREE.Vector3(0, 9.7, 6.3);
{
  const wallM = new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.95 });
  const sh0 = new THREE.Shape(); sh0.moveTo(-8, 5); sh0.lineTo(8, 5); sh0.lineTo(8, 14); sh0.lineTo(-8, 14); sh0.closePath(); const hole = new THREE.Path(); hole.moveTo(-1.2, 8.0); hole.lineTo(1.2, 8.0); hole.lineTo(1.2, 11.3); hole.lineTo(-1.2, 11.3); hole.closePath(); sh0.holes.push(hole);
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(sh0), wallM); wall.position.z = WZ; room.add(wall);
  const frameM = new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.6, metalness: 0.3 });
  const fb = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameM); m.position.set(x, y, z); room.add(m); };
  fb(2.6, 0.14, 0.2, 0, 7.97, WZ); fb(2.6, 0.14, 0.2, 0, 11.33, WZ); fb(0.14, 3.4, 0.2, -1.22, 9.65, WZ); fb(0.14, 3.4, 0.2, 1.22, 9.65, WZ); fb(0.09, 3.4, 0.16, 0, 9.65, WZ); fb(2.4, 0.09, 0.16, 0, 9.85, WZ);
  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ color: 0x4d4238, roughness: 0.8 })); floorM.rotation.x = -Math.PI / 2; floorM.position.set(0, 8.0, WZ + 5); room.add(floorM);
  const ceilM = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ color: 0x8c877f, roughness: 0.95 })); ceilM.rotation.x = Math.PI / 2; ceilM.position.set(0, 11.3, WZ + 5); room.add(ceilM);
  for (const s of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.3), wallM); w2.rotation.y = -s * Math.PI / 2; w2.position.set(s * 3.1, 9.65, WZ + 5); room.add(w2); }
}
const curMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.95, side: THREE.DoubleSide });
const curL = [-1, 1].map((s) => { const g = new THREE.PlaneGeometry(0.85, 3.4, 8, 12); const m = new THREE.Mesh(g, curMat); m.position.set(s * 1.05, 9.65, WZ + 0.15); room.add(m); return { m, s, base: g.attributes.position.array.slice() }; });

/* ---------- camera ---------- */
const shakeAmt = (T) => (windMph(T) / 165) * 0.012 * (1 - 0.9 * eyeAmt(T));
function camPose(T, out) {
  let x = CAM.x, y = CAM.y, z = CAM.z, yaw = 0, pitch = -0.17, roll = 0;
  const s = shakeAmt(T), tb = T - T_BREAK;
  x += Math.sin(T * 17.3) * s + Math.sin(T * 5.1) * s * 0.7; y += Math.cos(T * 13.7) * s; yaw = Math.sin(T * 0.6) * 0.012 + Math.sin(T * 11.3) * s * 0.4; roll = Math.sin(T * 9.1) * s * 0.5;
  if (tb > 0 && tb < 1.4) { const k = Math.exp(-tb * 3.2); x += Math.sin(tb * 60) * 0.05 * k; y += Math.cos(tb * 48) * 0.05 * k; yaw += Math.sin(tb * 52) * 0.02 * k; z += 0.0; }
  pitch += kf(T, [[0, 0.02], [6, 0], [20, 0], [36, -0.01], [40, 0.05], [44, 0], [54, -0.02]]);
  out.set(x, y, z); return { yaw, pitch, roll };
}

/* ---------- update ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _cp = new THREE.Vector3(), tmpC = new THREE.Color();
function update(T) {
  const A = camPose(T, _cp); camera.position.copy(_cp); _e.set(A.pitch, A.yaw, A.roll); camera.quaternion.setFromEuler(_e);
  const W = windMph(T), wd = windDir(T), WM = W * 0.447, eye = eyeAmt(T), rainI = rainAmt(T), lvl = waterLevel(T), wn = clamp(W / 165);
  // sky, fog, light: grey and getting darker, then the eye
  const dark = kf(T, [[0, 0.0], [10, 0.25], [18, 0.5], [30, 0.55], [36, 0.45], [44, 0.6], [51, 0.45], [54.6, 0.12]]);
  skyMat.uniforms.top.value.setRGB(0.3 - dark * 0.16, 0.4 - dark * 0.22, 0.5 - dark * 0.28); skyMat.uniforms.hor.value.setRGB(0.6 - dark * 0.3, 0.66 - dark * 0.34, 0.68 - dark * 0.36);
  skyMat.uniforms.eye.value = eye; sky.position.copy(camera.position);
  const dens = lerp(kf(T, [[0, 0.0014], [8, 0.002], [14, 0.0045], [20, 0.0105], [34, 0.0105], [36.5, 0.0022], [43, 0.0022], [44.8, 0.0075], [50, 0.007], [53, 0.003], [54.6, 0.0022]]), 0.0006, eye);
  scene.fog.density = dens; fogCol.copy(skyMat.uniforms.hor.value).lerp(tmpC.setRGB(0.66, 0.7, 0.68), eye * 0.5); scene.fog.color.copy(fogCol);
  cloudsLo.position.set(camera.position.x, 650, camera.position.z); cloudsHi.position.set(camera.position.x, 1200, camera.position.z);
  cTex.offset.set((T * (0.004 + wn * 0.02) * -wd) % 1, (T * 0.002) % 1);
  cloudsLo.material.opacity = 0.95 * (1 - eye * 0.85); cloudsHi.material.opacity = 0.9 * (1 - eye * 0.9); cloudsLo.material.color.setRGB(0.36 - dark * 0.12, 0.4 - dark * 0.13, 0.42 - dark * 0.14);
  eyeWall.material.opacity = eye; eyeWall.position.set(camera.position.x, 1300, camera.position.z);
  hemi.intensity = lerp(1.05 - dark * 0.45, 1.3, eye); dirL.intensity = lerp(0.55, 3.4, eye); dirL.color.lerpColors(new THREE.Color(0xdfe6ee), new THREE.Color(0xfff0d0), eye);
  dirL.position.set(-90, 160 + 120 * eye, -40);
  // building lights go out one by one; blown windows; transformer flashes
  for (const b of bldgs) b.mat.emissiveIntensity = lerp(0.95, 0, smooth((T - b.tOff) / 0.5));
  let fl = 0; for (const p of poles) { const d = T - p.tf; if (d > 0 && d < 0.5) { const f = (Math.sin(d * 90) > 0 ? 1 : 0.2) * (1 - d / 0.5); if (f > fl) { fl = f; flashL.position.set(p.g.position.x * 0.5, 10, p.z); } } }
  for (const p of poles) { const d = T - p.tf; if (d > 0 && d < 0.5) { /* green-blue arc glow handled by light */ } }
  flashL.intensity = fl * 220; scene.background = null;
  blownQuad.forEach((q, i) => { const on = T >= q.t && !(q.t > 40 && false); dummy.position.set(q.x, q.y, q.z); dummy.rotation.set(0, Math.PI / 2, 0); dummy.scale.set(on ? q.w : 0.0001, on ? q.hh : 0.0001, 1); dummy.updateMatrix(); blownIM.setMatrixAt(i, dummy.matrix); });
  blownIM.instanceMatrix.needsUpdate = true;
  curtains.forEach((q, i) => { const on = T >= q.t + 0.4; const f = Math.sin(T * (7 + (q.p % 3)) + q.p) * 0.5 + 0.5; dummy.position.set(q.x + (-q.side) * (0.1 + f * 0.9), q.y + 0.2, q.z); dummy.rotation.set(0, Math.PI / 2 + (-q.side) * f * 0.8, 0.3 * Math.sin(T * 5 + q.p)); dummy.scale.set(on ? 0.7 : 0.0001, on ? 1.6 : 0.0001, 1); dummy.updateMatrix(); curIM.setMatrixAt(i, dummy.matrix); });
  curIM.instanceMatrix.needsUpdate = true;
  // palms bend, flutter, some snap
  for (const p of palms) {
    const g = Math.sin(T * 1.9 + p.seed) * 0.5 + Math.sin(T * 3.7 + p.seed * 2) * 0.3, bend = (0.05 + wn * 0.55 + g * 0.08 * wn) * -wd, droop = wn * 0.9;
    p.segs.forEach((sg, i) => { sg.rotation.z = bend * (i === 0 ? 0.15 : 0.32); });
    p.fronds.forEach((f) => { const fl = Math.sin(T * (8 + wn * 14) + f.p) * 0.08 * (0.3 + wn); f.m.rotation.x = f.x0 + droop * 0.9 + fl; f.m.rotation.z = Math.sin(T * (6 + wn * 10) + f.p * 1.7) * 0.18 * wn + bend * 0.6 * Math.cos(f.a); });
    p.root.visible = true; p.crown.visible = true;
    if (p.snap !== null && T > p.snap) { const u = clamp((T - p.snap) / 2.0), fall = u * u * 1.35; p.segs[2].rotation.z = bend * 0.32 + -wd * fall; p.segs[3].rotation.z = bend * 0.32 + -wd * fall * 0.6; p.root.position.y = 0.15; if (T - p.snap > 3.5) p.root.position.y = 0.15; }
  }
  // power lines
  for (const l of lines) { const a = l.a, b = l.b, pos = l.l.geometry.attributes.position; for (let i = 0; i < 12; i++) { const u = i / 11, x = lerp(a.g.position.x, b.g.position.x, u), sag = Math.sin(u * Math.PI) * (0.9 + wn * 0.5) + Math.sin(T * 6 + u * 9 + a.z) * 0.25 * wn * Math.sin(u * Math.PI); pos.setXYZ(i, x, 10.3 - sag, lerp(a.z, b.z, u) + Math.sin(T * 4 + a.z) * 0.4 * wn * Math.sin(u * Math.PI)); } pos.needsUpdate = true; }
  sig.rotation.z = Math.sin(T * 5) * 0.3 * wn; sig.rotation.x = Math.sin(T * 3.1) * 0.15 * wn;
  // cars float and drift once the street is flooded
  const street = lvl; cars.forEach((c) => {
    const depth = street, fl = smooth((T - c.tf) / 3.0) * (depth > 0.5 ? 1 : 0), drift = smooth((T - c.tf) / (50 - c.tf)) * (T < 51.6 ? 1 : 1);
    const z = c.z0 + c.ez * drift, x = c.x0 + c.ex * drift, y = fl ? Math.max(0, depth - 0.5) + Math.sin(T * 2 + c.z0) * 0.12 : 0;
    c.g.position.set(x, y, Math.min(z, 2)); c.g.rotation.set(c.etilt * drift * 0.7 + Math.sin(T * 1.7 + c.z0) * 0.04 * fl, c.eyaw * drift, c.etilt * drift * 0.5 + Math.sin(T * 1.3 + c.z0) * 0.05 * fl);
  });
  // debris: blown across the street in the wind direction
  const dm = new THREE.Matrix4();
  const counts = [0, 0, 0, 0, 0];
  debris.forEach((d) => {
    const IM = dIM[d.k]; const u = (T - d.t0) / d.life;
    if (u < 0 || u > 1 || (d.ph === 0 && T > 37.5) || (d.ph === 1 && T < 43.4)) { dummy.position.set(0, -100, 0); dummy.scale.setScalar(0.0001); } else {
      const dirx = d.ph === 0 ? -1 : 1, x = lerp(dirx * -34, dirx * 34, u), y = d.y0 + d.dy * u - 7 * u * u;
      dummy.position.set(x, y, d.z0 + Math.sin(u * 6 + d.t0) * 2); dummy.rotation.set(u * d.spin[0], u * d.spin[1], u * d.spin[2]); dummy.scale.setScalar(d.sc * (d.k === 2 ? 1 : 1));
    }
    dummy.updateMatrix(); IM.setMatrixAt(d.idx, dummy.matrix);
  });
  dIM.forEach((m) => (m.instanceMatrix.needsUpdate = true));
  // glass shards fly into the room when the window breaks
  { const tb = T - T_BREAK; for (let i = 0; i < SHN; i++) { const s = sh[i]; if (tb < 0 || tb > 1.6) { dummy.position.set(0, -100, 0); dummy.scale.setScalar(0.0001); } else { dummy.position.set(s.vx * tb * 0.8, 9.6 + s.vy * tb - 4 * tb * tb, WZ + s.vz * tb * 0.55 + 0.2); dummy.rotation.set(tb * s.s, tb * s.s * 0.7, 0); dummy.scale.setScalar(1 - tb / 1.8); } dummy.updateMatrix(); shIM.setMatrixAt(i, dummy.matrix); } shIM.instanceMatrix.needsUpdate = true; }
  // water
  water.position.y = lvl; waterMat.uniforms.uT.value = T; waterMat.uniforms.uLevel.value = lvl; waterMat.uniforms.uSky.value.copy(skyMat.uniforms.hor.value).multiplyScalar(0.9); waterMat.uniforms.uFog.value.copy(fogCol); waterMat.uniforms.uDens.value = scene.fog.density; waterMat.uniforms.uAmp.value = lerp(0.45 + wn * 1.0, 0.35, eye); waterMat.uniforms.uFlow.value = lvl > -1.5 && lvl < 3.2 ? 1.6 : 0.4; waterMat.uniforms.uWind.value = wd; waterMat.uniforms.uCam.value.copy(camera.position);
  floaters.forEach((f) => { const after = T >= 51.6, on = (lvl > 0.2 && T < 51.5) || after; f.m.visible = on; if (!on) return; if (after) { f.m.position.set(f.x * 0.5, 0.1 + (f.k === 1 ? 0.15 : 0), Math.min(f.z + f.ez, 3)); f.m.rotation.set(f.k === 1 ? Math.PI / 2 : 0.1, f.yaw, 0); return; } const dr2 = smooth((T - 28) / 22); f.m.position.set(f.x + Math.sin(T * 0.4 + f.ph) * 1.2, lvl + 0.05 + Math.sin(T * 1.6 + f.ph) * 0.08, Math.min(f.z + f.ez * dr2, 3)); f.m.rotation.set(f.k === 1 ? Math.PI / 2 : 0, f.yaw + T * 0.08, f.k === 1 ? 0 : 0.1 * Math.sin(T + f.ph)); });
  // rain
  rainMat.uniforms.uT.value = T; rainMat.uniforms.uVel.value.set(wd * (WM * 0.62), -16, 0.0); rainMat.uniforms.uInt.value = rainI; rainMat.uniforms.uCam.value.copy(camera.position); rainMat.uniforms.uGlass.value = T < T_BREAK ? 1 : 0; rainMat.uniforms.uFog.value.copy(fogCol).lerp(tmpC.setRGB(0.75, 0.8, 0.82), 0.5);
  sheets.forEach((m, i) => { m.material.opacity = rainI * 0.65 * (1 - eye); sheetTex.offset.set((T * 0.7 * wd * 0.2) % 1, (-T * 2.4) % 1); m.position.x = camera.position.x; });
  // curtains whip about, hard once the glass is gone
  curL.forEach((c) => { const pos = c.m.geometry.attributes.position, strong = T > T_BREAK ? 1 : 0.12 * wn, A = c.base; for (let i = 0; i < pos.count; i++) { const x = A[i * 3], y = A[i * 3 + 1], f = (3.4 / 2 - y) / 3.4; const sway = Math.sin(T * 9 + y * 2.6 + c.s * 2) * 0.3 * strong * (0.4 + f) + Math.sin(T * 17 + x * 3) * 0.08 * strong; pos.setXYZ(i, x + (-wd) * sway * 0.4 * c.s * c.s * 0 + sway * 0.25 * -c.s, y, A[i * 2 + i + 2] + Math.abs(sway) * 1.2 * (T > T_BREAK ? 1 : 0.2) + (T > T_BREAK ? Math.abs(Math.sin(T * 7 + y)) * 0.2 * strong : 0)); } pos.needsUpdate = true; c.m.geometry.computeVertexNormals(); });
}

/* ---------- raindrops on the glass (2D overlay) ---------- */
const glassC = document.getElementById('glass'); glassC.width = 540 * Math.min(DPR, 2); glassC.height = 960 * Math.min(DPR, 2);
const gx = glassC.getContext('2d');
const gdr = rng(31), drops = []; for (let i = 0; i < 160; i++) drops.push({ x: gdr(), y: gdr(), r: 2 + gdr() * 5, v: 0.02 + gdr() * 0.08, t0: gdr() * 50, len: 20 + gdr() * 80 });
function drawGlass(T) {
  const W = glassC.width, H = glassC.height, k = glassC.width / 540;
  gx.clearRect(0, 0, W, H); gx.save(); gx.beginPath(); gx.rect(W * 0.07, H * 0.06, W * 0.86, H * 0.8); gx.clip();
  if (T >= T_BREAK + 0.05 && T < T_SCENE) {
    // broken edge: a few shards stuck in the frame, drawn once the pane is gone
    gx.fillStyle = 'rgba(200,220,230,.55)'; const rr = rng(66); for (let i = 0; i < 9; i++) { const x0 = rr() * W, y0 = (rr() < 0.5 ? 0.1 : 0.8) * H + (rr() - 0.5) * 20; gx.beginPath(); gx.moveTo(x0, y0); gx.lineTo(x0 + 8 * k, y0 + 24 * k * rr()); gx.lineTo(x0 - 6 * k, y0 + 14 * k); gx.fill(); }
    gx.restore(); return;
  }
  if (T >= T_SCENE) { gx.restore(); return; }
  const intens = rainAmt(T) * 0.95 + 0.05;
  for (const d of drops) {
    if (d.t0 > T * 0.6 + 4 && intens < 0.3) continue;
    const slide = ((T * d.v * 14 * (0.4 + intens) + d.t0) % 1.25), y = ((d.y + slide) % 1.05) * H, x = (d.x + 0.04 * Math.sin(d.t0 * 7 + y * 0.01) * (windMph(T) / 165) * -windDir(T)) * W, r = d.r * k * (0.6 + 0.8 * intens);
    gx.strokeStyle = 'rgba(210,225,235,.14)'; gx.lineWidth = r * 0.7; gx.beginPath(); gx.moveTo(x, y - d.len * k * intens); gx.lineTo(x, y); gx.stroke();
    const g = gx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.2); g.addColorStop(0, 'rgba(235,245,250,.55)'); g.addColorStop(0.55, 'rgba(160,180,190,.18)'); g.addColorStop(1, 'rgba(20,30,35,.25)'); gx.fillStyle = g; gx.beginPath(); gx.ellipse(x, y, r, r * 1.35, 0, 0, 6.283); gx.fill();
  }
  // an impact crack in the instant before it blows in
  const tc = T_BREAK - 0.28; if (T > tc && T < T_BREAK + 0.05) { const a = (T - tc) / 0.33, rr = rng(5); gx.strokeStyle = `rgba(235,245,250,${0.35 + 0.5 * a})`; gx.lineWidth = 1.6 * k; for (let i = 0; i < 26; i++) { const ang = rr() * 6.283, len = (0.1 + rr() * 0.5) * W * a; gx.beginPath(); let px = W * 0.58, py = H * 0.42; gx.moveTo(px, py); for (let s = 1; s <= 4; s++) { px += Math.cos(ang + (rr() - 0.5) * 0.5) * len / 4; py += Math.sin(ang + (rr() - 0.5) * 0.5) * len / 4; gx.lineTo(px, py); } gx.stroke(); } } gx.restore();
}

/* ---------- HUD / captions / facts / end ---------- */
const elTitle = document.getElementById('title'), hud = document.getElementById('hud'), cap = document.getElementById('caption'), end = document.getElementById('end'), flash = document.getElementById('flash'), dip = document.getElementById('dip'), tag = document.getElementById('tag'), facts = document.getElementById('facts');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const catOf = (w) => (w < 39 ? 'Breezy · rain bands' : w < 74 ? 'Tropical storm' : w < 96 ? 'Category 1' : w < 111 ? 'Category 2' : w < 130 ? 'Category 3 · major' : w < 157 ? 'Category 4 · major' : 'Category 5');
const surgeFt = (T) => Math.max(0, (waterLevel(T) - SEA) / 0.3048);
const BEATS = [
  { a: 4.4, b: 36.0, label: 'Sustained wind', value: (T) => Math.round(windMph(T)) + ' mph', sub: (T) => catOf(windMph(T)) },
  { a: 24.4, b: 35.9, label: 'Storm surge', value: (T) => surgeFt(T).toFixed(1) + ' ft', sub: () => 'Above normal tide · the street sits about 6 ft up', hi: true },
  { a: T_EYE0 + 0.5, b: T_EYE1 - 0.2, label: 'The eye', value: () => 'Calm', sub: () => 'The back wall is coming' },
  { a: T_EYE1 + 0.6, b: 53.0, label: 'Sustained wind', value: (T) => Math.round(windMph(T)) + ' mph', sub: (T) => catOf(windMph(T)) },
];
const CAPS = [
  [4.6, 8.8, 'It is the morning before landfall.'],
  [9.2, 13.6, 'Wind from the outer bands starts to hit the street.'],
  [14.0, 17.6, 'Power lines start throwing sparks.'],
  [18.2, 21.0, 'At 157 mph it becomes a Category 5.'],
  [21.9, 24.3, 'Then the window goes.'],
  [25.0, 30.0, 'The sea is now coming up the street.'],
  [30.4, 35.4, 'Cars float. The ground floor is underwater.'],
  [36.9, 42.8, 'Then the eye passes over. Everything goes quiet.'],
  [44.0, 49.0, 'The wall on the other side hits from the opposite direction.'],
  [50.4, 54.2, 'By morning the water has gone. The street has not.'],
];
const FACTS = [
  ['Category 5 winds', '157 mph or more', 'Saffir-Simpson scale. Andrew hit Miami-Dade in 1992 at about 165 mph (NOAA reanalysis)'],
  ['Wind pressure on a wall', 'about 65 lb per sq ft', 'Dynamic pressure, half × air density × speed squared, at 160 mph. My estimate; gusts and building shape raise it'],
  ['Storm surge', 'up to 16.9 ft', 'Andrew\'s measured peak in Biscayne Bay (NOAA). Many Miami streets sit around 6 ft above sea level'],
  ['Where the deaths come from', 'about half: surge', 'Storm surge caused 49% of direct U.S. hurricane deaths from 1963 to 2012 (NHC)'],
];
facts.innerHTML = FACTS.map((f) => `<div class="fr"><div class="fl">${f[0]}</div><div class="fv">${f[1]}</div><div class="fs">${f[2]}</div></div>`).join('');
const factEls = [...facts.querySelectorAll('.fr')];
{ const g = document.getElementById('grain'), c = g.getContext('2d'), id = c.createImageData(256, 256), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }
function updateOverlay(T) {
  elTitle.style.opacity = sm(0, 0.8, T) * (1 - sm(4.0, 4.7, T));
  const beat = BEATS.slice().reverse().find((b) => T >= b.a && T < b.b);
  if (beat) { hLabel.textContent = beat.label; hValue.textContent = beat.value(T); hSub.textContent = beat.sub(T); hud.style.opacity = Math.min(sm(beat.a, beat.a + 0.3, T), 1 - sm(beat.b - 0.2, beat.b, T)); } else hud.style.opacity = 0;
  const cp = CAPS.find((c) => T >= c[0] - 0.05 && T < c[1] + 0.05);
  if (cp) { cap.textContent = cp[2]; const fin = sm(cp[0], cp[0] + 0.4, T); cap.style.opacity = fin * (1 - sm(cp[1] - 0.4, cp[1], T)); cap.style.transform = `translateY(${(1 - fin) * 6}px)`; } else cap.style.opacity = 0;
  flash.style.opacity = T >= T_BREAK && T < T_BREAK + 0.4 ? 0.55 * (1 - (T - T_BREAK) / 0.4) : 0;
  tag.style.opacity = T > 4.8 && T < 54.2 ? 0.7 * sm(4.8, 5.6, T) * (1 - sm(53.6, 54.2, T)) : 0;
  wrap.style.transform = T > T_BREAK && T < T_BREAK + 1.2 ? `translate(${(Math.sin(T * 91) * 5).toFixed(1)}px, ${(Math.cos(T * 77) * 4).toFixed(1)}px)` : 'none';
  const fo = sm(T_SCENE - 0.2, T_SCENE + 0.6, T) * (1 - sm(59.0, 59.6, T)); facts.style.opacity = fo;
  factEls.forEach((el, i) => { el.style.opacity = sm(T_SCENE + 0.3 + i * 0.75, T_SCENE + 0.9 + i * 0.75, T); });
  end.style.opacity = T >= 59 ? sm(59.0, 59.7, T) : 0;
  end.querySelector('.a').style.opacity = sm(59.6, 60.2, T); end.querySelector('.b').style.opacity = sm(60.4, 61.0, T); end.querySelector('.c').style.opacity = sm(61.2, 61.8, T) * 0.9;
  document.getElementById('stage').style.background = T >= T_SCENE ? '#07070a' : '#000';
  drawGlass(T);
}
function renderAt(T, sub = 1, dt = 1 / 60) {
  T = clamp(T, 0, T_END);
  const skip3D = T > T_SCENE + 0.5;
  for (let j = 0; j < (skip3D ? 0 : sub); j++) {
    const Tj = clamp(T + (sub > 1 ? (j / (sub - 1) - 0.5) * dt : 0), 0, T_END);
    update(Tj); composer.render(); actx.globalAlpha = 1 / (j + 1); actx.drawImage(glCanvas, 0, 0);
  }
  actx.globalAlpha = 1;
  if (skip3D) { actx.fillStyle = '#07070a'; actx.fillRect(0, 0, accCanvas.width, accCanvas.height); }
  updateOverlay(T);
}
window.renderAt = renderAt; window.T_END = T_END; window.dbg = { scene, camera, renderer };
await Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"')]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
