import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* "What if you drove to the Moon?" — deterministic 62 s timeline, pure function of T.
   Real-scale scene: Earth radius 6.371e6 m, Moon 1.737e6 m, 238,855 mi of road. A far "background" pass (Earth, Moon, stars) and a "near" pass (road, signs, satellites, coast) share one camera. */
const T_END = 62, T_SCENE = 54.6;
const P = new URLSearchParams(location.search), DPR = +(P.get('dpr') || 1);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
function kf(t, pts) { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; }
const MI = 1609.344, S_END = 238855 * MI, R_E = 6.371e6, R_M = 1.737e6;
const T_ARRIVE = 36.0, T_BEACH = 43.6;

/* ---------- renderer, two scenes (far / near), one camera ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const sceneB = new THREE.Scene(), sceneN = new THREE.Scene();
const aspect = innerWidth / innerHeight;
const camB = new THREE.PerspectiveCamera(70, aspect, 400, 3e9), camN = new THREE.PerspectiveCamera(70, aspect, 0.1, 40000);
const camera = new THREE.Object3D(); // the pose; both cameras copy it
sceneN.add(camN);
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const wrap = document.getElementById('sceneWrap');
const accCanvas = document.getElementById('acc'); accCanvas.width = innerWidth * DPR; accCanvas.height = innerHeight * DPR;
const actx = accCanvas.getContext('2d');
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType }));
composer.setSize(innerWidth * DPR, innerHeight * DPR);
const passB = new RenderPass(sceneB, camB), passN = new RenderPass(sceneN, camN); passN.clear = false; passN.clearDepth = true;
composer.addPass(passB); composer.addPass(passN); composer.addPass(new OutputPass());
{ const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms['resolution'].value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); composer.addPass(fxaa); }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }
const noiseTex = (base, amp, size, seed, rep) => { const c = mkCanvas(size, size), x = c.getContext('2d'), r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, size, size); for (let i = 0; i < size * size * 0.4; i++) { const v = (r() - 0.5) * amp; x.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`; x.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2); } const t = toTex(c); t.repeat.set(rep[0], rep[1]); return t; };
function fbmTexGen(W, H, seed, fn) { // value-noise helper for the planet textures
  const g = [], r = rng(seed); for (let k = 0; k < 6; k++) { const n = 6 << k, a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = r(); g.push([n, a]); }
  const samp = (n, a, u, v) => { const fx = u * n, fy = v * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, s = (i, j) => a[((j % n + n) % n) * n + ((i % n + n) % n)]; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return lerp(lerp(s(x0, y0), s(x0 + 1, y0), sx), lerp(s(x0, y0 + 1), s(x0 + 1, y0 + 1), sx), sy); };
  const f = (u, v) => { let t = 0, a = 0.5, tot = 0; for (let k = 0; k < 6; k++) { t += samp(g[k][0], g[k][1], u, v) * a; tot += a; a *= 0.55; } return t / tot; };
  const c = mkCanvas(W, H), x = c.getContext('2d'), id = x.createImageData(W, H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const o = (j * W + i) * 4, col = fn(f, i / W, j / H); id.data[o] = col[0]; id.data[o + 1] = col[1]; id.data[o + 2] = col[2]; id.data[o + 3] = col[3] ?? 255; } x.putImageData(id, 0, 0); return c;
}
const SUN = new THREE.Vector3(-0.7, 0.12, 0.7).normalize();

/* ---------- the road path: flat, ramp up toward the Moon, long straight, turn onto the Moon ---------- */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const segs = []; let cur = { P: V3(0, 0, 0), T: V3(0, 0, -1), N: V3(0, 1, 0) }, sAcc = 0;
function addLine(len) { segs.push({ type: 'l', s0: sAcc, len, P0: cur.P.clone(), T0: cur.T.clone(), N0: cur.N.clone() }); cur.P.addScaledVector(cur.T, len); sAcc += len; }
function addArc(R, th) { const len = R * th, c = Math.cos(th), s = Math.sin(th); segs.push({ type: 'a', s0: sAcc, len, R, P0: cur.P.clone(), T0: cur.T.clone(), N0: cur.N.clone() }); const Pn = cur.P.clone().addScaledVector(cur.N, R * (1 - c)).addScaledVector(cur.T, R * s), Tn = cur.T.clone().multiplyScalar(c).addScaledVector(cur.N, s), Nn = cur.N.clone().multiplyScalar(c).addScaledVector(cur.T, -s); cur = { P: Pn, T: Tn, N: Nn }; sAcc += len; }
const L0 = 205, PHI = 0.72, R1 = 500, R2 = 2000, LF = 300;
addLine(L0); addArc(R1, PHI); addLine(S_END - (L0 + R1 * PHI + R2 * Math.PI / 2 + LF)); const D_DIR = cur.T.clone(); addArc(R2, Math.PI / 2); const P_TOUCH = cur.P.clone(), T_TOUCH = cur.T.clone(), N_TOUCH = cur.N.clone(); addLine(LF);
const S_ARC2 = segs[3].s0;
const MOON_C = P_TOUCH.clone().addScaledVector(D_DIR, R_M), EARTH_C = V3(0, -R_E, 0);
function frameAt(s, out) {
  s = clamp(s, 0, S_END); let g = segs[segs.length - 1]; for (const q of segs) if (s <= q.s0 + q.len) { g = q; break; } const d = s - g.s0;
  if (g.type === 'l') { out.P.copy(g.P0).addScaledVector(g.T0, d); out.f.copy(g.T0); out.u.copy(g.N0); } else { const th = d / g.R, c = Math.cos(th), sn = Math.sin(th); out.P.copy(g.P0).addScaledVector(g.N0, g.R * (1 - c)).addScaledVector(g.T0, g.R * sn); out.f.copy(g.T0).multiplyScalar(c).addScaledVector(g.N0, sn); out.u.copy(g.N0).multiplyScalar(c).addScaledVector(g.T0, -sn); }
  return out;
}
const mkF = () => ({ P: new THREE.Vector3(), f: new THREE.Vector3(), u: new THREE.Vector3() });
const FR = mkF();
// odometer as a function of time: slow and real on the coast, then log-time zoom past each milestone
const MS_ISS = 250 * MI, MS_GPS = 12550 * MI, MS_GEO = 22236 * MI, MS_HALF = S_END / 2, S_LE = S_END - R2 * Math.PI / 2 - LF;
const SKN = [[0, 0], [7.0, 205], [8.0, 1200], [9.0, 20000], [9.9, 99779], [10.6, 300000], [11.2, MS_ISS - 150], [12.8, MS_ISS + 150], [14.0, 3.5e6], [16.2, 1.1e7], [17.6, MS_GPS - 150], [19.0, MS_GPS + 150], [21.0, MS_GEO], [24.5, 9.0e7], [29.0, MS_HALF], [31.4, 2.9e8], [33.0, S_LE - 4e6], [34.1, S_LE - 1500], [36.0, S_END]];
function odo(T) {
  if (T <= 7.0) return 29.06 * T; if (T >= 36.0) return S_END;
  for (let i = 1; i < SKN.length; i++) if (T <= SKN[i][0]) { const [t0, s0] = SKN[i - 1], [t1, s1] = SKN[i], u = (T - t0) / (t1 - t0); const l0 = Math.log10(s0 + 1), l1 = Math.log10(s1 + 1); return Math.pow(10, lerp(l0, l1, u)) - 1; }
  return S_END;
}

