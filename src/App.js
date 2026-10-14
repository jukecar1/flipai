import { useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { Header, Footer, Assistant } from './Layout';
import ScrollFX from './ScrollFX';
import { Sheets } from './Sheets';
import { Home, Showroom, Collection, ProductPage, Reviews, Socials, OtherStores, Financing, Faq, Contact } from './pages';

// A closing call to action shown above the footer on every page except the one it points to.
function StoresBand() {
  const { pathname } = useLocation();
  if (pathname === '/other-stores') return null;
  return (
    <section className="stores-band">
      <div className="container stores-row">
        <div><h2>Check out our other stores</h2><p>We also run a vape shop and a car auction business.</p></div>
        <Link className="btn btn-primary" to="/other-stores">See our other stores</Link>
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
    </>
  );
}
