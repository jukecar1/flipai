import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import { Header, Footer, Assistant } from './Layout';
import ScrollFX from './ScrollFX';
import { Sheets } from './Sheets';
import { Home, Showroom, Collection, ProductPage, Reviews, Socials, Financing, Faq, Contact } from './pages';

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
          <Route path="/financing" element={<Financing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <Assistant />
      <Sheets />
    </>
  );
}
