// Catalog loaded from products.json: n = name, c = collection id, t = product type, i = image asset, p = price in dollars (when listed).
// Items without a price read "Call for price".
import data from './products.json';
import popular from './popular.json';

// id is a stable string (from the sheet's id column, or a hash of the item), so shared links, My list and compare
// survive catalog edits. nw / b are the sheet's "new" and "best_seller" flags.
export const PRODUCTS = data.map((x) => ({ id: x.id, cat: x.c, type: x.t, name: x.n.replace(/[\s\u00a0]+/g, ' ').trim(), img: x.i, price: x.p ?? null, isNew: !!x.nw, flagged: !!x.b }));
const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id) => BY_ID.get(String(id));

export const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Best sellers: items flagged best_seller in the sheet (in sheet order). With no flags it falls back to the exact
// product names in src/popular.json, which is a DEMO ordering. With neither, the "Most popular" sort and the
// "Best seller" badges are hidden.
const FLAGGED = PRODUCTS.filter((p) => p.flagged);
const RANK = new Map(FLAGGED.length ? FLAGGED.map((p, i) => [p.name, i]) : popular.map((n, i) => [n, i]));
export const HAS_POPULAR = RANK.size > 0;
export const popularRank = (p) => (RANK.has(p.name) ? RANK.get(p.name) : Infinity);

// The first few ranked items in each collection earn a "Best seller" badge.
const BEST = new Set();
const taken = {};
[...RANK.keys()].forEach((n) => {
  PRODUCTS.filter((p) => p.name === n).forEach((p) => {
    taken[p.cat] = taken[p.cat] || 0;
    if (taken[p.cat] < 4) { BEST.add(p.id); taken[p.cat] += 1; }
  });
});
export const isBest = (p) => BEST.has(p.id);
export const BEST_SELLERS = PRODUCTS.filter((p) => BEST.has(p.id));

// Unranked small appliances and parts (blender lids, cleaning kits) sort after the main appliances.
export const tier = (p) => (p.type === 'Small Appliances' ? 1 : 0);

// Shareable product links: /product/<id>-<name>. Only the id matters; the name is for readability.
export const idFromSlug = (slug) => String(slug).split('-')[0];
export const productSlug = (p) => `${p.id}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;
export const productPath = (p) => `/product/${productSlug(p)}`;
export function shareUrl(p) {
  if (typeof window === 'undefined') return '';
  const base = window.__SHARE_BASE || window.location.href.split('#')[0];
  // The shared preview only passes simple anchors through, so it uses a short form; the real site uses the full route.
  return window.__PREVIEW ? `${base}#p-${p.id}` : `${base}#${productPath(p)}`;
}

// Key details read from a product's name (capacity, size, a few common features). Used on the compare page.
const FEATURES = ['ENERGY STAR', 'Smart', 'Stainless', 'Fingerprint Resistant', 'Front Load', 'Top Load', 'Steam', 'Electric', 'Gas', 'Convection', 'Induction', 'Built-In', 'Slide-In', 'Freestanding', 'Wall Mount', 'Portable', 'Outdoor', 'Reclining', 'Power'];
const SIZES = ['California King', 'Queen', 'King', 'Full', 'Twin'];
export function keyDetails(p) {
  const n = p.name;
  const out = [];
  let m = /(\d+(?:\.\d+)?)\s*cu\.?\s*ft/i.exec(n); if (m) out.push(`${m[1]} cu. ft.`);
  m = /([\d,]{4,6})\s*BTU/i.exec(n); if (m) out.push(`${m[1]} BTU`);
  m = /(\d+)\s*pint/i.exec(n); if (m) out.push(`${m[1]} pint`);
  m = /(\d{2})\s*(?:"|”|in\b)/.exec(n); if (m) out.push(`${m[1]} in.`);
  SIZES.forEach((s) => { if (new RegExp(`\\b${s}\\b`, 'i').test(n) && !out.some((x) => x.includes(s))) out.push(s); });
  m = /set of (\d+)/i.exec(n); if (m) out.push(`Set of ${m[1]}`);
  FEATURES.forEach((f) => { if (n.toLowerCase().includes(f.toLowerCase())) out.push(f); });
  return out.slice(0, 7);
}
