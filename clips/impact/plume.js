
  /* ===== the impact: asteroid streak, flash, plume, ejecta (driven by master time) ===== */
  const PB = { x: -380, z: -3450 };
  // approach: a bright streak falling toward the horizon (about 7 real seconds, shown a little slower)
  if (Tm > 10.3 && Tm < 14.4) {
    const u = (Tm - 10.5) / 3.5, A = [-60, 700, -3250], B = [PB.x + 20, 25, PB.z + 40];
    for (let k = 0; k < 46; k++) {
      const uu = u - k * 0.012; if (uu < 0) break;
      const x = lerp(A[0], B[0], uu), y = lerp(A[1], B[1], uu), z = lerp(A[2], B[2], uu);
      const f = k / 46;
      addPuff(x, y, z, 26 + k * 2.2 + (uu > 0.9 ? 16 : 0), k, 5.0 - f * 3.4, 3.6 - f * 2.6, 2.4 - f * 1.8, (1.0 - f * 0.8) * clamp((Tm - 10.5) / 0.4));
    }
    if (u >= 0 && u <= 1.02) addPuff(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u), 110, 0, 8, 7, 6, 1.0);
  }
  if (Tm >= 14) {
    const s = Tm - 14, fk = Math.exp(-s * 3.2);
    hemi.intensity += Math.PI * 1.6 * fk; sun.intensity += Math.PI * 1.4 * fk;
    // fireball glow on the horizon
    addPuff(PB.x, 40, PB.z, 1500 * smooth(s / 1.1), 0.3, 6.5, 3.4, 1.2, 1.0 * Math.exp(-s * 0.04) * smooth(s / 0.15));
    addPuff(PB.x - 80, 20, PB.z + 60, 1000 * smooth(s / 1.4), 1.1, 5.5, 2.4, 0.8, 0.9 * Math.exp(-s * 0.03));
    // rising column + spreading cap
    const H = 760 * (1 - Math.exp(-s / 7)), R = 80 + 460 * (1 - Math.exp(-s / 9));
    for (let k = 0; k < 44; k++) {
      const f = k / 43, y = 8 + H * f, w = 90 + f * 150 + R * 0.15 * f;
      const wob = Math.sin(Tm * 0.7 + k * 0.9) * 10 * f;
      const hot = Math.max(0, 1 - f * 1.6 - s * 0.01);
      addPuff(PB.x + wob * 2, y, PB.z + Math.cos(k) * 24, w, k * 0.7, 0.2 + hot * 2.6, 0.16 + hot * 1.0, 0.13 + hot * 0.25, 0.7 * smooth(s / 1.5) * clamp(H / 40 - f * 0.5));
    }
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * 6.283, rr = R * (0.55 + 0.45 * hash2(k, 5));
      addPuff(PB.x + Math.cos(a) * rr, 8 + H + Math.sin(a * 3) * 14, PB.z + Math.sin(a) * rr * 0.55, 150 + 90 * hash2(k, 6), a, 0.3, 0.23, 0.2, 0.55 * smooth((s - 3) / 4));
    }
  }
  // ejecta falling back through the sky (streaks of glowing debris)
  {
    const ea = smooth((Tm - 44) / 4);
    ejecta.pts.material.opacity = 0.95 * ea;
    if (ea > 0.01) for (let i = 0; i < EJ_N; i++) {
      const e = EJ[i], p = (Tm * 0.5 + e.ph) % 1;
      for (let j = 0; j < 14; j++) {
        const q = p * 640 - j * 7, k = (i * 14 + j) * 3;
        ejecta.pos[k] = e.x + 0.34 * q; ejecta.pos[k + 1] = e.y - 0.92 * q; ejecta.pos[k + 2] = e.z + 0.12 * q;
      }
    }
    ejecta.geo.attributes.position.needsUpdate = true;
  }
