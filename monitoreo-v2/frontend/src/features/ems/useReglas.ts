import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useAlertRulesQuery, useCreateAlertRule, useDeleteAlertRule, useUpdateAlertRule } from '../../hooks/queries/useAlertsQuery';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { AlertRule, AlertSeverity, CreateAlertRulePayload } from '../../types/alert';
import type { Building } from '../../types/building';
import type { Regla } from './alerts';
import { useGuardarConAviso } from './useGuardarConAviso';

export const TODOS_LOS_CENTROS = 'Todos los centros';

const TIPOS_REGLA: Record<string, { alertTypeCode: string; severity: AlertSeverity }> = {
  'Pico de demanda': { alertTypeCode: 'PEAK_DEMAND_EXCEEDED', severity: 'high' },
  Umbral: { alertTypeCode: 'ABNORMAL_CONSUMPTION', severity: 'medium' },
  'Desconexión': { alertTypeCode: 'METER_OFFLINE', severity: 'critical' },
  Margen: { alertTypeCode: 'ENERGY_DEVIATION', severity: 'medium' },
};

export const TIPOS_REGLA_LABELS = Object.keys(TIPOS_REGLA);

const CANALES: Record<string, { notifyEmail: boolean; notifyPush: boolean }> = {
  'Correo + app': { notifyEmail: true, notifyPush: true },
  Correo: { notifyEmail: true, notifyPush: false },
  'Solo en la app': { notifyEmail: false, notifyPush: true },
};

export const CANALES_LABELS = Object.keys(CANALES);

export function toRegla(rule: AlertRule, buildings: Building[]): Regla {
  const tipo = Object.keys(TIPOS_REGLA).find((key) => TIPOS_REGLA[key].alertTypeCode === rule.alertTypeCode);
  const canal = Object.keys(CANALES).find((key) =>
    CANALES[key].notifyEmail === rule.notifyEmail && CANALES[key].notifyPush === rule.notifyPush);
  return {
    id: rule.id,
    nombre: rule.name,
    tipo: tipo ?? rule.alertTypeCode,
    aplicaA: buildings.find((building) => building.id === rule.buildingId)?.name ?? TODOS_LOS_CENTROS,
    notifica: canal ?? 'Sin notificación',
    activa: rule.isActive,
  };
}

export function toCreateAlertRulePayload(regla: Omit<Regla, 'id'>, buildings: Building[]): CreateAlertRulePayload {
  const buildingId = buildings.find((building) => building.name === regla.aplicaA)?.id;
  return {
    name: regla.nombre,
    ...TIPOS_REGLA[regla.tipo],
    ...CANALES[regla.notifica],
    isActive: regla.activa,
    ...(buildingId ? { buildingId } : {}),
  };
}

interface ReglasApi {
  reglas: Regla[];
  agregar: (regla: Omit<Regla, 'id'>) => Promise<boolean>;
  alternar: (regla: Regla) => Promise<boolean>;
  eliminar: (regla: Regla) => Promise<boolean>;
}

export function useReglas(): ReglasApi {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const buildings = useBuildingsQuery().data ?? [];
  const rulesQuery = useAlertRulesQuery(undefined, { enabled: isAuthenticated });
  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const guardar = useGuardarConAviso();
  const reglasSimuladas = useAppStore((s) => s.reglas);
  const agregarRegla = useAppStore((s) => s.agregarRegla);
  const toggleRegla = useAppStore((s) => s.toggleRegla);
  const eliminarRegla = useAppStore((s) => s.eliminarRegla);

  if (!isAuthenticated) {
    return {
      reglas: reglasSimuladas,
      agregar: async (regla) => { agregarRegla(regla); return true; },
      alternar: async (regla) => { toggleRegla(regla.id); return true; },
      eliminar: async (regla) => { eliminarRegla(regla.id); return true; },
    };
  }

  return {
    reglas: (rulesQuery.data ?? []).map((rule) => toRegla(rule, buildings)),
    agregar: (regla) => guardar('crear la regla', () => createRule.mutateAsync(toCreateAlertRulePayload(regla, buildings))),
    alternar: (regla) => guardar('cambiar la regla', () => updateRule.mutateAsync({ id: regla.id, payload: { isActive: !regla.activa } })),
    eliminar: (regla) => guardar('eliminar la regla', () => deleteRule.mutateAsync(regla.id)),
  };
}
