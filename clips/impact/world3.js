/* ------------------------------------------------------------------ *
 *  First-person scene: a hilltop cabin overlooking a pine valley (East Texas)
 * ------------------------------------------------------------------ */
const texLoader = new THREE.TextureLoader();
const loadTex = (u, srgb = true) => new Promise((res) => texLoader.load(u, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
const [grassTex, woodTex, brickTex, lavaTex] = await Promise.all([loadTex('../assets/grasslight-big.jpg'), loadTex('../assets/hardwood2_diffuse.jpg'), loadTex('../assets/brick_diffuse.jpg'), loadTex('../assets/lavatile.jpg')]);
const fmod = (a, n) => ((a % n) + n) % n;

/* ---------- lights ---------- */
const hemi = new THREE.HemisphereLight(0xbcd2f0, 0x7a6a58, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 3);
sun.target.position.set(0, 38, -8);
sun.castShadow = true;
sun.shadow.mapSize.set(+(P.get('shadow') ?? 2048), +(P.get('shadow') ?? 2048));
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 1700 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35;
scene.add(sun, sun.target);
const sunAz = Math.atan2(SUN_DIR.x, SUN_DIR.z);
function setSun(elevDeg) {
  const e = (elevDeg * Math.PI) / 180, cx = Math.sin(sunAz) * Math.cos(e), cz = Math.cos(sunAz) * Math.cos(e), cy = Math.sin(e);
  sun.position.set(cx * 650, 38 + cy * 650, -8 + cz * 650);
  skyMat.uniforms.sunDir.value.set(cx, cy, cz);
}

/* ---------- terrain: hilltop clearing, slope, pine lowland ---------- */
const PLATEAU = 38;
function gh(x, z) {
  const slope = smooth((-6 - z) / 75);
  let y = PLATEAU * (1 - slope) + (fbm(x * 0.012, z * 0.012) - 0.5) * 7 * slope + (fbm(x * 0.05, z * 0.05) - 0.5) * 1.2 * slope;
  y += smooth((Math.abs(x) - 110) / 260) * (24 + fbm(x * 0.006, z * 0.006) * 30) * smooth((-z + 30) / 200);
  if (z > -8) y = PLATEAU + (fbm(x * 0.2, z * 0.2) - 0.5) * 0.08 + smooth((z - 28) / 60) * 3;
  return y;
}
const tXs = [], tZs = [];
for (let x = -1800; x < -150; x += 60) tXs.push(x);
for (let x = -150; x < 150; x += 3) tXs.push(x);
for (let x = 150; x <= 1800; x += 60) tXs.push(x);
for (let z = -3200; z < -240; z += 60) tZs.push(z);
for (let z = -240; z < 90; z += 3) tZs.push(z);
const terrainGeo = new THREE.PlaneGeometry(1, 1, tXs.length - 1, tZs.length - 1);
{
  const pos = terrainGeo.attributes.position, uv = terrainGeo.attributes.uv, col = new Float32Array(pos.count * 3), c = new THREE.Color(), c2 = new THREE.Color();
  for (let j = 0; j < tZs.length; j++) for (let i = 0; i < tXs.length; i++) {
    const k = j * tXs.length + i, x = tXs[i], z = tZs[j], y = gh(x, z);
    pos.setXYZ(k, x, y, z); uv.setXY(k, x / 9, z / 9);
    const dry = fbm(x * 0.03, z * 0.03);
    c.set(0x7e9a55).lerp(c2.set(0x9a9a5a), dry * 0.6);
    if (z < -20) c.lerp(c2.set(0x3f4f2a), smooth((-z - 20) / 60) * 0.65); // pine-needle floor under the forest
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); terrainGeo.computeVertexNormals();
}
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grassTex }));
terrain.receiveShadow = true; scene.add(terrain);

/* ---------- procedural textures ---------- */
const barkTex = (() => {
  const c = mkCanvas(128, 256), x = c.getContext('2d'), r = rng(31);
  x.fillStyle = '#6b4f36'; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 520; i++) { const v = 40 + r() * 70; x.fillStyle = `rgba(${v},${v * 0.72},${v * 0.5},${0.25 + r() * 0.4})`; x.fillRect(r() * 128, r() * 256, 1 + r() * 4, 6 + r() * 40); }
  for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(20,12,8,.5)'; x.lineWidth = 1.2; x.beginPath(); const px = r() * 128; x.moveTo(px, 0); x.lineTo(px + (r() - 0.5) * 8, 256); x.stroke(); }
  return toTex(c);
})();
const gravelTex = (() => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), r = rng(9);
  x.fillStyle = '#9a9184'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = 110 + r() * 110; x.fillStyle = `rgb(${v},${v - 6},${v - 16})`; x.beginPath(); x.arc(r() * 256, r() * 256, 1 + r() * 2.4, 0, 6.283); x.fill(); }
  for (let i = 0; i < 700; i++) { x.fillStyle = 'rgba(40,34,28,.35)'; x.fillRect(r() * 256, r() * 256, 2, 2); }
  const t = toTex(c); t.repeat.set(2, 24); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const shingle2 = (() => {
  const c = mkCanvas(128, 128), x = c.getContext('2d'), r = rng(17);
  x.fillStyle = '#4a3a30'; x.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 16; row++) for (let col = 0; col < 8; col++) { const v = 60 + r() * 50; x.fillStyle = `rgb(${v + 10},${v - 4},${v - 14})`; x.fillRect(col * 16 + (row % 2) * 8 - 8, row * 8, 15, 7); }
  const t = toTex(c); t.repeat.set(4, 3); return t;
})();

