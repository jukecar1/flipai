import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/* "Evolution of Los Angeles — 3D city timelapse (1781–2026)" — 62 s, pure function of T.
   Real terrain (AWS/Mapzen terrain tiles) and real freeway routes (OpenStreetMap). The growth of the city is a stylized model
   (fronts spreading from founding nuclei, scaled to a plausible built-up-area curve), not a map of actual construction dates. 1 unit = 1 km. */
const T_END = 62, T_SCENE = 54.6;
const P = new URLSearchParams(location.search), DPR = +(P.get('dpr') || 1);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
function kf(t, pts) { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; }
const lin = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * ((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; };

/* ---------- time -> year: the clock runs between milestones and holds for each one ---------- */
let MIL_TIMES = [];
const MIL_YEARS = [1781, 1850, 1892, 1910, 1913, 1923, 1928, 1932, 1940, 1955, 1962, 1984, 1990, 2017, 2020];
const HOLD = 2.1, HOLD0 = 2.6;
const YK = (() => { const k = [[0, 1781], [HOLD0, 1781]]; let t = HOLD0; MIL_TIMES.push(0); for (let i = 1; i < MIL_YEARS.length; i++) { const d = MIL_YEARS[i] - MIL_YEARS[i - 1], tt = clamp(0.5 + 0.05 * d, 0.55, 2.3); t += tt; MIL_TIMES.push(t); k.push([t, MIL_YEARS[i]]); t += HOLD; k.push([t, MIL_YEARS[i]]); } t += 1.0; k.push([t, 2026]); k.push([T_SCENE, 2026]); return k; })();
const yearAt = (T) => lin(T, YK);
const timeOfYear = (y) => { const i = MIL_YEARS.indexOf(y); return i >= 0 ? MIL_TIMES[i] : T_SCENE; };

/* ---------- data ---------- */
const meta = await (await fetch('./data/meta.json')).json();
const elev = new Float32Array(await (await fetch('./data/terrain.bin')).arrayBuffer());
const yrs = new Uint16Array(await (await fetch('./data/year.bin')).arrayBuffer());
let roads = { mw: [], pr: [], rl: [] }; try { roads = await (await fetch('./data/roads.json')).json(); } catch (e) { /* optional */ }
const { W, H, cell, x0, y0, lon0, lat0, kx, ky } = meta;
const EXAG = 3.2;
const kmOf = (lon, lat) => [(lon - lon0) * kx, -((lat - lat0) * ky)]; // x east, z south
const cellAt = (x, z) => { const i = Math.round((x - x0) / cell - 0.5), j = Math.round((-z - y0) / cell - 0.5); return [clamp(i, 0, W - 1), clamp(j, 0, H - 1)]; };
const heightKm = (x, z) => { const [i, j] = cellAt(x, z); const e = elev[j * W + i]; return e > 0.5 ? (e / 1000) * EXAG : 0; };

/* ---------- renderer ---------- */
const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene(); const HAZE = new THREE.Color(0.80, 0.72, 0.58);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.05, 2500);
const wrap = document.getElementById('sceneWrap');
const accCanvas = document.getElementById('acc'); accCanvas.width = innerWidth * DPR; accCanvas.height = innerHeight * DPR; const actx = accCanvas.getContext('2d');
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType }));
composer.setSize(innerWidth * DPR, innerHeight * DPR); composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
{ const fxaa = new ShaderPass(FXAAShader); fxaa.material.uniforms['resolution'].value.set(1 / (innerWidth * DPR), 1 / (innerHeight * DPR)); composer.addPass(fxaa); }
const SUN = new THREE.Vector3(-0.62, 0.55, 0.42).normalize();
const SEAHAZE = new THREE.Color(0.60, 0.68, 0.69);
const U = { uSeaHaze: { value: SEAHAZE }, uYear: { value: 1781 }, uSun: { value: SUN }, uHaze: { value: HAZE }, uCam: { value: new THREE.Vector3() }, uHazeD: { value: 0.0022 } };
const HZ_FRAG = `float hz = 1.0 - exp(-length(vW - uCam) * uHazeD); col = mix(col, uHaze, clamp(hz, 0.0, 0.88)); col = pow(clamp(col, 0.0, 1.0), vec3(2.2));`;

