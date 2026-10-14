import { useEffect, useState } from 'react';

// Preview-only helper (enabled when window.__PREVIEW is set): lets a reviewer try each palette on the live page.
const PALETTES = [
  ['forest', 'Forest & Clay', ['#17302a', '#b25a3a']],
  ['rose', 'Charcoal & Rose', ['#231f22', '#b5546f']],
  ['sage', 'Slate & Sage', ['#232b2a', '#86a593']],
  ['burgundy', 'Burgundy & Copper', ['#2b1118', '#c9825a']],
  ['noir', 'Noir & Stone', ['#111214', '#d9d4c7']],
];

export default function PalettePicker() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('forest');
  useEffect(() => {
    let saved = null;
    try { saved = window.localStorage.getItem('royal-palette'); } catch (e) { /* storage unavailable */ }
    if (saved && PALETTES.some((p) => p[0] === saved)) setCur(saved);
  }, []);
  useEffect(() => {
    if (cur === 'forest') document.documentElement.removeAttribute('data-palette');
    else document.documentElement.setAttribute('data-palette', cur);
    try { window.localStorage.setItem('royal-palette', cur); } catch (e) { /* storage unavailable */ }
  }, [cur]);
  return (
    <div className="palette">
      {open && (
        <div className="palette-panel" role="group" aria-label="Color schemes">
          {PALETTES.map(([id, name, sw]) => (
            <button key={id} type="button" className={cur === id ? 'on' : ''} aria-pressed={cur === id} onClick={() => setCur(id)}>
              <span className="sw"><i style={{ background: sw[0] }} /><i style={{ background: sw[1] }} /></span>{name}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="palette-fab" onClick={() => setOpen(!open)}>Colors</button>
    </div>
  );
}