/* ---------- gravel path, rocks ---------- */
{
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 70), new THREE.MeshLambertMaterial({ map: gravelTex }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, PLATEAU + 0.045, 24); path.receiveShadow = true; scene.add(path);
  const r = rng(14), rg = new THREE.DodecahedronGeometry(1, 1), rm = new THREE.MeshLambertMaterial({ color: 0x8a867c, map: gravelTex });
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(rg, rm); const x = (r() - 0.5) * 40, z = 18 - r() * 30; m.position.set(x, PLATEAU + 0.08, z); m.scale.set(0.2 + r() * 0.7, 0.14 + r() * 0.4, 0.2 + r() * 0.7); m.rotation.set(r(), r(), r()); m.castShadow = true; scene.add(m); }
}

/* ---------- fence at the lip of the hill ---------- */
const fencePosts = [];
{
  const wm = new THREE.MeshLambertMaterial({ map: woodTex, color: 0x8a7a66 });
  const pg = new THREE.BoxGeometry(0.16, 1.25, 0.16); pg.translate(0, 0.62, 0);
  const rg = new THREE.BoxGeometry(2.4, 0.11, 0.07);
  for (let i = -6; i <= 6; i++) {
    const g = new THREE.Group(), p = new THREE.Mesh(pg, wm); p.castShadow = true; g.add(p);
    const r1 = new THREE.Mesh(rg, wm), r2 = new THREE.Mesh(rg, wm); r1.position.set(1.2, 1.05, 0); r2.position.set(1.2, 0.62, 0); r1.castShadow = r2.castShadow = true; g.add(r1, r2);
    g.position.set(i * 2.4, PLATEAU + 0.02, -9); scene.add(g);
    fencePosts.push({ g, i, t0: 23.5 + hash2(i, 3) * 9, dir: hash2(i, 4) < 0.5 ? -1 : 1 });
  }
}

