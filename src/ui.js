import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { STORE, MAPS_URL } from './data';

const PATHS = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  nav: 'M4 11 20 4l-7 16-2-7z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chat: 'M4 5h16v11H9l-5 4z',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  hand: 'M7 12V6a1.5 1.5 0 0 1 3 0v4m0 0V4.5a1.5 1.5 0 0 1 3 0V10m0 0V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7',
  heart: 'M12 20.5S3.5 15.2 3.5 9.1A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.5 2.4c0 6.1-8.5 11.4-8.5 11.4z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
};

export function Icon({ name, size = 18, fill }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill={name === 'star' || fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

// Opens the call / hours sheets (see Sheets.js) from anywhere on the page.
export const openSheet = (kind, data = {}) => window.dispatchEvent(new CustomEvent('royal-sheet', { detail: { kind, ...data } }));

// A normal tel: link. In the shared preview, where phone links are unreliable, it opens the call sheet instead.
export function CallLink({ children, ...rest }) {
  return (
    <a
      {...rest}
      href={`tel:${STORE.tel}`}
      onClick={(e) => { if (typeof window !== 'undefined' && window.__PREVIEW) { e.preventDefault(); openSheet('call'); } }}
    >
      {children}
    </a>
  );
}

// A normal sms: link. In the shared preview, where text links are unreliable, it opens the text sheet instead.
export function TextLink({ body = 'Hi! I have a question for Royal Appliance Outlet.', children, ...rest }) {
  return (
    <a
      {...rest}
      href={`sms:${STORE.sms}?&body=${encodeURIComponent(body)}`}
      onClick={(e) => { if (typeof window !== 'undefined' && window.__PREVIEW) { e.preventDefault(); openSheet('text', { body }); } }}
    >
      {children}
    </a>
  );
}

// Goes to the page named on the button (never an unpredictable history entry), and the new page opens at the top.
export function BackLink({ to, label }) {
  return (
    <Link to={to} className="back">
      <Icon name="arrow" size={16} /> Back{label ? ` to ${label}` : ''}
    </Link>
  );
}

export function CallButtons() {
  return (
    <div className="btn-row">
      <CallLink className="btn btn-primary"><Icon name="phone" /> Call {STORE.phone}</CallLink>
      <a className="btn btn-ghost" href={MAPS_URL} target="_blank" rel="noreferrer"><Icon name="nav" /> Get Directions</a>
    </div>
  );
}

export function Stars() {
  return (
    <span className="stars" role="img" aria-label={`${STORE.rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size={16} />)}
    </span>
  );
}

export function Modal({ onClose, children, label, className = '' }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal ' + className} role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="modal-back-btn" onClick={onClose}><Icon name="arrow" size={16} /> Back</button>
        <button ref={closeRef} type="button" className="modal-x" aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}
