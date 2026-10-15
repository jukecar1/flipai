import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { STORE, CATEGORIES, imgUrl, FAQS, MAPS_URL, OTHER_STORES, openStatus, SAMPLE_CONTACT } from './data';
import { PRODUCTS, getProduct, idFromSlug, money, HAS_POPULAR, popularRank, isBest, BEST_SELLERS, BEST_SAMPLE, SAMPLE_INVENTORY, productPath, shareUrl } from './products';
import { CallButtons, CallLink, TextLink, BackLink, Icon, openSheet } from './ui';
import { readRecent, pushRecent } from './recent';
import { submitForm } from './forms';
import { usePageMeta } from './meta';
import { LEGAL } from './legal';

const COUNTS = {};
PRODUCTS.forEach((p) => { COUNTS[p.cat] = (COUNTS[p.cat] || 0) + 1; });
const DEPTS = CATEGORIES.filter((c) => COUNTS[c.id]);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const catOf = (id) => CATEGORIES.find((c) => c.id === id);

function Hours() {
  return STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>);
}

function SampleNote({ children }) {
  return <p className="sample-note">{children || 'Sample inventory to show the layout. Replace it with the real vehicles.'}</p>;
}

export function Price({ p }) {
  return p.price != null ? <span className="price">{money(p.price)}</span> : <span className="price call">Call for price</span>;
}

// "52,300 miles · Automatic · 4-cylinder · Silver" -> the first part is the mileage.
const specs = (p) => p.desc.split(' · ').filter(Boolean);

function VehicleCard({ p }) {
  const s = specs(p);
  return (
    <div className="prod">
      <Link to={productPath(p)} className="prod-link" aria-label={`View ${p.name}`}>
        <span className="prod-img">{isBest(p) ? <span className="badge">Featured</span> : p.isNew && <span className="badge">New arrival</span>}<img src={imgUrl(p.img)} alt="" loading="lazy" decoding="async" width="520" height="390" /></span>
        <span className="prod-name">{p.name}</span>
        <span className="prod-type">{s[0] || p.type}</span>
      </Link>
      <div className="prod-foot">
        <Price p={p} />
        <Link className="btn btn-primary btn-sm" to={productPath(p)} aria-label={`Details for ${p.name}`}>Details</Link>
      </div>
    </div>
  );
}

function Mosaic() {
  return (
    <div className="mosaic">
      {DEPTS.map((c, i) => (
        <Link key={c.id} to={`/inventory/${c.id}`} className={'tile cut' + (i === 0 ? ' big' : '')}>
          <img src={imgUrl(c.img)} alt="" loading="lazy" width="520" height="390" />
          <span className="tile-label"><b>{c.name}</b><small>{COUNTS[c.id]} {COUNTS[c.id] === 1 ? 'vehicle' : 'vehicles'}</small></span>
        </Link>
      ))}
    </div>
  );
}

