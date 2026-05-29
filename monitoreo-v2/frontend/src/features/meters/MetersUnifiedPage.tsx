import { useSearchParams } from 'react-router';
import { MetersPage } from './MetersPage';
import { RealtimePage } from '../monitoring/realtime/RealtimePage';
import { DevicesPage } from '../monitoring/devices/DevicesPage';
import { MetersByTypePage } from '../monitoring/meters-by-type/MetersByTypePage';

const TABS = [
  { key: 'realtime', label: 'Tiempo Real' },
  { key: 'inventory', label: 'Inventario' },
  { key: 'devices', label: 'Dispositivos' },
  { key: 'by-type', label: 'Por Tipo' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function MetersUnifiedPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'realtime') as TabKey;

  const handleTab = (key: TabKey) => {
    setParams(key === 'realtime' ? {} : { tab: key }, { replace: true });
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-pa-border px-4 pt-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => handleTab(t.key)}
            className={`rounded-t-lg px-4 py-2 text-[13px] font-medium transition-colors ${
              activeTab === t.key
                ? 'border-b-2 border-pa-blue bg-white text-pa-blue'
                : 'text-pa-text-muted hover:bg-gray-50 hover:text-pa-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'realtime' && <RealtimePage />}
        {activeTab === 'inventory' && <MetersPage />}
        {activeTab === 'devices' && <DevicesPage />}
        {activeTab === 'by-type' && <MetersByTypePage />}
      </div>
    </div>
  );
}
