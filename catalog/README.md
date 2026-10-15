# Catalog sheet

The store's items live in one Google Sheet, one row per item. The site reads it every hour (or when you press
"Run workflow" on GitHub, under Actions, "Sync catalog from Google Sheet") and new items appear a few minutes later.

`catalog.csv` is the current full catalog. Import it into Google Sheets (File, Import, Upload) to get started.

## Columns (keep the first row exactly as is)

| Column | What to put |
| --- | --- |
| id | Leave blank for new items (one is made automatically). Never change it once an item exists, or old shared links stop working. A SKU works too. |
| name | The item name shown on the site. |
| department | One of: Appliances, Living Room, Bedroom, Kitchen & Dining, Home Office, Accent Furniture, Entryway, Kids & Baby, Outdoor, Mattresses, Decor / Home Accents, Rugs, Lighting, Storage / Organization. |
| type | The sub-category used by the filter, such as Sofas or Refrigerators. |
| price | A number like 1299 or $1,299.50. Leave blank to show "Ask for price". |
| photo | A web link to the photo, or `photos/<file>.jpg` for a photo you added to `public/photos`. |
| new | Type `yes` to show a "New" badge. |
| best_seller | Type `yes` to mark a best seller. Their order in the sheet is the "Most popular" order. |
| hidden | Type `yes` to take an item off the site without deleting the row. |

## One-time setup

1. In the sheet: File, Share, Publish to web, pick the sheet tab and "Comma-separated values (.csv)", Publish. Copy the link.
2. On GitHub: Settings, Secrets and variables, Actions, New secret named `CATALOG_SHEET_CSV_URL`, paste the link.
3. Done. Make an edit in the sheet and run the workflow once to see it appear.

Google's published sheets refresh within a few minutes of an edit, so a change can take up to an hour plus a few minutes to show.

## Safety

- Rows with a missing name, photo, type or an unknown department are skipped, and the reason is printed in the run log.
- If the sheet suddenly has less than half the items the site has, nothing changes (guards against a cleared sheet).
  Use `npm run sync -- --force` locally if that is intended.
- Try it without writing anything: `npm run sync -- --file catalog/catalog.csv --dry-run`.
