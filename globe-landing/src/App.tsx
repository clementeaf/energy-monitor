import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { About } from './components/About';
import { Ecosystem } from './components/Ecosystem';
import { SiemensBanner } from './components/SiemensBanner';
import { Results } from './components/Results';
import { Differentiation } from './components/Differentiation';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Stats />
      <About />
      <Ecosystem />
      <SiemensBanner />
      <Results />
      <Differentiation />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;
