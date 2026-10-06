/* ------------------------------------------------------------------ *
 *  Lights
 * ------------------------------------------------------------------ */
const NO_SHADOW = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x7a6a58, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.target.position.set(0, 0, -150);
sun.castShadow = true;
sun.shadow.mapSize.set(+(P.get('shadow') ?? 2048), +(P.get('shadow') ?? 2048));
Object.assign(sun.shadow.camera, { left: -240, right: 240, top: 240, bottom: -240, near: 1, far: 1700 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 650, cy * 650, cz * 650 - 150);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}
const fmod = (a, n) => ((a % n) + n) % n;

/* ------------------------------------------------------------------ *
 *  Textures
 * ------------------------------------------------------------------ */
const detailTex = (() => {
  const c = mkCanvas(512, 512), x = c.getContext('2d'), r = rng(5);
  x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) { const v = 150 + r() * 105; x.fillStyle = `rgba(${v},${v},${v},.55)`; x.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 2600; i++) { x.strokeStyle = `rgba(${r() < 0.5 ? '40,40,40' : '255,255,255'},.18)`; x.lineWidth = 1; const a = r() * 512, b = r() * 512; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - 0.5) * 9, b + (r() - 0.5) * 9); x.stroke(); }
  return toTex(c);
})();
const asphaltTex = (() => {
  const c = mkCanvas(160, 256), x = c.getContext('2d'), r = rng(8);
  x.fillStyle = '#4a4a4f'; x.fillRect(0, 0, 160, 256);
  for (let i = 0; i < 7000; i++) { const v = 52 + r() * 40; x.fillStyle = `rgb(${v},${v},${v + 3})`; x.fillRect(r() * 160, r() * 256, 2, 2); }
  for (let i = 0; i < 10; i++) { x.strokeStyle = 'rgba(15,15,15,.3)'; x.lineWidth = 1; x.beginPath(); x.moveTo(r() * 160, r() * 256); x.lineTo(r() * 160, r() * 256); x.stroke(); }
  x.fillStyle = '#e8c53a'; x.fillRect(77, 20, 3, 80); x.fillRect(77, 148, 3, 80); x.fillRect(81, 20, 0, 0);
  x.fillStyle = 'rgba(235,235,235,.85)'; x.fillRect(6, 0, 2, 256); x.fillRect(152, 0, 2, 256);
  const t = toTex(c); t.repeat.set(1, 60); return t;
})();
const shingleTex = (() => {
  const c = mkCanvas(128, 128), x = c.getContext('2d'), r = rng(17);
  x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 16; row++) for (let col = 0; col < 8; col++) { const v = 170 + r() * 70; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(col * 16 + (row % 2) * 8 - 8, row * 8, 15, 7); }
  const t = toTex(c); t.repeat.set(3, 3); return t;
})();
function winTex(base, seed, floors, bays) {
  const w = 64 * bays, h = 64 * floors, c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = shade(base, 1); x.fillRect(0, 0, w, h);
  for (let k = 0; k < h / 8; k++) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, k * 8 + 6, w, 2); }
  for (let i = 0; i < 1000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.04})`; x.fillRect(r() * w, r() * h, 3, 3); }
  for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
    const wx = b * 64 + 12, wy = f * 64 + 12;
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(wx - 3, wy - 3, 44, 40);
    const g = x.createLinearGradient(0, wy, 0, wy + 34); g.addColorStop(0, '#8aa6bf'); g.addColorStop(1, '#2e3d51');
    x.fillStyle = g; x.fillRect(wx, wy, 38, 34);
    x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(wx, wy, 38, 8);
    x.fillStyle = 'rgba(244,240,230,.92)'; x.fillRect(wx + 18, wy, 2, 34); x.fillRect(wx, wy + 16, 38, 2);
  }
  return toTex(c);
}
const PASTELS = [0xe4d8c0, 0xd8b99a, 0xc9d6d8, 0xe9c8b4, 0xb7c9b4, 0xd7cfa8, 0xcdbcd0, 0xe6a98d, 0xf0ecdf, 0xa9c1d6, 0xd9c6a0, 0xc7b8a8];
const roofCols = [0x5b4e48, 0x4a4f55, 0x6b4a3c, 0x3d4650, 0x6d5a4a];
const roofMats = roofCols.map((c) => new THREE.MeshLambertMaterial({ color: c, map: shingleTex }));
function gableGeo(w, d, hgt) { // ridge along x, w long
  const g = new THREE.BufferGeometry(), hw = w / 2 + 0.6, hd = d / 2 + 0.6;
  const P_ = [[-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd], [-hw, hgt, 0], [hw, hgt, 0]];
  const idx = [[0, 1, 5], [0, 5, 4], [2, 3, 4], [2, 4, 5], [3, 0, 4], [1, 2, 5]];
  const pos = []; idx.forEach((t) => t.forEach((i) => pos.push(...P_[i])));
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const uvs = []; for (let i = 0; i < pos.length; i += 3) uvs.push(pos[i] / 6, (pos[i + 1] + pos[i + 2]) / 6);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals(); return g;
}

/* ------------------------------------------------------------------ *
 *  Ground, streets, sea on the horizon
 * ------------------------------------------------------------------ */
const STREET_Z0 = 70, STREET_Z1 = -900;
{
  const gm = new THREE.MeshLambertMaterial({ color: 0x6f8a52, map: detailTex }); detailTex.repeat.set(500, 500);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3600, 1900), gm); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -430); ground.receiveShadow = true; scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(10, STREET_Z0 - STREET_Z1), new THREE.MeshLambertMaterial({ map: asphaltTex })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.06, (STREET_Z0 + STREET_Z1) / 2); road.receiveShadow = true; scene.add(road);
  for (const zc of [-130, -300, -470]) { const cr = new THREE.Mesh(new THREE.PlaneGeometry(520, 8), new THREE.MeshLambertMaterial({ color: 0x4a4a4f, map: detailTex })); cr.rotation.x = -Math.PI / 2; cr.position.set(0, 0.055, zc); cr.receiveShadow = true; scene.add(cr); }
  const sw = new THREE.MeshLambertMaterial({ color: 0xbdb6aa, map: detailTex });
  for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, STREET_Z0 - STREET_Z1), sw); s.position.set(sx * 6.2, 0.08, (STREET_Z0 + STREET_Z1) / 2); s.receiveShadow = true; scene.add(s); }
  // sea and beach strip on the horizon
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(6000, 90), new THREE.MeshLambertMaterial({ color: 0xd9c8a4, map: detailTex })); beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.05, -945); scene.add(beach);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 5200), new THREE.MeshLambertMaterial({ color: 0x3f8fae, emissive: 0x0b2a38 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.3, -3600); scene.add(sea);
}

/* ------------------------------------------------------------------ *
 *  Houses
 * ------------------------------------------------------------------ */
const houses = [];
const FAILS = [
  { side: -1, z: -60, t: 17.0 }, { side: 1, z: -82, t: 18.4 }, { side: -1, z: -142, t: 19.8 }, { side: 1, z: -38, t: 22.4 },
  { side: 1, z: -190, t: 25.2 }, { side: -1, z: -228, t: 27.4 }, { side: 1, z: -112, t: 30.0 }, { side: -1, z: -104, t: 33.0 }, { side: -1, z: -30, t: 35.0 },
];
function addHouse(side, z, row, r) {
  const wz = 13 + r() * 5, dx = 11 + r() * 3, floors = r() < 0.4 ? 2 : 1, h = floors * 3.1;
  const base = PASTELS[Math.floor(r() * PASTELS.length)], seed = Math.floor(r() * 9000);
  const tex = winTex(base, seed, floors, Math.max(2, Math.round(dx / 4.2))); const texS = winTex(base, seed + 1, floors, Math.max(2, Math.round(wz / 4.2)));
  const siding = new THREE.MeshLambertMaterial({ map: texS }), face = new THREE.MeshLambertMaterial({ map: tex });
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(dx, h, wz); geo.translate(0, h / 2, 0);
  const body = new THREE.Mesh(geo, [face, face, siding, siding, siding, siding]); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const rg = gableGeo(wz, dx, 2.6 + r() * 1.4); rg.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(rg, roofMats[Math.floor(r() * roofMats.length)]); roof.position.y = h; roof.castShadow = true; g.add(roof);
  const x = side * (row === 0 ? 17 + r() * 2 : 50 + r() * 6);
  g.position.set(x, 0, z); g.rotation.y = 0; scene.add(g);
  // driveway
  if (row === 0) { const dw = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3.2), new THREE.MeshLambertMaterial({ color: 0xb9b3a6, map: detailTex })); dw.rotation.x = -Math.PI / 2; dw.position.set(side * (7.5 + 4.2), 0.07, z + (r() - 0.5) * 3); dw.receiveShadow = true; scene.add(dw); }
  // pool
  if (row === 0 && r() < 0.4) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({ color: 0x40b4da })); pl.rotation.x = -Math.PI / 2; pl.position.set(side * 34, 0.09, z + (r() - 0.5) * 3); scene.add(pl); }
  const hobj = { g, roof, body, x, z, side, w: dx, d: wz, h, seed: r() * 6.28, fail: null, row };
  houses.push(hobj); return hobj;
}
{
  const r = rng(77);
  for (const side of [-1, 1]) for (let z = -22; z > -870; z -= 21 + r() * 5) { if (Math.abs(z + 130) < 8 || Math.abs(z + 300) < 8 || Math.abs(z + 470) < 8) continue; addHouse(side, z, 0, r); }
  for (const side of [-1, 1]) for (let z = -26; z > -860; z -= 26 + r() * 8) { if (Math.abs(z + 130) < 10 || Math.abs(z + 300) < 10 || Math.abs(z + 470) < 10) continue; addHouse(side, z, 1, r); }
}
for (const f of FAILS) { const cand = houses.filter((h) => h.row === 0 && h.side === f.side && !h.fail).sort((a, b) => Math.abs(a.z - f.z) - Math.abs(b.z - f.z))[0]; cand.fail = f; cand.t0 = f.t; }
const failH = houses.filter((h) => h.fail);
// our own building: a 4-storey condo at the end of the street, camera on its roof
const ROOF_Y = 24;
const CONDO = { x: -16, z: 46 };
{
  const g = new THREE.Group(), w = 22, d = 30;
  const tex = winTex(0xd8cdb4, 301, 4, 5);
  const m = new THREE.MeshLambertMaterial({ map: tex }), rm = new THREE.MeshLambertMaterial({ color: 0x6b6862 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, ROOF_Y, d), [m, m, rm, rm, m, m]); body.position.y = ROOF_Y / 2; body.castShadow = true; g.add(body);
  g.position.set(CONDO.x, 0, CONDO.z); scene.add(g);
}

/* ---------- trees (instanced; they sway, some fall, then burn) ---------- */
const TREES = [];
{
  const r = rng(123);
  const lots = houses.filter((h) => h.row === 0);
  for (const h of lots) { if (h.z > -10) continue; const n = 1 + (r() < 0.5 ? 1 : 0); for (let k = 0; k < n; k++) TREES.push({ x: h.side * (9.5 + r() * 3 + k * 20), z: h.z + (r() - 0.5) * 14, s: 0.9 + r() * 0.7, ph: r() * 6.28, f: 0.5 + r() * 0.5, fall: r() < 0.14 ? 18 + r() * 14 : 999, dir: r() < 0.5 ? -1 : 1, tone: 0.75 + r() * 0.35 }); }
  for (let i = 0; i < 260; i++) { const side = r() < 0.5 ? -1 : 1; TREES.push({ x: side * (40 + r() * 240), z: 40 - r() * 900, s: 0.9 + r() * 0.9, ph: r() * 6.28, f: 0.5 + r() * 0.5, fall: 999, dir: 1, tone: 0.7 + r() * 0.35 }); }
}
const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 6); trunkGeo.translate(0, 0.5, 0);
const canopyGeo = new THREE.IcosahedronGeometry(1, 1); canopyGeo.translate(0, 0, 0);
const treeTrunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x5a4636 }), TREES.length);
const treeCanopy = new THREE.InstancedMesh(canopyGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, map: detailTex }), TREES.length);
treeTrunks.castShadow = treeCanopy.castShadow = true; treeCanopy.receiveShadow = true;
{ const c = new THREE.Color(); TREES.forEach((t, i) => { c.setRGB(0.16 * t.tone, 0.34 * t.tone, 0.15 * t.tone); treeCanopy.setColorAt(i, c); }); }
scene.add(treeTrunks, treeCanopy);

/* ---------- power poles + wires ---------- */
const poleG = new THREE.CylinderGeometry(0.14, 0.2, 9, 6); poleG.translate(0, 4.5, 0);
const POLES = [];
{
  const pm = new THREE.MeshLambertMaterial({ color: 0x5a4636 });
  for (let z = 40, i = 0; z > -860; z -= 36, i++) {
    const m = new THREE.Mesh(poleG, pm); m.castShadow = true; m.position.set(7.6, 0, z); scene.add(m);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.18), pm); arm.position.set(0, 8.4, 0); m.add(arm);
    POLES.push({ m, z, fall: 20 + hash2(i, 3) * 14, dir: hash2(i, 4) < 0.5 ? -1 : 1, ph: hash2(i, 5) * 6 });
  }
}
const wirePos = new Float32Array((POLES.length - 1) * 2 * 3 * 3);
const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', new THREE.BufferAttribute(wirePos, 3));
const wires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x111111 })); wires.frustumCulled = false; scene.add(wires);

/* ---------- cars + people ---------- */
const cars = [];
{
  const r = rng(61), cols = [0xd9d9d3, 0x1a1a1c, 0x2b4a86, 0xb21f24, 0xc8cacc, 0x6c7378, 0xe0b92a, 0x2f6b4a, 0xf2f2ee];
  const bodyG = new THREE.BoxGeometry(1.85, 0.8, 4.5); bodyG.translate(0, 0.62, 0);
  const cabG = new THREE.BoxGeometry(1.6, 0.7, 2.3); cabG.translate(0, 1.3, -0.1);
  const dark = new THREE.MeshLambertMaterial({ color: 0x1b2430 });
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group(), body = new THREE.Mesh(bodyG, new THREE.MeshLambertMaterial({ color: cols[Math.floor(r() * cols.length)] })), cab = new THREE.Mesh(cabG, dark);
    body.castShadow = cab.castShadow = true; g.add(body, cab); scene.add(g);
    const moving = i < 12, dir = r() < 0.5 ? -1 : 1;
    cars.push({ g, moving, dir, lane: dir > 0 ? -2.4 : 2.4, z0: 30 - r() * 380, v: 8 + r() * 4, i, px: (r() < 0.5 ? -1 : 1) * (11 + r() * 1.5), pz: 20 - r() * 380, slide: r() < 0.5 ? -1 : 1 });
  }
}
const people = [];
{
  const r = rng(52);
  for (let i = 0; i < 16; i++) {
    const pr = makePerson(r), g = pr.g; NO_SHADOW(g); g.scale.setScalar(0.92 + r() * 0.08); scene.add(g);
    const side = r() < 0.5 ? -1 : 1;
    people.push({ g, legs: pr.legs, arms: pr.arms, side, x0: side * (6.2 + (r() - 0.5) * 0.8), z0: 20 - r() * 300, dirv: r() < 0.5 ? -1 : 1, sp: 0.9 + r() * 0.5, ph: r() * 6.28, fallT: 15.2 + r() * 2.8, fx: (r() - 0.5) * 1.6 });
  }
}

/* ---------- rig ---------- */
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);

/* ---------- debris from collapsing houses ---------- */
const debris = [];
{
  const r = rng(1234), cols = [0xc9a37c, 0xe4d8c0, 0x8a6a4a, 0x7d7a74, 0xb5a08a, 0x6b4a3c];
  for (const b of failH) for (let k = 0; k < 70; k++) debris.push({ b, ox: (r() - 0.5) * b.w, oy: 0.5 + r() * b.h, oz: (r() - 0.5) * b.d, vx: -b.side * (1 + r() * 9), vy: 2 + r() * 9, vz: (r() - 0.4) * 12, sx: 0.5 + r() * 3.2, sy: 0.12 + r() * 0.5, sz: 0.2 + r() * 1.2, spin: (r() - 0.5) * 7, col: cols[Math.floor(r() * cols.length)], dly: r() * 1.2 });
}
const debMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), debris.length);
debMesh.frustumCulled = false; debMesh.castShadow = true; scene.add(debMesh);
{ const c = new THREE.Color(); debris.forEach((d, i) => debMesh.setColorAt(i, c.set(d.col).multiplyScalar(0.85 + hash2(i, 5) * 0.3))); }
// cracks across the street and lawns
const crackMat = new THREE.MeshBasicMaterial({ color: 0x0c0907 });
const cracks = [];
{
  const r = rng(321);
  for (const [x0, z0, ang0, dir] of [[-3, -8, 0.15, -1], [-20, -36, 1.57, 1], [3, -90, 0.1, -1], [20, -150, 1.57, -1], [-4, -210, 0.2, -1]]) {
    let x = x0, z = z0, a = ang0;
    for (let k = 0; k < 10; k++) {
      const len = 5 + r() * 3, m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), crackMat);
      const dx = ang0 > 1 ? len * dir : Math.sin(a) * len * 0.35, dz = ang0 > 1 ? Math.sin(a - 1.57) * len * 0.5 : -len;
      m.position.set(x + dx / 2, 0.1, z + dz / 2); m.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; m.visible = false; scene.add(m);
      cracks.push({ m, len: Math.hypot(dx, dz), k, w: 0.35 + r() * 0.5 });
      x += dx; z += dz; a += (r() - 0.5) * 0.9;
    }
  }
}
const FIRES = [[-18, 6, -62, 31.2], [18, 7, -84, 33.0], [-18, 5, -144, 35.0], [18, 7, -192, 36.4], [-18, 5, -230, 38.0], [18, 6, -112, 37.5]];
// trees that ignite when the sky heats up
const TF_N = 90;
const TFIRE = Array.from({ length: TF_N }, (_, i) => { const t = TREES[Math.floor(hash2(i, 61) * TREES.length)]; return { x: t.x, z: t.z, t0: 49.5 + hash2(i, 62) * 6.5, ph: hash2(i, 63) * 6.28 }; });
const treeFire = pointsLayer(TF_N, 22, 0xff7a24, () => 0); treeFire.pts.material.blending = THREE.AdditiveBlending; treeFire.pts.material.fog = false;

/* ------------------------------------------------------------------ *
 *  Per-frame update (t = scene seconds)
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
const SKY_H = [[0, 0xe9dcc4], [14, 0xe9dcc4], [18, 0xcdb08f], [26, 0xb59673], [34, 0xb0603c], [40, 0xd4452a], [46, 0xe5502a]];
const SKY_T = [[0, 0x4f8fd8], [14, 0x4f8fd8], [18, 0x6f86a0], [26, 0x7a6a62], [34, 0x6a3a34], [40, 0x4a1c18], [46, 0x3a1412]];
const CAM0 = new THREE.Vector3(CONDO.x + 11 - 4, ROOF_Y + 1.6, CONDO.z - 15 - 0.2);
const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), qA = new THREE.Quaternion(), eA = new THREE.Euler(), vA = new THREE.Vector3(), vS = new THREE.Vector3();
function shakeEnv(t) {
  const e = smooth((t - 15) / 1.3) * (1 - smooth((t - 36) / 7.5)) * (0.78 + 0.22 * Math.sin(t * 2.3));
  const pw = smooth((t - 12) / 0.2) * (1 - smooth((t - 12.8) / 0.9)) * 0.2;
  return Math.max(e, pw);
}
const EJ_N = 320;
const EJ = Array.from({ length: EJ_N }, (_, i) => ({ x: -1200 + hash2(i, 41) * 2400, y: 260 + hash2(i, 42) * 760, z: -700 - hash2(i, 43) * 3000, ph: hash2(i, 44) }));
const ejecta = pointsLayer(EJ_N * 14, 20, 0xff9a50, () => 0); ejecta.pts.material.blending = THREE.AdditiveBlending; ejecta.pts.material.fog = false;
let curT = 0;
function update(t) {
  pc = 0;
  const Tm = curT, E = shakeEnv(t);
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.cloudAmt.value = kf(t, [[0, 0.9], [26, 0.6], [40, 0.35]]); skyMat.uniforms.time.value = t;
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [15, 0.6], [26, 0], [46, 0]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00026], [14, 0.0003], [17, 0.00045], [26, 0.0008], [34, 0.001], [46, 0.0014]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [26, 1.0], [40, 1.06], [46, 1.1]]);
  setSun(kf(t, [[0, 33], [14, 31], [30, 25], [40, 17], [46, 11]]));
  sun.intensity = Math.PI * kf(t, [[0, 2.8], [14, 2.7], [17, 2.0], [30, 1.3], [40, 0.9], [46, 0.7]]);
  kfc(t, [[0, 0xffe4b8], [30, 0xe8b890], [40, 0xff7a46], [46, 0xff5a30]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [15, 0.95], [30, 0.75], [40, 0.6], [46, 0.55]]);
  hemi.color.copy(horC).lerp(topC, 0.55); hemi.groundColor.set(0x7a6a58);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.08], [26, 0.95], [46, 0.92]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [30, 1.08], [46, 1.1]]).toFixed(3)})`;

  /* camera on the condo roof, looking down the street toward the sea */
  const lookYaw = kf(t, [[0, 7], [6, 6], [12, 6], [15, 11], [16.5, 16], [18, 15], [19, 4], [20.5, -2], [22, 5], [26, 6], [30, 3], [34, 4], [40, 5], [46, 3]]);
  const lookPitch = kf(t, [[0, -14], [6, -13], [12, -11], [15, -12], [16.5, -15], [19, -11], [22, -11], [30, -10], [38, -8], [46, -6]]);
  const fov = kf(t, [[0, 62], [6, 59], [15, 58], [30, 57], [46, 60]]);
  const sh = (a, b) => Math.sin(t * a + b);
  rig.position.set(CAM0.x + E * 0.34 * (sh(17.3, 1) + 0.6 * sh(9.7, 2)), CAM0.y + E * 0.16 * (sh(23.1, 4) + 0.5 * sh(12.4, 5)), CAM0.z + E * 0.3 * (sh(13.7, 6) + 0.5 * sh(27, 7)));
  rig.rotation.set(E * 0.012 * sh(7.7, 8), E * 0.006 * sh(5.9, 9), E * 0.016 * sh(6.1, 10));
  camera.position.set(0, 0, 0); camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(lookPitch) + 0.0012 * sh(1.3, 1), THREE.MathUtils.degToRad(lookYaw) + 0.0016 * sh(0.8, 2), 0.0015 * sh(1.1, 3));
  if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);

  /* houses: tremble, a few fail */
  for (const b of houses) {
    const g = b.g, tr = E * 0.004 * Math.sin(t * 8.5 + b.seed);
    g.rotation.set(E * 0.003 * Math.sin(t * 7.1 + b.seed * 2), 0, tr); g.position.set(b.x + E * 0.12 * Math.sin(t * 11 + b.seed), 0, b.z); g.scale.set(1, 1, 1); b.roof.rotation.set(0, 0, 0); b.roof.position.set(0, b.h, 0);
    if (b.fail) {
      const p = smooth((t - b.t0) / 2.6), q = Math.pow(p, 1.5);
      g.scale.y = 1 - 0.72 * q; g.rotation.z += -b.side * 0.2 * q; g.position.x += -b.side * 2.2 * p; g.position.y = -0.4 * p;
      b.roof.rotation.z = -b.side * 0.35 * q; b.roof.position.x = -b.side * 2.5 * q; b.roof.position.y = b.h * (1 + 0.2 * q) - 1.4 * q * b.h / (1 - 0.72 * q + 0.01) * 0.5;
    }
  }
  /* trees */
  for (let i = 0; i < TREES.length; i++) {
    const tr = TREES[i], fp = smooth((t - tr.fall) / 2.0);
    const sw = 0.01 * Math.sin(t * 0.8 + tr.ph) + E * 0.09 * Math.sin(t * tr.f * 5.1 + tr.ph);
    const lean = sw + tr.dir * fp * 1.4;
    eA.set(0.4 * sw, 0, lean); qA.setFromEuler(eA);
    mA.compose(vA.set(tr.x, 0, tr.z), qA, vS.set(1, 1, 1));
    mB.copy(mA).scale(vS.set(tr.s, 3.4 * tr.s, tr.s)); treeTrunks.setMatrixAt(i, mB);
    mB.copy(mA).multiply(dummy.matrix.makeTranslation(0, 3.4 * tr.s + 1.4 * tr.s, 0)).scale(vS.set(3.0 * tr.s, 2.4 * tr.s, 3.0 * tr.s)); treeCanopy.setMatrixAt(i, mB);
  }
  treeTrunks.instanceMatrix.needsUpdate = true; treeCanopy.instanceMatrix.needsUpdate = true;
  /* poles + wires */
  for (let i = 0; i < POLES.length; i++) { const p = POLES[i], f = smooth((t - p.fall) / 1.6); p.m.rotation.set(0, 0, p.dir * f * 1.2 + E * 0.02 * Math.sin(t * 6 + p.ph)); p.m.position.x = 7.6; }
  {
    let k = 0;
    for (let i = 0; i < POLES.length - 1; i++) for (const off of [-0.9, 0, 0.9]) {
      for (const j of [i, i + 1]) {
        const p = POLES[j], a = p.m.rotation.z, hx = 7.6 - Math.sin(a) * 8.4 + off * Math.cos(a), hy = Math.cos(a) * 8.4 + off * Math.sin(a);
        wirePos[k++] = hx; wirePos[k++] = Math.max(0.2, hy - (j === i + 1 ? 0 : 0)); wirePos[k++] = p.z + 0.0;
      }
    }
    wireGeo.attributes.position.needsUpdate = true; wireGeo.setDrawRange(0, k / 3);
  }
  /* cars */
  for (const c of cars) {
    let x, z, yaw = c.dir > 0 ? 0 : Math.PI, y = 0.08;
    if (c.moving) {
      const brake = t < 12.2 ? t : 12.2 + 0.75 * (1 - Math.exp(-(t - 12.2) / 0.75));
      z = fmod(c.z0 + c.dir * -c.v * brake + 320, 380) - 320 + 30; x = c.lane;
      if (c.slide) { const sp = smooth((t - 15.6) / 2.6); x += c.slide * sp * (1 + (c.i % 3) * 0.7); yaw += c.slide * sp * (0.2 + 0.12 * (c.i % 4)); }
    } else { x = c.px; z = c.pz; yaw = Math.PI / 2; }
    c.g.position.set(x + E * 0.1 * Math.sin(t * 13 + c.i), y + E * 0.04 * Math.abs(Math.sin(t * 15 + c.i)), z);
    c.g.rotation.set(E * 0.02 * Math.sin(t * 11 + c.i), yaw, E * 0.03 * Math.sin(t * 9 + c.i));
  }
  /* people: stroll, freeze at the P-wave, fall at the S-wave */
  for (const p of people) {
    const tt = Math.min(t, 12.4), z = fmod(p.z0 + p.dirv * p.sp * tt + 340, 360) - 340 + 30, x = p.x0;
    const f = smooth((t - p.fallT) / 0.45), moving = t < 12.4, sw = moving ? Math.sin(tt * 6 + p.ph) * 0.45 : 0;
    p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8;
    if (!moving && f < 1) { p.arms[0].rotation.x = -0.9 * (1 - f) - 1.2 * f; p.arms[1].rotation.x = -0.9 * (1 - f) - 1.2 * f; }
    p.g.position.set(x + E * 0.12 * Math.sin(t * 14 + p.ph) + p.fx * f * 0.6, 0.16 - 0.2 * f, z);
    p.g.rotation.set(-1.5 * f, p.dirv > 0 ? Math.PI : 0, (p.fx > 0 ? 1 : -1) * 0.3 * f + E * 0.03 * Math.sin(t * 12 + p.ph));
  }
  /* cracks */
  for (const c of cracks) { const w = c.w * smooth((t - 15.3 - c.k * 0.12) / 1.6) * (1 + 0.4 * smooth((t - 22) / 8)); c.m.visible = w > 0.02; c.m.scale.set(c.len * 1.04, 1, w); }
  /* debris */
  for (let i = 0; i < debris.length; i++) {
    const d = debris[i], s = t - d.b.t0 - d.dly;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else {
      const y = d.oy + d.vy * s - 0.5 * 22 * s * s;
      dummy.position.set(d.b.x + d.ox + d.vx * s, Math.max(0.2 * d.sy + 0.1, y), d.b.z + d.oz + d.vz * s * (1 - Math.exp(-s)));
      dummy.scale.set(d.sx, d.sy, d.sz); dummy.rotation.set(Math.min(s, 2.5) * d.spin, Math.min(s, 2.5) * d.spin * 0.6, 0);
    }
    dummy.updateMatrix(); debMesh.setMatrixAt(i, dummy.matrix);
  }
  debMesh.instanceMatrix.needsUpdate = true;
  /* dust when houses fail */
  const dustL = kf(t, [[0, 1], [26, 0.85], [40, 0.5], [46, 0.45]]);
  failH.forEach((b, bi) => {
    const sT = t - b.t0; if (sT < -0.1 || sT > 8) return;
    const a = 0.6 * Math.exp(-sT * 0.55) * clamp(sT * 2.4);
    for (let k = 0; k < 14; k++) {
      const hx = hash2(bi * 9 + k, 1) - 0.5, hz = hash2(bi * 9 + k, 2) - 0.5, hh = hash2(bi * 9 + k, 3);
      addPuff(b.x + hx * b.w * (1 + sT * 0.2), 1.5 + hh * b.h * 0.8 + sT * 1.8, b.z + hz * b.d * (1 + sT * 0.15), 5 + hh * 6 + sT * 3.5, hx * 2, 0.74 * dustL, 0.66 * dustL, 0.56 * dustL, a);
    }
  });
  /* fires in the collapsed houses */
  const smokeBase = kf(t, [[30, 0.16], [40, 0.1], [46, 0.085]]);
  FIRES.forEach(([x, y, z, t0], fi) => {
    if (t < t0) return;
    const age = t - t0, rampUp = smooth(age / 2.5);
    for (let k = 0; k < 6; k++) { const fl = 0.7 + 0.3 * Math.sin(t * (9 + k) + fi + k); addPuff(x + (hash2(fi, k) - 0.5) * 6, y + hash2(k, fi) * 3, z + (hash2(fi + 3, k) - 0.5) * 5, (3 + k * 0.6) * (0.6 + 0.4 * rampUp) * fl, k, 1.6, 0.62, 0.2, 0.8 * rampUp); }
    for (let k = 0; k < 26; k++) { const ph = fmod(age * 0.16 + k / 26, 1), w = 8 + ph * 46; addPuff(x + (hash2(fi, k + 9) - 0.5) * 6 + ph * 30, y + 3 + ph * 120, z + (hash2(fi + 5, k) - 0.5) * 6 - ph * 8, w, k * 1.3, smokeBase * (1 + (1 - ph) * 0.9), smokeBase * (0.95 + (1 - ph) * 0.35), smokeBase * 0.9, 0.85 * rampUp * (1 - ph * 0.55) * clamp(ph * 6)); }
  });
  /* the dust that fills the street */
  const ambA = kf(t, [[14.8, 0], [18, 0.05], [26, 0.06], [40, 0.08], [46, 0.08]]);
  if (ambA > 0.01) for (let i = 0; i < 30; i++) { const zz = -30 - fmod(hash2(i, 3) * 300 + (t - 14) * 3, 300); addPuff((hash2(i, 1) - 0.5) * 80 + Math.sin(t * 0.3 + i) * 4, 3 + hash2(i, 2) * 30, zz, 24 + hash2(i, 4) * 34, i, 0.66 * dustL, 0.58 * dustL, 0.5 * dustL, ambA); }
  /* cumulus */
  {
    const ca = 1 - smooth((t - 30) / 8);
    if (ca > 0.01) for (let c = 0; c < 10; c++) {
      const cx = (hash2(c, 21) - 0.5) * 2600, cy = 420 + hash2(c, 22) * 300, cz = -1700 - hash2(c, 23) * 1200, cw = 140 + hash2(c, 24) * 200;
      for (let k = 0; k < 8; k++) { const ox = (hash2(c * 9 + k, 31) - 0.5) * cw * 2.2, oy = (hash2(c * 9 + k, 32) - 0.35) * cw * 0.5, sz = cw * (0.55 + hash2(c * 9 + k, 33) * 0.7); const L = 0.97 - Math.max(0, -oy / cw) * 0.14; addPuff(cx + ox + t * 3, cy + oy, cz + (hash2(c * 9 + k, 34) - 0.5) * 100, sz, hash2(c * 9 + k, 35) * 0.5 - 0.25, L, L * 0.98, L * 0.94, 0.72 * ca); }
    }
  }
  /* trees ignite under the red sky (master time) */
  for (let i = 0; i < TF_N; i++) {
    const f = TFIRE[i], burn = smooth((Tm - f.t0) / 1.2);
    if (burn <= 0.02) { treeFire.pos[i * 3 + 1] = -60; continue; }
    treeFire.pos[i * 3] = f.x; treeFire.pos[i * 3 + 1] = 5; treeFire.pos[i * 3 + 2] = f.z;
    const fl = 0.8 + 0.2 * Math.sin(Tm * 17 + f.ph * 7);
    for (let q = 0; q < 5; q++) { const u = q / 5; addPuff(f.x + Math.sin(Tm * 0.8 + f.ph + q) * 2 + q * 1.8, 5 + q * 7, f.z + Math.cos(Tm * 0.7 + q) * 1.5, 6 + q * 5.5, f.ph + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.4 * fl : 0.32 * (1 - u * 0.7)) * burn); }
  }
  treeFire.geo.attributes.position.needsUpdate = true; treeFire.pts.material.opacity = 0.85;
