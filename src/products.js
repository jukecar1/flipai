// Catalog loaded from products.json: n = name, c = collection id, t = product type, i = image asset, p = price in dollars (when listed).
// Items without a price read "Call for price".
import data from './products.json';
import popular from './popular.json';

export const PRODUCTS = data.map((x, k) => ({ id: k, cat: x.c, type: x.t, name: x.n, img: x.i, price: x.p ?? null }));

export const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Best-sellers, most popular first, as exact product names in src/popular.json. The catalog carries no sales data, so
// the current list is a DEMO ordering. Replace it with the store's real best-sellers; if it is empty the
// "Most popular" sort and the "Best seller" badges are hidden.
const RANK = new Map(popular.map((n, i) => [n, i]));
export const HAS_POPULAR = popular.length > 0;
export const popularRank = (p) => (RANK.has(p.name) ? RANK.get(p.name) : Infinity);

// The first few ranked items in each collection earn a "Best seller" badge.
const BEST = new Set();
const taken = {};
popular.forEach((n) => {
  PRODUCTS.filter((p) => p.name === n).forEach((p) => {
    taken[p.cat] = taken[p.cat] || 0;
    if (taken[p.cat] < 4) { BEST.add(p.id); taken[p.cat] += 1; }
  });
});
export const isBest = (p) => BEST.has(p.id);
export const BEST_SELLERS = PRODUCTS.filter((p) => BEST.has(p.id));

// Unranked small appliances and parts (blender lids, cleaning kits) sort after the main appliances.
export const tier = (p) => (p.type === 'Small Appliances' ? 1 : 0);

// Shareable product links. The numeric id is the item's position in products.json, so keep that file's order stable
// (or switch to SKUs) once the catalog is edited by hand.
export const productSlug = (p) => `${p.id}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;
export const productPath = (p) => `/product/${productSlug(p)}`;
export function shareUrl(p) {
  if (typeof window === 'undefined') return '';
  const base = window.__SHARE_BASE || window.location.href.split('#')[0];
  // The shared preview only passes simple anchors through, so it uses a short form; the real site uses the full route.
  return window.__PREVIEW ? `${base}#p-${p.id}` : `${base}#${productPath(p)}`;
}
