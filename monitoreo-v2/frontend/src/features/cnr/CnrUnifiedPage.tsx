import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { getVisibleCnrTabs, CNR_TAB_LABELS, type CnrTab } from './cnr-tabs';
import { CnrPendientesPage } from '../operacional/cnr/CnrPendientesPage';
import { IngresoCnrPage } from '../tecnico/cnr/IngresoCnrPage';

export function CnrUnifiedPage() {
  const { hasAny } = usePermissions();
  const visibleTabs = getVisibleCnrTabs(hasAny);
  const [activeTab, setActiveTab] = useState<CnrTab>(visibleTabs[0] ?? 'pendientes');

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Sin permisos para CNR.</p>
      </div>
    );
  }

  if (visibleTabs.length === 1) {
    return visibleTabs[0] === 'pendientes' ? <CnrPendientesPage /> : <IngresoCnrPage />;
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
            {CNR_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'pendientes' ? <CnrPendientesPage /> : <IngresoCnrPage />}
      </div>
    </div>
  );
}
