import { STORE, MAPS_URL, CATEGORIES } from './data';

export function CallButtons() {
  return (
    <div className="btn-row">
      <a className="btn btn-primary" href={`tel:${STORE.tel}`}>📞 Call {STORE.phone}</a>
      <a className="btn btn-ghost" href={MAPS_URL} target="_blank" rel="noreferrer">➤ Get Directions</a>
    </div>
  );
}

// Placeholder art. Swap for <img> once real photos are supplied.
export function Thumb({ cat, label }) {
  const tone = CATEGORIES.find((c) => c.id === cat)?.tone || '#888';
  return (
    <div className="thumb" style={{ '--tone': tone }} role="img" aria-label={label}>
      <span>{label}</span>
    </div>
  );
}

export function Stars() {
  return <span className="stars" aria-label={`${STORE.rating} out of 5 stars`}>★★★★★</span>;
}
