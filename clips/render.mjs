// Renders a clip frame-by-frame with headless Chromium (software WebGL), then
// stitches the frames into an MP4 with ffmpeg.
//
//   node clips/render.mjs yellowstone --stills 0,2.5,4,6,8,11,14,16.5     # contact-sheet frames
//   node clips/render.mjs yellowstone --fps 30 --dpr 2 --out out.mp4        # full 1080x1920 render
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const clip = args[0];
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const fps = +opt('fps', 30);
const dpr = +opt('dpr', 1);
const stills = opt('stills', null);
const outDir = path.resolve(opt('dir', path.join(root, 'clips', '.frames', clip)));
const outFile = path.resolve(opt('out', path.join(root, 'clips', `${clip}.mp4`)));
const audio = opt('audio', null);

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/clips/${clip}/index.html?manual&dpr=${dpr}`);
await page.waitForFunction('window.READY === true', null, { timeout: 60000 });

fs.mkdirSync(outDir, { recursive: true });
const shot = async (t, file) => {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.screenshot({ path: file, type: 'jpeg', quality: 93 });
};

if (stills) {
  const ts = stills.split(',').map(Number);
  for (const t of ts) { const f = path.join(outDir, `still_${t.toFixed(2)}.jpg`); await shot(t, f); console.log(f); }
} else {
  const T = await page.evaluate('window.T_END');
  const n = Math.round(T * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await shot(i / fps, path.join(outDir, `f_${String(i).padStart(5, '0')}.jpg`));
    if (i % 30 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  const ff = ['-y', '-framerate', String(fps), '-i', path.join(outDir, 'f_%05d.jpg')];
  if (audio) ff.push('-i', path.resolve(audio));
  ff.push('-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18');
  if (audio) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-movflags', '+faststart', outFile);
  const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
  console.log(r.status === 0 ? `wrote ${outFile}` : 'ffmpeg failed');
}
await browser.close();
server.close();
