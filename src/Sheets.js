import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STORE, MAPS_URL, openStatus } from './data';
import { Modal, Icon } from './ui';

function Status() {
  const s = openStatus();
  return <span className={'stat ' + (s.open ? 'is-open' : 'is-closed')}><i aria-hidden="true" />{s.text}</span>;
}

function CopyNumber() {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(STORE.phone); setDone(true); setTimeout(() => setDone(false), 1800); } catch (e) { setDone(false); }
  };
  return <button type="button" className="btn btn-ghost" onClick={copy}>{done ? 'Copied' : 'Copy number'}</button>;
}

// Small windows opened from the home page cards and, in the shared preview, from every call button.
export function Sheets() {
  const [kind, setKind] = useState(null);
  useEffect(() => {
    const on = (e) => setKind(e.detail);
    window.addEventListener('royal-sheet', on);
    return () => window.removeEventListener('royal-sheet', on);
  }, []);
  if (!kind) return null;
  const close = () => setKind(null);
  if (kind === 'hours') {
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
            <button type="button" className="btn btn-ghost" onClick={() => setKind('call')}><Icon name="phone" /> Call</button>
          </div>
        </div>
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
          <CopyNumber />
        </div>
        <p className="small muted">Prefer to write? <Link to="/contact" onClick={close}>Send us a message</Link>. Hours: Mon to Sat 10 to 7, Sun 10 to 6.</p>
      </div>
    </Modal>
  );
}
