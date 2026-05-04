import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { InicioPage } from './pages/InicioPage';
import { GlobeServicesPage } from './pages/GlobeServicesPage';

function App() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      {/* Spacer for fixed navbar */}
      <div className="h-[88px] lg:h-[116px]" />
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route path="/globe-services" element={<GlobeServicesPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
