'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCSV, toCSV, rowsToProducts, productsToRows, makeId } = require('./catalog-lib');

// id,name,department,type,price,photo,options_label,options,description,new,best_seller,hidden
const HEAD = 'id,name,department,type,price,photo,options_label,options,description,new,best_seller,hidden\n';
const run = (body) => rowsToProducts(parseCSV(HEAD + body));

test('parses quoted fields, commas, escaped quotes and CRLF', () => {
  const rows = parseCSV('a,b\r\n"x, y","say ""hi"""\r\n');
  assert.deepStrictEqual(rows, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('maps a valid row with price, flavors, description and flags', () => {
  const { products, warnings } = run(',Test Pod,Vape,Pods,"$12.50",photos/a.webp,Flavor,Mint|Berry,A pod.,yes,TRUE,\n');
  assert.strictEqual(warnings.length, 0);
  assert.deepStrictEqual(products[0], { id: products[0].id, n: 'Test Pod', c: 'vape', t: 'Pods', i: 'photos/a.webp', p: 12.5, ol: 'Flavor', o: ['Mint', 'Berry'], d: 'A pod.', nw: true, b: true });
});

test('blank price means no price field; bad price warns', () => {
  const a = run(',Pod,Vape,Pods,,a.webp,,,,,,\n').products[0];
  assert.ok(!('p' in a));
  const b = run(',Pod,Vape,Pods,call us,a.webp,,,,,,\n');
  assert.strictEqual(b.warnings.length, 1);
  assert.ok(!('p' in b.products[0]));
});

test('skips hidden rows and rows missing required values, with a reason', () => {
  const r = run(',Hidden,Vape,Pods,10,a.webp,,,,,,yes\n,,Vape,Pods,10,a.webp,,,,,,\n,Odd,Garage,Pods,10,a.webp,,,,,,\n,NoPhoto,Vape,Pods,10,,,,,,,\n');
  assert.strictEqual(r.products.length, 0);
  assert.strictEqual(r.skipped, 4);
  assert.strictEqual(r.warnings.length, 3);
});

test('ids are stable when price or flags change, and unique for duplicates', () => {
  const a = run(',Pod,Vape,Pods,100,a.webp,,,,,,\n').products[0].id;
  const b = run(',Pod,Vape,Pods,999,a.webp,,,,yes,yes,\n').products[0].id;
  assert.strictEqual(a, b);
  const d = run(',Pod,Vape,Pods,1,a.webp,,,,,,\n,Pod,Vape,Pods,1,a.webp,,,,,,\n').products;
  assert.notStrictEqual(d[0].id, d[1].id);
});

test('an explicit id column wins, and duplicate ids are rejected', () => {
  const r = run('SKU-1,A,Kratom,Powder,5,a.webp,,,,,,\nsku1,B,Kratom,Powder,5,b.webp,,,,,,\n');
  assert.strictEqual(r.products[0].id, 'sku1');
  assert.strictEqual(r.products.length, 1);
  assert.strictEqual(r.warnings.length, 1);
});

test('missing columns give a clear message', () => {
  const r = rowsToProducts(parseCSV('name,price\nPod,5\n'));
  assert.strictEqual(r.products.length, 0);
  assert.match(r.warnings[0], /Missing column/);
});

test('export then import round-trips the whole catalog', () => {
  const products = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'products.json'), 'utf8'));
  const back = rowsToProducts(parseCSV(toCSV(productsToRows(products))));
  assert.strictEqual(back.warnings.length, 0);
  assert.deepStrictEqual(back.products, products);
  assert.ok(makeId('x').length >= 6);
});
