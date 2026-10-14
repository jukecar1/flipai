// Product catalog, one entry per item, grouped by collection (`cat` matches an id in CATEGORIES).
// To add items: drop the photo in public/img/products/ and add a line here.
// Seeded from the items visible on the current site's Living Room page; the rest of the
// catalog is still to be loaded. Prices are intentionally omitted: every item reads "Call for price".
const p = (cat, type, name, img) => ({ id: img, cat, type, name, img });

export const PRODUCTS = [
  p('living', 'Coffee Tables', 'Alben Coffee Table', '/img/products/alben-coffee-table.jpg'),
  p('living', 'Sofas', 'Altari Sofa', '/img/products/altari-sofa.jpg'),
  p('living', 'Outdoor Seating', 'Angel Island Outdoor Right and Left-arm Facing Loveseat with Cushion Set of 2', '/img/products/angel-island-outdoor-loveseat-set.jpg'),
  p('living', 'Lamps', 'Ashbend Table Lamp', '/img/products/ashbend-table-lamp.jpg'),
  p('living', 'Outdoor Seating', 'Beachcroft 2-piece Outdoor Loveseat with Cushion', '/img/products/beachcroft-2-piece-outdoor-loveseat.jpg'),
  p('living', 'Outdoor Seating', 'Beachcroft Outdoor Loveseat with Cushion', '/img/products/beachcroft-outdoor-loveseat.jpg'),
  p('living', 'TV Stands', 'Bellaby 60 TV Stand', '/img/products/bellaby-60-tv-stand.jpg'),
  p('living', 'TV Stands', 'Bellaby 63 TV Stand', '/img/products/bellaby-63-tv-stand.jpg'),
  p('living', 'Coffee Tables', 'Bracken Rectangular Cocktail Table', '/img/products/bracken-rectangular-cocktail-table.jpg'),
];
