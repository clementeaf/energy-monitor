import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { getVisibleCalidadTabs, CALIDAD_TAB_LABELS, type CalidadTab } from './calidad-tabs';
import { CalidadDatosPage } from '../auditor/calidad-datos/CalidadDatosPage';
import { CalidadBackfillPage } from '../operacional/calidad/CalidadBackfillPage';

export function CalidadUnifiedPage() {
  const { hasAny } = usePermissions();
  const visibleTabs = getVisibleCalidadTabs(hasAny);
  const [activeTab, setActiveTab] = useState<CalidadTab>(visibleTabs[0] ?? 'scorecard');

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Sin permisos para ver calidad de datos.</p>
      </div>
    );
  }

  if (visibleTabs.length === 1) {
    return visibleTabs[0] === 'scorecard' ? <CalidadDatosPage /> : <CalidadBackfillPage />;
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
            {CALIDAD_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'scorecard' ? <CalidadDatosPage /> : <CalidadBackfillPage />}
      </div>
    </div>
  );
}
