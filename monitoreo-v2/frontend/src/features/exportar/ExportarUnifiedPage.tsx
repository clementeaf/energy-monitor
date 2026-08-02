import { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { getVisibleExportarTabs, EXPORTAR_TAB_LABELS, type ExportarTab } from './exportar-tabs';
import { ExportarReportesPage } from '../dashboard/exportar/ExportarReportesPage';
import { ExportarEvidenciaPage } from '../auditor/evidencia/ExportarEvidenciaPage';

export function ExportarUnifiedPage() {
  const { hasAny } = usePermissions();
  const visibleTabs = getVisibleExportarTabs(hasAny);
  const [activeTab, setActiveTab] = useState<ExportarTab>(visibleTabs[0] ?? 'reportes');

  if (visibleTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">Sin permisos para exportar.</p>
      </div>
    );
  }

  if (visibleTabs.length === 1) {
    return visibleTabs[0] === 'reportes' ? <ExportarReportesPage /> : <ExportarEvidenciaPage />;
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
            {EXPORTAR_TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'reportes' ? <ExportarReportesPage /> : <ExportarEvidenciaPage />}
      </div>
    </div>
  );
}