/* ---------- terrain mesh (real elevations), with a developed-ground tint and a street grid that fade in with the year ---------- */
{
  const pos = new Float32Array(W * H * 3), aYear = new Float32Array(W * H), aElev = new Float32Array(W * H), smoothE = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = clamp(i + di, 0, W - 1), jj = clamp(j + dj, 0, H - 1); s += elev[jj * W + ii]; n++; } smoothE[j * W + i] = s / n; }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, e = smoothE[k]; pos[k * 3] = x0 + (i + 0.5) * cell; pos[k * 3 + 1] = e > 0.5 ? (e / 1000) * EXAG : 0; pos[k * 3 + 2] = -(y0 + (j + 0.5) * cell); aYear[k] = yrs[k] || 9999; aElev[k] = e; }
  const idx = new Uint32Array((W - 1) * (H - 1) * 6); let q = 0; for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aYear', new THREE.BufferAttribute(aYear, 1)); g.setAttribute('aElev', new THREE.BufferAttribute(aElev, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: 'attribute float aYear; attribute float aElev; varying float vYear, vElev; varying vec3 vN, vW; void main(){ vYear = aYear; vElev = aElev; vN = normal; vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uYear; uniform vec3 uSun, uHaze, uCam, uSeaHaze; uniform float uHazeD; varying float vYear, vElev; varying vec3 vN, vW;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 n = normalize(vN); float ndl = clamp(dot(n, uSun), 0.0, 1.0); float e = vElev;
        vec3 low = vec3(0.80, 0.71, 0.55), mid = vec3(0.66, 0.54, 0.38), high = vec3(0.86, 0.80, 0.70);
        float hm = smoothstep(80.0, 700.0, e), hh = smoothstep(1100.0, 2300.0, e);
        vec3 land = mix(mix(low, mid, hm), high, hh); float tex = vn(vW.xz * 2.2) * 0.12 + vn(vW.xz * 7.0) * 0.06; land *= 0.93 + tex;
        vec3 col = land * (0.50 + 0.78 * ndl);
        float built = smoothstep(vYear, vYear + 2.5, uYear) * step(vYear, 5000.0);
        vec3 urban = vec3(0.66, 0.60, 0.51) * (0.55 + 0.7 * ndl);
        vec2 gp = vW.xz / 1.6; vec2 gl = abs(fract(gp - 0.5) - 0.5) / max(fwidth(gp), vec2(0.0001)); float grid = 1.0 - min(min(gl.x, gl.y), 1.0);
        vec2 gp2 = vW.xz / 0.4; vec2 gl2 = abs(fract(gp2 - 0.5) - 0.5) / max(fwidth(gp2), vec2(0.0001)); float grid2 = (1.0 - min(min(gl2.x, gl2.y), 1.0)) * 0.45;
        col = mix(col, urban, built * 0.62); col = mix(col, col * 0.7, built * max(grid, grid2) * 0.5);
        if (e <= 0.5) { vec3 sea = mix(vec3(0.46, 0.54, 0.55), vec3(0.34, 0.43, 0.46), smoothstep(0.0, -60.0, e)); sea *= 0.75 + 0.45 * ndl + vn(vW.xz * 1.5 + 3.0) * 0.06; float shore = smoothstep(-6.0, 0.4, e); col = mix(sea, vec3(0.95, 0.93, 0.87), shore * 0.7); }
        float edge = min(min(vW.x - ${(x0 + 2).toFixed(2)}, ${(x0 + W * cell - 2).toFixed(2)} - vW.x), min(-vW.z - ${(y0 + 2).toFixed(2)}, ${(y0 + H * cell - 2).toFixed(2)} + vW.z)); col = mix(e <= 0.5 ? uSeaHaze : uHaze, col, smoothstep(0.0, 12.0, edge));
        ${HZ_FRAG}
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(g, mat));
  const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.60, 0.68, 0.69, THREE.SRGBColorSpace) })); far.rotation.x = -Math.PI / 2; far.position.y = -0.02; scene.add(far);
}

