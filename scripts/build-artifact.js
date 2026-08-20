// Packages the CRA production build (build/) into a single self-contained
// HTML file for play-in-browser distribution (e.g. Claude Artifacts) —
// inlines the JS bundle, CSS, and self-hosted fonts (as base64 data URIs)
// so nothing needs a live static file server. Run `npm run build` first.
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const outPath = process.argv[2] || '/tmp/fight-empire.html';

const jsFile = fs.readdirSync(path.join(buildDir, 'static/js')).find(f => f.startsWith('main.') && f.endsWith('.js'));
const cssFile = fs.readdirSync(path.join(buildDir, 'static/css')).find(f => f.startsWith('main.') && f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('Could not find build/static/js/main.*.js or build/static/css/main.*.css — run `npm run build` first.');

const js = fs.readFileSync(path.join(buildDir, 'static/js', jsFile), 'utf8');
let css = fs.readFileSync(path.join(buildDir, 'static/css', cssFile), 'utf8');

// Inline every url(/static/media/...) reference (self-hosted fonts) as a data URI.
const mediaDir = path.join(buildDir, 'static/media');
css = css.replace(/url\(\/static\/media\/([^)]+)\)/g, (match, filename) => {
  const filePath = path.join(mediaDir, filename);
  const ext = path.extname(filename).slice(1);
  const mime = ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : `font/${ext}`;
  const data = fs.readFileSync(filePath).toString('base64');
  return `url(data:${mime};base64,${data})`;
});

// Guard against the JS bundle containing a literal "</script" sequence,
// which would otherwise terminate our inline <script> tag early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>Fight Empire</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<style>
${css}
</style>
<div id="root"></div>
<script>
${safeJs}
</script>
`;

fs.writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
