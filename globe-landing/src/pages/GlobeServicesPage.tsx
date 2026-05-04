import { Breadcrumb } from '../components/Breadcrumb';
import { ServicesHero } from '../components/ServicesHero';
import { ServicesSolutions } from '../components/ServicesSolutions';
import { ServicesCards } from '../components/ServicesCards';
import { ServicesIndustries } from '../components/ServicesIndustries';
import { ServicesPresence } from '../components/ServicesPresence';
import { ServicesClients } from '../components/ServicesClients';
import { ServicesLab } from '../components/ServicesLab';
import { Contact } from '../components/Contact';

export function GlobeServicesPage() {
  return (
    <>
      <Breadcrumb />
      <ServicesHero />
      <ServicesSolutions />
      <ServicesCards />
      <ServicesIndustries />
      <ServicesPresence />
      <ServicesClients />
      <ServicesLab />
      <Contact bgColor="bg-[#BA6347]" />
    </>
  );
}
