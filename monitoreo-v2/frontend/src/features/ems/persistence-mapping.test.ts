import { describe, expect, it } from 'vitest';
import type { AlertRule } from '../../types/alert';
import type { Building } from '../../types/building';
import type { ScheduledReport } from '../../types/report';
import { toCreateAlertRulePayload, toRegla } from './useReglas';
import { toCreateScheduledReportPayload, toReporteProgramado } from './useReportesProgramados';

const BUILDINGS = [{ id: 'b-q', name: 'Quilicura' }] as Building[];

describe('alert rule mapping', () => {
  it('round-trips a demo rule through the alert-rules API shape', () => {
    const payload = toCreateAlertRulePayload(
      { nombre: 'Caída de equipos', tipo: 'Desconexión', aplicaA: 'Quilicura', notifica: 'Correo', activa: true },
      BUILDINGS,
    );

    expect(payload).toEqual({
      name: 'Caída de equipos', alertTypeCode: 'METER_OFFLINE', severity: 'critical',
      notifyEmail: true, notifyPush: false, isActive: true, buildingId: 'b-q',
    });
    expect(toRegla({ ...payload, id: 'r-1', buildingId: 'b-q' } as AlertRule, BUILDINGS))
      .toEqual({ id: 'r-1', nombre: 'Caída de equipos', tipo: 'Desconexión', aplicaA: 'Quilicura', notifica: 'Correo', activa: true });
  });

  it('applies to every centro when no building is chosen', () => {
    expect(toCreateAlertRulePayload({ nombre: 'x', tipo: 'Umbral', aplicaA: 'Todos los centros', notifica: 'Solo en la app', activa: true }, BUILDINGS))
      .not.toHaveProperty('buildingId');
  });
});

describe('scheduled report mapping', () => {
  it('turns demo labels into a cron schedule and back', () => {
    const payload = toCreateScheduledReportPayload(
      { nombre: 'Picos de demanda', alcance: 'Quilicura', frecuencia: 'Semanal · lunes', formato: 'Excel' },
      BUILDINGS,
      'ops@example.com',
    );

    expect(payload).toEqual({ reportType: 'demand', buildingId: 'b-q', format: 'excel', cronExpression: '0 8 * * 1', recipients: ['ops@example.com'], isActive: true });
    expect(toReporteProgramado({ ...payload, id: 's-1' } as ScheduledReport, BUILDINGS))
      .toEqual({ id: 's-1', nombre: 'Picos de demanda', alcance: 'Quilicura', frecuencia: 'Semanal · lunes', formato: 'Excel', activo: true });
  });
});
