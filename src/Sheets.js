import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STORE, MAPS_URL, openStatus } from './data';
import { Modal, Icon, TextLink } from './ui';
import { submitForm } from './forms';

function Status() {
  const s = openStatus();
  return <span className={'stat ' + (s.open ? 'is-open' : 'is-closed')}><i aria-hidden="true" />{s.text}</span>;
}

function CopyButton({ value, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); } catch (e) { setDone(false); }
  };
  return <button type="button" className="btn btn-ghost" onClick={copy}>{done ? 'Copied' : label}</button>;
}

function SpecialsForm({ onDone }) {
  const [f, setF] = useState({ email: '', phone: '', agree: false, _gotcha: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f._gotcha) return;
    if (!f.email.trim() && !f.phone.trim()) { setErr('Add an email or a mobile number.'); return; }
    if (!f.agree) { setErr('Please tick the box to agree to receive specials.'); return; }
    setErr(''); setState('sending');
    try {
      const r = await submitForm('Weekly specials signup', { email: f.email, phone: f.phone, consent: 'Agreed to receive weekly specials by email and/or text', _replyto: f.email },
        `Please add me to the weekly specials list.\n\nEmail: ${f.email}\nMobile: ${f.phone}\nI agree to receive weekly specials by email and/or text.`);
      setState(r === 'mailto' ? 'idle' : 'sent');
    } catch (x) { setState('error'); }
  };
  if (state === 'sent') {
    return (
      <div role="status">
        <h2>You are on the list</h2>
        <p>Thanks. We will send you this week's specials.{typeof window !== 'undefined' && window.__PREVIEW ? ' (Preview only: nothing was actually saved.)' : ''}</p>
        <div className="btn-row"><button type="button" className="btn btn-primary" onClick={onDone}>Done</button></div>
      </div>
    );
  }
  return (
    <form className="form" onSubmit={submit} noValidate>
      <h2>Get weekly specials</h2>
      <p className="muted">Our floor changes weekly. Get this week's specials by email, text, or both.</p>
      <label htmlFor="sp-email">Email<input id="sp-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></label>
      <label htmlFor="sp-phone">Mobile number for texts<input id="sp-phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></label>
      <div className="trap" aria-hidden="true"><label htmlFor="sp-web">Leave empty<input id="sp-web" tabIndex="-1" autoComplete="off" value={f._gotcha} onChange={set('_gotcha')} /></label></div>
      <label className="check" htmlFor="sp-agree"><input id="sp-agree" type="checkbox" checked={f.agree} onChange={set('agree')} /><span>I agree to receive weekly specials from Royal Appliance Outlet by email and/or text. Message and data rates may apply. Reply STOP to unsubscribe. See the <Link to="/privacy" onClick={onDone}>privacy policy</Link>.</span></label>
      {err && <p className="form-err" role="alert">{err}</p>}
      {state === 'error' && <p className="form-err" role="alert">That did not go through. Please try again.</p>}
      <button className="btn btn-primary" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Signing up…' : 'Sign me up'}</button>
    </form>
  );
}

// Small windows opened from the home page cards and, in the shared preview, from every call and text button.
export function Sheets() {
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    const on = (e) => setSheet(e.detail);
    window.addEventListener('royal-sheet', on);
    return () => window.removeEventListener('royal-sheet', on);
  }, []);
  if (!sheet) return null;
  const close = () => setSheet(null);
  const open = (kind, data) => setSheet({ kind, ...data });

  if (sheet.kind === 'hours') {
    return (
      <Modal onClose={close} label="Store hours" className="sheet">
        <div className="sheet-body">
          <h2>Store hours</h2>
          <Status />
          <dl className="hrs">
            {STORE.hours.map(([d, h]) => <div key={d} style={{ display: 'contents' }}><dt>{d}</dt><dd>{h}</dd></div>)}
          </dl>
          <p className="small muted">Hours may vary on holidays. Call ahead to confirm.</p>
          <div className="btn-row">
            <a className="btn btn-primary" href={MAPS_URL} target="_blank" rel="noreferrer"><Icon name="nav" /> Get Directions</a>
            <button type="button" className="btn btn-ghost" onClick={() => open('call')}><Icon name="phone" /> Call</button>
          </div>
        </div>
      </Modal>
    );
  }
  if (sheet.kind === 'text') {
    return (
      <Modal onClose={close} label="Text the store" className="sheet">
        <div className="sheet-body">
          <h2>Text the store</h2>
          <div className="sheet-num">{STORE.phone}</div>
          <p className="muted">Send us a text with a photo or the name of the item. Your message:</p>
          <p className="textbody">{sheet.body}</p>
          <div className="btn-row">
            <TextLink className="btn btn-primary" body={sheet.body}>Open Messages</TextLink>
            <CopyButton value={sheet.body} label="Copy message" />
          </div>
          <p className="small muted">On a phone, "Open Messages" starts a text to {STORE.phone}. Standard message rates apply.</p>
        </div>
      </Modal>
    );
  }
  if (sheet.kind === 'specials') {
    return (
      <Modal onClose={close} label="Weekly specials signup" className="sheet">
        <div className="sheet-body"><SpecialsForm onDone={close} /></div>
      </Modal>
    );
  }
  return (
    <Modal onClose={close} label="Call the store" className="sheet">
      <div className="sheet-body">
        <h2>Call the store</h2>
        <div className="sheet-num">{STORE.phone}</div>
        <Status />
        <div className="btn-row">
          <a className="btn btn-primary" href={`tel:${STORE.tel}`}><Icon name="phone" /> Call now</a>
          <CopyButton value={STORE.phone} label="Copy number" />
        </div>
        <p className="small muted">Prefer to write? <Link to="/contact" onClick={close}>Send us a message</Link> or <button type="button" className="inline" onClick={() => open('text', { body: 'Hi! I have a question for Royal Appliance Outlet.' })}>text us</button>. Hours: Mon to Sat 10 to 7, Sun 10 to 6.</p>
      </div>
    </Modal>
  );
}
