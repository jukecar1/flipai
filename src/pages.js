import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STORE, CATEGORIES, PRODUCTS, FINANCING, FAQS, openStatus } from './data';
import { CallButtons, Icon, Stars } from './ui';
import { Art } from './art';

const MARQUEE = ['Floor changes weekly', 'Call for today\'s stock', 'Furniture + appliances', 'Financing & lease-to-own', 'Expert help in store', 'N Pace Blvd, Pensacola'];

function Marquee() {
  const row = MARQUEE.concat(MARQUEE);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{row.map((t, i) => <span key={i}>{t}</span>)}</div>
    </div>
  );
}

function Visit() {
  return (
    <section className="section">
      <div className="container visit">
        <div>
          <p className="eyebrow">Showroom</p>
          <h2>Come see it in person</h2>
          <dl className="info">
            <dt>Address</dt><dd>{STORE.address}</dd>
            <dt>Hours</dt>
            <dd>
              {STORE.hours.map(([d, h]) => <div key={d}>{d} <b>{h}</b></div>)}
              <small className="muted">Hours may vary on holidays. Call ahead to confirm.</small>
            </dd>
            <dt>Phone</dt><dd><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></dd>
          </dl>
          <CallButtons />
        </div>
        <div className="hangtag">
          <span className="mono">Expert help in store</span>
          <p>
            Royal Appliance Outlet is a locally run outlet on N Pace Blvd. Walk the floor, compare sizes and features, and our team will tell you exactly what is in stock today.
          </p>
          <p className="muted">Call or visit to confirm today's selection, current pricing and purchase options.</p>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  const status = openStatus();
  const featured = PRODUCTS.filter((p) => ['p1', 'p4', 'p6', 'p10', 'p16', 'p17'].includes(p.id));
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className={'status ' + (status.open ? 'is-open' : 'is-closed')}><i />{status.text}</span>
            <h1>Furniture <em>&amp;</em> appliances for real homes.</h1>
            <p className="lead">
              Every room, one showroom. Browse the collections here, then walk the floor on N Pace Blvd for today's stock, pricing and straight answers.
            </p>
            <div className="btn-row">
              <Link className="btn btn-primary" to="/showroom">Explore the showroom <Icon name="arrow" /></Link>
              <a className="btn btn-outline" href={`tel:${STORE.tel}`}><Icon name="phone" /> {STORE.phone}</a>
            </div>
            <div className="trust">
              <span className="trust-score"><b>{STORE.rating}</b><Stars /></span>
              <span>{STORE.reviews} Google reviews<br />Pensacola, FL</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <Art cat="living" className="a1" /><Art cat="appliances" className="a2" /><Art cat="bedroom" className="a3" />
            <div className="tag-chip mono">Floor changes weekly</div>
          </div>
        </div>
      </section>
      <Marquee />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Browse</p>
              <h2>Shop by room</h2>
            </div>
            <Link className="link" to="/showroom">All products <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c.id} to={`/showroom?cat=${c.id}`} className="cat-card">
                <Art cat={c.id} />
                <h3>{c.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow gold">On the floor now</p>
              <h2>Popular picks</h2>
              <p className="sub">Stock rotates weekly. Call to confirm what is here today.</p>
            </div>
            <Link className="link" to="/showroom">See all <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="prod-grid">
            {featured.map((p) => <ProductCard key={p.id} p={p} dark />)}
          </div>
        </div>
      </section>

      <section className="finance">
        <div className="container finance-row">
          <div>
            <p className="eyebrow">Flexible ways to shop</p>
            <h2>Financing and lease-to-own</h2>
            <p>Ask about Synchrony, Snap Leasing and Acima Leasing. Approval, eligibility and terms vary.</p>
          </div>
          <Link className="btn btn-dark" to="/financing">View options <Icon name="arrow" /></Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">Reviews</p>
          <h2>{STORE.rating} on Google</h2>
          <p className="rating-line"><Stars /> <span className="muted">{STORE.reviews} reviews</span></p>
          <div className="three">
            {[
              ['Competitive prices', 'Shoppers often mention finding what they needed for less.'],
              ['Friendly service', 'Reviewers regularly highlight helpful, no-pressure staff.'],
              ['Wide selection', 'A rotating floor of appliances and furniture for every room.'],
            ].map(([t, d]) => (
              <div className="theme" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>
            ))}
          </div>
          <p className="small muted">Summarized review themes, not individual customer quotes.</p>
        </div>
      </section>

      <Visit />
    </>
  );
}

