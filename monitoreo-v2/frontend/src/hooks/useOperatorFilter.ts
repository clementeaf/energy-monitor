import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from './usePermissions';
import { useMetersQuery } from './queries/useMetersQuery';

/**
 * Operator-scoped filtering for monitoreo-v2.
 *
 * Maps viewAsRole to v1 user modes:
 *   super_admin (no impersonation) → Holding   (full access)
 *   corp_admin                     → Multi Operador (filter by operator name)
 *   site_admin                     → Operador  (filter by operator + building)
 *   operator                       → Técnico   (hide financial)
 *   tenant_user                    → Locatario  (own invoices only)
 */
export function useOperatorFilter() {
  const { roleSlug, isSuperAdmin, isImpersonating } = usePermissions();
  const { selectedOperator, selectedBuildingId } = useAppStore();

  const isHolding = (isSuperAdmin && !isImpersonating) || roleSlug === 'super_admin';
  const isMultiOp = roleSlug === 'corp_admin';
  const isOperadorMode = roleSlug === 'site_admin';
  const isTecnico = roleSlug === 'operator';
  const isLocatario = roleSlug === 'tenant_user';
  const isFilteredMode = isMultiOp || isOperadorMode;

  const hasOperator = isMultiOp && !!selectedOperator;
  const hasBuilding = isOperadorMode && !!selectedOperator && !!selectedBuildingId;
  const needsSelection = isFilteredMode && !selectedOperator;

  // Fetch meters to map operator name → meter IDs
  const metersQuery = useMetersQuery();
  const allMeters = metersQuery.data ?? [];

  // Meter IDs belonging to selected operator
  const operatorMeterIds = useMemo(() => {
    if (!selectedOperator || !isFilteredMode) return null;
    const ids = new Set<string>();
    for (const m of allMeters) {
      if (m.name === selectedOperator) {
        if (isOperadorMode && selectedBuildingId && m.buildingId !== selectedBuildingId) continue;
        ids.add(m.id);
      }
    }
    return ids;
  }, [selectedOperator, isFilteredMode, allMeters, isOperadorMode, selectedBuildingId]);

  // Building IDs where operator has meters
  const operatorBuildingIds = useMemo(() => {
    if (!selectedOperator || !isFilteredMode) return null;
    const ids = new Set<string>();
    for (const m of allMeters) {
      if (m.name === selectedOperator) ids.add(m.buildingId);
    }
    return ids;
  }, [selectedOperator, isFilteredMode, allMeters]);

  return {
    isHolding,
    isMultiOp,
    isOperadorMode,
    isTecnico,
    isLocatario,
    isFilteredMode,
    hasOperator,
    hasBuilding,
    needsSelection,
    selectedOperator,
    selectedBuildingId,
    operatorMeterIds,
    operatorBuildingIds,
  };
}
