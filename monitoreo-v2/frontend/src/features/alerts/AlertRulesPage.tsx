import { useState } from 'react';
import { TableStateBody } from '../../components/ui/TableStateBody';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useQueryState } from '../../hooks/useQueryState';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import {
  useAlertRulesQuery,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from '../../hooks/queries/useAlertsQuery';
import { useEvaluateAlerts } from '../../hooks/queries/useAlertEngineQuery';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import {
  ALERT_FAMILIES,
  FAMILY_LABELS,
  ALERT_TYPE_LABELS,
  type AlertFamily,
} from '../../types/alert-engine';
import type { AlertRule, UpdateAlertRulePayload } from '../../types/alert';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

export function AlertRulesPage() {
  const [familyFilter, setFamilyFilter] = useState<AlertFamily | ''>('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const rulesQuery = useAlertRulesQuery(buildingFilter || undefined);
  const buildingsQuery = useBuildingsQuery();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const evaluate = useEvaluateAlerts();

  const qs = useQueryState(rulesQuery, {
    isEmpty: (data) => !data || data.length === 0,
  });

  const rules = rulesQuery.data ?? [];
  const filtered = familyFilter
    ? rules.filter((r) => ALERT_FAMILIES[familyFilter].includes(r.alertTypeCode))
    : rules;

  const { visible: visibleRules, hasMore, sentinelRef, total } = useInfiniteScroll(filtered, [familyFilter, buildingFilter]);

  const handleToggle = (rule: AlertRule) => {
    updateRule.mutate({
      id: rule.id,
      payload: { isActive: !rule.isActive },
    });
  };

  const handleSaveConfig = () => {
    if (!editingRule) return;
    updateRule.mutate(
      {
        id: editingRule.id,
        payload: {
          config: editingRule.config,
          severity: editingRule.severity,
          escalationL1Minutes: editingRule.escalationL1Minutes,
          escalationL2Minutes: editingRule.escalationL2Minutes,
          escalationL3Minutes: editingRule.escalationL3Minutes,
        } as UpdateAlertRulePayload,
      },
      { onSuccess: () => { setEditingRule(null); } },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Reglas de Alertas</h1>
        <button
          type="button"
          onClick={() => { evaluate.mutate(); }}
          disabled={evaluate.isPending}
          className="rounded-md bg-pa-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {evaluate.isPending ? 'Evaluando...' : 'Evaluar Ahora'}
        </button>
      </div>

      {evaluate.data && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          Evaluacion completada: {evaluate.data.created} alertas creadas, {evaluate.data.autoResolved} auto-resueltas
        </div>
      )}

      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500">Familia</label>
          <DropdownSelect
            options={[
              { value: '', label: 'Todas' },
              ...(Object.keys(ALERT_FAMILIES) as AlertFamily[]).map((f) => ({ value: f, label: FAMILY_LABELS[f] })),
            ]}
            value={familyFilter}
            onChange={(val) => { setFamilyFilter(val as AlertFamily | ''); }}
            className="w-48"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Edificio</label>
          <DropdownSelect
            options={[
              { value: '', label: 'Todos (globales)' },
              ...(buildingsQuery.data ?? []).map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={buildingFilter}
            onChange={(val) => { setBuildingFilter(val); }}
            className="w-48"
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Severidad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Intervalo</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Escalamiento</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Activa</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <TableStateBody
            phase={qs.phase}
            colSpan={7}
            error={qs.error}
            onRetry={() => { rulesQuery.refetch(); }}
            emptyMessage="Sin reglas de alerta configuradas"
            skeletonWidths={['w-24', 'w-28', 'w-16', 'w-16', 'w-32', 'w-12', 'w-20']}
          >
            {visibleRules.map((rule) => (
              <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-mono text-xs">{ALERT_TYPE_LABELS[rule.alertTypeCode] ?? rule.alertTypeCode}</td>
                <td className="px-4 py-3">{rule.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[rule.severity] ?? ''}`}>
                    {rule.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{rule.checkIntervalSeconds}s</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  L1: {rule.escalationL1Minutes}m / L2: {rule.escalationL2Minutes}m / L3: {rule.escalationL3Minutes}m
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => { handleToggle(rule); }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      rule.isActive ? 'bg-pa-blue' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      rule.isActive ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => { setEditingRule({ ...rule }); }}
                    className="text-pa-blue hover:underline text-xs mr-2"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm('Eliminar regla?')) deleteRule.mutate(rule.id); }}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </TableStateBody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
      {total > 0 && <p className="px-4 py-2 text-xs text-pa-text-muted">Mostrando {visibleRules.length} de {total}</p>}

      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold">
              Editar: {ALERT_TYPE_LABELS[editingRule.alertTypeCode] ?? editingRule.alertTypeCode}
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-500">Severidad</label>
              <select
                value={editingRule.severity}
                onChange={(e) => { setEditingRule({ ...editingRule, severity: e.target.value as AlertRule['severity'] }); }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {['low', 'medium', 'high', 'critical'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500">L1 (min)</label>
                <input
                  type="number"
                  value={editingRule.escalationL1Minutes}
                  onChange={(e) => { setEditingRule({ ...editingRule, escalationL1Minutes: +e.target.value }); }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">L2 (min)</label>
                <input
                  type="number"
                  value={editingRule.escalationL2Minutes}
                  onChange={(e) => { setEditingRule({ ...editingRule, escalationL2Minutes: +e.target.value }); }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">L3 (min)</label>
                <input
                  type="number"
                  value={editingRule.escalationL3Minutes}
                  onChange={(e) => { setEditingRule({ ...editingRule, escalationL3Minutes: +e.target.value }); }}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Config (JSON)</label>
              <textarea
                rows={4}
                value={JSON.stringify(editingRule.config, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingRule({ ...editingRule, config: parsed });
                  } catch { /* ignore invalid JSON while typing */ }
                }}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingRule(null); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={updateRule.isPending}
                className="rounded-md bg-pa-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
