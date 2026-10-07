const T_IMP = 14.4, T_FR0 = 16.0, V_FRONT = 36, Z_FAR = -520;
const hitT = (z) => T_FR0 + (z - Z_FAR) / V_FRONT;
const NY_H = [[0, 0xe9dcc4], [12, 0xe9dcc4], [13.9, 0xfff6e4], [15.4, 0xffd9a0], [17, 0xe8742a], [24, 0xd4501c], [34, 0xc84010]];
const NY_T = [[0, 0x4f8fd8], [12, 0x4f8fd8], [13.9, 0xfff0d8], [15.4, 0xffb870], [17, 0xb0501c], [24, 0x6a2410], [34, 0x4a1c10]];
const EJ_N = 1; const ejecta = { pts: { material: {} }, geo: { attributes: { position: {} } }, pos: [] };
let curT = 0;
function update(Tm) {
  pc = 0;
  const t = Tm;
  const hotK = smooth((t - 15.3) / 1.0);
  kfc(t, NY_H, horC); kfc(t, NY_T, topC);
  skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.top.value.copy(topC);
  skyMat.uniforms.cloudAmt.value = kf(t, [[0, 0.9], [13, 0.8], [15, 0.2]]); skyMat.uniforms.time.value = t;
  skyMat.uniforms.sunAmt.value = kf(t, [[0, 1], [13, 1], [14.4, 3], [16, 0.2]]);
  scene.fog.color.copy(horC);
  scene.fog.density = kf(t, [[0, 0.00045], [15, 0.0005], [24, 0.0008], [31, 0.0032]]);
  renderer.toneMappingExposure = kf(t, [[0, 1.0], [13.4, 1.0], [14.2, 1.7], [15.5, 1.1], [32, 1.1]]);
  setSun(kf(t, [[0, 52], [13, 50], [14.2, 62], [16, 40], [34, 20]]));
  sun.intensity = Math.PI * kf(t, [[0, 3.0], [12.5, 3.1], [14.2, 9.0], [15.3, 3.2], [17, 1.8], [34, 1.0]]);
  kfc(t, [[0, 0xfff0d0], [13, 0xffe6c0], [14.2, 0xffffff], [16, 0xff9a50], [24, 0xff6a30]], sun.color);
  hemi.intensity = Math.PI * kf(t, [[0, 1.0], [13, 0.9], [14.2, 2.4], [16, 0.8], [34, 0.5]]);
  hemi.color.copy(horC).lerp(topC, 0.55); hemi.groundColor.set(0x6a6258);
  wrap.style.filter = `saturate(${kf(t, [[0, 1.05], [16, 1.0], [30, 0.95]]).toFixed(3)}) contrast(${kf(t, [[0, 1.04], [16, 1.08], [30, 1.12]]).toFixed(3)})`;

  /* the person: walks, stops to look up at the sky, flinches at the flash, is hit by the front */
  const walk = 1 - smooth((t - 9.6) / 0.9);
  const wz = lerp(26, 6.0, smooth(t / 10.4)), wx = 15.4 + Math.sin(t * 0.3) * 0.3 * walk;
  const hitC = smooth((t - hitT(6.0)) / 0.7);
  const flinch = smooth((t - 14.2) / 0.5) * (1 - smooth((t - 17.5) / 1.5));
  const bob = walk * 0.04 * Math.sin(t * 11.0) + (1 - walk) * 0.004 * Math.sin(t * 1.5);
  const sh = (a, b) => Math.sin(t * a + b);
  const E = 0.1 * smooth((t - 15.3) / 0.5) + 0.9 * smooth((t - hitT(14) + 1.0) / 1.2);
  rig.position.set(wx + E * 0.1 * (sh(17.3, 1) + 0.6 * sh(9.7, 2)), 1.7 - 0.55 * flinch + bob + E * 0.06 * sh(23.1, 4), wz + E * 0.08 * sh(13.7, 6) + 1.5 * hitC);
  rig.rotation.set(E * 0.03 * sh(7.7, 8) + 0.25 * flinch, E * 0.02 * sh(5.9, 9), E * 0.05 * sh(6.1, 10) + walk * 0.01 * Math.sin(t * 5.5));
  const yaw = kf(t, [[0, 6], [8, 3], [10, 2], [12.5, -4], [14.2, -6], [16, 6], [24, 1], [31, 0]]);
  const pitch = kf(t, [[0, 1], [8.6, 3], [10.2, 20], [12.5, 30], [14.2, 36], [15.8, -6], [17, 2], [26, 3], [32, 6]]);
  camera.position.set(0, 0, 0); camera.rotation.order = 'YXZ';
  camera.rotation.set(THREE.MathUtils.degToRad(pitch) + 0.002 * sh(1.3, 1) + E * 0.03 * sh(14, 2), THREE.MathUtils.degToRad(yaw) + 0.003 * sh(0.8, 2) + E * 0.03 * sh(11, 4), 0.002 * sh(1.1, 3));
  const fov = kf(t, [[0, 66], [34, 66]]); if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  rig.updateMatrixWorld(true); camera.getWorldPosition(camW); camera.getWorldQuaternion(camQ);
  const dropT = 14.55, held = t < dropT;
  mug.visible = held;
  hand.position.set(0.19 + 0.012 * Math.sin(t * 11.0) * walk, -0.27 + 0.014 * Math.sin(t * 11.0 + 1) * walk - kf(t, [[14.2, 0], [14.9, 0.1], [17, 0.2]]) + 0.1 * flinch, -0.5 + 0.12 * flinch);
  hand.rotation.set(0.15 + kf(t, [[14.2, 0], [15, -0.5]]), 0.2, -0.05 + kf(t, [[14.2, 0], [15, 0.5]]));
  if (held) for (let q = 0; q < 3; q++) { const ph = fmod(t * 0.9 + q / 3, 1), wp = new THREE.Vector3(0.0, 0.08 + ph * 0.16, 0); mug.localToWorld(wp); addPuff(wp.x, wp.y, wp.z, 0.04 + ph * 0.06, q, 1, 1, 1, 0.15 * (1 - ph) * smooth(t / 1.0)); }
  if (t >= dropT) {
    const s = t - dropT, x0 = rig.position.x + 0.2, z0 = rig.position.z - 0.5, y0 = 1.3, g = 0.2;
    const y = y0 - 4.9 * s * s, hit = y <= g, sT = Math.sqrt(Math.max(0, (y0 - g) / 4.9));
    mugW.visible = !hit && t < hitT(6); mugW.position.set(x0, Math.max(g, y), z0); mugW.rotation.set(s * 3, 0, s * 4);
    CUPS.forEach((c) => { c.m.visible = hit && t < hitT(6); if (hit) { const u = s - sT; c.m.position.set(x0 + c.vx * Math.min(u, 0.5) * 0.7, 0.19 + Math.max(0, c.vy * u - 4.9 * u * u) * 0.25, z0 + c.vz * Math.min(u, 0.5) * 0.7); c.m.rotation.set(0, c.vx * 3, 0); } });
  } else { mugW.visible = false; CUPS.forEach((c) => { c.m.visible = false; }); }
  drawAd(Tm);
  for (const s of SIGNALS) { const ph = fmod(t * 0.12 + s.z0 * 0.01, 1); s.lamp.material.color.set(t > 14.4 ? 0x1a1a1a : ph < 0.55 ? 0x35e07a : ph < 0.65 ? 0xf1c232 : 0xe03a3a); }

  /* the descent: a bright streak crossing the strip of sky above the avenue (about 7 real seconds) */
  if (t > 8.2 && t < 14.5) {
    const u = (t - 8.4) / 5.8, A = [-90, 520, -420], B = [-30, 60, -260];
    for (let k = 0; k < 40; k++) {
      const uu = u - k * 0.014; if (uu < 0) break;
      const x = lerp(A[0], B[0], uu * uu), y = lerp(A[1], B[1], uu * uu), z = lerp(A[2], B[2], uu * uu), f = k / 40;
      addPuff(x, y, z, (10 + k * 1.6) * (0.6 + 1.6 * uu), k, 5.0 - f * 3.4, 3.6 - f * 2.6, 2.4 - f * 1.8, (1.0 - f * 0.8) * clamp((t - 8.4) / 0.4));
    }
    addPuff(lerp(A[0], B[0], u * u), lerp(A[1], B[1], u * u), lerp(A[2], B[2], u * u), 40 + 380 * u * u * u, 0, 8, 7, 6, 1.0);
  }

  /* buildings: untouched, then the front strips and collapses them */
  let nb = 0;
  for (const b of buildings) {
    const hT = hitT(b.z), p = smooth((t - hT) / 2.8), q = Math.pow(p, 1.5);
    b.g.scale.set(1, 1 - 0.66 * q, 1); b.g.rotation.set(0, 0, b.side * 0.28 * q * (0.5 + 0.5 * Math.sin(b.seed * 5))); b.g.position.x = b.x - b.side * 3.0 * q; b.g.position.y = -0.5 * q;
    if (b.z > -320 && b.z < 30 && nb < 40 && t > hT - 0.1 && t < hT + 9) { nb++; const sT = t - hT, a = 0.7 * Math.exp(-sT * 0.28) * clamp(sT * 3); for (let k = 0; k < 10; k++) { const hx = hash2(nb * 9 + k, 1) - 0.5, hh = hash2(nb * 9 + k, 3); const fire = k < 4 && sT > 0.6; addPuff(b.x - b.side * (b.w / 2 + hx * 14), 2 + hh * b.h * 0.5 * (1 - 0.5 * q) + sT * 2.2, b.z + (hash2(nb * 9 + k, 2) - 0.5) * b.d, 8 + hh * 10 + sT * 5, hx * 3, fire ? 1.6 : 0.62, fire ? 0.62 : 0.55, fire ? 0.2 : 0.48, fire ? 0.55 * Math.min(1, sT / 1.5) : a); } }
  }
  /* vehicles: brake at the flash, ignite in the heat, are thrown by the front */
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i], tb = 14.0, drive = t < tb ? t : tb + 0.7 * (1 - Math.exp(-(t - tb) / 0.7));
    let z = fmod(c.z0 + c.dir * c.v * drive + 760, 800) - 760 + 40, x = c.lane, y = 0.05, yaw = c.dir > 0 ? Math.PI : 0, rx = 0, rz = 0;
    const s = Math.max(0, t - hitT(z));
    if (s > 0) { const lv = 22 + (c.i % 5) * 4; z += lv * Math.min(s, 1.6) + 0.5 * lv * Math.max(0, s - 1.6) * 0.0; x += c.slide * (3 + c.i % 4) * Math.min(s, 2); y += Math.max(0, 7 * s - 4.9 * s * s * 0.9); rx = s * 2.2 * c.slide; rz = s * 1.4; yaw += s * 1.6 * c.slide; }
    c.g.position.set(x, y, z); c.g.rotation.set(rx, yaw, rz);
    const ig = c.i % 3 === 0 ? 17.0 + (c.i % 7) * 0.3 : null, burn = ig === null ? 0 : smooth((t - ig) / 0.8);
    if (burn > 0.02) {
      carGlow.pos[i * 3] = x; carGlow.pos[i * 3 + 1] = y + 1.6; carGlow.pos[i * 3 + 2] = z;
      const fl = 0.8 + 0.2 * Math.sin(t * 19 + c.i * 5);
      for (let q = 0; q < 5; q++) { const u = q / 5; addPuff(x + Math.sin(t * 0.8 + c.i + q) * 0.8 + q * 0.8, y + 1.6 + q * 3.2, z + Math.cos(t * 0.7 + q) * 0.6, 2.2 + q * 2.4, c.i + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.45 * fl : 0.34 * (1 - u * 0.7)) * burn); }
    } else carGlow.pos[i * 3 + 1] = -60;
  }
  carGlow.geo.attributes.position.needsUpdate = true; carGlow.pts.material.opacity = 0.9;
  /* pedestrians: stop and look up, flinch at the flash, are knocked down by the front */
  for (const p of people) {
    const tt = Math.min(t, 10.0 + p.ph * 0.3);
    let x, z, face;
    if (p.cross) { x = fmod(p.x0 + p.dirv * p.sp * tt + 13, 26) - 13; z = p.z0; face = p.dirv > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = p.x0; z = fmod(p.z0 + p.dirv * p.sp * tt + 340, 360) - 340 + 30; face = p.dirv > 0 ? Math.PI : 0; }
    const moving = t < 10.0 + p.ph * 0.3, s = Math.max(0, t - hitT(z)), f = smooth(s / 0.4) * (1 - 0);
    const startled = smooth((t - 14.3) / 0.4);
    poseHuman(p.h, tt * 6.4 + p.ph, moving ? 1.0 : 0.0, Math.max(0.55 * startled, f), f);
    p.g.position.set(x + p.dirv * 0 + (f > 0 ? 6 * Math.min(s, 1.5) * (p.fx > 0 ? 1 : -1) : 0), 0.16 + (f > 0 ? Math.max(0, 3 * s - 4.9 * s * s * 0.8) : 0) - 0.4 * startled * 0.2, z + (f > 0 ? 9 * Math.min(s, 2) : 0));
    p.g.rotation.set(-1.45 * f - 0.25 * startled * (1 - f), face, (p.fx > 0 ? 1 : -1) * 0.3 * f);
  }
  /* shock front: glass, brick, cracks, dust wall */
  for (const c of cracks) { const w = c.w * smooth((t - hitT(c.m.position.z) - c.k * 0.05) / 0.8); c.m.visible = w > 0.01; c.m.scale.set(c.len * 1.04, 1, w * 3); }
  for (let i = 0; i < SHARDS_N; i++) {
    const h = shards[i], t0 = hitT(h.b.z) + (h.t0 % 3) * 0.15, s = t - t0;
    if (s < 0 || s > 7) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else { const y = h.y0 - 0.5 * 9.8 * s * s; dummy.position.set(h.b.x - h.b.side * (h.b.w / 2 + (h.drift * 3 + 2) * s), Math.max(0.2, y), h.b.z + h.oz + 18 * s); dummy.scale.set(h.s, h.s, 1); dummy.rotation.set(s * h.spin, s * h.spin * 0.7, s * h.spin * 0.4); }
    dummy.updateMatrix(); shardMesh.setMatrixAt(i, dummy.matrix);
  }
  shardMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < CHUNK_N; i++) {
    const d = chunks[i], t0 = hitT(d.b.z) + (d.t0 % 2) * 0.2, s = t - t0;
    if (s < 0) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); }
    else { const y = d.y0 - 0.5 * 9.8 * s * s, g = 0.25 * d.sy; dummy.position.set(d.b.x - d.b.side * (d.b.w / 2 + 0.6 + d.drift * Math.min(s, 1.6) * 2), Math.max(g + 0.1, y), d.b.z + d.oz + 12 * Math.min(s, 2.5)); dummy.scale.set(d.sx, d.sy, d.sz); dummy.rotation.set(Math.min(s, 2.4) * d.spin, Math.min(s, 2.4) * d.spin * 0.6, 0); }
    dummy.updateMatrix(); chunkMesh.setMatrixAt(i, dummy.matrix);
  }
  chunkMesh.instanceMatrix.needsUpdate = true;
  // the front itself: a wall of dust and fire sweeping toward the camera
  if (t > T_FR0 - 0.2) {
    const zf = Z_FAR + (t - T_FR0) * V_FRONT;
    for (let k = 0; k < 36; k++) { const hx = (hash2(k, 71) - 0.5) * 40, hh = hash2(k, 72), back = hash2(k, 73) * 70; addPuff(hx, 3 + hh * 40, zf - back, 24 + hh * 30, k, 0.55 + hh * 0.3, 0.42 + hh * 0.15, 0.34, 0.5 * (1 - back / 90)); }
    for (let k = 0; k < 18; k++) { const hx = (hash2(k, 74) - 0.5) * 30, hh = hash2(k, 75); addPuff(hx, 1 + hh * 18, zf - 6 - hash2(k, 76) * 30, 14 + hh * 18, k, 1.8, 0.7, 0.22, 0.45 * (1 - hash2(k, 76))); }
  }
  /* the heat: windows and shopfronts ignite everywhere at once */
  for (let i = 0; i < NBF; i++) {
    const f = BFIRE[i], t0 = 16.2 + hash2(i, 34) * 2.4, burn = smooth((Tm - t0) / 1.0);
    if (burn <= 0.02) { bfGlow.pos[i * 3 + 1] = -200; continue; }
    bfGlow.pos[i * 3] = f.x; bfGlow.pos[i * 3 + 1] = f.y; bfGlow.pos[i * 3 + 2] = f.z;
    const fl = 0.8 + 0.2 * Math.sin(Tm * 17 + f.ph * 7);
    for (let q = 0; q < 6; q++) { const u = q / 6; addPuff(f.x - Math.sign(f.x) * (q * 0.5), f.y + 2 + q * 8, f.z + Math.cos(Tm * 0.7 + q) * 1.5, 5 + q * 5, f.ph + q, q < 1 ? 1.0 : 0.15, q < 1 ? 0.5 : 0.13, q < 1 ? 0.18 : 0.12, (q < 1 ? 0.5 * fl : 0.36 * (1 - u * 0.7)) * burn); }
  }
  bfGlow.geo.attributes.position.needsUpdate = true; bfGlow.pts.material.opacity = 0.9;
  embers.pts.material.opacity = 0.9 * smooth((t - 16.4) / 1.5);
  if (t > 16.4) for (let i = 0; i < EMB_N; i++) { const e = EMB[i], y = 60 - fmod(e.y0 + t * e.sp * 3, 62); embers.pos[i * 3] = e.x + Math.sin(t * 0.7 + e.ph * 6) * 3; embers.pos[i * 3 + 1] = Math.max(0.2, y); embers.pos[i * 3 + 2] = e.z + Math.cos(t * 0.6 + e.ph * 5) * 2.5; }
  embers.geo.attributes.position.needsUpdate = true;
  for (let k = 0; k < 26; k++) { const ph = fmod(t * 0.22 + k / 26, 1), w = 1.6 + ph * 7; addPuff(steam.x + Math.sin(t * 0.5 + k) * 0.7 + ph * 5, 3.2 + ph * 26, steam.z + Math.cos(k) * 0.6, w, k, 0.97, 0.97, 0.97, 0.5 * (1 - ph) * clamp(ph * 5)); }
  const bt = t - 14.3;
  for (let i = 0; i < PIG_N; i++) { const b = PIG[i]; if (bt < 0 || bt > 12) { pigeons.pos[i * 3 + 1] = -200; continue; } pigeons.pos[i * 3] = b.x + b.vx * bt + Math.sin(bt * 4 + b.ph) * 1.2; pigeons.pos[i * 3 + 1] = 2 + b.vy * Math.min(bt, 4) + Math.sin(bt * 6 + b.ph) * 0.7; pigeons.pos[i * 3 + 2] = b.z + b.vz * bt; }
  pigeons.geo.attributes.position.needsUpdate = true; pigeons.pts.material.opacity = 0.9 * (1 - smooth((bt - 8) / 3));
  { const ca = 1 - smooth((t - 12) / 2); if (ca > 0.01) for (let c = 0; c < 8; c++) { const cx = (hash2(c, 21) - 0.5) * 900, cy = 380 + hash2(c, 22) * 260, cz = -1500 - hash2(c, 23) * 900, cw = 130 + hash2(c, 24) * 160; for (let k = 0; k < 8; k++) { const ox = (hash2(c * 9 + k, 31) - 0.5) * cw * 2.2, oy = (hash2(c * 9 + k, 32) - 0.35) * cw * 0.5, sz = cw * (0.55 + hash2(c * 9 + k, 33) * 0.7); const L = 0.97 - Math.max(0, -oy / cw) * 0.14; addPuff(cx + ox + t * 3, cy + oy, cz, sz, hash2(c * 9 + k, 35) * 0.5 - 0.25, L, L * 0.98, L * 0.94, 0.72 * ca); } } }
