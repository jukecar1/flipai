import { Link, useSearchParams } from 'react-router-dom';
import { STORE, CATEGORIES, STORE_PHOTO, FINANCING, FAQS, openStatus } from './data';
import { CallButtons, Icon, Stars } from './ui';
import { useState } from 'react';

function Hours() {
  return STORE.hours.map(([d, h]) => <div key={d}>{d}: {h}</div>);
}

export function Home() {
  const status = openStatus();
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <h1>Furniture and appliances in Pensacola</h1>
            <p className="lead">
              Shop every room in one showroom on N Pace Blvd. Our floor changes weekly, so call or stop in and we'll tell you exactly what is in stock today.
            </p>
            <div className="btn-row">
              <Link className="btn btn-primary" to="/showroom">Browse the showroom</Link>
              <a className="btn btn-ghost" href={`tel:${STORE.tel}`}>Call {STORE.phone}</a>
            </div>
            <p className={'open-line ' + (status.open ? 'is-open' : '')}>{status.text}</p>
          </div>
          <img className="hero-img" src={STORE_PHOTO} alt="Inside the Royal Appliance Outlet showroom" width="850" height="580" />
        </div>
      </section>

      <section className="facts">
        <div className="container facts-grid">
          <div className="fact"><b>{STORE.rating} <Stars /></b><span>{STORE.reviews} Google reviews</span></div>
          <div className="fact"><b>Expert help in store</b><span>Compare sizes, features and fit with our team</span></div>
          <div className="fact"><b>Financing available</b><span>Synchrony, Snap and Acima Leasing</span></div>
          <div className="fact"><b>Open 7 days</b><span>Mon to Sat 10 to 7, Sun 10 to 6</span></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Shop by room</h2>
            <Link className="link" to="/showroom">View showroom <Icon name="arrow" size={16} /></Link>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <Link key={c.id} to={`/showroom#${c.id}`} className="cat-card">
                <div className="cat-img"><img src={c.img} alt="" loading="lazy" /></div>
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="finance">
        <div className="container finance-row">
          <div>
            <h2>Ask about financing and lease-to-own</h2>
            <p>Learn about Synchrony, Snap Leasing and Acima Leasing. Approval, eligibility and terms vary.</p>
          </div>
          <Link className="btn btn-primary" to="/financing">View financing options</Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Customers rate us {STORE.rating} on Google</h2>
          <p className="rating-line"><Stars /> <span>{STORE.rating} stars from {STORE.reviews} reviews</span></p>
          <div className="three">
            {[
              ['Competitive prices', 'Shoppers often mention finding what they needed for less.'],
              ['Friendly service', 'Reviewers regularly highlight helpful, no-pressure staff.'],
              ['Wide selection', 'A rotating floor of appliances and furniture for every room.'],
            ].map(([t, d]) => (
              <div className="theme" key={t}><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
          <p className="small muted">Summarized review themes, not individual customer quotes.</p>
        </div>
      </section>

      <section className="section visit-band">
        <div className="container visit">
          <div>
            <h2>Visit the store</h2>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Hours</dt><dd><Hours /><small className="muted">Hours may vary on holidays. Call ahead to confirm.</small></dd>
              <dt>Phone</dt><dd><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></dd>
            </dl>
            <CallButtons />
          </div>
          <div>
            <h3>Expert help in store</h3>
            <p>Royal Appliance Outlet is a locally run outlet on N Pace Blvd. Come see the floor in person. Our team will help you compare sizes, features and fit, and tell you exactly what's in stock today.</p>
            <p className="muted">Call or visit to confirm today's selection, current pricing and purchase options.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function Showroom() {
  const [params] = useSearchParams();
  const only = params.get('cat');
  const list = only ? CATEGORIES.filter((c) => c.id === only) : CATEGORIES;
  return (
    <>
      <section className="page-head">
        <div className="container">
          <h1 className="h1-sm">Showroom</h1>
          <p className="lead">Furniture for the whole house, plus home appliances. Stock changes weekly, so call to confirm availability and pricing.</p>
          <CallButtons />
        </div>
      </section>
      <section className="section tight">
        <div className="container">
          <div className="room-list">
            {list.map((c) => (
              <article className="room" id={c.id} key={c.id}>
                <div className="cat-img"><img src={c.img} alt="" loading="lazy" /></div>
                <div>
                  <h2>{c.name}</h2>
                  <p>{c.blurb}</p>
                  <a className="link" href={`tel:${STORE.tel}`}>Ask about {c.name.toLowerCase()} <Icon name="arrow" size={16} /></a>
                </div>
              </article>
            ))}
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
          <h1 className="h1-sm">Financing and lease-to-own</h1>
          <p className="lead">Flexible ways to bring your furniture and appliances home. Approval, eligibility and terms vary by provider.</p>
        </div>
      </section>
      <section className="section">
        <div className="container narrow">
          <div className="three">
            {FINANCING.map((f) => (
              <div className="theme" key={f.name}><h3>{f.name}</h3><p>{f.text}</p></div>
            ))}
          </div>
          <p>Ask our team in store which option fits your situation and we'll walk you through the next steps.</p>
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
        <div className="container"><h1 className="h1-sm">Frequently asked questions</h1></div>
      </section>
      <section className="section">
        <div className="container narrow">
          {FAQS.map(([q, a]) => (
            <details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>
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
          <h1 className="h1-sm">Contact</h1>
          <p className="lead">The fastest way to check stock and pricing is a quick call.</p>
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
          <div>
            <h3>Store details</h3>
            <dl className="info">
              <dt>Address</dt><dd>{STORE.address}</dd>
              <dt>Phone</dt><dd><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></dd>
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
