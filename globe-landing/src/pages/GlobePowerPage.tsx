import { Breadcrumb } from '../components/Breadcrumb';
import { PowerHero } from '../components/PowerHero';
import { PowerPresence } from '../components/PowerPresence';
import { PowerValueProp } from '../components/PowerValueProp';
import { PowerArchitecture } from '../components/PowerArchitecture';
import { PowerSiemens } from '../components/PowerSiemens';
import { PowerProcess } from '../components/PowerProcess';
import { PowerServices } from '../components/PowerServices';
import { PowerClients } from '../components/PowerClients';
import { PowerContact } from '../components/PowerContact';

export function GlobePowerPage() {
  return (
    <>
      <Breadcrumb label="Globe Power" />
      <PowerHero />
      <PowerPresence />
      <PowerValueProp />
      <PowerArchitecture />
      <PowerSiemens />
      <PowerProcess />
      <PowerServices />
      <PowerClients />
      <PowerContact />
    </>
  );
}