/* ---------- FAR scene: sky, stars, Earth, clouds, atmosphere, Moon ---------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  uniforms: { uAlt: { value: 0 }, uSun: { value: SUN.clone() }, top: { value: new THREE.Color(0.1, 0.22, 0.52) }, hor: { value: new THREE.Color(1.0, 0.55, 0.28) }, uDay: { value: 1 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform float uAlt, uDay; uniform vec3 uSun, top, hor; varying vec3 vP;
    void main(){ float a = exp(-uAlt / 9000.0) * uDay; float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(smoothstep(0.0, 0.85, h), 0.85)) * a;
      float s = max(dot(normalize(vP), uSun), 0.0); c += (hor * pow(s, 5.0) * 0.5 + vec3(1.0, 0.86, 0.6) * pow(s, 60.0) * 0.5) * a + vec3(1.0, 0.95, 0.85) * pow(s, 2200.0) * 6.0;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const skyM = new THREE.Mesh(new THREE.SphereGeometry(1e8, 24, 16), skyMat); skyM.renderOrder = -10; sceneB.add(skyM);
const starPts = (() => { const r = rng(6), n = 2500, p = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = r() * 6.283, ph = Math.acos(2 * r() - 1), R = 1.5e9; p.set([R * Math.sin(ph) * Math.cos(th), R * Math.cos(ph), R * Math.sin(ph) * Math.sin(th)], i * 3); const b = 0.5 + r() * 0.5, w = r(); col.set([b, b * (0.9 + 0.1 * w), b * (0.8 + 0.2 * w)], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false })); sceneB.add(m); return m; })();
const earthTex = toTex(fbmTexGen(1024, 512, 17, (f, u, v) => { const lat = Math.abs(v - 0.5) * 2, n = f(u * 3, v * 3) * 0.7 + f(u * 9, v * 9) * 0.3, land = n > 0.52 - 0.05 * (1 - lat); if (lat > 0.88) return [240, 244, 250]; if (land) { const dry = f(u * 5 + 3, v * 5), m = 0.3 + 0.5 * dry; return [lerp(70, 190, m * (1 - lat * 0.4)), lerp(110, 160, 1 - m * 0.5), lerp(50, 90, m * 0.4)]; } const d = n; return [lerp(10, 40, d), lerp(40, 100, d), lerp(90, 170, d)]; }));
const cloudTexE = toTex(fbmTexGen(1024, 512, 31, (f, u, v) => { const c = clamp((f(u * 4, v * 4) * 0.7 + f(u * 12, v * 12) * 0.3 - 0.44) * 3.2); return [255, 255, 255, 255 * c * 0.92]; }));
const earth = new THREE.Mesh(new THREE.SphereGeometry(R_E, 96, 64), new THREE.MeshStandardMaterial({ map: earthTex, emissiveMap: earthTex, emissive: 0xffffff, emissiveIntensity: 0.28, roughness: 0.85, metalness: 0 })); earth.position.copy(EARTH_C); sceneB.add(earth);
const earthClouds = new THREE.Mesh(new THREE.SphereGeometry(R_E + 9000, 96, 64), new THREE.MeshStandardMaterial({ map: cloudTexE, transparent: true, roughness: 1, depthWrite: false })); earthClouds.position.copy(EARTH_C); sceneB.add(earthClouds);
const atmoMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false, uniforms: { uSun: { value: SUN.clone() } }, vertexShader: 'varying vec3 vN, vW; void main(){ vN = normalize(normalMatrix * normal); vW = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: 'uniform vec3 uSun; varying vec3 vN, vW; void main(){ float r = pow(1.0 - abs(vN.z), 3.0); float lit = 0.35 + 0.65 * smoothstep(-0.2, 0.6, dot(normalize(vW - vec3(0.0, -6371000.0, 0.0)), uSun)); gl_FragColor = vec4(0.35, 0.62, 1.0, 1.0) * r * lit * 1.2; }' });
const atmo = new THREE.Mesh(new THREE.SphereGeometry(R_E + 110000, 96, 64), atmoMat); atmo.position.copy(EARTH_C); sceneB.add(atmo);
const moonTex = toTex((() => { const W = 1024, H = 512, c = fbmTexGen(W, H, 41, (f, u, v) => { const n = f(u * 3, v * 3), m = n < 0.46 ? 0.55 : 0.82, g = 120 * m + 60 * f(u * 14, v * 14); return [g, g, g * 0.98]; }), x = c.getContext('2d'), r = rng(51); for (let i = 0; i < 700; i++) { const px = r() * W, py = r() * H, rad = 2 + Math.pow(r(), 3) * 26; x.strokeStyle = `rgba(30,30,30,${0.25 + r() * 0.3})`; x.lineWidth = 1 + rad * 0.1; x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.stroke(); x.fillStyle = `rgba(230,230,225,${0.08 + r() * 0.1})`; x.beginPath(); x.arc(px - rad * 0.2, py - rad * 0.2, rad * 0.85, 0, 6.283); x.fill(); } return c; })());
const moon = new THREE.Mesh(new THREE.SphereGeometry(R_M, 96, 64), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 })); moon.position.copy(MOON_C); sceneB.add(moon);
const sunB = new THREE.DirectionalLight(0xfff0d8, 3.6); sunB.position.copy(SUN).multiplyScalar(1e7); sceneB.add(sunB, new THREE.AmbientLight(0x1a2030, 0.55));

/* ---------- NEAR scene: lights, fog ---------- */
const hemiN = new THREE.HemisphereLight(0xb7c8e6, 0x6a5a48, 0.8); sceneN.add(hemiN);
const sunN = new THREE.DirectionalLight(0xffc888, 2.6); sunN.position.copy(SUN).multiplyScalar(1000); sceneN.add(sunN);
sceneN.fog = new THREE.FogExp2(0xe9b98a, 0.00045);

