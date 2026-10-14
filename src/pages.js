import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { STORE, CATEGORIES, STORE_PHOTO, imgUrl, FINANCING, FAQS, MAPS_URL, REVIEWS_URL, OTHER_STORES, VCARD_HREF, openStatus } from './data';
import { PRODUCTS, money, HAS_POPULAR, popularRank, tier, isBest, BEST_SELLERS, productPath, shareUrl } from './products';
import { CallButtons, CallLink, TextLink, BackLink, Icon, Stars, openSheet } from './ui';
import { useCompare } from './compareStore';
import { ABOUT } from './about';
import { DELIVERY_DETAILS } from './delivery';
import { readRecent, pushRecent } from './recent';
import reviews from './reviews.json';
import { FORM_ENDPOINT } from './config';
import { usePageMeta } from './meta';
import { useList, readList } from './list';
import specials from './specials.json';
import { LEGAL } from './legal';

const COUNTS = {};
PRODUCTS.forEach((p) => { COUNTS[p.cat] = (COUNTS[p.cat] || 0) + 1; });

// Appliances and furniture come first; decor, lighting and rugs follow. Each group runs from most to fewest items.
const ACCESSORIES = ['decor', 'lighting', 'rugs'];
const byCount = (a, b) => COUNTS[b.id] - COUNTS[a.id] || a.name.localeCompare(b.name);
const SORTED = [
  ...CATEGORIES.filter((c) => !ACCESSORIES.includes(c.id)).sort(byCount),
  ...CATEGORIES.filter((c) => ACCESSORIES.includes(c.id)).sort(byCount),
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function FinCards() {
  return (
    <div className="fin-grid">
      {FINANCING.map((f) => (
        <div className="fin-card" key={f.name}>
          <div className={'fin-logo' + (f.logo ? '' : ' pending')}>
            {f.logo ? <img src={f.logo} alt={f.name} /> : <span><b>{f.name}</b><small>logo to add</small></span>}
            {f.logoText && <b className="fin-name">{f.name}</b>}
          </div>
          <p>{f.text}</p>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <figure className="rcard">
      <Stars />
      <p>{r.text}</p>
      <figcaption><b>{r.name}</b><span>Google review</span></figcaption>
    </figure>
  );
}

const SAMPLE = reviews.some((r) => r.sample);
function SampleNote() {
  return SAMPLE ? <p className="sample-note">Sample reviews to show the layout. Replace them with real Google reviews before launch.</p> : null;
}

const catLabel = (id) => (CATEGORIES.find((c) => c.id === id)?.name || '').toLowerCase();

function Hours() {
  return STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>);
}

export function Price({ p }) {
  return p.price != null ? <span className="price">{money(p.price)}</span> : <span className="price call">Call for price</span>;
}

function ProductCard({ p }) {
  const list = useList();
  const cmp = useCompare();
  const saved = list.has(p.id);
  const comparing = cmp.has(p.id);
  return (
    <div className="prod">
      <Link to={productPath(p)} className="prod-link" aria-label={`View ${p.name}`}>
        <span className="prod-img">{isBest(p) && <span className="badge">Best seller</span>}<img src={imgUrl(p.img)} srcSet={`${imgUrl(p.img, 360)} 360w, ${imgUrl(p.img, 600)} 600w`} sizes="(min-width: 1100px) 22vw, (min-width: 700px) 30vw, 46vw" alt="" loading="lazy" decoding="async" width="600" height="600" /></span>
        <span className="prod-name">{p.name}</span>
        <span className="prod-type">{p.type}</span>
      </Link>
      <button type="button" className={'heart' + (saved ? ' on' : '')} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from my list` : `Save ${p.name} to my list`} onClick={() => list.toggle(p.id)}>
        <Icon name="heart" size={18} fill={saved} />
      </button>
      <button type="button" className={'cmp' + (comparing ? ' on' : '')} aria-pressed={comparing} aria-label={comparing ? `Remove ${p.name} from compare` : `Compare ${p.name}`} title={comparing ? 'Added to compare' : 'Compare'} onClick={() => cmp.toggle(p.id)}>
        <Icon name={comparing ? 'check' : 'plus'} size={16} />
      </button>
      <div className="prod-foot">
        {p.price != null ? <span className="price">{money(p.price)}</span> : <Link className="ask" to={`/contact?item=${encodeURIComponent(p.name)}&ask=price`}>Ask for price</Link>}
      </div>
    </div>
  );
}

function Mosaic() {
  const big = new Set(['appliances', 'bedroom']);
  return (
    <div className="mosaic">
      {SORTED.map((c) => (
        <Link key={c.id} to={`/showroom/${c.id}`} className={'tile' + (big.has(c.id) ? ' big' : '') + (c.cutout ? ' cut' : '')}>
          <img src={imgUrl(c.img, 800)} srcSet={`${imgUrl(c.img, 480)} 480w, ${imgUrl(c.img, 800)} 800w`} sizes="(min-width: 900px) 30vw, 100vw" alt="" loading="lazy" width="800" height="800" />
          <span className="tile-label"><b>{c.name}</b><small>{COUNTS[c.id]} items</small></span>
        </Link>
      ))}
    </div>
  );
}

function MapCard() {
  const [live, setLive] = useState(false);
  const preview = typeof window !== 'undefined' && window.__PREVIEW;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(STORE.address)}&z=15&output=embed`;
  return (
    <div className="mapcard">
      {live ? (
        <iframe title="Map to Royal Appliance Outlet" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <div className="map-art">
          <svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <g stroke="currentColor" fill="none" strokeLinecap="round">
              <path d="M0 60H600M0 130H600M0 200H600M90 0V260M210 0V260M390 0V260M510 0V260" strokeWidth="1.5" opacity=".25" />
              <path d="M-20 235L620 25" strokeWidth="9" opacity=".35" />
              <path d="M300 -10V270" strokeWidth="6" opacity=".25" />
            </g>
          </svg>
          <span className="map-pin" aria-hidden="true"><Icon name="pin" size={26} /></span>
          <div className="map-cap">
            <b>{STORE.name}</b>
            <span>{STORE.address}</span>
            <div className="btn-row tight">
              <a className="btn btn-primary btn-sm" href={MAPS_URL} target="_blank" rel="noreferrer"><Icon name="nav" size={16} /> Get Directions</a>
              {!preview && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLive(true)}>Show interactive map</button>}
            </div>
            {preview && <small className="muted">The interactive map appears on the live site.</small>}
          </div>
        </div>
      )}
    </div>
  );
}

export function Home() {
  usePageMeta('', 'Furniture and appliances for every room at Royal Appliance Outlet on N Pace Blvd in Pensacola, FL. Browse the showroom, ask about financing, and visit us seven days a week.');
  const status = openStatus();
  const featured = useMemo(() => {
    const byCat = {};
    BEST_SELLERS.forEach((x) => { (byCat[x.cat] = byCat[x.cat] || []).push(x); });
    const out = Object.values(byCat).map((list) => list.find((x) => x.price != null) || list[0]);
    return out.sort((a, b) => (a.price == null) - (b.price == null));
  }, []);
  return (
    <>
      <section className="hero">
        <img className="hero-bg" src={STORE_PHOTO} alt="" width="1100" height="703" fetchPriority="high" decoding="async" />
        <div className="container hero-copy">
          <p className="eyebrow">Pensacola, Florida</p>
          <h1>Furniture and appliances for every room</h1>
          <p className="lead">One showroom on N Pace Blvd. Browse the collections here, then come see the floor and our team will tell you exactly what is in stock today.</p>
          <div className="btn-row">
            <Link className="btn btn-gold" to="/showroom">Browse the showroom</Link>
            <CallLink className="btn btn-outline"><Icon name="phone" /> {STORE.phone}</CallLink>
          </div>
        </div>
      </section>

      <section className="container" aria-label="Store at a glance">
        <div className="glance">
          <button type="button" className="gcard" onClick={() => openSheet('hours')}>
            <span className="k">Today</span>
            <b className={status.open ? 'is-open' : 'is-closed'}><i aria-hidden="true" />{status.open ? 'Open now' : 'Closed'}</b>
            <small>{cap(status.text.split(' · ')[1])}</small>
            <small>Tap for store hours</small>
          </button>
          <a className="gcard" href={MAPS_URL} target="_blank" rel="noreferrer">
            <span className="k">Visit</span><b>1612 N Pace Blvd Suite 4</b><small>Pensacola, FL 32505 · Get directions</small>
          </a>
          <CallLink className="gcard">
            <span className="k">Call</span><b>{STORE.phone}</b><small>Tap to call · Expert help in store</small>
          </CallLink>
          <Link className="gcard" to="/reviews">
            <span className="k">Rated</span><b className="rate">{STORE.rating} <Stars /></b><small>{STORE.reviews} Google reviews · Read them</small>
          </Link>
        </div>
      </section>

      {specials.length > 0 && (
        <section className="specials" aria-label="This week at the showroom">
          <div className="container">
            <div className="specials-row">
              <span className="k">This week</span>
              <ul>{specials.map((s) => <li key={s.text}>{s.to ? <Link to={s.to}>{s.text}</Link> : <span>{s.text}</span>}</li>)}</ul>
            </div>
            <button type="button" className="btn btn-ghost btn-sm specials-join" onClick={() => openSheet('specials')}>Get weekly specials by text or email</button>
            {specials.some((s) => s.sample) && <p className="sample-note">Sample specials to show the layout. Replace them with this week's real specials.</p>}
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><p className="eyebrow dark">Shop</p><h2>Every room, one showroom</h2></div>
            <Link className="link" to="/showroom">View all <Icon name="arrow" size={16} /></Link>
          </div>
          <Mosaic />
        </div>
      </section>

      <section className="section sand">
        <div className="container">
          <div className="section-head">
            <div><p className="eyebrow dark">Best sellers</p><h2>What customers pick most</h2><p className="sub">Stock changes weekly. Call to confirm availability.</p></div>
          </div>
        </div>
        <div className="rail" role="list">
          {featured.map((p) => <div role="listitem" key={p.id}><ProductCard p={p} /></div>)}
        </div>
      </section>

      <section className="dark-band">
        <div className="container">
          <div className="fin-head">
            <div>
              <p className="eyebrow">Flexible ways to shop</p>
              <h2>Financing and lease-to-own</h2>
              <p className="lead">Approval, eligibility and terms vary by provider.</p>
            </div>
            <Link className="btn btn-gold" to="/financing">View financing options</Link>
          </div>
          <FinCards />
        </div>
      </section>

      <section className="section sand">
        <div className="container split visit">
          <div>
            <p className="eyebrow dark">Visit</p>
            <h2>Come see it in person</h2>
            <p>Royal Appliance Outlet is a locally run outlet on N Pace Blvd. Walk the floor, compare sizes and features, and our team will help you find the right fit.</p>
            <CallButtons />
          </div>
          <div className="visit-card">
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Hours</dt><dd><Hours /><small className="muted">Hours may vary on holidays. Call ahead to confirm.</small></dd>
              <dt>Phone</dt><dd><CallLink>{STORE.phone}</CallLink></dd>
            </dl>
          </div>
          <MapCard />
        </div>
      </section>
    </>
  );
}

export function Showroom() {
  usePageMeta('Showroom', `Browse ${PRODUCTS.length.toLocaleString('en-US')} furniture, mattress and appliance listings by room at Royal Appliance Outlet in Pensacola, FL. Call to confirm availability.`);
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Showroom</p>
          <h1 className="h1-sm">Browse by room</h1>
          <p className="lead">Furniture for the whole house, plus home appliances. Stock changes weekly, so call to confirm availability.</p>
        </div>
      </section>
      <section className="section tight"><div className="container"><Mosaic /></div></section>
    </>
  );
}

const PAGE = 24;
const SORTS = [['popular', HAS_POPULAR ? 'Most popular' : 'Recommended'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['az', 'Name A to Z'], ['za', 'Name Z to A']];

export function Collection() {
  const { cat } = useParams();
  const dept = CATEGORIES.find((c) => c.id === cat);
  usePageMeta(dept?.name, dept ? `${dept.name} at Royal Appliance Outlet in Pensacola, FL: ${COUNTS[dept.id]} items. ${dept.blurb} Call (850) 741-4143 to confirm availability.` : '');
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const DEFAULT_SORT = 'popular';
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const [note, setNote] = useState(true);
  const [shown, setShown] = useState(PAGE);

  // Search, sort and type live in the address, so refresh, share and Back keep them.
  const update = (k, v, dflt = '') => {
    const n = new URLSearchParams(params);
    if (!v || v === dflt) n.delete(k); else n.set(k, v);
    setParams(n, { replace: true });
    setShown(PAGE);
  };
  const setQ = (v) => update('q', v);
  const setType = (v) => update('type', v);
  const setSort = (v) => update('sort', v, DEFAULT_SORT);
  useEffect(() => { setShown(PAGE); }, [cat]);
  useEffect(() => {
    try { window.sessionStorage.setItem('royal_last_collection', loc.pathname + loc.search); } catch (e) { /* storage unavailable */ }
  }, [loc.pathname, loc.search]);

  const all = useMemo(() => PRODUCTS.filter((x) => x.cat === cat), [cat]);
  const types = useMemo(() => {
    const m = {};
    all.forEach((x) => { m[x.type] = (m[x.type] || 0) + 1; });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);
  const pricedCount = useMemo(() => all.filter((x) => x.price != null).length, [all]);
  // Price sorting only makes sense where several items list a price; otherwise the buttons are hidden.
  const sorts = SORTS.filter(([v]) => (v !== 'low' && v !== 'high') || pricedCount >= 2);
  const sort = sorts.some(([v]) => v === params.get('sort')) ? params.get('sort') : DEFAULT_SORT;
  const items = useMemo(() => {
    const list = all.filter((x) => (!type || x.type === type) && `${x.name} ${x.type}`.toLowerCase().includes(q.trim().toLowerCase()));
    const unpriced = (x) => (x.price == null ? 1 : 0);
    const byName = (a, b) => a.name.localeCompare(b.name);
    if (sort === 'az') return [...list].sort(byName);
    if (sort === 'za') return [...list].sort((a, b) => byName(b, a));
    if (sort === 'low') return [...list].sort((a, b) => unpriced(a) - unpriced(b) || (a.price ?? 0) - (b.price ?? 0) || popularRank(a) - popularRank(b) || byName(a, b));
    if (sort === 'high') return [...list].sort((a, b) => unpriced(a) - unpriced(b) || (b.price ?? 0) - (a.price ?? 0) || popularRank(a) - popularRank(b) || byName(a, b));
    // Most popular: items with a listed price come first, then best sellers, then the rest.
    return [...list].sort((a, b) => unpriced(a) - unpriced(b) || popularRank(a) - popularRank(b) || tier(a) - tier(b) || byName(a, b));
  }, [all, type, q, sort]);

  if (!dept) return <Showroom />;
  const reset = (fn) => (e) => fn(e.target.value);
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/showroom" label="showroom" />
          <p className="crumb"><Link to="/showroom">Showroom</Link> / {dept.name}</p>
          <h1 className="h1-sm caps">{dept.name}</h1>
          <p className="lead">{dept.blurb}</p>
        </div>
      </section>
      <div className="dept-bar">
        <div className="container pills" role="navigation" aria-label="Departments">
          {SORTED.map((c) => <NavLink key={c.id} to={`/showroom/${c.id}`}>{c.name}</NavLink>)}
        </div>
      </div>
      <section className="section tight">
        <div className="container shop">
          <aside className="side" aria-label="Filters">
            <h4>Departments</h4>
            <ul className="side-list">
              {SORTED.map((c) => (
                <li key={c.id}><NavLink to={`/showroom/${c.id}`}>{c.name}<small>{COUNTS[c.id]}</small></NavLink></li>
              ))}
            </ul>
            <h4>Product type</h4>
            <ul className="side-list">
              <li><button type="button" className={!type ? 'on' : ''} onClick={() => setType('')}>All<small>{all.length}</small></button></li>
              {types.map(([t, n]) => (
                <li key={t}><button type="button" className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}<small>{n}</small></button></li>
              ))}
            </ul>
          </aside>
          <div className="results">
            {note && (
              <div className="notice" role="note">
                <p>Product photos are manufacturer-hosted catalog images for the model shown. Colors and configurations may vary. Call <b>{STORE.phone}</b> to confirm a specific piece.</p>
                <button type="button" aria-label="Dismiss notice" onClick={() => setNote(false)}>×</button>
              </div>
            )}
            <div className="filters">
              <input id="search" type="search" value={q} onChange={reset(setQ)} placeholder="Search this department" aria-label="Search this department" />
              <select id="ptype" className="mobile-only" value={type} onChange={reset(setType)} aria-label="Product type">
                <option value="">All product types</option>
                {types.map(([t]) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sortbar" role="group" aria-label="Sort by">
              <span>Sort by</span>
              {sorts.map(([v, l]) => (
                <button key={v} type="button" className={sort === v ? 'on' : ''} aria-pressed={sort === v} onClick={() => setSort(v)}>{l}</button>
              ))}
            </div>
            <p className="count muted">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
            {items.length ? (
              <>
                <div className="prod-grid">
                  {items.slice(0, shown).map((x) => <ProductCard key={x.id} p={x} />)}
                </div>
                {items.length > shown && (
                  <div className="more"><button type="button" className="btn btn-ghost" onClick={() => setShown(shown + PAGE)}>Load more ({items.length - shown} left)</button></div>
                )}
              </>
            ) : (
              <div className="empty">
                <h3>No matches</h3>
                <p className="muted">Try a different search or product type, or call and we'll tell you exactly what we have today.</p>
                <CallButtons />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function Reviews() {
  usePageMeta('Reviews', `Royal Appliance Outlet is rated ${STORE.rating} out of 5 from ${STORE.reviews} Google reviews. See what customers say about our prices, service and selection.`);
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Reviews</p>
          <h1 className="h1-sm">What customers say</h1>
          <p className="lead">Rated {STORE.rating} out of 5 from {STORE.reviews} reviews on Google.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="review-hero">
            <div className="score">{STORE.rating}</div>
            <div><Stars /><p className="muted" style={{ margin: '.3rem 0 0' }}>{STORE.reviews} reviews on Google</p></div>
          </div>
          <div className="btn-row">
            <a className="btn btn-primary" href={REVIEWS_URL} target="_blank" rel="noreferrer">Read all reviews on Google <Icon name="arrow" size={16} /></a>
          </div>
          <div className="three">
            {[
              ['Competitive prices', 'Shoppers often mention finding what they needed for less.'],
              ['Friendly service', 'Reviewers regularly highlight helpful, no-pressure staff.'],
              ['Wide selection', 'A rotating floor of appliances and furniture for every room.'],
            ].map(([t, d]) => <div className="theme" key={t}><h2 className="h3">{t}</h2><p>{d}</p></div>)}
          </div>
          {reviews.length > 0 ? (
            <>
              <div className="review-grid">{reviews.map((r, i) => <ReviewCard r={r} key={i} />)}</div>
              <SampleNote />
            </>
          ) : (
            <p className="small muted">The themes above summarize public review feedback. Tap the button to read each review on Google.</p>
          )}
        </div>
      </section>
    </>
  );
}

function ShareBox({ p }) {
  const url = shareUrl(p);
  const [done, setDone] = useState(false);
  const copy = async (e) => {
    const field = e.currentTarget.closest('.share').querySelector('input');
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch (err) { field.select(); }
  };
  const text = encodeURIComponent(`${p.name} at Royal Appliance Outlet: ${url}`);
  return (
    <div className="share">
      <label htmlFor="share-url">Share this item</label>
      <div className="share-row">
        <input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>{done ? 'Link copied' : 'Copy link'}</button>
      </div>
      <div className="share-alt">
        {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="inline" onClick={() => navigator.share({ title: p.name, text: `${p.name} at Royal Appliance Outlet`, url }).catch(() => {})}>Share…</button>}
        <a href={`sms:?&body=${text}`}>Text it</a>
        <a href={`mailto:?subject=${encodeURIComponent(p.name)}&body=${text}`}>Email it</a>
      </div>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const list = useList();
  const cmp = useCompare();
  const [shareOpen, setShareOpen] = useState(false);
  const p = PRODUCTS[parseInt(slug, 10)];
  const [recent] = useState(readRecent);
  useEffect(() => { if (p) pushRecent(p.id); }, [p]);
  usePageMeta(p?.name, p ? `${p.name}${p.price != null ? ` for ${money(p.price)}` : ''} at Royal Appliance Outlet in Pensacola, FL. ${p.type} from our ${catLabel(p.cat)} collection. Call (850) 741-4143 to confirm availability.` : '');
  if (!p) return <Showroom />;
  const saved = list.has(p.id);
  let last = null;
  try { last = window.sessionStorage.getItem('royal_last_collection'); } catch (e) { /* storage unavailable */ }
  const backTo = last && last.startsWith(`/showroom/${p.cat}`) ? last : `/showroom/${p.cat}`;
  const viewed = recent.filter((id) => id !== p.id).map((id) => PRODUCTS[id]).filter(Boolean).slice(0, 4);
  const dept = CATEGORIES.find((c) => c.id === p.cat);
  const seen = new Set([p.name]);
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.type === p.type && x.id !== p.id).sort((a, b) => (a.price == null) - (b.price == null)).filter((x) => !seen.has(x.name) && seen.add(x.name)).slice(0, 4);
  return (
    <>
      <section className="pp-bar">
        <div className="container"><BackLink to={backTo} label={dept?.name.toLowerCase()} /></div>
      </section>
      <section className="section tight">
        <div className="container pp">
          <div className="pp-img">
            {isBest(p) && <span className="badge">Best seller</span>}
            <img src={imgUrl(p.img, 1000)} alt={p.name} />
          </div>
          <div className="pp-info">
            <p className="crumb dark"><Link to="/showroom">Showroom</Link> / <Link to={`/showroom/${p.cat}`}>{dept?.name}</Link> / {p.type}</p>
            <h1 className="pp-title">{p.name}</h1>
            {p.price != null ? <div className="pm-price"><Price p={p} /></div> : <p className="price-line">Price on request</p>}
            <p className="muted pp-note">Call or visit to confirm what is on the floor today.</p>
            <div className="pp-actions">
              <CallLink className="btn btn-primary btn-block"><Icon name="phone" /> Call {STORE.phone}</CallLink>
              <TextLink className="btn btn-ghost btn-block" body={p.price == null ? `Hi! What is the price of ${p.name}? ${shareUrl(p)}` : `Hi! I'm interested in ${p.name}. ${shareUrl(p)}`}><Icon name="chat" /> {p.price == null ? 'Text us for the price' : 'Text us about this item'}</TextLink>
            </div>
            <div className="pp-tools" role="group" aria-label="More options">
              <button type="button" className={saved ? 'on' : ''} aria-pressed={saved} onClick={() => list.toggle(p.id)}><Icon name="heart" size={16} fill={saved} /> {saved ? 'Saved' : 'Save'}</button>
              <button type="button" className={cmp.has(p.id) ? 'on' : ''} aria-pressed={cmp.has(p.id)} onClick={() => cmp.toggle(p.id)}><Icon name={cmp.has(p.id) ? 'check' : 'plus'} size={16} /> {cmp.has(p.id) ? 'Comparing' : 'Compare'}</button>
              <button type="button" className={shareOpen ? 'on' : ''} aria-expanded={shareOpen} onClick={() => setShareOpen(!shareOpen)}><Icon name="arrow" size={16} /> Share</button>
            </div>
            {shareOpen && <ShareBox p={p} />}
            <p className="small muted pp-fine">Photos are manufacturer catalog images and may vary from the item in store. <a href={MAPS_URL} target="_blank" rel="noreferrer">Get directions</a></p>
          </div>
        </div>
      </section>
      {viewed.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head"><h2>Recently viewed</h2></div>
            <div className="prod-grid">{viewed.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="section sand">
          <div className="container">
            <div className="section-head"><h2>More {p.type.toLowerCase()}</h2><Link className="link" to={`/showroom/${p.cat}`}>View all <Icon name="arrow" size={16} /></Link></div>
            <div className="prod-grid">{related.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}

export function Socials() {
  usePageMeta('Find us online', 'Follow Royal Appliance Outlet on Facebook, read our reviews, get directions, call or email the store in Pensacola, FL.');
  const boxes = [
    { k: 'Facebook', t: 'Follow us', s: 'Store updates and what is new on the floor', href: STORE.facebook, ext: true },
    { k: 'Google', t: 'Read our reviews', s: `${STORE.rating} stars from ${STORE.reviews} reviews`, to: '/reviews' },
    { k: 'Directions', t: '1612 N Pace Blvd', s: 'Open in Maps', href: MAPS_URL, ext: true },
    { k: 'Call', t: STORE.phone, s: 'Expert help in store', call: true },
    { k: 'Email', t: 'Send us a message', s: STORE.email, to: '/contact' },
    { k: 'Hours', t: 'Open 7 days', s: 'Tap for store hours', sheet: 'hours' },
    { k: 'Same owner', t: 'Our other stores', s: 'Royal Vape Mart and our car auction', to: '/other-stores' },
    { k: 'Showroom', t: 'Browse the showroom', s: `${PRODUCTS.length.toLocaleString('en-US')} items in 14 departments`, to: '/showroom' },
    { k: 'Financing', t: 'Ask about financing', s: 'Synchrony, Snap and Acima Leasing', to: '/financing' },
  ];
  const body = (b) => (
    <>
      <span className="k">{b.k}</span><b>{b.t}</b><small>{b.s}</small>
      <span className="go" aria-hidden="true"><Icon name="arrow" size={18} /></span>
    </>
  );
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Stay connected</p>
          <h1 className="h1-sm">Find us online</h1>
          <p className="lead">Follow along, read what customers say, or reach the store directly.</p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="boxgrid">
            {boxes.map((b) => {
              if (b.call) return <CallLink className="gcard box" key={b.k}>{body(b)}</CallLink>;
              if (b.sheet) return <button type="button" className="gcard box" key={b.k} onClick={() => openSheet(b.sheet)}>{body(b)}</button>;
              if (b.to) return <Link className="gcard box" key={b.k} to={b.to}>{body(b)}</Link>;
              return <a className="gcard box" key={b.k} href={b.href} target="_blank" rel="noreferrer">{body(b)}</a>;
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export function OtherStores() {
  usePageMeta('Our other stores', 'Royal Appliance Outlet is part of a family of local Pensacola businesses, including Royal Vape Mart and a car auction business.');
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Same owner</p>
          <h1 className="h1-sm">Our other stores</h1>
          <p className="lead">Royal Appliance Outlet is part of a family of local businesses. Here is where else to find us.</p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="boxgrid two">
            {OTHER_STORES.map((s) => {
              const inner = (
                <>
                  <span className="k">Store</span><b>{s.title}</b><small>{s.text}</small>
                  {s.address && <small>{s.address}</small>}
                  {s.phone && <small>{s.phone}</small>}
                  {s.url ? <span className="go" aria-hidden="true"><Icon name="arrow" size={18} /></span> : <small className="soon">Details coming soon</small>}
                </>
              );
              return s.url
                ? <a className="gcard box" key={s.k} href={s.url} target="_blank" rel="noreferrer">{inner}</a>
                : <div className="gcard box static" key={s.k}>{inner}</div>;
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export function MyList() {
  usePageMeta('My list', 'Items you saved from the Royal Appliance Outlet showroom. Send your list to the store or call about it.');
  const list = useList();
  const items = list.ids.map((id) => PRODUCTS[id]).filter(Boolean);
  const [copied, setCopied] = useState(false);
  const text = `My list from Royal Appliance Outlet:\n${items.map((x) => `- ${x.name}${x.price != null ? ` (${money(x.price)})` : ''}`).join('\n')}`;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { setCopied(false); } };
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/showroom" label="showroom" />
          <p className="eyebrow">Saved items</p>
          <h1 className="h1-sm">My list</h1>
          <p className="lead">Save pieces as you browse, then send the list to the store or call and ask about them.</p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          {items.length ? (
            <>
              <div className="btn-row">
                <Link className="btn btn-primary" to="/contact?list=1">Send my list to the store</Link>
                <CallLink className="btn btn-ghost"><Icon name="phone" /> Call {STORE.phone}</CallLink>
                <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? 'List copied' : 'Copy my list'}</button>
                <button type="button" className="btn btn-ghost" onClick={list.clear}>Clear list</button>
              </div>
              <p className="count muted">{items.length} {items.length === 1 ? 'item' : 'items'} saved on this device</p>
              <div className="prod-grid">{items.map((x) => <ProductCard key={x.id} p={x} />)}</div>
            </>
          ) : (
            <div className="empty">
              <h2 className="h3">Nothing saved yet</h2>
              <p className="muted">Tap the heart on any item to save it here. Your list stays on this device.</p>
              <Link className="btn btn-primary" to="/showroom">Browse the showroom</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function About() {
  usePageMeta('About us', 'Royal Appliance Outlet is a locally run furniture and appliance outlet on N Pace Blvd in Pensacola, FL, open seven days a week with expert help in store.');
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">About us</p>
          <h1 className="h1-sm">A local outlet for furniture and appliances</h1>
          <p className="lead">Royal Appliance Outlet is a locally run showroom on N Pace Blvd in Pensacola. Come see the floor in person and our team will help you find the right fit.</p>
        </div>
      </section>
      <section className="section">
        <div className="container split">
          <div>
            <h2 className="h3 sub-h">What you will find</h2>
            <p>Furniture for every room, mattresses, rugs, lighting and decor, plus home appliances. Our floor changes weekly, so call or stop in and we will tell you what is on it today.</p>
            <h2 className="h3 sub-h">How we help</h2>
            <p>Our team helps you compare sizes, features and fit, and talks through financing and lease-to-own options with Synchrony, Snap Finance and Acima Leasing.</p>
            <h2 className="h3 sub-h">Part of a local family of businesses</h2>
            <p>The same owner also runs Royal Vape Mart and a car auction business. <Link to="/other-stores">See our other stores</Link>.</p>
            {ABOUT.story.length > 0 && <><h2 className="h3 sub-h">Our story</h2>{ABOUT.story.map((t) => <p key={t}>{t}</p>)}</>}
          </div>
          <div>
            <img className="visit-img" src={STORE_PHOTO} alt="Inside the Royal Appliance Outlet showroom" width="1100" height="703" loading="lazy" />
            <div className="visit-card" style={{ marginTop: 18 }}>
              <dl className="info">
                <dt>Address</dt><dd>{STORE.address}</dd>
                <dt>Hours</dt><dd><Hours /></dd>
                <dt>Rated</dt><dd>{STORE.rating} out of 5 from {STORE.reviews} Google reviews</dd>
              </dl>
            </div>
          </div>
        </div>
      </section>
      {ABOUT.team.length > 0 && (
        <section className="section sand">
          <div className="container">
            <h2>Meet the team</h2>
            <div className="three">{ABOUT.team.map((m) => <div className="theme" key={m.name}><h3>{m.name}</h3><p className="muted">{m.role}</p><p>{m.text}</p></div>)}</div>
          </div>
        </section>
      )}
      <section className="section tight"><div className="container"><CallButtons /></div></section>
    </>
  );
}

export function Delivery() {
  usePageMeta('Delivery and pickup', 'Delivery and pickup at Royal Appliance Outlet in Pensacola, FL: what to measure before you buy and what to ask the store. Call to arrange delivery.');
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Getting it home</p>
          <h1 className="h1-sm">Delivery and pickup</h1>
          <p className="lead">Delivery and pickup are arranged with the store for the items you choose. Call or send us a message and we will confirm what is possible for you.</p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          {DELIVERY_DETAILS.length > 0 && (
            <div className="boxgrid two" style={{ marginBottom: '2.5rem' }}>
              {DELIVERY_DETAILS.map((d) => <div className="gcard box static" key={d.k}><span className="k">{d.k}</span><b>{d.text}</b></div>)}
            </div>
          )}
          <h2 className="h3 sub-h">Before you buy, measure</h2>
          <ul className="ticks">
            <li>The space where the piece will go, including height for tall items.</li>
            <li>Doorways, hallways, stair turns and elevators on the way in.</li>
            <li>For appliances: width, height and depth of the opening, plus the power, gas or water hookups you have.</li>
          </ul>
          <h2 className="h3 sub-h">What to ask us</h2>
          <ul className="ticks">
            <li>Whether we can deliver to your address, and when.</li>
            <li>What delivery costs and whether set-up or installation is included.</li>
            <li>Whether we can haul away an old appliance or piece of furniture.</li>
            <li>How and when to pick up an item yourself.</li>
          </ul>
          <div className="btn-row">
            <CallLink className="btn btn-primary"><Icon name="phone" /> Call {STORE.phone}</CallLink>
            <TextLink className="btn btn-ghost" body="Hi! I have a question about delivery and pickup."><Icon name="chat" /> Text us</TextLink>
            <Link className="btn btn-ghost" to="/contact?topic=delivery">Send a message</Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function Financing() {
  usePageMeta('Financing', 'Ask about Synchrony, Snap Finance and Acima Leasing financing and lease-to-own options at Royal Appliance Outlet in Pensacola, FL. Approval and terms vary.');
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Flexible ways to shop</p>
          <h1 className="h1-sm">Financing and lease-to-own</h1>
          <p className="lead">Approval, eligibility and terms vary by provider.</p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          <FinCards />
          <p style={{ marginTop: '1.5rem' }}>Ask our team in store which option fits your situation and we'll walk you through the next steps.</p>
          <CallButtons />
        </div>
      </section>
    </>
  );
}

export function Faq() {
  usePageMeta('FAQ', 'Answers about stock, financing, hours, location and pricing at Royal Appliance Outlet in Pensacola, FL.');
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Answers</p><h1 className="h1-sm">Frequently asked questions</h1></div>
      </section>
      <section className="section">
        <div className="container narrow">
          {FAQS.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}
          <CallButtons />
        </div>
      </section>
    </>
  );
}

export function Contact() {
  usePageMeta('Contact', 'Contact Royal Appliance Outlet in Pensacola, FL. Call (850) 741-4143, visit 1612 N Pace Blvd Suite 4, or send us a message.');
  const [params] = useSearchParams();
  const item = params.get('item');
  const wantsPrice = params.get('ask') === 'price';
  const topic = params.get('topic');
  const listNames = params.get('list') ? readList().map((id) => PRODUCTS[id] && PRODUCTS[id].name).filter(Boolean) : [];
  const start = listNames.length
    ? `I would like to ask about these items from my list:\n${listNames.map((n) => `- ${n}`).join('\n')}\n\n`
    : topic === 'delivery' ? 'I have a question about delivery and pickup.\n\n'
    : item ? (wantsPrice ? `Could you tell me the price of: ${item}\n\n` : `I'm interested in: ${item}\n\n`) : '';
  const [f, setF] = useState({ name: '', phone: '', email: '', msg: start, _gotcha: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f._gotcha) return; // spam trap: real visitors never see this field
    if (!f.phone.trim() && !f.email.trim()) { setErr('Please add a phone number or an email so we can reach you.'); return; }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('That email address does not look right. Please check it.'); return; }
    setErr('');
    const preview = typeof window !== 'undefined' && window.__PREVIEW;
    if (!FORM_ENDPOINT && !preview) {
      const body = encodeURIComponent(`${f.msg}\n\nName: ${f.name}\nPhone: ${f.phone}\nEmail: ${f.email}`);
      window.location.href = `mailto:${STORE.email}?subject=${encodeURIComponent('Website inquiry')}&body=${body}`;
      return;
    }
    setState('sending');
    try {
      if (preview) {
        await new Promise((r) => setTimeout(r, 700)); // the shared preview cannot reach outside services
      } else {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name: f.name, phone: f.phone, email: f.email, message: f.msg, _subject: 'Website inquiry', _replyto: f.email }),
        });
        if (!res.ok) throw new Error('send failed');
      }
      setState('sent');
    } catch (x) {
      setState('error');
    }
  };

  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Contact</p><h1 className="h1-sm">Talk to the team</h1><p className="lead">The fastest way to check stock and pricing is a quick call.</p></div>
      </section>
      <section className="section">
        <div className="container split">
          {state === 'sent' ? (
            <div className="sent" role="status">
              <h2>Message sent</h2>
              <p>Thanks, {f.name.split(' ')[0] || 'friend'}. We will get back to you soon. For a faster answer, call <b>{STORE.phone}</b>.</p>
              {typeof window !== 'undefined' && window.__PREVIEW && <p className="sample-note">Preview only: nothing was actually sent. The live site delivers this to the store's inbox.</p>}
              <div className="btn-row"><Link className="btn btn-ghost" to="/showroom">Keep browsing</Link></div>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              <label htmlFor="c-name">Name<input id="c-name" required autoComplete="name" value={f.name} onChange={set('name')} /></label>
              <label htmlFor="c-phone">Phone<input id="c-phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
              <label htmlFor="c-email">Email<input id="c-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
              <label htmlFor="c-msg">What are you looking for?<textarea id="c-msg" required rows="5" value={f.msg} onChange={set('msg')} /></label>
              <div className="trap" aria-hidden="true"><label htmlFor="c-web">Leave this empty<input id="c-web" tabIndex="-1" autoComplete="off" value={f._gotcha} onChange={set('_gotcha')} /></label></div>
              {err && <p className="form-err" role="alert">{err}</p>}
              {state === 'error' && <p className="form-err" role="alert">That did not go through. Please try again, or call {STORE.phone}.</p>}
              <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
          <div>
            <h2 className="h3">Store details</h2>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Phone</dt><dd><CallLink>{STORE.phone}</CallLink></dd>
              <dt>Email</dt><dd><a href={`mailto:${STORE.email}`}>{STORE.email}</a></dd>
              <dt>Hours</dt><dd><Hours /></dd>
            </dl>
            <CallButtons />
            <p><a className="link" href={VCARD_HREF} download="Royal-Appliance-Outlet.vcf">Save our contact to your phone</a></p>
          </div>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  usePageMeta('Page not found', 'That page could not be found. Browse the Royal Appliance Outlet showroom or call (850) 741-4143.');
  return (
    <>
      <section className="page-head">
        <div className="container"><p className="eyebrow">Page not found</p><h1 className="h1-sm">We could not find that page</h1><p className="lead">The link may be old or mistyped. Try the showroom, or call and we will help.</p></div>
      </section>
      <section className="section tight"><div className="container"><div className="btn-row"><Link className="btn btn-primary" to="/showroom">Browse the showroom</Link><Link className="btn btn-ghost" to="/">Go home</Link></div><CallButtons /></div></section>
    </>
  );
}

export function LegalPage({ kind }) {
  const doc = LEGAL[kind];
  usePageMeta(doc.title, doc.description);
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Legal</p><h1 className="h1-sm">{doc.title}</h1></div>
      </section>
      <section className="section">
        <div className="container narrow legal">
          {doc.blocks.map((b, i) => {
            if (b.h) return <h2 key={i} className="h3">{b.h}</h2>;
            if (b.ul) return <ul key={i}>{b.ul.map((t) => <li key={t}>{t}</li>)}</ul>;
            return <p key={i}>{b.p}</p>;
          })}
        </div>
      </section>
    </>
  );
}
