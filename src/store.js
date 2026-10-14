import { useEffect, useState } from 'react';

// A tiny saved-ids store kept in this browser's local storage (used for My list and Compare).
export function createStore(key, max = Infinity) {
  const evt = `royal-store-${key}`;
  let memory = null; // used when storage is blocked

  const read = () => {
    try { const v = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return memory || []; }
  };
  const write = (ids) => {
    memory = ids;
    try { window.localStorage.setItem(key, JSON.stringify(ids)); } catch (e) { /* the list then lasts until the page closes */ }
    window.dispatchEvent(new Event(evt));
  };

  function useStore() {
    const [ids, setIds] = useState(read);
    useEffect(() => {
      const on = () => setIds(read());
      window.addEventListener(evt, on);
      window.addEventListener('storage', on);
      return () => { window.removeEventListener(evt, on); window.removeEventListener('storage', on); };
    }, []);
    return {
      ids,
      has: (id) => ids.includes(id),
      // returns false when the store is full and the item was not added
      toggle: (id) => {
        if (ids.includes(id)) { write(ids.filter((x) => x !== id)); return true; }
        if (ids.length >= max) { window.dispatchEvent(new Event(`${evt}-full`)); return false; }
        write([...ids, id]); return true;
      },
      clear: () => write([]),
    };
  }
  return { useStore, read, fullEvent: `${evt}-full` };
}
