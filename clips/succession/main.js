import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* "What happens in the first hours after a president is assassinated?" — deterministic 62 s timeline, pure function of T.
   An explainer about the office and the law. No people, no depiction of any attack. Washington D.C. at dusk, night and dawn. 1 unit = 1 m. */
const T_END = 62, T_SCENE = 54.6;
const P = new URLSearchParams(location.search), DPR = +(P.get('dpr') || 1);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
function kf(t, pts) { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; }
const kfc = (t, pts) => [0, 1, 2].map((c) => kf(t, pts.map(([tt, col]) => [tt, col[c]])));

/* shot boundaries */
const T_WH0 = 13.2, T_WH1 = 33.6;  // White House shots
const T_FLAG = 44.6;               // flags come down

/* ---------- renderer ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const fogCol = new THREE.Color(0x303848);
scene.fog = new THREE.FogExp2(fogCol, 0.0004);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.2, 40000);
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

/* ---------- time of day ---------- */
const TOP = [[0, [0.16, 0.24, 0.46]], [12, [0.09, 0.14, 0.32]], [22, [0.02, 0.035, 0.09]], [34, [0.012, 0.022, 0.06]], [40, [0.05, 0.08, 0.18]], [46, [0.2, 0.32, 0.55]], [54.6, [0.25, 0.45, 0.78]]];
const HOR = [[0, [0.98, 0.58, 0.34]], [12, [0.55, 0.32, 0.36]], [22, [0.1, 0.12, 0.2]], [34, [0.06, 0.08, 0.14]], [40, [0.26, 0.28, 0.4]], [46, [0.98, 0.64, 0.46]], [54.6, [0.74, 0.8, 0.88]]];
const STARS = [[0, 0], [12, 0.25], [22, 1], [36, 1], [41, 0.7], [46, 0.08], [48, 0]];
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 0.1, 1).normalize() }, glow: { value: 1 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top, hor, sunDir; uniform float glow; varying vec3 vP;
    void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.7, h), 0.5));
      float s = max(dot(normalize(vP), sunDir), 0.0); c += hor * pow(s, 6.0) * 0.45 * glow + vec3(1.0, 0.8, 0.55) * pow(s, 80.0) * 0.35 * glow;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 24, 16), skyMat); scene.add(sky);
const starPts = (() => { const r = rng(5), n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = Math.acos(0.05 + r() * 0.95), R = 18000; p[i * 3] = R * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = R * Math.cos(ph); p[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false })); scene.add(m); return m; })();
const glowTex = (() => { const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const mkGlow = (col, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(size); return s; };

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0x8aa0c8, 0x2b2a28, 0.6); scene.add(hemi);
const dirL = new THREE.DirectionalLight(0xffc48a, 1.2); scene.add(dirL);

/* ---------- shared materials / textures ---------- */
const noiseTex = (base, amp, size, seed, rep) => { const c = mkCanvas(size, size), x = c.getContext('2d'), r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, size, size); for (let i = 0; i < size * size * 0.4; i++) { const v = (r() - 0.5) * amp; x.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`; x.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2); } const t = toTex(c); t.repeat.set(rep[0], rep[1]); return t; };
const marble = new THREE.MeshStandardMaterial({ map: noiseTex('#e9e6df', 14, 256, 3, [4, 6]), roughness: 0.75, emissive: 0x2a2822 });

/* ---------- MALL: ground, pool, trees, lamps, Monument, flags, Capitol ---------- */
const mall = new THREE.Group(); scene.add(mall);
const MZ = -420; // Monument z
{
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(900, 2600), new THREE.MeshStandardMaterial({ map: (() => { const t = noiseTex('#2e3b25', 40, 256, 8, [90, 260]); return t; })(), roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, -700); mall.add(grass);
  for (const s of [-1, 1]) { const pth = new THREE.Mesh(new THREE.PlaneGeometry(9, 2200), new THREE.MeshStandardMaterial({ map: noiseTex('#8d887c', 40, 128, 4, [2, 220]), roughness: 1 })); pth.rotation.x = -Math.PI / 2; pth.position.set(s * 34, 0.0, -600); mall.add(pth); }
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(78, 48), new THREE.MeshStandardMaterial({ map: noiseTex('#a39f94', 26, 256, 6, [18, 18]), roughness: 0.95 })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.01, MZ); mall.add(plaza);
  const mound = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0xcfcbc1, roughness: 0.9 })); mound.rotation.y = Math.PI / 4; mound.position.set(0, 0.4, MZ); mall.add(mound);
}
// reflecting pool (transparent, sky-reflecting) with the Monument mirrored below it
const poolMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: { uT: { value: 0 }, top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, uCam: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uT; uniform vec3 top, hor, uCam; varying vec3 vW;
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
    void main(){ vec2 p = vW.xz; float a = vn(p*0.9 + uT*0.25), b = vn(p*0.9 + 9.0 - uT*0.2);
      vec3 N = normalize(vec3((a-0.5)*0.05, 1.0, (b-0.5)*0.05)); vec3 V = normalize(uCam - vW); vec3 R = reflect(-V, N);
      float h = clamp(R.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.7, h), 0.5));
      float fr = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0); float alpha = clamp(0.62 + fr*0.35, 0.0, 0.95);
      gl_FragColor = vec4(c * 0.9, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const POOL_Z0 = 260, POOL_Z1 = MZ + 14;
const pool = new THREE.Mesh(new THREE.PlaneGeometry(52, POOL_Z0 - POOL_Z1), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.03, (POOL_Z0 + POOL_Z1) / 2); mall.add(pool);
const curb = new THREE.Mesh(new THREE.BoxGeometry(55, 0.3, POOL_Z0 - POOL_Z1 + 3), new THREE.MeshStandardMaterial({ color: 0x8c887e, roughness: 0.9 })); curb.position.set(0, -0.16, (POOL_Z0 + POOL_Z1) / 2); mall.add(curb);
// trees
{
  const r = rng(12), n = 150, trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.55, 7, 7), new THREE.MeshStandardMaterial({ color: 0x3a3126, roughness: 1 }), n), crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1f3317, roughness: 1 }), n * 2);
  const o = new THREE.Object3D(); let i = 0, j = 0;
  for (let row = 0; row < 4 && i < n; row++) for (let z = 255; z > -400 && i < n; z -= 17 + r() * 3) {
    const x = (row < 2 ? -1 : 1) * (row % 2 ? 54 : 43) + (r() - 0.5) * 3; o.position.set(x, 3.5, z); o.rotation.set(0, 0, 0); o.scale.set(1, 0.9 + r() * 0.3, 1); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix); i++;
    for (let k = 0; k < 2; k++) { const s = 4.6 + r() * 2.2; o.position.set(x + (r() - 0.5) * 2, 8 + k * 2.6 + r(), z + (r() - 0.5) * 2); o.scale.set(s, s * 0.8, s); o.updateMatrix(); crown.setMatrixAt(j, o.matrix); j++; }
  }
  trunk.count = i; crown.count = j; mall.add(trunk, crown);
}
// path lamps
const lampGlows = []; for (const s of [-1, 1]) for (let z = 250; z > -400; z -= 30) { const g = mkGlow(0xffd9a0, 4.5); g.position.set(s * 31, 4.2, z); mall.add(g); lampGlows.push(g); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1c })); pole.position.set(s * 31, 2.1, z); mall.add(pole); }
// the Monument
const monMat = (() => { const c = mkCanvas(8, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#b9b6ae'); g.addColorStop(1, '#4a4947'); x.fillStyle = g; x.fillRect(0, 0, 8, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.6 }); })();
const monument = new THREE.Group(); monument.position.set(0, 0.8, MZ); mall.add(monument);
{ const shaft = new THREE.Mesh(new THREE.CylinderGeometry(7.3, 11.9, 152, 4, 1), monMat); shaft.rotation.y = Math.PI / 4; shaft.position.y = 76; monument.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(7.3, 17, 4, 1), marble); tip.rotation.y = Math.PI / 4; tip.position.y = 152 + 8.5; monument.add(tip); }
const mon2 = monument.clone(true); mon2.scale.y = -1; mon2.position.y = -0.1; mall.add(mon2);
const redLights = [0, 1, 2, 3].map((i) => { const g = mkGlow(0xff2a1a, 7); g.position.set(Math.cos(i * 1.5708) * 5.2, 148, Math.sin(i * 1.5708) * 5.2); monument.add(g); return g; });
const floodL = [-1, 1].map((s) => { const l = new THREE.PointLight(0xfff0d8, 0, 160, 1.6); l.position.set(s * 40, 6, MZ + 30); mall.add(l); return l; });
// flag ring around the Monument (and the flag shader)
const flagTex = (() => { const W = 380, H = 200, c = mkCanvas(W, H), x = c.getContext('2d'); for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#f4f1ea' : '#b22234'; x.fillRect(0, i * H / 13, W, H / 13 + 1); } x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, 152, H * 7 / 13); x.fillStyle = '#f4f1ea'; for (let r = 0; r < 9; r++) for (let q = 0; q < (r % 2 ? 5 : 6); q++) { x.beginPath(); x.arc(14 + q * 25 + (r % 2 ? 12.5 : 0), 12 + r * 10.3, 2.3, 0, 6.283); x.fill(); } return toTex(c); })();
const flagMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide, fog: false,
  uniforms: { uT: { value: 0 }, map: { value: flagTex }, uLight: { value: 1 } },
  vertexShader: `uniform float uT; varying vec2 vUv; varying float vSh; void main(){ vUv = uv; vec3 p = position; float ph = modelMatrix[3].x*0.37 + modelMatrix[3].z*0.23; float k = clamp(p.x/3.0, 0.0, 1.0);
    float w = sin(p.x*2.3 - uT*7.0 + ph)*0.22*k + sin(p.x*4.1 - uT*11.0 + ph*1.7)*0.06*k; p.z += w; p.y += sin(p.x*1.7 - uT*5.0 + ph)*0.04*k; vSh = 0.82 + 0.18*cos(p.x*2.3 - uT*7.0 + ph)*k;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform float uLight; varying vec2 vUv; varying float vSh; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb * uLight * vSh, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const flagGeo = (() => { const g = new THREE.PlaneGeometry(3.0, 1.9, 14, 6); g.translate(1.5, 0, 0); return g; })();
const poleMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.4, metalness: 0.6 });
const ringFlags = [];
{ const N = 50, R = 32, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 9.5, 6), poleMat, N), o = new THREE.Object3D();
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, x = Math.cos(a) * R, z = MZ + Math.sin(a) * R; o.position.set(x, 4.75, z); o.updateMatrix(); poles.setMatrixAt(i, o.matrix); const f = new THREE.Mesh(flagGeo, flagMat); f.scale.setScalar(0.9); f.position.set(x + 0.05, 8.0, z); f.rotation.y = -0.35 + Math.sin(i * 1.9) * 0.08; mall.add(f); ringFlags.push(f); }
  mall.add(poles); }
