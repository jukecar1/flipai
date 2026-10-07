const RUB_PER = 7;
const rubMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), buildings.length * RUB_PER);
rubMesh.frustumCulled = false; rubMesh.castShadow = true; rubMesh.receiveShadow = true; scene.add(rubMesh);
const RUBD = buildings.map((b, bi) => Array.from({ length: RUB_PER }, (_, k) => ({ ox: (hash2(bi * 7 + k, 1) - 0.5) * b.w * 0.8, oz: (hash2(bi * 7 + k, 2) - 0.5) * b.d * 0.9, sx: 3 + hash2(bi * 7 + k, 3) * 6, sy: 0.7 + hash2(bi * 7 + k, 4) * 2.2 * (0.45 + Math.min(1, b.h / 110)), sz: 3 + hash2(bi * 7 + k, 5) * 7, ry: hash2(bi * 7 + k, 6) * 3.14 })));
{ const c = new THREE.Color(), cols = [0x5a544e, 0x6a5e52, 0x46423e, 0x7a6a5a, 0x8a4a34]; for (let i = 0; i < buildings.length * RUB_PER; i++) rubMesh.setColorAt(i, c.set(cols[Math.floor(hash2(i, 9) * cols.length)])); }
