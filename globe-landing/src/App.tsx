import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InicioPage } from './pages/InicioPage';
import { GlobeServicesPage } from './pages/GlobeServicesPage';
import { GlobeModularPage } from './pages/GlobeModularPage';
import { GlobePowerPage } from './pages/GlobePowerPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route path="/globe-services" element={<GlobeServicesPage />} />
        <Route path="/globe-modular" element={<GlobeModularPage />} />
        <Route path="/globe-power" element={<GlobePowerPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
