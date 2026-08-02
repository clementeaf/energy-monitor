import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card } from '../../../components/ui/Card';
import { TableStateBody } from '../../../components/ui/TableStateBody';
import { ReadingQualityBadge } from '../../../components/ui/ReadingQualityBadge';
import { fmtNum } from '../../../lib/formatters';
import type { Reading } from '../../../types/reading';
import { groupByDay, avgNonNull, maxNonNull } from './meter-readings-utils';

interface DaySummaryTableProps {
  readings: Reading[];
  alertTimestamps: string[];
  meterId: string;
}

export function DaySummaryTable({ readings, alertTimestamps, meterId }: Readonly<DaySummaryTableProps>) {
  const daySummaries = useMemo(() => groupByDay(readings, alertTimestamps), [readings, alertTimestamps]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col" noPadding>
      <div className="px-6 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Resumen diario</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 pb-4">
        <table className="min-w-full divide-y divide-border">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <Th>Dia</Th>
              <Th>Lecturas</Th>
              <Th>Incidencias</Th>
              <Th>Calidad</Th>
              <Th>Pot. prom. (kW)</Th>
              <Th>Pot. peak (kW)</Th>
              <Th colSpan={3}>Voltaje (V)</Th>
              <Th colSpan={3}>Corriente (A)</Th>
              <Th>React. (kVAr)</Th>
              <Th>FP</Th>
              <Th>Frec. (Hz)</Th>
            </tr>
            <tr>
              <Th /><Th /><Th /><Th /><Th /><Th />
              <ThSub>L1</ThSub><ThSub>L2</ThSub><ThSub>L3</ThSub>
              <ThSub>L1</ThSub><ThSub>L2</ThSub><ThSub>L3</ThSub>
              <Th /><Th /><Th />
            </tr>
          </thead>
          <TableStateBody
            phase={daySummaries.length === 0 ? 'empty' : 'ready'}
            colSpan={15}
            emptyMessage="Sin lecturas para este mes."
          >
            {daySummaries.map((d) => (
              <tr key={d.day} className="hover:bg-surface">
                <Td>{d.label}</Td>
                <Td>{d.count}</Td>
                <Td>
                  {d.alertCount > 0 ? (
                    <Link to={`/alerts?meterId=${meterId}&date=${d.day}`} className="text-danger underline hover:text-danger">
                      {d.alertCount}
                    </Link>
                  ) : '—'}
                </Td>
                <Td><ReadingQualityBadge quality={d.dominantQuality} source={d.primarySource} compact /></Td>
                <Td>{fmtNum(d.avgPowerKw, 2)}</Td>
                <Td>{fmtNum(d.peakPowerKw, 2)}</Td>
                <Td>{fmtNum(d.avgVoltageL1)}</Td>
                <Td>{fmtNum(d.avgVoltageL2)}</Td>
                <Td>{fmtNum(d.avgVoltageL3)}</Td>
                <Td>{fmtNum(d.avgCurrentL1)}</Td>
                <Td>{fmtNum(d.avgCurrentL2)}</Td>
                <Td>{fmtNum(d.avgCurrentL3)}</Td>
                <Td>{fmtNum(d.avgReactivePowerKvar)}</Td>
                <Td>{fmtNum(d.avgPowerFactor, 3)}</Td>
                <Td>{fmtNum(d.avgFrequencyHz)}</Td>
              </tr>
            ))}
            {daySummaries.length > 0 && (
              <tr className="border-t-2 border-border bg-surface font-semibold">
                <Td>Total</Td>
                <Td>{daySummaries.reduce((s, d) => s + d.count, 0)}</Td>
                <Td>{daySummaries.reduce((s, d) => s + d.alertCount, 0) || '—'}</Td>
                <Td>—</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgPowerKw)), 2)}</Td>
                <Td>{fmtNum(maxNonNull(daySummaries.map((d) => d.peakPowerKw)), 2)}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgVoltageL1)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgVoltageL2)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgVoltageL3)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgCurrentL1)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgCurrentL2)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgCurrentL3)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgReactivePowerKvar)))}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgPowerFactor)), 3)}</Td>
                <Td>{fmtNum(avgNonNull(daySummaries.map((d) => d.avgFrequencyHz)))}</Td>
              </tr>
            )}
          </TableStateBody>
        </table>
      </div>
    </Card>
  );
}

function Th({ children, colSpan }: Readonly<{ children?: React.ReactNode; colSpan?: number }>) {
  return <th colSpan={colSpan} className="px-3 py-2 text-left text-xs font-medium text-muted">{children}</th>;
}

function ThSub({ children }: Readonly<{ children: React.ReactNode }>) {
  return <th className="px-3 py-1 text-left text-xs font-medium text-subtle">{children}</th>;
}

function Td({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <td className={`whitespace-nowrap px-3 py-2.5 text-sm text-foreground ${className}`}>{children}</td>;
}
