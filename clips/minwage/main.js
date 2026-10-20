import { IDX, HIST } from './data.js';
/* "What if the federal minimum wage matched inflation every year?" — 58 s, pure function of T.
   Real data: federal minimum wage effective dates (U.S. DOL) and annual-average CPI-U (BLS). The "indexed" line is arithmetic:
   $1.60 (the 1968 rate, its highest buying power) x CPI(year) / CPI(1968). 540 x 960 canvas units. */
const T_END = 58;
const P = new URLSearchParams(location.search), DPR = +(P.get('dpr') || 1);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, f) => a + (b - a) * f;
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm = (a, b, t) => smooth((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const lin = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t < pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0)); } return pts[pts.length - 1][1]; };

const c = document.getElementById('c'); c.width = 540 * DPR; c.height = 960 * DPR; const g = c.getContext('2d');
const SERIF = '"Cormorant Garamond", "Liberation Serif", serif', SANS = '"Helvetica Neue", Arial, "Liberation Sans", sans-serif';
const CREAM = '#f2ece0', AMBER = '#eab04c', MUTE = 'rgba(200,205,216,', BG0 = '#0b0c10', BG1 = '#151821';
const commaN = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const money = (v) => '$' + v.toFixed(2);

/* ---------- data: actual (steps by effective date) vs indexed (annual CPI, anchored at mid-year) ---------- */
const dateYear = (y, m, d) => y + ((m - 1) * 30.4 + d - 1) / 365;
const STEPS = HIST.map(([y, m, d, v]) => [dateYear(y, m, d), v]);
const actual = (t) => { let w = 1.6; for (const [ty, v] of STEPS) if (t >= ty - 1e-9) w = v; return w; };
const indexed = (t) => { const a = t - 0.5, y0 = Math.floor(a); if (a <= 1968) return IDX[1968]; if (y0 >= 2025) return IDX[2025]; return lerp(IDX[y0], IDX[y0 + 1], a - y0); };

/* ---------- time map: the clock runs between milestones and holds for each ---------- */
const MS = [ // [year, travel seconds, hold seconds]
  [1968.0, 0, 2.0], [1981.0, 3.4, 2.3], [1990.25, 2.6, 2.3], [1997.75, 2.2, 2.3], [2009.56, 3.0, 2.5], [2025.5, 4.0, 3.2],
];
const YK = (() => { let t = 3.4; const k = [[0, 1968], [t, 1968]]; const times = [t]; t += MS[0][2]; k.push([t, 1968]); for (let i = 1; i < MS.length; i++) { t += MS[i][1]; k.push([t, MS[i][0]]); times.push(t); t += MS[i][2]; k.push([t, MS[i][0]]); } return { k, times, end: t }; })();
const T_A_END = YK.end; // chart scene ends
const yearAt = (T) => { const k = YK.k; if (T <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (T < k[i][0]) { const [t0, v0] = k[i - 1], [t1, v1] = k[i]; return v0 + (v1 - v0) * smooth((T - t0) / (t1 - t0)); } return k[k.length - 1][1]; };
const timeOfYear = (y) => { let lo = 0, hi = T_A_END; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (yearAt(m) < y) lo = m; else hi = m; } return hi; };
const B0 = T_A_END + 0.2, B_END = B0 + 10.6, F0 = B_END, F_END = F0 + 8.4, E0 = F_END;

const MIL = [
  { y: 1968, h: 'The peak', t: '$1.60 an hour', s: 'The most buying power it has ever had', p: 'r' },
  { y: 1981, h: 'The freeze begins', t: '$3.35 from January 1981', s: 'Then no raise for 9 years', p: 'r' },
  { y: 1990.25, h: 'Finally, a raise', t: '$3.80 in April 1990', s: 'Prices rose about 45% while it sat still', p: 'l' },
  { y: 1997.75, h: 'Another long wait', t: '$5.15 from September 1997', s: 'The next raise comes ten years later', p: 'l' },
  { y: 2009.56, h: 'The last raise', t: '$7.25 on July 24, 2009', s: 'Congress has not raised it since', p: 'l' },
  { y: 2025.5, h: 'Today', t: 'Still $7.25', s: 'Indexed, it would be $14.81', p: 'l' },
].map((m, i) => ({ ...m, T0: YK.times[i] - 0.05, T1: YK.times[i] + MS[i][2] - 0.1 }));
const RAISES = HIST.slice(1).map(([y, m, d, v], i) => ({ ty: dateYear(y, m, d), d: v - HIST[i][3] })).filter((r) => r.ty > 1968 && r.d >= 0.35);
RAISES.forEach((r) => { r.T = timeOfYear(r.ty); });

