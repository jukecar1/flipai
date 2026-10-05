
/* ------------------------------------------------------------------ *
 *  City at dusk -> night -> day -> dusk (24 h in ~46 s), seen from a balcony
 * ------------------------------------------------------------------ */
const NO_SHADOW = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x3a3a44, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.castShadow = false;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 900, cy * 900, cz * 900);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}
renderer.shadowMap.enabled = false;

// ---- clock: scene hour h (offline hours); h<0 is the minutes before the outage
const T_OUT = 9.0, T_BACK = 55.0;
const hourOf = (T) => (T < T_OUT ? -0.45 + 0.45 * (T / T_OUT) : clamp((T - T_OUT) / (T_BACK - T_OUT)) * 24);
const localOf = (h) => (((18 + h) % 24) + 24) % 24; // 6:00 PM when the outage starts
const fmtClock = (L) => { const hh = Math.floor(L), mm = Math.floor((L - hh) * 60); const h12 = ((hh + 11) % 12) + 1; return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`; };
const sunElev = (h) => { const L = localOf(h); return L >= 6 && L <= 18 ? 58 * Math.sin((Math.PI * (L - 6)) / 12) + 1.5 : -12; };
const nightF = (h) => 1 - smooth((sunElev(h) + 3) / 12);

const SKY_H = [[-0.45, 0xf4b078], [0, 0xf0a070], [0.8, 0x8a5662], [1.7, 0x242b44], [3, 0x161c30], [10.5, 0x141a2c], [11.6, 0x3a3f5c], [12.6, 0xf0b080], [14, 0xe8d8c0], [18, 0xcfe0f0], [22, 0xe8d8b8], [24, 0xf0a070]];
const SKY_T = [[-0.45, 0x4a6a9a], [0, 0x3a5a8a], [0.8, 0x1c2a4a], [1.7, 0x0a1020], [3, 0x070b16], [10.5, 0x070b16], [11.6, 0x141c34], [12.6, 0x5f7fb0], [14, 0x5f95d6], [18, 0x3f7fd0], [22, 0x5a8ed0], [24, 0x3a5a8a]];

/* ---------- towers ---------- */
function winMaps(variant) {
  const r = rng(900 + variant), cols = 4, rows = 6, cw = 64, rh = 64;
  const W = cols * cw, H = rows * rh, wallHex = [0x3a4458, 0x4b4f58, 0x5a5048, 0x2f3a46, 0x56606c, 0x44403c][variant % 6];
  const c = mkCanvas(W, H), x = c.getContext('2d'), e = mkCanvas(W, H), ex = e.getContext('2d');
  x.fillStyle = shade(wallHex, 1); x.fillRect(0, 0, W, H);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const litP = 0.32 + (variant % 3) * 0.12;
  for (let ro = 0; ro < rows; ro++) for (let co = 0; co < cols; co++) {
    const wx = co * cw + 5, wy = ro * rh + 8, ww = cw - 10, wh = rh - 20;
    const g = x.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, '#6f8aa6'); g.addColorStop(1, '#2d3c50');
    x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(wx, wy, ww, 3);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh);
    if (r() < litP) {
      const warm = r() < 0.7, v = 0.55 + r() * 0.45;
      ex.fillStyle = warm ? `rgb(${255 * v},${200 * v},${120 * v})` : `rgb(${200 * v},${225 * v},${255 * v})`;
      ex.fillRect(wx, wy, ww, wh);
    }
  }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`; x.fillRect(r() * W, r() * H, 2, 2); }
  x.fillStyle = 'rgba(0,0,0,.28)'; for (let ro = 0; ro < rows; ro++) x.fillRect(0, ro * rh, W, 2);
  const map = toTex(c), em = toTex(e); map.anisotropy = 4; em.anisotropy = 4;
  return { map, em };
}
const TOWER_MATS = Array.from({ length: 6 }, (_, v) => { const { map, em } = winMaps(v); return new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0.0 }); });
const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a3b40 });
const TILE_W = 16, TILE_H = 24;
function tower(w, h, d, variant) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const uv = g.attributes.uv, fw = [d, d, 0, 0, w, w];
  for (let f = 0; f < 6; f++) { if (f === 2 || f === 3) continue; for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * (fw[f] / TILE_W), uv.getY(i) * (h / TILE_H)); } }
  const m = TOWER_MATS[variant % 6];
  return new THREE.Mesh(g, [m, m, roofMat, roofMat, m, m]);
}
const PITCH = 78, TOWERS = [];
{
  const r = rng(404);
  for (let j = 1; j <= 20; j++) for (let i = -7; i <= 7; i++) {
    if (r() < 0.07) continue;
    const core = Math.exp(-((i * i) / 20 + ((j - 10) * (j - 10)) / 34));
    const h = 20 + 175 * core * (0.3 + 0.7 * r()) + r() * 28 + (j > 14 ? 10 : 0);
    const w = 32 + r() * 16, d = 32 + r() * 16;
    const x = i * PITCH + (r() - 0.5) * 8, z = -j * PITCH + (r() - 0.5) * 8;
    const m = tower(w, h, d, Math.floor(r() * 6)); m.position.set(x, 0, z); scene.add(m);
    if (h > 60 && r() < 0.6) { const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 8 + r() * 10, d * 0.55), roofMat); cap.position.set(x, h + 4, z); scene.add(cap); }
    TOWERS.push({ x, z, w, d, h, j, i });
  }
}
// ground and streets
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshLambertMaterial({ color: 0x1c1e24 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const sm = new THREE.MeshLambertMaterial({ color: 0x34363e });
  for (let j = 0; j <= 21; j++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1500, 16), sm); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.06, -j * PITCH + PITCH / 2); scene.add(m); }
  for (let i = -8; i <= 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 1700), sm); m.rotation.x = -Math.PI / 2; m.position.set(i * PITCH + PITCH / 2, 0.06, -800); scene.add(m); }
}
/* street lamps + traffic (points) */
const lamps = pointsLayer(3200, 5.5, 0xffc880, () => 0);
{
  let n = 0;
  for (let j = 0; j <= 21 && n < 3100; j++) for (let x = -560; x <= 560 && n < 3100; x += 26) { lamps.pos.set([x, 9, -j * PITCH + PITCH / 2 + 7], n * 3); n++; }
  for (let i = -8; i <= 8 && n < 3100; i++) for (let z = -40; z >= -1620 && n < 3100; z -= 26) { lamps.pos.set([i * PITCH + PITCH / 2 + 7, 9, z], n * 3); n++; }
  lamps.geo.setDrawRange(0, n); lamps.geo.attributes.position.needsUpdate = true; lamps.pts.material.fog = false;
}
const NCARS = 900;
const heads = pointsLayer(NCARS, 4.2, 0xfff0d6, (i) => i), tails = pointsLayer(NCARS, 3.6, 0xff3a28, (i) => i);
const CARS = Array.from({ length: NCARS }, (_, i) => { const r = rng(2000 + i); return { row: r() < 0.5, line: Math.floor(r() * 20), lane: (r() < 0.5 ? -1 : 1) * (2 + r() * 3), v: 14 + r() * 20, ph: r() * 3000, dir: r() < 0.5 ? 1 : -1 }; });
heads.pts.material.fog = tails.pts.material.fog = false;
/* stars */
const stars = pointsLayer(1400, 6, 0xffffff, () => 0);
{ const r = rng(7); for (let i = 0; i < 1400; i++) { const u = r() * 6.283, v = 0.08 + r() * 0.92, rr = 5200; stars.pos.set([Math.cos(u) * Math.sqrt(1 - v * v) * rr, v * rr, Math.sin(u) * Math.sqrt(1 - v * v) * rr - 800], i * 3); } stars.geo.attributes.position.needsUpdate = true; stars.pts.material.fog = false; }
/* tower beacons */
const beacons = pointsLayer(80, 7, 0xff3030, () => 0);
{ let n = 0; for (const t of TOWERS) if (t.h > 110 && n < 80) { beacons.pos.set([t.x, t.h + 14, t.z], n * 3); n++; } beacons.geo.setDrawRange(0, n); beacons.geo.attributes.position.needsUpdate = true; beacons.pts.material.fog = false; }