export function Home() {
  usePageMeta('', "Sean's Car Business in Pensacola, FL: quality used cars, trucks and SUVs. Browse the inventory, schedule a test drive and visit us.");
  const status = openStatus();
  return (
    <>
      <section className="hero">
        <div className="container hero-copy">
          <p className="eyebrow">Pensacola, Florida</p>
          <h1>Find your next car, truck or SUV</h1>
          <p className="lead">Browse the inventory, pick a vehicle, and schedule a test drive. Call anytime during business hours and we will tell you exactly what is on the lot today.</p>
          <div className="btn-row">
            <Link className="btn btn-gold" to="/inventory">Browse inventory</Link>
            <CallLink className="btn btn-outline"><Icon name="phone" /> {STORE.phone}</CallLink>
          </div>
        </div>
        {BEST_SELLERS.length > 0 && (
          <div className="hero-best">
            <div className="container"><p className="eyebrow">Featured</p><h2>On the lot this week</h2>{BEST_SAMPLE && <p className="hero-note">Sample vehicles for the preview. The dealer sets the real ones in the sheet.</p>}</div>
            <div className="rail on-ink" role="list">{BEST_SELLERS.slice(0, 12).map((p) => <div role="listitem" key={p.id}><VehicleCard p={p} /></div>)}</div>
          </div>
        )}
      </section>

      <section className="container" aria-label="Dealership at a glance">
        <div className="glance">
          <button type="button" className="gcard" onClick={() => openSheet('hours')}>
            <span className="k">Today</span>
            <b className={status.open ? 'is-open' : 'is-closed'}><i aria-hidden="true" />{status.open ? 'Open now' : 'Closed'}</b>
            <small>{cap(status.text.split(' · ')[1])}</small>
            <small>Tap for hours</small>
          </button>
          <a className="gcard" href={MAPS_URL} target="_blank" rel="noreferrer">
            <span className="k">Visit</span><b>{STORE.street}</b><small>Get directions</small>
          </a>
          <CallLink className="gcard">
            <span className="k">Call</span><b>{STORE.phone}</b><small>Tap to call</small>
          </CallLink>
          <Link className="gcard" to="/test-drive">
            <span className="k">Test drive</span><b>Schedule a visit</b><small>Pick a vehicle and a time</small>
          </Link>
        </div>
        {SAMPLE_CONTACT && <SampleNote>The phone number and hours are placeholders until the dealer confirms them.</SampleNote>}
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><p className="eyebrow dark">Inventory</p><h2>Shop by body type</h2></div>
            <Link className="link" to="/inventory">All vehicles <Icon name="arrow" size={16} /></Link>
          </div>
          <Mosaic />
          {SAMPLE_INVENTORY && <SampleNote />}
        </div>
      </section>

      <section className="section sand">
        <div className="container split">
          <div>
            <p className="eyebrow dark">Why buy here</p>
            <h2>A straightforward way to buy a car</h2>
            <p>Look at the vehicles online, then come see them in person. Take a test drive, ask your questions, and take your time deciding.</p>
          </div>
          <div className="three stack">
            {[
              ['See it first', 'Every vehicle is listed with its mileage and key details so you know what to expect.'],
              ['Test drive it', 'Schedule a test drive online or by phone before you decide.'],
              ['Ask about your options', 'Talk to us about trade-ins and financing when you visit.'],
            ].map(([t, d]) => <div className="theme" key={t}><h3 className="h3">{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split visit">
          <div>
            <p className="eyebrow dark">Find us</p>
            <h2>Visit the lot</h2>
            <p>Stop by during business hours, or call ahead to make sure the vehicle you want is ready for you.</p>
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
    </>
  );
}

export function Inventory() {
  usePageMeta('Inventory', `Browse ${PRODUCTS.length} used cars, trucks and SUVs at Sean's Car Business in Pensacola, FL. Schedule a test drive.`);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const found = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return PRODUCTS.filter((p) => { const hay = `${p.name} ${p.type} ${catOf(p.cat)?.name} ${p.desc}`.toLowerCase(); return words.every((w) => hay.includes(w)); });
  }, [q]);
  const setQ = (v) => { const n = new URLSearchParams(params); if (v) n.set('q', v); else n.delete('q'); setParams(n, { replace: true }); };
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Inventory</p>
          <h1 className="h1-sm">Browse vehicles</h1>
          <p className="lead">Search by make, model or year, or pick a body type. Call to confirm a vehicle is still available.</p>
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="filters">
            <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search make, model or year" aria-label="Search all vehicles" />
          </div>
          {q.trim() ? (
            <>
              <p className="count muted">{found.length} {found.length === 1 ? 'result' : 'results'} for "{q.trim()}"</p>
              {found.length ? <div className="prod-grid">{found.map((x) => <VehicleCard key={x.id} p={x} />)}</div> : (
                <div className="empty"><h3>No matches</h3><p className="muted">Tell us what you are looking for and we will keep an eye out.</p><Link className="btn btn-primary" to="/test-drive">Tell us what you want</Link></div>
              )}
            </>
          ) : <><Mosaic />{SAMPLE_INVENTORY && <SampleNote />}</>}
        </div>
      </section>
    </>
  );
}

