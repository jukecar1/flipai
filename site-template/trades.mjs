// Light, photo-friendly site for local trades (plumbing, HVAC, roofing, etc.)
// Optional fields: logo, heroImages[], gallery[], rating{score,count,url}, reviews[], about, email, sms,
//   servicePages[] (one page per service), noindex (drafts), siteUrl (for canonical links)
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const tel = (p) => "tel:+1" + p.replace(/\D/g, "").replace(/^1/, "");
const has = (c, k) => Array.isArray(c[k]) && c[k].length > 0;

const ICONS = {
  snow: "M12 2v20M4.2 7l15.6 10M19.8 7L4.2 17M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5",
  flame: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  wind: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a3 3 0 1 1-3 3",
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  drop: "M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  shield: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z",
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ICONS.wrench}"/></svg>`;
const star = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5 7.5-.7z"/></svg>`;
const stars = () => `<span class="stars" aria-label="5 out of 5 stars">${star.repeat(5)}</span>`;
const fill = (c, s) => String(s).replaceAll("{phone}", c.phone).replaceAll("{name}", c.name).replaceAll("{areas}", c.serviceArea.join(", "));

const css = (c) => {
  const { primary, accent } = c.colors;
  return `:root{--primary:${primary};--accent:${accent};--ink:#0f1c2e;--muted:#566177;--soft:#f3f6fb;--line:#e3e8f1;--r:16px;--shadow:0 10px 30px rgba(15,28,46,.08)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#fff;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{max-width:100%;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.topbar{background:#0b1a30;color:#cfd8e8;font-size:.82rem;text-align:center;padding:7px 12px}
.topbar a{color:#fff;font-weight:700;text-decoration:none}
header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:68px}
.wordmark{font-weight:900;font-size:1.15rem;letter-spacing:-.01em;color:var(--primary)}
.logo-img{height:50px;width:auto}
nav.links{display:none;gap:26px;font-weight:600;font-size:.95rem}
nav.links a{text-decoration:none;color:var(--muted)}
nav.links a:hover{color:var(--primary)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--accent);color:#1a1205;font-weight:800;padding:13px 22px;border-radius:12px;text-decoration:none;border:0;cursor:pointer;font-size:1rem;white-space:nowrap;box-shadow:0 6px 16px rgba(245,158,11,.28)}
.btn.alt{background:#fff;color:var(--primary);box-shadow:none;border:1px solid rgba(255,255,255,.5)}
.btn.sm{padding:10px 16px;font-size:.95rem}
.hero{background:radial-gradient(900px 400px at 85% -10%,rgba(255,255,255,.14),transparent 60%),linear-gradient(135deg,var(--primary),#0a1f3d);color:#fff;padding:48px 0 56px}
.hero .wrap{display:grid;gap:36px;align-items:center}
.crumbs{font-size:.85rem;opacity:.85;margin-bottom:6px}
.crumbs a{text-decoration:none}
.serving{margin-top:14px;font-size:.95rem;opacity:.9}
.proof{margin-top:16px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:14px 16px;max-width:520px}
.proof-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.95rem}
.proof-top b{font-size:1.3rem}
.q{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14)}
.hero .q p{margin:0;font-size:.93rem;line-height:1.45;opacity:1;max-width:none;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.q cite{display:block;margin-top:4px;font-size:.8rem;opacity:.75;font-style:normal}
.stars{display:inline-flex;gap:2px;color:#fbbf24}
h1{font-size:clamp(2.1rem,6vw,3.5rem);line-height:1.06;letter-spacing:-.03em;margin:16px 0 14px;font-weight:900}
.hero p{font-size:1.1rem;opacity:.92;max-width:520px;margin:0 0 24px}
.cta{display:flex;gap:12px;flex-wrap:wrap}
.mosaic{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:minmax(0,1.25fr) minmax(0,1fr);gap:10px;height:340px}
.mosaic img{width:100%;height:100%;object-fit:cover;border-radius:14px;border:3px solid rgba(255,255,255,.18);box-shadow:0 12px 30px rgba(0,0,0,.25)}
.mosaic img:first-child{grid-column:span 2}
.trust{background:#fff;border-bottom:1px solid var(--line)}
.trust .wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;padding-top:18px;padding-bottom:18px}
.trust div{display:flex;align-items:center;gap:10px;font-weight:600;font-size:.95rem}
.trust svg{color:var(--primary);flex:none}
section{padding:64px 0}
section.soft{background:var(--soft)}
.eyebrow{color:var(--primary);font-weight:800;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase}
h2{font-size:clamp(1.6rem,4vw,2.2rem);letter-spacing:-.02em;line-height:1.15;margin:6px 0 28px}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:22px;box-shadow:var(--shadow)}
.card .ic{width:48px;height:48px;border-radius:12px;background:var(--soft);color:var(--primary);display:grid;place-items:center;margin-bottom:12px}
.card h3{margin:0 0 6px;font-size:1.1rem}
.card p{margin:0;color:var(--muted)}
.gal{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.gal img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r);box-shadow:var(--shadow)}
.rate{display:grid;gap:18px}
.score{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:18px 26px;box-shadow:var(--shadow);display:flex;align-items:center;gap:8px 18px;flex-wrap:wrap}
.score b{font-size:2.6rem;line-height:1;letter-spacing:-.03em}
.score small{color:var(--muted);font-size:.95rem}
.score p{margin:0 0 0 auto}
.quote .stars{margin-bottom:8px}
.quote p{color:var(--ink)}
.quote small{color:var(--muted)}
.two{display:grid;gap:32px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips span{background:#fff;border:1px solid var(--line);padding:7px 15px;border-radius:999px;font-weight:600;font-size:.92rem}
table{border-collapse:collapse;width:100%}
td{padding:11px 0;border-bottom:1px solid var(--line)}
td:last-child{text-align:right;font-weight:700}
.band{background:linear-gradient(135deg,var(--primary),#0a1f3d);color:#fff;text-align:center;padding:52px 0}
.band h2{margin:0 0 10px;color:#fff}
.band p{margin:0 0 22px;opacity:.9}
form{display:grid;gap:12px}
input,textarea{font:inherit;padding:14px;border:1px solid #cbd3e1;border-radius:12px;width:100%;background:#fff}
input:focus,textarea:focus{outline:2px solid var(--primary);outline-offset:1px}
.contact-info{font-size:1.05rem}
.contact-info a{font-weight:800;color:var(--primary);text-decoration:none}
footer{background:#0b1a30;color:#aab6cc;padding:32px 0 96px;font-size:.9rem}
footer .wrap{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center}
footer .wordmark{color:#fff}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid var(--line);box-shadow:0 -6px 20px rgba(15,28,46,.12)}
.sticky .btn{flex:1;padding:13px 10px}
.sticky .btn.alt{background:var(--soft);border:1px solid var(--line);color:var(--primary)}
.chk{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:9px}
.chk li{position:relative;padding-left:28px;font-weight:600;font-size:.97rem}
.chk li::before{content:"";position:absolute;left:0;top:.2em;width:18px;height:18px;border-radius:50%;background:var(--soft) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${primary.replace("#", "%23")}' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12l5 5 9-10'/></svg>") center/11px no-repeat}
.chk a{text-decoration:none;color:var(--primary);border-bottom:1px solid rgba(21,64,122,.25)}
.chk a:hover{border-bottom-color:var(--primary)}
.prose{max-width:720px}
.prose p{color:var(--muted);margin:0 0 14px}
.faq details{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:10px}
.faq summary{font-weight:700;cursor:pointer}
.faq details p{margin:10px 0 0;color:var(--muted)}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.hero .wrap>div:first-child>*{animation:rise .8s cubic-bezier(.2,.7,.2,1) both}
.hero .wrap>div:first-child>*:nth-child(2){animation-delay:.08s}
.hero .wrap>div:first-child>*:nth-child(3){animation-delay:.16s}
.hero .wrap>div:first-child>*:nth-child(4){animation-delay:.24s}
.hero .wrap>div:first-child>*:nth-child(5){animation-delay:.32s}
.hero .wrap>div:first-child>*:nth-child(6){animation-delay:.4s}
.mosaic{animation:rise .9s cubic-bezier(.2,.7,.2,1) .2s both}
.reveal{opacity:0;transform:translateY(16px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0ms)}
.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.hero .wrap>div:first-child>*,.mosaic{animation:none}.reveal{opacity:1;transform:none;transition:none}}
@media(max-width:859px){
  section{padding:44px 0}
  h2{margin-bottom:20px}
  .hero{padding:32px 0 36px}
  .mosaic{height:280px}
  .band{padding:40px 0}
  .gal,.rate .grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:12px;margin:0 -20px;padding:0 20px 6px;scroll-padding:0 20px;scrollbar-width:none}
  .gal::-webkit-scrollbar,.rate .grid::-webkit-scrollbar{display:none}
  .gal img{flex:0 0 82%;width:82%;scroll-snap-align:start}
  .rate .grid .card{flex:0 0 82%;scroll-snap-align:start}
}
@media(min-width:860px){
  nav.links{display:flex}
  .hero .wrap{grid-template-columns:1.1fr .9fr}
  .mosaic{height:400px}
  .sticky{display:none}
  footer{padding-bottom:32px}
}
@media(max-width:520px){.btn.call .num{display:none}}`;
};