/* ---------- coast: terrain, ocean, road, palms, sign ---------- */
const hAt = (x, z) => {
  if (x > 10) { const e = Math.min(x - 10, 260); return e * 0.14 + (x > 60 ? 4 * Math.sin(x * 0.05 + z * 0.013) * Math.sin(z * 0.02 + 1) : 0) * smooth((x - 40) / 60) + Math.max(0, x - 270) * 0.35; }
  if (x > -14) return 0;
  if (x > -20) return -1.2 * smooth((-14 - x) / 6);
  if (x > -45) return -1.2;
  if (x > -200) return -1.2 - 0.02 * (-45 - x);
  return -4.3 - 0.06 * (-200 - x);
};
const SEA = -0.9;
{
  const g = new THREE.PlaneGeometry(1200, 3800, 240, 380); g.rotateX(-Math.PI / 2); g.translate(140, 0, -1500); const p = g.attributes.position, col = new Float32Array(p.count * 3), rr = rng(8);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = hAt(x, z); p.setY(i, h); const t = clamp((h + 1.4) / 2.2), n = rr() * 0.06; let c = [0.72, 0.62, 0.44]; if (x > 10) { const gr = clamp((x - 12) / 40); c = [lerp(0.5, 0.36, gr) + n, lerp(0.46, 0.38, gr) + n, lerp(0.34, 0.2, gr)]; } else if (x > -14) c = [0.4, 0.4, 0.38]; else c = [0.74 - n, 0.64 - n, 0.46 - n * 0.7]; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); sceneN.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
}
// the ocean (also carries the tsunami: raised level behind a steep front, drawback before it)
const waterMat = new THREE.ShaderMaterial({
  fog: false,
  uniforms: { uT: { value: 0 }, uXf: { value: -9999 }, uH: { value: 0 }, uBase: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSky: { value: new THREE.Color(0.7, 0.55, 0.45) }, uFog: { value: new THREE.Color(0.9, 0.7, 0.54) }, uDens: { value: 0.00045 }, uSun: { value: SUN.clone() }, uSea: { value: SEA } },
  vertexShader: `uniform float uXf, uH, uBase, uSea, uT; varying vec3 vW;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); float x = w.x, front = uXf - x; float dec = exp(-max(x + 40.0, 0.0) / 140.0); float body = uH * 0.5 * (1.0 + tanh(front / 10.0)) * dec; w.y = uSea + uBase + body + sin(x * 0.03 + uT * 1.3) * 0.12; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT, uXf, uH, uDens; uniform vec3 uCam, uSky, uFog, uSun; varying vec3 vW;
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += vn(p)*a; p = p*2.03 + 7.1; a *= 0.5; } return s; }
    void main(){ vec2 p = vW.xz; vec2 q = p*0.05 + vec2(uT*0.12, 0.0); float h0 = fbm(q), hx = fbm(q + vec2(0.05, 0.0)), hz = fbm(q + vec2(0.0, 0.05));
      float front = uXf - vW.x; float dec = exp(-max(vW.x + 40.0, 0.0) / 140.0); float th = tanh(front / 10.0); float slope = -uH * 0.5 * (1.0 - th*th) / 10.0 * dec;
      vec3 n = normalize(vec3(-(hx-h0)*30.0 - slope, 1.0, -(hz-h0)*30.0)); vec3 V = normalize(uCam - vW); vec3 R = reflect(-V, n);
      float fr = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.0); vec3 deep = vec3(0.015, 0.06, 0.09), shallow = vec3(0.07, 0.2, 0.22); vec3 col = mix(deep, shallow, smoothstep(0.35, 0.8, h0));
      float gx = vW.x; float gh = gx > -14.0 ? 0.0 : gx > -20.0 ? -1.2 * smoothstep(0.0, 1.0, (-14.0 - gx) / 6.0) : gx > -45.0 ? -1.2 : gx > -200.0 ? -1.2 - 0.02 * (-45.0 - gx) : -4.3 - 0.06 * (-200.0 - gx); float dep = vW.y - gh; col = mix(vec3(0.16, 0.34, 0.32), col, smoothstep(0.0, 6.0, dep));
      float turb = clamp(uH / 8.0, 0.0, 1.0) * (0.5 + 0.5 * smoothstep(-80.0, 40.0, front)); col = mix(col, vec3(0.30, 0.27, 0.2), turb * 0.8 * smoothstep(-20.0, 60.0, front));
      col = mix(col, uSky * 0.55, clamp(fr * 0.32, 0.0, 1.0)); col = mix(col, vec3(0.12, 0.22, 0.3), 0.35 * smoothstep(150.0, 2500.0, length(vW - uCam))); float shore = smoothstep(0.55, 0.0, dep) * (0.55 + 0.45 * vn(p * 0.8 + uT * 0.6)); col = mix(col, vec3(0.92, 0.94, 0.92), shore * smoothstep(-0.05, 0.1, dep)); col += vec3(1.0, 0.8, 0.55) * pow(max(dot(R, uSun), 0.0), 140.0) * 1.8;
      float foam = smoothstep(0.55, 0.9, fbm(p * 0.6 + uT * 0.3)) * (smoothstep(-6.0, 0.0, front) * (1.0 - smoothstep(0.0, 70.0, front))) * clamp(uH, 0.0, 1.0); col = mix(col, vec3(0.9), foam * 0.85);
      float d = length(vW - uCam); float f = 1.0 - exp(-pow(d * uDens, 2.0)); col = mix(col, uFog, clamp(f, 0.0, 1.0));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6200, 4200, 1240, 4), waterMat); ocean.rotation.x = -Math.PI / 2; ocean.position.set(-3100 + 120, 0, -1500); sceneN.add(ocean);
const boreMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: true, fog: false,
  uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uDens: { value: 0.0005 } },
  vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uT, uDens; uniform vec3 uCam, uFog; varying vec2 vUv; varying vec3 vW;
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
    void main(){ float n = vn(vec2(vW.z * 0.05, vUv.y * 6.0 - uT * 1.5)) * 0.6 + vn(vec2(vW.z * 0.2, vUv.y * 14.0 - uT * 3.0)) * 0.4; float top = vUv.y + (n - 0.5) * 0.35; if (top > 1.0) discard;
      vec3 col = mix(vec3(0.03, 0.09, 0.1), vec3(0.16, 0.3, 0.3), vUv.y); col = mix(col, vec3(0.93, 0.95, 0.93), smoothstep(0.7, 0.98, top) * 0.95); col = mix(col, vec3(0.45, 0.4, 0.28), 0.3 * (1.0 - vUv.y) * n);
      float d = length(vW - uCam); float f = 1.0 - exp(-pow(d * uDens, 2.0)); col = mix(col, uFog, clamp(f, 0.0, 1.0)); gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const bore = new THREE.Mesh(new THREE.PlaneGeometry(4200, 1, 1, 1), boreMat); bore.rotation.y = Math.PI / 2; bore.frustumCulled = false; bore.visible = false; sceneN.add(bore);
// palms along the road, guard rail, mile posts
{
  const fTex = (() => { const c = mkCanvas(64, 128), x = c.getContext('2d'), r = rng(9); x.strokeStyle = '#3d4a22'; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 128); x.lineTo(32, 0); x.stroke(); for (let i = 0; i < 22; i++) { const y = 124 - i * 5.5, l = 26 * (0.5 + 0.5 * Math.sin((1 - y / 128) * 3 + 0.4)); for (const s of [-1, 1]) { x.strokeStyle = `hsl(${88 + r() * 14},${40 + r() * 12}%,${22 + r() * 10}%)`; x.lineWidth = 1.6; x.beginPath(); x.moveTo(32, y); x.quadraticCurveTo(32 + s * l * 0.6, y - 3, 32 + s * l, y + 9); x.stroke(); } } return toTex(c); })();
  const fg = new THREE.PlaneGeometry(1.1, 2.6, 1, 4); fg.translate(0, 1.3, 0); const pp = fg.attributes.position; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); pp.setZ(i, -0.14 * y * y / 3); } fg.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ map: fTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 }), tm = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 1 });
  const r = rng(77), N = 36, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 8, 7), tm, N), fronds = new THREE.InstancedMesh(fg, fm, N * 8), o = new THREE.Object3D(); let fi = 0;
  for (let i = 0; i < N; i++) { const z = 130 - i * 34 - r() * 10, x = i % 2 ? 9.2 + r() * 2 : -9.4 - r() * 1.5, H = 6.5 + r() * 3; o.position.set(x, H / 2, z); o.rotation.set(0, 0, (r() - 0.5) * 0.08); o.scale.set(1, H / 8, 1); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix); for (let f = 0; f < 8; f++) { o.position.set(x, H, z); o.rotation.set(0.9 + r() * 0.3, (f / 8) * 6.283 + r() * 0.3, 0, 'YXZ'); o.scale.setScalar(1.1 + r() * 0.3); o.updateMatrix(); fronds.setMatrixAt(fi++, o.matrix); } }
  sceneN.add(trunks, fronds);
  const rail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: 0xb8b8b4, metalness: 0.5, roughness: 0.5 }), 140); for (let i = 0; i < 140; i++) { o.position.set(-8.6, 0.45, 150 - i * 6); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); rail.setMatrixAt(i, o.matrix); } sceneN.add(rail);
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 870), new THREE.MeshStandardMaterial({ color: 0xb8b8b4, metalness: 0.5, roughness: 0.5 })); railTop.position.set(-8.6, 0.85, 150 - 435); sceneN.add(railTop);
}
// highway sign at the start
const signCanvas = (txt) => { const c = mkCanvas(1024, 512), x = c.getContext('2d'); x.fillStyle = '#1a6b3c'; x.fillRect(0, 0, 1024, 512); x.strokeStyle = '#fff'; x.lineWidth = 14; x.strokeRect(16, 16, 992, 480); x.fillStyle = '#fff'; x.textAlign = 'center'; txt.forEach(([t, size, y]) => { x.font = `bold ${size}px "Helvetica Neue", Arial, sans-serif`; x.fillText(t, 512, y); }); return toTex(c); };
{
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 0.12), [0, 0, 0, 0, new THREE.MeshStandardMaterial({ map: signCanvas([['MOON', 190, 250], ['238,855 miles', 120, 400]]), roughness: 0.5 }), 0].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x1a6b3c }))); board.position.set(8.2, 4.4, 70); board.rotation.y = -0.18; sceneN.add(board);
  for (const dz of [-1.8, 1.8]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 6), new THREE.MeshStandardMaterial({ color: 0x777777 })); post.position.set(8.2, 2.2, 70 + dz * 0.98); sceneN.add(post); }
}
// cloud deck the road climbs through
const cloudN = (() => { const c = fbmTexGen(512, 512, 63, (f, u, v) => { const n = f(u * 3, v * 3) * 0.7 + f(u * 9, v * 9) * 0.3, cv = clamp((n - 0.38) * 3); return [255, 252, 246, 255 * cv * 0.95]; }); const t = toTex(c); t.repeat.set(8, 8); return t; })();
const cloudLayer = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshBasicMaterial({ map: cloudN, transparent: true, depthWrite: false, fog: false, opacity: 1 })); cloudLayer.rotation.x = -Math.PI / 2; cloudLayer.position.y = 2400; sceneN.add(cloudLayer);

/* ---------- the road ribbon (treadmill, rebuilt around the car every frame) ---------- */
const roadTex = (() => { const c = mkCanvas(256, 512), x = c.getContext('2d'), r = rng(2); x.fillStyle = '#3a3b3e'; x.fillRect(0, 0, 256, 512); for (let i = 0; i < 12000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() * 0.07})`; x.fillRect(r() * 256, r() * 512, 1 + r() * 2, 1 + r() * 2); } x.fillStyle = '#e8e8e2'; x.fillRect(10, 0, 5, 512); x.fillRect(241, 0, 5, 512); x.fillStyle = '#f0c030'; x.fillRect(122, 0, 4, 512); x.fillRect(130, 0, 4, 512); const t = toTex(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; })();
const roadMat = new THREE.MeshBasicMaterial({ map: roadTex, vertexColors: true, transparent: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const RN = 140; const roadGeo = new THREE.BufferGeometry(); const rPos = new Float32Array(RN * 2 * 3), rUv = new Float32Array(RN * 2 * 2), rCol = new Float32Array(RN * 2 * 4), rIdx = []; for (let i = 0; i < RN - 1; i++) { const a = i * 2; rIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
roadGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3).setUsage(THREE.DynamicDrawUsage)); roadGeo.setAttribute('uv', new THREE.BufferAttribute(rUv, 2).setUsage(THREE.DynamicDrawUsage)); roadGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 4).setUsage(THREE.DynamicDrawUsage)); roadGeo.setIndex(rIdx);
const road = new THREE.Mesh(roadGeo, roadMat); road.frustumCulled = false; sceneN.add(road);
const FA = mkF(), _r = new THREE.Vector3();
function buildRoad(camS, bright) {
  const base = Math.floor(camS / 60) * 60; let k = 0;
  for (let i = 0; i < RN; i++) {
    const t = i / (RN - 1), off = -15 + Math.pow(t, 2.2) * 3200, s = camS + off; frameAt(s, FA); _r.crossVectors(FA.f, FA.u).normalize();
    const lx = FA.P.x - FR.P.x, ly = FA.P.y - FR.P.y, lz = FA.P.z - FR.P.z, w = 4.1;
    const lu = 0.05; rPos.set([lx - _r.x * w + FA.u.x * lu, ly - _r.y * w + FA.u.y * lu, lz - _r.z * w + FA.u.z * lu, lx + _r.x * w + FA.u.x * lu, ly + _r.y * w + FA.u.y * lu, lz + _r.z * w + FA.u.z * lu], i * 6);
    const v = (s - base) / 60; rUv.set([0, v, 1, v], i * 4);
    const al = 1 - smooth((off - 1800) / 1400), b = bright; rCol.set([b, b, b, al, b, b, b, al], i * 8);
  }
  roadGeo.attributes.position.needsUpdate = roadGeo.attributes.uv.needsUpdate = roadGeo.attributes.color.needsUpdate = true; roadMat.map.repeat.set(1, 1); road.position.copy(FR.P);
}
const pch = (() => { const t = roadTex.clone(); t.needsUpdate = true; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 18); const m = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1100), new THREE.MeshBasicMaterial({ map: t, color: 0xcfcfcf, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.04, -400); m.visible = false; sceneN.add(m); return m; })();
// the side road that climbs the hill at the end (the way out of the tsunami)
{
  const n = 60, pos = [], uv = [], idx = []; for (let i = 0; i <= n; i++) { const x = -12 + i * 2.4, y = Math.max(0, (x - 10)) * 0.14 + 0.05; pos.push(x, y, 143.5, x, y, 150.5); uv.push(0, i * 0.2, 1, i * 0.2); if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const t = roadTex.clone(); t.needsUpdate = true; t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, color: 0xcccccc, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.rotation.y = 0; sceneN.add(m);
}

/* ---------- satellites, the Moon sign, lunar ground ---------- */
function makeSat(kind) {
  const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xc8a850, metalness: 0.7, roughness: 0.4 }), panel = new THREE.MeshStandardMaterial({ color: 0x1b2f64, metalness: 0.4, roughness: 0.35, emissive: 0x0a1330 }), wh = new THREE.MeshStandardMaterial({ color: 0xe9e9e4, metalness: 0.3, roughness: 0.5 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  if (kind === 'iss') { add(new THREE.BoxGeometry(94, 1.6, 1.6), wh, 0, 0, 0); for (const x of [-38, -22, 22, 38]) for (const z of [-1, 1]) add(new THREE.BoxGeometry(11, 0.2, 34), panel, x, 0.4, z * 19); add(new THREE.CylinderGeometry(2.4, 2.4, 22, 14), wh, 0, 0, 0).rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(2.1, 2.1, 12, 14), wh, 0, 6, 0); add(new THREE.CylinderGeometry(2.1, 2.1, 12, 14), wh, 0, -6, 0); add(new THREE.BoxGeometry(14, 0.2, 5), wh, 0, 0, -16); }
  else { add(new THREE.BoxGeometry(5, 3, 3.4), gold, 0, 0, 0); for (const s of [-1, 1]) add(new THREE.BoxGeometry(14, 0.15, 4.6), panel, s * 10, 0, 0); add(new THREE.ConeGeometry(1.6, 2.6, 12), wh, 0, 2.7, 0); }
  g.visible = false; sceneN.add(g); return g;
}
const issG = makeSat('iss'), gpsG = makeSat('gps'); gpsG.scale.setScalar(2.4);
const moonSign = (() => { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(11, 4.8, 0.3), [0, 0, 0, 0, new THREE.MeshStandardMaterial({ map: signCanvas([['WELCOME TO THE MOON', 74, 150], ['Population: 0', 84, 285], ['Next gas: Earth, 238,855 mi', 62, 410]]), emissiveMap: signCanvas([['WELCOME TO THE MOON', 74, 150], ['Population: 0', 84, 285], ['Next gas: Earth, 238,855 mi', 62, 410]]), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.55 }), 0].map((q) => q || new THREE.MeshStandardMaterial({ color: 0x1a6b3c }))); m.position.set(0, 6.0, 0); g.add(m); for (const x of [-3.6, 3.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.4, 8), new THREE.MeshStandardMaterial({ color: 0x888888 })); p.position.set(x, 3.2, 0); g.add(p); } g.visible = false; sceneN.add(g); return g; })();
const lunarGround = (() => { const grp = new THREE.Group(), tex = (() => { const c = mkCanvas(1024, 1024), x = c.getContext('2d'), r = rng(71); x.fillStyle = '#8b8a86'; x.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 60000; i++) { const v = r() * 60 - 30; x.fillStyle = `rgba(${v > 0 ? '255,255,250' : '0,0,0'},${Math.abs(v) / 220})`; x.fillRect(r() * 1024, r() * 1024, 1 + r() * 3, 1 + r() * 3); } for (let i = 0; i < 90; i++) { const px = r() * 1024, py = r() * 1024, rad = 6 + Math.pow(r(), 2.4) * 80; const g = x.createRadialGradient(px, py, rad * 0.3, px, py, rad); g.addColorStop(0, 'rgba(60,60,58,.0)'); g.addColorStop(0.7, 'rgba(50,50,48,.25)'); g.addColorStop(0.92, 'rgba(240,240,235,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill(); } const t = toTex(c); t.repeat.set(60, 60); return t; })(); const m = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: tex, color: 0xbdbdb8, roughness: 1 })); m.rotation.x = -Math.PI / 2; grp.add(m);
  const rr = rng(88), rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x6e6d69, roughness: 1 }), 220), o = new THREE.Object3D(); for (let i = 0; i < 220; i++) { const s = 0.2 + Math.pow(rr(), 3) * 3; o.position.set((rr() - 0.5) * 500, s * 0.3, -rr() * 600 + 60); if (Math.abs(o.position.x) < 6) o.position.x += 12; o.scale.set(s, s * 0.6, s * (0.7 + rr() * 0.6)); o.rotation.set(rr() * 3, rr() * 3, rr() * 3); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix); } grp.add(rocks);
  grp.visible = false; sceneN.add(grp); return grp; })();
{ // orient the lunar ground and sign to the end of the road
  const ex = T_TOUCH.clone(), ey = N_TOUCH.clone(), ez = new THREE.Vector3().crossVectors(ex, ey), mat = new THREE.Matrix4().makeBasis(ez, ey, ex.clone().negate()); // local -Z is the road direction
  lunarGround.quaternion.setFromRotationMatrix(mat); lunarGround.position.copy(P_TOUCH).addScaledVector(ey, -0.02);
  moonSign.quaternion.copy(lunarGround.quaternion); moonSign.rotateY(0); moonSign.position.copy(P_TOUCH).addScaledVector(T_TOUCH, LF + 30); moonSign.userData.base = moonSign.position.clone();
}
// rear-view mirror: the world behind, rendered small
const mirrorRT = new THREE.WebGLRenderTarget(384, 160, { type: THREE.HalfFloatType });
const mirrorPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.275), new THREE.MeshBasicMaterial({ map: mirrorRT.texture, depthTest: false, transparent: true, side: THREE.DoubleSide, toneMapped: false })); mirrorPlane.scale.x = -1; mirrorPlane.position.set(0, 0.57, -1.0); mirrorPlane.renderOrder = 50; camN.add(mirrorPlane);
const mirrorFrame = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.33), new THREE.MeshBasicMaterial({ color: 0x0c0c0e, depthTest: false, transparent: true })); mirrorFrame.position.set(0, 0.57, -1.01); mirrorFrame.renderOrder = 49; camN.add(mirrorFrame);
const camMB = new THREE.PerspectiveCamera(48, 384 / 160, 400, 3e9), camMN = new THREE.PerspectiveCamera(48, 384 / 160, 0.1, 40000);
const qFlip = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI);
function renderMirror() {
  camMB.position.copy(camB.position); camMB.quaternion.copy(camB.quaternion).multiply(qFlip); camMB.updateMatrixWorld(true); camMN.position.copy(camB.position); camMN.quaternion.copy(camMB.quaternion); camMN.updateMatrixWorld(true);
  mirrorPlane.visible = mirrorFrame.visible = false; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(mirrorRT); renderer.clear(true, true, true); renderer.render(sceneB, camMB); renderer.clearDepth(); renderer.render(sceneN, camMN); renderer.setRenderTarget(null); renderer.autoClear = ac; mirrorPlane.visible = mirrorFrame.visible = true;
}

