import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* "What if you opened a plane door mid-flight?" — deterministic 62 s timeline, pure function of T.
   Narrow-body cabin (737-class dimensions), first person. 1 unit = 1 m, cabin axis = z, nose toward -z. */
const T_END = 62, T_SCENE = 54.6;
const T_FAIL = 33.4; // illustrative door failure
const P = new URLSearchParams(location.search);
const DPR = +(P.get('dpr') || 1);

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
function kf(t, pts) { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; }

/* ---------- renderer ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
const scene = new THREE.Scene();
const HAZE = new THREE.Color(0xa9c3e3);
scene.fog = new THREE.FogExp2(HAZE, 0.00011);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.06, 160000);
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
function toTex(c, srgb = true, rep) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
function noiseTex(base, amp, size, seed, rep, dots = 1) {
  const c = mkCanvas(size, size), x = c.getContext('2d'), r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.5 * dots; i++) { const v = (r() - 0.5) * amp; x.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`; x.fillRect(r() * size, r() * size, 1 + r() * 2, 1); }
  return toTex(c, true, rep);
}

/* ---------- outside: sky, cloud deck, ground ---------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x1a4a98) }, hor: { value: HAZE.clone() }, sunDir: { value: new THREE.Vector3(-0.62, 0.55, 0.2).normalize() }, dark: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top, hor, sunDir; uniform float dark; varying vec3 vP;
    void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.55, h), 0.6));
      float s = max(dot(normalize(vP), sunDir), 0.0); c += vec3(1.0,0.93,0.8) * (pow(s, 10.0) * 0.18 + pow(s, 900.0) * 3.0);
      gl_FragColor = vec4(c * (1.0 - dark), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(100000, 24, 16), skyMat); scene.add(sky);
function cloudTex() {
  const N = 512, c = mkCanvas(N, N), x = c.getContext('2d'), id = x.createImageData(N, N), r = rng(77);
  const g = []; for (let k = 0; k < 6; k++) { const n = 8 << k, a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = r(); g.push([n, a]); }
  const samp = (n, a, u, v) => { const fx = u * n, fy = v * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, s = (i, j) => a[((j % n + n) % n) * n + ((i % n + n) % n)]; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return lerp(lerp(s(x0, y0), s(x0 + 1, y0), sx), lerp(s(x0, y0 + 1), s(x0 + 1, y0 + 1), sx), sy); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v = 0, amp = 0.5, tot = 0; for (let k = 0; k < 6; k++) { v += samp(g[k][0], g[k][1], i / N, j / N) * amp; tot += amp; amp *= 0.55; } v /= tot;
    const cov = smooth((v - 0.34) / 0.22), shade = 0.82 + 0.18 * smooth((v - 0.5) / 0.3), o = (j * N + i) * 4;
    id.data[o] = 255 * shade; id.data[o + 1] = 255 * shade; id.data[o + 2] = 255 * Math.min(1, shade + 0.03); id.data[o + 3] = 255 * cov;
  }
  x.putImageData(id, 0, 0); const t = toTex(c); t.repeat.set(22, 22); return t;
}
const CLOUD_ABS = 4300; // m above sea level, deck height
const cloudT = cloudTex();
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(130000, 130000), new THREE.MeshBasicMaterial({ map: cloudT, transparent: true, depthWrite: false, fog: true }));
clouds.rotation.x = -Math.PI / 2; scene.add(clouds);
const clouds2 = new THREE.Mesh(clouds.geometry, new THREE.MeshBasicMaterial({ map: cloudT, transparent: true, depthWrite: false, opacity: 0.75, fog: true }));
clouds2.rotation.x = -Math.PI / 2; scene.add(clouds2);
const grassTex = new THREE.TextureLoader().load('../assets/grasslight-big.jpg'); grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(1400, 1400); grassTex.colorSpace = THREE.SRGBColorSpace; grassTex.anisotropy = maxAniso;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(130000, 130000), new THREE.MeshBasicMaterial({ map: grassTex, color: 0xb8c4a0, fog: true }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const ALT_FT = (T) => (T < T_FAIL + 7.2 ? 35000 : T < 53.2 ? lerp(35000, 10000, smooth((T - (T_FAIL + 7.2)) / (53.2 - T_FAIL - 7.2))) : 10000);

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0xfff1de, 0x6a5f58, 0.32); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 30 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const cabinL = [0, 1].map(() => { const l = new THREE.PointLight(0xffe6c8, 6, 7, 1.6); scene.add(l); return l; });

/* ---------- cabin ---------- */
const matWall = new THREE.MeshStandardMaterial({ map: noiseTex('#e7e1d4', 14, 256, 5, [6, 1]), roughness: 0.78, emissive: 0x2a2824 });
const matBin = new THREE.MeshStandardMaterial({ map: noiseTex('#d8d4ca', 8, 256, 6, [2, 1]), roughness: 0.55, emissive: 0x2c2a26 });
const matCeil = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.7, side: THREE.BackSide });
const matCarpet = new THREE.MeshStandardMaterial({ map: (() => { const t = noiseTex('#3b4658', 40, 256, 7, [3, 30], 2); return t; })(), roughness: 0.95 });
const matSeat = new THREE.MeshStandardMaterial({ map: noiseTex('#33597c', 36, 256, 8, [1, 1], 2), roughness: 0.85 });
const matSeatB = new THREE.MeshStandardMaterial({ map: noiseTex('#26394f', 30, 256, 9, [1, 1], 2), roughness: 0.85 });
const matHead = new THREE.MeshStandardMaterial({ color: 0xece8de, roughness: 0.8 });
const matPlastic = new THREE.MeshStandardMaterial({ color: 0xcfc9bb, roughness: 0.5 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.6 });
const matEmit = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
const cabin = new THREE.Group(); scene.add(cabin);
const Z0 = 12, Z1 = -10.4, LEN = Z0 - Z1, CZ = (Z0 + Z1) / 2, ROW = 0.78;
const rowZ = (r) => -ROW * r;
const R_MIN = -11, R_MAX = 8;
const DOOR = { z: -8.7, w: 0.86, h: 1.72 };
const box = (w, h, d, m, x, y, z, parent = cabin) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
// floor + aisle runner
const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.5, LEN), matCarpet); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, CZ); floor.receiveShadow = true; cabin.add(floor);
for (const s of [-1, 1]) box(0.04, 0.012, LEN, matEmit, s * 0.26, 0.008, CZ);
// ceiling shell: half-ellipse tunnel
{
  const N = 28, pos = [], idx = [], uvs = [];
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI, x = 1.75 * Math.cos(a), y = 1.6 + 0.62 * Math.sin(a); pos.push(x, y, Z0, x, y, Z1); uvs.push(i / N, 0, i / N, 1); }
  for (let i = 0; i < N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
  const gc = mkCanvas(256, 4), gx = gc.getContext('2d'), gr = gx.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#6e695f'); gr.addColorStop(0.3, '#b3aea2'); gr.addColorStop(0.5, '#cfcabe'); gr.addColorStop(0.7, '#b3aea2'); gr.addColorStop(1, '#6e695f'); gx.fillStyle = gr; gx.fillRect(0, 0, 256, 4);
  const c = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: toTex(gc), side: THREE.DoubleSide })); cabin.add(c);
}
// side walls with window holes (+ door hole on the left)
function wallGeo(side) {
  const sh = new THREE.Shape(); sh.moveTo(-Z0, 0); sh.lineTo(-Z1, 0); sh.lineTo(-Z1, 1.75); sh.lineTo(-Z0, 1.75); sh.closePath();
  for (let r = R_MIN; r <= R_MAX; r++) { const u = -(rowZ(r) - 0.05), p = new THREE.Path(); p.absellipse(u, 1.12, 0.115, 0.165, 0, Math.PI * 2, true); sh.holes.push(p); }
  if (side < 0) { const u0 = -(DOOR.z - DOOR.w / 2), u1 = -(DOOR.z + DOOR.w / 2); const p = new THREE.Path(); p.moveTo(u0, 0); p.lineTo(u1, 0); p.lineTo(u1, DOOR.h); p.lineTo(u0, DOOR.h); p.closePath(); sh.holes.push(p); }
  return new THREE.ShapeGeometry(sh, 10);
}
for (const s of [-1, 1]) {
  // right wall: holes only for windows; door hole path only on the left (side<0)
  const wm = new THREE.Mesh(wallGeo(s), matWall); wm.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; wm.position.x = s * 1.75; wm.receiveShadow = true; cabin.add(wm);
  const uv = wm.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.15, uv.getY(i) * 0.4);
}
// window reveals + shades
const shadeR = rng(21);
for (const s of [-1, 1]) for (let r = R_MIN; r <= R_MAX; r++) {
  const z = rowZ(r) - 0.05, x = s * 1.75;
  box(0.05, 0.38, 0.03, matPlastic, x + s * -0.02, 1.12, z - 0.15); box(0.05, 0.38, 0.03, matPlastic, x + s * -0.02, 1.12, z + 0.15);
  box(0.05, 0.03, 0.3, matPlastic, x + s * -0.02, 1.3, z); box(0.05, 0.03, 0.3, matPlastic, x + s * -0.02, 0.94, z);
  const q = shadeR(); if (q < 0.4 && !(s < 0 && r === 0)) { const h = 0.1 + q * 0.7 * 0.35, sd = box(0.02, h, 0.28, matBin, x + s * -0.03, 1.29 - h / 2, z); }
}
// overhead bins, light strips
for (const s of [-1, 1]) for (let r = R_MIN; r <= R_MAX; r++) {
  const z = rowZ(r);
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.34, ROW - 0.04, 3, 0.06), matBin); b.position.set(s * 1.24, 1.7, z); b.rotation.z = s * 0.1; b.castShadow = b.receiveShadow = true; cabin.add(b);
  box(0.5, 0.012, ROW - 0.12, matEmit, s * 0.74, 1.53, z);
}
box(0.5, 0.02, LEN, matPlastic, 0, 2.18, CZ); // centre ceiling strip
// bulkhead / galley at the front
{ const bh = box(3.5, 2.2, 0.1, matWall, 0, 1.1, Z1 - 0.05); box(1.1, 1.6, 0.08, matDark, -0.9, 1.0, Z1 + 0.04); box(1.1, 1.6, 0.08, matPlastic, 0.9, 1.0, Z1 + 0.04); box(0.9, 1.5, 0.04, matBin, 0.0, 1.0, Z1 + 0.02); }
// ---------- seats ----------
const nSeat = (R_MAX - R_MIN + 1) * 6, SX = [-1.42, -0.96, -0.5, 0.5, 0.96, 1.42];
const gCush = new RoundedBoxGeometry(0.44, 0.12, 0.46, 3, 0.04), gBack = new RoundedBoxGeometry(0.44, 0.6, 0.12, 3, 0.05), gHead = new RoundedBoxGeometry(0.3, 0.2, 0.09, 3, 0.04), gArm = new RoundedBoxGeometry(0.05, 0.06, 0.4, 2, 0.02), gLeg = new THREE.BoxGeometry(0.04, 0.4, 0.04);
const iCush = new THREE.InstancedMesh(gCush, matSeat, nSeat), iBack = new THREE.InstancedMesh(gBack, matSeat, nSeat), iHead = new THREE.InstancedMesh(gHead, matSeatB, nSeat), iArm = new THREE.InstancedMesh(gArm, matDark, nSeat), iLeg = new THREE.InstancedMesh(gLeg, matDark, nSeat * 2);
for (const m of [iCush, iBack, iHead, iArm, iLeg]) { m.castShadow = m.receiveShadow = true; cabin.add(m); }
const gTorso = new THREE.CapsuleGeometry(0.17, 0.32, 4, 10), gHeadP = new THREE.SphereGeometry(0.105, 18, 14), gHair = new THREE.SphereGeometry(0.114, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.64), gUarm = new THREE.CapsuleGeometry(0.045, 0.3, 4, 8), gNeck = new THREE.CylinderGeometry(0.05, 0.058, 0.14, 10), gNose = new THREE.ConeGeometry(0.018, 0.04, 8), gEar = new THREE.SphereGeometry(0.02, 8, 6);
const pr = rng(404), SKINS = [0xe3b895, 0xc89b7b, 0x8a5a3a, 0xf0c9a8, 0x6e4630, 0xd8a47c], HAIRS = [0x1b1410, 0x3a2616, 0x4a3320, 0x1b1410, 0x6e6e6e, 0x0e0c0a, 0x2c1e12, 0x6a4c2c], TOPS = [0x1f2a3a, 0x6b2b2b, 0xd8d4c8, 0x3c5a7a, 0x4a5a3a, 0xb8782a, 0x7a6a8a, 0xa8b0b8, 0x2c2c30];
const pg = new THREE.Group(); cabin.add(pg);
const mats = {}; const lam = (c) => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
const hairTex = noiseTex('#8c8c8c', 70, 128, 61, [3, 3], 2), hmats = {}; const hlam = (c) => hmats[c] || (hmats[c] = new THREE.MeshLambertMaterial({ color: c, map: hairTex }));
{
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let i = 0, k = 0;
  const put = (mesh, idx, x, y, z, rx = 0) => { e.set(rx, 0, 0); q.setFromEuler(e); mtx.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(idx, mtx); };
  for (let r = R_MIN; r <= R_MAX; r++) for (let s = 0; s < 6; s++, i++) {
    const x = SX[s], z = rowZ(r);
    put(iCush, i, x, 0.45, z, 0.04); put(iBack, i, x, 0.78, z + 0.21, -0.1); put(iHead, i, x, 1.16, z + 0.235, -0.1);
    put(iArm, i, x + (s < 3 ? 0.235 : -0.235), 0.62, z + 0.0);
    put(iLeg, k++, x - 0.18, 0.2, z + 0.1); put(iLeg, k++, x + 0.18, 0.2, z + 0.1);
    const empty = (r === 0 && s < 3) || pr() < 0.22; if (empty) continue;
    const sk = SKINS[Math.floor(pr() * 6)], hc = HAIRS[Math.floor(pr() * 8)], tc = TOPS[Math.floor(pr() * 9)];
    const body = new THREE.Mesh(gTorso, lam(tc)); body.position.set(x, 0.86, z + 0.12); body.scale.set(1.05, 1, 0.72); body.castShadow = true; pg.add(body);
    const hd = new THREE.Mesh(gHeadP, lam(sk)); hd.position.set(x, 1.3, z + 0.1); hd.scale.set(0.9, 1.1, 1); hd.castShadow = true; pg.add(hd);
    const hair = new THREE.Mesh(gHair, hlam(hc)); hair.position.set(x, 1.31, z + 0.115); hair.rotation.x = 0.35; hair.scale.set(0.95, 1.08, 1.02); hair.castShadow = true; pg.add(hair);
    const neck = new THREE.Mesh(gNeck, lam(sk)); neck.position.set(x, 1.19, z + 0.115); pg.add(neck);
    const st = pr();
    if (st < 0.2) { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), hlam(hc)); bun.position.set(x, 1.42, z + 0.16); pg.add(bun); }
    else if (st < 0.4) { const lh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.2, 4, 10), hlam(hc)); lh.position.set(x, 1.17, z + 0.17); lh.scale.set(1.1, 1, 0.6); pg.add(lh); }
    else if (st < 0.52) { const cp = new THREE.Mesh(new THREE.SphereGeometry(0.128, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), lam([0x1f2a3a, 0x6b2b2b, 0x2c2c30, 0x3c5a7a, 0x4a5a3a][Math.floor(pr() * 5)])); cp.position.set(x, 1.335, z + 0.115); cp.scale.set(0.95, 1.0, 1.02); pg.add(cp); }
    const nose = new THREE.Mesh(gNose, lam(sk)); nose.rotation.x = -Math.PI / 2; nose.position.set(x, 1.29, z - 0.012); pg.add(nose);
    for (const sx of [-1, 1]) { const ea = new THREE.Mesh(gEar, lam(sk)); ea.position.set(x + sx * 0.093, 1.3, z + 0.1); pg.add(ea); const arm = new THREE.Mesh(gUarm, lam(tc)); arm.position.set(x + sx * 0.2, 0.75, z - 0.05); arm.rotation.x = 1.15; pg.add(arm); }
  }
  for (const m of [iCush, iBack, iHead, iArm, iLeg]) m.instanceMatrix.needsUpdate = true;
}
// ---------- the wing, seen through the left windows ----------
const wing = new THREE.Group(); scene.add(wing);
{
  const sh = new THREE.Shape(); sh.moveTo(0, -1.8); sh.lineTo(15.5, 4.3); sh.lineTo(15.5, 5.4); sh.lineTo(0, 2.7); sh.closePath();
  const wmat = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 0.35, roughness: 0.42, side: THREE.DoubleSide });
  const w = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }), wmat);
  w.rotation.set(Math.PI / 2, 0, 0); w.scale.x = -1; w.position.set(-1.8, -0.1, 0); w.castShadow = true; w.receiveShadow = true; wing.add(w);
  const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 4.2, 28), new THREE.MeshStandardMaterial({ color: 0xe5e7ea, metalness: 0.3, roughness: 0.4 })); eng.rotation.x = Math.PI / 2; eng.position.set(-6.3, -1.0, -1.2); eng.castShadow = true; wing.add(eng);
  const wl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 1.3), wmat); wl.position.set(-17.3, 1.0, 4.8); wing.add(wl);
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.6), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); sl.position.set(-17.2, 2.3, 4.8); wing.add(sl);
}
// ---------- the door (plug door on the left wall) ----------
const doorGrp = new THREE.Group(); doorGrp.position.set(-1.72, 0, DOOR.z); cabin.add(doorGrp);
const doorMat = new THREE.MeshStandardMaterial({ map: noiseTex('#d9d4c6', 12, 256, 31, [1, 1]), roughness: 0.6 });
{
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.07, DOOR.h - 0.03, DOOR.w - 0.03), doorMat); slab.position.set(0, DOOR.h / 2, 0); slab.castShadow = slab.receiveShadow = true; doorGrp.add(slab);
  const wnd = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: 0x9fc0ea })); wnd.rotation.y = Math.PI / 2; wnd.position.set(0.04, 1.35, 0.0); doorGrp.add(wnd);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 28), matDark); ring.rotation.y = Math.PI / 2; ring.position.set(0.04, 1.35, 0); doorGrp.add(ring);
  for (const [y, h] of [[DOOR.h + 0.02, 0.04], [0.0, 0.04]]) box(0.12, h, DOOR.w + 0.1, matDark, -0.0, y, 0, doorGrp);
  for (const s of [-1, 1]) box(0.12, DOOR.h, 0.04, matDark, 0, DOOR.h / 2, s * (DOOR.w / 2 + 0.03), doorGrp);
  const plac = mkCanvas(256, 128), px = plac.getContext('2d'); px.fillStyle = '#c92a1e'; px.fillRect(0, 0, 256, 128); px.fillStyle = '#fff'; px.font = 'bold 34px Arial'; px.textAlign = 'center'; px.fillText('DOOR', 128, 52); px.font = 'bold 22px Arial'; px.fillText('ARMED / DISARMED', 128, 92);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: toTex(plac) })); pl.rotation.y = Math.PI / 2; pl.position.set(0.04, 0.78, -0.2); doorGrp.add(pl);
}
const handlePivot = new THREE.Group(); handlePivot.position.set(0.05, 1.02, 0.0); doorGrp.add(handlePivot);
{ const lev = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.42), matDark); lev.position.set(0.05, 0, 0.1); lev.castShadow = true; handlePivot.add(lev); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: 0xc92a1e, roughness: 0.5 })); tip.position.set(0.05, 0, 0.3); handlePivot.add(tip); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 20), matPlastic); hub.rotation.z = Math.PI / 2; hub.position.set(0.03, 0, 0); handlePivot.add(hub); }
{ const gb = box(0.05, 0.05, DOOR.w - 0.1, new THREE.MeshStandardMaterial({ color: 0xe8c21a, roughness: 0.6 }), 0.1, 0.12, 0, doorGrp); }
// ---------- masks ----------
const maskCup = new THREE.CylinderGeometry(0.05, 0.075, 0.07, 14), maskBag = new THREE.SphereGeometry(0.08, 10, 8), maskCord = new THREE.CylinderGeometry(0.006, 0.006, 1, 5);
const maskMat = new THREE.MeshStandardMaterial({ color: 0xf0d02a, roughness: 0.5 }), bagMat = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, transparent: true, opacity: 0.8, roughness: 0.3 });
const masks = [];
for (let r = -6; r <= 6; r++) for (const mx of [-0.62, 0.62]) {
  const g = new THREE.Group(), cup = new THREE.Mesh(maskCup, maskMat), bag = new THREE.Mesh(maskBag, bagMat), cord = new THREE.Mesh(maskCord, new THREE.MeshBasicMaterial({ color: 0xe8e6dd }));
  g.add(cup, bag, cord); scene.add(g); masks.push({ g, cup, bag, cord, x: mx, z: rowZ(r) + (mx < 0 ? 0.1 : -0.1), t0: T_FAIL + 1.7 + Math.abs(r) * 0.045 + (mx < 0 ? 0 : 0.2) });
}
// ---------- decompression: mist + flying debris ----------
const HOLE = new THREE.Vector3(-1.75, 1.0, DOOR.z);
const mistTex = (() => { const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const mr = rng(555), mist = [];
for (let i = 0; i < 150; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); sp.visible = false; scene.add(sp); mist.push({ sp, x: lerp(-1.6, 1.6, mr()), y: lerp(0.5, 2.0, mr()), z: lerp(-10, 2.5, Math.pow(mr(), 1.3)), d: mr() * 0.8, dur: 1.4 + mr() * 2.2, s: 0.8 + mr() * 1.8 }); }
const dr = rng(666), debris = [];
const dGeo = [new THREE.CylinderGeometry(0.035, 0.028, 0.09, 10), new THREE.PlaneGeometry(0.21, 0.297), new THREE.BoxGeometry(0.36, 0.1, 0.24), new THREE.BoxGeometry(0.07, 0.14, 0.01), new THREE.BoxGeometry(0.2, 0.2, 0.2)];
const dCol = [0xf0efe8, 0xffffff, 0x9bb0c8, 0x151515, 0x6b4a2e];
for (let i = 0; i < 46; i++) { const k = Math.floor(dr() * 5), m = new THREE.Mesh(dGeo[k], new THREE.MeshStandardMaterial({ color: dCol[k], roughness: 0.7, side: THREE.DoubleSide })); m.visible = false; m.castShadow = true; scene.add(m); debris.push({ m, x: lerp(-1.4, 1.4, dr()), y: lerp(0.5, 1.9, dr()), z: lerp(-8, -0.5, Math.pow(dr(), 0.8)), d: dr() * 0.7, dur: 0.7 + dr() * 0.8, sp: [dr() * 9, dr() * 9, dr() * 9] }); }
// ---------- camera hands ----------
const skinH = new THREE.MeshStandardMaterial({ color: 0xd9a47c, roughness: 0.65 }), sleeveH = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.9 });
const armG = new THREE.CylinderGeometry(1, 1, 1, 12);
function mkArm() { const g = new THREE.Group(), fore = new THREE.Mesh(armG, skinH), sle = new THREE.Mesh(armG, sleeveH), hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), skinH); hand.scale.set(1.0, 0.55, 1.3); g.add(fore, sle, hand); const fingers = []; for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.05, 3, 6), skinH); fingers.push(f); g.add(f); } scene.add(g); return { g, fore, sle, hand, fingers }; }
const armR = mkArm(), armL = mkArm();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _v = new THREE.Vector3();
function setLimb(m, A, B, r) { _v.subVectors(B, A); const len = _v.length(); m.position.copy(A).addScaledVector(_v, 0.5); m.scale.set(r, len, r); _q.setFromUnitVectors(_up, _v.normalize()); m.quaternion.copy(_q); }
function poseArm(arm, B, vis, side) {
  arm.g.visible = vis > 0.01; if (!vis) return;
  camera.updateMatrixWorld(true); _a.set(side * 0.22, -0.5, -0.18).applyMatrix4(camera.matrixWorld);
  setLimb(arm.fore, _a, B, 0.032); _b.lerpVectors(_a, B, 0.55); setLimb(arm.sle, _a, _b, 0.044);
  arm.hand.position.copy(B);
  for (let i = 0; i < 4; i++) { arm.fingers[i].position.set(B.x + 0.035, B.y - 0.035, B.z + (i - 1.5) * 0.024); arm.fingers[i].rotation.set(0, 0, 0); }
}
// mask worn in front of the camera
const wornMask = new THREE.Group(); camera.add(wornMask);
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.12, 20), maskMat); c.rotation.x = Math.PI / 2; c.scale.setScalar(0.4); c.position.set(0, -0.27, -0.36); wornMask.add(c); const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), bagMat); b.position.set(0, -0.38, -0.4); b.scale.set(0.35, 0.5, 0.2); wornMask.add(b); const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6), new THREE.MeshBasicMaterial({ color: 0xe8e6dd })); tube.position.set(0.06, 0.15, -0.28); tube.rotation.z = -0.1; wornMask.add(tube); wornMask.visible = false; }

