import { useSearchParams } from 'react-router';
import { MetersPage } from './MetersPage';
import { RealtimePage } from '../monitoring/realtime/RealtimePage';
import { DevicesPage } from '../monitoring/devices/DevicesPage';
import { MetersByTypePage } from '../monitoring/meters-by-type/MetersByTypePage';
import { PillToggle } from '../../components/ui/PillToggle';

const TABS = [
  { key: 'realtime', label: 'Tiempo Real' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'devices', label: 'Dispositivos' },
  { key: 'by-type', label: 'Por Tipo' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Unified meters hub with Handle-style pill tabs.
 */
export function MetersUnifiedPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'realtime') as TabKey;

  const handleTab = (key: TabKey): void => {
    setParams(key === 'realtime' ? {} : { tab: key }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PillToggle
        options={TABS.map((t) => ({ key: t.key, label: t.label }))}
        value={activeTab}
        onChange={handleTab}
      />
      <div>
        {activeTab === 'realtime' && <RealtimePage />}
        {activeTab === 'inventory' && <MetersPage />}
        {activeTab === 'devices' && <DevicesPage />}
        {activeTab === 'by-type' && <MetersByTypePage />}
      </div>
    </div>
  );
}
