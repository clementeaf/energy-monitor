import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Ecosystem } from './components/Ecosystem';
import { SiemensBanner } from './components/SiemensBanner';
import { Differentiation } from './components/Differentiation';
import { Stats } from './components/Stats';
import { Presence } from './components/Presence';
import { Innovation } from './components/Innovation';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* Spacer for fixed navbar */}
      <div className="h-[88px] lg:h-[116px]" />
      <Hero />
      <About />
      <Ecosystem />
      <SiemensBanner />
      <Differentiation />
      <Stats />
      <Presence />
      <Innovation />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;