/* ---------- camera path ---------- */
const SEAT = new THREE.Vector3(-0.3, 1.27, 0.05);
const _cp = new THREE.Vector3();
function camAt(T, out) {
  let x = SEAT.x, y = SEAT.y, z = SEAT.z, yaw = 0, pitch = 0, roll = 0;
  if (T < 31) {
    const br = Math.sin(T * 1.7) * 0.004;
    if (T < 9.6) {
      x = lerp(SEAT.x, -0.95, kf(T, [[0, 0], [2.4, 0], [4.4, 1], [6.9, 1], [8.8, 0]])); y = 1.27 + br; yaw = 0.08 + kf(T, [[0, 0], [2.4, 0.04], [4.4, 1.35], [6.9, 1.35], [8.8, 0.04]]) + Math.sin(T * 0.7) * 0.012; pitch = kf(T, [[0, -0.02], [4.4, -0.46], [6.9, -0.46], [8.8, 0]]);
    } else if (T < 11.4) { const a = sm(9.6, 11.4, T); y = lerp(1.27, 1.62, a); x = lerp(-0.3, -0.2, sm(9.9, 11.4, T)); z = 0.05 - sm(10.5, 11.4, T) * 0.1; pitch = -0.04 * Math.sin(a * Math.PI); yaw = 0.06; }
    else if (T < 18.6) { const u = (T - 11.4) / 7.2; z = -0.1 - u * 7.9; x = -0.2 + Math.sin(T * 0.9) * 0.02; y = 1.62 + Math.abs(Math.sin((T - 11.4) * 3.3)) * 0.022; yaw = 0.05 + Math.sin(T * 0.8) * 0.03; pitch = -0.02 + Math.sin(T * 1.65) * 0.008; roll = Math.sin(T * 1.65) * 0.004; }
    else {
      const a = sm(18.4, 20.9, T); z = lerp(-8.0, -8.7, a); x = lerp(-0.2, -0.62, a); y = 1.62 - a * 0.17; yaw = lerp(0.05, 1.5708, a); pitch = -0.1 * a;
      const st = sm(23.6, 27.5, T), sh = st * 0.012; x += Math.sin(T * 41) * sh; y += Math.cos(T * 37) * sh; roll += Math.sin(T * 33) * 0.006 * st;
    }
  } else {
    const k = T - T_FAIL; y = 1.27 + Math.sin(T * 1.7) * 0.004; yaw = 0.14 + kf(T, [[31.2, 0], [T_FAIL + 7.4, 0], [T_FAIL + 9.2, 0.08], [T_FAIL + 11.5, 1.12], [51.0, 1.12], [53.4, 0.5]]) ; pitch = kf(T, [[31.2, 0], [T_FAIL + 4.2, 0], [T_FAIL + 5.4, -0.34], [T_FAIL + 8.2, -0.05], [T_FAIL + 11.5, -0.1], [53.4, -0.02]]);
    const sh = k > 0 ? Math.exp(-Math.max(k, 0) * 0.55) * (k < 0.05 ? 0 : 1) : 0; yaw += Math.sin(T * 63) * 0.012 * sh; pitch += Math.cos(T * 53) * 0.01 * sh; x += Math.sin(T * 71) * 0.01 * sh; y += Math.cos(T * 59) * 0.012 * sh; roll += Math.sin(T * 47) * 0.02 * sh;
    // being thrown a little toward the hole at the moment of failure
    if (k > 0) { const th = Math.exp(-k * 2.4) * clamp(k / 0.1); z -= th * 0.05; yaw += th * 0.1; }
  }
  out.set(x, y, z); return { yaw, pitch, roll };
}