function ProductCard({ p, dark }) {
  const cat = CATEGORIES.find((c) => c.id === p.cat);
  const subject = encodeURIComponent(`Availability: ${p.name}`);
  const body = encodeURIComponent(`Hi, is the "${p.name}" available at Royal Appliance Outlet? Please let me know current pricing.`);
  return (
    <article className={'prod' + (dark ? ' prod-dark' : '')}>
      <Art cat={p.cat} shape={p.shape} label={p.name} />
      <div className="prod-body">
        <span className="mono">{cat?.name}</span>
        <h3>{p.name}</h3>
        <p>{p.note}</p>
        <div className="prod-foot">
          <span className="mono price">Call for price</span>
          <div className="prod-actions">
            <a className="icon-btn" href={`tel:${STORE.tel}`} aria-label={`Call about ${p.name}`}><Icon name="phone" /></a>
            <a className="icon-btn" href={`mailto:${STORE.email}?subject=${subject}&body=${body}`} aria-label={`Email about ${p.name}`}><Icon name="mail" /></a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function Showroom() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const cat = params.get('cat') || 'all';
  const items = useMemo(
    () => PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && (p.name + ' ' + p.note).toLowerCase().includes(q.toLowerCase())),
    [cat, q]
  );
  return (
    <>
      <section className="page-head">
        <div className="container">
          <p className="eyebrow gold">Showroom</p>
          <h1 className="h1-sm">Browse the showroom</h1>
          <p className="sub">Furniture for the whole house, plus home appliances. Availability changes weekly.</p>
          <input id="search" className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sofas, mattresses, refrigerators" aria-label="Search products" />
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="pills" role="group" aria-label="Categories">
            <button className={cat === 'all' ? 'on' : ''} onClick={() => setParams({})}>All</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setParams({ cat: c.id })}>{c.name}</button>
            ))}
          </div>
          {items.length ? (
            <div className="prod-grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          ) : (
            <div className="hangtag empty">
              <span className="mono">Nothing listed yet</span>
              <p>Our floor changes weekly. Call and we'll tell you exactly what we have today.</p>
              <CallButtons />
            </div>
          )}
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
          <p className="eyebrow gold">Flexible ways to shop</p>
          <h1 className="h1-sm">Financing and lease-to-own</h1>
          <p className="sub">Approval, eligibility and terms vary by provider.</p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          <div className="three">
            {FINANCING.map((f) => (
              <div className="hangtag" key={f.name}><span className="mono">{f.name}</span><p className="muted">{f.text}</p></div>
            ))}
          </div>
          <p className="muted">Ask our team in store which option fits your situation and we'll walk you through the next steps.</p>
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
        <div className="container">
          <p className="eyebrow gold">Answers</p>
          <h1 className="h1-sm">Frequently asked questions</h1>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          {FAQS.map(([q, a]) => (
            <details className="faq" key={q}><summary>{q}</summary><p className="muted">{a}</p></details>
          ))}
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
        <div className="container">
          <p className="eyebrow gold">Contact</p>
          <h1 className="h1-sm">Talk to the team</h1>
          <p className="sub">The fastest way to check stock and pricing is a quick call.</p>
        </div>
      </section>
      <section className="section">
        <div className="container visit">
          <form className="form" onSubmit={submit}>
            <label htmlFor="c-name">Name<input id="c-name" required value={f.name} onChange={set('name')} /></label>
            <label htmlFor="c-phone">Phone<input id="c-phone" type="tel" value={f.phone} onChange={set('phone')} /></label>
            <label htmlFor="c-msg">What are you looking for?<textarea id="c-msg" required rows="4" value={f.msg} onChange={set('msg')} /></label>
            <button className="btn btn-primary" type="submit">Send message</button>
          </form>
          <div className="hangtag">
            <span className="mono">Store details</span>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Phone</dt><dd><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></dd>
              <dt>Email</dt><dd><a href={`mailto:${STORE.email}`}>{STORE.email}</a></dd>
              <dt>Hours</dt><dd>{STORE.hours.map(([d, h]) => <div key={d}>{d} <b>{h}</b></div>)}</dd>
            </dl>
            <CallButtons />
          </div>
        </div>
      </section>
    </>
  );
}
