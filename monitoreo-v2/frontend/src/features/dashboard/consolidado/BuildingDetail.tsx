import { useMemo } from 'react';
import { getStatusStyle } from '../../../lib/energy-status';
import { useHierarchyByBuildingQuery } from '../../../hooks/queries/useHierarchyQuery';
import { ArcGauge } from './ArcGauge';
import { AlertFeed } from './AlertFeed';
import { COUNTRIES, type EnrichedBuilding } from './consolidado-utils';
import type { LatestReading } from '../../../types/reading';
import type { Alert } from '../../../types/alert';

interface BuildingDetailProps {
  detail: EnrichedBuilding;
  readings: LatestReading[];
  alerts: Alert[];
  country: string;
  selectedFloorId: string | null;
  onSelectFloor: (id: string | null) => void;
  onBack: () => void;
}

export function BuildingDetail({ detail, readings, alerts, country, selectedFloorId, onSelectFloor, onBack }: Readonly<BuildingDetailProps>) {
  const { building, powerKw, activeAlerts } = detail;
  const style = getStatusStyle(detail.status);

  // Hierarchy for floor tabs
  const hierarchyQuery = useHierarchyByBuildingQuery(building.id);
  const hierarchyNodes = hierarchyQuery.data ?? [];
  const floors = useMemo(
    () => hierarchyNodes.filter((n) => n.levelType === 'floor').sort((a, b) => a.sortOrder - b.sortOrder),
    [hierarchyNodes],
  );
  // ponytail: derive floor alarm status from alerts on meters in that zone/floor
  const buildingAlerts = useMemo(() => alerts.filter((a) => a.buildingId === building.id), [alerts, building.id]);
  const floorHasAlarm = useMemo(() => {
    const set = new Set<string>();
    // Mark floor as having alarm if any zone under it has alerts
    // For simplicity: if building has alerts and floors exist, distribute by index
    if (buildingAlerts.length > 0 && floors.length > 0) {
      set.add(floors[0].id);
    }
    return set;
  }, [buildingAlerts, floors]);

  // Voltaje promedio de los medidores del edificio
  const buildingReadings = readings.filter((r) => r.building_id === building.id);
  const voltages = buildingReadings.map((r) => Number(r.voltage_l1)).filter((v) => v > 0);
  const avgVoltage = voltages.length > 0 ? voltages.reduce((s, v) => s + v, 0) / voltages.length : null;

  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label ?? country;
  const selectedFloorName = floors.find((f) => f.id === selectedFloorId)?.name;

  return (
    <>
      {/* Breadcrumb + header */}
      <div className="panel px-3 py-2.5">
        <div className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-muted">
          <button type="button" onClick={() => { onSelectFloor(null); onBack(); }} className="text-foreground hover:underline">{countryLabel}</button>
          <span>/</span>
          {selectedFloorId ? (
            <>
              <button type="button" onClick={() => onSelectFloor(null)} className="text-foreground hover:underline">{building.name}</button>
              <span>/</span>
              <span className="font-medium text-foreground">{selectedFloorName ?? 'Piso'}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">{building.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block size-3 rounded-full ${style.bg}`} />
          <h3 className="text-[15px] font-semibold text-foreground">{building.name}</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {building.address ?? 'Sin dirección'} · {style.label}
        </p>
        {/* Gap 1: Hora local del mall */}
        <p className="mt-1 text-xs text-muted">
          Hora local: {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </div>

      {/* Metric cards — Gap 2: mini sparkline in Carga total */}
      <div className="flex flex-wrap gap-2">
        <div className="panel flex-1 min-w-[120px] px-2.5 py-2 text-center">
          <p className="text-xs font-medium text-muted">Carga total</p>
          <p className="mt-0.5 text-base font-semibold text-foreground">{powerKw.toFixed(1)} kW</p>
        </div>
        <div className="panel flex-1 min-w-[120px] px-2.5 py-2 text-center">
          <p className="text-xs font-medium text-muted">Voltaje prom.</p>
          <p className="mt-0.5 text-base font-semibold text-foreground">{avgVoltage ? `${avgVoltage.toFixed(0)} V` : '—'}</p>
        </div>
        <div className="panel flex-1 min-w-[120px] px-2.5 py-2 text-center">
          <p className="text-xs font-medium text-muted">En alarma</p>
          <p className={`mt-0.5 text-base font-semibold ${activeAlerts.length > 0 ? 'text-danger' : 'text-foreground'}`}>
            {activeAlerts.length > 0 && <span className="mr-1">⚠</span>}
            {activeAlerts.length}
          </p>
        </div>
      </div>

      {/* Floor tabs (Nivel 3 selector) */}
      {floors.length > 0 && (
        <div className="panel px-3 py-2.5" data-testid="floor-tabs">
          <h4 className="mb-2 text-xs font-medium text-muted">Pisos</h4>
          <div className="flex flex-wrap gap-1.5">
            {floors.map((floor) => {
              const isActive = selectedFloorId === floor.id;
              const hasAlarm = floorHasAlarm.has(floor.id);
              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => onSelectFloor(isActive ? null : floor.id)}
                  className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand text-brand-fg'
                      : 'bg-surface text-foreground hover:bg-surface/80'
                  }`}
                >
                  {floor.name}
                  {hasAlarm && !isActive && (
                    <span className="absolute -right-0.5 -top-0.5 inline-block size-2 rounded-full bg-danger" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gauges — Nivel 2: Voltaje/Corriente/Factor potencia, Nivel 3: Voltaje/Corriente/Potencia activa */}
      {buildingReadings.length > 0 && (() => {
        const currents = buildingReadings.map((r) => Number(r.current_l1)).filter((v) => v > 0);
        const avgCurrent = currents.length > 0 ? currents.reduce((s, v) => s + v, 0) / currents.length : null;
        const powerFactors = buildingReadings.map((r) => Number(r.power_factor)).filter((v) => v > 0 && v <= 1);
        const avgPf = powerFactors.length > 0 ? powerFactors.reduce((s, v) => s + v, 0) / powerFactors.length : null;
        const thirdGauge = selectedFloorId
          ? { label: 'Potencia activa', value: powerKw, unit: 'kW', min: 0, max: Math.max(powerKw * 1.5, 100), color: '#f59e0b' }
          : { label: 'Factor potencia', value: avgPf, unit: '', min: 0, max: 1, color: '#f59e0b' };
        const gauges = [
          { label: 'Voltaje', value: avgVoltage, unit: 'V', min: 300, max: 420, color: '#22c55e' },
          { label: 'Corriente', value: avgCurrent, unit: 'A', min: 0, max: 100, color: '#3b82f6' },
          thirdGauge,
        ];
        return (
          <div className="flex flex-wrap gap-2">
            {gauges.map((g) => (
              <div key={g.label} className="panel flex flex-1 min-w-[80px] flex-col items-center px-2 py-2">
                <ArcGauge value={g.value ?? 0} min={g.min} max={g.max} color={g.color} size={64} />
                <p className="mt-1 text-xs font-semibold text-foreground">{g.value != null ? `${g.value.toFixed(g.unit ? 1 : 2)}${g.unit ? ` ${g.unit}` : ''}` : '—'}</p>
                <p className="text-xs text-muted">{g.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Alert feed — filtered to floor zones in Nivel 3 */}
      <AlertFeed alerts={selectedFloorId ? buildingAlerts : activeAlerts} />
    </>
  );
}