/* ---------- finale: the tsunami ---------- */
const BEACH_POS = V3(-9.2, 1.25, 147);
const XF = [[47.0, -3000], [48.4, -2300], [49.8, -1500], [51.0, -800], [52.0, -300], [52.8, -110], [53.6, -25], [54.6, 45]]; // front position (m), time compressed
const xFront = (T) => (T < XF[0][0] ? -9999 : T >= XF[XF.length - 1][0] ? XF[XF.length - 1][1] : (() => { for (let i = 1; i < XF.length; i++) if (T < XF[i][0]) { const [t0, x0] = XF[i - 1], [t1, x1] = XF[i]; return lerp(x0, x1, (T - t0) / (t1 - t0)); } return 40; })());
const waveSpeedMph = (T) => (T < 47.0 ? 0 : lerp(520, 24, smooth((T - 47.0) / 7.2))); // display: fast far out, slows to a car's speed at the shore

/* ---------- camera pose ---------- */
const _q = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _fwd = new THREE.Vector3(), _up = new THREE.Vector3(), _rt = new THREE.Vector3(), _qa = new THREE.Quaternion();
function setPose(pos, f, u, yaw, pitch, roll) { _rt.crossVectors(f, u).normalize(); _m4.makeBasis(_rt, u, _fwd.copy(f).negate()); _q.setFromRotationMatrix(_m4); _qa.setFromAxisAngle(u, yaw); _q.premultiply(_qa); _qa.setFromAxisAngle(_rt.clone().applyQuaternion(_qa), pitch); _q.premultiply(_qa); camera.position.copy(pos); camera.quaternion.copy(_q); if (roll) { _qa.setFromAxisAngle(_fwd.set(0, 0, -1).applyQuaternion(camera.quaternion), roll); camera.quaternion.premultiply(_qa); } }
let camS = 0, speedMph = 65;
function pose(T) {
  const beach = T >= T_BEACH, sw = Math.sin(T * 9.1) * 0.0012;
  if (!beach) {
    camS = odo(T); frameAt(camS, FR); const pos = FR.P.clone().addScaledVector(FR.u, 1.15);
    const arr = sm(T_ARRIVE, T_ARRIVE + 1.2, T), look = sm(38.4, 40.4, T) * (1 - sm(41.2, 42.6, T));
    setPose(pos, FR.f, FR.u, Math.sin(T * 0.6) * 0.01 + 0.2 * (1 - sm(5.8, 7.6, T)), 0.03 + sw + look * 1.02, Math.sin(T * 0.4) * 0.004);
    speedMph = T < T_ARRIVE ? CRUISE(T) : 0; if (T < 1.5) speedMph = 65 * sm(0, 1.5, T);
  } else {
    const quake = sm(45.2, 45.7, T) * (1 - sm(53.0, 54.6, T)), turn = sm(51.4, 52.3, T), go = sm(52.0, 53.5, T), back = sm(53.5, 54.0, T), yaw = lerp(lerp(Math.PI / 2, -Math.PI / 2, turn), Math.PI / 2, back);
    const x = lerp(BEACH_POS.x, 58, Math.pow(go, 1.5)), z = 147 - 1.5 * Math.sin(turn * Math.PI), y = Math.max(0, x - 10) * 0.14 + 1.25;
    const F = V3(-Math.sin(yaw), 0, -Math.cos(yaw)); // yaw 0 faces -Z, +pi/2 faces -X (the ocean), -pi/2 faces +X (the hill)
    setPose(V3(x, y, z), F, V3(0, 1, 0), 0, 0.03 + Math.sin(T * 38) * 0.004 * quake, Math.sin(T * 31) * 0.012 * quake);
    camera.position.x += Math.sin(T * 47) * 0.05 * quake; camera.position.y += Math.cos(T * 53) * 0.05 * quake;
    speedMph = 65 * sm(52.0, 53.0, T) * (1 - sm(53.4, 54.0, T));
  }
}

