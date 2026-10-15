import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES, imgUrl, STORE } from './data';
import { getProduct, isBest, productPath, keyDetails } from './products';
import { useCompare, compareFullEvent, MAX_COMPARE } from './compareStore';
import { Icon, CallLink, BackLink } from './ui';
import { Price } from './pages';
import { usePageMeta } from './meta';

const deptName = (id) => CATEGORIES.find((c) => c.id === id)?.name;

// Floating bar shown while items are picked for comparing.
export function CompareBar() {
  const cmp = useCompare();
  const { pathname } = useLocation();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let t;
    const on = () => { setMsg(`You can compare up to ${MAX_COMPARE} items. Remove one to add another.`); clearTimeout(t); t = setTimeout(() => setMsg(''), 2800); };
    window.addEventListener(compareFullEvent, on);
    return () => { window.removeEventListener(compareFullEvent, on); clearTimeout(t); };
  }, []);
  const show = cmp.ids.length > 0 && pathname !== '/compare';
  const barRef = useRef(null);
  useEffect(() => {
    if (!show || !barRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const set = () => document.documentElement.style.setProperty('--bar-compare', `${barRef.current ? barRef.current.offsetHeight : 0}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(barRef.current);
    return () => { ro.disconnect(); document.documentElement.style.setProperty('--bar-compare', '0px'); };
  }, [show]);
  useEffect(() => {
    document.documentElement.classList.toggle('compare-open', show);
    return () => document.documentElement.classList.remove('compare-open');
  }, [show]);
  if (!show) return null;
  const items = cmp.ids.map((id) => getProduct(id)).filter(Boolean);
  const ready = items.length >= 2;
  return (
    <div ref={barRef} className="compare-bar" role="region" aria-label="Compare items">
      {msg && <p className="compare-msg" role="status">{msg}</p>}
      <div className="container compare-row">
        <div className="compare-thumbs">
          {items.map((p) => <img key={p.id} src={imgUrl(p.img, 120)} alt={p.name} width="44" height="44" />)}
          <span>{items.length} of {MAX_COMPARE} to compare</span>
        </div>
        <div className="compare-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={cmp.clear}>Clear</button>
          {ready ? <Link className="btn btn-primary btn-sm" to="/compare">Compare now</Link> : <span className="btn btn-primary btn-sm is-off" aria-disabled="true">Add one more</span>}
        </div>
      </div>
    </div>
  );
}

export function ComparePage() {
  usePageMeta('Compare items', 'Compare furniture and appliances side by side at Royal Appliance Outlet in Pensacola, FL.');
  const cmp = useCompare();
  const items = cmp.ids.map((id) => getProduct(id)).filter(Boolean);
  const n = items.length;
  const head = (
    <section className="page-head">
      <div className="container">
        <BackLink to="/showroom" label="showroom" />
        <p className="eyebrow">Side by side</p>
        <h1 className="h1-sm">Compare items</h1>
        <p className="lead">Compare up to {MAX_COMPARE} items. Details come from each product's name, so call the store to confirm exact specs and availability.</p>
      </div>
    </section>
  );
  if (n < 2) {
    return (
      <>
        {head}
        <section className="section tight"><div className="container empty">
          <h2 className="h3">Pick at least two items</h2>
          <p className="muted">Tap "Compare" on any item in the showroom. You have {n} selected.</p>
          <Link className="btn btn-primary" to="/showroom">Browse the showroom</Link>
        </div></section>
      </>
    );
  }
  const rows = [
    ['Photo', (p) => <Link to={productPath(p)} className="cmp-photo"><img src={imgUrl(p.img, 400)} alt={p.name} /></Link>],
    ['Item', (p) => <Link to={productPath(p)} className="cmp-name">{p.name}</Link>],
    ['Price', (p) => <Price p={p} />],
    ['Type', (p) => p.type],
    ['Collection', (p) => deptName(p.cat)],
    ['Best seller', (p) => (isBest(p) ? 'Yes' : 'No')],
    ['Key details', (p) => { const d = keyDetails(p); return d.length ? <span className="chips-wrap">{d.map((x) => <i key={x}>{x}</i>)}</span> : 'Not listed'; }],
    ['Availability', () => 'Call to confirm'],
    ['', (p) => (
      <span className="cmp-actions">
        {p.price == null && <Link className="ask" to={`/contact?item=${encodeURIComponent(p.name)}&ask=price`}>Ask for price</Link>}
        <CallLink className="ask"><Icon name="phone" size={14} /> {STORE.phone}</CallLink>
        <button type="button" className="ask" onClick={() => cmp.toggle(p.id)}>Remove</button>
      </span>
    )],
  ];
  return (
    <>
      {head}
      <section className="section tight">
        <div className="container">
          <div className="cmp-scroll" tabIndex="0" aria-label="Comparison table, scroll sideways on small screens">
            <div className="cmp-grid" style={{ gridTemplateColumns: `104px repeat(${n}, minmax(160px, 1fr))`, minWidth: 104 + n * 160 }}>
              {rows.map(([label, cell]) => (
                <div className="cmp-row" key={label || 'actions'} style={{ display: 'contents' }}>
                  <div className="cmp-label">{label}</div>
                  {items.map((p) => <div className="cmp-cell" key={p.id}>{cell(p)}</div>)}
                </div>
              ))}
            </div>
          </div>
          <div className="btn-row"><button type="button" className="btn btn-ghost" onClick={cmp.clear}>Clear comparison</button><Link className="btn btn-ghost" to="/showroom">Add more items</Link></div>
        </div>
      </section>
    </>
  );
}