/* ---------- update ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
function update(T) {
  const A = camAt(T, _cp); camera.position.copy(_cp); _e.set(A.pitch, A.yaw, A.roll); camera.quaternion.setFromEuler(_e);
  const altFt = ALT_FT(T), altM = altFt * 0.3048, k = T - T_FAIL;
  // outside world: cabin floor is at altM
  clouds.position.set(0, CLOUD_ABS - altM, 0); clouds2.position.set(0, CLOUD_ABS + 900 - altM, 0); ground.position.set(0, -altM, 0);
  cloudT.offset.set(0, (T * 250 / 5900) % 1); // ~250 m/s over the deck (tile ~ 5.9 km)
  sky.position.copy(camera.position);
  const inCloud = clamp(1 - Math.abs(altM - (CLOUD_ABS + 450)) / 650); // 1 when inside the layer
  const dens = lerp(0.00011, 0.0022, smooth(inCloud)); scene.fog.density = dens;
  scene.fog.color.copy(HAZE).lerp(new THREE.Color(0xe9eef4), smooth(inCloud));
  skyMat.uniforms.top.value.set(0x1a4a98).lerp(new THREE.Color(0x6e9bd6), 1 - clamp((altFt - 10000) / 25000));
  skyMat.uniforms.dark.value = 0;
  // lights follow the camera
  sun.position.set(_cp.x - 9, _cp.y + 7, _cp.z + 3); sun.target.position.set(_cp.x, 0.6, _cp.z); sun.target.updateMatrixWorld();
  cabinL[0].position.set(_cp.x, 1.85, _cp.z + 0.5); cabinL[1].position.set(_cp.x, 1.85, _cp.z - 2.4);
  const flick = k > 0 && k < 1.1 ? (Math.sin(k * 90) > 0.2 ? 1 : 0.15) : 1, dim = k > 1.1 ? 0.8 : 1;
  cabinL.forEach((l) => (l.intensity = 6 * flick * dim)); hemi.intensity = 0.32 * (k > 0 && k < 1.1 ? (0.4 + 0.6 * flick) : 1);
  // wing wobble
  wing.rotation.z = Math.sin(T * 0.8) * 0.002 + (k > 0 ? Math.sin(T * 38) * 0.002 * Math.exp(-k) : 0);
  // door: handle and failure
  const strain = sm(22.2, 24.4, T) * (1 - sm(27.6, 28.6, T));
  handlePivot.rotation.x = -0.05 * Math.sin(Math.min(1, strain) * Math.PI * 0.5) + (T > 22.4 && T < 27.6 ? Math.sin(T * 27) * 0.006 : 0);
  if (T < T_FAIL) { doorGrp.visible = true; doorGrp.position.set(-1.72, 0, DOOR.z); doorGrp.rotation.set(0, 0, 0); }
  else { const kk = Math.max(0, k); doorGrp.visible = kk < 1.4; const u = kk; doorGrp.position.set(-1.72 - u * u * 24, u * 1.2 - u * u * 3, DOOR.z - u * u * 9); doorGrp.rotation.set(u * 2.6, u * 1.1, u * 1.7); }
  // hands on the door
  const reach = sm(19.6, 21.2, T) * (1 - sm(29.6, 30.4, T)), hp = new THREE.Vector3(-1.62, 1.02 - handlePivot.rotation.x * 0.0, DOOR.z + 0.12 + Math.sin(T * 27) * 0.003 * strain);
  poseArm(armR, hp, T < 31 ? reach : 0, 0.8);
  armL.g.visible = false;
  // masks
  for (const m of masks) {
    const u = clamp((T - m.t0) / 0.9), on = k > 0 && T >= m.t0 - 0.2;
    m.g.visible = on; if (!on) continue;
    const L = 0.15 + 0.95 * smooth(u), swing = Math.sin((T - m.t0) * 3.1) * 0.12 * Math.exp(-(T - m.t0) * 0.35) * (u > 0.2 ? 1 : 0) + Math.sin(T * 37) * 0.01 * Math.exp(-(T - m.t0) * 0.8);
    m.g.position.set(m.x + swing * 0.3, 2.0, m.z); m.cord.scale.set(1, L, 1); m.cord.position.y = -L / 2; m.cup.position.set(swing * 0.4, -L - 0.03, 0); m.bag.position.set(swing * 0.5, -L - 0.17, 0.02); m.bag.scale.set(0.9, 1.2, 0.45);
    m.g.rotation.z = swing;
  }
  wornMask.visible = T > T_FAIL + 4.6 && T < T_SCENE + 0.1; if (wornMask.visible) { const a = sm(T_FAIL + 4.6, T_FAIL + 5.4, T); wornMask.position.set(0, lerp(-0.4, 0, a), lerp(0.2, 0, a)); }
  // mist and debris
  camera.updateMatrixWorld(true);
  for (const p of mist) {
    const u = (k - p.d * 0.6) / p.dur, vis = k > 0 && u > 0 && u < 1;
    p.sp.visible = vis; if (!vis) continue;
    const e = u * u * (3 - 2 * u);
    p.sp.position.set(lerp(p.x, HOLE.x, Math.pow(e, 1.3)), lerp(p.y, HOLE.y, e), lerp(p.z, HOLE.z, Math.pow(e, 1.5)));
    p.sp.scale.setScalar(p.s * (0.5 + e * 1.5)); p.sp.material.opacity = 0.34 * Math.sin(Math.PI * Math.min(1, u * 1.2)) * (1 - smooth((k - 3.6) / 1.4));
  }
  for (const d of debris) {
    const u = (k - d.d) / d.dur, vis = k > 0 && u > 0 && u < 1;
    d.m.visible = vis; if (!vis) continue;
    const e = Math.pow(u, 2.1);
    d.m.position.set(lerp(d.x, HOLE.x, e), lerp(d.y, HOLE.y, Math.pow(e, 0.8)) + Math.sin(u * 9) * 0.04, lerp(d.z, HOLE.z, e)); d.m.rotation.set(u * d.sp[0], u * d.sp[1], u * d.sp[2]);
  }
}

/* ---------- HUD / captions / facts / end ---------- */
const elTitle = document.getElementById('title'), hud = document.getElementById('hud'), cap = document.getElementById('caption'), end = document.getElementById('end'), flash = document.getElementById('flash'), dip = document.getElementById('dip'), tag = document.getElementById('tag'), facts = document.getElementById('facts');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const comma = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const cabFt = (T) => { const k = T - T_FAIL; return k < 0 ? 8000 : lerp(8000, 35000, 1 - Math.pow(1 - clamp(k / 4.2), 2)); };
const BEATS = [
  { a: 4.3, b: 9.0, label: 'Altitude', value: () => '35,000 ft', sub: () => 'Outside air −65°F · about 500 mph' },
  { a: 9.6, b: 18.2, label: 'Air pressure: cabin vs outside', value: () => '10.9 vs 3.5 psi', sub: () => 'Cabin is held near 8,000 ft equivalent' },
  { a: 20.6, b: 30.6, label: 'Force pushing the door shut', value: (T) => comma(15500 * sm(21.0, 24.6, T)) + ' lb', sub: () => '7.4 psi × about 2,100 sq in · estimate' },
  { a: T_FAIL + 0.15, b: T_FAIL + 4.9, label: 'Cabin altitude', value: (T) => comma(Math.round(cabFt(T) / 100) * 100) + ' ft', sub: () => 'Masks drop above 14,000 ft' },
  { a: T_FAIL + 5.1, b: T_FAIL + 7.6, label: 'Time of useful consciousness', value: () => '15–30 sec', sub: () => 'After rapid decompression at 35,000 ft · FAA' },
  { a: T_FAIL + 7.8, b: 53.6, label: 'Altitude', value: (T) => comma(Math.round(ALT_FT(T) / 100) * 100) + ' ft', sub: () => 'Time compressed · real descent takes minutes' },
];
const CAPS = [
  [4.6, 8.8, '35,000 feet. About 500 miles an hour.'],
  [9.9, 14.2, 'You get up and walk to the door.'],
  [14.8, 18.4, 'It looks like you could just open it.'],
  [21.0, 24.8, 'You grab the handle and pull.'],
  [25.4, 30.3, 'Nothing. The air in the cabin is holding it shut.'],
  [31.6, 33.2, 'Now say the door failed.'],
  [T_FAIL + 0.4, T_FAIL + 4.7, 'A door-sized hole. The cabin empties in seconds.'],
  [T_FAIL + 5.0, T_FAIL + 7.6, 'Masks drop. You have seconds to put one on.'],
  [T_FAIL + 8.2, T_FAIL + 13.6, 'The pilots dive to 10,000 feet.'],
  [T_FAIL + 14.2, 53.6, 'Passengers who stay buckled and masked have the best odds.'],
];
const FACTS = [
  ['Force on a cruising door', 'about 15,500 lb', 'About 7.4 psi cabin-to-outside difference × about 2,100 sq in (30 × 70 in). My estimate from standard-atmosphere pressure and a typical cabin altitude'],
  ['Why it stays shut', 'a plug door', 'It is larger than its frame and moves inward first, so cabin pressure pushes it tighter. It only unlatches once the pressure equalizes'],
  ['Time to act at 35,000 ft', '15 to 30 seconds', 'Useful consciousness after a rapid decompression (30 to 60 seconds if gradual) · FAA AC 61-107B'],
  ['Real door-sized failure', 'Alaska 1282 · 2024', 'A door plug blew out at about 15,000 ft after its bolts were left out. The plane landed and no one died · NTSB'],
];
facts.innerHTML = FACTS.map((f) => `<div class="fr"><div class="fl">${f[0]}</div><div class="fv">${f[1]}</div><div class="fs">${f[2]}</div></div>`).join('');
const factEls = [...facts.querySelectorAll('.fr')];
{ const g = document.getElementById('grain'), c = g.getContext('2d'), id = c.createImageData(256, 256), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }
function updateOverlay(T) {
  elTitle.style.opacity = sm(0, 0.8, T) * (1 - sm(4.0, 4.7, T));
  const beat = BEATS.find((b) => T >= b.a && T < b.b);
  if (beat) { hLabel.textContent = beat.label; hValue.textContent = beat.value(T); hSub.textContent = beat.sub(T); hud.style.opacity = Math.min(sm(beat.a, beat.a + 0.3, T), 1 - sm(beat.b - 0.2, beat.b, T)); } else hud.style.opacity = 0;
  const cp = CAPS.find((c) => T >= c[0] - 0.05 && T < c[1] + 0.05);
  if (cp) { cap.textContent = cp[2]; const fin = sm(cp[0], cp[0] + 0.4, T); cap.style.opacity = fin * (1 - sm(cp[1] - 0.4, cp[1], T)); cap.style.transform = `translateY(${(1 - fin) * 6}px)`; } else cap.style.opacity = 0;
  const dp = Math.max(1 - Math.abs(T - 31) / 0.55, 0); dip.style.opacity = T > 30.4 && T < 31.6 ? smooth(dp * 1.4) : 0;
  flash.style.opacity = T >= T_FAIL && T < T_FAIL + 0.5 ? 0.7 * (1 - (T - T_FAIL) / 0.5) : 0;
  tag.style.opacity = T > 31.2 && T < 54.2 ? 0.7 * sm(31.2, 32, T) * (1 - sm(53.6, 54.2, T)) : 0;
  wrap.style.transform = T > T_FAIL && T < T_FAIL + 1.2 ? `translate(${(Math.sin(T * 91) * 5).toFixed(1)}px, ${(Math.cos(T * 77) * 4).toFixed(1)}px)` : 'none';
  const fo = sm(T_SCENE - 0.2, T_SCENE + 0.6, T) * (1 - sm(59.0, 59.6, T)); facts.style.opacity = fo;
  factEls.forEach((el, i) => { el.style.opacity = sm(T_SCENE + 0.3 + i * 0.75, T_SCENE + 0.9 + i * 0.75, T); });
  end.style.opacity = sm(T_SCENE - 0.3, T_SCENE + 0.3, T) * (T < 59 ? 0.0 : 1) + (T >= 59 ? sm(59.0, 59.7, T) : 0);
  end.querySelector('.a').style.opacity = sm(59.6, 60.2, T); end.querySelector('.b').style.opacity = sm(60.4, 61.0, T); end.querySelector('.c').style.opacity = sm(61.2, 61.8, T) * 0.9;
  document.getElementById('stage').style.background = T >= T_SCENE ? '#07070a' : '#000';
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
await Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"'), new Promise((r) => { if (grassTex.image) r(); else setTimeout(r, 1500); })]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
