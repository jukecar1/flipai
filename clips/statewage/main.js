import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* "What if every state's minimum wage matched inflation?" — pure function of T. Real terrain (AWS/Mapzen elevation tiles), real state shapes (US Census via us-atlas),
   real wages: federal (U.S. DOL) and state (FRED, Jan 1 of each year). The amber "if indexed" prisms are arithmetic: each place's 1968 minimum (the greater of its state rate and the
   federal $1.60) x CPI-U(year) / CPI-U(1968). 1 unit = 10 map pixels (the map is 97.5 x 61 units). */
const T_END = 55;
const P = new URLSearchParams(location.search), DPR = +(P.get('dpr') || 1);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
const lin = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * ((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; };
const kf = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; };

/* ---------- data ---------- */
const STATES = await (await fetch('./data/states.json')).json();
const WAGES = await (await fetch('./data/wages.json')).json();
const elev = new Float32Array(await (await fetch('./data/terrain.bin')).arrayBuffer());
const GW = 975, GH = 610, K = 0.1, HS = 1.15; // map px -> units, units per dollar
const NY = WAGES.years.length;
const money = (v) => '$' + v.toFixed(2);

/* ---------- time map: the clock runs between milestones and holds for each ---------- */
const MS = [[1968, 0, 2.3], [1981, 3.0, 2.4], [1998, 3.4, 2.4], [2010, 2.8, 2.6], [2025, 4.2, 13.2]];
const YK = (() => { let t = 3.2; const k = [[0, 1968], [t, 1968]], times = [t]; t += MS[0][2]; k.push([t, 1968]); for (let i = 1; i < MS.length; i++) { t += MS[i][1]; k.push([t, MS[i][0]]); times.push(t); t += MS[i][2]; k.push([t, MS[i][0]]); } return { k, times, end: t }; })();
const T_SCENE = YK.end, F0 = T_SCENE - 0.2, F_END = F0 + 9.2, E0 = F_END;
const yearAt = (T) => { const k = YK.k; if (T <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (T < k[i][0]) { const [t0, v0] = k[i - 1], [t1, v1] = k[i]; return v0 + (v1 - v0) * smooth((T - t0) / (t1 - t0)); } return k[k.length - 1][1]; };
const val = (arr, y) => { const u = clamp(y - 1968, 0, NY - 1), i = Math.floor(u), f = u - i; return lerp(arr[i], arr[Math.min(NY - 1, i + 1)], f); };
const ABOVE = WAGES.years.map((_, i) => Object.values(WAGES.states).filter((s) => s.eff[i] > WAGES.fed[i] + 1e-9).length);

/* ---------- renderer ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false); renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene(); const HAZE = new THREE.Color(0.80, 0.72, 0.58), SEAHAZE = new THREE.Color(0.58, 0.66, 0.68);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 1, 1500);
const accCanvas = document.getElementById('acc'); accCanvas.width = innerWidth * DPR; accCanvas.height = innerHeight * DPR; const actx = accCanvas.getContext('2d');
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType }));
composer.setSize(innerWidth * DPR, innerHeight * DPR); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
{ const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms['resolution'].value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); composer.addPass(fxaa); }
const SUN = new THREE.Vector3(-0.55, 0.62, 0.45).normalize();

/* hillshade + sea mask texture from the real elevations (sun from the north-west) */
const shadeTex = (() => {
  const d = new Uint8Array(GW * GH * 4), ex = (i, j) => { const e = elev[clamp(j, 0, GH - 1) * GW + clamp(i, 0, GW - 1)]; return e > 0 ? e / 1000 : 0; };
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const gx = (ex(i + 1, j) - ex(i - 1, j)) / 2, gy = (ex(i, j + 1) - ex(i, j - 1)) / 2, s = clamp(0.62 + 5.5 * (-gx * 0.7 - gy * 0.7), 0.25, 1.25), e = elev[j * GW + i], o = (j * GW + i) * 4; d[o] = Math.round(s * 200); d[o + 1] = Math.round(clamp(e / 4000, 0, 1) * 255); d[o + 2] = e > 0.5 ? 255 : 0; d[o + 3] = 255; }
  const t = new THREE.DataTexture(d, GW, GH, THREE.RGBAFormat, THREE.UnsignedByteType); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
})();
const U = { uShade: { value: shadeTex }, uSun: { value: SUN }, uHaze: { value: HAZE }, uSeaHaze: { value: SEAHAZE }, uCam: { value: new THREE.Vector3() }, uHazeD: { value: 0.0016 } };
const HZ = `float hz = 1.0 - exp(-length(vW - uCam) * uHazeD); col = mix(col, uHaze, clamp(hz, 0.0, 0.7)); col = pow(clamp(col, 0.0, 1.0), vec3(2.2));`;
const MAPUV = `vec2 muv = vec2(vW.x / ${(GW * K).toFixed(3)} + 0.5, vW.z / ${(GH * K).toFixed(3)} + 0.5);`;