/* ---------- buildings (instanced blocks that rise when the front arrives) ---------- */
const CENTERS = [[-118.2437, 34.0522, 15, 1.9], [-118.4175, 34.0565, 9, 1.0], [-118.3287, 34.0983, 4.5, 1.0], [-118.3 , 34.0617, 4.5, 1.8], [-118.4437, 34.0635, 5, 0.9], [-118.5568, 34.1836, 4, 1.1], [-118.2551, 34.1425, 4, 1.0], [-118.1445, 34.1478, 3.5, 1.0], [-118.1937, 33.7701, 6, 1.4], [-118.3089, 34.1808, 3, 1.0], [-118.4912, 34.0195, 3, 0.9], [-118.40, 33.93, 2.5, 1.5], [-117.9145, 33.8353, 2.5, 1.5], [-118.3406, 33.8358, 2, 1.2]].map(([lo, la, a, r]) => [...kmOf(lo, la), a, r]);
const bldgs = (() => {
  const r = rng(2025), off = [], size = [], yr = [], shade = [], low = []; const kmDT = kmOf(-118.2437, 34.0522);
  for (let j = 2; j < H - 2; j++) for (let i = 2; i < W - 2; i++) {
    const k = j * W + i, y = yrs[k]; if (!y) continue; const x = x0 + (i + 0.5) * cell, z = -(y0 + (j + 0.5) * cell), dd = Math.hypot(x - kmDT[0], z - kmDT[1]);
    const dens = 0.7 - Math.min(0.28, dd * 0.004); if (r() > dens) continue;
    let boost = 1 + 1.6 * Math.exp(-dd / 14); for (const [cx, cz, a, rr] of CENTERS) { const d = Math.hypot(x - cx, z - cz); boost += a * Math.exp(-Math.pow(d / rr, 2)) * (0.6 + 0.8 * r()); }
    const base = 0.007 + 0.011 * r(), hKm = base * boost, hh = hKm * EXAG * 2.0, s = (y < 1895 ? 0.06 + 0.045 * r() : 0.13 + 0.09 * r());
    off.push(x + (r() - 0.5) * 0.08, heightKm(x, z), z + (r() - 0.5) * 0.08); size.push(s, hh, s * (0.8 + 0.4 * r())); low.push(Math.min(hh, (0.0045 + 0.0045 * r()) * EXAG * 2.4)); yr.push(y + (r() - 0.5) * 2); shade.push(0.82 + 0.3 * r() - Math.min(0.12, hKm * 0.2));
  }
  { const pz = kmOf(-118.2379, 34.0572), rr2 = rng(77); for (let q = 0; q < 14; q++) { const a = (q / 14) * 6.283 + rr2() * 0.3, d = 0.09 + 0.05 * rr2(), x = pz[0] + Math.cos(a) * d, z = pz[1] + Math.sin(a) * d * 0.8; off.push(x, heightKm(x, z), z); size.push(0.028 + 0.012 * rr2(), 0.05, 0.028 + 0.012 * rr2()); yr.push(1776 + q * 0.2); shade.push(0.78 + 0.12 * rr2()); low.push(0.05); } }
  return { off: new Float32Array(off), size: new Float32Array(size), yr: new Float32Array(yr), low: new Float32Array(low), shade: new Float32Array(shade), n: yr.length };
})();
{
  const ig = new THREE.InstancedBufferGeometry(); const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0); ig.index = box.index; ig.setAttribute('position', box.attributes.position); ig.setAttribute('normal', box.attributes.normal);
  ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(bldgs.off, 3)); ig.setAttribute('aSize', new THREE.InstancedBufferAttribute(bldgs.size, 3)); ig.setAttribute('aYear', new THREE.InstancedBufferAttribute(bldgs.yr, 1)); ig.setAttribute('aShade', new THREE.InstancedBufferAttribute(bldgs.shade, 1)); ig.setAttribute('aLow', new THREE.InstancedBufferAttribute(bldgs.low, 1)); ig.instanceCount = bldgs.n;
  const mat = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: 'attribute vec3 aOff, aSize; attribute float aYear, aShade, aLow; uniform float uYear; varying vec3 vN, vW; varying float vSh, vTop; void main(){ float g = smoothstep(aYear, aYear + 4.0, uYear); float tall = smoothstep(1895.0, 1990.0, uYear) * smoothstep(aYear + 4.0, aYear + 50.0, uYear); float h = mix(aLow, aSize.y, tall) * g; vec3 p = aOff + vec3(position.x * aSize.x, position.y * h, position.z * aSize.z); if (g <= 0.001) p = vec3(0.0, -50.0, 0.0); vN = normal; vW = p; vSh = aShade; vTop = position.y; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }',
    fragmentShader: `uniform vec3 uSun, uHaze, uCam; uniform float uHazeD; varying vec3 vN, vW; varying float vSh, vTop; void main(){ vec3 n = normalize(vN); float ndl = clamp(dot(n, uSun), 0.0, 1.0); vec3 col = vec3(0.90, 0.85, 0.76) * vSh * (0.52 + 0.7 * ndl); col *= 0.82 + 0.18 * smoothstep(0.0, 1.0, vTop);
      ${HZ_FRAG}
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }` });
  const m = new THREE.Mesh(ig, mat); m.frustumCulled = false; scene.add(m);
}

