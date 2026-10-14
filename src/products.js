// Catalog loaded from products.json: n = name, c = collection id, t = product type, i = image asset, p = price in dollars (when listed).
// Items without a price read "Call for price".
import data from './products.json';

export const PRODUCTS = data.map((x, k) => ({ id: k, cat: x.c, type: x.t, name: x.n, img: x.i, price: x.p ?? null }));

export const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
