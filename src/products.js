// Catalog loaded from products.json: n = name, c = collection id, t = product type, i = image asset.
// Prices are intentionally not listed; every item reads "Call for price".
import data from './products.json';

export const PRODUCTS = data.map((x, k) => ({ id: k, cat: x.c, type: x.t, name: x.n, img: x.i }));
