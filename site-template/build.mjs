// Builds one self-contained static site per clients/*.json into dist/<slug>/index.html
// Image paths like "assets/<slug>/photo.jpg" are inlined as data URIs so the HTML works as a single file.
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTrades } from "./trades.mjs";
import { renderSaas } from "./saas.mjs";
import { renderTradesDark } from "./trades-dark.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

function inline(src) {
  if (typeof src !== "string" || !src.startsWith("assets/")) return src;
  const file = join(root, src);
  if (!existsSync(file)) throw new Error("Missing image: " + src);
  return `data:${MIME[extname(file).toLowerCase()] || "application/octet-stream"};base64,${readFileSync(file).toString("base64")}`;
}

function resolveImages(c) {
  const out = { ...c };
  if (out.logo) out.logo = inline(out.logo);
  for (const key of ["heroImages", "gallery"]) {
    if (Array.isArray(out[key])) out[key] = out[key].map((i) => ({ ...i, src: inline(i.src) }));
  }
  return out;
}

const renderers = { saas: renderSaas, "trades-dark": renderTradesDark };

const dir = join(root, "clients");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const c = resolveImages(JSON.parse(readFileSync(join(dir, file), "utf8")));
  const out = join(root, "dist", c.slug);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), (renderers[c.template] || renderTrades)(c));
  console.log("built dist/" + c.slug + "/index.html");
}