/* ---------- update ---------- */
const _c = new THREE.Color(), _n = new THREE.Vector3();
function update(T) {
  pose(T);
  camB.position.copy(camera.position); camB.quaternion.copy(camera.quaternion); camN.position.copy(camera.position); camN.quaternion.copy(camera.quaternion); camB.updateMatrixWorld(true); camN.updateMatrixWorld(true);
  const beach = T >= T_BEACH, FRm = beach ? null : FR;
  // altitude above the Earth (zero on the beach)
  const alt = beach ? 1.5 : Math.max(0, camera.position.distanceTo(EARTH_C) - R_E), a = Math.exp(-alt / 9000);
  skyMat.uniforms.uAlt.value = alt; skyM.position.copy(camera.position); starPts.position.copy(camera.position); starPts.material.opacity = clamp(1 - a * 1.6);
  // golden hour on the coast, white sunlight in space
  const gold = a; skyMat.uniforms.hor.value.setRGB(1.0, lerp(0.7, 0.56, gold), lerp(0.55, 0.3, gold));
  sunN.color.setRGB(1, lerp(0.95, 0.78, gold), lerp(0.9, 0.55, gold)); sunN.intensity = lerp(3.4, 2.4, gold) * (T > 54.6 ? 0 : 1); hemiN.intensity = lerp(0.12, 0.8, a) * (beach ? 0.95 : 1); hemiN.color.setRGB(0.72, 0.78, 0.9);
  const dusk = beach ? sm(44.5, 52.0, T) : 0; skyMat.uniforms.uDay.value = 1 - 0.0 * dusk;
  sceneN.fog.density = lerp(0.0, 0.00045 + dusk * 0.0001, a) + (a < 0.02 ? 0 : 0); sceneN.fog.color.copy(skyMat.uniforms.hor.value).multiplyScalar(a);
  waterMat.uniforms.uFog.value.copy(skyMat.uniforms.hor.value); waterMat.uniforms.uDens.value = sceneN.fog.density; waterMat.uniforms.uSky.value.copy(skyMat.uniforms.hor.value).multiplyScalar(0.7); waterMat.uniforms.uCam.value.copy(camera.position); waterMat.uniforms.uT.value = T;
  // the tsunami: drawback first, then the front
  const xf = xFront(T), drawback = -2.0 * sm(45.8, 47.6, T) * (1 - sm(52.8, 55.2, T)); waterMat.uniforms.uXf.value = xf; waterMat.uniforms.uBase.value = beach ? drawback : 0; waterMat.uniforms.uH.value = beach && xf > -9000 ? lerp(8.0, 14.0, sm(47.0, 53.4, T)) : 0;
  { const bh = waterMat.uniforms.uH.value, vis = beach && xf > -9000 && bh > 0.5; bore.visible = vis; if (vis) { const lvl = SEA + drawback; bore.scale.y = bh * 1.05 + 0.5; bore.position.set(xf + 3, lvl + bh * 0.5, -1500); boreMat.uniforms.uT.value = T; boreMat.uniforms.uCam.value.copy(camera.position); boreMat.uniforms.uFog.value.copy(skyMat.uniforms.hor.value); boreMat.uniforms.uDens.value = sceneN.fog.density; } }
  // the road, satellites, Moon
  const bright = lerp(0.5, 1.0, a) * (0.85 + 0.15 * a); buildRoad(camS, 0.92); road.visible = !beach; pch.visible = beach;
  cloudLayer.visible = !beach && alt < 25000; cloudLayer.material.opacity = clamp(1 - sm(9000, 18000, alt)); cloudLayer.position.set(camera.position.x, 2400, camera.position.z);
  const place = (g, s, ox, oy, rot) => { const d = s - camS, vis = !beach && Math.abs(d) < 700; g.visible = vis; if (!vis) return; frameAt(s, FA); _rt.crossVectors(FA.f, FA.u).normalize(); g.position.copy(FA.P).addScaledVector(_rt, ox).addScaledVector(FA.u, oy); g.quaternion.setFromRotationMatrix(_m4.makeBasis(_rt, FA.u, _fwd.copy(FA.f).negate())); g.rotateY(rot); };
  place(issG, MS_ISS, 34, 8, 0.5); place(gpsG, MS_GPS, 22, 4, 0.9);
  moonSign.visible = !beach && camS > S_END - 2000; lunarGround.visible = !beach && camS > S_ARC2 - 1500;
  moon.visible = true; earth.visible = !beach; earthClouds.visible = !beach; atmo.visible = !beach;
  earthClouds.rotation.y = T * 0.002;
  mirrorPlane.visible = mirrorFrame.visible = (T > 4.6 && T < T_SCENE && !(T > 38.0 && T < 43.0));
  if (mirrorPlane.visible) renderMirror();
}

