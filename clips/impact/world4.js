/* ------------------------------------------------------------------ *
 *  First person, walking an avenue in Manhattan (2,600 km from the impact)
 * ------------------------------------------------------------------ */
const fmod = (a, n) => ((a % n) + n) % n;
const NO_SHADOW = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x7a6a58, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8c0, 3);
sun.target.position.set(0, 0, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(+(P.get('shadow') ?? 2048), +(P.get('shadow') ?? 2048));
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 120, bottom: -120, near: 1, far: 1700 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 650, cy * 650, -60 + cz * 650);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}
const [concreteImg] = await Promise.all([new Promise((res) => new THREE.TextureLoader().load('../assets/brick_diffuse.jpg', (t) => res(t), undefined, () => res(null)))]);

/* ---------- facades (reused generators) ---------- */
function stuccoFill(ctx, w, h, base, rand) {
  ctx.fillStyle = shade(base, 1); ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 55; i++) { ctx.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${rand() * 0.06})` : `rgba(255,255,255,${rand() * 0.08})`; ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 3, 2 + rand() * 3); }
}
function makeStucco(base, seed) {
  const rand = rng(seed), c = mkCanvas(512, 1024), x = c.getContext('2d');
  stuccoFill(x, 512, 1024, base, rand);
  for (let f = 0; f < 4; f++) {
    x.fillStyle = 'rgba(0,0,0,.09)'; x.fillRect(0, f * 256 + 248, 512, 8);
    for (let b = 0; b < 2; b++) {
      const x0 = b * 256 + 62, y0 = f * 256 + 56, ww = 132, wh = 148;
      const st = Math.floor(rand() * 7);
      if (st === 5) { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f0ece0' : (rand() < 0.5 ? '#b5453a' : '#2f6a54'); x.beginPath(); x.moveTo(x0 - 8 + i * 18, y0 - 30); x.lineTo(x0 + 10 + i * 18, y0 - 30); x.lineTo(x0 + 14 + i * 18, y0 - 4); x.lineTo(x0 - 12 + i * 18, y0 - 4); x.fill(); } }
      x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(x0 - 10, y0 - 10, ww + 20, wh + 22);
      x.fillStyle = '#f4f1ea'; x.fillRect(x0 - 6, y0 - 6, ww + 12, wh + 12);
      const g = x.createLinearGradient(x0, y0, x0 + ww * 0.5, y0 + wh); g.addColorStop(0, '#a6c2d8'); g.addColorStop(1, '#34495c');
      x.fillStyle = g; x.fillRect(x0, y0, ww, wh);
      if (st === 1) { x.fillStyle = 'rgba(236,224,196,.88)'; x.fillRect(x0, y0, ww * 0.45, wh); }
      else if (st === 2) { x.fillStyle = 'rgba(214,206,190,.85)'; for (let yy = y0; yy < y0 + wh * 0.75; yy += 9) x.fillRect(x0, yy, ww, 6); }
      else if (st === 3) { x.fillStyle = 'rgba(20,18,18,.7)'; x.fillRect(x0, y0, ww, wh); }
      else if (st === 4) { x.fillStyle = '#aab0b4'; x.fillRect(x0 + 24, y0 + wh + 10, ww - 48, 32); x.fillStyle = '#7d8488'; x.fillRect(x0 + 30, y0 + wh + 16, ww - 60, 6); }
      x.fillStyle = '#f4f1ea'; x.fillRect(x0 + ww / 2 - 3, y0, 6, wh); x.fillRect(x0, y0 + wh * 0.45, ww, 5);
      x.fillStyle = 'rgba(255,255,255,.13)'; x.beginPath(); x.moveTo(x0, y0 + wh * 0.5); x.lineTo(x0 + ww * 0.55, y0); x.lineTo(x0 + ww * 0.85, y0); x.lineTo(x0, y0 + wh * 0.95); x.fill();
    }
  }
  return { map: toTex(c) };
}
function makeGlassTile(seed) { // 4x4 panes
  const rand = rng(seed), c = mkCanvas(256, 256), x = c.getContext('2d');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const g = x.createLinearGradient(i * 64, j * 64, i * 64 + 64, j * 64 + 64);
    const h = 188 + rand() * 30, s = 28 + rand() * 24, l = 34 + rand() * 24;
    g.addColorStop(0, `hsl(${h},${s}%,${l + 10}%)`); g.addColorStop(1, `hsl(${h + 6},${s}%,${l - 10}%)`);
    x.fillStyle = g; x.fillRect(i * 64, j * 64, 64, 64);
  }
  x.fillStyle = '#23303a';
  for (let k = 0; k <= 4; k++) { x.fillRect(k * 64 - 2, 0, 4, 256); x.fillRect(0, k * 64 - 2, 256, 4); }
  return toTex(c);
}

const brickCols = [0x9e4a37, 0x8a3d33, 0xb28a5e, 0x7d4d3c];
const stuccoCols = [0xe9dcc0, 0xdcbfa0, 0xf0efe9, 0xcbd8c6, 0xe7c9a8, 0xbccbdb, 0xe8ac92, 0xd8d0b8];
const FACADES = [
  ...brickCols.map((c, i) => ({ tex: makeFacade(c, 100 + i).map, style: 'brick', col: c })),
  ...stuccoCols.map((c, i) => ({ tex: makeStucco(c, 300 + i).map, style: 'stucco', col: c })),
];
const shopHex = (n) => '#' + n.toString(16).padStart(6, '0');
const SHOPS = [[0x2f5a3c, 0xe8e1cf], [0x1f3b6b, 0xe8e1cf], [0xa3262c, 0xe8e1cf], [0xc9962a, 0x2a2724]].map(([a, b], i) => makeShop(brickCols[i % 4], shopHex(a), shopHex(b), 200 + i).map);
const facadeMats = FACADES.map((f) => new THREE.MeshLambertMaterial({ map: f.tex }));
const shopMats = SHOPS.map((t) => new THREE.MeshLambertMaterial({ map: t }));
const roofMat = new THREE.MeshLambertMaterial({ color: 0x77736c });
const stoneMat = new THREE.MeshLambertMaterial({ color: 0xcfc6b4 });
const tankMat = new THREE.MeshLambertMaterial({ color: 0x7a5a40 });
const unitMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a4 });

function texBox(w, h, d, sideMat, topMat, tileW, tileH) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const side = f < 2 || f > 3, [fw, fh] = dims[f];
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * fw / (side ? tileW : 8), uv.getY(k) * fh / (side ? tileH : 8)); }
  }
  const m = new THREE.Mesh(g, [sideMat, sideMat, topMat, topMat, sideMat, sideMat]);
  m.castShadow = true; m.receiveShadow = true; return m;
}


/* ---------- road, sidewalks, crosswalks ---------- */
const AVE = 13, WALKW = 6, DEPTH = 26;
const INTS = [-34, -116, -198, -280, -362, -444, -526, -608, -690, -772];
const roadTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(8);
  x.fillStyle = '#3b3b40'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) { const v = 44 + r() * 40; x.fillStyle = `rgb(${v},${v},${v + 3})`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  for (let i = 0; i < 20; i++) { x.strokeStyle = 'rgba(8,8,8,.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(r() * 256, r() * 256); x.lineTo(r() * 256, r() * 256); x.stroke(); }
  x.fillStyle = '#e6c03a'; x.fillRect(125, 0, 3, 256); x.fillRect(131, 0, 3, 256);
  x.fillStyle = 'rgba(235,235,235,.85)'; for (const lx of [64, 192]) for (let k = 0; k < 2; k++) x.fillRect(lx - 1, k * 128 + 10, 3, 54);
  const t = toTex(c); t.repeat.set(1, 56); return t;
})();
const walkTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(9);
  x.fillStyle = '#a9a69f'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) { const v = 140 + r() * 50; x.fillStyle = `rgba(${v},${v - 2},${v - 6},.7)`; x.fillRect(r() * 256, r() * 256, 2, 2); }
  x.strokeStyle = 'rgba(60,58,54,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254); x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.moveTo(0, 128); x.lineTo(256, 128); x.stroke();
  const t = toTex(c); t.repeat.set(WALKW / 2, 120); return t;
})();
const zebraTex = (() => {
  const c = mkCanvas(256, 64), x = c.getContext('2d'); x.clearRect(0, 0, 256, 64);
  x.fillStyle = 'rgba(236,236,230,.92)'; for (let i = 0; i < 13; i++) x.fillRect(i * 20 + 4, 0, 11, 64);
  return toTex(c);
})();
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: 0x55565a })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(AVE * 2, 1100), new THREE.MeshLambertMaterial({ map: roadTex })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -420); road.receiveShadow = true; scene.add(road);
  for (const sx of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(WALKW, 0.16, 1100), new THREE.MeshLambertMaterial({ map: walkTex })); sw.position.set(sx * (AVE + WALKW / 2), 0.08, -420); sw.receiveShadow = true; scene.add(sw);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 1100), new THREE.MeshLambertMaterial({ color: 0xb8b4aa })); curb.position.set(sx * (AVE + 0.05), 0.1, -420); scene.add(curb);
  }
  for (const z0 of INTS) {
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(240, 18), new THREE.MeshLambertMaterial({ map: roadTex.clone() })); cs.material.map.repeat.set(1, 1); cs.rotation.x = -Math.PI / 2; cs.rotation.z = Math.PI / 2; cs.position.set(0, 0.03, z0); cs.receiveShadow = true; scene.add(cs);
    for (const dz of [-11.4, 11.4]) { const zb = new THREE.Mesh(new THREE.PlaneGeometry(AVE * 2, 4), new THREE.MeshBasicMaterial({ map: zebraTex, transparent: true, depthWrite: false })); zb.rotation.x = -Math.PI / 2; zb.position.set(0, 0.045, z0 + dz); scene.add(zb); }
  }
}

/* ---------- buildings: tall NYC blocks ---------- */
const glassTexN = [makeGlassTile(41), makeGlassTile(42)];
const glassMatsN = glassTexN.map((t) => new THREE.MeshLambertMaterial({ map: t }));
const NYC_FAC = [0, 1, 2, 3, 4, 7, 9, 11].map((i) => facadeMats[i]);
const buildings = [];
const SHEDS = [];
{
  const r = rng(212);
  const seg = (a, b) => ({ a, b });
  const segs = []; let zc = 60;
  for (const z0 of INTS) { segs.push(seg(zc, z0 + 9)); zc = z0 - 9; }
  segs.push(seg(zc, zc - 82));
  for (const side of [-1, 1]) for (const sg of segs) {
    let z = sg.a;
    while (z - 14 > sg.b) {
      const dz = Math.min(z - sg.b, 14 + Math.floor(r() * 4) * 3 + r() * 4);
      if (dz < 10) break;
      const zcn = z - dz / 2, near = zcn > -300;
      const floors = near ? 6 + Math.floor(r() * 16) : 10 + Math.floor(r() * 24);
      const glass = r() < 0.22 && floors > 12, brickIdx = Math.floor(r() * NYC_FAC.length);
      const g = new THREE.Group(), hh = floors * 3.4, setback = floors > 16;
      const x = side * (AVE + WALKW + DEPTH / 2);
      const shop = texBox(DEPTH, SHOP_H, dz, shopMats[Math.floor(r() * 4)], roofMat, TILE_W, SHOP_H); shop.position.y = SHOP_H / 2; g.add(shop);
      const lowH = setback ? hh * 0.7 : hh;
      const up = texBox(DEPTH, lowH, dz, glass ? glassMatsN[Math.floor(r() * 2)] : NYC_FAC[brickIdx], roofMat, glass ? 12 : TILE_W, glass ? 12 : TILE_H); up.position.y = SHOP_H + lowH / 2; g.add(up);
      if (setback) { const up2 = texBox(DEPTH * 0.7, hh - lowH, dz * 0.82, glass ? glassMatsN[0] : NYC_FAC[brickIdx], roofMat, glass ? 12 : TILE_W, glass ? 12 : TILE_H); up2.position.set(-side * DEPTH * 0.13, SHOP_H + lowH + (hh - lowH) / 2, 0); g.add(up2); }
      const top = SHOP_H + hh;
      const cor = new THREE.Mesh(new THREE.BoxGeometry(DEPTH + 0.8, 0.8, dz + 0.8), stoneMat); cor.position.y = SHOP_H + lowH + 0.4; cor.castShadow = true; g.add(cor);
      if (r() < 0.45) { const tk = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 3.4, 10), tankMat); tk.position.set((r() - 0.5) * 8, top + 2.4, (r() - 0.5) * dz * 0.5); tk.castShadow = true; g.add(tk); const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.2, 10), tankMat); cap.position.copy(tk.position); cap.position.y += 2.3; g.add(cap); }
      g.position.set(x, 0, zcn); scene.add(g);
      const b = { g, x, z: zcn, w: DEPTH, d: dz, h: top, side, brick: !glass, seed: r() * 6.28, lowH, glass };
      buildings.push(b);
      z -= dz + (r() < 0.12 ? 2 + r() * 3 : 0);
    }
  }
  // far downtown towers closing the avenue
  const gm = new THREE.MeshLambertMaterial({ map: glassTexN[1] });
  for (let i = 0; i < 26; i++) { const w = 28 + r() * 26, h = 120 + r() * 220, d = 28 + r() * 26; const m = texBox(w, h, d, gm, roofMat, 12, 12); m.position.set((r() - 0.5) * 360, h / 2, -900 - r() * 700); scene.add(m); }
  // the older brick buildings that shed their facade
  const old = buildings.filter((b) => b.brick && b.z < 0 && b.z > -300 && b.h < 80);
  for (let i = 0; i < 9; i++) SHEDS.push(old[Math.floor(hash2(i, 91) * old.length)]);
}
/* ---------- street furniture ---------- */
const lampMat = new THREE.MeshLambertMaterial({ color: 0x2e3336 });
const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 8, 8); poleGeo.translate(0, 4, 0);
const SIGNALS = [];
for (let z = 30; z > -820; z -= 30) for (const sx of [-1, 1]) { const m = new THREE.Mesh(poleGeo, lampMat); m.position.set(sx * (AVE + 0.6), 0.16, z); m.castShadow = true; scene.add(m); const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), lampMat); arm.position.set(-sx * 1.3, 7.6, 0); m.add(arm); const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.35), new THREE.MeshBasicMaterial({ color: 0xe8e6da })); head.position.set(-sx * 2.5, 7.55, 0); m.add(head); }
const sigG = new THREE.BoxGeometry(0.4, 1.1, 0.35);
for (const z0 of INTS) for (const sx of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 8), lampMat); post.position.set(sx * (AVE + 1.0), 1.9, z0 + 11); scene.add(post);
  const box = new THREE.Mesh(sigG, lampMat); box.position.set(sx * (AVE + 1.0), 4.0, z0 + 11); scene.add(box);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0x35e07a })); lamp.position.set(sx * (AVE + 1.0), 4.2, z0 + 10.8); scene.add(lamp); SIGNALS.push({ lamp, z0, sx });
}
{ // hydrants, trash cans, newsstands, subway rails
  const r = rng(77), hyd = new THREE.CylinderGeometry(0.18, 0.2, 0.7, 10), hm = new THREE.MeshLambertMaterial({ color: 0xc4261d }), tcm = new THREE.MeshLambertMaterial({ color: 0x2f4a3a });
  for (let i = 0; i < 18; i++) { const side = r() < 0.5 ? -1 : 1, z = 20 - r() * 700; const h = new THREE.Mesh(hyd, hm); h.position.set(side * (AVE + 0.9), 0.5, z); h.castShadow = true; scene.add(h); }
  for (let i = 0; i < 26; i++) { const side = r() < 0.5 ? -1 : 1, z = 25 - r() * 700; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.95, 10), tcm); t.position.set(side * (AVE + 1.5 + r() * 1.5), 0.62, z); t.castShadow = true; scene.add(t); }
}
const steam = { x: 5.5, z: -150 };
{ const g = new THREE.Group(); for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.62 - k * 0.02, 0.72 - k * 0.02, 0.5, 14), new THREE.MeshLambertMaterial({ color: k % 2 ? 0xf2f0ea : 0xe8741f })); s.position.y = 0.25 + k * 0.5; g.add(s); } g.position.set(steam.x, 0.02, steam.z); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g); }
/* ---------- billboards (the one digital thing you see: they black out at the first tremor) ---------- */
const adCanvas = mkCanvas(512, 256), adCtx = adCanvas.getContext('2d');
const adTex = new THREE.CanvasTexture(adCanvas); adTex.colorSpace = THREE.SRGBColorSpace;
const adMat = new THREE.MeshBasicMaterial({ map: adTex });
const ADS = ['NEW YORK', 'WATCH LIVE', 'SALE 50%', 'BROADWAY', 'FRESH', 'GO'];
const adMeshes = [];
for (const b of buildings.filter((q) => q.z < 10 && q.z > -330 && q.h > 35).filter((q, i) => i % 5 === 0).slice(0, 9)) { const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), adMat); m.position.set(b.x - b.side * (DEPTH / 2 + 0.2), 12 + (b.seed % 1) * 10, b.z); m.rotation.y = -b.side * Math.PI / 2; scene.add(m); adMeshes.push(m); }
function drawAd(T) {
  const W = 512, H = 256, dead = T > 22.2;
  if (dead) { adCtx.fillStyle = '#0b0b0d'; adCtx.fillRect(0, 0, W, H); }
  else { const k = Math.floor(T * 0.8), ph = (T * 0.8) % 1, hue = (k * 67) % 360; const g = adCtx.createLinearGradient(0, 0, W, H); g.addColorStop(0, `hsl(${hue},85%,55%)`); g.addColorStop(1, `hsl(${(hue + 50) % 360},90%,40%)`); adCtx.fillStyle = g; adCtx.fillRect(0, 0, W, H); adCtx.fillStyle = '#fff'; adCtx.font = '700 70px "Helvetica Neue", Arial, "Liberation Sans", sans-serif'; adCtx.textAlign = 'center'; adCtx.fillText(ADS[k % ADS.length], W / 2 + (1 - smooth(ph * 3)) * 40, H / 2 + 24); }
  adTex.needsUpdate = true;
}

/* ---------- vehicles ---------- */
const cars = [];
{
  const r = rng(61), cols = [0xf6c30e, 0xf6c30e, 0xf6c30e, 0xf6c30e, 0x1a1a1c, 0xd9d9d3, 0x2b4a86, 0x8a1f24, 0xc8cacc, 0x25282c];
  const bodyG = new THREE.BoxGeometry(1.9, 0.78, 4.7); bodyG.translate(0, 0.66, 0); const cabG = new THREE.BoxGeometry(1.7, 0.72, 2.5); cabG.translate(0, 1.38, -0.1);
  const glassM = new THREE.MeshLambertMaterial({ color: 0x1b2430 }), wheelG = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12), wheelM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (let i = 0; i < 40; i++) {
    const col = cols[Math.floor(r() * cols.length)], g = new THREE.Group(), body = new THREE.Mesh(bodyG, new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.2 })), cab = new THREE.Mesh(cabG, glassM);
    body.castShadow = cab.castShadow = true; g.add(body, cab);
    for (const [wx, wz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) { const w = new THREE.Mesh(wheelG, wheelM); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w); }
    if (col === 0xf6c30e) { const sg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.28), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); sg.position.set(0, 1.84, -0.1); g.add(sg); }
    scene.add(g);
    const dir = i % 2 ? 1 : -1, lane = dir > 0 ? (r() < 0.5 ? 3.6 : 9.4) : (r() < 0.5 ? -3.6 : -9.4);
    cars.push({ g, dir, lane, z0: 30 - r() * 760, v: 7 + r() * 5, i, col, slide: r() < 0.5 ? -1 : 1, burn: i % 4 === 1 ? 49 + r() * 5 : null });
  }
}
/* ---------- pedestrians ---------- */
const people = [];
{
  const r = rng(52);
  for (let i = 0; i < 60; i++) {
    const pr = makePerson(r), g = pr.g; NO_SHADOW(g); g.scale.setScalar(0.94 + r() * 0.1); scene.add(g);
    const cross = i % 6 === 0, side = r() < 0.5 ? -1 : 1, ci = Math.floor(r() * 5);
    people.push({ g, legs: pr.legs, arms: pr.arms, side, cross, z0: cross ? INTS[ci] + 11.4 + (r() - 0.5) * 2 : 12 - r() * 330, x0: cross ? (r() - 0.5) * 24 : side * (AVE + 1.8 + r() * 3.8), dirv: r() < 0.5 ? -1 : 1, sp: 1.0 + r() * 0.7, ph: r() * 6.28, fallT: 24.4 + r() * 3, fx: (r() - 0.5) * 1.6, runT: 31 + r() * 5, run: r() < 0.45 });
  }
}
/* ---------- the person we are: a hand with a coffee ---------- */
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
const hand = new THREE.Group(); camera.add(hand);
const skin = new THREE.MeshLambertMaterial({ color: 0xd2a285 });
const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0x2f3a4a })); sleeve.rotation.x = Math.PI / 2 - 0.35; sleeve.position.set(0.05, -0.13, 0.28); hand.add(sleeve);
const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.1, 10), skin); wrist.rotation.x = Math.PI / 2 - 0.3; wrist.position.set(0.03, -0.065, 0.0); hand.add(wrist);
const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.09), skin); palm.position.set(0.02, -0.03, -0.075); hand.add(palm);
for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.03, 4, 8), skin); fg.rotation.z = Math.PI / 2; fg.position.set(-0.04, 0.05 - f * 0.024, -0.14); fg.rotation.y = 0.5 - f * 0.1; hand.add(fg); }
const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 4, 8), skin); thumb.position.set(0.05, 0.06, -0.12); thumb.rotation.set(0.3, 0, 0.6); hand.add(thumb);
const mug = new THREE.Group();
{
  const cm = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.105, 18), cm); mug.add(body);
  const sleeveC = new THREE.Mesh(new THREE.CylinderGeometry(0.0415, 0.0365, 0.05, 18), new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 })); sleeveC.position.y = -0.01; mug.add(sleeveC);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.041, 0.012, 18), new THREE.MeshStandardMaterial({ color: 0x26211c, roughness: 0.5 })); lid.position.y = 0.058; mug.add(lid);
}
mug.position.set(-0.012, 0.03, -0.12); mug.scale.setScalar(0.95); hand.add(mug);
hand.position.set(0.19, -0.27, -0.5); hand.rotation.set(0.15, 0.2, -0.05);
const mugW = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.105, 14), new THREE.MeshLambertMaterial({ color: 0xf4f1ea })); mugW.visible = false; scene.add(mugW);
const CUPS = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03 + hash2(i, 5) * 0.03, 0.006, 0.025 + hash2(i, 6) * 0.03), new THREE.MeshLambertMaterial({ color: 0xf4f1ea })); m.visible = false; scene.add(m); return { m, vx: (hash2(i, 7) - 0.5) * 1.6, vz: (hash2(i, 8) - 0.5) * 1.6, vy: 0.6 + hash2(i, 9) * 1.2 }; });

/* ---------- falling glass + facade chunks + cracks ---------- */
const SHARDS_N = 520, shards = [];
{
  const r = rng(808), pool = buildings.filter((b) => b.z < 20 && b.z > -240);
  for (let i = 0; i < SHARDS_N; i++) { const b = pool[Math.floor(r() * pool.length)]; shards.push({ b, t0: 23.5 + r() * 14, y0: 10 + r() * Math.min(60, b.h - 10), oz: (r() - 0.5) * b.d, s: 0.35 + r() * 0.8, spin: (r() - 0.5) * 9, drift: 0.5 + r() * 3 }); }
}
const shardMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xcfefff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), SHARDS_N);
shardMesh.frustumCulled = false; scene.add(shardMesh);
const CHUNK_N = SHEDS.length * 30, chunks = [];
{
  const r = rng(909); SHEDS.forEach((b, bi) => { for (let k = 0; k < 30; k++) chunks.push({ b, t0: 25.5 + bi * 1.1 + r() * 3, y0: Math.min(b.h, 14 + r() * 40), oz: (r() - 0.5) * b.d, sx: 0.15 + r() * 0.6, sy: 0.12 + r() * 0.4, sz: 0.15 + r() * 0.5, drift: 1 + r() * 9, spin: (r() - 0.5) * 8, col: r() < 0.65 ? 0x7a3a2c : 0xb5aa98 }); });
}
const chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), CHUNK_N);
chunkMesh.frustumCulled = false; chunkMesh.castShadow = true; scene.add(chunkMesh);
{ const c = new THREE.Color(); chunks.forEach((d, i) => chunkMesh.setColorAt(i, c.set(d.col).multiplyScalar(0.85 + hash2(i, 5) * 0.3))); }
const crackMat = new THREE.MeshBasicMaterial({ color: 0x0c0907 });
const cracks = [];
{
  const r = rng(321);
  for (const [x0, z0] of [[-12, -14], [-12, -48], [12, -86], [-12, -130], [12, -172]]) { let x = x0, z = z0; const dir = x0 < 0 ? 1 : -1; for (let k = 0; k < 9; k++) { const len = 2.6 + r() * 2.4, m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), crackMat); const dx = dir * len, dz = (r() - 0.5) * 3; m.position.set(x + dx / 2, 0.06, z + dz / 2); m.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; m.visible = false; scene.add(m); cracks.push({ m, len: Math.hypot(dx, dz), k, w: 0.05 + r() * 0.1 }); x += dx; z += dz; } }
}
const PIG_N = 180;
const pigeons = pointsLayer(PIG_N, 3, 0x2a2a2e, () => 0); pigeons.pts.material.sizeAttenuation = false; pigeons.pts.material.size = 2.8; pigeons.pts.material.fog = false;
const PIG = Array.from({ length: PIG_N }, (_, i) => ({ x: (hash2(i, 1) - 0.5) * 30, z: 6 - hash2(i, 2) * 150, vx: (hash2(i, 3) - 0.5) * 10, vz: -4 - hash2(i, 4) * 8, vy: 6 + hash2(i, 5) * 8, ph: hash2(i, 6) * 6 }));
// fires + embers once the sky heats up
const NBF = 22;
const BFIRE = Array.from({ length: NBF }, (_, i) => { const b = buildings.filter((q) => q.z < 0 && q.z > -360)[Math.floor(hash2(i, 31) * 60)] || buildings[i]; return { x: b.x - b.side * (DEPTH / 2 + 0.3), y: 6 + hash2(i, 32) * 30, z: b.z + (hash2(i, 33) - 0.5) * b.d, t0: 49.5 + hash2(i, 34) * 6, ph: hash2(i, 35) * 6.28 }; });
const bfGlow = pointsLayer(NBF, 16, 0xff6a20, () => 0); bfGlow.pts.material.blending = THREE.AdditiveBlending; bfGlow.pts.material.fog = false;
const carGlow = pointsLayer(cars.length, 12, 0xff7a24, () => 0); carGlow.pts.material.blending = THREE.AdditiveBlending; carGlow.pts.material.fog = false;
const EMB_N = 600;
const embers = pointsLayer(EMB_N, 2.2, 0xff8a30, () => 0); embers.pts.material.blending = THREE.AdditiveBlending; embers.pts.material.fog = false;
const EMB = Array.from({ length: EMB_N }, (_, i) => ({ x: (hash2(i, 11) - 0.5) * 50, z: 20 - hash2(i, 12) * 140, y0: hash2(i, 13) * 60, sp: 1 + hash2(i, 14) * 4, ph: hash2(i, 15) }));

/* ------------------------------------------------------------------ *
 *  Update (t = master time)
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
const SKY_H = [[0, 0xe9dcc4], [40, 0xe9dcc4], [46, 0xd8b890], [50, 0xd4651f], [56, 0xe5502a]];
const SKY_T = [[0, 0x4f8fd8], [40, 0x4f8fd8], [46, 0x6f7a9a], [50, 0x5a2a2a], [56, 0x3a1412]];
function shakeEnv(t) {
  const e = smooth((t - 24.2) / 1.2) * (1 - smooth((t - 38) / 8)) * (0.78 + 0.22 * Math.sin(t * 2.3));
  const pw = smooth((t - 22) / 0.2) * (1 - smooth((t - 22.9) / 0.9)) * 0.2;
  return Math.max(e, pw);
}
const EJ_N = 320;
const EJ = Array.from({ length: EJ_N }, (_, i) => ({ x: -500 + hash2(i, 41) * 1000, y: 160 + hash2(i, 42) * 900, z: -200 - hash2(i, 43) * 1500, ph: hash2(i, 44) }));
const ejecta = pointsLayer(EJ_N * 14, 20, 0xff9a50, () => 0); ejecta.pts.material.blending = THREE.AdditiveBlending; ejecta.pts.material.fog = false;
let curT = 0;
function update(Tm) {
  pc = 0;
  const t = Tm, E = shakeEnv(t);
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.cloudAmt.value = kf(t, [[0, 0.9], [44, 0.7], [54, 0.2]]); skyMat.uniforms.time.value = t;
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [44, 1], [52, 0.2]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00045], [26, 0.0008], [44, 0.0011], [56, 0.0016]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [44, 1.0], [56, 1.12]]);
  setSun(kf(t, [[0, 52], [44, 48], [56, 30]]));
  sun.intensity = Math.PI * kf(t, [[0, 3.0], [44, 2.8], [50, 1.5], [56, 0.9]]);
  kfc(t, [[0, 0xfff0d0], [44, 0xffe6c0], [50, 0xff8a50], [56, 0xff5a30]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [30, 0.9], [44, 0.85], [56, 0.55]]);
  hemi.color.copy(horC).lerp(topC, 0.55); hemi.groundColor.set(0x6a6258);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.05], [44, 1.0], [56, 0.95]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [44, 1.06], [56, 1.1]]).toFixed(3)})`;

  /* walk down the avenue, stop at the first tremor, then get thrown around */
  const walk = 1 - smooth((t - 21.2) / 0.9);
  const wz = lerp(26, 3.0, smooth(t / 21.8) * 0.93 + 0.0) + 0.0, wx = 15.4 + Math.sin(t * 0.3) * 0.35 * walk;
  const kneel = smooth((t - 27.0) / 1.4) * (1 - smooth((t - 44) / 3)) * 0.85;
  const bob = walk * 0.04 * Math.sin(t * 11.0) + (1 - walk) * 0.004 * Math.sin(t * 1.5);
  const sh = (a, b) => Math.sin(t * a + b);
  rig.position.set(wx + E * 0.12 * (sh(17.3, 1) + 0.6 * sh(9.7, 2)), 1.7 - 0.7 * kneel + bob + E * 0.07 * (sh(23.1, 4) + 0.5 * sh(12.4, 5)), wz + E * 0.1 * (sh(13.7, 6) + 0.5 * sh(27, 7)));
  rig.rotation.set(E * 0.03 * sh(7.7, 8), E * 0.02 * sh(5.9, 9), E * 0.05 * sh(6.1, 10) + walk * 0.01 * Math.sin(t * 5.5));
  const yaw = kf(t, [[0, 6], [8, 3], [14, 1], [21.5, 2], [23, 10], [26, 22], [30, 8], [35, 12], [42, 5], [48, 2], [58, 0]]);
  const pitch = kf(t, [[0, 1], [9, 3], [15, 4], [21.5, 5], [23, 12], [26, 18], [32, 4], [38, -6], [44, 4], [47, 16], [52, 22], [57, 20]]);
  const roll = kf(t, [[0, 0], [24, 0], [26, 4], [29, -5], [34, 3], [40, 0]]) * E;
  camera.position.set(0, 0, 0); camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(pitch) + 0.002 * sh(1.3, 1) + E * 0.03 * sh(14, 2), THREE.MathUtils.degToRad(yaw) + 0.003 * sh(0.8, 2) + E * 0.03 * sh(11, 4), THREE.MathUtils.degToRad(roll) + 0.002 * sh(1.1, 3));
  const fov = kf(t, [[0, 66], [24, 66], [40, 66], [58, 68]]); if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);
  // hand + mug: held low while walking; dropped at the S-wave
  const dropT = 24.8, held = t < dropT;
  mug.visible = held;
  hand.position.set(0.19 + 0.012 * Math.sin(t * 11.0) * walk + E * 0.03 * sh(19, 3), -0.27 + 0.014 * Math.sin(t * 11.0 + 1) * walk - kf(t, [[24.4, 0], [25.2, 0.1], [27, 0.2], [60, 0.2]]), -0.5 + kf(t, [[0, 0], [24.4, 0], [25.6, 0.1], [60, 0.1]]));
  hand.rotation.set(0.15 + kf(t, [[24.4, 0], [25.6, -0.5], [27, -0.3]]), 0.2, -0.05 + kf(t, [[24.4, 0], [25.6, 0.5]]));
  if (held) for (let q = 0; q < 3; q++) { const ph = fmod(t * 0.9 + q / 3, 1), wp = new THREE.Vector3(0.0, 0.08 + ph * 0.16, 0); mug.localToWorld(wp); addPuff(wp.x, wp.y, wp.z, 0.04 + ph * 0.06, q, 1, 1, 1, 0.15 * (1 - ph) * smooth(t / 1.0)); }
  if (t >= dropT) {
    const s = t - dropT, x0 = rig.position.x + 0.2, z0 = rig.position.z - 0.5, y0 = rig.position.y - 0.4, g = 0.2;
    const y = y0 - 4.9 * s * s, hit = y <= g, sT = Math.sqrt(Math.max(0, (y0 - g) / 4.9));
    mugW.visible = !hit; mugW.position.set(x0, Math.max(g, y), z0); mugW.rotation.set(s * 3, 0, s * 4);
    CUPS.forEach((c) => { c.m.visible = hit; if (hit) { const u = s - sT; c.m.position.set(x0 + c.vx * Math.min(u, 0.5) * 0.7, 0.19 + Math.max(0, c.vy * u - 4.9 * u * u) * 0.25, z0 + c.vz * Math.min(u, 0.5) * 0.7); c.m.rotation.set(0, c.vx * 3, 0); } });
  } else { mugW.visible = false; CUPS.forEach((c) => { c.m.visible = false; }); }
  drawAd(Tm);
  /* signals die, traffic stops */
  for (const s of SIGNALS) { const ph = fmod(t * 0.12 + s.z0 * 0.01, 1); const alive = t < 25; s.lamp.material.color.set(!alive ? 0x1a1a1a : ph < 0.55 ? 0x35e07a : ph < 0.65 ? 0xf1c232 : 0xe03a3a); }
  /* buildings: sway slightly with the long-period waves */
  for (const b of buildings) { const sw = E * (0.0006 + 0.00003 * b.h) * Math.sin(t * 1.4 + b.seed); b.g.rotation.set(0, 0, sw * (b.side)); b.g.position.x = b.x + E * 0.05 * Math.sin(t * 9 + b.seed); }
  /* vehicles: drive, brake at the P-wave, jolt, some burn out */
  let nBurnC = 0;
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i], tb = 22.0, drive = t < tb ? t : tb + 0.9 * (1 - Math.exp(-(t - tb) / 0.9));
    let z = fmod(c.z0 + c.dir * c.v * drive + 760, 800) - 760 + 40;
    let x = c.lane, yaw = c.dir > 0 ? Math.PI : 0;
    if (c.slide) { const sp = smooth((t - 24.6) / 2.6); x += c.slide * sp * (0.6 + (c.i % 3) * 0.5); yaw += c.slide * sp * (0.12 + 0.1 * (c.i % 4)); }
    c.g.position.set(x + E * 0.12 * Math.sin(t * 13 + c.i), 0.05 + E * 0.05 * Math.abs(Math.sin(t * 15 + c.i)), z);
    c.g.rotation.set(E * 0.02 * Math.sin(t * 11 + c.i), yaw, E * 0.025 * Math.sin(t * 9 + c.i));
    const burn = c.burn === null ? 0 : smooth((t - c.burn) / 1.2);
    if (burn > 0.02) {
      nBurnC++; carGlow.pos[i * 3] = x; carGlow.pos[i * 3 + 1] = 1.6; carGlow.pos[i * 3 + 2] = z;
      const fl = 0.8 + 0.2 * Math.sin(t * 19 + c.i * 5);
      for (let q = 0; q < 5; q++) { const u = q / 5; addPuff(x + Math.sin(t * 0.8 + c.i + q) * 0.8 + q * 0.8, 1.6 + q * 3.2, z + Math.cos(t * 0.7 + q) * 0.6, 2.2 + q * 2.4, c.i + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.45 * fl : 0.34 * (1 - u * 0.7)) * burn); }
    } else carGlow.pos[i * 3 + 1] = -60;
  }
  carGlow.geo.attributes.position.needsUpdate = true; carGlow.pts.material.opacity = 0.9;
  /* pedestrians: walk, freeze at the P-wave, fall at the S-wave, some run */
  for (const p of people) {
    const tt = Math.min(t, 22.0);
    let x, z, face;
    if (p.cross) { x = fmod(p.x0 + p.dirv * p.sp * tt + 13, 26) - 13; z = p.z0; face = p.dirv > 0 ? -Math.PI / 2 : Math.PI / 2; face = p.dirv > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = p.x0; z = fmod(p.z0 + p.dirv * p.sp * tt + 340, 360) - 340 + 30; face = p.dirv > 0 ? Math.PI : 0; }
    const f = smooth((t - p.fallT) / 0.45) * (1 - smooth((t - p.runT + 1.2) / 1.0)), moving = t < 22.0;
    let sw = moving ? Math.sin(tt * 6.2 + p.ph) * 0.45 : 0;
    if (t > p.runT && p.run) { const rt = t - p.runT; z += -4.2 * rt * (p.dirv > 0 ? -1 : 1) * 0.0 + p.dirv * 3.6 * rt; sw = Math.sin(t * 11 + p.ph) * 0.8; face = p.dirv > 0 ? Math.PI : 0; }
    p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8;
    if (!moving && f > 0 && f < 1) { p.arms[0].rotation.x = -1.5 * f; p.arms[1].rotation.x = -1.5 * f; }
    p.g.position.set(x + E * 0.1 * Math.sin(t * 14 + p.ph) + p.fx * f * 0.6, 0.16 - 0.18 * f, z);
    p.g.rotation.set(-1.5 * f, face, (p.fx > 0 ? 1 : -1) * 0.3 * f + E * 0.03 * Math.sin(t * 12 + p.ph));
  }
  /* cracks */
  for (const c of cracks) { const w = c.w * smooth((t - 24.5 - c.k * 0.12) / 1.6) * (1 + 0.5 * smooth((t - 30) / 8)); c.m.visible = w > 0.01; c.m.scale.set(c.len * 1.04, 1, w); }
  /* glass rain */
  for (let i = 0; i < SHARDS_N; i++) {
    const h = shards[i], s = t - h.t0;
    if (s < 0 || s > 7) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else { const y = h.y0 - 0.5 * 9.8 * s * s; dummy.position.set(h.b.x - h.b.side * (h.b.w / 2 + h.drift * s), Math.max(0.2, y), h.b.z + h.oz); dummy.scale.set(h.s, h.s, 1); dummy.rotation.set(s * h.spin, s * h.spin * 0.7, s * h.spin * 0.4); }
    dummy.updateMatrix(); shardMesh.setMatrixAt(i, dummy.matrix);
  }
  shardMesh.instanceMatrix.needsUpdate = true;
  /* facade chunks */
  for (let i = 0; i < CHUNK_N; i++) {
    const d = chunks[i], s = t - d.t0;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else { const y = d.y0 - 0.5 * 9.8 * s * s, g = 0.25 * d.sy; dummy.position.set(d.b.x - d.b.side * (d.b.w / 2 + 0.6 + d.drift * Math.min(s, 1.6)), Math.max(g + 0.1, y), d.b.z + d.oz); dummy.scale.set(d.sx, d.sy, d.sz); dummy.rotation.set(Math.min(s, 2.4) * d.spin, Math.min(s, 2.4) * d.spin * 0.6, 0); }
    dummy.updateMatrix(); chunkMesh.setMatrixAt(i, dummy.matrix);
  }
  chunkMesh.instanceMatrix.needsUpdate = true;
  /* dust where chunks land and along the street */
  const dust = smooth((t - 25) / 2) * (1 - smooth((t - 44) / 10));
  SHEDS.forEach((b, bi) => { const sT = t - (25.5 + bi * 1.1 + 1.6); if (sT < 0 || sT > 9) return; const a = 0.5 * Math.exp(-sT * 0.45) * clamp(sT * 2.2); for (let k = 0; k < 9; k++) { const hx = hash2(bi * 9 + k, 1) - 0.5, hh = hash2(bi * 9 + k, 3); addPuff(b.x - b.side * (b.w / 2 + 2 + hx * 8), 1 + hh * 5 + sT * 1.8, b.z + (hash2(bi * 9 + k, 2) - 0.5) * b.d, 6 + hh * 6 + sT * 3, hx * 2, 0.7, 0.64, 0.56, a); } });
  if (dust > 0.01) for (let i = 0; i < 34; i++) { const zz = 4 - fmod(hash2(i, 3) * 200 + (t - 24) * 3, 200); addPuff((hash2(i, 1) - 0.5) * 24 + Math.sin(t * 0.3 + i) * 3, 2 + hash2(i, 2) * 12, zz, 10 + hash2(i, 4) * 14, i, 0.68, 0.6, 0.52, 0.2 * dust); }
  /* steam stack */
  for (let k = 0; k < 26; k++) { const ph = fmod(t * 0.22 + k / 26, 1), w = 1.6 + ph * 7; addPuff(steam.x + Math.sin(t * 0.5 + k) * 0.7 + ph * 5, 3.2 + ph * 26, steam.z + Math.cos(k) * 0.6, w, k, 0.97, 0.97, 0.97, 0.5 * (1 - ph) * clamp(ph * 5)); }
  /* pigeons burst up at the P-wave */
  const bt = t - 22.0;
  for (let i = 0; i < PIG_N; i++) { const b = PIG[i]; if (bt < 0 || bt > 16) { pigeons.pos[i * 3 + 1] = -200; continue; } pigeons.pos[i * 3] = b.x + b.vx * bt + Math.sin(bt * 4 + b.ph) * 1.2; pigeons.pos[i * 3 + 1] = 2 + b.vy * Math.min(bt, 4) + Math.sin(bt * 6 + b.ph) * 0.7; pigeons.pos[i * 3 + 2] = b.z + b.vz * bt; }
  pigeons.geo.attributes.position.needsUpdate = true; pigeons.pts.material.opacity = 0.9 * (1 - smooth((bt - 12) / 4));
  /* clouds */
  { const ca = 1 - smooth((t - 40) / 8); if (ca > 0.01) for (let c = 0; c < 8; c++) { const cx = (hash2(c, 21) - 0.5) * 900, cy = 380 + hash2(c, 22) * 260, cz = -1500 - hash2(c, 23) * 900, cw = 130 + hash2(c, 24) * 160; for (let k = 0; k < 8; k++) { const ox = (hash2(c * 9 + k, 31) - 0.5) * cw * 2.2, oy = (hash2(c * 9 + k, 32) - 0.35) * cw * 0.5, sz = cw * (0.55 + hash2(c * 9 + k, 33) * 0.7); const L = 0.97 - Math.max(0, -oy / cw) * 0.14; addPuff(cx + ox + t * 3, cy + oy, cz, sz, hash2(c * 9 + k, 35) * 0.5 - 0.25, L, L * 0.98, L * 0.94, 0.72 * ca); } } }
  /* the sky heats up: embers fall, fires start in the towers */
  const hot = smooth((Tm - 47) / 4);
  embers.pts.material.opacity = 0.9 * hot;
  if (hot > 0.01) for (let i = 0; i < EMB_N; i++) { const e = EMB[i], y = 60 - fmod(e.y0 + t * e.sp * 3, 62); embers.pos[i * 3] = e.x + Math.sin(t * 0.7 + e.ph * 6) * 3; embers.pos[i * 3 + 1] = Math.max(0.2, y); embers.pos[i * 3 + 2] = e.z + Math.cos(t * 0.6 + e.ph * 5) * 2.5; }
  embers.geo.attributes.position.needsUpdate = true;
  for (let i = 0; i < NBF; i++) {
    const f = BFIRE[i], burn = smooth((Tm - f.t0) / 1.4);
    if (burn <= 0.02) { bfGlow.pos[i * 3 + 1] = -200; continue; }
    bfGlow.pos[i * 3] = f.x; bfGlow.pos[i * 3 + 1] = f.y; bfGlow.pos[i * 3 + 2] = f.z;
    const fl = 0.8 + 0.2 * Math.sin(Tm * 17 + f.ph * 7);
    for (let q = 0; q < 6; q++) { const u = q / 6; addPuff(f.x - Math.sign(f.x) * (q * 0.5), f.y + 2 + q * 8, f.z + Math.cos(Tm * 0.7 + q) * 1.5, 5 + q * 5, f.ph + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.5 * fl : 0.36 * (1 - u * 0.7)) * burn); }
  }
  bfGlow.geo.attributes.position.needsUpdate = true; bfGlow.pts.material.opacity = 0.9;