function MapCard() {
  const [live, setLive] = useState(false);
  const preview = typeof window !== 'undefined' && window.__PREVIEW;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(STORE.address)}&z=15&output=embed`;
  return (
    <div className="mapcard">
      {live ? (
        <iframe title="Map to Sean's Car Business" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
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


function ShareBox({ p }) {
  const url = shareUrl(p);
  const [done, setDone] = useState(false);
  const copy = async (e) => {
    const field = e.currentTarget.closest('.share').querySelector('input');
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch (err) { field.select(); }
  };
  const text = encodeURIComponent(`${p.name} at Sean's Car Business: ${url}`);
  return (
    <div className="share">
      <label htmlFor="share-url">Share this item</label>
      <div className="share-row">
        <input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary btn-sm" onClick={copy}>{done ? 'Link copied' : 'Copy link'}</button>
      </div>
      <div className="share-alt">
        {typeof navigator !== 'undefined' && navigator.share && <button type="button" className="inline" onClick={() => navigator.share({ title: p.name, text: `${p.name} at Sean's Car Business`, url }).catch(() => {})}>Share…</button>}
        <a href={`sms:?&body=${text}`}>Text it</a>
        <a href={`mailto:?subject=${encodeURIComponent(p.name)}&body=${text}`}>Email it</a>
      </div>
    </div>
  );
}