/* ---------- 2D graphics: dashboard, cursor, cruise slider, counters ---------- */
const gfx = document.getElementById('gfx'); gfx.width = 540 * Math.min(DPR, 2); gfx.height = 960 * Math.min(DPR, 2); const gc = gfx.getContext('2d');
const SANS = '"Helvetica Neue", Arial, "Liberation Sans", sans-serif', SERIF = '"Cormorant Garamond", "Liberation Serif", serif', INK = '244,239,230', GOLD = '232,205,140';
function rr(x, y, w, h, r) { gc.beginPath(); gc.moveTo(x + r, y); gc.arcTo(x + w, y, x + w, y + h, r); gc.arcTo(x + w, y + h, x, y + h, r); gc.arcTo(x, y + h, x, y, r); gc.arcTo(x, y, x + w, y, r); gc.closePath(); }
function cursor(x, y, press) { gc.save(); gc.translate(x, y); gc.scale(1.35 * (1 - 0.12 * press), 1.35 * (1 - 0.12 * press)); gc.shadowColor = 'rgba(0,0,0,.55)'; gc.shadowBlur = 8; gc.fillStyle = '#fff'; gc.strokeStyle = '#111'; gc.lineWidth = 1.6; gc.beginPath(); gc.moveTo(0, 0); gc.lineTo(0, 22); gc.lineTo(5.6, 17); gc.lineTo(9.6, 26); gc.lineTo(13.4, 24.4); gc.lineTo(9.4, 15.6); gc.lineTo(16.6, 15.4); gc.closePath(); gc.fill(); gc.stroke(); gc.restore(); }
function ripple(x, y, u, k) { if (u <= 0 || u >= 1) return; gc.save(); gc.strokeStyle = `rgba(${GOLD},${0.85 * (1 - u)})`; gc.lineWidth = 2.4 * k; gc.beginPath(); gc.arc(x, y, (6 + 26 * u) * k, 0, 6.283); gc.stroke(); gc.restore(); }
function label(txt, x, y, size, alpha, align = 'left', weight = 700, space = 2.4) { gc.save(); gc.font = `${weight} ${size}px ${SANS}`; gc.fillStyle = `rgba(${INK},${alpha})`; gc.textAlign = align; if ('letterSpacing' in gc) gc.letterSpacing = space + 'px'; gc.fillText(txt, x, y); gc.restore(); }
const commaN = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const milesAt = (T) => (T >= T_BEACH ? S_END / MI : odo(T) / MI);
const CRUISE = (T) => kf(T, [[0, 65], [21.8, 65], [23.2, 90], [24.6, 120], [26.0, 120], [27.2, 65], [50.6, 65]]);
function drawDash(T, k, on) {
  if (on <= 0.01) return; gc.save(); gc.globalAlpha = on;
  // dashboard and wheel
  const g = gc.createLinearGradient(0, 780 * k, 0, 960 * k); g.addColorStop(0, '#26272c'); g.addColorStop(0.18, '#121316'); g.addColorStop(1, '#0a0a0c'); gc.fillStyle = g; gc.beginPath(); gc.moveTo(0, 842 * k); gc.quadraticCurveTo(270 * k, 770 * k, 540 * k, 842 * k); gc.lineTo(540 * k, 960 * k); gc.lineTo(0, 960 * k); gc.closePath(); gc.fill();
  gc.strokeStyle = 'rgba(255,255,255,.10)'; gc.lineWidth = 2 * k; gc.beginPath(); gc.moveTo(0, 843 * k); gc.quadraticCurveTo(270 * k, 771 * k, 540 * k, 843 * k); gc.stroke();
  gc.strokeStyle = '#17181c'; gc.lineWidth = 34 * k; gc.beginPath(); gc.ellipse(270 * k, 1030 * k, 250 * k, 190 * k, 0, Math.PI * 1.08, Math.PI * 1.92); gc.stroke(); gc.strokeStyle = 'rgba(255,255,255,.07)'; gc.lineWidth = 3 * k; gc.beginPath(); gc.ellipse(270 * k, 1030 * k, 250 * k, 190 * k, 0, Math.PI * 1.12, Math.PI * 1.88); gc.stroke();
  // instrument cluster
  const mph = speedMph; rr(120 * k, 846 * k, 300 * k, 86 * k, 14 * k); gc.fillStyle = 'rgba(6,8,12,.9)'; gc.fill(); gc.strokeStyle = 'rgba(255,255,255,.12)'; gc.lineWidth = 1.5 * k; gc.stroke();
  const cx = 182 * k, cy = 894 * k, R = 34 * k; gc.strokeStyle = 'rgba(255,255,255,.35)'; gc.lineWidth = 2 * k; gc.beginPath(); gc.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 2.25); gc.stroke(); for (let i = 0; i <= 12; i++) { const an = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5; gc.strokeStyle = 'rgba(255,255,255,.6)'; gc.lineWidth = (i % 2 ? 1 : 2) * k; gc.beginPath(); gc.moveTo(cx + Math.cos(an) * (R - 6 * k), cy + Math.sin(an) * (R - 6 * k)); gc.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); gc.stroke(); }
  const na = Math.PI * 0.75 + clamp(mph / 160) * Math.PI * 1.5; gc.strokeStyle = '#ff5a3c'; gc.lineWidth = 2.6 * k; gc.beginPath(); gc.moveTo(cx, cy); gc.lineTo(cx + Math.cos(na) * (R - 5 * k), cy + Math.sin(na) * (R - 5 * k)); gc.stroke(); gc.fillStyle = '#fff'; gc.beginPath(); gc.arc(cx, cy, 3 * k, 0, 6.283); gc.fill();
  gc.fillStyle = 'rgba(255,255,255,.95)'; gc.font = `700 ${19 * k}px ${SANS}`; gc.textAlign = 'center'; gc.fillText(String(Math.round(mph)), cx, cy + 22 * k + 3 * k * 0); gc.font = `600 ${7.5 * k}px ${SANS}`; gc.fillStyle = 'rgba(255,255,255,.55)'; gc.fillText('MPH', cx, cy + 31 * k);
  gc.textAlign = 'left'; gc.fillStyle = 'rgba(255,255,255,.55)'; gc.font = `600 ${8 * k}px ${SANS}`; if ('letterSpacing' in gc) gc.letterSpacing = 1.4 * k + 'px'; gc.fillText('TRIP A', 238 * k, 866 * k); gc.fillStyle = '#9fe8ff'; gc.font = `700 ${21 * k}px "Courier New", monospace`; if ('letterSpacing' in gc) gc.letterSpacing = '0px'; gc.fillText(commaN(milesAt(T)) + ' mi', 238 * k, 892 * k); gc.fillStyle = 'rgba(255,255,255,.55)'; gc.font = `600 ${8 * k}px ${SANS}`; if ('letterSpacing' in gc) gc.letterSpacing = 1.4 * k + 'px'; gc.fillText(T >= T_BEACH ? 'DAY 306 · HOME' : `DAY ${Math.max(1, Math.ceil(milesAt(T) / 1560))}`, 238 * k, 916 * k);
  gc.restore();
}
function drawCruise(T, k) {
  const a = sm(20.6, 21.3, T) * (1 - sm(28.2, 29.0, T)); if (a <= 0.01) return; gc.save(); gc.globalAlpha = a;
  const x = 40 * k, y = 640 * k, w = 460 * k, h = 118 * k; gc.fillStyle = 'rgba(8,10,16,.72)'; rr(x, y, w, h, 14 * k); gc.fill(); gc.strokeStyle = `rgba(${INK},.25)`; gc.lineWidth = 1.4 * k; rr(x, y, w, h, 14 * k); gc.stroke();
  const v = CRUISE(T), eta = S_END / MI / (v * 24); label('CRUISE CONTROL', x + 20 * k, y + 28 * k, 10.5 * k, 0.9, 'left', 700, 2 * k); gc.fillStyle = `rgba(${INK},.97)`; gc.font = `500 ${28 * k}px ${SERIF}`; gc.textAlign = 'left'; gc.fillText(`${Math.round(v)} mph`, x + 20 * k, y + 62 * k);
  gc.textAlign = 'right'; gc.fillStyle = `rgba(${GOLD},1)`; gc.font = `600 ${26 * k}px ${SERIF}`; gc.fillText(`${Math.round(eta)} days`, x + w - 20 * k, y + 62 * k); gc.textAlign = 'left';
  const tx0 = x + 24 * k, tx1 = x + w - 24 * k, ty = y + 92 * k; gc.strokeStyle = `rgba(${INK},.28)`; gc.lineWidth = 5 * k; gc.lineCap = 'round'; gc.beginPath(); gc.moveTo(tx0, ty); gc.lineTo(tx1, ty); gc.stroke(); const u = clamp((v - 40) / 100), kx = lerp(tx0, tx1, u); gc.strokeStyle = `rgba(${GOLD},.95)`; gc.beginPath(); gc.moveTo(tx0, ty); gc.lineTo(kx, ty); gc.stroke(); gc.fillStyle = '#fff'; gc.beginPath(); gc.arc(kx, ty, 9 * k, 0, 6.283); gc.fill();
  const press = (T > 22.0 && T < 22.4) || (T > 23.5 && T < 23.9) ? 1 : 0; cursor(kx + 2 * k, ty + 6 * k, press); gc.restore();
}
function drawYet(T, k) {
  const a = sm(10.4, 11.0, T) * (1 - sm(34.6, 35.2, T)); if (a <= 0.01) return; const n = Math.floor(Math.pow(clamp((milesAt(T)) / 238855), 0.35) * 612) + Math.floor(T) % 3; gc.save(); gc.globalAlpha = a;
  gc.fillStyle = 'rgba(8,10,16,.7)'; rr(26 * k, 226 * k, 230 * k, 34 * k, 17 * k); gc.fill(); gc.strokeStyle = `rgba(${INK},.25)`; gc.lineWidth = 1.2 * k; rr(26 * k, 226 * k, 230 * k, 34 * k, 17 * k); gc.stroke(); gc.fillStyle = `rgba(${INK},.95)`; gc.font = `600 ${12.5 * k}px ${SANS}`; gc.textAlign = 'left'; gc.fillText(`"ARE WE THERE YET?"  ×${n}`, 40 * k, 248 * k); gc.restore();
}
function drawWave(T, k) {
  const a = sm(47.6, 48.2, T) * (1 - sm(54.1, 54.6, T)); if (a <= 0.01) return; const sp = waveSpeedMph(T), car = speedMph; gc.save(); gc.globalAlpha = a;
  const x = 40 * k, y = 640 * k, w = 460 * k, h = 118 * k; gc.fillStyle = 'rgba(8,10,16,.72)'; rr(x, y, w, h, 14 * k); gc.fill(); gc.strokeStyle = `rgba(${INK},.25)`; gc.lineWidth = 1.4 * k; rr(x, y, w, h, 14 * k); gc.stroke();
  label('WAVE VS YOU', x + 20 * k, y + 26 * k, 10.5 * k, 0.9, 'left', 700, 2 * k);
  const bar = (yy, name, v, col, max) => { label(name, x + 20 * k, yy + 4 * k, 9.5 * k, 0.8, 'left', 700, 1.6 * k); gc.fillStyle = 'rgba(255,255,255,.12)'; rr(x + 96 * k, yy - 8 * k, 270 * k, 14 * k, 7 * k); gc.fill(); gc.fillStyle = col; rr(x + 96 * k, yy - 8 * k, Math.max(8 * k, 270 * k * clamp(v / max)), 14 * k, 7 * k); gc.fill(); gc.fillStyle = `rgba(${INK},.95)`; gc.font = `700 ${13 * k}px ${SANS}`; gc.textAlign = 'right'; gc.fillText(Math.round(v) + ' mph', x + w - 16 * k, yy + 4 * k); gc.textAlign = 'left'; };
  bar(y + 56 * k, 'TSUNAMI', sp, '#e85a4a', 520); bar(y + 90 * k, 'YOUR CAR', car, 'rgb(232,205,140)', 520); gc.restore();
}
function drawGfx(T) { const k = gfx.width / 540; gc.clearRect(0, 0, gfx.width, gfx.height); const dashOn = T > 0.2 && T < T_SCENE ? sm(0.2, 1.0, T) * (1 - sm(54.0, 54.6, T)) : 0; drawDash(T, k, dashOn); drawYet(T, k); drawCruise(T, k); drawWave(T, k);
  if (T > 4.6 && T < T_SCENE && !(T > 38.0 && T < 43.0)) { gc.save(); gc.globalAlpha = 0.85 * sm(4.6, 5.4, T) * (1 - sm(54.0, 54.6, T)); label('OBJECTS IN MIRROR ARE CLOSER THAN THEY APPEAR', 270 * k, 196 * k, 8.4 * k, 0.8, 'center', 600, 1.1 * k); gc.restore(); }
  // cursor taps the cruise dial in the beach scene too
  const a = sm(52.0, 52.4, T) * (1 - sm(53.7, 54.1, T)); if (a > 0.01) { gc.save(); gc.globalAlpha = a; const tp = T > 52.5 && T < 52.9; cursor(380 * k, (700 + 18 * Math.sin(T * 4)) * k, tp ? 1 : 0); gc.restore(); }
}

