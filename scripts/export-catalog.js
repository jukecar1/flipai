#!/usr/bin/env node
'use strict';
// Writes the current src/products.json out as catalog/catalog.csv: the starting sheet to import into Google Sheets.
const fs = require('fs');
const path = require('path');
const { productsToRows, toCSV } = require('./catalog-lib');

const src = path.join(__dirname, '..', 'src', 'products.json');
const out = path.join(__dirname, '..', 'catalog', 'catalog.csv');
const products = JSON.parse(fs.readFileSync(src, 'utf8'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, toCSV(productsToRows(products)));
console.log(`wrote ${path.relative(process.cwd(), out)} (${products.length} items)`);
