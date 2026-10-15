# Royal Vape Mart

The Royal Vape Mart site (royalvapemart.com), rebuilt in the same "Noir and Stone" template as the Royal Appliance Outlet site in the parent folder.
Create React App, React 19, hash routing. Run from this folder: `npm install`, `npm start`, `npm run build`, `npm test`.

## What is here
- Age gate (21+), shown every time the site is opened (the answer is not stored). Cookie notice. 21+ policy, privacy, cookie and terms pages.
- Shop with 197 products in 11 departments, search, sort, type filters, flavor choices, shareable product pages.
- Reserve list: reserve for pickup with name and phone, pay at the counter (no online payment), 21+ confirmation.
- Request a product form, contact form, deals signup (email only), FAQ, reviews, other stores, map, Royal Assistant.
- Catalog sync from a Google Sheet: see `catalog/README.md`.

## Before launch
- Forms: create a form at https://formspree.io (or any service that accepts a JSON POST) and build with `REACT_APP_FORM_ENDPOINT=<form url>`. Without it the forms ask the visitor to call, because the store has no email address on the site.
- Analytics (optional, cookie-free): `REACT_APP_ANALYTICS_URL`.
- Confirm with the store: Google review rating and count (not shown until confirmed), social links, email address, real best sellers (`best_seller` column), the car auction details, and the legal pages (have an attorney review them).
- The old site takes reservations with its own cart and checkout. This version sends the reservation as a form message instead.
- Photos are copies of the product images on the current site, resized (`public/photos`). Brand logos are in `public/img/brands`. The logo here is a new Noir and Stone wordmark; the store's original red and yellow logo is not used.
