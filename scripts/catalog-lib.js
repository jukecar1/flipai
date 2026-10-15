'use strict';
// Turns the store's Google Sheet (published as CSV) into src/products.json, and back again.
// Kept free of dependencies so it runs anywhere Node 18+ does.

const DEPARTMENTS = require('./departments.json');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const DEPT_LOOKUP = new Map();
DEPARTMENTS.forEach((d) => { DEPT_LOOKUP.set(norm(d.id), d.id); DEPT_LOOKUP.set(norm(d.name), d.id); });
// A few forgiving aliases people are likely to type.
Object.entries({ 'living room': 'living', 'kitchen and dining': 'dining', 'dining': 'dining', 'decor': 'decor', 'home accents': 'decor', 'storage': 'storage', 'kids': 'kids', 'mattresses': 'mattress', 'entryway': 'entry', 'home office': 'office' })
  .forEach(([k, v]) => DEPT_LOOKUP.set(norm(k), v));

/** Minimal CSV parser: quoted fields, escaped quotes, CRLF, BOM. Returns an array of rows (arrays of strings). */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i += 1; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

const truthy = (v) => /^(true|yes|y|1|x|new|best)$/i.test(String(v || '').trim());

/** Short, stable id from what identifies an item, so edits to price or flags never change an item's web address. */
function makeId(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(6, '0').slice(0, 7);
}

const HEADERS = ['id', 'name', 'department', 'type', 'price', 'photo', 'new', 'best_seller', 'hidden'];

function parsePrice(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return { value: null };
  const n = Number(s.replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return { value: null, bad: true };
  return { value: Math.round(n * 100) / 100 };
}

/** rows: CSV rows including the header row. Returns { products, warnings, skipped }. */
function rowsToProducts(rows) {
  const warnings = [];
  if (!rows.length) return { products: [], warnings: ['The sheet is empty.'], skipped: 0 };
  const head = rows[0].map((h) => norm(h).replace(/ /g, '_'));
  const idx = {};
  HEADERS.forEach((h) => { idx[h] = head.indexOf(h); });
  const aliases = { department: ['dept', 'collection', 'category'], best_seller: ['bestseller', 'best_sellers', 'popular'], photo: ['image', 'image_url', 'photo_url', 'picture'], name: ['item', 'product', 'title'] };
  Object.entries(aliases).forEach(([h, list]) => { if (idx[h] < 0) list.forEach((a) => { if (idx[h] < 0) idx[h] = head.indexOf(a); }); });
  const missing = ['name', 'department', 'type', 'photo'].filter((h) => idx[h] < 0);
  if (missing.length) return { products: [], warnings: [`Missing column(s): ${missing.join(', ')}. The first row must contain: ${HEADERS.join(', ')}.`], skipped: rows.length - 1 };

  const get = (r, h) => (idx[h] >= 0 ? String(r[idx[h]] == null ? '' : r[idx[h]]).trim().replace(/\s+/g, ' ') : '');
  const products = [];
  const seenIds = new Set();
  const keyCount = new Map();
  let skipped = 0;
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    if (truthy(get(r, 'hidden'))) { skipped += 1; return; }
    const name = get(r, 'name');
    const deptRaw = get(r, 'department');
    const type = get(r, 'type');
    const photo = get(r, 'photo');
    if (!name) { warnings.push(`Row ${line}: no name, skipped.`); skipped += 1; return; }
    const dept = DEPT_LOOKUP.get(norm(deptRaw));
    if (!dept) { warnings.push(`Row ${line} (${name}): unknown department "${deptRaw}", skipped.`); skipped += 1; return; }
    if (!type) { warnings.push(`Row ${line} (${name}): no type, skipped.`); skipped += 1; return; }
    if (!photo) { warnings.push(`Row ${line} (${name}): no photo, skipped.`); skipped += 1; return; }
    const price = parsePrice(get(r, 'price'));
    if (price.bad) warnings.push(`Row ${line} (${name}): price "${get(r, 'price')}" is not a number, shown as "Ask for price".`);

    let id = get(r, 'id').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!id) {
      const key = `${dept}|${name}|${type}|${photo}`;
      const n = (keyCount.get(key) || 0) + 1;
      keyCount.set(key, n);
      id = makeId(key) + (n > 1 ? String.fromCharCode(96 + n) : '');
    }
    if (seenIds.has(id)) { warnings.push(`Row ${line} (${name}): the id "${id}" is already used, skipped.`); skipped += 1; return; }
    seenIds.add(id);

    const item = { id, n: name, c: dept, t: type, i: photo };
    if (price.value != null) item.p = price.value;
    if (truthy(get(r, 'new'))) item.nw = true;
    if (truthy(get(r, 'best_seller'))) item.b = true;
    products.push(item);
  });
  return { products, warnings, skipped };
}

function productsToRows(products) {
  const name = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d.name]));
  return [HEADERS, ...products.map((p) => [p.id, p.n, name[p.c] || p.c, p.t, p.p != null ? p.p : '', p.i, p.nw ? 'TRUE' : '', p.b ? 'TRUE' : '', ''])];
}

module.exports = { parseCSV, toCSV, rowsToProducts, productsToRows, makeId, parsePrice, DEPARTMENTS, HEADERS };
