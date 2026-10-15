// Catalog loaded from products.json, which is generated from the store's Google Sheet by `npm run sync` (see catalog/README.md).
// n name, c department id, t type, i photo, p price, ol/o option label and choices (flavors), d description, nw new, b best seller.
import data from './products.json';

export const PRODUCTS = data.map((x) => ({
  id: x.id, cat: x.c, type: x.t, name: x.n.replace(/[\s ]+/g, ' ').trim(), img: x.i, price: x.p ?? null,
  optLabel: x.ol || '', options: x.o || [], desc: x.d || '', isNew: !!x.nw, flagged: !!x.b,
}));
const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id) => BY_ID.get(String(id));

export const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Best sellers are the items flagged best_seller in the sheet, in sheet order. The catalog carries no sales data, so until
// the store flags some, the "Most popular" sort and the "Best seller" badges are hidden.
const FLAGGED = PRODUCTS.filter((p) => p.flagged);
const RANK = new Map(FLAGGED.map((p, i) => [p.id, i]));
export const HAS_POPULAR = RANK.size > 0;
export const popularRank = (p) => (RANK.has(p.id) ? RANK.get(p.id) : Infinity);
export const isBest = (p) => RANK.has(p.id);
export const BEST_SELLERS = FLAGGED;
// The current best-seller picks are placeholders chosen for the preview, not sales data. Set to false once the store has chosen its own.
export const BEST_SAMPLE = true;

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
