import { useEffect, useState } from 'react';
import { getProduct } from './products';

// The reserve list: items a visitor wants set aside for pickup, with a choice (flavor) and a quantity.
// Kept in this browser only; nothing is sent until they submit the reserve form.
const KEY = 'royal_reserve';
const EVT = 'royal-reserve';
const MAX_QTY = 20;
let memory = null; // used when storage is blocked

const read = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((l) => l && getProduct(l.id)) : [];
  } catch (e) { return memory || []; }
};
const write = (lines) => {
  memory = lines;
  try { window.localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* the list then lasts until the page closes */ }
  window.dispatchEvent(new Event(EVT));
};

export const readReserve = read;

export function useReserve() {
  const [lines, setLines] = useState(read);
  useEffect(() => {
    const on = () => setLines(read());
    window.addEventListener(EVT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener('storage', on); };
  }, []);
  const same = (l, id, opt) => l.id === id && (l.opt || '') === (opt || '');
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    add: (id, opt = '', qty = 1) => {
      const cur = read();
      const hit = cur.find((l) => same(l, id, opt));
      if (hit) write(cur.map((l) => (l === hit ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)));
      else write([...cur, { id, opt, qty: Math.min(MAX_QTY, qty) }]);
    },
    setQty: (id, opt, qty) => write(read().map((l) => (same(l, id, opt) ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l))),
    remove: (id, opt) => write(read().filter((l) => !same(l, id, opt))),
    clear: () => write([]),
  };
}

export const lineTotal = (lines) => lines.reduce((s, l) => s + (getProduct(l.id).price || 0) * l.qty, 0);
