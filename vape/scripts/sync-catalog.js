#!/usr/bin/env node
'use strict';
// Pulls the store's Google Sheet (published as CSV) and rewrites src/products.json.
//
//   CATALOG_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/.../pub?output=csv  npm run sync
//   npm run sync -- --file catalog/catalog.csv        (use a local file instead)
//   npm run sync -- --dry-run                         (show what would change, write nothing)
//   npm run sync -- --force                           (allow a big drop in item count)

const fs = require('fs');
const path = require('path');
const { parseCSV, rowsToProducts } = require('./catalog-lib');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };

const OUT = path.resolve(opt('out') || path.join(__dirname, '..', 'src', 'products.json'));

async function readSource() {
  const file = opt('file');
  if (file) return fs.readFileSync(path.resolve(file), 'utf8');
  const url = process.env.CATALOG_SHEET_CSV_URL;
  if (!url) throw new Error('Set CATALOG_SHEET_CSV_URL to the published CSV link of the Google Sheet, or pass --file <csv>.');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Could not download the sheet (HTTP ${res.status}). Check that it is published to the web.`);
  const text = await res.text();
  if (/^\s*</.test(text)) throw new Error('The link returned a web page, not a CSV. In Google Sheets use File, Share, Publish to web, choose the sheet and "Comma-separated values (.csv)".');
  return text;
}

(async () => {
  const text = await readSource();
  const { products, warnings, skipped } = rowsToProducts(parseCSV(text));
  warnings.forEach((w) => console.log(`warning: ${w}`));
  if (!products.length) throw new Error('No valid items were found, so nothing was changed.');

  let before = [];
  try { before = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* first run */ }
  if (before.length && products.length < before.length * 0.5 && !flag('force')) {
    throw new Error(`The sheet has ${products.length} items but the site has ${before.length}. That is a drop of more than half, so nothing was changed. If it is intended, run again with --force.`);
  }

  const prev = new Map(before.map((p) => [p.id, p]));
  const next = new Map(products.map((p) => [p.id, p]));
  const added = products.filter((p) => !prev.has(p.id));
  const removed = before.filter((p) => !next.has(p.id));
  const changed = products.filter((p) => prev.has(p.id) && JSON.stringify(prev.get(p.id)) !== JSON.stringify(p));

  const json = JSON.stringify(products);
  const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === json;
  console.log(`items: ${products.length} (priced ${products.filter((p) => p.p != null).length}, new ${products.filter((p) => p.nw).length}, best sellers ${products.filter((p) => p.b).length})`);
  console.log(`added ${added.length}, changed ${changed.length}, removed ${removed.length}, skipped rows ${skipped}`);
  added.slice(0, 5).forEach((p) => console.log(`  + ${p.n}`));
  if (flag('dry-run')) { console.log('dry run: nothing written.'); return; }
  if (same) { console.log('no changes.'); return; }
  fs.writeFileSync(OUT, json);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
})().catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
