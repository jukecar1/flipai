import { useEffect, useLayoutEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { Header, Footer, Assistant } from './Layout';
import { Icon } from './ui';
import { useState } from 'react';
import ScrollFX from './ScrollFX';
import { Sheets } from './Sheets';
import CookieNotice from './Consent';
import { CompareBar, ComparePage } from './Compare';
import { track } from './analytics';
import { Home, Showroom, Collection, ProductPage, Reviews, Socials, OtherStores, MyList, About, Delivery, NotFound, LegalPage, Financing, Faq, Contact } from './pages';

// A closing call to action shown above the footer on every page except the one it points to.
function StoresBand() {
  const { pathname } = useLocation();
  if (pathname === '/other-stores') return null;
  return (
    <section className="stores-band" aria-label="Our other stores">
      <div className="container">
        <Link to="/other-stores" className="bigbox">
          <span className="k">Same owner</span>
          <b>Check out our other stores</b>
          <small>Royal Vape Mart and our car business</small>
          <span className="go" aria-hidden="true"><Icon name="arrow" size={22} /></span>
        </Link>
      </div>
    </section>
  );
}

// Every page opens at the top, including when the visitor goes back, so Back never lands mid-page or at the bottom.
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; }, []);
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// A round button that scrolls long pages back to the top.
function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 1400);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!show) return null;
  return (
    <button type="button" className="totop" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
      <Icon name="arrow" size={20} />
    </button>
  );
}

// Counts each page and product view with a cookie-free service, when one is configured (see analytics.js).
function Pageviews() {
  const { pathname } = useLocation();
  useEffect(() => { const id = setTimeout(() => track(pathname, document.title), 120); return () => clearTimeout(id); }, [pathname]);
  return null;
}

// The shared preview only lets simple anchors like #p-123 through, so open those as product pages.
function DeepLink() {
  const nav = useNavigate();
  useEffect(() => {
    const m = /^#p-([a-z0-9]+)$/.exec(window.location.hash);
    if (m) nav(`/product/${m[1]}`, { replace: true });
  }, [nav]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <DeepLink />
      <Pageviews />
      <ScrollFX />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/showroom/:cat" element={<Collection />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/socials" element={<Socials />} />
          <Route path="/list" element={<MyList />} />
          <Route path="/about" element={<About />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/other-stores" element={<OtherStores />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/cookies" element={<LegalPage kind="cookies" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <ToTop />
      <CompareBar />
      <StoresBand />
      <Footer />
      <Assistant />
      <Sheets />
      <CookieNotice />
    </>
  );
}
