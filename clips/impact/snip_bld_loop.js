  let nb = 0;
  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi], hT = hitT(b.z), pr = (t - hT) / 1.7, p = smooth(pr), q = Math.pow(p, 1.1);
    b.g.visible = p < 0.985;
    b.g.scale.set(1 + 0.12 * q, Math.max(0.03, 1 - 0.97 * q), 1 + 0.12 * q); b.g.rotation.set(0.12 * q * Math.sin(b.seed * 3), 0, b.side * 0.34 * q * (0.5 + 0.5 * Math.sin(b.seed * 5))); b.g.position.x = b.x - b.side * 3.0 * q; b.g.position.y = -0.5 * q;
    for (let k = 0; k < RUB_PER; k++) { const d = RUBD[bi][k], s = smooth((p - 0.2) / 0.7); dummy.position.set(b.x + d.ox, 0.5 * d.sy * s, b.z + d.oz); dummy.scale.set(Math.max(0.001, d.sx * s), Math.max(0.001, d.sy * s), Math.max(0.001, d.sz * s)); dummy.rotation.set(0, d.ry, 0); dummy.updateMatrix(); rubMesh.setMatrixAt(bi * RUB_PER + k, dummy.matrix); }
    if (b.z > -420 && b.z < 40 && nb < 70 && t > hT - 0.1 && t < hT + 14) { nb++; const sT = t - hT, a = 0.5 * Math.exp(-sT * 0.22) * clamp(sT * 3); for (let k = 0; k < 11; k++) { const hx = hash2(nb * 9 + k, 1) - 0.5, hh = hash2(nb * 9 + k, 3); const fire = k < 5 && sT > 0.5; addPuff(b.x - b.side * (b.w / 2 + hx * 14), 2 + hh * b.h * 0.5 * (1 - 0.6 * q) + sT * (fire ? 3.2 : 2.2), b.z + (hash2(nb * 9 + k, 2) - 0.5) * b.d, (fire ? 7 : 8) + hh * 10 + sT * (fire ? 3 : 5), hx * 3, fire ? 1.7 : 0.62, fire ? 0.62 : 0.55, fire ? 0.2 : 0.48, fire ? 0.7 * Math.min(1, sT / 1.2) : a); } }
  }
  rubMesh.instanceMatrix.needsUpdate = true; if (rubMesh.instanceColor) rubMesh.instanceColor.needsUpdate = true;
  for (const f of FARTOW) { const p = smooth((t - 16.2 - f.seed * 1.8) / 1.6); f.m.visible = p < 0.985; f.m.scale.set(1 + 0.1 * p, Math.max(0.03, 1 - 0.97 * p), 1 + 0.1 * p); f.m.position.y = f.h / 2 * (1 - 0.97 * p); if (p > 0.1 && p < 1) addPuff(f.m.position.x, 10 + f.h * 0.3 * (1 - p), f.m.position.z, 60 + f.seed * 40, f.seed * 4, 0.62, 0.5, 0.42, 0.45 * (1 - p * 0.4)); }
