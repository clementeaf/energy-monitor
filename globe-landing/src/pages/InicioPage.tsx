import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { Ecosystem } from '../components/Ecosystem';
import { SiemensBanner } from '../components/SiemensBanner';
import { Differentiation } from '../components/Differentiation';
import { Stats } from '../components/Stats';
import { Presence } from '../components/Presence';
import { Innovation } from '../components/Innovation';
import { Contact } from '../components/Contact';

export function InicioPage() {
  return (
    <>
      <Hero />
      <About />
      <Ecosystem />
      <SiemensBanner />
      <Differentiation />
      <Stats />
      <Presence />
      <Innovation />
      <Contact />
    </>
  );
}
