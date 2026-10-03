// Dark "product launch" landing page: big two-tone headline, stats, steps,
// audience chips, early-access email box, optional search box.
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

export function renderSaas(c) {
  const { accent, accent2 } = c.colors;
  const search = c.search
    ? `<form class="search" action="${esc(c.search.action)}" method="GET">
    <div class="tabs">${c.search.tabs.map((t, i) => `<button type="button" class="${i ? "" : "on"}">${esc(t)}</button>`).join("")}</div>
    <div class="row"><input name="q" placeholder="${esc(c.search.placeholder)}"><button class="btn" type="submit">Search</button></div>
    <div class="recent">${c.search.recent.map((r) => `<a href="${esc(c.search.action)}?q=${encodeURIComponent(r)}">${esc(r)}</a>`).join("")}</div>
  </form>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)} | ${esc(c.headline1)} ${esc(c.headline2)}</title>
<meta name="description" content="${esc(c.sub)}">
<style>
:root{--bg:#0a1220;--panel:#111a2e;--line:#1f2b45;--text:#eef2fb;--muted:#9aa7c2;--accent:${accent};--accent2:${accent2}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
nav{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.brand{font-weight:800;font-size:1.15rem;color:var(--accent)}
.btn{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:11px 18px;font-weight:700;font-size:.95rem;cursor:pointer;text-decoration:none;display:inline-block}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}
.hero{text-align:center;padding:48px 0 24px}
h1{font-size:clamp(2.2rem,7vw,4rem);line-height:1.05;margin:0 0 18px;font-weight:900;letter-spacing:-.02em}
h1 span{color:var(--accent)}
.hero p{color:var(--muted);max-width:600px;margin:0 auto 12px}
.stats{display:flex;justify-content:center;gap:32px;flex-wrap:wrap;margin:32px 0}
.stats b{display:block;font-size:1.6rem;font-weight:900}
.stats small{color:var(--muted)}
.steps{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:8px 0 28px}
.step{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;text-align:center}
.step .n{color:var(--accent);font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.step h3{margin:6px 0 4px}
.step p{margin:0;color:var(--muted);font-size:.92rem}
.signup{display:flex;gap:8px;max-width:440px;margin:0 auto 28px}
.signup input,.search input{flex:1;min-width:0;background:var(--panel);border:1px solid var(--line);color:var(--text);padding:12px;border-radius:8px;font:inherit}
.chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:36px}
.chips div{background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:.88rem;color:var(--muted)}
.chips b{color:var(--text)}
.search{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:40px}
.tabs{display:flex;gap:6px;justify-content:center;margin-bottom:12px}
.tabs button{background:transparent;border:1px solid var(--line);color:var(--muted);padding:6px 16px;border-radius:8px;cursor:pointer}
.tabs button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.search .row{display:flex;gap:8px}
.recent{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:14px}
.recent a{font-size:.8rem;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:4px 12px;text-decoration:none}
footer{border-top:1px solid var(--line);padding:24px 0;text-align:center;color:var(--muted);font-size:.85rem}
@media(max-width:520px){.signup{flex-direction:column}}
</style>
</head>
<body>
<div class="wrap">
<nav><span class="brand">${esc(c.name)}</span><a class="btn" href="#signup">${esc(c.navCta)}</a></nav>

<div class="hero">
  <h1>${esc(c.headline1)}<br><span>${esc(c.headline2)}</span></h1>
  <p><strong>${esc(c.sub)}</strong></p>
  <p>${esc(c.body)}</p>
</div>

<div class="stats">${c.stats.map(([v, l]) => `<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join("")}</div>

<div class="steps">${c.steps
    .map((s, i) => `<div class="step"><div class="n">Step ${i + 1}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`)
    .join("")}</div>

<form id="signup" class="signup" action="${esc(c.formEndpoint)}" method="POST">
  <input name="email" type="email" placeholder="your@email.com" required>
  <button class="btn" type="submit">${esc(c.signupCta)}</button>
</form>

<div class="chips">${c.audiences.map(([who, what]) => `<div><b>${esc(who)}</b> - ${esc(what)}</div>`).join("")}</div>

${search}
</div>
<footer><div class="wrap">&copy; ${new Date().getFullYear()} ${esc(c.name)}</div></footer>
</body>
</html>
`;
}