/* billboards: the only things in the scene that visibly fail */
const billCanvas = mkCanvas(512, 256), bctx = billCanvas.getContext('2d');
const billTex = new THREE.CanvasTexture(billCanvas); billTex.colorSpace = THREE.SRGBColorSpace;
const billMat = new THREE.MeshBasicMaterial({ map: billTex, fog: false });
const billTargets = TOWERS.filter((t) => t.h > 70 && t.j >= 4 && t.j <= 12 && Math.abs(t.i) <= 4).sort((a, b) => a.z - b.z).slice(0, 14);
const billMeshes = [];
for (const t of billTargets.filter((_, k) => k % 2 === 0).slice(0, 7)) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), billMat);
  m.position.set(t.x, Math.min(t.h * 0.72, t.h - 12), t.z + t.d / 2 + 0.3); scene.add(m); billMeshes.push(m);
}
const ADS = ['STREAM NOW', 'WATCH LIVE', 'FLASH SALE', 'RIDE HOME', 'ORDER IN', 'PLAY'];
function drawBill(T) {
  const W = 512, H = 256, W2 = T >= T_OUT && T < T_BACK;
  if (!W2) {
    const k = Math.floor(T * 0.9 + (T >= T_BACK ? 3 : 0)), ph = (T * 0.9) % 1;
    const hue = (k * 67) % 360;
    const g = bctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, `hsl(${hue},80%,52%)`); g.addColorStop(1, `hsl(${(hue + 60) % 360},85%,40%)`);
    bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
    bctx.fillStyle = 'rgba(255,255,255,.9)'; bctx.font = '700 64px "Helvetica Neue", Arial, "Liberation Sans", sans-serif'; bctx.textAlign = 'center'; bctx.fillText(ADS[k % ADS.length], W / 2 + (1 - smooth(ph * 3)) * 30, H / 2 + 22);
    bctx.fillStyle = 'rgba(255,255,255,.35)'; bctx.fillRect(0, H - 14, W * ph, 6);
  } else if (T < T_OUT + 0.5) {
    const id = bctx.createImageData(W, H), r = rng(Math.floor(T * 60));
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    bctx.putImageData(id, 0, 0);
  } else {
    const bars = ['#c8c8c8', '#c8c800', '#00c8c8', '#00c800', '#c800c8', '#c80000', '#0000c8'];
    bars.forEach((c, i) => { bctx.fillStyle = c; bctx.fillRect((i * W) / 7, 0, W / 7 + 1, H * 0.7); });
    bctx.fillStyle = '#10131a'; bctx.fillRect(0, H * 0.7, W, H * 0.3);
    bctx.fillStyle = '#f4f1ea'; bctx.font = '700 46px "Helvetica Neue", Arial, "Liberation Sans", sans-serif'; bctx.textAlign = 'center';
    if (Math.sin(T * 3) > -0.6) bctx.fillText('NO SIGNAL', W / 2, H * 0.7 + 66);
  }
  billTex.needsUpdate = true;
}