/* ---------- log cabin ---------- */
const cabin = new THREE.Group();
cabin.position.set(10.5, PLATEAU, -7); cabin.rotation.y = 0.5; scene.add(cabin);
const CAB = { L: 7.6, W: 5.6, rows: 10, r: 0.15 };
const logGeo = new THREE.CylinderGeometry(CAB.r, CAB.r, 1, 9); logGeo.rotateZ(Math.PI / 2);
barkTex.repeat.set(2, 1);
const logMat = new THREE.MeshLambertMaterial({ map: barkTex });
const LOGS = [];
{
  const r = rng(404);
  const add = (axis, x, y, z, len) => LOGS.push({ axis, x, y, z, len, rr: 0.85 + r() * 0.3, h: r(), h2: r(), h3: r() });
  for (let k = 0; k < CAB.rows; k++) {
    const y = 0.16 + k * 0.27;
    add('x', 0, y, -CAB.W / 2, CAB.L + 0.7); add('x', 0, y + 0.0, CAB.W / 2, CAB.L + 0.7);
    add('z', -CAB.L / 2, y + 0.135, 0, CAB.W + 0.7); add('z', CAB.L / 2, y + 0.135, 0, CAB.W + 0.7);
  }
  // gable ends (ridge runs along x): shorter logs stacked above the wall plate
  const wall = 0.16 + CAB.rows * 0.27;
  for (let k = 0; k < 6; k++) { const y = wall + k * 0.27, len = (CAB.W - 0.7 * 0) * (1 - (k + 1) / 7.2); for (const s of [-1, 1]) add('z', s * CAB.L / 2, y + 0.135, 0, Math.max(0.6, len)); }
}
const cabLogs = new THREE.InstancedMesh(logGeo, logMat, LOGS.length); cabLogs.castShadow = true; cabLogs.receiveShadow = true; cabin.add(cabLogs);
const roofG = new THREE.Group(); cabin.add(roofG);
{
  const wall = 0.16 + CAB.rows * 0.27 + 0.1, rise = 6 * 0.27 + 0.6;
  const rm = new THREE.MeshLambertMaterial({ map: shingle2, side: THREE.DoubleSide });
  const half = CAB.W / 2 + 0.5, slopeLen = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(CAB.L + 1.2, 0.12, slopeLen), rm); m.position.set(0, wall + rise / 2 + 0.06, s * half / 2); m.rotation.x = -s * ang; m.castShadow = true; m.receiveShadow = true; roofG.add(m); }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(CAB.L + 1.3, 0.14, 0.3), new THREE.MeshLambertMaterial({ color: 0x3a2e26 })); ridge.position.set(0, wall + rise + 0.1, 0); roofG.add(ridge);
}
const cabinParts = {};
{
  const wm = new THREE.MeshLambertMaterial({ map: woodTex, color: 0xc8b090 }), dark = new THREE.MeshLambertMaterial({ color: 0x1c242c });
  // door + window on the front (+z face, which faces the yard after rotation) and gable side
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.12), wm); door.position.set(-1.6, 1.0, CAB.W / 2 + 0.2); cabin.add(door);
  for (const [wx, wz, ry] of [[1.5, CAB.W / 2 + 0.2, 0], [-CAB.L / 2 - 0.2, 0, Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.1), dark); w.position.set(wx, 1.45, wz); w.rotation.y = ry; cabin.add(w); const f = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.06), wm); f.position.set(wx, 1.45, wz - 0.02 * Math.cos(ry)); f.rotation.y = ry; cabin.add(f); }
  // porch deck + posts + shade roof
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 2.2), wm); deck.position.set(-0.4, 0.08, CAB.W / 2 + 1.2); deck.receiveShadow = true; deck.castShadow = true; cabin.add(deck);
  for (const px of [-2.7, 1.9]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 8), new THREE.MeshLambertMaterial({ map: barkTex })); post.position.set(px, 1.4, CAB.W / 2 + 2.1); post.castShadow = true; cabin.add(post); }
  const proof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 2.6), new THREE.MeshLambertMaterial({ map: shingle2 })); proof.position.set(-0.4, 2.75, CAB.W / 2 + 1.35); proof.rotation.x = 0.1; proof.castShadow = true; cabin.add(proof);
  // stone chimney on the back gable
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.9, 6.4, 0.9), new THREE.MeshLambertMaterial({ map: brickTex, color: 0xb8a898 })); chim.geometry.translate(0, 3.2, 0); chim.position.set(CAB.L / 2 + 0.6, 0, -0.4); chim.castShadow = true; cabin.add(chim);
  cabinParts.chim = chim; cabinParts.door = door;
  // woodpile
  const wp = new THREE.Group(); const lg = new THREE.CylinderGeometry(0.11, 0.11, 1.2, 7); lg.rotateZ(Math.PI / 2);
  for (let a = 0; a < 5; a++) for (let b = 0; b < 12 - a; b++) { const m = new THREE.Mesh(lg, logMat); m.position.set(b * 0.23 + a * 0.115, 0.12 + a * 0.2, 0); wp.add(m); }
  wp.position.set(-1.8, 0, -CAB.W / 2 - 0.9); cabin.add(wp); cabinParts.wood = wp;
}

/* ---------- pines ---------- */
function colorize(g, hex, jit = 0) { const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = 1 + (hash2(i, 7) - 0.5) * jit; col[i * 3] = c.r * t; col[i * 3 + 1] = c.g * t; col[i * 3 + 2] = c.b * t; } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
function pineGeo(whorls, seg) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.1, 0.3, 1, 6); trunk.translate(0, 0.5, 0); parts.push(colorize(trunk.toNonIndexed(), 0x54402e, 0.2));
  for (let k = 0; k < whorls; k++) {
    const f = k / (whorls - 1), r = (1 - f) * 0.9 + 0.1, y = 0.14 + f * 0.8;
    const c = new THREE.ConeGeometry(r * 0.62, 0.3 + 0.1 * (1 - f), seg, 1); c.translate(0, y + 0.1, 0); c.rotateY(k * 0.7);
    parts.push(colorize(c.toNonIndexed(), new THREE.Color(0x24401f).lerp(new THREE.Color(0x335a2a), hash2(k, 3)).getHex(), 0.3));
  }
  return mergeGeometries(parts);
}
const pineMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const NEAR = [], FAR = [];
{
  const r = rng(555);
  const place = (x, z, near) => { const y = gh(x, z); const H = 15 + r() * 14; const t = { x, y, z, H, W: H * (0.2 + r() * 0.05), ph: r() * 6.28, f: 0.4 + r() * 0.6, tone: 0.7 + r() * 0.5, fall: 999, dir: [0, -1] }; (near ? NEAR : FAR).push(t); return t; };
  // clearing edge, slope and lowland
  for (let i = 0; i < 520; i++) { const x = (r() - 0.5) * 190, z = -56 - r() * 90; place(x, z, true); }
  for (let i = 0; i < 46; i++) { const x = (r() < 0.5 ? -1 : 1) * (30 + r() * 70), z = 6 + r() * 34; place(x, z, true); }
  for (let i = 0; i < 40; i++) { const x = (r() < 0.5 ? -1 : 1) * (42 + r() * 80), z = -2 - r() * 36; place(x, z, true); }
  for (let i = 0; i < 6200; i++) { const x = (r() - 0.5) * 2200, z = -150 - Math.pow(r(), 1.5) * 2800; place(x, z, false); }
}
const nearGeo = pineGeo(8, 9), farGeo = pineGeo(4, 6);
const nearTrees = new THREE.InstancedMesh(nearGeo, pineMat, NEAR.length), farTrees = new THREE.InstancedMesh(farGeo, pineMat, FAR.length);
nearTrees.castShadow = true; nearTrees.receiveShadow = true; farTrees.castShadow = false;
{
  const c = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion();
  NEAR.forEach((t, i) => { c.setRGB(t.tone, t.tone, t.tone * 0.95); nearTrees.setColorAt(i, c); });
  FAR.forEach((t, i) => { c.setRGB(t.tone, t.tone, t.tone * 0.95); farTrees.setColorAt(i, c); m.compose(new THREE.Vector3(t.x, t.y - 0.4, t.z), q, new THREE.Vector3(t.W, t.H, t.W)); farTrees.setMatrixAt(i, m); });
  // a handful of the near trees are the ones that come down first
  NEAR.forEach((t, i) => { if (t.z < -16 && hash2(i, 77) < 0.5) { t.fall = 24.0 + hash2(i, 78) * 15 + (-t.z) * 0.05; const a = (hash2(i, 79) - 0.5) * 1.2; t.dir = [Math.sin(a), -Math.cos(a)]; } else if (t.z >= -16 && hash2(i, 80) < 0.2) { t.fall = 26 + hash2(i, 81) * 12; const a = hash2(i, 82) * 6.28; t.dir = [Math.sin(a), -Math.cos(a)]; } });
}
scene.add(nearTrees, farTrees);

