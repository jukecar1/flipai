import { useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { Header, Footer, Assistant } from './Layout';
import { Icon } from './ui';
import ScrollFX from './ScrollFX';
import { Sheets } from './Sheets';
import CookieNotice from './Consent';
import { Home, Showroom, Collection, ProductPage, Reviews, Socials, OtherStores, LegalPage, Financing, Faq, Contact } from './pages';

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
          <small>Royal Vape Mart and our car auction business</small>
          <span className="go" aria-hidden="true"><Icon name="arrow" size={22} /></span>
        </Link>
      </div>
    </section>
  );
}

// The shared preview only lets simple anchors like #p-123 through, so open those as product pages.
function DeepLink() {
  const nav = useNavigate();
  useEffect(() => {
    const m = /^#p-(\d+)$/.exec(window.location.hash);
    if (m) nav(`/product/${m[1]}`, { replace: true });
  }, [nav]);
  return null;
}

export default function App() {
  return (
    <>
      <DeepLink />
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
          <Route path="/other-stores" element={<OtherStores />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/cookies" element={<LegalPage kind="cookies" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <StoresBand />
      <Footer />
      <Assistant />
      <Sheets />
      <CookieNotice />
    </>
  );
}
