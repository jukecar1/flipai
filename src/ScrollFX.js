import { useEffect } from 'react';

// Elements that fade up as they enter the viewport. Added via JS so the page
// is fully visible if scripts or IntersectionObserver are unavailable.
const TARGETS = '.section-head, .cat-card, .prod, .theme, .hangtag, .finance-row, .faq, .form, .visit > div, .page-head .container > *, .rating-line, .three + p';

export default function ScrollFX() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return undefined;
    root.classList.add('rv-on');

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    const scan = () => {
      document.querySelectorAll(TARGETS).forEach((el) => {
        if (el.dataset.rv) return;
        el.dataset.rv = '1';
        const i = Array.prototype.indexOf.call(el.parentElement.children, el);
        el.style.setProperty('--d', `${(i % 4) * 70}ms`);
        el.classList.add('reveal-t');
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });

    const bar = document.querySelector('.progress i');
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const max = root.scrollHeight - window.innerHeight;
        if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
        if (y < 1200) root.style.setProperty('--sy', y);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect(); mo.disconnect(); window.removeEventListener('scroll', onScroll);
      root.classList.remove('rv-on');
    };
  }, []);

  return <div className="progress" aria-hidden="true"><i /></div>;
}