/* ---------- ground: real terrain (low relief, exaggerated) and sea ---------- */
{
  const step = 2, sw = Math.floor(GW / step), sh = Math.floor(GH / step), pos = new Float32Array(sw * sh * 3), aE = new Float32Array(sw * sh);
  for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) { const e = elev[Math.min(GH - 1, j * step) * GW + Math.min(GW - 1, i * step)], k = j * sw + i; pos[k * 3] = (i * step + 0.5 - GW / 2) * K; pos[k * 3 + 1] = e > 0.5 ? (e / 1000) * 0.21 : -0.05; pos[k * 3 + 2] = (j * step + 0.5 - GH / 2) * K; aE[k] = e; }
  const idx = new Uint32Array((sw - 1) * (sh - 1) * 6); let q = 0; for (let j = 0; j < sh - 1; j++) for (let i = 0; i < sw - 1; i++) { const a = j * sw + i, b = a + 1, c = a + sw, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aE', new THREE.BufferAttribute(aE, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: 'attribute float aE; varying float vE; varying vec3 vN, vW; void main(){ vE = aE; vN = normal; vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uSun, uHaze, uCam, uSeaHaze; uniform float uHazeD; varying float vE; varying vec3 vN, vW;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec3 n = normalize(vN); float ndl = clamp(dot(n, uSun), 0.0, 1.0); float e = vE;
        vec3 low = vec3(0.78, 0.70, 0.54), mid = vec3(0.62, 0.52, 0.38), high = vec3(0.86, 0.80, 0.70); float hm = smoothstep(150.0, 1400.0, e), hh = smoothstep(2000.0, 3600.0, e);
        vec3 land = mix(mix(low, mid, hm), high, hh) * (0.93 + vn(vW.xz * 1.3) * 0.12); vec3 col = land * (0.46 + 0.85 * ndl);
        if (e <= 0.5) { vec3 sea = mix(vec3(0.50, 0.58, 0.58), vec3(0.34, 0.44, 0.47), smoothstep(0.0, -2500.0, e)); sea *= 0.78 + 0.35 * ndl; col = mix(sea, vec3(0.93, 0.91, 0.84), smoothstep(-25.0, 0.4, e) * 0.55); }
        float edge = min(min(vW.x + ${(GW * K / 2 - 1).toFixed(1)}, ${(GW * K / 2 - 1).toFixed(1)} - vW.x), min(vW.z + ${(GH * K / 2 - 1).toFixed(1)}, ${(GH * K / 2 - 1).toFixed(1)} - vW.z)); col = mix(e <= 0.5 ? uSeaHaze : uHaze, col, smoothstep(0.0, 6.0, edge));
        float hz = 1.0 - exp(-length(vW - uCam) * uHazeD); col = mix(col, e <= 0.5 ? uSeaHaze : uHaze, clamp(hz, 0.0, 0.7)); col = pow(clamp(col, 0.0, 1.0), vec3(2.2));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }` });
  scene.add(new THREE.Mesh(g, mat));
  const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.58, 0.66, 0.68, THREE.SRGBColorSpace) })); far.rotation.x = -Math.PI / 2; far.position.y = -0.2; scene.add(far);
}

/* ---------- state prisms: solid = actual minimum wage, amber glass = what it would be if it matched inflation ---------- */
const toXZ = ([x, y]) => [(x - GW / 2) * K, (y - GH / 2) * K];
const SLAB_VS = 'varying vec3 vN, vW, vL; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';
const slabFS = `uniform vec3 uSun, uHaze, uCam; uniform float uHazeD, uWage; uniform sampler2D uShade; varying vec3 vN, vW, vL;
  void main(){ vec3 n = normalize(vN); float ndl = clamp(dot(n, uSun), 0.0, 1.0); ${MAPUV}
    float t = smoothstep(7.0, 17.0, uWage); vec3 tint = mix(vec3(0.46, 0.50, 0.54), vec3(0.99, 0.96, 0.88), t);
    vec3 col;
    if (n.y > 0.5) { vec4 s = texture2D(uShade, muv); col = tint * (0.72 + 0.38 * (s.r * 1.275)) * (0.94 + 0.12 * ndl); }
    else { float g = 0.66 + 0.34 * smoothstep(0.0, 1.0, vL.y); col = tint * g * (0.58 + 0.42 * ndl) * 0.95; }
    ${HZ}
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
const ghostFS = `uniform vec3 uSun, uHaze, uCam; uniform float uHazeD; varying vec3 vN, vW, vL;
  void main(){ vec3 n = normalize(vN); vec3 v = normalize(uCam - vW); float fr = pow(1.0 - abs(dot(n, v)), 2.0); float ndl = clamp(dot(n, uSun), 0.0, 1.0);
    vec3 col = vec3(1.0, 0.72, 0.27) * (0.72 + 0.5 * ndl); float a = (n.y > 0.5 ? 0.16 : 0.11) + 0.30 * fr;
    float hz = 1.0 - exp(-length(vW - uCam) * uHazeD); col = mix(col, uHaze, clamp(hz, 0.0, 0.6)); col = pow(clamp(col, 0.0, 1.0), vec3(2.2));
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }`;
const prisms = STATES.map((s) => {
  const shapes = s.polys.map((poly) => { const sh = new THREE.Shape(poly[0].map((p) => { const [x, z] = toXZ(p); return new THREE.Vector2(x, -z); })); for (const h of poly.slice(1)) sh.holes.push(new THREE.Path(h.map((p) => { const [x, z] = toXZ(p); return new THREE.Vector2(x, -z); }))); return sh; });
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 1 }); geo.rotateX(-Math.PI / 2);
  const mA = new THREE.ShaderMaterial({ uniforms: { ...U, uWage: { value: 7.25 } }, vertexShader: SLAB_VS, fragmentShader: slabFS });
  const mG = new THREE.ShaderMaterial({ uniforms: U, vertexShader: SLAB_VS, fragmentShader: ghostFS, transparent: true, depthWrite: false });
  const A = new THREE.Mesh(geo, mA), G = new THREE.Mesh(geo, mG); A.frustumCulled = G.frustumCulled = false; G.renderOrder = 5;
  // outlines on the tops
  const lineA = new THREE.Group(), lineG = new THREE.Group(); const matLA = new THREE.LineBasicMaterial({ color: 0xfff6e2, transparent: true, opacity: 0.85 }), matLG = new THREE.LineBasicMaterial({ color: 0xffc766, transparent: true, opacity: 0.9 });
  for (const poly of s.polys) for (const ring of poly) { const pts = ring.map((p) => { const [x, z] = toXZ(p); return new THREE.Vector3(x, 0, z); }); const geoL = new THREE.BufferGeometry().setFromPoints(pts); lineA.add(new THREE.LineLoop(geoL, matLA)); const lg = new THREE.LineLoop(geoL, matLG); lineG.add(lg); }
  scene.add(A, G, lineA, lineG);
  // label anchor: centroid of the biggest ring
  let best = null, ba = 0; for (const poly of s.polys) { const r = poly[0]; let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } a = Math.abs(a) / 2; if (a > ba) { ba = a; best = r; } }
  let cx = 0, cz = 0; for (const p of best) { const [x, z] = toXZ(p); cx += x; cz += z; } cx /= best.length; cz /= best.length;
  return { ab: s.ab, A, G, lineA, lineG, mA, cx, cz, d: WAGES.states[s.ab] };
});
const PBY = Object.fromEntries(prisms.map((p) => [p.ab, p]));

