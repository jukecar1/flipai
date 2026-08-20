// One-off utility: rasterizes scripts/icon.svg into the PNG sizes the web
// manifest and native app stores need. Run with: node scripts/generate-icons.js
const path = require('path');
const sharp = require('sharp');

const svgPath = path.join(__dirname, 'icon.svg');
const publicDir = path.join(__dirname, '..', 'public');

const targets = [
  { file: path.join(publicDir, 'logo192.png'), size: 192 },
  { file: path.join(publicDir, 'logo512.png'), size: 512 },
  { file: path.join(publicDir, 'apple-touch-icon.png'), size: 180 },
  { file: path.join(__dirname, 'app-store-icon-1024.png'), size: 1024 },
];

(async () => {
  for (const t of targets) {
    // App Store icons must not carry an alpha channel — flatten onto the
    // icon's own background color so the exported PNG is fully opaque.
    await sharp(svgPath, { density: 384 })
      .resize(t.size, t.size)
      .flatten({ background: '#e2263a' })
      .png()
      .toFile(t.file);
    console.log('wrote', t.file);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