// the Capitol, far down the Mall
const CAP_Z = -2350;
{
  const cap = new THREE.Group(); cap.position.set(0, 0, CAP_Z); mall.add(cap);
  const fz = (() => { const c = mkCanvas(1024, 256), e = mkCanvas(1024, 256), x = c.getContext('2d'), ex = e.getContext('2d'), r = rng(23); x.fillStyle = '#e8e5dd'; x.fillRect(0, 0, 1024, 256); ex.fillStyle = '#000'; ex.fillRect(0, 0, 1024, 256); for (let f = 0; f < 3; f++) for (let i = 0; i < 40; i++) { x.fillStyle = '#4b5560'; x.fillRect(i * 25.6 + 7, f * 84 + 22, 12, 40); if (r() < 0.55) { ex.fillStyle = '#ffd7a0'; ex.fillRect(i * 25.6 + 7, f * 84 + 22, 12, 40); } } return { map: toTex(c), emissiveMap: toTex(e) }; })();
  const wingM = new THREE.MeshStandardMaterial({ map: fz.map, emissiveMap: fz.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.8 });
  const wingsM = [wingM, wingM, marble, marble, wingM, wingM];
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(95, 24, 50), wingsM); w.position.set(s * 78, 12, 0); cap.add(w); }
  const centre = new THREE.Mesh(new THREE.BoxGeometry(64, 30, 54), wingsM); centre.position.set(0, 15, 0); cap.add(centre);
  for (let i = 0; i < 12; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 20, 10), marble); col.position.set(-16.5 + i * 3, 11, 30); cap.add(col); }
  const ped = new THREE.Mesh(new THREE.BoxGeometry(40, 5, 3), marble); ped.position.set(0, 22, 30); cap.add(ped);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 14, 40), marble); drum.position.y = 37; cap.add(drum);
  const colR = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.55, 12, 8), marble, 32), o = new THREE.Object3D(); for (let i = 0; i < 32; i++) { const a = (i / 32) * 6.283; o.position.set(Math.cos(a) * 15.8, 37, Math.sin(a) * 15.8); o.updateMatrix(); colR.setMatrixAt(i, o.matrix); } cap.add(colR);
  const pts = [[0, 0], [14, 0], [13.5, 6], [11, 14], [8, 22], [5, 28], [2.5, 31], [0, 32]].map(([x, y]) => new THREE.Vector2(x, y));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.6, emissive: 0x4a463c })); dome.position.y = 44; cap.add(dome);
  const lant = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 8, 12), marble); lant.position.y = 80; cap.add(lant);
  const stat = new THREE.Mesh(new THREE.ConeGeometry(1.2, 6, 8), new THREE.MeshStandardMaterial({ color: 0x777b78, metalness: 0.6, roughness: 0.4 })); stat.position.y = 87; cap.add(stat);
  const gl = mkGlow(0xffe3b0, 360); gl.position.set(0, 50, 40); cap.add(gl);
}

