import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Problems } from './components/Problems';
import { Ecosystem } from './components/Ecosystem';
import { Siemens } from './components/Siemens';
import { EmsBms } from './components/EmsBms';
import { Transparency } from './components/Transparency';
import { Maintenance } from './components/Maintenance';
import { Financial } from './components/Financial';
import { Portfolio } from './components/Portfolio';
import { Deployment } from './components/Deployment';
import { FinalMetrics } from './components/FinalMetrics';
import { Differentiation } from './components/Differentiation';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Stats />
      <Problems />
      <Ecosystem />
      <Siemens />
      <EmsBms />
      <Transparency />
      <Maintenance />
      <Financial />
      <Portfolio />
      <Deployment />
      <FinalMetrics />
      <Differentiation />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;
