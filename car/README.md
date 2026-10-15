# Sean's Car Business

A used-car dealership site in the same "Noir and Stone" template as Royal Appliance Outlet (parent folder) and Royal Vape Mart (`../vape`).
Create React App, React 19, hash routing. Run from this folder: `npm install`, `npm start`, `npm run build`, `npm test`.

**The business name is a placeholder.** The owner is renaming the car business, so "Sean's Car Business" is used for now. To rename it, search the
`src` and `public` folders for "Sean's Car Business" and update `src/logoSvg.js`, `public/img/logo-white.svg` and the page titles.

## What is here
- Inventory by body type (SUVs, Trucks, Sedans, Coupes and Sports, Vans), search, sort, make filter, a page for every vehicle that can be shared.
- Schedule a test drive form (prefilled from the vehicle), contact form, FAQ, other stores page, map, assistant, cookie notice, legal pages.
- Inventory is driven by a Google Sheet: see `catalog/README.md`.

## All of this is sample content (replace before launch)
- The 15 vehicles in `catalog/catalog.csv` are made up: years, mileage, prices and photos. Each shows a "photo coming soon" picture until real photos are added to `public/photos`.
- The phone number is a fictional placeholder `(850) 555-0100`, the address is only "Pensacola, FL", and the hours (Mon to Sat 9 to 6, closed Sunday) are guesses.
- FAQ answers (financing, trade-ins, vehicle history) are generic. Confirm each one with the owner.
- Set `BEST_SAMPLE` and `SAMPLE_INVENTORY` to `false` in `src/products.js` once real vehicles are loaded, and `SAMPLE_CONTACT` in `src/data.js` once contact details are real.
- Forms: build with `REACT_APP_FORM_ENDPOINT=<form url>` (a Formspree-style form). Without it the forms ask the visitor to call.