// Fades sections and cards in as they scroll into view. Content stays visible without JS or with reduced motion.
const REVEAL_JS = `<script>
(function(){
  if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  var els=document.querySelectorAll(".trust .wrap>div,section .wrap>*:not(.grid),#services .card,.band .wrap>*,.faq details");
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12,rootMargin:"0px 0px -6% 0px"});
  els.forEach(function(el,i){el.classList.add("reveal");el.style.setProperty("--d",Math.min((i%4)*70,210)+"ms");io.observe(el)});
})();
</script>`;

function shell(c, { title, description, canonical, body, base = "", nav }) {
  const brand = c.logo
    ? `<img class="logo-img" src="${esc(c.logo)}" alt="${esc(c.name)} logo">`
    : `<span class="wordmark">${esc(c.name)}</span>`;
  const textBtn = c.sms ? `<a class="btn alt" href="sms:+1${c.sms.replace(/\D/g, "").replace(/^1/, "")}">Text us</a>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${c.noindex ? '<meta name="robots" content="noindex,nofollow">\n' : ""}${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n` : ""}<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: c.name,
    telephone: c.phone,
    email: c.email || undefined,
    areaServed: c.serviceArea,
    address: c.address,
  })}</script>
<style>
${css(c)}
</style>
</head>
<body>
${c.topBar ? `<div class="topbar">${esc(c.topBar)} &middot; <a href="${tel(c.phone)}">${esc(c.phone)}</a></div>` : ""}
<header><div class="wrap">
  <a href="${base || "#"}" style="text-decoration:none">${brand}</a>
  <nav class="links">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
  <a class="btn sm call" href="${tel(c.phone)}">Call <span class="num">${esc(c.phone)}</span></a>
