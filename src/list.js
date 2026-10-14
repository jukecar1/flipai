import { useEffect, useState } from 'react';

// "My list": items a visitor saves to bring up with the store. Kept only in this browser's local storage.
const KEY = 'royal_my_list';
const EVT = 'royal-list';

export function readList() {
  try { const v = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function writeList(ids) {
  try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* storage unavailable: the list lasts until the page closes */ }
  window.dispatchEvent(new Event(EVT));
}

let memory = null; // fallback when storage is blocked

export function useList() {
  const [ids, setIds] = useState(() => memory || readList());
  useEffect(() => {
    const on = () => setIds(readList().length || !memory ? readList() : memory);
    window.addEventListener(EVT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener('storage', on); };
  }, []);
  const set = (next) => { memory = next; writeList(next); setIds(next); };
  return {
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    clear: () => set([]),
  };
}
