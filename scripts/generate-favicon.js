const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const svgPath = path.join(__dirname, 'icon.svg');
const publicDir = path.join(__dirname, '..', 'public');

(async () => {
  const sizes = [16, 32, 48];
  const buffers = await Promise.all(
    sizes.map(size => sharp(svgPath, { density: 384 }).resize(size, size).png().toBuffer())
  );
  const ico = await pngToIco(buffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
  console.log('wrote favicon.ico');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
