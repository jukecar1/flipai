import { useEffect } from 'react';

// Light fade-up as sections enter the viewport. Classes are added from JS so
// the page stays fully visible if scripts or IntersectionObserver are missing.
const TARGETS = '.section-head, .tile, .prod, .glance, .providers li, .theme, .faq, .form, .split > div, .page-head .container > *';

export default function ScrollFX() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return undefined;
    root.classList.add('rv-on');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
    );
    const scan = () => {
      document.querySelectorAll(TARGETS).forEach((el) => {
        if (el.dataset.rv) return;
        el.dataset.rv = '1';
        const i = Array.prototype.indexOf.call(el.parentElement.children, el);
        el.style.setProperty('--d', `${(i % 4) * 60}ms`);
        el.classList.add('reveal-t');
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); root.classList.remove('rv-on'); };
  }, []);
  return null;
}
