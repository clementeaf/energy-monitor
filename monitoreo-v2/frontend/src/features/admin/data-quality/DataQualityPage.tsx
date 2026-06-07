import { useState } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import { DataQualityReportTab } from './DataQualityReportTab';
import { DataQualityBalanceTab } from './DataQualityBalanceTab';
import { DataQualitySloTab } from './DataQualitySloTab';
import { DataQualityContractsTab } from './DataQualityContractsTab';

type DataQualityTab = 'report' | 'balance' | 'slo' | 'contracts';

const TAB_CLASS = (active: boolean): string =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface hover:text-foreground'
  }`;

/**
 * Admin data quality hub with report, balance, SLO and contracts tabs.
 */
export function DataQualityPage() {
  const { has } = usePermissions();
  const canRead = has('data_quality', 'read');
  const [tab, setTab] = useState<DataQualityTab>('report');

  if (!canRead) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-muted">
        No tiene permisos para ver calidad de datos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calidad de Datos" eyebrow="Administración" />

      <nav className="flex flex-wrap gap-2" aria-label="Calidad de datos">
        <button type="button" className={TAB_CLASS(tab === 'report')} onClick={() => { setTab('report'); }}>Reporte diario</button>
        <button type="button" className={TAB_CLASS(tab === 'balance')} onClick={() => { setTab('balance'); }}>Balance</button>
        <button type="button" className={TAB_CLASS(tab === 'slo')} onClick={() => { setTab('slo'); }}>SLO breaches</button>
        <button type="button" className={TAB_CLASS(tab === 'contracts')} onClick={() => { setTab('contracts'); }}>Contratos ETL</button>
      </nav>

      {tab === 'report' && <DataQualityReportTab />}
      {tab === 'balance' && <DataQualityBalanceTab />}
      {tab === 'slo' && <DataQualitySloTab />}
      {tab === 'contracts' && <DataQualityContractsTab />}
    </div>
  );
}
