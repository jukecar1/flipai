// Recently viewed products, newest first, kept in this browser only.
const KEY = 'royal_recent';
export const readRecent = () => {
  try { const v = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
};
export function pushRecent(id) {
  const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 8);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
}
