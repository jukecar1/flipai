// Builds the terrain grid and the (stylized) built-year grid for the Los Angeles timelapse.
import fs from 'node:fs'; import zlib from 'node:zlib';
const idx = JSON.parse(fs.readFileSync('tiles/index.json', 'utf8'));
function decodePNG(buf) {
  let p = 8, W = 0, H = 0, ct = 0, bd = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); bd = d[8]; ct = d[9]; } else if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const ch = ct === 2 ? 3 : ct === 6 ? 4 : ct === 0 ? 1 : 0; if (!ch || bd !== 8) throw new Error('png type ' + ct + ' bd ' + bd);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = W * ch, out = Buffer.alloc(H * stride); let q = 0;
  for (let y = 0; y < H; y++) { const f = raw[q++]; for (let x = 0; x < stride; x++) { const a = x >= ch ? out[y * stride + x - ch] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0; let v = raw[q++]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } out[y * stride + x] = v & 255; } }
  return { W, H, ch, data: out };
}
const TW = (idx.x1 - idx.x0 + 1) * 256, TH = (idx.y1 - idx.y0 + 1) * 256, E = new Float32Array(TW * TH);
for (let tx = idx.x0; tx <= idx.x1; tx++) for (let ty = idx.y0; ty <= idx.y1; ty++) { const im = decodePNG(fs.readFileSync(`tiles/${idx.z}_${tx}_${ty}.png`)); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * im.ch; E[((ty - idx.y0) * 256 + y) * TW + (tx - idx.x0) * 256 + x] = im.data[o] * 256 + im.data[o + 1] + im.data[o + 2] / 256 - 32768; } }
const N = Math.pow(2, idx.z) * 256;
const mx = (lon) => ((lon + 180) / 360) * N - idx.x0 * 256, my = (lat) => ((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2) * N - idx.y0 * 256;
function elevAt(lon, lat) { const x = mx(lon), y = my(lat), x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; if (x0 < 0 || y0 < 0 || x0 + 1 >= TW || y0 + 1 >= TH) return -50; const g = (i, j) => E[j * TW + i]; return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy; }
const LON0 = -118.2428, LAT0 = 34.0537, KX = 111.32 * Math.cos(LAT0 * Math.PI / 180), KY = 111.0, CELL = 0.25;
const BB = { w: -119.0, e: -117.4, s: 33.55, n: 34.45 };
const x0km = (BB.w - LON0) * KX, x1km = (BB.e - LON0) * KX, y0km = (BB.s - LAT0) * KY, y1km = (BB.n - LAT0) * KY;
const W = Math.ceil((x1km - x0km) / CELL), H = Math.ceil((y1km - y0km) / CELL);
const lonOf = (i) => LON0 + (x0km + (i + 0.5) * CELL) / KX, latOf = (j) => LAT0 + (y0km + (j + 0.5) * CELL) / KY;
const elev = new Float32Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) elev[j * W + i] = elevAt(lonOf(i), latOf(j));
// slope (rise over run)
const slope = new Float32Array(W * H); for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { const dx = (elev[j * W + i + 1] - elev[j * W + i - 1]) / (2 * CELL * 1000), dz = (elev[(j + 1) * W + i] - elev[(j - 1) * W + i]) / (2 * CELL * 1000); slope[j * W + i] = Math.hypot(dx, dz); }
// urban footprint (Natural Earth LandScan urban areas, around 2010s) rasterised
const polys = JSON.parse(fs.readFileSync('la_urban.json', 'utf8')); const foot = new Uint8Array(W * H);
for (const poly of polys) { const ring = poly[0]; let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const [x, y] of ring) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
  for (let j = 0; j < H; j++) { const lat = latOf(j); if (lat < mny || lat > mxy) continue; for (let i = 0; i < W; i++) { const lon = lonOf(i); if (lon < mnx || lon > mxx) continue; let inside = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xa, ya] = ring[a], [xb, yb] = ring[b]; if ((ya > lat) !== (yb > lat) && lon < ((xb - xa) * (lat - ya)) / (yb - ya) + xa) inside = !inside; } if (inside) foot[j * W + i] = 1; } } }