/* ---------- camera ---------- */
const TF0 = T_SCENE - 12.4;
const CAMK = [ // T, then [target x, y, z], distance, azimuth deg, pitch deg
  [0, [0, 0, 4], 232, -6, 58], [YK.times[1], [0, 0, 2], 205, -2, 54], [YK.times[3], [0, 0, 2], 192, 6, 46], [YK.times[4], [-4, 0, 2], 196, 2, 38],
  [TF0, [-4, 0, 2], 196, -3, 36], [TF0 + 2.2, [-30, 0, 2], 130, 16, 33], [TF0 + 4.9, [-30, 0, 2], 126, 11, 33], [TF0 + 6.5, [28, 0, -4], 126, -16, 33], [TF0 + 8.9, [28, 0, -4], 122, -12, 33], [TF0 + 10.6, [0, 0, 3], 200, 0, 38], [T_SCENE, [0, 0, 3], 204, 2, 42],
];
function camAt(T) {
  const f = (i) => kf(T, CAMK.map((k) => [k[0], i < 3 ? k[1][i] : k[i - 1]])); const tx = f(0), ty = f(1), tz = f(2), D = f(3), az = (f(4) + 2.5 * Math.sin(T * 0.2)) * Math.PI / 180, pt = f(5) * Math.PI / 180;
  camera.position.set(tx + Math.sin(az) * Math.cos(pt) * D, ty + Math.sin(pt) * D, tz + Math.cos(az) * Math.cos(pt) * D); camera.lookAt(tx, ty, tz);
  camera.setViewOffset(innerWidth, innerHeight, 0, -innerHeight * 0.0, innerWidth, innerHeight);
  camera.near = Math.max(1, D * 0.08); camera.far = D * 4 + 300; camera.updateProjectionMatrix();
}

