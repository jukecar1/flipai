import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { STORE, MAPS_URL } from './data';
import { reply } from './assistant';
import { productPath, money } from './products';
import { useReserve } from './reserve';
import { LOGO_SVG } from './logoSvg';
import { Icon, CallLink } from './ui';
import { openConsent } from './Consent';

const NAV = [
  ['/', 'Home'],
  ['/shop', 'Shop'],
  ['/reviews', 'Reviews'],
  ['/faq', 'FAQ'],
  ['/request', 'Request a product'],
  ['/socials', 'Find us'],
  ['/contact', 'Contact'],
];

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Royal Vape Mart, home">
      <span className="logo-art" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const reserve = useReserve();
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
          <Link to="/reserve" className="list-btn" aria-label={`Reserve list, ${reserve.count} ${reserve.count === 1 ? 'item' : 'items'}`}><Icon name="bag" size={20} />{reserve.count > 0 && <span className="list-count">{reserve.count}</span>}</Link>
          <CallLink className="btn btn-primary btn-sm">
            <Icon name="phone" />
            <span className="hide-sm">{STORE.phone}</span>
            <span className="sr-only">Call</span>
          </CallLink>
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
          <p className="muted">Pensacola's west-side vape and smoke shop on Gulf Beach Hwy. Open 6AM to 1AM, every day. 21+ only.</p>
        </div>
        <div>
          <h2 className="fh">Visit and call</h2>
          <ul className="plain">
            <li><CallLink>{STORE.phone}</CallLink></li>
            <li><a href={MAPS_URL} target="_blank" rel="noreferrer">{STORE.address}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="fh">Hours</h2>
          <ul className="plain">
            {STORE.hours.map(([d, h]) => (
              <li key={d}><strong>{d}:</strong> {h}</li>
            ))}
          </ul>
          <p className="small muted">Hours may vary on holidays. Call ahead to confirm.</p>
        </div>
        <div>
          <h2 className="fh">Explore</h2>
          <ul className="plain">
            {NAV.map(([to, label]) => (
              <li key={to}><Link to={to}>{label}</Link></li>
            ))}
            <li><Link to="/reserve">Reserve list</Link></li>
            <li><Link to="/other-stores">Our other stores</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-base small muted">
        <div className="legal-links">
          <Link to="/age-policy">21+ Policy</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/cookies">Cookie Policy</Link>
          <button type="button" onClick={openConsent}>Cookie preferences</button>
        </div>
        <div>© {new Date().getFullYear()} Royal Vape Mart. All rights reserved. 21+ only.</div>
      </div>
    </footer>
  );
}

// Royal Assistant: answers store questions and searches the catalog (see assistant.js). It runs in the browser only.
const CHIPS = ['Are you open now?', 'Do I need ID?', 'How do I reserve?', 'Geek Bar', 'Directions'];

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: 'Hi! Ask me if we are open, how reservations and ID work, or for a product like a brand, a flavor or a coil.' },
  ]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = (q) => {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { from: 'me', text: q }]);
    setText('');
    setBusy(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'bot', ...reply(q) }]);
      setBusy(false);
    }, 450);
  };

  const close = () => setOpen(false);
  const linkEl = (k) => (k.to
    ? <Link className="a-link" to={k.to} onClick={close}>{k.label} <Icon name="arrow" size={14} /></Link>
    : <a className="a-link" href={k.href} {...(k.ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{k.label} <Icon name="arrow" size={14} /></a>);

  return (
    <div className="assistant">
      {open && (
        <div className="assistant-panel" role="dialog" aria-label="Royal Assistant">
          <div className="assistant-head"><span>Royal Assistant</span><button type="button" aria-label="Close assistant" onClick={close}>×</button></div>
          <div className="assistant-body" ref={bodyRef} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={'bubble ' + m.from}>
                <p>{m.text}</p>
                {m.products && (
                  <ul className="a-prods">
                    {m.products.map((p) => (
                      <li key={p.id}>
                        <Link to={productPath(p)} onClick={close}>
                          <span className="a-name">{p.name}</span>
                          <span className="a-price">{p.price != null ? money(p.price) : 'Ask for price'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {m.link && linkEl(m.link)}
              </div>
            ))}
            {busy && <div className="bubble bot typing" aria-label="Typing"><i /><i /><i /></div>}
          </div>
          <div className="chips">
            {CHIPS.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" aria-label="Your question" />
            <button className="btn btn-primary btn-sm" type="submit">Send</button>
          </form>
        </div>
      )}
      <button className="btn btn-primary assistant-fab" aria-label="Royal Assistant" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="chat" size={22} /> <span className="fab-label">Royal Assistant</span>
      </button>
    </div>
  );
}
