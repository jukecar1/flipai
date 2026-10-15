# Catalog sheet (Sean's Car Business)

The store's products live in one Google Sheet, one row per item. The site reads it every hour (or when you press
"Run workflow" on GitHub, Actions, "Sync Sean's Car Business catalog") and changes appear a few minutes later.

`catalog.csv` is the current full catalog (15 sample vehicles). Import it into Google Sheets (File, Import, Upload) to start.

## Columns (keep the first row exactly as is)

| Column | What to put |
| --- | --- |
| id | Leave blank for new items. Never change it once an item exists, or old shared links stop working. A SKU works too. |
| name | The vehicle: year, make, model and trim. |
| department | SUVs, Trucks, Sedans, Coupes & Sports, or Vans & Minivans. |
| type | The sub-category used by the filter, such as the make, such as Ford or Toyota. |
| price | A number like 22.99. Leave blank to show "Call for price". |
| photo | `photos/<file>.jpg` for a photo added to `car/public/photos`, or a full web link. |
| options_label, options | Not used for vehicles; leave blank. |
| description | Mileage and key details separated by ` · `, for example `48,200 miles · Automatic · 4-cylinder · Silver`. The first part shows under the vehicle's name. |
| new | Type `yes` to show a "New arrival" badge. |
| best_seller | Type `yes` to feature a vehicle on the home page and tag it Featured. Their order in the sheet is the featured order. |
| hidden | Type `yes` to take an item off the site without deleting the row (for example, sold). |

## One-time setup

1. In the sheet: File, Share, Publish to web, pick the sheet tab and "Comma-separated values (.csv)", Publish. Copy the link.
2. On GitHub: Settings, Secrets and variables, Actions, New secret named `CATALOG_SHEET_CSV_URL_CAR`, paste the link.
3. Make an edit in the sheet and run the workflow once to see it appear.

## Safety

- Rows with a missing name, photo, type or an unknown department are skipped, and the reason is printed in the run log.
- If the sheet suddenly has less than half the items the site has, nothing changes. Use `npm run sync -- --force` locally if that is intended.
- Try it without writing anything: `npm run sync -- --file catalog/catalog.csv --dry-run`.
