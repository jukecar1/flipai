import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { STORE, MAPS_URL, FAQS, LOGO } from './data';
import { Icon } from './ui';

const NAV = [
  ['/', 'Home'],
  ['/showroom', 'Showroom'],
  ['/financing', 'Financing'],
  ['/faq', 'FAQ'],
  ['/contact', 'Contact'],
];

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Royal Appliance Outlet home">
      <img src={LOGO} alt="Royal Appliance Outlet &amp; Furniture" width="48" height="52" />
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <header className="header">
      <div className="container header-row">
        <Logo />
        <nav className={'nav' + (open ? ' open' : '')} aria-label="Main">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <a className="btn btn-primary btn-sm" href={`tel:${STORE.tel}`}>
            <Icon name="phone" />
            <span className="hide-sm">{STORE.phone}</span>
            <span className="sr-only">Call</span>
          </a>
          <button
            className="btn btn-ghost btn-sm menu-btn"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            <span className={'burger' + (open ? ' x' : '')} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p className="muted">A local furniture and appliance showroom with expert help in store on N Pace Boulevard.</p>
        </div>
        <div>
          <h4>Visit and call</h4>
          <ul className="plain">
            <li><a href={`tel:${STORE.tel}`}>{STORE.phone}</a></li>
            <li><a href={`mailto:${STORE.email}`}>{STORE.email}</a></li>
            <li><a href={MAPS_URL} target="_blank" rel="noreferrer">{STORE.address}</a></li>
            <li><a href={STORE.facebook} target="_blank" rel="noreferrer">Royal Appliance Outlet on Facebook</a></li>
          </ul>
        </div>
        <div>
          <h4>Hours</h4>
          <ul className="plain">
            {STORE.hours.map(([d, h]) => (
              <li key={d}><strong>{d}:</strong> {h}</li>
            ))}
          </ul>
          <p className="small muted">Hours may vary on holidays. Call ahead to confirm.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <ul className="plain">
            {NAV.map(([to, label]) => (
              <li key={to}><Link to={to}>{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container footer-base small muted">
        © {new Date().getFullYear()} Royal Appliance Outlet. All rights reserved.
      </div>
    </footer>
  );
}

// Lightweight FAQ assistant: matches keywords against the FAQ list. No backend needed.
export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: 'Hi! I can answer quick questions about hours, location, financing and stock.' },
  ]);
  const [text, setText] = useState('');

  const answer = (q) => {
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    let best = null;
    let score = 0;
    FAQS.forEach(([fq, fa]) => {
      const hay = (fq + ' ' + fa).toLowerCase();
      const s = words.filter((w) => hay.includes(w)).length;
      if (s > score) { score = s; best = fa; }
    });
    return best || `I'm not sure about that one. Call us at ${STORE.phone} and our team will help.`;
  };

  const send = (q) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: 'me', text: q }, { from: 'bot', text: answer(q) }]);
    setText('');
  };

  return (
    <div className="assistant">
      {open && (
        <div className="assistant-panel" role="dialog" aria-label="Royal Assistant">
          <div className="assistant-head">Royal Assistant</div>
          <div className="assistant-body">
            {msgs.map((m, i) => <p key={i} className={'bubble ' + m.from}>{m.text}</p>)}
          </div>
          <div className="chips">
            {['Hours', 'Financing', 'Location'].map((c) => (
              <button key={c} onClick={() => send(c)}>{c}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question…" aria-label="Your question" />
            <button className="btn btn-primary btn-sm" type="submit">Send</button>
          </form>
        </div>
      )}
      <button className="btn btn-primary assistant-fab" onClick={() => setOpen(!open)}>
        <Icon name="chat" /> Royal Assistant
      </button>
    </div>
  );
}
