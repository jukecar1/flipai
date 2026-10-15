# Catalog sheet (Royal Vape Mart)

The store's products live in one Google Sheet, one row per item. The site reads it every hour (or when you press
"Run workflow" on GitHub, Actions, "Sync Royal Vape Mart catalog") and changes appear a few minutes later.

`catalog.csv` is the current full catalog (197 items). Import it into Google Sheets (File, Import, Upload) to start.

## Columns (keep the first row exactly as is)

| Column | What to put |
| --- | --- |
| id | Leave blank for new items. Never change it once an item exists, or old shared links stop working. A SKU works too. |
| name | The product name shown on the site. |
| department | Vape, Vape Hardware, E-Liquid, Tobacco, THC Seltzers, Kratom, Delta, Cigarettes, Cigars, Detox or Misc. |
| type | The sub-category used by the filter, such as Disposables, Coils or Packs. |
| price | A number like 22.99. Leave blank to show "Call for price". |
| photo | `photos/<file>.webp` for a photo added to `vape/public/photos`, or a full web link. |
| options_label | The label for the choice, such as Flavor, Strength, Size or Color. |
| options | The choices, separated by `\|`, for example `Blue Razz Ice\|Watermelon Ice`. Leave blank if there is nothing to choose. |
| description | Optional short description. |
| new | Type `yes` to show a "New" badge. |
| best_seller | Type `yes` to mark a best seller. Their order in the sheet is the "Most popular" order. |
| hidden | Type `yes` to take an item off the site without deleting the row (for example, out of stock). |

## One-time setup

1. In the sheet: File, Share, Publish to web, pick the sheet tab and "Comma-separated values (.csv)", Publish. Copy the link.
2. On GitHub: Settings, Secrets and variables, Actions, New secret named `CATALOG_SHEET_CSV_URL_VAPE`, paste the link.
3. Make an edit in the sheet and run the workflow once to see it appear.

## Safety

- Rows with a missing name, photo, type or an unknown department are skipped, and the reason is printed in the run log.
- If the sheet suddenly has less than half the items the site has, nothing changes. Use `npm run sync -- --force` locally if that is intended.
- Try it without writing anything: `npm run sync -- --file catalog/catalog.csv --dry-run`.
