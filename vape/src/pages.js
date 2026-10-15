import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { STORE, CATEGORIES, BRANDS, imgUrl, FAQS, MAPS_URL, REVIEWS_URL, OTHER_STORES, VCARD_HREF, openStatus } from './data';
import { PRODUCTS, getProduct, idFromSlug, money, HAS_POPULAR, popularRank, isBest, BEST_SELLERS, productPath, shareUrl } from './products';
import { CallButtons, CallLink, BackLink, Icon, Stars, openSheet } from './ui';
import { readRecent, pushRecent } from './recent';
import { useReserve, lineTotal } from './reserve';
import reviews from './reviews.json';
import { submitForm } from './forms';
import { usePageMeta } from './meta';
import { LEGAL } from './legal';

const COUNTS = {};
PRODUCTS.forEach((p) => { COUNTS[p.cat] = (COUNTS[p.cat] || 0) + 1; });
const DEPTS = CATEGORIES.filter((c) => COUNTS[c.id]);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const catOf = (id) => CATEGORIES.find((c) => c.id === id);

function ReviewCard({ r }) {
  return (
    <figure className="rcard">
      <Stars />
      <p>{r.text}</p>
      <figcaption><span>Google review</span></figcaption>
    </figure>
  );
}

function Hours() {
  return STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>);
}

export function Price({ p }) {
  return p.price != null ? <span className="price">{money(p.price)}</span> : <span className="price call">Call for price</span>;
}

function ProductCard({ p }) {
  const reserve = useReserve();
  const [added, setAdded] = useState(false);
  const choose = p.options.length > 0;
  const add = () => { reserve.add(p.id); setAdded(true); setTimeout(() => setAdded(false), 1400); };
  return (
    <div className="prod">
      <Link to={productPath(p)} className="prod-link" aria-label={`View ${p.name}`}>
        <span className="prod-img">{isBest(p) ? <span className="badge">Best seller</span> : p.isNew && <span className="badge">New</span>}<img src={imgUrl(p.img)} alt="" loading="lazy" decoding="async" width="520" height="520" /></span>
        <span className="prod-name">{p.name}</span>
        <span className="prod-type">{p.type}</span>
      </Link>
      <div className="prod-foot">
        <Price p={p} />
        {choose
          ? <Link className="btn btn-primary btn-sm" to={productPath(p)} aria-label={`Choose ${p.optLabel.toLowerCase() || 'option'} for ${p.name}`}>Choose</Link>
          : <button type="button" className="btn btn-primary btn-sm" onClick={add} aria-label={`Add ${p.name} to reserve list`}>{added ? 'Added' : 'Add'}</button>}
      </div>
    </div>
  );
}