const PAGE = 24;
const SORTS = [['popular', 'Featured'], ['az', 'Name A to Z'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low']];

export function Collection() {
  const { cat } = useParams();
  const dept = DEPTS.find((c) => c.id === cat);
  usePageMeta(dept?.name, dept ? `${dept.name} at Sean's Car Business in Pensacola, FL: ${COUNTS[dept.id]} vehicles. ${dept.blurb} Call ${STORE.phone} to confirm availability.` : '');
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
    if (sort === 'low') return [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0) || byName(a, b));
    if (sort === 'high') return [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0) || byName(a, b));
    return [...list].sort((a, b) => popularRank(a) - popularRank(b) || byName(a, b));
  }, [all, type, q, sort]);

  if (!dept) return <Inventory />;
  const reset = (fn) => (e) => fn(e.target.value);
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/inventory" label="inventory" />
          <p className="crumb"><Link to="/inventory">Inventory</Link> / {dept.name}</p>
          <h1 className="h1-sm caps">{dept.name}</h1>
          <p className="lead">{dept.blurb}</p>
        </div>
      </section>
      <div className="dept-bar">
        <div className="container pills" role="navigation" aria-label="Departments">
          {DEPTS.map((c) => <NavLink key={c.id} to={`/inventory/${c.id}`}>{c.name}</NavLink>)}
        </div>
      </div>
      <section className="section tight">
        <div className="container shop">
          <aside className="side" aria-label="Filters">
            <h2>Departments</h2>
            <ul className="side-list">
              {DEPTS.map((c) => (
                <li key={c.id}><NavLink to={`/inventory/${c.id}`}>{c.name}<small>{COUNTS[c.id]}</small></NavLink></li>
              ))}
            </ul>
            {types.length > 1 && (
              <>
                <h2>Make</h2>
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
              <input id="search" type="search" value={q} onChange={reset(setQ)} placeholder="Search this body type" aria-label="Search this body type" />
              {types.length > 1 && (
                <select id="ptype" className="mobile-only" value={type} onChange={reset(setType)} aria-label="Make">
                  <option value="">All makes</option>
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
            <p className="count muted">{items.length} {items.length === 1 ? 'vehicle' : 'vehicles'}</p>
            {items.length ? (
              <>
                <div className="prod-grid">
                  {items.slice(0, shown).map((x) => <VehicleCard key={x.id} p={x} />)}
                </div>
                {items.length > shown && (
                  <div className="more"><button type="button" className="btn btn-ghost" onClick={() => setShown(shown + PAGE)}>Load more ({items.length - shown} left)</button></div>
                )}
              </>
            ) : (
              <div className="empty">
                <h3>No matches</h3>
                <p className="muted">Try a different search, or tell us what you are looking for and we will keep an eye out.</p>
                <Link className="btn btn-primary" to="/test-drive">Tell us what you want</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const [shareOpen, setShareOpen] = useState(false);
  const p = getProduct(idFromSlug(slug));
  const [recent] = useState(readRecent);
  useEffect(() => { if (p) pushRecent(p.id); }, [p]);
  usePageMeta(p?.name, p ? `${p.name}${p.price != null ? ` for ${money(p.price)}` : ''} at Sean's Car Business in Pensacola, FL. ${p.desc} Schedule a test drive.` : '');
  if (!p) return <Inventory />;
  let last = null;
  try { last = window.sessionStorage.getItem('royal_last_collection'); } catch (e) { /* storage unavailable */ }
  const backTo = last && last.startsWith(`/inventory/${p.cat}`) ? last : `/inventory/${p.cat}`;
  const viewed = recent.filter((id) => id !== p.id).map((id) => getProduct(id)).filter(Boolean).slice(0, 4);
  const dept = catOf(p.cat);
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  return (
    <>
      <section className="pp-bar">
        <div className="container"><BackLink to={backTo} label={dept?.name.toLowerCase()} /></div>
      </section>
      <section className="section tight">
        <div className="container pp">
          <div className="pp-img">
            {isBest(p) ? <span className="badge">Featured</span> : p.isNew && <span className="badge">New arrival</span>}
            <img src={imgUrl(p.img)} alt={p.name} />
          </div>
          <div className="pp-info">
            <p className="crumb dark"><Link to="/inventory">Inventory</Link> / <Link to={`/inventory/${p.cat}`}>{dept?.name}</Link> / {p.type}</p>
            <h1 className="pp-title">{p.name}</h1>
            {p.price != null ? <div className="pm-price"><Price p={p} /></div> : <p className="price-line">Call for price</p>}
            <ul className="specs">{specs(p).map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="pp-actions">
              <Link className="btn btn-primary btn-block" to={`/test-drive?car=${encodeURIComponent(p.name)}`}>Schedule a test drive</Link>
              <CallLink className="btn btn-ghost btn-block"><Icon name="phone" /> Call {STORE.phone}</CallLink>
              <TextLink className="btn btn-ghost btn-block" body={`Hi! Is the ${p.name} still available? ${shareUrl(p)}`}><Icon name="chat" /> Ask if it is available</TextLink>
            </div>
            <div className="pp-tools" role="group" aria-label="More options">
              <button type="button" className={shareOpen ? 'on' : ''} aria-expanded={shareOpen} onClick={() => setShareOpen(!shareOpen)}><Icon name="arrow" size={16} /> Share</button>
            </div>
            {shareOpen && <ShareBox p={p} />}
            {SAMPLE_INVENTORY && <SampleNote>Sample vehicle for the preview. Photos, price and details are placeholders.</SampleNote>}
          </div>
        </div>
      </section>
      {viewed.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head"><h2>Recently viewed</h2></div>
            <div className="prod-grid">{viewed.map((x) => <VehicleCard key={x.id} p={x} />)}</div>
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="section sand">
          <div className="container">
            <div className="section-head"><h2>More {dept?.name.toLowerCase()}</h2><Link className="link" to={`/inventory/${p.cat}`}>View all <Icon name="arrow" size={16} /></Link></div>
            <div className="prod-grid">{related.map((x) => <VehicleCard key={x.id} p={x} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}

export function TestDrive() {
  usePageMeta('Schedule a test drive', "Schedule a test drive at Sean's Car Business in Pensacola, FL. Pick a vehicle and a time, and we will confirm.");
  const [params] = useSearchParams();
  const [f, setF] = useState({ name: '', phone: '', email: '', car: params.get('car') || '', when: '', msg: '', _gotcha: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f._gotcha) return;
    if (!f.name.trim()) { setErr('Please add your name.'); return; }
    if (f.phone.replace(/\D/g, '').length < 10 && !f.email.trim()) { setErr('Please add a phone number or an email so we can confirm.'); return; }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('That email address does not look right. Please check it.'); return; }
    setErr(''); setState('sending');
    const body = `Test drive request\n\nVehicle: ${f.car}\nPreferred day and time: ${f.when}\n\n${f.msg}\n\nName: ${f.name}\nPhone: ${f.phone}\nEmail: ${f.email}`;
    try { const r = await submitForm('Test drive request', { name: f.name, phone: f.phone, email: f.email, vehicle: f.car, preferred_time: f.when, message: body, _replyto: f.email }, body); setState(r === 'mailto' ? 'idle' : 'sent'); } catch (x) { setState('error'); }
  };
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/inventory" label="inventory" /><p className="eyebrow">Test drive</p><h1 className="h1-sm">Schedule a test drive</h1><p className="lead">Tell us which vehicle and when you would like to come in. We will call or message to confirm. Bring your driver license.</p></div>
      </section>
      <section className="section tight">
        <div className="container narrow">
          {state === 'sent' ? (
            <div className="sent" role="status">
              <h2>Request sent</h2>
              <p>Thanks, {f.name.split(' ')[0] || 'friend'}. We will confirm your test drive soon. To check right away, call <b>{STORE.phone}</b>.</p>
              {typeof window !== 'undefined' && window.__PREVIEW && <p className="sample-note">Preview only: nothing was actually sent.</p>}
              <div className="btn-row"><Link className="btn btn-ghost" to="/inventory">Keep browsing</Link></div>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              <label htmlFor="t-car">Vehicle<input id="t-car" placeholder="Year, make and model" value={f.car} onChange={set('car')} /></label>
              <label htmlFor="t-when">Preferred day and time<input id="t-when" placeholder="For example, Saturday morning" value={f.when} onChange={set('when')} /></label>
              <label htmlFor="t-name">Name<input id="t-name" required autoComplete="name" value={f.name} onChange={set('name')} /></label>
              <label htmlFor="t-phone">Phone<input id="t-phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
              <label htmlFor="t-email">Email<input id="t-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
              <label htmlFor="t-msg">Anything else?<textarea id="t-msg" rows="3" value={f.msg} onChange={set('msg')} /></label>
              <div className="trap" aria-hidden="true"><label htmlFor="t-web">Leave this empty<input id="t-web" tabIndex="-1" autoComplete="off" value={f._gotcha} onChange={set('_gotcha')} /></label></div>
              {err && <p className="form-err" role="alert">{err}</p>}
              {state === 'error' && <p className="form-err" role="alert">That did not go through. Please try again, or call {STORE.phone}.</p>}
              <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Request test drive'}</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function OtherStores() {
  usePageMeta('Our other stores', "Sean's Car Business is part of a family of local Pensacola businesses, including Royal Appliance Outlet and Royal Vape Mart.");
  return (
    <>
      <section className="page-head">
        <div className="container">
          <BackLink to="/" label="home" />
          <p className="eyebrow">Same owner</p>
          <h1 className="h1-sm">Our other stores</h1>
          <p className="lead">Sean's Car Business is part of a family of local businesses. Here is where else to find us.</p>
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
  usePageMeta('FAQ', "Answers about test drives, availability, trade-ins, financing and hours at Sean's Car Business in Pensacola, FL.");
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Quick answers</p><h1 className="h1-sm">Frequently asked questions</h1><p className="lead">Anything else, call {STORE.phone}.</p></div>
      </section>
      <section className="section">
        <div className="container narrow">
          {FAQS.map(([q, a]) => <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}
          <div className="btn-row" style={{ marginTop: '1.5rem' }}><Link className="btn btn-primary" to="/inventory">Browse inventory</Link></div>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  usePageMeta('Contact', `Contact Sean's Car Business in Pensacola, FL. Call ${STORE.phone} or send us a message.`);
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
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Contact</p><h1 className="h1-sm">Talk to the team</h1><p className="lead">The fastest way to check on a vehicle is a quick call.</p></div>
      </section>
      <section className="section">
        <div className="container split">
          {state === 'sent' ? (
            <div className="sent" role="status">
              <h2>Message sent</h2>
              <p>Thanks, {f.name.split(' ')[0] || 'friend'}. We will get back to you soon. For a faster answer, call <b>{STORE.phone}</b>.</p>
              {typeof window !== 'undefined' && window.__PREVIEW && <p className="sample-note">Preview only: nothing was actually sent.</p>}
              <div className="btn-row"><Link className="btn btn-ghost" to="/inventory">Keep browsing</Link></div>
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
            <h2 className="h3">Dealership details</h2>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Phone</dt><dd><CallLink>{STORE.phone}</CallLink></dd>
              <dt>Hours</dt><dd><Hours /></dd>
            </dl>
            <CallButtons />
          </div>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  usePageMeta('Page not found', `That page could not be found. Browse Sean's Car Business inventory or call ${STORE.phone}.`);
  return (
    <>
      <section className="page-head">
        <div className="container"><p className="eyebrow">Page not found</p><h1 className="h1-sm">We could not find that page</h1><p className="lead">The link may be old or mistyped. Try the inventory, or call and we will help.</p></div>
      </section>
      <section className="section tight"><div className="container"><div className="btn-row"><Link className="btn btn-primary" to="/inventory">Browse inventory</Link><Link className="btn btn-ghost" to="/">Go home</Link></div><CallButtons /></div></section>
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
