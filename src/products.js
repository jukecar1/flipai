// Catalog loaded from products.json: n = name, c = collection id, t = product type, i = image asset, p = price in dollars (when listed).
// Items without a price read "Call for price".
import data from './products.json';
import popular from './popular.json';

export const PRODUCTS = data.map((x, k) => ({ id: k, cat: x.c, type: x.t, name: x.n, img: x.i, price: x.p ?? null }));

export const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Best-sellers, most popular first. Fill src/popular.json with exact product names; until it has entries the
// "Most popular" sort stays hidden, because the catalog itself carries no sales data.
const RANK = new Map(popular.map((n, i) => [n, i]));
export const HAS_POPULAR = popular.length > 0;
export const popularRank = (p) => (RANK.has(p.name) ? RANK.get(p.name) : Infinity);
