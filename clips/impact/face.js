
/* ---------- painted faces (canvas textures wrapped on the head) ---------- */
const SKIN_HEX = [0xe3b895, 0xc89b7b, 0x8a5a3a, 0xf0c9a8, 0x6e4630, 0xd8a47c];
const EYE_COLS = ['#5a3a22', '#3e6a8a', '#4a6a3a', '#2a1c14', '#6a5a3a', '#4a4a52'];
const FACE_MATS = [];
function paintFace(skinHex, eyeCol, seed) {
  const r = rng(seed), W = 1024, H = 512, c = mkCanvas(W, H), x = c.getContext('2d');
  const base = new THREE.Color(skinHex), sh = (f) => `rgb(${Math.min(255, base.r * 255 * f) | 0},${Math.min(255, base.g * 255 * f) | 0},${Math.min(255, base.b * 255 * f) | 0})`;
  x.fillStyle = sh(1); x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,235,220' : '60,30,20'},${0.02 + r() * 0.035})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
  const U = (u) => u * W, V = (v) => (1 - v) * H, cx = U(0.25);
  const blob = (px, py, rx, ry, col, a) => {
    const m = Math.max(rx, ry), g = x.createRadialGradient(px, py, 0, px, py, m);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    x.save(); x.translate(px, py); x.scale(rx / m, ry / m); x.translate(-px, -py); x.fillStyle = g; x.beginPath(); x.arc(px, py, m, 0, 6.283); x.fill(); x.restore();
  };
  // cheeks, forehead light, temple and jaw shade
  blob(cx - 62, V(0.46), 52, 40, 'rgba(220,110,100,A)', 0.2); blob(cx + 62, V(0.46), 52, 40, 'rgba(220,110,100,A)', 0.2);
  blob(cx, V(0.66), 80, 34, 'rgba(255,240,225,A)', 0.14); blob(cx - 118, V(0.5), 38, 80, 'rgba(40,20,10,A)', 0.22); blob(cx + 118, V(0.5), 38, 80, 'rgba(40,20,10,A)', 0.22);
  blob(cx, V(0.33), 70, 28, 'rgba(40,20,10,A)', 0.18);
  const dark = sh(0.55);
  for (const ux of [0.0, 0.5, 1.0]) blob(U(ux), V(0.5), 20, 30, 'rgba(190,100,90,A)', 0.35); // ears
  // eyes
  const sepx = 46, ey = V(0.545), look = (r() - 0.5) * 3;
  for (const s of [-1, 1]) {
    const ex = cx + s * sepx;
    x.fillStyle = 'rgba(40,20,15,.18)'; x.beginPath(); x.ellipse(ex, ey - 2, 25, 14, 0, 0, 6.283); x.fill();
    x.fillStyle = '#f2eee8'; x.beginPath(); x.moveTo(ex - 20, ey); x.quadraticCurveTo(ex, ey - 15, ex + 20, ey); x.quadraticCurveTo(ex, ey + 11, ex - 20, ey); x.fill();
    x.save(); x.beginPath(); x.moveTo(ex - 20, ey); x.quadraticCurveTo(ex, ey - 15, ex + 20, ey); x.quadraticCurveTo(ex, ey + 11, ex - 20, ey); x.clip();
    x.fillStyle = eyeCol; x.beginPath(); x.arc(ex + look + 1, ey - 1, 9.5, 0, 6.283); x.fill();
    const ig = x.createRadialGradient(ex + look + 1, ey - 1, 2, ex + look + 1, ey - 1, 9.5); ig.addColorStop(0, 'rgba(0,0,0,0)'); ig.addColorStop(1, 'rgba(0,0,0,.45)');
    x.fillStyle = ig; x.beginPath(); x.arc(ex + look + 1, ey - 1, 9.5, 0, 6.283); x.fill();
    x.fillStyle = '#0a0806'; x.beginPath(); x.arc(ex + look + 1, ey - 1, 4.4, 0, 6.283); x.fill();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(ex + look - 2, ey - 4, 2.1, 0, 6.283); x.fill();
    x.fillStyle = 'rgba(30,20,15,.35)'; x.fillRect(ex - 22, ey - 16, 44, 6);
    x.restore();
    x.strokeStyle = 'rgba(25,15,10,.9)'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(ex - 21, ey + 0.5); x.quadraticCurveTo(ex, ey - 16, ex + 21, ey + 0.5); x.stroke();
    x.strokeStyle = 'rgba(60,30,20,.4)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(ex - 19, ey + 2); x.quadraticCurveTo(ex, ey + 11, ex + 19, ey + 2); x.stroke();
    x.strokeStyle = 'rgba(70,40,30,.28)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ex - 22, ey - 17); x.quadraticCurveTo(ex, ey - 24, ex + 22, ey - 15); x.stroke();
    // brow: raised and slightly worried toward the middle
    const bt = 3 + r() * 3.2, by = V(0.605) - 6;
    x.fillStyle = `rgba(${40 + ((r() * 30) | 0)},${25 + ((r() * 14) | 0)},18,.85)`;
    x.beginPath(); x.moveTo(ex - 26, by + 7); x.quadraticCurveTo(ex, by - 6, ex + 27, by + 5); x.lineTo(ex + 27, by + 5 + bt); x.quadraticCurveTo(ex, by - 6 + bt, ex - 26, by + 7 + bt); x.fill();
  }
  // nose: bridge light, shaded side, nostrils
  blob(cx, V(0.5), 14, 40, 'rgba(255,240,225,A)', 0.18); blob(cx - 11, V(0.46), 12, 26, 'rgba(50,25,15,A)', 0.2);
  x.fillStyle = 'rgba(60,30,25,.55)'; x.beginPath(); x.ellipse(cx - 9, V(0.435), 5.5, 3.2, 0.3, 0, 6.283); x.fill(); x.beginPath(); x.ellipse(cx + 9, V(0.435), 5.5, 3.2, -0.3, 0, 6.283); x.fill();
  x.strokeStyle = 'rgba(60,30,25,.4)'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 14, V(0.44)); x.quadraticCurveTo(cx, V(0.425), cx + 14, V(0.44)); x.stroke();
  // mouth
  const dk = skinHex === 0x6e4630 || skinHex === 0x8a5a3a;
  const my = V(0.375), lipc = `hsl(${(r() * 12) | 0},${(34 + r() * 18) | 0}%,${dk ? 28 : 46}%)`, w = 32 + r() * 6, open = r() < 0.4 ? 5 : 0;
  x.fillStyle = lipc; x.beginPath(); x.moveTo(cx - w, my); x.quadraticCurveTo(cx - w / 2, my - 11, cx, my - 8); x.quadraticCurveTo(cx + w / 2, my - 11, cx + w, my); x.quadraticCurveTo(cx, my + 1, cx - w, my); x.fill();
  if (open) { x.fillStyle = '#2a0e0e'; x.beginPath(); x.moveTo(cx - w * 0.8, my); x.quadraticCurveTo(cx, my + open + 3, cx + w * 0.8, my); x.quadraticCurveTo(cx, my + 1, cx - w * 0.8, my); x.fill(); }
  x.fillStyle = lipc; x.beginPath(); x.moveTo(cx - w, my); x.quadraticCurveTo(cx, my + 17 + open, cx + w, my); x.quadraticCurveTo(cx, my + 4 + open, cx - w, my); x.fill();
  x.strokeStyle = dark; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx - w, my); x.quadraticCurveTo(cx, my + 3 + open, cx + w, my); x.stroke();
  blob(cx, my + 24, 26, 12, 'rgba(60,30,20,A)', 0.2);
  x.strokeStyle = 'rgba(70,40,30,.25)'; x.lineWidth = 2; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 24, V(0.43)); x.quadraticCurveTo(cx + s * 34, my - 6, cx + s * (w + 4), my - 2); x.stroke(); }
  const t = toTex(c); return new THREE.MeshLambertMaterial({ map: t });
}
for (let i = 0; i < SKIN_HEX.length; i++) for (let k = 0; k < 2; k++) FACE_MATS.push(paintFace(SKIN_HEX[i], EYE_COLS[(i + k * 3) % EYE_COLS.length], 4000 + i * 17 + k * 5));
