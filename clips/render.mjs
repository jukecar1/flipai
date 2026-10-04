// Renders a clip frame-by-frame with headless Chromium (software WebGL) and streams the
// frames straight into ffmpeg (no frames on disk), muxing an optional audio track.
//
//   node clips/render.mjs yellowstone --stills 0,12.5,30            # a few preview frames
//   node clips/render.mjs yellowstone --fps 30 --dpr 2 --blur 2 --audio clips/yellowstone/audio.wav --out clips/yellowstone.mp4
//   (--from/--to take a time range in seconds, handy for short previews)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
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
const blur = +opt('blur', 2);
const from = +opt('from', 0);
const toOpt = opt('to', null);

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
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
// CSS viewport is 540x960; deviceScaleFactor makes screenshots (and the WebGL buffer) real 1080x1920 at dpr=2
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: dpr });
page.on('console', (m) => { const t = m.text(); if (!t.includes('404')) console.log('[page]', t); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/clips/${clip}/index.html?manual&dpr=${dpr}`);
await page.waitForFunction('window.READY === true', null, { timeout: 120000 });

fs.mkdirSync(outDir, { recursive: true });
const shot = async (t, sub = 1, dt = 1 / 60) => {
  await page.evaluate(([tt, ss, dd]) => window.renderAt(tt, ss, dd), [t, sub, dt]);
  return page.screenshot({ type: 'jpeg', quality: 92, timeout: 600000 });
};

if (stills) {
  for (const t of stills.split(',').map(Number)) {
    const f = path.join(outDir, `still_${t.toFixed(2)}.jpg`);
    fs.writeFileSync(f, await shot(t));
    console.log(f);
  }
} else {
  const T = await page.evaluate('window.T_END');
  const t1 = toOpt === null ? T : +toOpt;
  const i0 = Math.round(from * fps), n = Math.round(t1 * fps);
  const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (audio) ffArgs.push('-ss', String(i0 / fps), '-i', path.resolve(audio));
  ffArgs.push('-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps));
  if (audio) ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ffArgs.push('-movflags', '+faststart', outFile);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  const t0 = Date.now();
  for (let i = i0; i < n; i++) {
    const tc = i / fps;
    const sub = (tc > 11.3 && tc < 16) || (tc > 27 && tc < 36) ? blur : 1;
    const buf = await shot(tc, sub, 0.5 / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((i - i0) % 60 === 0) {
      fs.writeFileSync(path.join(outDir, `check_${String(i).padStart(5, '0')}.jpg`), buf);
      const el = (Date.now() - t0) / 1000, d = i - i0 + 1;
      console.log(`frame ${i}/${n}  ${el.toFixed(0)}s  eta ${(el / d * (n - i - 1) / 60).toFixed(0)} min`);
    }
  }
  ff.stdin.end();
  const code = await done;
  console.log(code === 0 ? `wrote ${outFile}` : `ffmpeg failed (${code})`);
}
await browser.close();
server.close();