/* ---------- chart geometry ---------- */
const CX0 = 54, CX1 = 500, CY0 = 706, CY1 = 304; // y for $0 and $16
const X = (t) => lerp(CX0, CX1, (t - 1968) / (2025.5 - 1968)), Y = (v) => lerp(CY0, CY1, v / 16);

function txt(s, x, y, { f = SERIF, w = 500, sz = 16, st = 'normal', col = CREAM, a = 1, al = 'left', ls = 0, sh = 0 } = {}) { if (a <= 0.003) return; g.save(); g.globalAlpha = a; g.font = `${st} ${w} ${sz}px ${f}`; g.textAlign = al; g.fillStyle = col; if ('letterSpacing' in g) g.letterSpacing = ls + 'px'; if (sh) { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = sh; } g.fillText(s, x, y); g.restore(); }
const caps = (s, x, y, o = {}) => txt(s.toUpperCase(), x, y, { f: SANS, w: 700, sz: o.sz || 9.5, ls: o.ls ?? 2.6, col: o.col || CREAM, a: o.a ?? 1, al: o.al || 'left' });

function drawBG() { const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, BG1); gr.addColorStop(1, BG0); g.fillStyle = gr; g.fillRect(0, 0, 540, 960); const rg = g.createRadialGradient(270, 480, 120, 270, 480, 620); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = rg; g.fillRect(0, 0, 540, 960); }

function pill(x, y, w, h, fill, stroke) { g.beginPath(); g.roundRect(x, y, w, h, 9); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } }

