// Builds one static site per clients/*.json into dist/<slug>/index.html
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSaas } from "./saas.mjs";
import { renderTradesDark } from "./trades-dark.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const tel = (p) => "tel:+1" + p.replace(/\D/g, "").replace(/^1/, "");

function render(c) {
  const { primary, accent } = c.colors;
  const desc = `${c.name} - ${c.trade} serving ${c.serviceArea.slice(0, 3).join(", ")} and nearby. Call ${c.phone}.`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)} | ${esc(c.trade)} in ${esc(c.address)}</title>
<meta name="description" content="${esc(desc)}">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: c.name,
    telephone: c.phone,
    email: c.email,
    areaServed: c.serviceArea,
    address: c.address,
  })}</script>
<style>
:root{--primary:${primary};--accent:${accent};--ink:#14213d;--muted:#5b6475;--bg:#fff;--soft:#f4f7fb}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
a{color:inherit}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e6eaf1}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;padding-bottom:12px}
.logo{font-weight:800;font-size:1.05rem;text-decoration:none}
.btn{display:inline-block;background:var(--accent);color:#1a1a1a;font-weight:700;padding:12px 20px;border-radius:10px;text-decoration:none;border:0;cursor:pointer;font-size:1rem}
.btn.call{white-space:nowrap}
.btn.alt{background:#fff;color:var(--primary)}
.hero{background:linear-gradient(135deg,var(--primary),#0a2540);color:#fff;padding:64px 0}
.hero h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1.1;margin:0 0 14px}
.hero p{max-width:560px;font-size:1.1rem;opacity:.92;margin:0 0 24px}
.hero .cta{display:flex;gap:12px;flex-wrap:wrap}
.badges{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.badges span{background:rgba(255,255,255,.14);padding:6px 12px;border-radius:999px;font-size:.9rem}
section{padding:56px 0}
section.soft{background:var(--soft)}
h2{font-size:1.7rem;margin:0 0 24px}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:#fff;border:1px solid #e6eaf1;border-radius:14px;padding:20px}
.card h3{margin:0 0 6px;font-size:1.1rem;color:var(--primary)}
.card p{margin:0;color:var(--muted)}
.area{display:flex;flex-wrap:wrap;gap:8px}
.area span{background:#fff;border:1px solid #dbe2ee;padding:6px 14px;border-radius:999px}
.quote p{font-style:italic}
.quote small{color:var(--muted)}
.two{display:grid;gap:32px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
table{border-collapse:collapse;width:100%}
td{padding:8px 0;border-bottom:1px solid #e6eaf1}
td:last-child{text-align:right;font-weight:600}
form{display:grid;gap:12px}
input,textarea{font:inherit;padding:12px;border:1px solid #cbd3e1;border-radius:10px;width:100%}
footer{background:#0a2540;color:#c9d3e3;padding:28px 0;text-align:center;font-size:.9rem}
footer a{color:#fff}
@media(max-width:520px){.logo{font-size:.95rem}.btn{padding:10px 14px}.call .num{display:none}}
</style>
</head>
<body>
<header><div class="wrap">
  <a class="logo" href="#">${esc(c.name)}</a>
  <a class="btn call" href="${tel(c.phone)}">Call <span class="num">${esc(c.phone)}</span></a>
</div></header>

<div class="hero"><div class="wrap">
  <h1>${esc(c.tagline)}</h1>
  <p>${esc(c.intro)}</p>
  <div class="cta">
    <a class="btn" href="${tel(c.phone)}">Call now</a>
    <a class="btn alt" href="#contact">Get a free estimate</a>
  </div>
  <div class="badges">${c.badges.map((b) => `<span>${esc(b)}</span>`).join("")}</div>
</div></div>

<section id="services"><div class="wrap">
  <h2>Our services</h2>
  <div class="grid">${c.services
    .map((s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`)
    .join("")}</div>
</div></section>

<section class="soft"><div class="wrap two">
  <div>
    <h2>Areas we serve</h2>
    <div class="area">${c.serviceArea.map((a) => `<span>${esc(a)}</span>`).join("")}</div>
  </div>
  <div>
    <h2>Hours</h2>
    <table>${c.hours.map(([d, h]) => `<tr><td>${esc(d)}</td><td>${esc(h)}</td></tr>`).join("")}</table>
  </div>
</div></section>

<section><div class="wrap">
  <h2>What customers say</h2>
  <div class="grid">${c.reviews
    .map((r) => `<div class="card quote"><p>"${esc(r.text)}"</p><small>- ${esc(r.name)}</small></div>`)
    .join("")}</div>
</div></section>

<section class="soft"><div class="wrap">
  <h2>About us</h2>
  <p style="max-width:680px">${esc(c.about)}</p>
</div></section>

<section id="contact"><div class="wrap two">
  <div>
    <h2>Request a free estimate</h2>
    <form action="${esc(c.formEndpoint)}" method="POST">
      <input name="name" placeholder="Your name" required>
      <input name="phone" type="tel" placeholder="Phone number" required>
      <input name="email" type="email" placeholder="Email (optional)">
      <textarea name="message" rows="4" placeholder="What do you need help with?"></textarea>
      <button class="btn" type="submit">Send request</button>
    </form>
  </div>
  <div>
    <h2>Contact</h2>
    <p><a href="${tel(c.phone)}"><strong>${esc(c.phone)}</strong></a><br>
    <a href="mailto:${esc(c.email)}">${esc(c.email)}</a><br>${esc(c.address)}</p>
  </div>
</div></section>

<footer><div class="wrap">&copy; ${new Date().getFullYear()} ${esc(c.name)}. All rights reserved.</div></footer>
</body>
</html>
`;
}

const dir = join(root, "clients");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const c = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const out = join(root, "dist", c.slug);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), ({ saas: renderSaas, "trades-dark": renderTradesDark }[c.template] || render)(c));
  console.log("built dist/" + c.slug + "/index.html");
}
