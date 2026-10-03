// Dark, bold-headline landing page for local trades (plumbing, HVAC, roofing, etc.)
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const tel = (p) => "tel:+1" + p.replace(/\D/g, "").replace(/^1/, "");

export function renderTradesDark(c) {
  const { accent, accent2 } = c.colors;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)} | ${esc(c.trade)} in ${esc(c.address)}</title>
<meta name="description" content="${esc(c.name)} - ${esc(c.trade)} serving ${esc(c.serviceArea.slice(0, 3).join(", "))} and nearby. Call ${esc(c.phone)}.">
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
:root{--bg:#0a1220;--panel:#111a2e;--line:#1f2b45;--text:#eef2fb;--muted:#9aa7c2;--accent:${accent};--accent2:${accent2}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5}
a{color:inherit}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 0}
.brand{font-weight:800;font-size:1.1rem;color:var(--accent);text-decoration:none}
.btn{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:12px 20px;font-weight:700;font-size:1rem;cursor:pointer;text-decoration:none;display:inline-block;white-space:nowrap}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}
.hero{text-align:center;padding:44px 0 16px}
h1{font-size:clamp(2.2rem,7vw,4rem);line-height:1.05;margin:0 0 18px;font-weight:900;letter-spacing:-.02em}
h1 span{color:var(--accent)}
.hero p{color:var(--muted);max-width:620px;margin:0 auto 12px}
.cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:22px}
.stats{display:flex;justify-content:center;gap:28px;flex-wrap:wrap;margin:36px 0}
.stats b{display:block;font-size:1.5rem;font-weight:900}
.stats small{color:var(--muted)}
section{padding:28px 0}
h2{font-size:1.5rem;margin:0 0 18px;text-align:center}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
.card h3{margin:0 0 4px;font-size:1.05rem}
.card p{margin:0;color:var(--muted);font-size:.93rem}
.step{text-align:center}
.step .n{color:var(--accent);font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.chips span{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:.9rem;color:var(--muted)}
.two{display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
table{border-collapse:collapse;width:100%;max-width:420px;margin:0 auto}
td{padding:9px 0;border-bottom:1px solid var(--line)}
td:last-child{text-align:right;font-weight:600}
.quote p{font-style:italic;color:var(--text)}
.quote small{color:var(--muted)}
form{display:grid;gap:10px;max-width:460px;margin:0 auto}
input,textarea{font:inherit;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:12px;border-radius:8px;width:100%}
footer{border-top:1px solid var(--line);padding:24px 0;margin-top:24px;text-align:center;color:var(--muted);font-size:.85rem}
@media(max-width:520px){.brand{font-size:.95rem}.btn{padding:10px 14px}.call .num{display:none}}
</style>
</head>
<body>
<div class="wrap">
<nav><a class="brand" href="#">${esc(c.name)}</a><a class="btn call" href="${tel(c.phone)}">Call <span class="num">${esc(c.phone)}</span></a></nav>

<div class="hero">
  <h1>${esc(c.headline1)}<br><span>${esc(c.headline2)}</span></h1>
  <p><strong>${esc(c.tagline)}</strong></p>
  <p>${esc(c.intro)}</p>
  <div class="cta">
    <a class="btn" href="${tel(c.phone)}">Call now</a>
    <a class="btn ghost" href="#contact">Get a free estimate</a>
  </div>
</div>

<div class="stats">${c.stats.map(([v, l]) => `<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join("")}</div>

<section><h2>How it works</h2>
<div class="grid">${c.steps
    .map((s, i) => `<div class="card step"><div class="n">Step ${i + 1}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`)
    .join("")}</div></section>

<section><h2>Our services</h2>
<div class="grid">${c.services.map((s) => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join("")}</div></section>

<section><div class="two">
  <div><h2>Areas we serve</h2><div class="chips">${c.serviceArea.map((a) => `<span>${esc(a)}</span>`).join("")}</div></div>
  <div><h2>Hours</h2><table>${c.hours.map(([d, h]) => `<tr><td>${esc(d)}</td><td>${esc(h)}</td></tr>`).join("")}</table></div>
</div></section>

<section><h2>What customers say</h2>
<div class="grid">${c.reviews.map((r) => `<div class="card quote"><p>"${esc(r.text)}"</p><small>- ${esc(r.name)}</small></div>`).join("")}</div></section>

<section><h2>About us</h2><p style="max-width:640px;margin:0 auto;color:var(--muted);text-align:center">${esc(c.about)}</p></section>

<section id="contact"><h2>Request a free estimate</h2>
<form action="${esc(c.formEndpoint)}" method="POST">
  <input name="name" placeholder="Your name" required>
  <input name="phone" type="tel" placeholder="Phone number" required>
  <input name="email" type="email" placeholder="Email (optional)">
  <textarea name="message" rows="4" placeholder="What do you need help with?"></textarea>
  <button class="btn" type="submit">Send request</button>
</form>
<p style="text-align:center;color:var(--muted)">Or call <a href="${tel(c.phone)}"><strong>${esc(c.phone)}</strong></a> - ${esc(c.address)}</p>
</section>
</div>
<footer><div class="wrap">&copy; ${new Date().getFullYear()} ${esc(c.name)}. All rights reserved.</div></footer>
</body>
</html>
`;
}