/* ---------- WHITE HOUSE group (far away from the Mall so nothing overlaps) ---------- */
const wh = new THREE.Group(); wh.position.set(6000, 0, 0); scene.add(wh);
const motor = [];
let whFlag;
{
  const fz = (() => { const W = 1024, H = 320, c = mkCanvas(W, H), e = mkCanvas(W, H), x = c.getContext('2d'), ex = e.getContext('2d'), r = rng(31); x.fillStyle = '#ece9e1'; x.fillRect(0, 0, W, H); for (let i = 0; i < 6000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.05)'; x.fillRect(r() * W, r() * H, 3, 2); } ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
    for (let f = 0; f < 3; f++) for (let i = 0; i < 11; i++) { const wx = 36 + i * 90, wy = 26 + f * 98, w = 40, h = 70; x.fillStyle = '#d8d4c8'; x.fillRect(wx - 6, wy - 8, w + 12, 10); x.fillStyle = '#2b3138'; x.fillRect(wx, wy, w, h); x.fillStyle = '#d8d4c8'; x.fillRect(wx + w / 2 - 1.5, wy, 3, h); x.fillRect(wx, wy + h * 0.5 - 1.5, w, 3); if (r() < 0.62) { ex.fillStyle = r() < 0.5 ? '#ffcf8c' : '#ffe6b8'; ex.fillRect(wx, wy, w, h); } }
    return { map: toTex(c), emissiveMap: toTex(e) }; })();
  const fm = new THREE.MeshStandardMaterial({ map: fz.map, emissiveMap: fz.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.8 }), plain = new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.85, emissive: 0x23221e });
  const main = new THREE.Mesh(new THREE.BoxGeometry(54, 18, 20), [plain, plain, plain, plain, fm, plain]); main.position.set(0, 9, -10); wh.add(main);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(24, 11, 16), [plain, plain, plain, plain, fm, plain]); w.position.set(s * 40, 5.5, -9); wh.add(w); const rr = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 18), new THREE.MeshStandardMaterial({ color: 0x7a7e80 })); rr.position.set(s * 40, 11.4, -9); wh.add(rr); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(50, 3.5, 17), new THREE.MeshStandardMaterial({ color: 0x4a4e52, roughness: 0.9 })); roof.position.set(0, 19.7, -10); wh.add(roof);
  for (let i = 0; i < 5; i++) { const ch = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 1.6), plain); ch.position.set(-18 + i * 9, 23, -10); wh.add(ch); }
  for (let i = 0; i < 6; i++) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 11, 12), plain); col.position.set(-7.5 + i * 3, 6.5, 3.5); wh.add(col); }
  const ent = new THREE.Mesh(new THREE.BoxGeometry(19, 1.6, 8), plain); ent.position.set(0, 12.8, 2); wh.add(ent);
  const sh = new THREE.Shape(); sh.moveTo(-9.5, 0); sh.lineTo(9.5, 0); sh.lineTo(0, 3.6); sh.closePath(); const pedi = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 8, bevelEnabled: false }), plain); pedi.position.set(0, 13.6, -2); wh.add(pedi);
  const steps = new THREE.Mesh(new THREE.BoxGeometry(17, 0.7, 5), plain); steps.position.set(0, 0.35, 6.5); wh.add(steps);
  // flag on the roof
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 10, 6), poleMat); pole.position.set(0, 26.5, -10); wh.add(pole);
  whFlag = new THREE.Mesh(flagGeo, flagMat); whFlag.scale.setScalar(1.15); whFlag.rotation.y = -0.3; wh.add(whFlag);
  // grounds
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(400, 160), new THREE.MeshStandardMaterial({ map: noiseTex('#2a3922', 30, 256, 9, [50, 20]), roughness: 1, emissive: 0x0c1408 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.02, 20); wh.add(lawn);
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(9, 50), new THREE.MeshStandardMaterial({ color: 0x3d3d3f, roughness: 0.9, emissive: 0x161618 })); drive.rotation.x = -Math.PI / 2; drive.position.set(0, 0.0, 28); wh.add(drive);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(500, 26), new THREE.MeshStandardMaterial({ map: (() => { const c = mkCanvas(512, 128), x = c.getContext('2d'), r = rng(2); x.fillStyle = '#323335'; x.fillRect(0, 0, 512, 128); for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() * 0.05})`; x.fillRect(r() * 512, r() * 128, 2, 2); } x.fillStyle = '#c9a834'; x.fillRect(0, 62, 512, 3); x.fillRect(0, 67, 512, 3); const t = toTex(c); t.repeat.set(10, 1); return t; })(), roughness: 0.9, emissive: 0x1c1c20 })); street.rotation.x = -Math.PI / 2; street.position.set(0, 0.0, 70); wh.add(street);
  const sw = new THREE.Mesh(new THREE.PlaneGeometry(500, 12), new THREE.MeshStandardMaterial({ color: 0x77746c, roughness: 1, emissive: 0x24221e })); sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.04, 51); wh.add(sw);
  // iron fence
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 2.3, 0.04), new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.6, metalness: 0.4 }), 1100), o = new THREE.Object3D(); let bi = 0;
  for (let x = -85; x <= 85 && bi < 1100; x += 0.16) { if (Math.abs(x) < 4.6) continue; o.position.set(x, 1.2, 42); o.updateMatrix(); bars.setMatrixAt(bi++, o.matrix); } bars.count = bi; wh.add(bars);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(170, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x0c0c0d })); rail.position.set(0, 2.1, 42); wh.add(rail); const rail2 = rail.clone(); rail2.position.y = 0.4; wh.add(rail2);
  for (const sx of [-4.7, 4.7]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.6, 0.9), plain); post.position.set(sx, 1.8, 42); wh.add(post); const g = mkGlow(0xffd9a0, 5); g.position.set(sx, 3.9, 42); wh.add(g); }
  for (let x = -90; x <= 90; x += 24) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7, 6), new THREE.MeshStandardMaterial({ color: 0x1c1c1e })); pole.position.set(x, 3.5, 54); wh.add(pole); const g = mkGlow(0xffd9a0, 8); g.position.set(x, 7.2, 54); wh.add(g); const g2 = mkGlow(0xffb060, 26); g2.position.set(x, 7.2, 54); g2.material.opacity = 0.25; wh.add(g2); }
  for (let x = -96; x <= 96; x += 24) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc27a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pl.rotation.x = -Math.PI / 2; pl.position.set(x, 0.08, 62); wh.add(pl); }
  // trees behind and beside
  const tr = rng(33); for (let i = 0; i < 28; i++) { const x = (i < 14 ? -1 : 1) * (45 + tr() * 90), z = -30 - tr() * 30 + (i % 7) * 12; const t = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1b2c15, roughness: 1 })); const s = 7 + tr() * 5; t.scale.set(s, s * 0.9, s); t.position.set(x, s, z); wh.add(t); }
  // uplighting on the facade
  wh.userData.spots = [-1, 1].map((s) => { const l = new THREE.SpotLight(0xffe4b8, 0, 90, 0.5, 0.6, 1.3); l.position.set(s * 14, 0.5, 30); l.target.position.set(s * 6, 9, 0); wh.add(l, l.target); return l; });
  // motorcade
  const suvM = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.3, metalness: 0.5 });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.35, 5.6), suvM); body.position.y = 1.05; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 3.2), new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.2, metalness: 0.5 })); cab.position.set(0, 1.9, -0.3); g.add(cab);
    for (const [wx, wz] of [[-1, -1.8], [1, -1.8], [-1, 1.8], [1, 1.8]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a0a })); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.45, wz); g.add(w); }
    const sR = mkGlow(0xff1a14, 1.7), sB = mkGlow(0x2a5bff, 1.7); sR.position.set(-0.7, 2.35, 2.6); sB.position.set(0.7, 2.35, 2.6); const sR2 = mkGlow(0xff1a14, 1.5), sB2 = mkGlow(0x2a5bff, 1.5); sR2.position.set(-0.6, 2.3, -2.4); sB2.position.set(0.6, 2.3, -2.4);
    const hl = mkGlow(0xfff2d0, 1.9), hl2 = mkGlow(0xfff2d0, 1.9); hl.position.set(-0.7, 1.0, 2.9); hl2.position.set(0.7, 1.0, 2.9); const tl = mkGlow(0xff1010, 0.9), tl2 = mkGlow(0xff1010, 0.9); tl.position.set(-0.7, 1.2, -2.85); tl2.position.set(0.7, 1.2, -2.85);
    const pR = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff2a1a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), pB = new THREE.Mesh(pR.geometry, new THREE.MeshBasicMaterial({ map: glowTex, color: 0x2a5bff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pR.rotation.x = pB.rotation.x = -Math.PI / 2; pR.position.set(-3, 0.12, 0); pB.position.set(3, 0.12, 0); g.add(pR, pB); g.userData = { pR, pB };
    g.add(sR, sB, sR2, sB2, hl, hl2, tl, tl2); wh.add(g); motor.push({ g, sR, sB, sR2, sB2, i, hl, hl2 });
  }
}
// motorcade path: along the avenue, curve into the gate, up the drive
const PATH = (() => { const L1 = 132, Lc = 16, L3 = 34; return { L1, Lc, L3, total: L1 + Lc + L3 }; })();
function pathAt(s) {
  const { L1, Lc, L3 } = PATH;
  if (s <= L1) return { x: -126 + s, z: 62, dx: 1, dz: 0 };
  if (s <= L1 + Lc) { const u = (s - L1) / Lc, x = lerp(-8, 0, u * u * (3 - 2 * u)) , z = lerp(62, 54, u); return { x, z, dx: 1 - u, dz: -u }; }
  const q = s - L1 - Lc; return { x: 0, z: 54 - q, dx: 0, dz: -1 };
}

/* ---------- camera paths ---------- */
const _cp = new THREE.Vector3(), _tg = new THREE.Vector3();
function shot(T) {
  if (T < T_WH0) { // A: the Monument at dusk, rising from the pool
    const u = sm(0, T_WH0, T); _cp.set(lerp(10, -4, u), lerp(2.6, 15, u), lerp(-110, -205, u)); _tg.set(0, lerp(78, 112, u), MZ);
  } else if (T < 24.6) { // B: the avenue and the north front, motorcade arrives
    const u = sm(T_WH0, 24.6, T); _cp.set(6000 + lerp(-52, -30, u), lerp(2.6, 3.2, u), 92); _tg.set(6000 + lerp(-2, 2, u), 8.5, 10);
  } else if (T < T_WH1) { // C: a slow tracking move along the fence
    const u = sm(24.6, T_WH1, T); _cp.set(6000 + lerp(-34, 30, u), 3.0, 90); _tg.set(6000 + lerp(-8, 8, u), lerp(8.5, 10, u), 4);
  } else if (T < 44.2) { // D: down the Mall toward the Capitol as day breaks
    const u = sm(T_WH1, 44.2, T); _cp.set(lerp(42, 34, u), lerp(34, 26, u), lerp(-250, -280, u)); _tg.set(lerp(-6, 4, u), lerp(52, 60, u), -1500);
  } else { // E: among the flags
    const u = sm(44.2, T_SCENE, T); _cp.set(lerp(10, 2, u), lerp(1.7, 2.6, u), lerp(MZ + 70, MZ + 62, u)); _tg.set(0, lerp(26, 48, u), MZ);
  }
}

/* ---------- update ---------- */
const _col = new THREE.Color(), _m = new THREE.Matrix4();
function update(T) {
  shot(T); const fov = (T >= T_WH0 && T < T_WH1) ? 54 : 72; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.position.copy(_cp); camera.lookAt(_tg);
  // slow handheld-style drift so it never feels frozen
  camera.position.x += Math.sin(T * 0.8) * 0.06; camera.position.y += Math.sin(T * 0.63) * 0.04;
  const top = kfc(T, TOP), hor = kfc(T, HOR), night = 1 - clamp(kf(T, [[0, 0], [12, 0.25], [22, 1], [36, 1], [41, 0.7], [46, 0.1], [54.6, 0]]));
  skyMat.uniforms.top.value.setRGB(...top); skyMat.uniforms.hor.value.setRGB(...hor);
  const sunA = kf(T, [[0, 0.14], [12, 0.02], [22, -0.1], [40, -0.06], [46, 0.1], [54.6, 0.3]]), sunZ = T < 30 ? -1 : 1;
  const sd = new THREE.Vector3(T < 30 ? -0.7 : 0.7, Math.max(sunA, 0.02), T < 30 ? -0.5 : -0.9).normalize(); skyMat.uniforms.sunDir.value.copy(sd); skyMat.uniforms.glow.value = clamp(kf(T, [[0, 1], [14, 0.4], [22, 0], [38, 0], [46, 1], [54.6, 0.6]]));
  sky.position.copy(camera.position); starPts.position.copy(camera.position); starPts.material.opacity = kf(T, STARS);
  fogCol.setRGB(hor[0] * 0.65, hor[1] * 0.65, hor[2] * 0.7); scene.fog.color.copy(fogCol); scene.fog.density = (T >= T_WH0 && T < T_WH1) ? 0.0006 : lerp(0.00022, 0.0004, 1 - night);
  hemi.color.setRGB(0.3 + top[0] * 0.6, 0.38 + top[1] * 0.6, 0.55 + top[2] * 0.5); hemi.groundColor.setRGB(0.12, 0.11, 0.1); hemi.intensity = lerp(0.9, 0.5, night * 0.8);
  dirL.color.setRGB(1, 0.72 + 0.1 * (1 - night), 0.5 + 0.2 * (1 - night)); dirL.intensity = lerp(0.2, 1.6, clamp(sunA * 3 + 0.2)); dirL.position.copy(sd).multiplyScalar(500).add(camera.position);
  // groups
  const inWH = T >= T_WH0 && T < T_WH1; mall.visible = !inWH; wh.visible = inWH;
  // Monument: floodlit at night
  monMat.emissiveIntensity = lerp(0.12, 0.85, night); floodL.forEach((l) => (l.intensity = lerp(0, 90, night)));
  redLights.forEach((g, i) => { const b = (Math.sin(T * 3.0 + i * 1.6) > 0.1 ? 1 : 0.15); g.material.opacity = b * (0.4 + 0.6 * night); });
  lampGlows.forEach((g) => (g.material.opacity = 0.05 + 0.95 * night));
  // flags: breeze; lowered after the proclamation
  flagMat.uniforms.uT.value = T; flagMat.uniforms.uLight.value = lerp(0.95, 1.5, night * 0.8);
  const drop = sm(T_FLAG, T_FLAG + 2.0, T);
  ringFlags.forEach((f, i) => { f.position.y = lerp(8.0, 4.2, drop) + Math.sin(T * 0.7 + i) * 0.02; });
  poolMat.uniforms.uT.value = T; poolMat.uniforms.top.value.setRGB(...top); poolMat.uniforms.hor.value.setRGB(...hor); poolMat.uniforms.uCam.value.copy(camera.position);
  // White House: the flag comes down in the first minutes; lights; motorcade
  whFlag.position.set(wh.position.x * 0 + 0, lerp(31.4, 27.6, sm(20.5, 22.4, T)), -10);
  wh.userData.spots.forEach((l) => (l.intensity = lerp(0, 220, night)));
  const tM = T - 13.6, v = 21;
  motor.forEach((m) => {
    const s0 = Math.min(Math.max(0, v * tM) - m.i * 11.5, PATH.total - m.i * 4.4), vis = tM > 0 && s0 > -30;
    m.g.visible = vis; if (!vis) return; const p = pathAt(Math.max(s0, 0)); m.g.position.set(p.x, 0, p.z); m.g.rotation.y = Math.atan2(p.dx, p.dz);
    const ph = Math.floor(T * 9 + m.i) % 2 === 0; m.sR.material.opacity = ph ? 1 : 0.1; m.sB.material.opacity = ph ? 0.1 : 1; m.sR2.material.opacity = ph ? 0.1 : 1; m.sB2.material.opacity = ph ? 1 : 0.1; m.g.userData.pR.material.opacity = ph ? 0.4 : 0.05; m.g.userData.pB.material.opacity = ph ? 0.05 : 0.4;
  });
}

/* ---------- HUD / captions / chart / facts / end ---------- */
const elTitle = document.getElementById('title'), hud = document.getElementById('hud'), cap = document.getElementById('caption'), end = document.getElementById('end'), flash = document.getElementById('flash'), tag = document.getElementById('tag'), facts = document.getElementById('facts'), chart = document.getElementById('chart');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const BEATS = [
  { a: 4.6, b: 13.0, label: 'Time since the death', value: '0 minutes', sub: 'The Vice President is now the President' },
  { a: 14.0, b: 24.0, label: 'Within minutes', value: 'Secure location', sub: 'The Secret Service moves the Vice President' },
  { a: 25.2, b: 33.2, label: 'Time to the oath, 1963', value: '1 h 38 min', sub: 'Kennedy died at 1:00 pm. Johnson was sworn in at 2:38 pm' },
  { a: 34.4, b: 43.6, label: 'Stock market, Nov 1963', value: 'closed early', sub: 'Closed at 2:07 pm, then four days later up 4.5%' },
  { a: 45.2, b: 54.0, label: 'Mourning period', value: '30 days', sub: 'Flags at half-staff nationwide' },
];
const CAPS = [
  [4.8, 12.8, 'There is no waiting. The Vice President becomes President the moment the president dies.'],
  [14.2, 20.4, 'Protective details move. The motorcade heads for the White House.'],
  [20.9, 24.2, 'The flag on the roof comes down.'],
  [25.4, 33.0, 'The oath can happen anywhere, in a room or on a plane.'],
  [34.6, 43.4, 'By the next day markets, Congress and the Cabinet are already moving.'],
  [45.4, 50.2, 'Flags go to half-staff. The president lies in state at the Capitol.'],
  [50.6, 54.0, 'The new president then names a Vice President. Congress confirms.'],
];
const FACTS = [
  ['Replacing the Vice President', 'both houses vote', '25th Amendment, Section 2: the new president nominates, and a majority of both houses must confirm. Used for Ford (1973) and Rockefeller (1974)'],
  ['History', '4 assassinated', 'Eight presidents have died in office. Lincoln, Garfield, McKinley and Kennedy were assassinated'],
];
facts.innerHTML = FACTS.map((f) => `<div class="fr"><div class="fl">${f[0]}</div><div class="fv">${f[1]}</div><div class="fs">${f[2]}</div></div>`).join('');
const factEls = [...facts.querySelectorAll('.fr')];
{ const g = document.getElementById('grain'), c = g.getContext('2d'), id = c.createImageData(256, 256), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }
function drawChart(T) {
  const c = chart.getContext('2d'), W = chart.width, H = chart.height, a = sm(35.4, 36.1, T) * (1 - sm(43.0, 43.6, T)); chart.style.opacity = a; c.clearRect(0, 0, W, H); if (a <= 0) return;
  c.font = '600 22px "Helvetica Neue", Arial, sans-serif'; c.fillStyle = 'rgba(244,239,230,.75)'; c.textAlign = 'center';
  const bars = [['Fri Nov 22', -2.9, 'closed 2:07 pm'], ['Mon Nov 25', 0, 'closed for the funeral'], ['Tue Nov 26', 4.5, 'reopened']];
  const base = H * 0.52, sc = 38; c.strokeStyle = 'rgba(244,239,230,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(40, base); c.lineTo(W - 40, base); c.stroke();
  bars.forEach(([lab, v, sub], i) => {
    const x = 170 + i * 330, p = sm(35.6 + i * 0.55, 36.6 + i * 0.55, T), h = v * sc * p; c.fillStyle = v < 0 ? 'rgba(226,90,80,.92)' : v > 0 ? 'rgba(110,200,140,.92)' : 'rgba(244,239,230,.25)';
    if (v !== 0) c.fillRect(x - 50, v > 0 ? base - h : base, 100, Math.abs(h)); else c.fillRect(x - 50, base - 3, 100, 6);
    c.fillStyle = 'rgba(244,239,230,.9)'; c.fillText(lab, x, H - 40); c.font = '500 18px "Helvetica Neue", Arial, sans-serif'; c.fillStyle = 'rgba(244,239,230,.6)'; c.fillText(sub, x, H - 14);
    c.font = '700 30px "Helvetica Neue", Arial, sans-serif'; c.fillStyle = 'rgba(244,239,230,.95)'; if (v !== 0) c.fillText((v > 0 ? '+' : '−') + Math.abs(v * p).toFixed(1) + '%', x, v > 0 ? base - h - 14 : base + Math.abs(h) + 34); c.font = '600 22px "Helvetica Neue", Arial, sans-serif';
  });
}

/* ---------- motion graphics layer: timeline scrubber with a tapping cursor, clock, quoted text, ladder of succession, poll ---------- */
const gfx = document.getElementById('gfx'); gfx.width = 540 * Math.min(DPR, 2); gfx.height = 960 * Math.min(DPR, 2); const gc = gfx.getContext('2d');
const SANS = '"Helvetica Neue", Arial, "Liberation Sans", sans-serif', SERIF = '"Cormorant Garamond", "Liberation Serif", serif';
const INK = '244,239,230', GOLD = '232,205,140';
function rr(x, y, w, h, r) { gc.beginPath(); gc.moveTo(x + r, y); gc.arcTo(x + w, y, x + w, y + h, r); gc.arcTo(x + w, y + h, x, y + h, r); gc.arcTo(x, y + h, x, y, r); gc.arcTo(x, y, x + w, y, r); gc.closePath(); }
function cursor(x, y, press) { gc.save(); gc.translate(x, y); gc.scale(1.35 * (1 - 0.12 * press), 1.35 * (1 - 0.12 * press)); gc.shadowColor = 'rgba(0,0,0,.55)'; gc.shadowBlur = 8; gc.fillStyle = '#fff'; gc.strokeStyle = '#111'; gc.lineWidth = 1.6; gc.beginPath(); gc.moveTo(0, 0); gc.lineTo(0, 22); gc.lineTo(5.6, 17); gc.lineTo(9.6, 26); gc.lineTo(13.4, 24.4); gc.lineTo(9.4, 15.6); gc.lineTo(16.6, 15.4); gc.closePath(); gc.fill(); gc.stroke(); gc.restore(); }
function ripple(x, y, u) { if (u <= 0 || u >= 1) return; gc.save(); gc.strokeStyle = `rgba(${GOLD},${0.85 * (1 - u)})`; gc.lineWidth = 2.4; gc.beginPath(); gc.arc(x, y, 6 + 26 * u, 0, 6.283); gc.stroke(); gc.restore(); }
function label(txt, x, y, size, alpha, align = 'left', weight = 700, space = 2.4) { gc.save(); gc.font = `${weight} ${size}px ${SANS}`; gc.fillStyle = `rgba(${INK},${alpha})`; gc.textAlign = align; gc.textBaseline = 'alphabetic'; if ('letterSpacing' in gc) gc.letterSpacing = space + 'px'; gc.fillText(txt, x, y); gc.restore(); }
const MS = [{ t: 4.6, l: 'MINUTE 0' }, { t: 14.0, l: '15 MIN' }, { t: 25.2, l: '2 HOURS' }, { t: 34.4, l: '1 DAY' }, { t: 45.2, l: '30 DAYS' }];
function drawTimeline(T, k) {
  const a = sm(4.4, 5.2, T) * (1 - sm(53.6, 54.3, T)); if (a <= 0.01) return;
  const x0 = 56, x1 = 484, y = 846, xs = MS.map((m, i) => x0 + (x1 - x0) * i / (MS.length - 1));
  let px = xs[0]; for (let i = 0; i < MS.length - 1; i++) if (T >= MS[i].t) px = lerp(xs[i], xs[i + 1], smooth((T - MS[i].t) / ((MS[i + 1].t) - MS[i].t)));
  if (T >= MS[MS.length - 1].t) px = xs[MS.length - 1];
  gc.save(); gc.globalAlpha = a; gc.lineCap = 'round'; gc.strokeStyle = `rgba(${INK},.22)`; gc.lineWidth = 3 * k; gc.beginPath(); gc.moveTo(x0 * k, y * k); gc.lineTo(x1 * k, y * k); gc.stroke();
  gc.strokeStyle = `rgba(${GOLD},.95)`; gc.beginPath(); gc.moveTo(x0 * k, y * k); gc.lineTo(px * k, y * k); gc.stroke();
  MS.forEach((m, i) => { const on = T >= m.t - 0.01, cur = on && (i === MS.length - 1 || T < MS[i + 1].t); gc.fillStyle = on ? `rgba(${GOLD},1)` : `rgba(${INK},.45)`; gc.beginPath(); gc.arc(xs[i] * k, y * k, (cur ? 6.4 : 4.4) * k, 0, 6.283); gc.fill(); gc.restore(); label(m.l, xs[i] * k, (y + 26) * k, 9.6 * k, on ? (cur ? 1 : 0.75) : 0.4, 'center', 700, 2 * k); gc.save(); gc.globalAlpha = a; });
  gc.restore(); gc.save(); gc.globalAlpha = a;
  // the cursor follows the playhead and taps each milestone as it is reached
  let press = 0, rp = -1, rx = 0; MS.forEach((m, i) => { const d = T - m.t; if (d > 0 && d < 0.5) { press = Math.sin(d / 0.5 * Math.PI); } if (d > 0.1 && d < 0.9) { rp = (d - 0.1) / 0.8; rx = xs[i]; } });
  cursor((px + 6) * k - 0, (y + 8) * k, press);
  gc.restore(); if (rp > 0) { gc.save(); gc.globalAlpha = a; ripple(rx * k, y * k, rp); gc.restore(); }
}
function drawClock(T, k) {
  const a = sm(25.5, 26.2, T) * (1 - sm(32.7, 33.3, T)); if (a <= 0.01) return;
  const cx = 270 * k, cy = 170 * k, R = 76 * k; gc.save(); gc.globalAlpha = a;
  gc.fillStyle = 'rgba(8,10,16,.62)'; gc.beginPath(); gc.arc(cx, cy, R + 14 * k, 0, 6.283); gc.fill(); gc.strokeStyle = `rgba(${INK},.5)`; gc.lineWidth = 2 * k; gc.beginPath(); gc.arc(cx, cy, R + 14 * k, 0, 6.283); gc.stroke();
  const mins = lerp(0, 98, smooth((T - 26.4) / 4.6)), hAng = ((1 + mins / 60) / 12) * 6.283 - 1.5708, mAng = ((mins % 60) / 60) * 6.283 - 1.5708, a0 = (1 / 12) * 6.283 - 1.5708;
  gc.strokeStyle = `rgba(${GOLD},.95)`; gc.lineWidth = 7 * k; gc.lineCap = 'butt'; gc.beginPath(); gc.arc(cx, cy, R + 4 * k, a0, hAng); gc.stroke();
  for (let i = 0; i < 60; i++) { const an = (i / 60) * 6.283 - 1.5708, big = i % 5 === 0; gc.strokeStyle = `rgba(${INK},${big ? 0.85 : 0.3})`; gc.lineWidth = (big ? 2.2 : 1) * k; gc.beginPath(); gc.moveTo(cx + Math.cos(an) * (R - (big ? 12 : 6) * k), cy + Math.sin(an) * (R - (big ? 12 : 6) * k)); gc.lineTo(cx + Math.cos(an) * (R - 1 * k), cy + Math.sin(an) * (R - 1 * k)); gc.stroke(); }
  gc.lineCap = 'round'; gc.strokeStyle = `rgba(${INK},.95)`; gc.lineWidth = 4.6 * k; gc.beginPath(); gc.moveTo(cx, cy); gc.lineTo(cx + Math.cos(hAng) * R * 0.5, cy + Math.sin(hAng) * R * 0.5); gc.stroke(); gc.lineWidth = 3 * k; gc.beginPath(); gc.moveTo(cx, cy); gc.lineTo(cx + Math.cos(mAng) * R * 0.78, cy + Math.sin(mAng) * R * 0.78); gc.stroke(); gc.fillStyle = `rgba(${GOLD},1)`; gc.beginPath(); gc.arc(cx, cy, 4 * k, 0, 6.283); gc.fill(); gc.restore();
  const t1 = T < 28.2; label(t1 ? '1:00 PM  ·  PRESIDENT PRONOUNCED DEAD' : T < 30.6 ? 'OATH ON AIR FORCE ONE  ·  DALLAS' : '2:38 PM  ·  SWORN IN', cx, (170 + 76 + 36) * k, 10.4 * k, a * 0.9, 'center', 700, 1.6 * k);
}
function wrapText(txt, maxW) { const words = txt.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (gc.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur); return lines; }
const QUOTE = 'In case of the removal of the President from office or of his death or resignation, the Vice President shall become President.', QKEY = 'the Vice President shall become President.';
function drawQuote(T, k) {
  const a = sm(5.0, 5.6, T) * (1 - sm(12.4, 13.0, T)); if (a <= 0.01) return;
  const x = 36 * k, y = 96 * k, w = 468 * k, h = 188 * k; gc.save(); gc.globalAlpha = a; gc.fillStyle = 'rgba(8,10,16,.66)'; rr(x, y, w, h, 14 * k); gc.fill(); gc.strokeStyle = `rgba(${INK},.28)`; gc.lineWidth = 1.4 * k; rr(x, y, w, h, 14 * k); gc.stroke(); gc.fillStyle = `rgba(${GOLD},.9)`; gc.fillRect(x, y + 18 * k, 3.5 * k, 22 * k);
  label('25TH AMENDMENT  ·  SECTION 1', x + 22 * k, y + 34 * k, 10.4 * k, 0.9, 'left', 700, 2 * k);
  const n = Math.min(QUOTE.length, Math.floor(Math.max(0, T - 5.7) * 30)), shown = QUOTE.slice(0, n); gc.font = `italic 500 ${22 * k}px ${SERIF}`; gc.textBaseline = 'alphabetic';
  const full = wrapText(QUOTE, w - 44 * k), ki = QUOTE.indexOf(QKEY); let used = 0, cursorX = 0, cursorY = 0;
  full.forEach((ln, li) => { const ly = y + (74 + li * 28) * k, start = used, end = used + ln.length; used = end + 1; const part = shown.slice(start, Math.max(start, Math.min(end, n)));
    // highlight bar under the key phrase once it has been typed
    const hs = Math.max(ki, start), he = Math.min(ki + QKEY.length, end), hp = sm(8.9, 9.6, T);
    if (he > hs && hp > 0) { const px0 = gc.measureText(ln.slice(0, hs - start)).width, pw = gc.measureText(ln.slice(hs - start, he - start)).width; gc.fillStyle = `rgba(${GOLD},${0.32 * hp})`; gc.fillRect(x + 22 * k + px0, ly - 19 * k, pw * hp, 26 * k); }
    gc.fillStyle = `rgba(${INK},.97)`; gc.fillText(part, x + 22 * k, ly); if (n >= start && n <= end) { cursorX = x + 22 * k + gc.measureText(part).width; cursorY = ly; } });
  if (n < QUOTE.length) { gc.fillStyle = `rgba(${GOLD},${0.5 + 0.5 * Math.sin(T * 14)})`; gc.fillRect(cursorX + 2 * k, cursorY - 18 * k, 2 * k, 22 * k); }
  gc.restore();
}
const LADDER = ['Vice President', 'Speaker of the House', 'President pro tempore of the Senate', 'Secretary of State', 'Secretary of the Treasury'];
function drawLadder(T, k) {
  const a = sm(T_SCENE - 0.1, T_SCENE + 0.5, T) * (1 - sm(59.0, 59.6, T)); if (a <= 0.01) return;
  gc.save(); gc.globalAlpha = a; label('LINE OF SUCCESSION', 48 * k, 72 * k, 11 * k, 0.9, 'left', 700, 2.6 * k);
  const x = 48 * k, w = 444 * k, h = 44 * k, gap = 9 * k, y0 = 88 * k, t0 = T_SCENE + 0.3; let curX = 0, curY = 0, press = 0, rp = -1, rx = 0, ry = 0;
  const taps = [T_SCENE + 2.4, T_SCENE + 3.3, T_SCENE + 4.1];
  LADDER.forEach((nm, i) => {
    const en = sm(t0 + i * 0.28, t0 + 0.55 + i * 0.28, T), yy = y0 + i * (h + gap), sx = (1 - en) * -60 * k; if (en <= 0) return;
    const active = taps.map((tt, j) => (T >= tt && T < tt + 0.7 && j === i ? 1 : 0)).reduce((p, q) => p + q, 0); const first = i === 0 ? 0.35 : 0;
    gc.save(); gc.globalAlpha = a * en; gc.fillStyle = `rgba(${active || first ? '232,205,140' : '20,24,32'},${active ? 0.4 : first ? 0.22 : 0.62})`; rr(x + sx, yy, w, h, 10 * k); gc.fill(); gc.strokeStyle = `rgba(${INK},${active ? 0.7 : 0.22})`; gc.lineWidth = 1.2 * k; rr(x + sx, yy, w, h, 10 * k); gc.stroke();
    gc.fillStyle = `rgba(${GOLD},.95)`; gc.beginPath(); gc.arc(x + sx + 24 * k, yy + h / 2, 12 * k, 0, 6.283); gc.fill(); gc.fillStyle = '#16181e'; gc.font = `700 ${13 * k}px ${SANS}`; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(String(i + 1), x + sx + 24 * k, yy + h / 2 + 0.5 * k);
    gc.textAlign = 'left'; gc.fillStyle = `rgba(${INK},.97)`; gc.font = `500 ${21 * k}px ${SERIF}`; gc.fillText(nm, x + sx + 48 * k, yy + h / 2 + 1 * k);
    if (i === 0) { gc.font = `700 ${9 * k}px ${SANS}`; gc.textAlign = 'right'; gc.fillStyle = `rgba(${GOLD},1)`; if ('letterSpacing' in gc) gc.letterSpacing = 1.6 * k + 'px'; gc.fillText('BECOMES PRESIDENT', x + sx + w - 14 * k, yy + h / 2 + 1 * k); }
    gc.restore();
  });
  // cursor hops from card to card ("if that office is empty, the next one steps in")
  taps.forEach((tt, j) => { const d = T - tt; if (d > -0.8 && d < 0.8) { const prevY = j === 0 ? y0 + 190 * k : y0 + (j - 1) * (h + gap) + h / 2, ty = y0 + j * (h + gap) + h / 2, u = smooth((d + 0.8) / 0.8); curY = lerp(prevY, ty, d < 0 ? u : 1); curX = x + 340 * k; press = d > 0 && d < 0.35 ? Math.sin(d / 0.35 * Math.PI) : 0; if (d > 0.05 && d < 0.65) { rp = (d - 0.05) / 0.6; rx = x + 330 * k; ry = ty; } } });
  if (curY > 0) cursor(x + 340 * k, curY + 6 * k, press); if (rp > 0) ripple(rx, ry, rp);
  gc.restore();
}
function drawPoll(T, k) {
  const a = sm(61.0, 61.5, T); if (a <= 0.01) return;
  gc.save(); gc.globalAlpha = a; label('DID YOU KNOW ALL OF THIS?', 270 * k, 712 * k, 11 * k, 0.9, 'center', 700, 2.4 * k);
  const btn = (cx, txt, picked) => { const w = 150 * k, h = 50 * k, x = cx * k - w / 2, y = 732 * k; gc.fillStyle = picked ? `rgba(${GOLD},.85)` : 'rgba(20,24,32,.7)'; rr(x, y, w, h, 25 * k); gc.fill(); gc.strokeStyle = `rgba(${INK},${picked ? 0.9 : 0.3})`; gc.lineWidth = 1.4 * k; rr(x, y, w, h, 25 * k); gc.stroke(); gc.fillStyle = picked ? '#16181e' : `rgba(${INK},.95)`; gc.font = `700 ${15 * k}px ${SANS}`; gc.textAlign = 'center'; gc.textBaseline = 'middle'; if ('letterSpacing' in gc) gc.letterSpacing = 2 * k + 'px'; gc.fillText(txt, cx * k, y + h / 2 + 1 * k); };
  const tap = 61.9; btn(190, 'YES', T >= tap + 0.12); btn(350, 'NO', false);
  const d = T - tap, u = smooth((T - 61.55) / 0.35); const cx0 = 270, cy0 = 840; const curx = lerp(cx0, 196, u) * k, cury = lerp(cy0, 760, u) * k; cursor(curx, cury, d > 0 && d < 0.3 ? Math.sin(d / 0.3 * Math.PI) : 0); if (d > 0.1 && d < 0.8) ripple(190 * k, 757 * k, (d - 0.1) / 0.7);
  gc.restore();
}
function drawGfx(T) { const k = gfx.width / 540; gc.clearRect(0, 0, gfx.width, gfx.height); drawQuote(T, k); drawClock(T, k); drawLadder(T, k); drawPoll(T, k); drawTimeline(T, k); }

function updateOverlay(T) {
  elTitle.style.opacity = sm(0, 0.8, T) * (1 - sm(4.0, 4.7, T));
  const beat = BEATS.find((b) => T >= b.a && T < b.b);
  if (beat) { hLabel.textContent = beat.label; hValue.textContent = beat.value; hSub.textContent = beat.sub; hud.style.opacity = Math.min(sm(beat.a, beat.a + 0.3, T), 1 - sm(beat.b - 0.2, beat.b, T)); } else hud.style.opacity = 0;
  const cp = CAPS.find((c) => T >= c[0] - 0.05 && T < c[1] + 0.05);
  if (cp) { cap.textContent = cp[2]; const fin = sm(cp[0], cp[0] + 0.4, T); cap.style.opacity = fin * (1 - sm(cp[1] - 0.4, cp[1], T)); cap.style.transform = `translateY(${(1 - fin) * 6}px)`; } else cap.style.opacity = 0;
  tag.style.opacity = T > 4.8 && T < 54.2 ? 0.7 * sm(4.8, 5.6, T) * (1 - sm(53.6, 54.2, T)) : 0;
  flash.style.opacity = 0;
  const fo = sm(T_SCENE - 0.2, T_SCENE + 0.6, T) * (1 - sm(59.0, 59.6, T)); facts.style.opacity = fo;
  factEls.forEach((el, i) => { el.style.opacity = sm(T_SCENE + 3.2 + i * 0.8, T_SCENE + 3.8 + i * 0.8, T); });
  end.style.opacity = T >= 59 ? sm(59.0, 59.7, T) : 0;
  end.querySelector('.a').style.opacity = sm(59.6, 60.2, T); end.querySelector('.b').style.opacity = sm(60.4, 61.0, T); end.querySelector('.c').style.opacity = sm(61.2, 61.8, T) * 0.9;
  document.getElementById('stage').style.background = T >= T_SCENE ? '#07070a' : '#000';
  drawChart(T); drawGfx(T);
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
