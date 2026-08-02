import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { getVisibleAlertTabs, ALERT_TAB_LABELS, type AlertTab } from './alertas-tabs';
import { AlarmasAgregadasPage } from '../dashboard/alarmas/AlarmasAgregadasPage';
import { AlarmasEventosPage } from '../operacional/alarmas/AlarmasEventosPage';

export function AlertasUnifiedPage() {
  const { hasAny } = usePermissions();
  const visibleTabs = getVisibleAlertTabs(hasAny);
  const [activeTab, setActiveTab] = useState<AlertTab>(visibleTabs[0] ?? 'resumen');

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Sin permisos para ver alertas.</p>
      </div>
    );
  }

  if (visibleTabs.length === 1) {
    return visibleTabs[0] === 'resumen' ? <AlarmasAgregadasPage /> : <AlarmasEventosPage />;
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 border-b border-border">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {ALERT_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'resumen' ? <AlarmasAgregadasPage /> : <AlarmasEventosPage />}
      </div>
    </div>
  );
}
