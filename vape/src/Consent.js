import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'royal_cookie_consent';
const read = () => { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } };
const write = (v) => { try { window.localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable: the notice simply shows again next visit */ } };

export const openConsent = () => window.dispatchEvent(new Event('royal-consent-open'));

export default function CookieNotice() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!read()) setOpen(true);
    const on = () => setOpen(true);
    window.addEventListener('royal-consent-open', on);
    return () => window.removeEventListener('royal-consent-open', on);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('consent-open', open);
    return () => document.documentElement.classList.remove('consent-open');
  }, [open]);
  useEffect(() => {
    if (!open || !ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const set = () => document.documentElement.style.setProperty('--bar-consent', `${ref.current ? ref.current.offsetHeight : 0}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(ref.current);
    return () => { ro.disconnect(); document.documentElement.style.setProperty('--bar-consent', '0px'); };
  }, [open]);
  if (!open) return null;
  const choose = (v) => { write(v); setOpen(false); };
  return (
    <div ref={ref} className="consent" role="dialog" aria-label="Cookie notice">
      <div className="container consent-row">
        <p>We use only what the site needs. No ad trackers, and we never sell your data. <Link to="/cookies">Cookie policy</Link> · <Link to="/privacy">Privacy</Link></p>
        <div className="consent-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose('necessary')}>Reject non-essential</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => choose('all')}>Accept all</button>
        </div>
      </div>
    </div>
  );
}
