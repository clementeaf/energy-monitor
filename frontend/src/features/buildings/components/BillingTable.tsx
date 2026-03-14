import type { BillingMonthlySummary } from '../../../types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function monthName(iso: string): string {
  const m = new Date(iso).getMonth();
  return MONTH_NAMES[m] ?? iso;
}

function fmtClp(n: number): string {
  return '$' + n.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

function fmtNum(n: number, decimals = 1): string {
  return n.toLocaleString('es-CL', { maximumFractionDigits: decimals });
}

type Col = {
  label: string;
  value: (r: BillingMonthlySummary) => string;
  total: (data: BillingMonthlySummary[]) => string;
  align?: 'left' | 'right';
};

const columns: Col[] = [
  { label: 'Mes', value: (r) => monthName(r.month), total: () => 'Total anual', align: 'left' },
  { label: 'Consumo (kWh)', value: (r) => fmtNum(r.totalKwh), total: (d) => fmtNum(d.reduce((s, r) => s + r.totalKwh, 0)) },
  { label: 'Energía ($)', value: (r) => fmtClp(r.energiaClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.energiaClp, 0)) },
  { label: 'Dda. máx. (kW)', value: (r) => fmtNum(r.ddaMaxKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.ddaMaxKw))) },
  { label: 'Dda. punta (kW)', value: (r) => fmtNum(r.ddaMaxPuntaKw), total: (d) => fmtNum(Math.max(...d.map((r) => r.ddaMaxPuntaKw))) },
  { label: 'kWh troncal', value: (r) => fmtNum(r.kwhTroncal), total: (d) => fmtNum(d.reduce((s, r) => s + r.kwhTroncal, 0)) },
  { label: 'kWh serv. público', value: (r) => fmtNum(r.kwhServPublico), total: (d) => fmtNum(d.reduce((s, r) => s + r.kwhServPublico, 0)) },
  { label: 'Cargo fijo ($)', value: (r) => fmtClp(r.cargoFijoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.cargoFijoClp, 0)) },
  { label: 'Neto ($)', value: (r) => fmtClp(r.totalNetoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalNetoClp, 0)) },
  { label: 'IVA ($)', value: (r) => fmtClp(r.ivaClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.ivaClp, 0)) },
  { label: 'Exento ($)', value: (r) => fmtClp(r.montoExentoClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.montoExentoClp, 0)) },
  { label: 'Total c/IVA ($)', value: (r) => fmtClp(r.totalConIvaClp), total: (d) => fmtClp(d.reduce((s, r) => s + r.totalConIvaClp, 0)) },
];

interface BillingTableProps {
  data: BillingMonthlySummary[];
}

export function BillingTable({ data }: BillingTableProps) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-border text-xs text-muted">
            {columns.map((col) => (
              <th
                key={col.label}
                className={`whitespace-nowrap py-2 pr-6 font-medium ${col.align === 'left' ? 'text-left' : 'text-right'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month} className="border-b border-border/50 text-text">
              {columns.map((col) => (
                <td
                  key={col.label}
                  className={`whitespace-nowrap py-2 pr-6 tabular-nums ${col.align === 'left' ? '' : 'text-right'}`}
                >
                  {col.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-white">
          <tr className="border-t border-border font-medium text-text">
            {columns.map((col) => (
              <td
                key={col.label}
                className={`whitespace-nowrap py-2 pr-6 tabular-nums ${col.align === 'left' ? '' : 'text-right'}`}
              >
                {col.total(data)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
