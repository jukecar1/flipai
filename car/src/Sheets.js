import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STORE, MAPS_URL, openStatus } from './data';
import { Modal, Icon, TextLink } from './ui';

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
      <Modal onClose={close} label="Hours" className="sheet">
        <div className="sheet-body">
          <h2>Hours</h2>
          <Status />
          <dl className="hrs">
            {STORE.hours.map(([d, h]) => <div key={d} style={{ display: 'contents' }}><dt>{d}</dt><dd>{h}</dd></div>)}
          </dl>
          <p className="small muted">Holiday hours may vary. Call ahead to confirm.</p>
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
      <Modal onClose={close} label="Text us" className="sheet">
        <div className="sheet-body">
          <h2>Text us</h2>
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
  return (
    <Modal onClose={close} label="Call the dealership" className="sheet">
      <div className="sheet-body">
        <h2>Call us</h2>
        <div className="sheet-num">{STORE.phone}</div>
        <Status />
        <div className="btn-row">
          <a className="btn btn-primary" href={`tel:${STORE.tel}`}><Icon name="phone" /> Call now</a>
          <CopyButton value={STORE.phone} label="Copy number" />
        </div>
        <p className="small muted">Prefer to write? <Link to="/contact" onClick={close}>Send us a message</Link> or <button type="button" className="inline" onClick={() => open('text', { body: 'Hi! I have a question about a vehicle.' })}>text us</button>. Hours: Mon to Sat 10 to 7, Sun 10 to 6.</p>
      </div>
    </Modal>
  );
}