function Mosaic() {
  const big = new Set(['vape']);
  return (
    <div className="mosaic">
      {DEPTS.map((c) => (
        <Link key={c.id} to={`/shop/${c.id}`} className={'tile cut' + (big.has(c.id) ? ' big' : '')}>
          <img src={imgUrl(c.img)} alt="" loading="lazy" width="520" height="520" />
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
        <iframe title="Map to Royal Vape Mart" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
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

// The fine print the store posts, shown in full on the 21+ policy page and in short on the home page.
function AgeNotice() {
  return (
    <div className="age-box">
      <span className="k">The fine print</span>
      <h2>21+ only, no exceptions</h2>
      <ul className="ticks">
        <li>You must be 21 or older to buy any tobacco, nicotine or vapor product here. Federal and Florida law both set that line at 21.</li>
        <li>Valid, government-issued photo ID is required for every purchase.</li>
        <li>Royal Vape reserves the right to refuse any sale.</li>
      </ul>
      <p className="small">WARNING: This product contains nicotine. Nicotine is an addictive chemical.</p>
      <Link className="link" to="/age-policy">Read the full 21+ policy <Icon name="arrow" size={16} /></Link>
    </div>
  );
}

const HERO_NAMES = ['Geek Bar Mate Kit', 'ZYN', 'Lost Mary Nera Fullview Kit', 'RAZ LTX 25k'];

export function Home() {
  usePageMeta('', 'Royal Vape Mart in Pensacola offers vapes, nicotine pouches, THC products, mushroom products, beer and wine. Open daily 6AM to 1AM. 21+ only. Reserve online and pick up in store.');
  const status = openStatus();
  const heroItems = useMemo(() => HERO_NAMES.map((n) => PRODUCTS.find((p) => p.name === n)).filter(Boolean), []);
  return (
    <>
      <section className="hero">
        <div className="container hero-copy">
          <p className="eyebrow">Gulf Beach Hwy · Pensacola, FL</p>
          <h1>Open 6AM to 1AM. Every day.</h1>
          <p className="lead">Vapes, nicotine pouches, THC and mushroom products, plus cold beer and wine at the register. Fair prices, a staff that knows the products, and a clean, easy space to shop. 21+ only, always.</p>
          <div className="btn-row">
            <Link className="btn btn-gold" to="/shop">Shop now</Link>
            <CallLink className="btn btn-outline"><Icon name="phone" /> {STORE.phone}</CallLink>
          </div>
          <p className="hero-age">21+ only. Valid ID required for every purchase. No exceptions.</p>
        </div>
        {heroItems.length > 0 && (
          <div className="container hero-art" aria-hidden="true">
            {heroItems.map((p) => <span key={p.id}><img src={imgUrl(p.img)} alt="" width="520" height="520" decoding="async" /></span>)}
          </div>
        )}
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
            <span className="k">Visit</span><b>{STORE.street}</b><small>Pensacola, FL 32507 · Get directions</small>
          </a>
          <CallLink className="gcard">
            <span className="k">Call</span><b>{STORE.phone}</b><small>Tap to call · A real person answers</small>
          </CallLink>
          <Link className="gcard" to="/shop">
            <span className="k">Reserve online</span><b>Pay and pick up in store</b><small>Ready within the hour</small>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><p className="eyebrow dark">On the shelves</p><h2>What we carry</h2><p className="sub">The brands people come in asking for, kept in stock and priced to match anyone else in the area.</p></div>
            <Link className="link" to="/shop">Shop all products <Icon name="arrow" size={16} /></Link>
          </div>
          <ul className="brands" aria-label="Brands we carry">
            {BRANDS.map((b) => <li key={b.id} className={b.onDark ? 'on-dark' : ''}><img src={imgUrl(b.src.slice(1))} alt={b.name} loading="lazy" width="160" height="107" /></li>)}
          </ul>
          <Mosaic />
        </div>
      </section>

      {BEST_SELLERS.length > 0 && (
        <section className="section sand">
          <div className="container"><div className="section-head"><div><p className="eyebrow dark">Best sellers</p><h2>What customers pick most</h2></div></div></div>
          <div className="rail" role="list">{BEST_SELLERS.slice(0, 12).map((p) => <div role="listitem" key={p.id}><ProductCard p={p} /></div>)}</div>
        </section>
      )}

      <section className="section sand">
        <div className="container split">
          <div>
            <p className="eyebrow dark">The shop</p>
            <h2>Pensacola's west-side vape and smoke shop</h2>
            <p>Royal Vape Mart sits on Gulf Beach Hwy in the 32507, minutes from NAS Pensacola, Perdido Key, Big Lagoon and Warrington. We carry a wide selection of vapes, nicotine pouches, THC and mushroom products, hookah, glass, kratom, CBD and cigarettes, with a full cooler of beer and wine for the road.</p>
            <p>Searching for a vape shop near Perdido Key or a smoke shop open late in Pensacola? We are open until 1 AM every night, and you can <Link to="/shop">reserve online</Link> and pick up at the counter the same day.</p>
          </div>
          <div className="three stack">
            {[
              ['Fair prices', 'Priced to match anyone else in the area, with no tourist markup on the brands people actually buy.'],
              ['Staff who know it', 'Ask about a device, a flavor or a strength and get a real answer instead of a shrug.'],
              ['19 hours a day', 'Open 6 AM to 1 AM, seven days a week. Early shift or late night, the doors are open.'],
            ].map(([t, d]) => <div className="theme" key={t}><h3 className="h3">{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><div><p className="eyebrow dark">From the regulars</p><h2>What people say</h2></div><Link className="link" to="/reviews">All reviews <Icon name="arrow" size={16} /></Link></div>
          <div className="review-grid">{reviews.map((r, i) => <ReviewCard r={r} key={i} />)}</div>
        </div>
      </section>

      <section className="section sand">
        <div className="container split visit">
          <div>
            <p className="eyebrow dark">Find us</p>
            <h2>Visit Royal Vape</h2>
            <p>Early shift or late night, come on in. Reserve ahead and we will have it ready at the counter.</p>
            <CallButtons />
          </div>
          <div className="visit-card">
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Hours</dt><dd><Hours /><small className="muted">Holiday hours may vary.</small></dd>
              <dt>Phone</dt><dd><CallLink>{STORE.phone}</CallLink></dd>
            </dl>
          </div>
          <MapCard />
        </div>
      </section>

      <section className="section">
        <div className="container"><AgeNotice /></div>
      </section>
    </>
  );
}

export function Shop() {
  usePageMeta('Shop', `Browse ${PRODUCTS.length.toLocaleString('en-US')} vapes, nicotine pouches, e-liquid, kratom, THC and tobacco products at Royal Vape Mart in Pensacola, FL. Reserve online, pay and pick up in store. 21+ only.`);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const found = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return PRODUCTS.filter((p) => { const hay = `${p.name} ${p.type} ${catOf(p.cat)?.name} ${p.options.join(' ')}`.toLowerCase(); return words.every((w) => hay.includes(w)); });
  }, [q]);
  const setQ = (v) => { const n = new URLSearchParams(params); if (v) n.set('q', v); else n.delete('q'); setParams(n, { replace: true }); };
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Reserve online · pay and pick up in store</p>
          <h1 className="h1-sm">Shop Royal Vape</h1>
          <p className="lead">Search by product, brand or flavor, or pick a department. 21+ only; valid ID is checked at pickup.</p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="filters">
            <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, brand or flavor" aria-label="Search all products" />
          </div>
          {q.trim() ? (
            <>
              <p className="count muted">{found.length} {found.length === 1 ? 'result' : 'results'} for "{q.trim()}"</p>
              {found.length ? <div className="prod-grid">{found.slice(0, 48).map((x) => <ProductCard key={x.id} p={x} />)}</div> : (
                <div className="empty"><h3>No matches</h3><p className="muted">Can't find your brand or flavor? Tell us and we'll look into stocking it.</p><Link className="btn btn-primary" to={`/request?q=${encodeURIComponent(q.trim())}`}>Request a product</Link></div>
              )}
            </>
          ) : <Mosaic />}
          {!q.trim() && <p className="muted" style={{ marginTop: '1.5rem' }}>Can't find your brand or flavor? <Link to="/request">Tell us what to carry</Link>.</p>}
        </div>
      </section>
    </>
  );
}

const PAGE = 24;
const SORTS = [['popular', 'Most popular'], ['az', 'Name A to Z'], ['za', 'Name Z to A'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low']];

export function Collection() {
  const { cat } = useParams();
  const dept = DEPTS.find((c) => c.id === cat);
  usePageMeta(dept?.name, dept ? `${dept.name} at Royal Vape Mart in Pensacola, FL: ${COUNTS[dept.id]} items. ${dept.blurb} Reserve online and pick up in store. 21+ only.` : '');
  const [params, setParams] = useSearchParams();
  const loc = useLocation();
  const DEFAULT_SORT = HAS_POPULAR ? 'popular' : 'az';
  const q = params.get('q') || '';
  const type = params.get('type') || '';
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
  const sorts = SORTS.filter(([v]) => v !== 'popular' || HAS_POPULAR);
  const sort = sorts.some(([v]) => v === params.get('sort')) ? params.get('sort') : DEFAULT_SORT;
  const items = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = all.filter((x) => (!type || x.type === type) && words.every((w) => `${x.name} ${x.type} ${x.options.join(' ')}`.toLowerCase().includes(w)));
    const byName = (a, b) => a.name.localeCompare(b.name);
    if (sort === 'az') return [...list].sort(byName);
    if (sort === 'za') return [...list].sort((a, b) => byName(b, a));
    if (sort === 'low') return [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0) || byName(a, b));
    if (sort === 'high') return [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0) || byName(a, b));
    return [...list].sort((a, b) => popularRank(a) - popularRank(b) || byName(a, b));
  }, [all, type, q, sort]);

  if (!dept) return <Shop />;
  const reset = (fn) => (e) => fn(e.target.value);
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/shop" label="shop" />
          <p className="crumb"><Link to="/shop">Shop</Link> / {dept.name}</p>
          <h1 className="h1-sm caps">{dept.name}</h1>
          <p className="lead">{dept.blurb}</p>
        </div>
      </section>
      <div className="dept-bar">
        <div className="container pills" role="navigation" aria-label="Departments">
          {DEPTS.map((c) => <NavLink key={c.id} to={`/shop/${c.id}`}>{c.name}</NavLink>)}
        </div>
      </div>
      <section className="section tight">
        <div className="container shop">
          <aside className="side" aria-label="Filters">
            <h2>Departments</h2>
            <ul className="side-list">
              {DEPTS.map((c) => (
                <li key={c.id}><NavLink to={`/shop/${c.id}`}>{c.name}<small>{COUNTS[c.id]}</small></NavLink></li>
              ))}
            </ul>
            {types.length > 1 && (
              <>
                <h2>Product type</h2>
                <ul className="side-list">
                  <li><button type="button" className={!type ? 'on' : ''} onClick={() => setType('')}>All<small>{all.length}</small></button></li>
                  {types.map(([t, n]) => (
                    <li key={t}><button type="button" className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}<small>{n}</small></button></li>
                  ))}
                </ul>
              </>
            )}
          </aside>
          <div className="results">
            <div className="filters">
              <input id="search" type="search" value={q} onChange={reset(setQ)} placeholder="Search this department" aria-label="Search this department" />
              {types.length > 1 && (
                <select id="ptype" className="mobile-only" value={type} onChange={reset(setType)} aria-label="Product type">
                  <option value="">All product types</option>
                  {types.map(([t]) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            <div className="sortbar" role="group" aria-label="Sort by">
              <span>Sort by</span>
              {sorts.map(([v, l]) => (
                <button key={v} type="button" className={sort === v ? 'on' : ''} aria-pressed={sort === v} onClick={() => setSort(v)}>{l}</button>
              ))}
            </div>
            <p className="count muted">{items.length} {items.length === 1 ? 'item' : 'items'} · 21+ only</p>
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
                <p className="muted">Try a different search, or tell us what you are looking for and we will look into stocking it.</p>
                <Link className="btn btn-primary" to="/request">Request a product</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function Reviews() {
  usePageMeta('Reviews', 'What customers say about Royal Vape Mart in Pensacola: friendly, knowledgeable staff and competitive prices. Read the reviews on Google.');
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Reviews</p>
          <h1 className="h1-sm">What people say</h1>
          <p className="lead">From the regulars on Gulf Beach Hwy.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="btn-row">
            <a className="btn btn-primary" href={REVIEWS_URL} target="_blank" rel="noreferrer">Read all reviews on Google <Icon name="arrow" size={16} /></a>
          </div>
          <div className="three">
            {[
              ['Friendly staff', 'Reviewers regularly mention helpful, caring staff.'],
              ['Fair prices', 'Shoppers say the shop keeps up with competitors on price.'],
              ['Good atmosphere', 'A clean, easy place to shop, open early and late.'],
            ].map(([t, d]) => <div className="theme" key={t}><h2 className="h3">{t}</h2><p>{d}</p></div>)}
          </div>
          <div className="review-grid">{reviews.map((r, i) => <ReviewCard r={r} key={i} />)}</div>
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
  const text = encodeURIComponent(`${p.name} at Royal Vape Mart: ${url}`);
  return (
    <div className="share">
      <label htmlFor="share-url">Share this item</label>
      <div className="share-row">
        <input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>{done ? 'Link copied' : 'Copy link'}</button>
      </div>
      <div className="share-alt">
        {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="inline" onClick={() => navigator.share({ title: p.name, text: `${p.name} at Royal Vape Mart`, url }).catch(() => {})}>Share…</button>}
        <a href={`sms:?&body=${text}`}>Text it</a>
        <a href={`mailto:?subject=${encodeURIComponent(p.name)}&body=${text}`}>Email it</a>
      </div>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const reserve = useReserve();
  const [shareOpen, setShareOpen] = useState(false);
  const p = getProduct(idFromSlug(slug));
  const [recent] = useState(readRecent);
  const [opt, setOpt] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (p) pushRecent(p.id); setOpt(''); setQty(1); setAdded(false); setTried(false); }, [p]);
  usePageMeta(p?.name, p ? `${p.name}${p.price != null ? ` for ${money(p.price)}` : ''} at Royal Vape Mart in Pensacola, FL. ${p.type}. Reserve online and pick up in store. 21+ only. Call ${STORE.phone}.` : '');
  if (!p) return <Shop />;
  const needsOpt = p.options.length > 0;
  let last = null;
  try { last = window.sessionStorage.getItem('royal_last_collection'); } catch (e) { /* storage unavailable */ }
  const backTo = last && last.startsWith(`/shop/${p.cat}`) ? last : `/shop/${p.cat}`;
  const viewed = recent.filter((id) => id !== p.id).map((id) => getProduct(id)).filter(Boolean).slice(0, 4);
  const dept = catOf(p.cat);
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.type === p.type && x.id !== p.id).slice(0, 4);
  const add = () => {
    if (needsOpt && !opt) { setTried(true); return; }
    reserve.add(p.id, opt, qty); setAdded(true);
  };
  return (
    <>
      <section className="pp-bar">
        <div className="container"><BackLink to={backTo} label={dept?.name.toLowerCase()} /></div>
      </section>
      <section className="section tight">
        <div className="container pp">
          <div className="pp-img">
            {isBest(p) ? <span className="badge">Best seller</span> : p.isNew && <span className="badge">New</span>}
            <img src={imgUrl(p.img)} alt={p.name} />
          </div>
          <div className="pp-info">
            <p className="crumb dark"><Link to="/shop">Shop</Link> / <Link to={`/shop/${p.cat}`}>{dept?.name}</Link> / {p.type}</p>
            <h1 className="pp-title">{p.name}</h1>
            {p.price != null ? <div className="pm-price"><Price p={p} /></div> : <p className="price-line">Price on request</p>}
            {p.desc && <p className="pp-desc">{p.desc}</p>}
            {needsOpt && (
              <div className="opt">
                <label htmlFor="opt">{p.optLabel || 'Option'}</label>
                <select id="opt" value={opt} onChange={(e) => { setOpt(e.target.value); setAdded(false); }}>
                  <option value="">Choose a {(p.optLabel || 'option').toLowerCase()}</option>
                  {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
            <div className="qty-row">
              <div className="qty" role="group" aria-label="Quantity">
                <button type="button" aria-label="Fewer" onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size={16} /></button>
                <output aria-live="polite">{qty}</output>
                <button type="button" aria-label="More" onClick={() => setQty(Math.min(20, qty + 1))}><Icon name="plus" size={16} /></button>
              </div>
              <button type="button" className="btn btn-primary" onClick={add} aria-disabled={needsOpt && !opt}>{added ? 'Added to reserve list' : 'Add to reserve list'}</button>
            </div>
            {needsOpt && !opt && <p className={'small pp-hint' + (tried ? ' form-err' : ' muted')} role={tried ? 'alert' : undefined}>Pick a {(p.optLabel || 'option').toLowerCase()} first.</p>}
            {added && <p className="pp-added" role="status"><Icon name="check" size={16} /> Added. <Link to="/reserve">View reserve list ({reserve.count})</Link></p>}
            <p className="muted pp-note">Reserve online, pay at the counter. 21+ with valid photo ID.</p>
            <div className="pp-actions">
              <CallLink className="btn btn-ghost btn-block"><Icon name="phone" /> Call {STORE.phone}</CallLink>
            </div>
            <div className="pp-tools" role="group" aria-label="More options">
              <button type="button" className={shareOpen ? 'on' : ''} aria-expanded={shareOpen} onClick={() => setShareOpen(!shareOpen)}><Icon name="arrow" size={16} /> Share</button>
            </div>
            {shareOpen && <ShareBox p={p} />}
            <p className="small muted pp-fine">Photos show the product line and may vary from what is on the shelf. Nicotine is addictive. <a href={MAPS_URL} target="_blank" rel="noreferrer">Get directions</a></p>
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
            <div className="section-head"><h2>More {p.type.toLowerCase()}</h2><Link className="link" to={`/shop/${p.cat}`}>View all <Icon name="arrow" size={16} /></Link></div>
            <div className="prod-grid">{related.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}

export function Reserve() {
  usePageMeta('Reserve list', 'Reserve products at Royal Vape Mart in Pensacola for pickup. No online payment: pay at the counter. 21+ with valid photo ID.');
  const reserve = useReserve();
  const [f, setF] = useState({ name: '', phone: '', email: '', age: false, _gotcha: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const lines = reserve.lines;
  const total = lineTotal(lines);
  const text = (ls) => ls.map((l) => { const p = getProduct(l.id); return `- ${l.qty} x ${p.name}${l.opt ? ` (${l.opt})` : ''}${p.price != null ? `, ${money(p.price)} each` : ''}`; }).join('\n');

  const submit = async (e) => {
    e.preventDefault();
    if (f._gotcha) return;
    if (!f.name.trim()) { setErr('Please add your name so we know whose order it is.'); return; }
    if (f.phone.replace(/\D/g, '').length < 10) { setErr('Please add a phone number we can reach you at.'); return; }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('That email address does not look right. Please check it.'); return; }
    if (!f.age) { setErr('Please confirm that you are 21 or older.'); return; }
    setErr(''); setState('sending');
    const body = `Pickup reservation\n\n${text(lines)}\n\nEstimated total: ${money(total)}\n\nName: ${f.name}\nPhone: ${f.phone}\nEmail: ${f.email}\nConfirmed 21 or older: yes`;
    try {
      await submitForm('Pickup reservation', { name: f.name, phone: f.phone, email: f.email, message: body, age_confirmed: 'Confirmed 21 or older', _replyto: f.email }, body);
      setDone({ name: f.name.split(' ')[0] }); setState('sent'); reserve.clear();
    } catch (x) { setState('error'); }
  };

  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/shop" label="shop" />
          <p className="eyebrow">Pay and pick up in store</p>
          <h1 className="h1-sm">Reserve list</h1>
          <p className="lead">Reserve with just your name and phone number. No online payment: we set your order aside and you pay at the counter when you pick it up.</p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          {state === 'sent' ? (
            <div className="sent" role="status">
              <h2>Reservation sent</h2>
              <p>Thanks, {done?.name || 'friend'}. We will set your order aside; most are ready within the hour during business hours, and we hold it until close today. Bring a valid photo ID. Questions? Call <b>{STORE.phone}</b>.</p>
              {typeof window !== 'undefined' && window.__PREVIEW && <p className="sample-note">Preview only: nothing was actually sent. The live site delivers this to the store.</p>}
              <div className="btn-row"><Link className="btn btn-ghost" to="/shop">Keep browsing</Link></div>
            </div>
          ) : lines.length ? (
            <div className="split reserve">
              <div>
                <ul className="lines">
                  {lines.map((l) => {
                    const p = getProduct(l.id);
                    return (
                      <li key={l.id + '|' + l.opt}>
                        <Link to={productPath(p)} className="line-img" aria-hidden="true" tabIndex={-1}><img src={imgUrl(p.img)} alt="" width="80" height="80" /></Link>
                        <div className="line-main">
                          <Link to={productPath(p)}><b>{p.name}</b></Link>
                          {l.opt && <small>{p.optLabel ? `${p.optLabel}: ` : ''}{l.opt}</small>}
                          <small>{p.price != null ? `${money(p.price)} each` : 'Ask for price'}</small>
                        </div>
                        <div className="qty" role="group" aria-label={`Quantity of ${p.name}`}>
                          <button type="button" aria-label="Fewer" onClick={() => reserve.setQty(l.id, l.opt, l.qty - 1)}><Icon name="minus" size={16} /></button>
                          <output>{l.qty}</output>
                          <button type="button" aria-label="More" onClick={() => reserve.setQty(l.id, l.opt, l.qty + 1)}><Icon name="plus" size={16} /></button>
                        </div>
                        <button type="button" className="line-del" aria-label={`Remove ${p.name}`} onClick={() => reserve.remove(l.id, l.opt)}><Icon name="trash" size={18} /></button>
                      </li>
                    );
                  })}
                </ul>
                <p className="line-total"><span>Estimated total</span><b>{money(total)}</b></p>
                <p className="small muted">Pay at the counter. Prices and tax are confirmed at pickup.</p>
              </div>
              <form className="form" onSubmit={submit} noValidate>
                <h2 className="h3">Your details</h2>
                <label htmlFor="r-name">Name<input id="r-name" required autoComplete="name" value={f.name} onChange={set('name')} /></label>
                <label htmlFor="r-phone">Phone<input id="r-phone" type="tel" required autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
                <label htmlFor="r-email">Email (optional)<input id="r-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
                <div className="trap" aria-hidden="true"><label htmlFor="r-web">Leave this empty<input id="r-web" tabIndex="-1" autoComplete="off" value={f._gotcha} onChange={set('_gotcha')} /></label></div>
                <label className="check" htmlFor="r-age"><input id="r-age" type="checkbox" checked={f.age} onChange={set('age')} /><span>I am 21 or older and will bring a valid government-issued photo ID to pick up.</span></label>
                {err && <p className="form-err" role="alert">{err}</p>}
                {state === 'error' && <p className="form-err" role="alert">That did not go through. Please try again, or call {STORE.phone}.</p>}
                <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Reserve for pickup'}</button>
                <button type="button" className="btn btn-ghost" onClick={reserve.clear}>Clear list</button>
              </form>
            </div>
          ) : (
            <div className="empty">
              <h2 className="h3">Your reserve list is empty</h2>
              <p className="muted">Add items as you browse, then reserve them here. You pay in store.</p>
              <Link className="btn btn-primary" to="/shop">Shop now</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function Request() {
  usePageMeta('Request a product', 'Tell Royal Vape Mart in Pensacola what to carry: a brand, flavor or product you cannot find, and we will look into stocking it.');
  const [params] = useSearchParams();
  const [f, setF] = useState({ product: params.get('q') || '', brand: '', category: '', details: '', website: '', name: '', email: '', phone: '', notify: true, _gotcha: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f._gotcha) return;
    if (!f.product.trim()) { setErr('Please tell us the product name.'); return; }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('That email address does not look right. Please check it.'); return; }
    if (f.notify && !f.email.trim() && !f.phone.trim()) { setErr('Add an email or phone number if you want to hear back.'); return; }
    setErr(''); setState('sending');
    const body = `Product request\n\nProduct: ${f.product}\nBrand: ${f.brand}\nCategory: ${f.category}\nFlavor / details: ${f.details}\nWebsite: ${f.website}\n\nName: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone}\nNotify me when it is in stock: ${f.notify ? 'yes' : 'no'}`;
    try { const r = await submitForm('Product request', { ...f, _gotcha: undefined, message: body, _replyto: f.email }, body); setState(r === 'mailto' ? 'idle' : 'sent'); } catch (x) { setState('error'); }
  };
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/shop" label="shop" /><p className="eyebrow">Request a product</p><h1 className="h1-sm">What should we carry?</h1><p className="lead">Can't find your brand or flavor? Tell us and we'll look into stocking it.</p></div>
      </section>
      <section className="section tight">
        <div className="container narrow">
          {state === 'sent' ? (
            <div className="sent" role="status">
              <h2>Request sent</h2>
              <p>Thanks. We will look into it{f.notify ? ' and let you know when it is in stock' : ''}.</p>
              {typeof window !== 'undefined' && window.__PREVIEW && <p className="sample-note">Preview only: nothing was actually sent.</p>}
              <div className="btn-row"><Link className="btn btn-ghost" to="/shop">Keep browsing</Link></div>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              <label htmlFor="q-product">Product name *<input id="q-product" required value={f.product} onChange={set('product')} /></label>
              <label htmlFor="q-brand">Brand<input id="q-brand" value={f.brand} onChange={set('brand')} /></label>
              <label htmlFor="q-cat">Category
                <select id="q-cat" value={f.category} onChange={set('category')}>
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="Other">Other</option>
                </select>
              </label>
              <label htmlFor="q-details">Flavor / details<textarea id="q-details" rows="3" value={f.details} onChange={set('details')} /></label>
              <label htmlFor="q-web">Website<input id="q-web" type="url" placeholder="https://" value={f.website} onChange={set('website')} /></label>
              <label htmlFor="q-name">Name<input id="q-name" autoComplete="name" value={f.name} onChange={set('name')} /></label>
              <label htmlFor="q-email">Email<input id="q-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
              <label htmlFor="q-phone">Phone<input id="q-phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
              <div className="trap" aria-hidden="true"><label htmlFor="q-gotcha">Leave this empty<input id="q-gotcha" tabIndex="-1" autoComplete="off" value={f._gotcha} onChange={set('_gotcha')} /></label></div>
              <label className="check" htmlFor="q-notify"><input id="q-notify" type="checkbox" checked={f.notify} onChange={set('notify')} /><span>Notify me when it is in stock.</span></label>
              {err && <p className="form-err" role="alert">{err}</p>}
              {state === 'error' && <p className="form-err" role="alert">That did not go through. Please try again, or call {STORE.phone}.</p>}
              <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send request'}</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function Socials() {
  usePageMeta('Find us online', 'Reserve online, read our reviews, get directions, or call Royal Vape Mart in Pensacola, FL.');
  const boxes = [
    { k: 'Reserve', t: 'Shop and reserve', s: `${PRODUCTS.length.toLocaleString('en-US')} items. Pay and pick up in store`, to: '/shop' },
    { k: 'Google', t: 'Read our reviews', s: 'What customers say', to: '/reviews' },
    { k: 'Directions', t: STORE.street, s: 'Open in Maps', href: MAPS_URL, ext: true },
    { k: 'Call', t: STORE.phone, s: 'A real person answers', call: true },
    { k: 'Hours', t: 'Open 6AM to 1AM', s: 'Tap for store hours', sheet: 'hours' },
    { k: 'Request', t: 'What should we carry?', s: 'Ask us to stock a brand or flavor', to: '/request' },
    { k: 'Same owner', t: 'Our other stores', s: 'Royal Appliance Outlet and our car auction', to: '/other-stores' },
    { k: 'Answers', t: 'FAQ', s: 'Pickup, hours, ID and pricing', to: '/faq' },
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
          <p className="lead">Reserve, read what customers say, or reach the store directly.</p>
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
  usePageMeta('Our other stores', 'Royal Vape Mart is part of a family of local Pensacola businesses, including Royal Appliance Outlet (furniture and appliances) and a car auction business.');
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Same owner</p>
          <h1 className="h1-sm">Our other stores</h1>
          <p className="lead">Royal Vape Mart is part of a family of local businesses. Here is where else to find us.</p>
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

export function Faq() {
  usePageMeta('FAQ', 'Answers about 21+ ID, pickup reservations, shipping, price matching and hours at Royal Vape Mart in Pensacola, FL.');
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Quick answers</p><h1 className="h1-sm">Frequently asked questions</h1><p className="lead">The short version of how the shop works. Anything else, call {STORE.phone}. A real person answers.</p></div>
      </section>
      <section className="section">
        <div className="container narrow">
          {FAQS.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}
          <div className="btn-row" style={{ marginTop: '1.5rem' }}><Link className="btn btn-primary" to="/shop">Shop now</Link></div>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  usePageMeta('Contact', `Contact Royal Vape Mart in Pensacola, FL. Call ${STORE.phone}, visit ${STORE.address}, or send us a message.`);
  const [f, setF] = useState({ name: '', phone: '', email: '', msg: '', _gotcha: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f._gotcha) return;
    if (!f.phone.trim() && !f.email.trim()) { setErr('Please add a phone number or an email so we can reach you.'); return; }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('That email address does not look right. Please check it.'); return; }
    setErr(''); setState('sending');
    const body = `${f.msg}\n\nName: ${f.name}\nPhone: ${f.phone}\nEmail: ${f.email}`;
    try { const r = await submitForm('Website inquiry', { name: f.name, phone: f.phone, email: f.email, message: f.msg, _replyto: f.email }, body); setState(r === 'mailto' ? 'idle' : 'sent'); } catch (x) { setState('error'); }
  };
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Contact</p><h1 className="h1-sm">Talk to the team</h1><p className="lead">The fastest way to check stock is a quick call. We are open 6AM to 1AM, every day.</p></div>
      </section>
      <section className="section">
        <div className="container split">
          {state === 'sent' ? (
            <div className="sent" role="status">
              <h2>Message sent</h2>
              <p>Thanks, {f.name.split(' ')[0] || 'friend'}. We will get back to you soon. For a faster answer, call <b>{STORE.phone}</b>.</p>
              {typeof window !== 'undefined' && window.__PREVIEW && <p className="sample-note">Preview only: nothing was actually sent.</p>}
              <div className="btn-row"><Link className="btn btn-ghost" to="/shop">Keep browsing</Link></div>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              <label htmlFor="c-name">Name<input id="c-name" required autoComplete="name" value={f.name} onChange={set('name')} /></label>
              <label htmlFor="c-phone">Phone<input id="c-phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
              <label htmlFor="c-email">Email<input id="c-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
              <label htmlFor="c-msg">How can we help?<textarea id="c-msg" required rows="5" value={f.msg} onChange={set('msg')} /></label>
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
              <dt>Hours</dt><dd><Hours /></dd>
            </dl>
            <CallButtons />
            <p><a className="link" href={VCARD_HREF} download="Royal-Vape-Mart.vcf">Save our contact to your phone</a></p>
          </div>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  usePageMeta('Page not found', `That page could not be found. Shop Royal Vape Mart or call ${STORE.phone}.`);
  return (
    <>
      <section className="page-head">
        <div className="container"><p className="eyebrow">Page not found</p><h1 className="h1-sm">We could not find that page</h1><p className="lead">The link may be old or mistyped. Try the shop, or call and we will help.</p></div>
      </section>
      <section className="section tight"><div className="container"><div className="btn-row"><Link className="btn btn-primary" to="/shop">Shop now</Link><Link className="btn btn-ghost" to="/">Go home</Link></div><CallButtons /></div></section>
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
