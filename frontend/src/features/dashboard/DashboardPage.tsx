import { Card } from '../../components/ui/Card';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  BUILDINGS_MONTHLY,
  SUMMARY_CARDS,
  OVERDUE_BY_PERIOD,
  type BuildingMonthly,
  type OverduePeriod,
} from './mockData';

const fmt = (n: number) => n.toLocaleString('es-CL');
const fmtClp = (n: number) => `$${n.toLocaleString('es-CL')}`;

const buildingCols: Column<BuildingMonthly>[] = [
  { label: 'Edificio', value: (r) => r.name, align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmt(r.consumoKwh), total: (d) => fmt(d.reduce((s, r) => s + r.consumoKwh, 0)) },
  { label: 'Gasto ($)', value: (r) => fmtClp(r.gastoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.gastoClp, 0)) },
  { label: 'Superficie (m²)', value: (r) => fmt(r.metros), total: (d) => fmt(d.reduce((s, r) => s + r.metros, 0)) },
  { label: 'Medidores', value: (r) => fmt(r.medidores), total: (d) => fmt(d.reduce((s, r) => s + r.medidores, 0)) },
];

const overdueCols: Column<OverduePeriod>[] = [
  { label: 'Período', value: (r) => r.range, align: 'left' },
  { label: 'Cantidad Docs', value: (r) => fmt(r.cantidad), total: (d) => fmt(d.reduce((s, r) => s + r.cantidad, 0)) },
  { label: 'Saldo Vencido ($)', value: (r) => fmtClp(r.saldoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.saldoClp, 0)) },
];

export function DashboardPage() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-auto">
      <h1 className="text-xl font-bold text-text">Dashboard</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">Gasto y Consumo Mensual por Edificio</h2>
        <DataTable
          data={BUILDINGS_MONTHLY}
          columns={buildingCols}
          rowKey={(r) => r.name}
          footer
          maxHeight="max-h-[420px]"
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SUMMARY_CARDS.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-text">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.description}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">Documentos Vencidos por Período</h2>
        <DataTable
          data={OVERDUE_BY_PERIOD}
          columns={overdueCols}
          rowKey={(r) => r.range}
          footer
          maxHeight="max-h-60"
        />
      </Card>
    </div>
  );
}
