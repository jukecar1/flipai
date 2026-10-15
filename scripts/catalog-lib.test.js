'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCSV, toCSV, rowsToProducts, productsToRows, makeId } = require('./catalog-lib');

const HEAD = 'id,name,department,type,price,photo,new,best_seller,hidden\n';
const run = (body) => rowsToProducts(parseCSV(HEAD + body));

test('parses quoted fields, commas, escaped quotes and CRLF', () => {
  const rows = parseCSV('a,b\r\n"x, y","say ""hi"""\r\n');
  assert.deepStrictEqual(rows, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('maps a valid row, keeps price, flags and department names', () => {
  const { products, warnings } = run(',Test Sofa,Living Room,Sofas,"$1,299.50",A1.jpg,yes,TRUE,\n');
  assert.strictEqual(warnings.length, 0);
  assert.deepStrictEqual(products[0], { id: products[0].id, n: 'Test Sofa', c: 'living', t: 'Sofas', i: 'A1.jpg', p: 1299.5, nw: true, b: true });
});

test('blank price means no price field; bad price warns', () => {
  const a = run(',Chair,Bedroom,Chairs,,A1.jpg,,,\n').products[0];
  assert.ok(!('p' in a));
  const b = run(',Chair,Bedroom,Chairs,call us,A1.jpg,,,\n');
  assert.strictEqual(b.warnings.length, 1);
  assert.ok(!('p' in b.products[0]));
});

test('skips hidden rows and rows missing required values, with a reason', () => {
  const r = run(',Hidden,Living Room,Sofas,10,A.jpg,,,yes\n,,Living Room,Sofas,10,A.jpg,,,\n,Odd,Garage,Sofas,10,A.jpg,,,\n,NoPhoto,Living Room,Sofas,10,,,,\n');
  assert.strictEqual(r.products.length, 0);
  assert.strictEqual(r.skipped, 4);
  assert.strictEqual(r.warnings.length, 3);
});

test('ids are stable when price or flags change, and unique for duplicates', () => {
  const a = run(',Sofa,Living Room,Sofas,100,A.jpg,,,\n').products[0].id;
  const b = run(',Sofa,Living Room,Sofas,999,A.jpg,yes,yes,\n').products[0].id;
  assert.strictEqual(a, b);
  const d = run(',Sofa,Living Room,Sofas,1,A.jpg,,,\n,Sofa,Living Room,Sofas,1,A.jpg,,,\n').products;
  assert.notStrictEqual(d[0].id, d[1].id);
});

test('an explicit id column wins, and duplicate ids are rejected', () => {
  const r = run('SKU-1,A,Rugs,Rugs,5,A.jpg,,,\nsku1,B,Rugs,Rugs,5,B.jpg,,,\n');
  assert.strictEqual(r.products[0].id, 'sku1');
  assert.strictEqual(r.products.length, 1);
  assert.strictEqual(r.warnings.length, 1);
});

test('missing columns give a clear message', () => {
  const r = rowsToProducts(parseCSV('name,price\nSofa,5\n'));
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
