// Builds states.json (projected state shapes), terrain.bin (elevation under the same projection) and wages.json (effective + inflation-indexed minimum wage per state per year).
import fs from 'node:fs'; import zlib from 'node:zlib';
const NM = '/tmp/claude-0/-home-user-flipai/89a2c518-56f7-5116-8a46-021f8414392e/scratchpad/npm/node_modules/';
const { geoAlbersUsa } = await import(NM + 'd3-geo/src/index.js');
const { feature } = await import(NM + 'topojson-client/src/index.js');
const topo = JSON.parse(fs.readFileSync(NM + 'us-atlas/states-albers-10m.json', 'utf8'));
const fc = feature(topo, topo.objects.states);
const ABBR = { Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY' };
const area = (r) => { let a = 0; for (let i = 0, n = r.length; i < n; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return a / 2; };
function simp(r) { const o = [r[0]]; for (let i = 1; i < r.length; i++) { const p = o[o.length - 1]; if (Math.hypot(r[i][0] - p[0], r[i][1] - p[1]) >= 0.9) o.push(r[i]); } if (o.length > 3 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1]) < 0.01) o.pop(); return o; }
const states = [];
for (const f of fc.features) {
  const name = f.properties.name, ab = ABBR[name]; if (!ab) { console.log('skip', name); continue; }
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; const out = [];
  for (const poly of polys) { const rings = poly.map(simp).filter((r) => r.length >= 3 && Math.abs(area(r)) > 0.25); if (rings.length) out.push(rings.map((r) => r.map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]))); }
  if (out.length) states.push({ ab, name, polys: out });
}
fs.writeFileSync('states.json', JSON.stringify(states)); console.log('states', states.length, 'pts', states.reduce((s, q) => s + q.polys.reduce((a, p) => a + p.reduce((b, r) => b + r.length, 0), 0), 0));

/* terrain under the same albersUsa projection */
function decodePNG(buf) {
  let p = 8, W = 0, H = 0, ct = 0, bd = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); bd = d[8]; ct = d[9]; } else if (type === 'IDAT') idat.push(d); p += 12 + len; }
  const ch = ct === 2 ? 3 : ct === 6 ? 4 : 0; const raw = zlib.inflateSync(Buffer.concat(idat)), stride = W * ch, out = Buffer.alloc(H * stride); let q = 0;
  for (let y = 0; y < H; y++) { const f = raw[q++]; for (let x = 0; x < stride; x++) { const a = x >= ch ? out[y * stride + x - ch] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0; let v = raw[q++]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } out[y * stride + x] = v & 255; } }
  return { W, H, ch, data: out };
}
const Z = 5, X0 = 0, X1 = 10, Y0 = 5, Y1 = 14, TW = (X1 - X0 + 1) * 256, TH = (Y1 - Y0 + 1) * 256, E = new Float32Array(TW * TH);
for (let tx = X0; tx <= X1; tx++) for (let ty = Y0; ty <= Y1; ty++) { const im = decodePNG(fs.readFileSync(`tiles/5_${tx}_${ty}.png`)); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * im.ch; E[((ty - Y0) * 256 + y) * TW + (tx - X0) * 256 + x] = im.data[o] * 256 + im.data[o + 1] + im.data[o + 2] / 256 - 32768; } }
const N = 256 * 2 ** Z, mx = (lon) => ((lon + 180) / 360) * N - X0 * 256, my = (lat) => ((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2) * N - Y0 * 256;
const elevAt = (lon, lat) => { const x = mx(lon), y = my(lat), x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; if (x0 < 0 || y0 < 0 || x0 + 1 >= TW || y0 + 1 >= TH) return -50; const g = (i, j) => E[j * TW + i]; return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy; };
const proj = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const GW = 975, GH = 610, G = new Float32Array(GW * GH); let nul = 0;
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const ll = proj.invert([i + 0.5, j + 0.5]); if (!ll) { G[j * GW + i] = -60; nul++; continue; } G[j * GW + i] = elevAt(ll[0], ll[1]); }
fs.writeFileSync('terrain.bin', Buffer.from(G.buffer)); console.log('terrain ok, null cells', nul, 'max', Math.max(...G.subarray(0, 100000)));

/* wages */
const csv = (f) => { try { return fs.readFileSync(f, 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')).filter((r) => /^\d{4}/.test(r[0]) && r[1] && r[1] !== '.').map((r) => [+r[0].slice(0, 4), +r[1]]); } catch { return []; } };
const cpi = Object.fromEntries(csv('cpi.csv')), HIST = [[1968, 1, 1, 1.60], [1974, 5, 1, 2.00], [1975, 1, 1, 2.10], [1976, 1, 1, 2.30], [1978, 1, 1, 2.65], [1979, 1, 1, 2.90], [1980, 1, 1, 3.10], [1981, 1, 1, 3.35], [1990, 4, 1, 3.80], [1991, 4, 1, 4.25], [1996, 10, 1, 4.75], [1997, 9, 1, 5.15], [2007, 7, 24, 5.85], [2008, 7, 24, 6.55], [2009, 7, 24, 7.25]];
const YEARS = []; for (let y = 1968; y <= 2025; y++) YEARS.push(y);
const fedJan = YEARS.map((y) => { let w = 1.6; for (const [hy, hm, hd, v] of HIST) if (hy < y || (hy === y && hm === 1 && hd === 1)) w = v; return w; });
const ratio = YEARS.map((y) => cpi[y] / cpi[1968]);
const wages = { years: YEARS, fed: fedJan, ratio, states: {} };
for (const s of states) {
  const rows = Object.fromEntries(csv(`f_${s.ab}.csv`)); const last = Math.max(...Object.keys(rows).map(Number), 0); let carry = null;
  const st = YEARS.map((y) => { if (rows[y] != null) { carry = rows[y]; return rows[y]; } return null; });
  const raw = YEARS.map((y, i) => st[i] != null ? st[i] : (y > last && carry != null ? carry : null));
  const eff = YEARS.map((y, i) => Math.max(fedJan[i], raw[i] ?? 0));
  wages.states[s.ab] = { name: s.name, raw, eff, base: eff[0], idx: ratio.map((r) => eff[0] * r) };
}
fs.writeFileSync('wages.json', JSON.stringify(wages));
const L = wages.states; const last = YEARS.length - 1;
const above = Object.entries(L).filter(([k, v]) => v.eff[last] > fedJan[last] + 1e-9).map(([k]) => k), atFed = Object.entries(L).filter(([k, v]) => v.eff[last] <= fedJan[last] + 1e-9).map(([k]) => k);
console.log('2025 above fed', above.length, 'at fed', atFed.length, atFed.join(','));
const meets = Object.entries(L).filter(([k, v]) => v.eff[last] >= v.idx[last]).map(([k]) => k);
console.log('2025 effective >= own indexed', meets.length, meets.join(','));
console.log('top 2025', Object.entries(L).sort((a, b) => b[1].eff[last] - a[1].eff[last]).slice(0, 8).map(([k, v]) => k + ' ' + v.eff[last].toFixed(2) + ' idx ' + v.idx[last].toFixed(2)).join('; '));
console.log('bases != 1.60', Object.entries(L).filter(([k, v]) => v.base > 1.6).map(([k, v]) => k + ' ' + v.base).join(', '));
console.log('state>fed 1968', Object.entries(L).filter(([k, v]) => v.raw[0] > 1.6).length, ' state>fed 2010', Object.entries(L).filter(([k, v]) => v.eff[42] > fedJan[42]).length);
