import { Routes, Route } from 'react-router-dom';
import './App.css';
import { Header, Footer, Assistant } from './Layout';
import ScrollFX from './ScrollFX';
import PalettePicker from './PalettePicker';
import { Home, Showroom, Collection, Financing, Faq, Contact } from './pages';

export default function App() {
  return (
    <>
      <ScrollFX />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/showroom/:cat" element={<Collection />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
      <Assistant />
      {typeof window !== 'undefined' && window.__PREVIEW && <PalettePicker />}
    </>
  );
}