/* ---------- roads: real freeway routes (OSM), drawn outward from downtown in their decade ---------- */
const FWY = { 'I 5': [1953, 1971], 'US 101': [1940, 1968], 'CA 110': [1940, 1970], 'I 110': [1952, 1970], 'I 10': [1951, 1966], 'I 405': [1957, 1969], 'I 710': [1952, 1965], 'CA 60': [1955, 1971], 'I 105': [1987, 1993], 'I 210': [1958, 1974], 'I 605': [1964, 1971], 'CA 91': [1957, 1968], 'CA 134': [1961, 1971], 'CA 170': [1960, 1968], 'CA 2': [1957, 1971], 'CA 118': [1968, 1976], 'CA 57': [1958, 1975], 'CA 22': [1960, 1969], 'CA 14': [1960, 1970], 'CA 55': [1960, 1972], 'CA 1': [1930, 1950], 'I 15': [1958, 1972], 'I 215': [1960, 1976], 'CA 71': [1960, 1976], 'CA 73': [1993, 1996], 'CA 47': [1960, 1970], 'CA 126': [1950, 1965], 'CA 138': [1950, 1960], 'CA 39': [1950, 1960], 'CA 19': [1950, 1960], 'CA 103': [1960, 1970], 'CA 90': [1960, 1975] };
{
  const dt = kmOf(-118.2437, 34.0522), pos = [], idx = [], aY = [], aD = [], aP = [], aK = [];
  const refRank = {}; for (const w of roads.mw) { const key = (w.ref || '').split(';')[0].trim(); let m = 0; for (let i = 0; i < w.p.length; i += 2) m = Math.max(m, Math.hypot(w.p[i] - dt[0], w.p[i + 1] - dt[1])); refRank[key] = Math.max(refRank[key] || 1, m); }
  const addWay = (w, kind, hw, yStart, dur) => {
    const p = w.p, n = p.length / 2; if (n < 2) return; let tot = 0; const seg = []; for (let i = 1; i < n; i++) { const d = Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]); seg.push(d); tot += d; } if (tot < 0.2) return; let acc = 0; const base = pos.length / 3;
    for (let i = 0; i < n; i++) { const x = p[i * 2], z = p[i * 2 + 1]; let dx, dz; if (i === 0) { dx = p[2] - p[0]; dz = p[3] - p[1]; } else if (i === n - 1) { dx = p[i * 2] - p[i * 2 - 2]; dz = p[i * 2 + 1] - p[i * 2 - 1]; } else { dx = p[i * 2 + 2] - p[i * 2 - 2]; dz = p[i * 2 + 3] - p[i * 2 - 1]; } const L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, hw2 = kind === 0 ? 0.11 : kind === 1 ? 0.07 : kind === 3 ? 0.05 : 0.045, y = heightKm(x, z) + (kind === 0 ? 0.03 : 0.02);
      pos.push(x + nx * hw2, y, z + nz * hw2, x - nx * hw2, y, z - nz * hw2); const pr = acc / tot; aY.push(yStart, yStart); aD.push(dur, dur); aP.push(pr, pr); aK.push(kind, kind); if (i < n - 1) acc += seg[i]; }
    for (let i = 0; i < n - 1; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  };
  for (const w of roads.mw) { const key = (w.ref || '').split(';')[0].trim(); const cfg = FWY[key]; let mid = [0, 0]; for (let i = 0; i < w.p.length; i += 2) { mid[0] += w.p[i]; mid[1] += w.p[i + 1]; } mid[0] /= w.p.length / 2; mid[1] /= w.p.length / 2; const u = clamp(Math.hypot(mid[0] - dt[0], mid[1] - dt[1]) / (refRank[key] || 40)); let ys, dur;
    if (key === 'CA 110' && mid[1] < dt[1] - 2) { ys = 1940 + 11 * u; dur = 3; } else if (key === 'CA 110') { ys = 1952 + 18 * u; dur = 4; } else if (cfg) { ys = cfg[0] + (cfg[1] - cfg[0]) * Math.pow(u, 0.9); dur = 2.5 + (cfg[1] - cfg[0]) * 0.1; } else { ys = 1960 + 16 * u; dur = 3; }
    addWay(w, w.hw === 'motorway' ? 0 : 1, w.hw, ys, dur); }
  const [ci, cj] = [0, 0]; void ci; void cj;
  for (const w of roads.wr || []) addWay(w, 3, 'river', 1700, 1);
  for (const w of roads.rl || []) { const mx = (w.p[0] + w.p[w.p.length - 2]) / 2, mz = (w.p[1] + w.p[w.p.length - 1]) / 2, [i, j] = cellAt(mx, mz), y = yrs[j * W + i] || 1950; addWay(w, 2, 'rail', Math.max(1876, y - 10), 5); }
  if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aY', new THREE.Float32BufferAttribute(aY, 1)); g.setAttribute('aD', new THREE.Float32BufferAttribute(aD, 1)); g.setAttribute('aP', new THREE.Float32BufferAttribute(aP, 1)); g.setAttribute('aK', new THREE.Float32BufferAttribute(aK, 1)); g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: 'attribute float aY, aD, aP, aK; varying float vF, vK; varying vec3 vW; uniform float uYear; void main(){ vF = uYear - (aY + aP * aD); vK = aK; vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uHaze, uCam; uniform float uHazeD; varying float vF, vK; varying vec3 vW; void main(){ if (vF < 0.0) discard; vec3 col = vK < 0.5 ? vec3(0.17, 0.14, 0.11) : vK < 1.5 ? vec3(0.28, 0.24, 0.19) : vK < 2.5 ? vec3(0.42, 0.37, 0.30) : vec3(0.50, 0.58, 0.58); float tip = exp(-vF * 2.2); col = mix(col, vec3(1.0, 0.82, 0.45), tip * 0.85);
        ${HZ_FRAG}
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }` });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m); }
}

/* ---------- airport runways, oil derricks, light pillars for milestones ---------- */
const lonlat = (lo, la) => { const [x, z] = kmOf(lo, la); return new THREE.Vector3(x, heightKm(x, z), z); };
const runway = (lo, la, lenKm, ang, off) => { const p = lonlat(lo, la), m = new THREE.Mesh(new THREE.PlaneGeometry(lenKm, 0.07), new THREE.MeshBasicMaterial({ color: 0x2a2520 })); m.rotation.x = -Math.PI / 2; m.rotation.z = ang; m.position.set(p.x + off[0], p.y + 0.04, p.z + off[1]); m.visible = false; scene.add(m); return m; };
const lax = [runway(-118.4081, 33.9505, 3.6, 0.0, [0, -0.0]), runway(-118.4081, 33.9505, 3.6, 0.0, [0, 0.35]), runway(-118.4081, 33.9330, 3.4, 0.0, [0, 0]), runway(-118.4081, 33.9330, 3.4, 0.0, [0, 0.35])];
const derricks = (() => { const grp = new THREE.Group(), r = rng(9), cl = [[-118.1675, 33.8044, 1921, 60], [-118.0, 33.66, 1920, 36], [-118.4655, 33.987, 1930, 16], [-118.2610, 34.0716, 1892, 12], [-118.0, 33.93, 1930, 22]]; const geo = new THREE.ConeGeometry(0.03, 0.16, 5); const mat = new THREE.MeshBasicMaterial({ color: 0x4a3a28 }); const items = []; for (const [lo, la, yy, n] of cl) { const c = lonlat(lo, la); for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat); const a = r() * 6.283, d = Math.sqrt(r()) * (n > 30 ? 1.1 : 0.55); m.position.set(c.x + Math.cos(a) * d, heightKm(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d) + 0.08, c.z + Math.sin(a) * d); m.visible = false; grp.add(m); items.push({ m, y: yy + r() * 6 }); } } scene.add(grp); return items; })();
const pillarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6); pillarGeo.translate(0, 0.5, 0);
const ringGeo = new THREE.RingGeometry(0.4, 0.5, 40); ringGeo.rotateX(-Math.PI / 2);

/* ---------- milestones ---------- */
const MIL = [
  { y: 1781, head: 'A village on a river', t: 'El Pueblo de Los Ángeles', s: 'Founded Sept 4, 1781 by 44 settlers', ll: [-118.2379, 34.0572] },
  { y: 1850, head: 'A city, and a state', t: 'Incorporated April 4, 1850', s: 'California joins the Union Sept 9', ll: [-118.2437, 34.0522] },
  { y: 1892, head: 'Oil under the city', t: 'Doheny strikes oil near Echo Park', s: 'An oil boom follows', ll: [-118.2610, 34.0716] },
  { y: 1910, head: 'Hollywood joins the city', t: 'Hollywood', s: 'Annexed in February 1910', ll: [-118.3387, 34.1016] },
  { y: 1913, head: 'Water from the Sierra', t: 'Los Angeles Aqueduct', s: 'Opens in 1913. The Valley joins in 1915', ll: [-118.4934, 34.3097] },
  { y: 1923, head: 'Hollywoodland', t: 'The Hollywood sign', s: 'Built in 1923', ll: [-118.3216, 34.1341] },
  { y: 1928, head: 'The airport opens', t: 'Mines Field', s: 'Renamed LAX in 1949', ll: [-118.4081, 33.9425] },
  { y: 1932, head: 'The Olympics', t: 'Memorial Coliseum', s: 'Hosts the 1932 Summer Games', ll: [-118.2879, 34.0141] },
  { y: 1940, head: 'The first freeway', t: 'Arroyo Seco Parkway', s: 'Opens Dec 30, 1940', ll: [-118.1950, 34.1100] },
  { y: 1955, head: 'The magic kingdom', t: 'Disneyland', s: 'Opens in Anaheim, July 17, 1955', ll: [-117.9190, 33.8121] },
  { y: 1962, head: 'Dodger Stadium', t: 'Dodger Stadium', s: 'Opens in April 1962', ll: [-118.2400, 34.0739] },
  { y: 1984, head: 'The Olympics return', t: 'Memorial Coliseum', s: 'Hosts the 1984 Summer Games', ll: [-118.2879, 34.0141] },
  { y: 1990, head: 'Metro Rail', t: 'Blue Line', s: 'Opens in July 1990', ll: [-118.2240, 33.9000] },
  { y: 2017, head: 'Reaching for the sky', t: 'Wilshire Grand Center', s: '1,100 ft, tallest west of the Mississippi', ll: [-118.2570, 34.0507] },
  { y: 2020, head: 'SoFi Stadium', t: 'SoFi Stadium', s: 'Opens in Inglewood, 2020', ll: [-118.3392, 33.9535] },
];
MIL.forEach((m, i) => { m.p = lonlat(...m.ll); m.T0 = (i === 0 ? 0.6 : timeOfYear(m.y) - 0.15); m.T1 = timeOfYear(m.y) + (i === 0 ? HOLD0 : HOLD) - 0.05; });
const pillars = MIL.map((m) => { const g = new THREE.Group(), p = new THREE.Mesh(pillarGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.0, depthWrite: false })), r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })); g.add(p, r); g.position.copy(m.p); scene.add(g); return { g, p, r }; });

/* ---------- camera ---------- */
const CAMK = [ // year, target [lon,lat], distance km, azimuth deg (0 = camera south of the target), pitch deg
  [1781, [-118.2379, 34.0572], 2.6, -40, 46], [1850, [-118.2379, 34.0572], 4.2, -40, 46], [1880, [-118.2437, 34.0522], 12, -40, 46], [1900, [-118.25, 34.06], 24, -40, 46],
  [1930, [-118.30, 34.03], 62, -40, 45], [1960, [-118.22, 34.02], 105, -40, 45], [1990, [-118.15, 34.03], 135, -40, 45], [2026, [-118.12, 34.05], 150, -40, 45],
];
function camAt(year, T) {
  const f = (i) => { for (let k = 1; k < CAMK.length; k++) if (year <= CAMK[k][0]) { const a = CAMK[k - 1], b = CAMK[k], u = smooth((year - a[0]) / (b[0] - a[0])); return [lerp(a[1][0], b[1][0], u), lerp(a[1][1], b[1][1], u), lerp(Math.log(a[2]), Math.log(b[2]), u), lerp(a[3], b[3], u), lerp(a[4], b[4], u)][i]; } const l = CAMK[CAMK.length - 1]; return [l[1][0], l[1][1], Math.log(l[2]), l[3], l[4]][i]; };
  const hold = smooth((T - (timeOfYear(2020) + HOLD + 1.0)) / 4.5), [tx, tz] = kmOf(f(0), f(1)), D = Math.exp(f(2)) * (1 - 0.1 * hold), az = (f(3) + 5 * Math.sin(T * 0.12) + 30 * hold) * Math.PI / 180, pt = f(4) * Math.PI / 180, ty = heightKm(tx, tz) * 0.5;
  camera.position.set(tx + Math.sin(az) * Math.cos(pt) * D, ty + Math.sin(pt) * D, tz + Math.cos(az) * Math.cos(pt) * D); camera.lookAt(tx, ty, tz);
  if (P.get('cam') === 'top') { camera.position.set(x0 + W * cell / 2, 190, -(y0 + H * cell / 2) + 0.01); camera.lookAt(x0 + W * cell / 2, 0, -(y0 + H * cell / 2)); }
  camera.near = Math.max(0.03, D * 0.01); camera.far = D * 6 + 400; camera.updateProjectionMatrix();
}

/* ---------- update ---------- */
function update(T) {
  const year = yearAt(T); U.uYear.value = year; camAt(year, T); U.uCam.value.copy(camera.position); U.uHazeD.value = clamp(0.0006 + 0.0000 * year + 0.0018 * smooth((year - 1880) / 100), 0.0006, 0.0026) * (T < 3 ? 1.2 : 1);
  lax.forEach((m, i) => { m.visible = year >= 1928; m.scale.x = clamp((year - 1928) / (i < 2 ? 3 : 18)) * 1 + 0.001; });
  derricks.forEach((d) => { d.m.visible = year >= d.y && year < d.y + 70 || year >= d.y && d.y > 1900; d.m.scale.y = clamp((year - d.y) / 2) + 0.01; });
  MIL.forEach((m, i) => { const on = T >= m.T0 && T < m.T1, a = on ? sm(m.T0, m.T0 + 0.4, T) * (1 - sm(m.T1 - 0.5, m.T1, T)) : 0, p = pillars[i], D = camera.position.distanceTo(m.p); p.p.visible = p.r.visible = a > 0.01; p.p.material.opacity = 0.75 * a; p.r.material.opacity = 0.85 * a; const sc = D * 0.015; p.p.scale.set(Math.max(0.6, sc * 0.7), D * 0.14, Math.max(0.6, sc * 0.7)); p.r.scale.setScalar(Math.max(0.25, sc * (1 + 0.35 * Math.sin(T * 5)))); });
}

/* ---------- 2D graphics: callouts, population graph, timeline ---------- */
const gfx = document.getElementById('gfx'); gfx.width = 540 * Math.min(DPR, 2); gfx.height = 960 * Math.min(DPR, 2); const gc = gfx.getContext('2d');
const SANS = '"Helvetica Neue", Arial, "Liberation Sans", sans-serif', SERIF = '"Cormorant Garamond", "Liberation Serif", serif', INK = '58,44,28';
const POP = [[1781, 44], [1850, 1610], [1860, 4385], [1870, 5728], [1880, 11183], [1890, 50395], [1900, 102479], [1910, 319198], [1920, 576673], [1930, 1238048], [1940, 1504277], [1950, 1970358], [1960, 2479015], [1970, 2816061], [1980, 2966850], [1990, 3485398], [2000, 3694820], [2010, 3792621], [2020, 3898747], [2026, 3898747]];
const popAt = (y) => { for (let i = 1; i < POP.length; i++) if (y <= POP[i][0]) { const [a, pa] = POP[i - 1], [b, pb] = POP[i], u = (y - a) / (b - a); return pa * Math.pow(pb / pa, u); } return 3898747; };
const commaN = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const v3 = new THREE.Vector3();
function drawCallouts(T, k) {
  for (const m of MIL) { if (!(T >= m.T0 && T < m.T1)) continue; const a = sm(m.T0, m.T0 + 0.5, T) * (1 - sm(m.T1 - 0.5, m.T1, T)); v3.copy(m.p); v3.y += 0.5; v3.project(camera); if (v3.z > 1) continue; const sx = (v3.x * 0.5 + 0.5) * gfx.width, sy = (-v3.y * 0.5 + 0.5) * gfx.height;
    const left = sx > gfx.width * 0.52, ox = (left ? -1 : 1) * 36 * k, oy = -40 * k; const tx = clamp(sx + ox, 24 * k, gfx.width - 24 * k), ty = clamp(sy + oy, 330 * k, 900 * k);
    gc.save(); gc.globalAlpha = a; gc.strokeStyle = `rgba(${INK},.75)`; gc.lineWidth = 1.4 * k; gc.beginPath(); gc.moveTo(sx, sy); gc.lineTo(tx, ty); gc.stroke(); gc.fillStyle = `rgb(${INK})`; gc.beginPath(); gc.arc(sx, sy, 3.2 * k, 0, 6.283); gc.fill();
    const tw = left ? tx - 6 * k : tx + 6 * k; gc.textAlign = left ? 'right' : 'left'; gc.font = `700 ${20 * k}px ${SERIF}`; const w1 = gc.measureText(m.t).width; gc.font = `600 ${14.5 * k}px ${SERIF}`; const w2 = gc.measureText(m.s).width, bw = Math.max(w1, w2) + 16 * k, bx = left ? tx - bw : tx - 2 * k;
    gc.shadowBlur = 0; gc.fillStyle = 'rgba(247,239,221,.86)'; gc.beginPath(); gc.roundRect ? gc.roundRect(bx, ty - 21 * k, bw, 46 * k, 8 * k) : gc.rect(bx, ty - 21 * k, bw, 46 * k); gc.fill();
    gc.fillStyle = `rgba(${INK},.98)`; gc.font = `700 ${20 * k}px ${SERIF}`; gc.fillText(m.t, tw, ty - 3 * k); gc.font = `600 ${14.5 * k}px ${SERIF}`; gc.fillStyle = `rgba(${INK},.9)`; gc.fillText(m.s, tw, ty + 17 * k); gc.restore(); }
}
function drawGraph(T, k) {
  const a = sm(2.8, 3.6, T) * (1 - sm(T_SCENE - 0.6, T_SCENE, T)); if (a <= 0.01) return; const year = yearAt(T), gx0 = 40 * k, gx1 = 500 * k, gy0 = 925 * k, gy1 = 880 * k; gc.save(); gc.globalAlpha = a;
  // timeline bar with the milestone ticks
  gc.strokeStyle = 'rgba(255,255,255,.35)'; gc.lineWidth = 2.5 * k; gc.lineCap = 'round'; gc.beginPath(); gc.moveTo(gx0, gy0); gc.lineTo(gx1, gy0); gc.stroke(); const px = (y) => lerp(gx0, gx1, (y - 1781) / (2026 - 1781)); gc.strokeStyle = '#fff'; gc.beginPath(); gc.moveTo(gx0, gy0); gc.lineTo(px(year), gy0); gc.stroke(); gc.fillStyle = '#fff'; gc.beginPath(); gc.arc(px(year), gy0, 5 * k, 0, 6.283); gc.fill();
  for (const y of [1781, 1850, 1900, 1950, 2000, 2026]) { gc.fillStyle = 'rgba(255,255,255,.8)'; gc.font = `600 ${9 * k}px ${SANS}`; gc.textAlign = 'center'; if ('letterSpacing' in gc) gc.letterSpacing = 1.2 * k + 'px'; gc.fillText(String(y), px(y), gy0 + 16 * k); }
  // population curve (log scale) so the early years are visible too
  const pw = 460 * k, ph = 62 * k, gx = gx0, gy = 878 * k; gc.beginPath(); const lp = (p) => Math.log10(p); const lo = lp(40), hi = lp(4.2e6); for (let y = 1781; y <= year; y += 1) { const x = gx + ((y - 1781) / 245) * pw, yy = gy - ((lp(popAt(y)) - lo) / (hi - lo)) * ph; if (y === 1781) gc.moveTo(x, yy); else gc.lineTo(x, yy); } gc.strokeStyle = 'rgba(255,247,230,.95)'; gc.lineWidth = 2.4 * k; gc.stroke(); gc.restore();
}
function updateOverlay(T) {
  const year = Math.min(2026, Math.floor(yearAt(T) + 0.0001)); const el = document.getElementById('year'); el.textContent = String(year); el.style.opacity = sm(0.2, 0.9, T) * (1 - sm(T_SCENE - 0.5, T_SCENE, T));
  const ban = document.getElementById('banner'); ban.style.opacity = 1 - sm(T_SCENE - 0.3, T_SCENE + 0.2, T);
  const head = document.getElementById('head'), m = MIL.find((q) => T >= q.T0 && T < q.T1); if (m) { head.textContent = m.head; head.style.opacity = sm(m.T0, m.T0 + 0.4, T) * (1 - sm(m.T1 - 0.5, m.T1, T)); } else head.style.opacity = 0;
  const hud = document.getElementById('hud'), pop = popAt(yearAt(T)); hud.querySelector('.label').textContent = 'Population · city of Los Angeles'; hud.querySelector('.value').textContent = (year < 1850 ? '' : '~') + commaN(year < 1790 ? 44 : pop); hud.querySelector('.sub').textContent = year < 1850 ? 'The 44 settlers of 1781' : 'Census counts, smoothed between decades'; hud.style.opacity = sm(1.0, 1.6, T) * (1 - sm(T_SCENE - 0.6, T_SCENE, T));
  document.getElementById('tag').style.opacity = T > 1.0 && T < 54.2 ? 0.7 * sm(1.0, 1.8, T) * (1 - sm(53.6, 54.2, T)) : 0;
  const fo = sm(T_SCENE - 0.2, T_SCENE + 0.6, T) * (1 - sm(59.0, 59.6, T)); const facts = document.getElementById('facts'); facts.style.opacity = fo; [...facts.children].forEach((e, i) => { e.style.opacity = sm(T_SCENE + 0.3 + i * 0.75, T_SCENE + 0.9 + i * 0.75, T); });
  const end = document.getElementById('end'); end.style.opacity = T >= 59 ? sm(59.0, 59.7, T) : 0; end.querySelector('.a').style.opacity = sm(59.6, 60.2, T); end.querySelector('.b').style.opacity = sm(60.4, 61.0, T); end.querySelector('.c').style.opacity = sm(61.2, 61.8, T) * 0.9;
  document.getElementById('stage').style.background = T >= T_SCENE ? '#07070a' : '#000';
  const k = gfx.width / 540; gc.clearRect(0, 0, gfx.width, gfx.height); drawCallouts(T, k); drawGraph(T, k);
}
const FACTS = [
  ['City population', '3.9 million', 'From 1,610 in 1850 and 102,479 in 1900. 2020 Census, city of Los Angeles'],
  ['First freeway in the West', 'Arroyo Seco Parkway', 'Opened Dec 30, 1940 between downtown and Pasadena. The freeway network grew out from there'],
  ['Next up', 'The 2028 Olympics', 'Los Angeles hosts the Summer Games for the third time (1932, 1984, 2028)'],
];
document.getElementById('facts').innerHTML = FACTS.map((f) => `<div class="fr"><div class="fl">${f[0]}</div><div class="fv">${f[1]}</div><div class="fs">${f[2]}</div></div>`).join('');
{ const g = document.getElementById('grain'), c = g.getContext('2d'), id = c.createImageData(256, 256), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } c.putImageData(id, 0, 0); }
function renderAt(T, sub = 1) {
  T = clamp(T, 0, T_END); const skip3D = T > T_SCENE + 0.5;
  if (!skip3D) { update(T); composer.render(); actx.globalAlpha = 1; actx.drawImage(glCanvas, 0, 0); }
  else { actx.fillStyle = '#07070a'; actx.fillRect(0, 0, accCanvas.width, accCanvas.height); }
  updateOverlay(T);
}
window.renderAt = renderAt; window.T_END = T_END; window.dbg = { scene, camera, renderer, MIL, bldgs };
await Promise.all([document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('700 30px "Cormorant Garamond"')]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