/* ---------- HUD / captions / facts / end ---------- */
const elTitle = document.getElementById('title'), hud = document.getElementById('hud'), cap = document.getElementById('caption'), end = document.getElementById('end'), flash = document.getElementById('flash'), tag = document.getElementById('tag'), facts = document.getElementById('facts');
const hLabel = hud.querySelector('.label'), hValue = hud.querySelector('.value'), hSub = hud.querySelector('.sub');
const BEATS = [
  { a: 1.0, b: 4.0, label: 'Distance to the Moon', value: () => '238,855 mi', sub: () => 'Average, center to center' },
  { a: 4.8, b: 8.0, label: 'Plan', value: () => '65 mph', sub: () => 'Cruise control, no stops' },
  { a: 9.2, b: 10.5, label: 'Edge of space', value: () => 'Mile 62', sub: () => 'The road does not end here' },
  { a: 10.7, b: 13.2, label: 'Passing the space station', value: () => 'Mile 250', sub: () => '3 hours 51 min into the trip' },
  { a: 16.8, b: 19.6, label: 'GPS satellites', value: () => 'Mile 12,550', sub: () => 'Day 8 · "Recalculating..."' },
  { a: 19.9, b: 20.9, label: 'Geostationary orbit', value: () => 'Mile 22,236', sub: () => 'Day 14' },
  { a: 28.4, b: 31.0, label: 'Halfway', value: () => 'Day 77', sub: () => 'Mile 119,428' },
  { a: 36.6, b: 40.0, label: 'Trip total', value: () => '153 days', sub: () => '238,855 miles at 65 mph' },
  { a: 40.4, b: 43.2, label: 'Gas', value: () => '~$30,000', sub: () => 'About 9,550 gallons at 25 mpg · my estimate' },
  { a: 46.2, b: 47.6, label: 'The sea', value: () => 'Pulling back', sub: () => 'A real tsunami warning sign' },
];
const CAPS = [
  [4.8, 7.8, 'Road trip to the Moon. Cruise control at 65 mph.'],
  [8.2, 9.8, 'The road goes up.'],
  [10.8, 13.2, 'Mile 250. You pass the space station.'],
  [14.0, 16.6, 'Nobody has stopped for gas.'],
  [17.0, 19.6, 'Mile 12,550. The GPS satellites. Day 8.'],
  [20.0, 24.4, 'Mile 22,236. Day 14. What if you sped up?'],
  [24.6, 28.0, 'Even at 120 mph it takes 83 days.'],
  [29.0, 33.0, 'Day 77. You are halfway there.'],
  [36.8, 40.0, 'Day 153. You made it. There is no gas.'],
  [40.4, 43.2, 'The way home is another 153 days.'],
  [44.0, 46.0, 'Home. Day 306. You park by the beach.'],
  [46.0, 48.0, 'Then the ground shakes. The sea pulls back.'],
  [48.3, 51.8, 'In deep water a tsunami moves like a jet.'],
  [53.4, 54.5, 'Go uphill.'],
];
const FACTS = [
  ['Earth to Moon', '238,855 miles', 'Average distance, center to center. It varies from about 225,600 to 252,000 miles'],
  ['At 65 mph', '153 days', 'Nonstop. 238,855 divided by 65 mph times 24 hours. The round trip is 306 days'],
  ['The gas bill', 'about $30,000', 'My estimate: about 9,550 gallons at 25 mpg and $3.10 a gallon'],
  ['A tsunami\'s speed', '500+ mph at sea', 'Slows to about 20 to 30 mph at the shore, but the water keeps piling up (NOAA). Go uphill, do not wait for a siren'],
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
  tag.style.opacity = T > 4.8 && T < 54.2 ? 0.7 * sm(4.8, 5.6, T) * (1 - sm(53.6, 54.2, T)) : 0;
  flash.style.opacity = T > 36 - 0.2 && T < 36.4 ? 0.6 * (1 - Math.abs(T - 36.1) / 0.3) : T > T_BEACH - 0.15 && T < T_BEACH + 0.3 ? 0.9 * (1 - (T - (T_BEACH - 0.15)) / 0.45) : 0;
  wrap.style.transform = T > 45.2 && T < 54 ? `translate(${(Math.sin(T * 91) * 3 * sm(45.2, 45.8, T)).toFixed(1)}px, ${(Math.cos(T * 77) * 2.5 * sm(45.2, 45.8, T)).toFixed(1)}px)` : 'none';
  const fo = sm(T_SCENE - 0.2, T_SCENE + 0.6, T) * (1 - sm(59.0, 59.6, T)); facts.style.opacity = fo;
  factEls.forEach((el, i) => { el.style.opacity = sm(T_SCENE + 0.3 + i * 0.75, T_SCENE + 0.9 + i * 0.75, T); });
  end.style.opacity = T >= 59 ? sm(59.0, 59.7, T) : 0;
  end.querySelector('.a').style.opacity = sm(59.6, 60.2, T); end.querySelector('.b').style.opacity = sm(60.4, 61.0, T); end.querySelector('.c').style.opacity = sm(61.2, 61.8, T) * 0.9;
  document.getElementById('stage').style.background = T >= T_SCENE ? '#07070a' : '#000';
  drawGfx(T);
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
window.renderAt = renderAt; window.T_END = T_END; window.dbg = { sceneB, sceneN, camera, renderer };
await Promise.all([document.fonts.load('500 40px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"')]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
