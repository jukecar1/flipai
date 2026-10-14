import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'royal_cookie_consent';
const read = () => { try { return window.localStorage.getItem(KEY); } catch (e) { return null; } };
const write = (v) => { try { window.localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable: the notice simply shows again next visit */ } };

export const openConsent = () => window.dispatchEvent(new Event('royal-consent-open'));

export default function CookieNotice() {
  const [open, setOpen] = useState(false);
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
  if (!open) return null;
  const choose = (v) => { write(v); setOpen(false); };
  return (
    <div className="consent" role="dialog" aria-label="Cookie notice">
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
