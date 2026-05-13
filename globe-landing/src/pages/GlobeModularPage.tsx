import { Breadcrumb } from '../components/Breadcrumb';
import { ModularHero } from '../components/ModularHero';
import { ModularSolutions } from '../components/ModularSolutions';
import { ModularValueProp } from '../components/ModularValueProp';
import { ModularProcess } from '../components/ModularProcess';
import { ModularProjects } from '../components/ModularProjects';
import { ModularClients } from '../components/ModularClients';
import { ModularContact } from '../components/ModularContact';

export function GlobeModularPage() {
  return (
    <>
      <Breadcrumb label="Globe Modular" />
      <ModularHero />
      <ModularSolutions />
      <ModularValueProp />
      <ModularProcess />
      <ModularProjects />
      <ModularClients />
      <ModularContact />
    </>
  );
}