/* ---------- grass blades near the camera ---------- */
const GRASS_N = 34000;
{
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.011, 0, 0, 0.011, 0, 0, 0, 1, 0]), 3));
  gg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0.6, 0.8, 0, 0.6, 0.8, 0, 0.6, 0.8]), 3));
  const gm = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const grass = new THREE.InstancedMesh(gg, gm, GRASS_N); grass.receiveShadow = false;
  const r = rng(808), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < GRASS_N; i++) {
    const x = (r() - 0.5) * 52, z = 38 - Math.pow(r(), 0.8) * 52; if (Math.abs(x) < 1.1 && z > -4) { /* path */ }
    const h = 0.08 + r() * 0.2; e.set((r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.4); q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, gh(x, z) + 0.01, z), q, new THREE.Vector3(1 + r(), h, 1));
    grass.setMatrixAt(i, m); c.setRGB(0.28 + r() * 0.2, 0.42 + r() * 0.22, 0.14 + r() * 0.1); grass.setColorAt(i, c);
  }
  scene.add(grass);
}

/* ---------- person: arm + coffee mug ---------- */
const rig = new THREE.Group(); scene.add(rig); rig.add(camera);
const hand = new THREE.Group(); camera.add(hand);
const skin = new THREE.MeshLambertMaterial({ color: 0xd2a285 });
const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.6, 12), new THREE.MeshLambertMaterial({ color: 0x7c2a26 }));
sleeve.rotation.x = Math.PI / 2 - 0.35; sleeve.position.set(0.05, -0.13, 0.28); hand.add(sleeve);
const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.1, 10), skin); wrist.rotation.x = Math.PI / 2 - 0.3; wrist.position.set(0.03, -0.065, 0.0); hand.add(wrist);
const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.09), skin); palm.position.set(0.02, -0.03, -0.075); hand.add(palm);
for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, 0.03, 4, 8), skin); fg.rotation.z = Math.PI / 2; fg.position.set(-0.04, 0.03 - f * 0.024 + 0.02, -0.14 + f * 0.0); fg.rotation.y = 0.5 - f * 0.1; hand.add(fg); }
const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.035, 4, 8), skin); thumb.position.set(0.05, 0.06, -0.12); thumb.rotation.set(0.3, 0, 0.6); hand.add(thumb);
const mug = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.04, 0.095, 18), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.35 })); mug.add(body);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.004, 18), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.2 })); coffee.position.y = 0.04; mug.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.35 })); handle.rotation.z = -Math.PI / 2; handle.position.set(0.047, 0, 0); mug.add(handle);
}
mug.position.set(-0.012, 0.03, -0.12); mug.scale.setScalar(0.9); hand.add(mug);
hand.position.set(0.19, -0.27, -0.5); hand.rotation.set(0.15, 0.2, -0.05);
const mugW = new THREE.Group(); // the mug once it is dropped (world space)
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.04, 0.095, 14), new THREE.MeshLambertMaterial({ color: 0xe8e4da })); mugW.add(b); mugW.visible = false; scene.add(mugW); }
const SHARDS = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03 + hash2(i, 5) * 0.03, 0.006, 0.025 + hash2(i, 6) * 0.03), new THREE.MeshLambertMaterial({ color: 0xe8e4da })); m.visible = false; scene.add(m); return { m, vx: (hash2(i, 7) - 0.5) * 1.6, vz: (hash2(i, 8) - 0.5) * 1.6, vy: 0.6 + hash2(i, 9) * 1.2 }; });