</div></header>
${body}
<footer><div class="wrap">
  <div>${c.logo ? "" : `<span class="wordmark">${esc(c.name)}</span><br>`}&copy; ${new Date().getFullYear()} ${esc(c.name)}. All rights reserved.</div>
  <div>${esc(c.phone)} &middot; ${esc(c.address)}</div>
</div></footer>

<div class="sticky">
  <a class="btn" href="${tel(c.phone)}">Call now</a>
  ${textBtn || `<a class="btn alt" href="#contact">Free estimate</a>`}
</div>
${REVEAL_JS}
</body>
</html>
`;
}

const featuredReviews = (c) => (has(c, "reviews") ? [...c.reviews.filter((r) => r.featured), ...c.reviews.filter((r) => !r.featured)].slice(0, 2) : []);
const who = (r) => esc(r.name) + (r.date ? " &middot; " + esc(r.date) : "");
const proofBlock = (c) => {
  const f = featuredReviews(c);
  return c.rating || f.length
    ? `<div class="proof">${c.rating ? `<div class="proof-top">${stars()}<b>${esc(c.rating.score)}</b><span>${esc(c.rating.count)} Google reviews</span></div>` : ""}${f
        .map((r) => `<div class="q"><p>"${esc(r.excerpt || r.text)}"</p><cite>${who(r)}</cite></div>`)
        .join("")}</div>`
    : "";
};
const contactForm = (c) => `<section id="contact"><div class="wrap two">
  <div>
    <div class="eyebrow">Contact</div>
    <h2>Request a free estimate</h2>
    <form action="${esc(c.formEndpoint)}" method="POST">
      <input name="name" placeholder="Your name" required>
      <input name="phone" type="tel" placeholder="Phone number" required>
      <input name="email" type="email" placeholder="Email (optional)">
      <textarea name="message" rows="4" placeholder="What do you need help with?"></textarea>
      <button class="btn" type="submit">Send request</button>
    </form>
  </div>
  <div class="contact-info">
    <div class="eyebrow">Get in touch</div>
    <h2>We pick up</h2>
    <p><a href="${tel(c.phone)}">${esc(c.phone)}</a></p>
    ${c.email ? `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ""}
    <p style="color:var(--muted)">${esc(c.address)}</p>
  </div>
</div></section>`;
const band = (c) => `<div class="band"><div class="wrap">
  <h2>Need help today?</h2>
  <p>${esc(c.bandText || "Call now and talk to a real person.")}</p>
  <a class="btn" href="${tel(c.phone)}">Call ${esc(c.phone)}</a>
</div></div>`;

export function renderTrades(c) {
  const nav = [
    ["#services", "Services"],
    has(c, "gallery") ? ["#work", "Our work"] : null,
    c.rating || has(c, "reviews") ? ["#reviews", "Reviews"] : null,
    ["#contact", "Contact"],
  ].filter(Boolean);
  const hero = has(c, "heroImages") ? c.heroImages.slice(0, 3) : [];
  const textBtn = c.sms ? `<a class="btn alt" href="sms:+1${c.sms.replace(/\D/g, "").replace(/^1/, "")}">Text us</a>` : "";
  // service labels (and aliases) that have their own page become links
  const pageFor = {};
  for (const p of c.servicePages || []) for (const l of [p.label, ...(p.aliases || [])]) pageFor[l] = p.slug;
  const item = (i) => (pageFor[i] ? `<a href="${pageFor[i]}/">${esc(i)}</a>` : esc(i));

  const body = `
<div class="hero"><div class="wrap">
  <div>
    <h1>${esc(c.tagline)}</h1>
    <p>${esc(c.intro)}</p>
    <div class="cta">
      <a class="btn" href="${tel(c.phone)}">Call ${esc(c.phone)}</a>
      ${textBtn || `<a class="btn alt" href="#contact">Get a free estimate</a>`}
    </div>
    <div class="serving">Serving ${esc(c.serviceArea.slice(0, 4).join(", "))} and nearby areas</div>
    ${proofBlock(c)}
  </div>
  ${hero.length ? `<div class="mosaic">${hero.map((s) => `<img src="${esc(s.src)}" alt="${esc(s.alt)}">`).join("")}</div>` : ""}
</div></div>

<div class="trust"><div class="wrap">${c.badges
    .map((b) => `<div>${icon("shield")}<span>${esc(b)}</span></div>`)
    .join("")}</div></div>

<section id="services"><div class="wrap">
  <div class="eyebrow">What we do</div>
  <h2>Our services</h2>
  <div class="grid">${c.services
    .map((s) => `<div class="card"><div class="ic">${icon(s.icon)}</div><h3>${esc(s.title)}</h3>${s.text ? `<p>${esc(s.text)}</p>` : ""}${s.items ? `<ul class="chk">${s.items.map((i) => `<li>${item(i)}</li>`).join("")}</ul>` : ""}</div>`)
    .join("")}</div>
</div></section>

${has(c, "gallery") ? `<section id="work" class="soft"><div class="wrap">
  <div class="eyebrow">Our work</div>
  <h2>On the job around ${esc(c.serviceArea[0])}</h2>
  <div class="gal">${c.gallery.map((g) => `<img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy">`).join("")}</div>
</div></section>` : ""}

${c.rating || has(c, "reviews") ? `<section id="reviews"><div class="wrap">
  <div class="eyebrow">Reviews</div>
  <h2>Trusted by local homeowners</h2>
  <div class="rate">
    ${c.rating ? `<div class="score"><b>${esc(c.rating.score)}</b>${stars()}<small>${esc(c.rating.count)} reviews on Google</small>${c.rating.url ? `<p><a class="btn sm" href="${esc(c.rating.url)}">Read reviews</a></p>` : ""}</div>` : ""}
    ${has(c, "reviews") ? `<div class="grid">${c.reviews
      .map((r) => `<div class="card quote">${stars()}<p>"${esc(r.text)}"</p><small>${who(r)} &middot; Google review</small></div>`)
      .join("")}</div>` : ""}
  </div>
</div></section>` : ""}

<section class="soft"><div class="wrap two">
  <div>
    <div class="eyebrow">Service area</div>
    <h2>Where we work</h2>
    <div class="chips">${c.serviceArea.map((a) => `<span>${esc(a)}</span>`).join("")}</div>
  </div>
  <div>
    <div class="eyebrow">Availability</div>
    <h2>Hours</h2>
    <table>${c.hours.map(([d, h]) => `<tr><td>${esc(d)}</td><td>${esc(h)}</td></tr>`).join("")}</table>
  </div>
</div></section>

${c.about ? `<section><div class="wrap"><div class="eyebrow">About</div><h2>About ${esc(c.name)}</h2><p style="max-width:680px;color:var(--muted)">${esc(c.about)}</p></div></section>` : ""}

${band(c)}

${contactForm(c)}`;

  return shell(c, {
    title: `${c.name} | ${c.trade} in ${c.address}`,
    description: `${c.name} - ${c.trade} serving ${c.serviceArea.slice(0, 3).join(", ")}. Call ${c.phone}.`,
    canonical: c.siteUrl ? c.siteUrl.replace(/\/$/, "") + "/" : "",
    body,
    nav,
  });
}

// One page per service, for people searching for that exact service. Needs c.servicePages[].
export function renderServicePage(c, p) {
  const area = c.serviceArea[0];
  const base = "../";
  const nav = [[base, "Home"], [base + "#services", "Services"], [base + "#reviews", "Reviews"], ["#contact", "Contact"]];
  const others = c.servicePages.filter((o) => o.slug !== p.slug);
  const list = (arr) => `<ul class="chk">${arr.map((x) => `<li>${esc(fill(c, x))}</li>`).join("")}</ul>`;
  const body = `
<div class="hero"><div class="wrap">
  <div>
    <div class="crumbs"><a href="${base}">Home</a> / <a href="${base}#services">Services</a> / ${esc(p.title)}</div>
    <h1>${esc(p.h1 || `${p.title} in ${area}, FL`)}</h1>
    <p>${esc(fill(c, p.intro))}</p>
    <div class="cta">
      <a class="btn" href="${tel(c.phone)}">Call ${esc(c.phone)}</a>
      <a class="btn alt" href="#contact">Get a free estimate</a>
    </div>
    ${proofBlock(c)}
  </div>
</div></div>

<section><div class="wrap two">
  ${has(p, "signs") ? `<div><div class="eyebrow">${esc(p.signsEyebrow || "Signs to watch for")}</div><h2>${esc(p.signsTitle || "When to call")}</h2>${list(p.signs)}</div>` : ""}
  ${has(p, "points") ? `<div><div class="eyebrow">What to expect</div><h2>What we do</h2>${list(p.points)}</div>` : ""}
</div></section>

${has(p, "body") ? `<section class="soft"><div class="wrap prose">${p.body.map((t) => `<p>${esc(fill(c, t))}</p>`).join("")}</div></section>` : ""}

${has(p, "faq") ? `<section><div class="wrap faq prose"><div class="eyebrow">Questions</div><h2>Common questions</h2>${p.faq
    .map(([q, a]) => `<details><summary>${esc(fill(c, q))}</summary><p>${esc(fill(c, a))}</p></details>`)
    .join("")}</div></section>` : ""}

<section class="soft"><div class="wrap">
  <div class="eyebrow">Service area</div>
  <h2>${esc(p.title)} near you</h2>
  <div class="chips">${c.serviceArea.map((a) => `<span>${esc(a)}</span>`).join("")}</div>
</div></section>

<section><div class="wrap">
  <div class="eyebrow">More from ${esc(c.name)}</div>
  <h2>Other services</h2>
  <div class="chips">${others.map((o) => `<a href="../${o.slug}/" style="text-decoration:none"><span>${esc(o.title)}</span></a>`).join("")}</div>
</div></section>

${band(c)}

${contactForm(c)}`;

  return shell(c, {
    title: `${p.title} in ${area}, FL | ${c.name}`,
    description: p.description || `${p.title} from ${c.name} serving ${c.serviceArea.slice(0, 3).join(", ")} and nearby. Call ${c.phone}.`,
    canonical: c.siteUrl ? `${c.siteUrl.replace(/\/$/, "")}/${p.slug}/` : "",
    body,
    base,
    nav,
  });
}