/* ---------- update ---------- */
let curYear = 1968;
function update(T) {
  const year = yearAt(T); curYear = year; camAt(T); U.uCam.value.copy(camera.position);
  const grow = sm(1.0, 3.2, T);
  for (const p of prisms) { const wa = val(p.d.eff, year), wi = val(p.d.idx, year), ha = Math.max(0.04, wa * HS), hg = Math.max(0.04, wi * HS * grow + 0.04); p.A.scale.y = ha; const gh = Math.max(0, hg - ha); p.G.visible = gh > 0.05; p.G.position.y = ha; p.G.scale.y = Math.max(gh, 0.001); p.lineA.position.y = ha + 0.01; p.lineG.position.y = hg + 0.01; p.lineG.visible = gh > 0.15; p.mA.uniforms.uWage.value = wa; }
}

/* ---------- 2D graphics: callouts, timeline ---------- */
const gfx = document.getElementById('gfx'); gfx.width = 540 * Math.min(DPR, 2); gfx.height = 960 * Math.min(DPR, 2); const gc = gfx.getContext('2d');
const SANS = '"Helvetica Neue", Arial, "Liberation Sans", sans-serif', SERIF = '"Cormorant Garamond", "Liberation Serif", serif', INK = '58,44,28';
const E = WAGES.states; const L = NY - 1;
const stat = (ab, i) => `${E[ab].name}`;
const top2025 = Object.entries(E).sort((a, b) => b[1].eff[L] - a[1].eff[L]);
const TF = TF0; // start of the final tour
const CALLS = [
  { T0: YK.times[0] + 0.2, T1: YK.times[0] + 2.2, ab: 'CA', t: 'California: $1.65', s: 'Alaska: $2.10. The only two above the $1.60 federal rate', ax: 'l' },
  { T0: YK.times[1] + 0.2, T1: YK.times[1] + 2.3, ab: 'KS', t: 'Federal: $3.35', s: 'Frozen for the next 9 years', ax: 'r' },
  { T0: YK.times[2] + 0.2, T1: YK.times[2] + 2.3, ab: 'KS', t: 'Federal: $5.15', s: 'Raised Sept 1997. The next raise comes in 2007', ax: 'r' },
  { T0: YK.times[3] + 0.2, T1: YK.times[3] + 2.4, ab: 'KS', t: 'Federal: $7.25', s: 'Last raised July 24, 2009', ax: 'r' },
  { T0: YK.times[3] + 0.2, T1: YK.times[3] + 2.4, ab: 'WA', t: 'Washington: ' + money(E.WA.eff[42]), s: 'The highest state rate that year', ax: 'r', dy: 40 },
  { T0: TF + 2.5, T1: TF + 4.5, ab: 'CA', t: 'California: ' + money(E.CA.eff[L]), s: 'Indexed from $1.65: ' + money(E.CA.idx[L]), ax: 'l', dy: 40 },
  { T0: TF + 3.5, T1: TF + 5.5, ab: 'WA', t: 'Washington: ' + money(E.WA.eff[L]), s: 'Indexed: ' + money(E.WA.idx[L]), ax: 'r', dy: 8 },
  { T0: TF + 7.0, T1: TF + 9.0, ab: 'NY', t: 'New York: ' + money(E.NY.eff[L]), s: 'Indexed: ' + money(E.NY.idx[L]), ax: 'l' },
  { T0: TF + 8.0, T1: TF + 10.0, ab: 'DC', t: 'D.C.: ' + money(E.DC.eff[L]), s: 'The highest of all', ax: 'l', dy: 50 },
  { T0: TF + 10.5, T1: TF + 12.3, ab: 'TX', t: 'Texas: $7.25', s: '20 states still use the federal rate', ax: 'l', dy: -22 },
  { T0: TF + 10.9, T1: TF + 12.3, ab: 'AK', t: 'Alaska: ' + money(E.AK.eff[L]), s: 'Indexed from $2.10: ' + money(E.AK.idx[L]), ax: 'r', dy: 36 },
];
const v3 = new THREE.Vector3();
function drawCallouts(T, k) {
  for (const m of CALLS) { if (!(T >= m.T0 && T < m.T1)) continue; const a = sm(m.T0, m.T0 + 0.5, T) * (1 - sm(m.T1 - 0.5, m.T1, T)), p = PBY[m.ab]; const hh = p.G.visible ? p.G.position.y + p.G.scale.y : p.A.scale.y; v3.set(p.cx, hh, p.cz); v3.project(camera); if (v3.z > 1) continue;
    const sx = (v3.x * 0.5 + 0.5) * gfx.width, sy = (-v3.y * 0.5 + 0.5) * gfx.height; const left = m.ax === 'l', ox = (left ? -1 : 1) * 40 * k, oy = (-44 + (m.dy || 0)) * k; const tx = clamp(sx + ox, 26 * k, gfx.width - 26 * k), ty = clamp(sy + oy, 392 * k, 880 * k);
    gc.save(); gc.globalAlpha = a; gc.strokeStyle = `rgba(${INK},.8)`; gc.lineWidth = 1.4 * k; gc.beginPath(); gc.moveTo(sx, sy); gc.lineTo(tx, ty); gc.stroke(); gc.fillStyle = `rgb(${INK})`; gc.beginPath(); gc.arc(sx, sy, 3.2 * k, 0, 6.283); gc.fill();
    gc.font = `700 ${20 * k}px ${SERIF}`; const w1 = gc.measureText(m.t).width; gc.font = `600 ${13 * k}px ${SERIF}`; const w2 = gc.measureText(m.s).width, bw = Math.max(w1, w2) + 18 * k, bx = clamp(left ? tx - bw : tx - 2 * k, 10 * k, gfx.width - bw - 10 * k), tw = bx + 9 * k;
    gc.fillStyle = 'rgba(247,239,221,.9)'; gc.beginPath(); gc.roundRect ? gc.roundRect(bx, ty - 21 * k, bw, 46 * k, 8 * k) : gc.rect(bx, ty - 21 * k, bw, 46 * k); gc.fill();
    gc.textAlign = 'left'; gc.fillStyle = `rgba(${INK},.98)`; gc.font = `700 ${20 * k}px ${SERIF}`; gc.fillText(m.t, tw, ty - 3 * k); gc.font = `600 ${13 * k}px ${SERIF}`; gc.fillStyle = `rgba(${INK},.9)`; gc.fillText(m.s, tw, ty + 17 * k); gc.restore(); }
}
const lerpv = (a, b, f) => a + (b - a) * f;
function drawLegend(T, k) {
  const a = sm(3.6, 4.4, T) * (1 - sm(T_SCENE - 0.6, T_SCENE, T)); if (a <= 0.01) return; gc.save(); gc.globalAlpha = a; gc.textAlign = 'left'; gc.font = `700 ${9.5 * k}px ${SANS}`; if ('letterSpacing' in gc) gc.letterSpacing = 1.6 * k + 'px';
  gc.fillStyle = '#f6ecd6'; gc.fillRect(40 * k, 866 * k, 14 * k, 9 * k); gc.fillStyle = 'rgba(255,255,255,.9)'; gc.fillText('ACTUAL MINIMUM', 60 * k, 875 * k);
  gc.fillStyle = 'rgba(234,176,76,.9)'; gc.fillRect(214 * k, 866 * k, 14 * k, 9 * k); gc.fillStyle = 'rgba(255,255,255,.9)'; gc.fillText('IF IT MATCHED INFLATION', 234 * k, 875 * k);
  const gy = 905 * k, gx0 = 40 * k, gx1 = 500 * k, px = (y) => lerpv(gx0, gx1, (y - 1968) / (2025 - 1968)); gc.strokeStyle = 'rgba(255,255,255,.35)'; gc.lineWidth = 2.5 * k; gc.lineCap = 'round'; gc.beginPath(); gc.moveTo(gx0, gy); gc.lineTo(gx1, gy); gc.stroke(); gc.strokeStyle = '#fff'; gc.beginPath(); gc.moveTo(gx0, gy); gc.lineTo(px(Math.min(2025, curYear)), gy); gc.stroke(); gc.fillStyle = '#fff'; gc.beginPath(); gc.arc(px(Math.min(2025, curYear)), gy, 5 * k, 0, 6.283); gc.fill();
  gc.font = `600 ${9 * k}px ${SANS}`; gc.textAlign = 'center'; for (const y of [1968, 1980, 1990, 2000, 2010, 2025]) { gc.fillStyle = 'rgba(255,255,255,.8)'; gc.fillText(String(y), px(y), gy + 16 * k); } gc.restore();
}
function updateOverlay(T) {
  const year = Math.min(2025, Math.floor(curYear + 0.0001)), idxI = Math.max(0, year - 1968);
  const el = document.getElementById('year'); el.textContent = String(year); el.style.opacity = sm(0.3, 1.0, T) * (1 - sm(T_SCENE - 0.5, T_SCENE, T));
  const tt = document.getElementById('title'); tt.style.opacity = sm(0.15, 0.9, T) * (1 - sm(T_SCENE - 0.5, T_SCENE, T)); document.getElementById('scrim').style.opacity = tt.style.opacity;
  const head = document.getElementById('head'); const HEADS = ['The same floor, nearly everywhere', 'The freeze begins', 'Another long wait', 'The last federal raise', 'Today, state by state']; let hi = -1; for (let i = 0; i < MS.length; i++) if (T >= YK.times[i] - 0.05 && T < YK.times[i] + MS[i][2] - 0.1) hi = i;
  if (hi >= 0) { const t0 = YK.times[hi] - 0.05, t1 = YK.times[hi] + MS[hi][2] - 0.1, last = hi === MS.length - 1; head.textContent = HEADS[hi]; head.style.opacity = sm(t0, t0 + 0.4, T) * (last ? 1 - sm(T_SCENE - 0.8, T_SCENE - 0.3, T) : 1 - sm(t1 - 0.5, t1, T)); } else head.style.opacity = 0;
  const hud = document.getElementById('hud'), fed = val(WAGES.fed, curYear), idx = fed ? val(WAGES.states.KS.idx, curYear) : 0; hud.querySelector('.label').textContent = 'Federal minimum wage · Jan 1'; hud.querySelector('.value').textContent = money(WAGES.fed[idxI]); hud.querySelector('.sub').textContent = 'If it matched inflation: ' + money(WAGES.fed[0] * WAGES.ratio[idxI]);
  hud.querySelector('.row2').textContent = 'Places above the federal rate: ' + ABOVE[idxI]; hud.style.opacity = sm(3.6, 4.4, T) * (1 - sm(T_SCENE - 0.6, T_SCENE, T)); void fed; void idx;
  document.getElementById('tag').style.opacity = T > 3.6 && T < T_SCENE ? 0.7 * sm(3.6, 4.4, T) * (1 - sm(T_SCENE - 0.6, T_SCENE, T)) : 0;
  const fo = sm(F0 - 0.2, F0 + 0.6, T) * (1 - sm(F_END - 0.5, F_END, T)); const facts = document.getElementById('facts'); facts.style.opacity = fo; [...facts.children].forEach((e, i) => { e.style.opacity = sm(F0 + 0.5 + i * 2.4, F0 + 1.1 + i * 2.4, T); });
  const end = document.getElementById('end'); end.style.opacity = T >= E0 ? sm(E0, E0 + 0.7, T) : 0; end.querySelector('.a').style.opacity = sm(E0 + 0.6, E0 + 1.2, T); end.querySelector('.b').style.opacity = sm(E0 + 1.4, E0 + 2.0, T); end.querySelector('.c').style.opacity = sm(E0 + 2.3, E0 + 2.9, T) * 0.9;
  document.getElementById('stage').style.background = T >= F0 + 0.4 ? '#07070a' : '#000';
  const k = gfx.width / 540; gc.clearRect(0, 0, gfx.width, gfx.height); drawCallouts(T, k); drawLegend(T, k);
}
const FACTS = [
  ['Above the federal rate', '31 of 51', 'On Jan 1, 2025, 30 states and D.C. set a minimum above $7.25. The other 20 use the federal rate'],
  ['Kept pace with inflation', '13 of 51', 'Only 12 states and D.C. are at or above their own 1968 minimum adjusted for CPI-U: CA, CO, CT, DE, IL, MD, MA, NJ, NY, OR, RI, WA'],
  ['The debate', 'Economists disagree', 'CBO (2021): a $15 federal minimum by 2025 would mean about 1.4 million fewer jobs and 900,000 fewer people in poverty'],
];
document.getElementById('facts').innerHTML = FACTS.map((f) => `<div class="fr"><div class="fl">${f[0]}</div><div class="fv">${f[1]}</div><div class="fs">${f[2]}</div></div>`).join('');
{ const g = document.getElementById('grain'), c = g.getContext('2d'), id = c.createImageData(256, 256); let s = 99; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }
function renderAt(T, sub = 1) {
  T = clamp(T, 0, T_END); const skip3D = T > T_SCENE + 0.5;
  if (!skip3D) { update(T); composer.render(); actx.globalAlpha = 1; actx.drawImage(glCanvas, 0, 0); } else { actx.fillStyle = '#07070a'; actx.fillRect(0, 0, accCanvas.width, accCanvas.height); }
  updateOverlay(T);
}
window.renderAt = renderAt; window.T_END = T_END; window.dbg = { scene, camera, prisms, YK };
await Promise.all([document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('700 30px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"')]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
