import { Breadcrumb } from '../components/Breadcrumb';
import { PowerHero } from '../components/PowerHero';
import { PowerPresence } from '../components/PowerPresence';
import { PowerValueProp } from '../components/PowerValueProp';
import { PowerPainPoints } from '../components/PowerPainPoints';
import { PowerArchitecture } from '../components/PowerArchitecture';
import { PowerSiemens } from '../components/PowerSiemens';
import { PowerProcess } from '../components/PowerProcess';
import { Contact } from '../components/Contact';

export function GlobePowerPage() {
  return (
    <>
      <Breadcrumb label="Globe Power" />
      <PowerHero />
      <PowerPresence />
      <PowerValueProp />
      <PowerPainPoints />
      <PowerArchitecture />
      <PowerSiemens />
      <PowerProcess />
      <Contact />
    </>
  );
}