/* ------------------------------------------------------------------ *
 *  Update
 * ------------------------------------------------------------------ */
const CAM = new THREE.Vector3(0, 128, 30);
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
function update(T) {
  pc = 0;
  const h = hourOf(T), nf = nightF(h), elev = sunElev(h);
  kfc(h, SKY_H, horC); kfc(h, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.sunAmt.value = elev > -3 ? 1 : 0;
  scene.fog.color.copy(horC).lerp(tmpC.set(0x0a0d18), nf * 0.4);
  scene.fog.density = 0.00042 + 0.0001 * nf;
  setSun(Math.max(elev, -8));
  sun.intensity = Math.PI * 2.8 * smooth((elev + 2) / 10);
  kfc(h, [[-0.45, 0xffb880], [0.5, 0xff9a60], [1.5, 0xff8050], [11.5, 0xff9060], [13, 0xffd0a0], [16, 0xfff0d8], [22, 0xffe0b8], [24, 0xffa070]], sun.color);
  hemi.intensity = Math.PI * (0.18 + 0.85 * (1 - nf));
  hemi.color.copy(horC).lerp(topC, 0.5); hemi.groundColor.set(0x30303a);
  renderer.toneMappingExposure = 1.0 + 0.1 * nf;
  for (const m of TOWER_MATS) m.emissiveIntensity = 1.6 * smooth(nf * 1.15);
  lamps.pts.material.opacity = 0.95 * nf; heads.pts.material.opacity = 0.35 + 0.65 * nf; tails.pts.material.opacity = 0.3 + 0.6 * nf;
  stars.pts.material.opacity = 0.9 * smooth((nf - 0.7) / 0.3); beacons.pts.material.opacity = (0.35 + 0.65 * (Math.sin(T * 5) > 0 ? 1 : 0)) * (0.4 + 0.6 * nf);
  for (let i = 0; i < NCARS; i++) {
    const c = CARS[i];
    const s = ((c.ph + c.dir * c.v * T * 1.0) % 1700 + 1700) % 1700;
    let x, z;
    if (c.row) { x = -750 + s * 0.88; z = -c.line * PITCH + PITCH / 2 + c.lane; }
    else { x = (c.line - 10) * PITCH * 0.8 + PITCH / 2 + c.lane; z = -s + 40; }
    const px = c.dir > 0 ? 1 : 0;
    heads.pos[i * 3] = x; heads.pos[i * 3 + 1] = 0.9; heads.pos[i * 3 + 2] = z;
    const back = c.row ? 1.6 : 0, back2 = c.row ? 0 : 1.6;
    tails.pos[i * 3] = x - c.dir * back * (px ? 1 : 1); tails.pos[i * 3 + 1] = 0.9; tails.pos[i * 3 + 2] = z + c.dir * back2;
  }
  heads.geo.attributes.position.needsUpdate = true; tails.geo.attributes.position.needsUpdate = true;
  drawBill(T);

  /* balcony camera, gentle drift */
  rig.position.set(CAM.x + Math.sin(T * 0.11) * 5, CAM.y + Math.sin(T * 0.07) * 1.2, CAM.z);
  camera.position.set(0, 0, 0);
  camera.rotation.order = 'YXZ';
  const shake = T > T_OUT && T < T_OUT + 0.45 ? (1 - (T - T_OUT) / 0.45) * 0.004 : 0;
  camera.rotation.set(THREE.MathUtils.degToRad(-4.5) + 0.0012 * Math.sin(T * 0.9) + shake * Math.sin(T * 90), THREE.MathUtils.degToRad(-8 + 7 * Math.sin(T * 0.08)) + shake * Math.cos(T * 77), 0);
  const fov = 56; if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);
  lamps.pts.material.size = 5.5; 
  flushSmoke();
}
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