/* ---------- cracks, birds, embers ---------- */
const crackMat = new THREE.MeshBasicMaterial({ color: 0x0c0907 });
const cracks = [];
{
  const r = rng(321);
  for (const [x0, z0, ang0, dir] of [[-2, 6, 0.12, -1], [-9, -2, 1.57, 1], [6, 12, 0.2, -1], [3, -4, 1.57, -1]]) {
    let x = x0, z = z0, a = ang0;
    for (let k = 0; k < 9; k++) {
      const len = 1.2 + r() * 1.3, m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), crackMat);
      const dx = ang0 > 1 ? len * dir : Math.sin(a) * len * 0.5, dz = ang0 > 1 ? Math.sin(a - 1.57) * len * 0.5 : -len;
      m.position.set(x + dx / 2, PLATEAU + 0.07, z + dz / 2); m.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; m.visible = false; scene.add(m);
      cracks.push({ m, len: Math.hypot(dx, dz), k, w: 0.04 + r() * 0.09 });
      x += dx; z += dz; a += (r() - 0.5) * 1.9;
    }
  }
}
const BIRDS_N = 160;
const birds = pointsLayer(BIRDS_N, 3, 0x14110e, () => 0); birds.pts.material.sizeAttenuation = false; birds.pts.material.size = 2.6; birds.pts.material.fog = false;
const BIRDS = Array.from({ length: BIRDS_N }, (_, i) => ({ x: (hash2(i, 1) - 0.5) * 220, z: -40 - hash2(i, 2) * 200, vx: (hash2(i, 3) - 0.5) * 18, vz: -4 - hash2(i, 4) * 10, vy: 7 + hash2(i, 5) * 9, ph: hash2(i, 6) * 6 }));
const EMB_N = 700;
const embers = pointsLayer(EMB_N, 14, 0xff8a30, () => 0); embers.pts.material.blending = THREE.AdditiveBlending; embers.pts.material.fog = false;
const EMB = Array.from({ length: EMB_N }, (_, i) => ({ x: (hash2(i, 11) - 0.5) * 90, z: 20 - hash2(i, 12) * 120, y0: hash2(i, 13) * 40, sp: 1 + hash2(i, 14) * 4, ph: hash2(i, 15) }));
// crown fires in the valley, igniting once the sky heats up
const NCF = 260;
const CFIRE = Array.from({ length: NCF }, (_, i) => { const t = FAR[Math.floor(hash2(i, 21) * Math.min(FAR.length, 1500))]; return { x: t.x, y: t.y + t.H * 0.7, z: t.z, t0: 48.6 + hash2(i, 22) * 7.5 + Math.max(0, (-t.z - 200)) * 0.0004, ph: hash2(i, 23) * 6.28 }; });
const cfGlow = pointsLayer(NCF, 70, 0xff6a20, () => 0); cfGlow.pts.material.blending = THREE.AdditiveBlending; cfGlow.pts.material.fog = false;

