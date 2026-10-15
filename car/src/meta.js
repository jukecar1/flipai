import { useEffect } from 'react';

const BASE = "Sean's Car Business";

function setTag(selector, attrs, content) {
  let el = document.head.querySelector(selector);
  if (!el) { el = document.createElement('meta'); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

// Sets the browser tab title and the description that search results and link previews use.
export function usePageMeta(title, description) {
  useEffect(() => {
    const full = title ? `${title} | ${BASE}` : `${BASE} | Used Cars, Trucks & SUVs in Pensacola, FL`;
    document.title = full;
    if (description) {
      setTag('meta[name="description"]', { name: 'description' }, description);
      setTag('meta[property="og:description"]', { property: 'og:description' }, description);
    }
    setTag('meta[property="og:title"]', { property: 'og:title' }, full);
  }, [title, description]);
}
