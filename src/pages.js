import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STORE, CATEGORIES, PRODUCTS, FINANCING, FAQS } from './data';
import { CallButtons, Thumb, Stars } from './ui';

function Visit() {
  return (
    <section className="section alt">
      <div className="container two-col">
        <div>
          <h2>Visit the store</h2>
          <dl className="info">
            <dt>Address</dt><dd>{STORE.address}</dd>
            <dt>Hours</dt>
            <dd>
              {STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>)}
              <small className="muted">Hours may vary on holidays. Call ahead to confirm.</small>
            </dd>
            <dt>Phone</dt><dd><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></dd>
          </dl>
          <CallButtons />
        </div>
        <div className="card">
          <h3>Expert help in store</h3>
          <p className="muted">
            Royal Appliance Outlet is a locally run outlet on N Pace Blvd. Come see the floor in person. Our team will help you compare sizes, features and fit, and tell you exactly what is in stock today.
          </p>
          <p className="muted">Call or visit to confirm today's selection, current pricing and purchase options.</p>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  const featured = PRODUCTS.filter((p) => ['p1', 'p4', 'p6', 'p10', 'p16', 'p17'].includes(p.id));
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Pensacola, Florida</p>
            <h1>Furniture &amp; appliances for real homes.</h1>
            <p className="lead">
              Outfit every room from one showroom. Browse the collections, then stop in on N Pace Blvd for current availability, pricing and personal help.
            </p>
            <div className="btn-row">
              <Link className="btn btn-primary" to="/showroom">Explore the showroom</Link>
              <a className="btn btn-ghost" href={`tel:${STORE.tel}`}>📞 Call {STORE.phone}</a>
            </div>
            <div className="trust">
              <span><Stars /> <strong>{STORE.rating}</strong> Google · {STORE.reviews} reviews</span>
              <span>📍 Pensacola showroom</span>
              <span>🤝 Expert help in store</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <Thumb cat="living" label="Living Room" />
            <Thumb cat="bedroom" label="Bedroom" />
            <Thumb cat="appliances" label="Appliances" />
            <Thumb cat="mattress" label="Mattresses" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Shop by room</h2>
              <p className="muted">Furniture for the whole house, plus home appliances.</p>
            </div>
            <Link className="link" to="/showroom">View showroom →</Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c.id} to={`/showroom?cat=${c.id}`} className="cat-card">
                <Thumb cat={c.id} label={c.name} />
                <h3>{c.name}</h3>
                <p className="muted">{c.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Popular on the floor</h2>
              <p className="muted">Our floor changes weekly. Call to confirm what is in stock today.</p>
            </div>
            <Link className="link" to="/showroom">See all →</Link>
          </div>
          <div className="prod-grid">
            {featured.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      <section className="banner">
        <div className="container banner-row">
          <div>
            <p className="eyebrow gold">Flexible ways to shop</p>
            <h2>Ask about financing and lease-to-own options</h2>
            <p>Learn about Synchrony, Snap Leasing and Acima Leasing. Approval, eligibility and terms vary.</p>
          </div>
          <Link className="btn btn-light" to="/financing">View financing options</Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Customers rate us {STORE.rating} on Google</h2>
          <p><Stars /> <span className="muted">{STORE.rating} stars · {STORE.reviews} reviews</span></p>
          <div className="three">
            {[
              ['Competitive prices', 'Shoppers often mention finding what they needed for less.'],
              ['Friendly service', 'Reviewers regularly highlight helpful, no-pressure staff.'],
              ['Wide selection', 'A rotating floor of appliances and furniture for every room.'],
            ].map(([t, d]) => (
              <div className="card" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>
            ))}
          </div>
          <p className="small muted">Summarized review themes, not individual customer quotes.</p>
        </div>
      </section>

      <Visit />
    </>
  );
}

function ProductCard({ p }) {
  const cat = CATEGORIES.find((c) => c.id === p.cat);
  const subject = encodeURIComponent(`Availability: ${p.name}`);
  const body = encodeURIComponent(`Hi, is the "${p.name}" available at Royal Appliance Outlet? Please let me know current pricing.`);
  return (
    <article className="prod">
      <Thumb cat={p.cat} label={p.name} />
      <div className="prod-body">
        <small className="muted">{cat?.name}</small>
        <h3>{p.name}</h3>
        <p className="muted">{p.note}</p>
        <div className="btn-row tight">
          <a className="btn btn-primary btn-sm" href={`tel:${STORE.tel}`}>Call to check stock</a>
          <a className="btn btn-ghost btn-sm" href={`mailto:${STORE.email}?subject=${subject}&body=${body}`}>Email</a>
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
    () =>
      PRODUCTS.filter(
        (p) =>
          (cat === 'all' || p.cat === cat) &&
          (p.name + ' ' + p.note).toLowerCase().includes(q.toLowerCase())
      ),
    [cat, q]
  );

  return (
    <section className="section">
      <div className="container">
        <h1 className="h1-sm">Browse the showroom</h1>
        <p className="muted">Furniture for the whole house, plus home appliances. Availability changes weekly.</p>
        <div className="toolbar">
          <input
            type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search sofas, mattresses, refrigerators…" aria-label="Search products"
          />
        </div>
        <div className="pills" role="tablist" aria-label="Categories">
          <button className={cat === 'all' ? 'on' : ''} onClick={() => setParams({})}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setParams({ cat: c.id })}>
              {c.name}
            </button>
          ))}
        </div>
        {items.length ? (
          <div className="prod-grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <div className="card empty">
            <h3>Nothing listed here yet</h3>
            <p className="muted">Our floor changes weekly. Call and we'll tell you exactly what we have today.</p>
            <CallButtons />
          </div>
        )}
      </div>
    </section>
  );
}

export function Financing() {
  return (
    <section className="section">
      <div className="container narrow">
        <h1 className="h1-sm">Financing &amp; lease-to-own</h1>
        <p className="lead">Flexible ways to bring your furniture and appliances home. Approval, eligibility and terms vary by provider.</p>
        <div className="three">
          {FINANCING.map((f) => (
            <div className="card" key={f.name}><h3>{f.name}</h3><p className="muted">{f.text}</p></div>
          ))}
        </div>
        <p className="muted">Ask our team in store which option fits your situation, and we'll walk you through the next steps.</p>
        <CallButtons />
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="section">
      <div className="container narrow">
        <h1 className="h1-sm">Frequently asked questions</h1>
        {FAQS.map(([q, a]) => (
          <details className="faq" key={q}><summary>{q}</summary><p className="muted">{a}</p></details>
        ))}
        <CallButtons />
      </div>
    </section>
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
      <section className="section">
        <div className="container two-col">
          <div>
            <h1 className="h1-sm">Contact us</h1>
            <p className="muted">The fastest way to check stock and pricing is a quick call.</p>
            <form className="form" onSubmit={submit}>
              <label>Name<input required value={f.name} onChange={set('name')} /></label>
              <label>Phone<input type="tel" value={f.phone} onChange={set('phone')} /></label>
              <label>What are you looking for?<textarea required rows="4" value={f.msg} onChange={set('msg')} /></label>
              <button className="btn btn-primary" type="submit">Send message</button>
            </form>
          </div>
          <div className="card">
            <h3>Store details</h3>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Phone</dt><dd><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></dd>
              <dt>Email</dt><dd><a href={`mailto:${STORE.email}`}>{STORE.email}</a></dd>
              <dt>Hours</dt><dd>{STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>)}</dd>
            </dl>
            <CallButtons />
          </div>
        </div>
      </section>
    </>
  );
}