// developable land
const dev = new Uint8Array(W * H); let nd = 0; for (let k = 0; k < W * H; k++) { if (elev[k] > 1.0 && elev[k] < 650 && slope[k] < 0.11) { dev[k] = 1; nd++; } }
console.log('grid', W, H, 'developable cells', nd, '=', (nd * CELL * CELL).toFixed(0), 'km2');
// growth fronts: time-dependent Dijkstra from founding seeds (stylized)
const SEEDS = [[-118.2379, 34.0572, 1781], [-118.1445, 34.1478, 1874], [-118.4912, 34.0195, 1875], [-118.1937, 33.7701, 1882], [-118.2900, 33.7361, 1884], [-118.3287, 34.0983, 1887], [-118.2551, 34.1425, 1887], [-118.3090, 34.1808, 1887], [-118.3406, 33.9617, 1888], [-117.7500, 34.0551, 1875], [-117.9145, 33.8353, 1857], [-117.8678, 33.7455, 1869], [-118.4382, 34.2594, 1874], [-118.4287, 34.1900, 1911], [-118.3406, 33.8358, 1912], [-118.0231, 33.9617, 1887], [-118.8390, 34.1706, 1964], [-118.7815, 34.2694, 1960], [-117.8, 33.68, 1962], [-118.5426, 34.3917, 1876], [-117.9 , 33.60, 1965], [-118.4, 33.92, 1920]];
const vOf = (t) => { const K = [[1781, 0.35], [1850, 0.5], [1880, 0.8], [1900, 0.9], [1910, 1.1], [1920, 1.5], [1930, 1.6], [1940, 1.2], [1950, 1.4], [1960, 1.7], [1970, 1.5], [1980, 1.1], [1990, 0.8], [2005, 0.5], [2030, 0.4]]; for (let i = 1; i < K.length; i++) if (t < K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return 0.4; };
const T = new Float64Array(W * H).fill(1e9); const heap = []; const push = (k, t) => { heap.push([t, k]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
for (const [lon, lat, yr] of SEEDS) { const i = Math.round(((lon - LON0) * KX - x0km) / CELL - 0.5), j = Math.round(((lat - LAT0) * KY - y0km) / CELL - 0.5); if (i < 0 || j < 0 || i >= W || j >= H) continue; const k = j * W + i; if (yr < T[k]) { T[k] = yr; push(k, yr); } }
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
while (heap.length) { const [t, k] = pop(); if (t > T[k]) continue; const i = k % W, j = (k / W) | 0; for (const [di, dj, d] of NB) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const nk = nj * W + ni; if (elev[nk] <= 0.3) continue; const sl = slope[nk], cost = 1 + 5 * Math.max(0, sl - 0.04) + (foot[nk] ? 0 : 1.2), nt = t + (d * CELL * cost) / vOf(t); if (nt < T[nk]) { T[nk] = nt; push(nk, nt); } } }
const rnd = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
// keep the spatial order of the fronts, but force the growth curve of built-up area to a plausible shape (stylized)
const AREA = [[1781, 0], [1850, 3], [1880, 12], [1900, 60], [1910, 140], [1920, 380], [1930, 900], [1940, 1150], [1950, 1650], [1960, 2300], [1970, 2700], [1980, 2950], [1990, 3100], [2000, 3190], [2024, 3243]];
const order = []; for (let k = 0; k < W * H; k++) if (dev[k] && T[k] < 1e8) order.push(k); order.sort((a, b) => T[a] - T[b]);
const yearOfArea = (A) => { for (let i = 1; i < AREA.length; i++) if (A <= AREA[i][1]) return AREA[i - 1][0] + (AREA[i][0] - AREA[i - 1][0]) * ((A - AREA[i - 1][1]) / (AREA[i][1] - AREA[i - 1][1])); return 2024; };
const total = order.length * CELL * CELL, scaleA = 3243 / total; console.log('raw developable km2', total.toFixed(0));
const year = new Uint16Array(W * H); order.forEach((k, r) => { const i = k % W, j = (k / W) | 0, y0 = yearOfArea((r + 1) * CELL * CELL * scaleA), jit = (rnd(i, j) - 0.5) * (2 + Math.max(0, y0 - 1890) * 0.08); year[k] = Math.max(1781, Math.min(2024, Math.round(y0 + jit))); });
// coverage report
for (const y of [1850, 1900, 1920, 1930, 1950, 1960, 1980, 2000, 2024]) { let c = 0; for (let k = 0; k < W * H; k++) if (year[k] && year[k] <= y) c++; console.log(y, (c * CELL * CELL).toFixed(0), 'km2'); }
fs.writeFileSync('terrain.bin', Buffer.from(elev.buffer)); fs.writeFileSync('year.bin', Buffer.from(year.buffer));
fs.writeFileSync('meta.json', JSON.stringify({ W, H, cell: CELL, lon0: LON0, lat0: LAT0, kx: KX, ky: KY, x0: x0km, y0: y0km }));
// preview image of the built-year map
const pm = Buffer.alloc(W * H * 3); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = (H - 1 - j) * W + i, o = (j * W + i) * 3, y = year[k]; let r = 40, g = 60, b = 80; if (elev[k] > 0.5) { const e = Math.min(1, elev[k] / 1500); r = g = b = 90 + e * 120; } if (y) { const t = (y - 1781) / (2024 - 1781); r = 255 * (1 - t); g = 200 * Math.sin(t * 3.14); b = 255 * t; } pm[o] = r; pm[o + 1] = g; pm[o + 2] = b; }
fs.writeFileSync('preview.ppm', Buffer.concat([Buffer.from(`P6 ${W} ${H} 255\n`), pm]));

for (const [n, i, j] of [['VanNuys', 202, 284], ['Inglewood', 239, 182]]) { const k = j * W + i; console.log(n, 'elev', elev[k].toFixed(1), 'slope', slope[k].toFixed(3), 'dev', dev[k], 'T', T[k].toFixed(1), 'foot', foot[k]); }
let hi = 0, tot = 0; for (let k = 0; k < W * H; k++) { if (elev[k] > 1) { tot++; if (slope[k] >= 0.11) hi++; } } console.log('land cells with slope>=0.11:', hi, 'of', tot);
