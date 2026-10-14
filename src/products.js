// Product catalog, one entry per item, grouped by collection (`cat` matches an id in CATEGORIES).
// To add items: drop the photo in public/img/products/ and add a line here.
// Seeded from the items visible on the current site's Living Room page; the rest of the
// catalog is still to be loaded. Prices are intentionally omitted: every item reads "Call for price".
const p = (cat, type, name, file) => ({ id: file, cat, type, name, img: `/img/products/${file}.jpg` });

export const PRODUCTS = [
  p('living', 'Coffee Tables', 'Alben Coffee Table', 'alben-coffee-table'),
  p('living', 'Sofas', 'Altari Sofa', 'altari-sofa'),
  p('living', 'Outdoor Seating', 'Angel Island Outdoor Right and Left-arm Facing Loveseat with Cushion Set of 2', 'angel-island-outdoor-loveseat-set'),
  p('living', 'Lamps', 'Ashbend Table Lamp', 'ashbend-table-lamp'),
  p('living', 'Outdoor Seating', 'Beachcroft 2-piece Outdoor Loveseat with Cushion', 'beachcroft-2-piece-outdoor-loveseat'),
  p('living', 'Outdoor Seating', 'Beachcroft Outdoor Loveseat with Cushion', 'beachcroft-outdoor-loveseat'),
  p('living', 'TV Stands', 'Bellaby 60 TV Stand', 'bellaby-60-tv-stand'),
  p('living', 'TV Stands', 'Bellaby 63 TV Stand', 'bellaby-63-tv-stand'),
  p('living', 'Coffee Tables', 'Bracken Rectangular Cocktail Table', 'bracken-rectangular-cocktail-table'),
];