/* ------------------------------------------------------------------ *
 *  Update (t = master time; no warp in this scene)
 * ------------------------------------------------------------------ */
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color(), horC = new THREE.Color(), topC = new THREE.Color();
const SKY_H = [[0, 0xe9dcc4], [14, 0xe9dcc4], [18, 0xcdb08f], [30, 0xb59673], [42, 0xb0603c], [48, 0xd4452a], [56, 0xe5502a]];
const SKY_T = [[0, 0x4f8fd8], [14, 0x4f8fd8], [18, 0x6f86a0], [30, 0x7a6a62], [42, 0x6a3a34], [48, 0x4a1c18], [56, 0x3a1412]];
const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), qA = new THREE.Quaternion(), eA = new THREE.Euler(), vA = new THREE.Vector3(), vS = new THREE.Vector3(), axisV = new THREE.Vector3();
function shakeEnv(t) {
  const e = smooth((t - 22) / 1.3) * (1 - smooth((t - 36) / 8)) * (0.8 + 0.2 * Math.sin(t * 2.3));
  const pw = smooth((t - 19) / 0.2) * (1 - smooth((t - 19.9) / 0.9)) * 0.22;
  return Math.max(e, pw);
}
const EJ_N = 320;
const EJ = Array.from({ length: EJ_N }, (_, i) => ({ x: -1200 + hash2(i, 41) * 2400, y: 220 + hash2(i, 42) * 760, z: -500 - hash2(i, 43) * 3000, ph: hash2(i, 44) }));
const ejecta = pointsLayer(EJ_N * 14, 20, 0xff9a50, () => 0); ejecta.pts.material.blending = THREE.AdditiveBlending; ejecta.pts.material.fog = false;
let curT = 0;
function update(Tm) {
  pc = 0;
  const t = Tm, E = shakeEnv(t);
  kfc(t, SKY_H, horC); kfc(t, SKY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.cloudAmt.value = kf(t, [[0, 0.9], [30, 0.6], [46, 0.3]]); skyMat.uniforms.time.value = t;
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [20, 0.7], [40, 0], [60, 0]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00032], [14, 0.00035], [24, 0.0006], [40, 0.0009], [56, 0.0013]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [30, 1.0], [46, 1.04], [56, 1.08]]);
  setSun(kf(t, [[0, 30], [14, 28], [40, 20], [56, 12]]));
  sun.intensity = Math.PI * kf(t, [[0, 2.9], [14, 2.8], [22, 2.2], [40, 1.2], [48, 0.8], [56, 0.6]]);
  kfc(t, [[0, 0xffe4b8], [30, 0xf0c090], [44, 0xff8a50], [56, 0xff5a30]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [20, 0.9], [40, 0.65], [56, 0.55]]);
  hemi.color.copy(horC).lerp(topC, 0.55); hemi.groundColor.set(0x6a6a4a);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.08], [30, 0.95], [56, 0.95]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [30, 1.07], [56, 1.1]]).toFixed(3)})`;

  /* the person: walks up the path with a coffee, stops at the fence, then is thrown around by the quake */
  const walk = 1 - smooth((t - 7.2) / 1.0);
  const wz = lerp(26, 1.2, smooth(t / 8.4)) , wx = Math.sin(t * 0.35) * 0.25 * walk;
  const kneel = smooth((t - 25.0) / 1.3) * (1 - smooth((t - 56) / 2));
  const bob = walk * 0.035 * Math.sin(t * 11.3) + (1 - walk) * 0.004 * Math.sin(t * 1.5);
  const baseY = gh(wx, wz) + 1.66 - 0.72 * kneel;
  const sh = (a, b) => Math.sin(t * a + b);
  rig.position.set(wx + E * 0.12 * (sh(17.3, 1) + 0.6 * sh(9.7, 2)), baseY + bob + E * 0.07 * (sh(23.1, 4) + 0.5 * sh(12.4, 5)) - E * 0.1 * kneel, wz + E * 0.1 * (sh(13.7, 6) + 0.5 * sh(27, 7)));
  rig.rotation.set(E * 0.03 * sh(7.7, 8), E * 0.02 * sh(5.9, 9), E * 0.05 * sh(6.1, 10) + walk * 0.01 * Math.sin(t * 5.6));
  const yaw = kf(t, [[0, -14], [3, -12], [7, -2], [9.5, 3], [11, 9], [13, 7], [14.2, 12], [16, 7], [20, 5], [22, 3], [26, 11], [30, 6], [36, 8], [44, 4], [50, 3], [58, 2]]);
  const pitch = kf(t, [[0, -7], [6, -5], [8.5, -1], [10.3, 8], [12.5, 14], [14.2, 11], [17, 7], [22, 8], [24, 3], [27, -9], [30, -3], [38, 4], [48, 6], [56, 9]]);
  const roll = kf(t, [[0, 0], [22, 0], [24, 3], [27, -4], [32, 2], [38, 0]]) * E;
  camera.position.set(0, 0, 0); camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(pitch) + 0.002 * sh(1.3, 1) + E * 0.03 * sh(14, 2), THREE.MathUtils.degToRad(yaw) + 0.003 * sh(0.8, 2) + E * 0.03 * sh(11, 4), THREE.MathUtils.degToRad(roll) + 0.002 * sh(1.1, 3));
  const fov = kf(t, [[0, 64], [12, 62], [22, 62], [40, 62], [58, 64]]); if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);
  // the arm: mug held low while walking, small jolt on the S-wave, then the mug is dropped
  const dropT = 23.3, held = t < dropT;
  hand.visible = true; mug.visible = held;
  hand.position.set(0.19 + 0.01 * Math.sin(t * 11.3) * walk + E * 0.03 * sh(19, 3), -0.27 + 0.012 * Math.sin(t * 11.3 + 1) * walk - kf(t, [[22.8, 0], [23.6, 0.12], [26, 0.22], [60, 0.22]]), -0.5 + kf(t, [[0, 0], [22.8, 0], [24, 0.1], [60, 0.1]]));
  hand.rotation.set(0.1 + kf(t, [[22.8, 0], [24, -0.5], [26, -0.3]]), 0.15, -0.05 + kf(t, [[22.8, 0], [24, 0.5]]));
  // steam
  if (held) for (let q = 0; q < 3; q++) { const ph = fmod(t * 0.9 + q / 3, 1), wp = new THREE.Vector3(0.0, 0.1 + ph * 0.18, -0.19); mug.localToWorld(wp); addPuff(wp.x + Math.sin(t * 3 + q) * 0.01, wp.y, wp.z, 0.05 + ph * 0.07, q, 1, 1, 1, 0.16 * (1 - ph) * smooth(t / 1.0)); }
  // dropped mug + shards
  if (t >= dropT) {
    if (t === dropT || !mugW.userData.p0) { const p = new THREE.Vector3(0, 0, 0); mug.getWorldPosition(p); }
    const s = t - dropT, x0 = rig.position.x + 0.18, z0 = rig.position.z - 0.5, y0 = baseY - 0.4, g = gh(x0, z0) + 0.05;
    const y = y0 - 4.9 * s * s, hit = y <= g; const sT = hit ? Math.sqrt(Math.max(0, (y0 - g) / 4.9)) : s;
    mugW.visible = !hit; mugW.position.set(x0, Math.max(g, y), z0); mugW.rotation.set(s * 3, 0, s * 4);
    SHARDS.forEach((sh2) => { sh2.m.visible = hit; if (hit) { const u = s - sT; sh2.m.position.set(x0 + sh2.vx * Math.min(u, 0.5) * 0.7, g + 0.01 + Math.max(0, sh2.vy * u - 4.9 * u * u) * 0.25, z0 + sh2.vz * Math.min(u, 0.5) * 0.7); sh2.m.rotation.set(0, sh2.vx * 3, 0); } });
  } else { mugW.visible = false; SHARDS.forEach((s2) => { s2.m.visible = false; }); }

  /* fence */
  for (const f of fencePosts) { const p = smooth((t - f.t0) / 2.4); f.g.rotation.set(0.7 * p * (f.i % 2 ? 1 : 0.6), 0, f.dir * 0.25 * p + E * 0.01 * Math.sin(t * 9 + f.i)); f.g.position.y = PLATEAU + 0.02 - 0.3 * p; f.g.position.z = -9 - 0.9 * p; }

  /* cabin: shakes, logs slide, roof sags, chimney topples, door bursts */
  const cs = E * 0.006 * Math.sin(t * 8.5);
  cabin.rotation.z = cs; cabin.rotation.x = E * 0.004 * Math.sin(t * 7.1);
  const dmgBase = smooth((t - 23.5) / 10) , dmgLate = smooth((t - 30) / 12);
  for (let i = 0; i < LOGS.length; i++) {
    const l = LOGS[i], row = (l.y - 0.16) / (CAB.rows * 0.27 + 1.6), d = dmgBase * (0.25 + 0.75 * row) * (0.4 + l.h) + dmgLate * row * 0.9 * l.h2;
    dummy.position.set(l.x + (l.h - 0.5) * 0.7 * d, Math.max(0.12, l.y - 0.22 * d * l.h3), l.z + (l.h2 - 0.5) * 0.9 * d);
    dummy.rotation.set((l.h3 - 0.5) * 0.35 * d, l.axis === 'x' ? 0 : Math.PI / 2, (l.h - 0.5) * 0.25 * d);
    dummy.scale.set(l.len * 1.0, l.rr, l.rr); if (l.axis === 'z') { dummy.rotation.y = Math.PI / 2; } dummy.updateMatrix(); cabLogs.setMatrixAt(i, dummy.matrix);
  }
  cabLogs.instanceMatrix.needsUpdate = true;
  roofG.position.y = -0.55 * dmgBase - 0.4 * dmgLate; roofG.rotation.z = 0.06 * dmgBase + 0.06 * dmgLate; roofG.rotation.x = -0.05 * dmgLate;
  const chimP = smooth((t - 24.6) / 1.5); cabinParts.chim.rotation.set(0, 0, -1.35 * chimP * chimP); cabinParts.chim.position.y = -0.2 * chimP;
  cabinParts.door.rotation.y = -1.1 * smooth((t - 25.2) / 0.8); cabinParts.wood.children.forEach((m, i) => { const p = smooth((t - 25 - hash2(i, 2) * 3) / 2); m.position.y = Math.max(0.1, m.position.y - 0.0); m.rotation.z = (hash2(i, 3) - 0.5) * p * 1.2; });
  /* trees: sway, then the unlucky ones fall */
  for (let i = 0; i < NEAR.length; i++) {
    const tr = NEAR[i], fp = smooth((t - tr.fall) / 2.2);
    const sw = 0.006 * Math.sin(t * 0.8 + tr.ph) + E * 0.045 * Math.sin(t * tr.f * 5.1 + tr.ph);
    eA.set(sw, 0, sw * 0.7); qA.setFromEuler(eA);
    if (fp > 0) { axisV.set(tr.dir[1], 0, -tr.dir[0]); const q2 = new THREE.Quaternion().setFromAxisAngle(axisV, fp * 1.5 * -1); qA.premultiply(q2); }
    mA.compose(vA.set(tr.x, tr.y - 0.4, tr.z), qA, vS.set(tr.W, tr.H, tr.W)); nearTrees.setMatrixAt(i, mA);
  }
  nearTrees.instanceMatrix.needsUpdate = true;
  farTrees.rotation.z = E * 0.0007 * Math.sin(t * 5.3); farTrees.position.x = E * 0.9 * Math.sin(t * 9.1);
  /* cracks */
  for (const c of cracks) { const w = c.w * smooth((t - 23.2 - c.k * 0.1) / 1.6) * (1 + 0.5 * smooth((t - 28) / 8)); c.m.visible = w > 0.01; c.m.scale.set(c.len * 1.04, 1, w); }
  /* birds burst out of the forest at the P-wave */
  const bt = t - 19.0;
  for (let i = 0; i < BIRDS_N; i++) { const b = BIRDS[i]; if (bt < 0 || bt > 22) { birds.pos[i * 3 + 1] = -500; continue; } birds.pos[i * 3] = b.x + b.vx * bt + Math.sin(bt * 3 + b.ph) * 2; birds.pos[i * 3 + 1] = gh(b.x, b.z) + 6 + b.vy * Math.min(bt, 7) + Math.sin(bt * 5 + b.ph) * 1.2; birds.pos[i * 3 + 2] = b.z + b.vz * bt; }
  birds.geo.attributes.position.needsUpdate = true; birds.pts.material.opacity = 0.85 * (1 - smooth((bt - 16) / 5));
  /* dust: clouds on the slope and over the clearing */
  const dust = smooth((t - 22.5) / 2) * (1 - smooth((t - 44) / 10));
  if (dust > 0.01) {
    for (let i = 0; i < 46; i++) { const x = (hash2(i, 1) - 0.5) * 140, z = -14 - hash2(i, 2) * 110, y = gh(x, z) + 2 + fmod(t * (2 + hash2(i, 3) * 2) + i * 3, 22); addPuff(x, y, z, 14 + hash2(i, 4) * 18, i, 0.62, 0.55, 0.46, 0.28 * dust); }
    for (let i = 0; i < 22; i++) { const x = (hash2(i, 5) - 0.5) * 30, z = 10 - hash2(i, 6) * 20, y = PLATEAU + 0.3 + fmod(t * 0.8 + i * 1.7, 5); addPuff(x, y, z, 3 + hash2(i, 7) * 4, i, 0.66, 0.6, 0.5, 0.2 * dust); }
    // cabin collapse dust
    for (let i = 0; i < 14; i++) addPuff(15 + (hash2(i, 8) - 0.5) * 8, PLATEAU + 1 + fmod(t * 1.2 + i, 5), 3 + (hash2(i, 9) - 0.5) * 6, 4 + hash2(i, 10) * 4, i, 0.7, 0.64, 0.55, 0.3 * smooth((t - 24.5) / 1.5) * (1 - smooth((t - 40) / 8)));
  }
  /* cumulus */
  {
    const ca = 1 - smooth((t - 34) / 8);
    if (ca > 0.01) for (let c = 0; c < 10; c++) {
      const cx = (hash2(c, 21) - 0.5) * 2600, cy = 520 + hash2(c, 22) * 300, cz = -1700 - hash2(c, 23) * 1200, cw = 140 + hash2(c, 24) * 200;
      for (let k = 0; k < 8; k++) { const ox = (hash2(c * 9 + k, 31) - 0.5) * cw * 2.2, oy = (hash2(c * 9 + k, 32) - 0.35) * cw * 0.5, sz = cw * (0.55 + hash2(c * 9 + k, 33) * 0.7); const L = 0.97 - Math.max(0, -oy / cw) * 0.14; addPuff(cx + ox + t * 3, cy + oy, cz + (hash2(c * 9 + k, 34) - 0.5) * 100, sz, hash2(c * 9 + k, 35) * 0.5 - 0.25, L, L * 0.98, L * 0.94, 0.72 * ca); }
    }
  }
  /* the sky heats up: embers drift, the whole valley ignites */
  const hot = smooth((Tm - 46) / 5);
  embers.pts.material.opacity = 0.9 * hot;
  if (hot > 0.01) for (let i = 0; i < EMB_N; i++) { const e = EMB[i], y = PLATEAU + fmod(e.y0 + t * e.sp * 3, 46) - 2; embers.pos[i * 3] = e.x + Math.sin(t * 0.7 + e.ph * 6) * 4 + t * 0.6; embers.pos[i * 3 + 1] = y; embers.pos[i * 3 + 2] = e.z + Math.cos(t * 0.6 + e.ph * 5) * 3; }
  embers.geo.attributes.position.needsUpdate = true;
  for (let i = 0; i < NCF; i++) {
    const f = CFIRE[i], burn = smooth((Tm - f.t0) / 1.5);
    if (burn <= 0.02) { cfGlow.pos[i * 3 + 1] = -200; continue; }
    cfGlow.pos[i * 3] = f.x; cfGlow.pos[i * 3 + 1] = f.y; cfGlow.pos[i * 3 + 2] = f.z;
    if (i < 70) { const fl = 0.8 + 0.2 * Math.sin(Tm * 17 + f.ph * 7); for (let q = 0; q < 5; q++) { const u = q / 5; addPuff(f.x + Math.sin(Tm * 0.8 + f.ph + q) * 4 + q * 4, f.y + 6 + q * 20, f.z + Math.cos(Tm * 0.7 + q) * 3, 22 + q * 16, f.ph + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.5 * fl : 0.36 * (1 - u * 0.7)) * burn); } }
  }
  cfGlow.geo.attributes.position.needsUpdate = true; cfGlow.pts.material.opacity = 0.9;
