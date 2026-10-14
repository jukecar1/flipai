import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { STORE, CATEGORIES, STORE_PHOTO, imgUrl, FINANCING, FAQS, MAPS_URL, REVIEWS_URL, openStatus } from './data';
import { PRODUCTS, money, HAS_POPULAR, popularRank, tier, isBest, BEST_SELLERS, productPath, shareUrl } from './products';
import { CallButtons, CallLink, BackLink, Icon, Stars, openSheet } from './ui';
import reviews from './reviews.json';

const COUNTS = {};
PRODUCTS.forEach((p) => { COUNTS[p.cat] = (COUNTS[p.cat] || 0) + 1; });

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function FinCards() {
  return (
    <div className="fin-grid">
      {FINANCING.map((f) => (
        <div className="fin-card" key={f.name}>
          <div className={'fin-logo' + (f.logo ? '' : ' pending')}>
            {f.logo ? <img src={f.logo} alt={f.name} /> : <span><b>{f.name}</b><small>logo to add</small></span>}
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

function Hours() {
  return STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>);
}

function Price({ p }) {
  return p.price != null ? <span className="price">{money(p.price)}</span> : <span className="price call">Call for price</span>;
}

function ProductCard({ p }) {
  return (
    <Link to={productPath(p)} className="prod" aria-label={`View ${p.name}`}>
      <span className="prod-img">{isBest(p) && <span className="badge">Best seller</span>}<img src={imgUrl(p.img)} alt="" loading="lazy" decoding="async" /></span>
      <span className="prod-name">{p.name}</span>
      <Price p={p} />
    </Link>
  );
}

function Mosaic() {
  const big = new Set(['appliances', 'living']);
  return (
    <div className="mosaic">
      {CATEGORIES.map((c) => (
        <Link key={c.id} to={`/showroom/${c.id}`} className={'tile' + (big.has(c.id) ? ' big' : '') + (c.cutout ? ' cut' : '')}>
          <img src={imgUrl(c.img, 800)} alt="" loading="lazy" />
          <span className="tile-label"><b>{c.name}</b><small>{COUNTS[c.id]} items</small></span>
        </Link>
      ))}
    </div>
  );
}

export function Home() {
  const status = openStatus();
  const featured = useMemo(() => {
    const seen = {};
    const out = [];
    BEST_SELLERS.forEach((x) => {
      seen[x.cat] = seen[x.cat] || 0;
      if (seen[x.cat] < 1) { seen[x.cat] += 1; out.push(x); }
    });
    return out;
  }, []);
  return (
    <>
      <section className="hero">
        <img className="hero-bg" src={STORE_PHOTO} alt="" />
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

      <div className="container">
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
      </div>

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
        </div>
      </section>
    </>
  );
}

export function Showroom() {
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
const SORTS = [...(HAS_POPULAR ? [['popular', 'Most popular']] : []), ['featured', 'Featured'], ['az', 'Name A to Z'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low']];

export function Collection() {
  const { cat } = useParams();
  const dept = CATEGORIES.find((c) => c.id === cat);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState(HAS_POPULAR ? 'popular' : 'featured');
  const [note, setNote] = useState(true);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => { setQ(''); setType(''); setSort(HAS_POPULAR ? 'popular' : 'featured'); setShown(PAGE); }, [cat]);

  const all = useMemo(() => PRODUCTS.filter((x) => x.cat === cat), [cat]);
  const types = useMemo(() => {
    const m = {};
    all.forEach((x) => { m[x.type] = (m[x.type] || 0) + 1; });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);
  const items = useMemo(() => {
    const list = all.filter((x) => (!type || x.type === type) && x.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (sort === 'featured') return list;
    if (sort === 'popular') return [...list].sort((a, b) => (popularRank(a) === popularRank(b) ? tier(a) - tier(b) : popularRank(a) - popularRank(b)));
    if (sort === 'az') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    const v = (x) => (x.price == null ? (sort === 'low' ? Infinity : -Infinity) : x.price);
    return [...list].sort((a, b) => (sort === 'low' ? v(a) - v(b) : v(b) - v(a)));
  }, [all, type, q, sort]);

  if (!dept) return <Showroom />;
  const reset = (fn) => (e) => { fn(e.target.value); setShown(PAGE); };
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
          {CATEGORIES.map((c) => <NavLink key={c.id} to={`/showroom/${c.id}`}>{c.name}</NavLink>)}
        </div>
      </div>
      <section className="section tight">
        <div className="container shop">
          <aside className="side" aria-label="Filters">
            <h4>Departments</h4>
            <ul className="side-list">
              {CATEGORIES.map((c) => (
                <li key={c.id}><NavLink to={`/showroom/${c.id}`}>{c.name}<small>{COUNTS[c.id]}</small></NavLink></li>
              ))}
            </ul>
            <h4>Product type</h4>
            <ul className="side-list">
              <li><button type="button" className={!type ? 'on' : ''} onClick={() => { setType(''); setShown(PAGE); }}>All<small>{all.length}</small></button></li>
              {types.map(([t, n]) => (
                <li key={t}><button type="button" className={type === t ? 'on' : ''} onClick={() => { setType(t); setShown(PAGE); }}>{t}<small>{n}</small></button></li>
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
              {SORTS.map(([v, l]) => (
                <button key={v} type="button" className={sort === v ? 'on' : ''} aria-pressed={sort === v} onClick={() => { setSort(v); setShown(PAGE); }}>{l}</button>
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
            ].map(([t, d]) => <div className="theme" key={t}><h3>{t}</h3><p>{d}</p></div>)}
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
        <a href={`sms:?&body=${text}`}>Text it</a>
        <a href={`mailto:?subject=${encodeURIComponent(p.name)}&body=${text}`}>Email it</a>
      </div>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const p = PRODUCTS[parseInt(slug, 10)];
  useEffect(() => {
    if (!p) return undefined;
    document.title = `${p.name} | Royal Appliance Outlet`;
    return () => { document.title = 'Royal Appliance Outlet'; };
  }, [p]);
  if (!p) return <Showroom />;
  const dept = CATEGORIES.find((c) => c.id === p.cat);
  const seen = new Set([p.name]);
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.type === p.type && !seen.has(x.name) && seen.add(x.name)).slice(0, 4);
  return (
    <>
      <section className="pp-bar">
        <div className="container"><BackLink to={`/showroom/${p.cat}`} label={dept?.name.toLowerCase()} /></div>
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
            <div className="pm-price"><Price p={p} /></div>
            <p className="muted">Visit the showroom or call to learn more about this item and current availability.</p>
            <div className="btn-row">
              <CallLink className="btn btn-primary"><Icon name="phone" /> Call {STORE.phone}</CallLink>
              <a className="btn btn-ghost" href={MAPS_URL} target="_blank" rel="noreferrer"><Icon name="nav" /> Get Directions</a>
            </div>
            <dl className="info pp-facts">
              <dt>Collection</dt><dd>{dept?.name}</dd>
              <dt>Type</dt><dd>{p.type}</dd>
              <dt>Stock</dt><dd>Call or visit to confirm what is on the floor today.</dd>
            </dl>
            <p className="small muted">Product photos are manufacturer-hosted catalog images for the model shown. Colors and configurations may vary.</p>
            <ShareBox p={p} />
          </div>
        </div>
      </section>
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
  const boxes = [
    { k: 'Facebook', t: 'Follow us', s: 'Store updates and what is new on the floor', href: STORE.facebook, ext: true },
    { k: 'Google', t: 'Read our reviews', s: `${STORE.rating} stars from ${STORE.reviews} reviews`, to: '/reviews' },
    { k: 'Directions', t: '1612 N Pace Blvd', s: 'Open in Maps', href: MAPS_URL, ext: true },
    { k: 'Call', t: STORE.phone, s: 'Expert help in store', call: true },
    { k: 'Email', t: 'Send us a message', s: STORE.email, to: '/contact' },
    { k: 'Hours', t: 'Open 7 days', s: 'Tap for store hours', sheet: 'hours' },
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

export function Financing() {
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
  const [f, setF] = useState({ name: '', phone: '', msg: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    const body = encodeURIComponent(`${f.msg}\n\nName: ${f.name}\nPhone: ${f.phone}`);
    window.location.href = `mailto:${STORE.email}?subject=${encodeURIComponent('Website inquiry')}&body=${body}`;
  };
  return (
    <>
      <section className="page-head">
        <div className="container"><BackLink to="/" label="home" /><p className="eyebrow">Contact</p><h1 className="h1-sm">Talk to the team</h1><p className="lead">The fastest way to check stock and pricing is a quick call.</p></div>
      </section>
      <section className="section">
        <div className="container split">
          <form className="form" onSubmit={submit}>
            <label htmlFor="c-name">Name<input id="c-name" required value={f.name} onChange={set('name')} /></label>
            <label htmlFor="c-phone">Phone<input id="c-phone" type="tel" value={f.phone} onChange={set('phone')} /></label>
            <label htmlFor="c-msg">What are you looking for?<textarea id="c-msg" required rows="4" value={f.msg} onChange={set('msg')} /></label>
            <button className="btn btn-primary" type="submit">Send message</button>
          </form>
          <div>
            <h3>Store details</h3>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Phone</dt><dd><CallLink>{STORE.phone}</CallLink></dd>
              <dt>Email</dt><dd><a href={`mailto:${STORE.email}`}>{STORE.email}</a></dd>
              <dt>Hours</dt><dd><Hours /></dd>
            </dl>
            <CallButtons />
          </div>
        </div>
      </section>
    </>
  );
}
