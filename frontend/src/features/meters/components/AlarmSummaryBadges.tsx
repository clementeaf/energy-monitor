import { useMemo } from 'react';
import { useMeterAlarmSummary } from '../../../hooks/queries/useMeters';

const ALARM_META: Record<string, { label: string; color: string }> = {
  MODBUS_CRC_ERROR:   { label: 'Error CRC',        color: 'bg-red-500/20 text-red-400' },
  BREAKER_OPEN:       { label: 'Breaker Abierto',   color: 'bg-red-500/20 text-red-400' },
  HIGH_THD:           { label: 'THD Alta',           color: 'bg-orange-500/20 text-orange-400' },
  PHASE_IMBALANCE:    { label: 'Desbalance',         color: 'bg-orange-500/20 text-orange-400' },
  UNDERVOLTAGE:       { label: 'Bajo Voltaje',       color: 'bg-yellow-500/20 text-yellow-400' },
  OVERVOLTAGE:        { label: 'Alto Voltaje',       color: 'bg-yellow-500/20 text-yellow-400' },
  LOW_POWER_FACTOR:   { label: 'FP Bajo',            color: 'bg-purple-500/20 text-purple-400' },
  HIGH_DEMAND:        { label: 'Alta Demanda',       color: 'bg-blue-500/20 text-blue-400' },
};

export function AlarmSummaryBadges({ meterId }: { meterId: string }) {
  const range = useMemo(() => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return { from, to };
  }, []);

  const { data, isLoading } = useMeterAlarmSummary(meterId, range.from, range.to);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-lg bg-raised" />
        ))}
      </div>
    );
  }

  if (!data || data.total === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {data.byType.map((item) => {
        const meta = ALARM_META[item.alarm] ?? { label: item.alarm, color: 'bg-gray-500/20 text-gray-400' };
        return (
          <span
            key={item.alarm}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.color}`}
          >
            {meta.label}
            <span className="opacity-70">{item.count}</span>
          </span>
        );
      })}
    </div>
  );
}