function drawChart(T, tYear, a) {
  if (a <= 0.003) return; g.save(); g.globalAlpha = a;
  // grid
  for (let v = 0; v <= 16; v += 4) { const y = Y(v); g.strokeStyle = v === 0 ? 'rgba(220,224,235,.45)' : 'rgba(200,205,216,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(CX0, y); g.lineTo(CX1, y); g.stroke(); txt('$' + v, CX0 - 8, y + 4, { f: SANS, w: 600, sz: 10, col: 'rgba(200,205,216,.7)', al: 'right' }); }
  for (let yr = 1970; yr <= 2020; yr += 10) { const x = X(yr); g.strokeStyle = 'rgba(200,205,216,.07)'; g.beginPath(); g.moveTo(x, CY1); g.lineTo(x, CY0); g.stroke(); txt(String(yr), x, CY0 + 18, { f: SANS, w: 600, sz: 10, col: 'rgba(200,205,216,.7)', al: 'center' }); }
  const tNow = clamp(tYear, 1968, 2025.5), N = Math.max(2, Math.round((tNow - 1968) * 12));
  // gap fill
  g.beginPath(); for (let i = 0; i <= N; i++) { const t = 1968 + (tNow - 1968) * i / N; const x = X(t), y = Y(indexed(t)); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  for (let i = N; i >= 0; i--) { const t = 1968 + (tNow - 1968) * i / N; g.lineTo(X(t), Y(actual(t))); } g.closePath();
  const fg = g.createLinearGradient(0, CY1, 0, CY0); fg.addColorStop(0, 'rgba(234,176,76,.34)'); fg.addColorStop(1, 'rgba(234,176,76,.10)'); g.fillStyle = fg; g.fill();
  // indexed line (glow)
  const path = (fn) => { g.beginPath(); for (let i = 0; i <= N; i++) { const t = 1968 + (tNow - 1968) * i / N; const x = X(t), y = Y(fn(t)); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } };
  g.lineJoin = 'round'; g.lineCap = 'round';
  path(indexed); g.strokeStyle = 'rgba(234,176,76,.28)'; g.lineWidth = 8; g.stroke(); path(indexed); g.strokeStyle = AMBER; g.lineWidth = 3; g.stroke();
  // actual: exact steps
  g.beginPath(); let prev = null; const M = N * 3; for (let i = 0; i <= M; i++) { const t = 1968 + (tNow - 1968) * i / M, v = actual(t), x = X(t); if (prev === null) g.moveTo(x, Y(v)); else { if (v !== prev) g.lineTo(x, Y(prev)); g.lineTo(x, Y(v)); } prev = v; }
  g.strokeStyle = CREAM; g.lineWidth = 3; g.stroke();
  // raise pops
  for (const r of RAISES) { const dt = T - r.T; if (dt < -0.02 || dt > 1.1 || r.ty > tNow + 0.05) continue; const al = 1 - sm(0.5, 1.1, dt), rise = easeOut(dt / 0.5) * 12, x = X(r.ty), y = Y(actual(r.ty + 0.001)); g.save(); g.globalAlpha = a * al; g.strokeStyle = CREAM; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 3 + easeOut(dt / 0.6) * 10, 0, 6.283); g.stroke(); g.restore(); txt('+$' + r.d.toFixed(2), x + 7, y + 14 - rise * 0.2, { f: SANS, w: 700, sz: 10.5, col: CREAM, a: a * al }); }
  // dots + scrubber
  const xa = X(tNow), ya = Y(actual(tNow)), yi = Y(indexed(tNow));
  g.strokeStyle = 'rgba(242,236,224,.25)'; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(xa, CY1 - 6); g.lineTo(xa, CY0); g.stroke(); g.setLineDash([]);
  for (const [yy, col] of [[yi, AMBER], [ya, CREAM]]) { g.fillStyle = col; g.beginPath(); g.arc(xa, yy, 5.2, 0, 6.283); g.fill(); g.strokeStyle = BG0; g.lineWidth = 2; g.stroke(); }
  if (tNow > 2025.3) { const k = sm(2025.3, 2025.5, tNow), xr = X(2025.5) + 2, y1 = Y(indexed(2025.5)), y2 = Y(actual(2025.5)); g.save(); g.globalAlpha = a * k; g.strokeStyle = CREAM; g.lineWidth = 1.4; g.beginPath(); g.moveTo(xr + 6, y1); g.lineTo(xr + 6, y2); g.moveTo(xr + 2, y1); g.lineTo(xr + 10, y1); g.moveTo(xr + 2, y2); g.lineTo(xr + 10, y2); g.stroke(); g.restore(); txt('$' + (indexed(2025.5) - actual(2025.5)).toFixed(2) + ' gap', xr - 4, (y1 + y2) / 2 + 30, { w: 600, sz: 19, al: 'right', a: a * k, sh: 8 }); }
  // legend
  g.fillStyle = AMBER; g.fillRect(CX0, CY1 - 34, 18, 3); caps('If it matched inflation', CX0 + 26, CY1 - 29, { col: AMBER, sz: 9, ls: 1.8 });
  g.fillStyle = CREAM; g.fillRect(CX0 + 208, CY1 - 34, 18, 3); caps('Actual federal minimum', CX0 + 234, CY1 - 29, { col: CREAM, sz: 9, ls: 1.8 });
  g.restore();
}

function drawHUD(T, tYear, a) {
  if (a <= 0.003) return; const ta = clamp(tYear, 1968, 2025.5), wa = actual(ta), wi = indexed(ta), gap = wi - wa;
  g.save(); g.globalAlpha = a;
  caps('Actual', 54, 756, { col: 'rgba(242,236,224,.8)', sz: 9.5 }); txt(money(wa), 54, 800, { w: 500, sz: 46 });
  caps('If indexed', 214, 756, { col: AMBER, sz: 9.5 }); txt(money(wi), 214, 800, { w: 500, sz: 46, col: AMBER });
  caps('Gap per hour', 376, 756, { col: 'rgba(200,205,216,.85)', sz: 9.5 }); txt(money(gap), 376, 800, { w: 500, sz: 46, col: 'rgba(242,236,224,.95)' });
  // gap meter
  g.fillStyle = 'rgba(200,205,216,.14)'; g.fillRect(54, 826, 446, 3); g.fillStyle = AMBER; g.fillRect(54, 826, 446 * clamp(wa / wi), 3); g.fillStyle = CREAM; g.fillRect(54 + 446 * clamp(wa / wi) - 1, 821, 2, 13);
  txt(`The actual wage buys ${Math.round(100 * wa / wi)}% of what the 1968 wage did`, 54, 852, { f: SANS, w: 600, sz: 10.5, col: 'rgba(200,205,216,.82)', ls: 0.4 });
  g.restore();
}

function drawCallouts(T, tYear, a) {
  for (const m of MIL) { if (!(T >= m.T0 && T < m.T1)) continue; const al = sm(m.T0, m.T0 + 0.5, T) * (1 - sm(m.T1 - 0.5, m.T1, T)) * a; if (al <= 0.01) continue;
    const x = X(m.y), yv = (Y(actual(m.y)) + Y(indexed(m.y))) / 2; const bw = 218, bh = 50; let bx = m.p === 'r' ? x + 22 : 74, by = m.p === 'r' ? 380 : 330; bx = clamp(bx, 24, 540 - 24 - bw);
    g.save(); g.globalAlpha = al; g.strokeStyle = 'rgba(242,236,224,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, yv); g.lineTo(m.p === 'r' ? bx : Math.min(bx + bw, x), m.p === 'r' ? by + bh / 2 : by + bh); g.stroke(); g.restore();
    g.save(); g.globalAlpha = al; pill(bx, by, bw, bh, 'rgba(14,15,20,.9)', 'rgba(242,236,224,.38)'); g.restore();
    txt(m.t, bx + 12, by + 22, { w: 600, sz: 19, a: al }); txt(m.s, bx + 12, by + 40, { f: SANS, w: 600, sz: 9.8, col: 'rgba(200,205,216,.9)', a: al, ls: 0.2 }); }
}

function drawTitleAndYear(T, a) {
  const tt = sm(0.2, 1.1, T);
  // the title starts centered and big, then settles to the top
  const big = 1 - sm(2.6, 3.4, T);
  if (big > 0.01) { txt('What if the federal minimum wage', 270, 400, { st: 'italic', sz: 33, al: 'center', a: tt * big }); txt('matched inflation every year?', 270, 442, { st: 'italic', sz: 33, al: 'center', a: sm(0.7, 1.5, T) * big }); caps('Real data · 1968 to 2025', 270, 500, { al: 'center', sz: 9.5, a: sm(1.4, 2.0, T) * big, col: 'rgba(200,205,216,.8)' }); }
  const sm2 = sm(2.9, 3.7, T) * a;
  caps('What if the federal minimum wage', 270, 56, { al: 'center', sz: 9.5, a: sm2 * 0.85, ls: 3.2 });
  txt('matched inflation every year?', 270, 94, { st: 'italic', sz: 31, al: 'center', a: sm2 });
  g.save(); g.globalAlpha = sm2 * 0.6; g.fillStyle = CREAM; g.fillRect(270 - 28, 110, 56, 1); g.restore();
}
function drawYear(T, tYear, a) { const yr = Math.floor(clamp(tYear, 1968, 2025.5)); txt(String(yr), 270, 206, { w: 600, sz: 74, al: 'center', a: a * sm(3.0, 3.8, T), sh: 14 }); }

function drawHead(T, a) { for (const m of MIL) { if (!(T >= m.T0 && T < m.T1)) continue; const al = sm(m.T0, m.T0 + 0.4, T) * (1 - sm(m.T1 - 0.5, m.T1, T)) * a; caps(m.h, 270, 244, { al: 'center', sz: 11, ls: 4.6, a: al, col: CREAM }); } }

/* ---------- scene B: one full-time worker ---------- */
const HOURS = 2080, A_PAY = 7.25 * HOURS, I_PAY = IDX[2025] * HOURS; // 15,080 and about 30,800
function sceneB(T) {
  const a = sm(B0, B0 + 0.7, T) * (1 - sm(B_END - 0.6, B_END, T)); if (a <= 0.003) return; const u = T - B0;
  g.save(); g.globalAlpha = a;
  caps('One full-time worker · 2025 poverty guidelines', 270, 70, { al: 'center', sz: 10.5, ls: 4.4, col: 'rgba(242,236,224,.9)' });
  txt('2,080 hours a year', 270, 110, { st: 'italic', sz: 30, al: 'center' });
  g.fillStyle = 'rgba(242,236,224,.5)'; g.fillRect(242, 126, 56, 1);
  const base = 760, top = 250, sc = (v) => base - (v / 32000) * (base - top);
  g.strokeStyle = 'rgba(220,224,235,.45)'; g.beginPath(); g.moveTo(60, base); g.lineTo(480, base); g.stroke();
  const grow = easeOut((u - 0.8) / 2.0), grow2 = easeOut((u - 1.6) / 2.2);
  const bw = 112, ax = 100, ix = 328;
  // bars
  const av = A_PAY * grow, iv = I_PAY * grow2;
  g.fillStyle = CREAM; g.fillRect(ax, sc(av), bw, base - sc(av)); const gi = g.createLinearGradient(0, sc(I_PAY), 0, base); gi.addColorStop(0, AMBER); gi.addColorStop(1, 'rgba(234,176,76,.7)'); g.fillStyle = gi; g.fillRect(ix, sc(iv), bw, base - sc(iv));
  txt('$' + commaN(av), ax + bw / 2, sc(av) + 40, { w: 600, sz: 30, al: 'center', col: BG0, a: sm(1.6, 2.1, u) });
  txt('$' + commaN(iv), ix + bw / 2, sc(iv) + 40, { w: 600, sz: 30, al: 'center', col: BG0, a: sm(2.4, 2.9, u) });
  caps('Actual · $7.25', ax + bw / 2, base + 22, { al: 'center', sz: 9.5, ls: 2.2 }); caps('Indexed · $14.81', ix + bw / 2, base + 22, { al: 'center', sz: 9.5, ls: 2.2, col: AMBER });
  // poverty guideline lines
  const lines = [[15650, ['1 PERSON', '$15,650'], 3.6], [26650, ['FAMILY OF 3', '$26,650'], 5.6]];
  for (const [v, lab, t0] of lines) { const la = sm(t0, t0 + 0.6, u); if (la <= 0) continue; const y = sc(v); g.save(); g.globalAlpha = a * la; g.strokeStyle = 'rgba(242,236,224,.75)'; g.lineWidth = 1.2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(60 + 420 * (1 - la), y); g.lineTo(480, y); g.stroke(); g.setLineDash([]); g.restore(); g.save(); g.globalAlpha = a * la; pill(220, y - 17, 100, 34, 'rgba(14,15,20,.94)', 'rgba(242,236,224,.5)'); g.restore(); txt(lab[0], 270, y - 3, { f: SANS, w: 700, sz: 8.2, ls: 1.2, col: 'rgba(242,236,224,.85)', al: 'center', a: la }); txt(lab[1], 270, y + 11, { w: 600, sz: 15, al: 'center', a: la }); }
  // explanation
  txt('$7.25 × 2,080 hours is below the one-person line', 270, 810, { st: 'italic', sz: 20, al: 'center', a: sm(4.2, 4.8, u) * (1 - sm(5.5, 5.9, u)) });
  txt('$14.81 × 2,080 hours clears a family of three', 270, 810, { st: 'italic', sz: 20, al: 'center', a: sm(6.0, 6.6, u), col: AMBER });
  txt('Poverty guidelines are shown for comparison, not as a budget.', 270, 840, { f: SANS, w: 600, sz: 9.5, al: 'center', a: sm(6.0, 6.6, u) * 0.7, col: 'rgba(200,205,216,.9)' });
  // since the last raise
  const ca = sm(8.0, 8.7, u); if (ca > 0) { pill(60, 868, 420, 54, 'rgba(14,15,20,.9)', 'rgba(234,176,76,.55)'); txt('About $154,000', 76, 893, { w: 600, sz: 26, col: AMBER, a: ca }); txt('missed since 2010 by a full-time worker, the gap added up each year', 76, 912, { f: SANS, w: 600, sz: 9.3, col: 'rgba(200,205,216,.92)', a: ca, ls: 0.2 }); }
  g.restore();
}

/* ---------- facts + end ---------- */
const FACTS = [
  ['Buying power of $7.25', 'About half', '$7.25 in 2025 buys what $0.78 bought in 1968, against $1.60 then (CPI-U)'],
  ['Last federal raise', 'July 24, 2009', 'Congress sets the rate. There are no automatic increases. 30 states and D.C. set a higher minimum'],
  ['The debate', 'Economists disagree', 'CBO (2021): a $15 federal minimum by 2025 would mean about 1.4 million fewer jobs and 900,000 fewer people in poverty'],
];
function facts(T) {
  const a = sm(F0, F0 + 0.6, T) * (1 - sm(F_END - 0.5, F_END, T)); if (a <= 0.003) return; g.save(); g.globalAlpha = a; g.fillStyle = '#08090c'; g.fillRect(0, 0, 540, 960); g.restore();
  FACTS.forEach((f, i) => { const t0 = F0 + 0.5 + i * 2.2, fa = sm(t0, t0 + 0.6, T) * (1 - sm(F_END - 0.5, F_END, T)), y = 220 + i * 190; if (fa <= 0.003) return; caps(f[0], 44, y, { a: fa, sz: 10.5, col: 'rgba(242,236,224,.88)' }); txt(f[1], 44, y + 52, { sz: 44, a: fa, col: i === 1 ? AMBER : CREAM }); wrapText(f[2], 44, y + 82, 452, 15, fa); });
}
function wrapText(s, x, y, w, lh, a) { g.save(); g.font = `600 12.5px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = '0.3px'; const words = s.split(' '); let line = '', yy = y; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { g.globalAlpha = a * 0.72; g.fillStyle = CREAM; g.fillText(line, x, yy); line = wd; yy += lh; } else line = t; } g.globalAlpha = a * 0.72; g.fillStyle = CREAM; g.fillText(line, x, yy); g.restore(); }
function endCard(T) {
  const a = sm(E0, E0 + 0.7, T); if (a <= 0.003) return; g.save(); g.globalAlpha = a; g.fillStyle = '#08090c'; g.fillRect(0, 0, 540, 960); g.restore();
  txt('In 1968, the federal minimum', 270, 400, { sz: 33, al: 'center', a: sm(E0 + 0.4, E0 + 1.1, T) }); txt('wage was $1.60.', 270, 440, { sz: 33, al: 'center', a: sm(E0 + 0.4, E0 + 1.1, T) });
  txt('Matching inflation, it would be', 270, 506, { st: 'italic', sz: 29, al: 'center', a: sm(E0 + 1.5, E0 + 2.2, T) }); txt('$14.81 today.', 270, 548, { st: 'italic', sz: 40, al: 'center', col: AMBER, a: sm(E0 + 1.5, E0 + 2.2, T) });
  caps('Arithmetic scenario · DOL wage history · BLS CPI-U', 270, 640, { al: 'center', sz: 9, a: sm(E0 + 2.4, E0 + 3.0, T) * 0.75, col: 'rgba(200,205,216,.9)', ls: 2.2 }); caps('Sources in the caption', 270, 662, { al: 'center', sz: 9, a: sm(E0 + 2.4, E0 + 3.0, T) * 0.75, col: 'rgba(200,205,216,.9)', ls: 2.2 });
}

{ const gr = document.getElementById('grain'), cx = gr.getContext('2d'), id = cx.createImageData(256, 256); let s = 99; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } cx.putImageData(id, 0, 0); }

function renderAt(T) {
  T = clamp(T, 0, T_END); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, 540, 960); drawBG();
  const yr = yearAt(T), aScene = sm(2.4, 3.4, T) * (1 - sm(T_A_END - 0.1, T_A_END + 0.6, T));
  drawTitleAndYear(T, 1 - sm(T_A_END - 0.1, T_A_END + 0.3, T));
  drawChart(T, yr, aScene); drawYear(T, yr, aScene); drawHead(T, aScene); drawHUD(T, yr, aScene * sm(3.3, 4.0, T)); drawCallouts(T, yr, aScene);
  sceneB(T); facts(T); endCard(T);
}
window.renderAt = renderAt; window.T_END = T_END;
await Promise.all([document.fonts.load('600 40px "Cormorant Garamond"'), document.fonts.load('500 30px "Cormorant Garamond"'), document.fonts.load('italic 500 30px "Cormorant Garamond"')]).catch(() => {});
window.READY = true;
if (P.has('t')) renderAt(parseFloat(P.get('t')));
else if (!P.has('manual')) { const t0 = performance.now(); const loop = () => { renderAt(((performance.now() - t0) / 1000) % (T_END + 1)); requestAnimationFrame(loop); }; loop(); }
