import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePermissions } from './usePermissions';
import { useMetersQuery } from './queries/useMetersQuery';

/**
 * Operator-scoped filtering for monitoreo-v2.
 *
 * Hierarchy: Tenant → Building → Operator (tienda)
 *
 * Maps viewAsRole to v1 user modes:
 *   super_admin (no impersonation) → Holding   (full access)
 *   corp_admin                     → Multi Operador (filter by building, then operator)
 *   site_admin                     → Operador  (filter by building + operator)
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
  const isLocatario = false; // ponytail: tenant_user consolidated into site_admin
  const isFilteredMode = isMultiOp || isOperadorMode;

  const hasBuilding = isFilteredMode && !!selectedBuildingId;
  const hasOperator = isFilteredMode && !!selectedOperator;
  const needsSelection = isFilteredMode && !selectedBuildingId;

  // Fetch meters to map selections → meter IDs
  const metersQuery = useMetersQuery();
  const allMeters = metersQuery.data ?? [];

  // Meter IDs matching the selected building + optional operator
  const operatorMeterIds = useMemo(() => {
    if (!isFilteredMode || !selectedBuildingId) return null;
    const ids = new Set<string>();
    for (const m of allMeters) {
      if (m.buildingId !== selectedBuildingId) continue;
      if (selectedOperator && m.name !== selectedOperator) continue;
      ids.add(m.id);
    }
    return ids;
  }, [isFilteredMode, selectedBuildingId, selectedOperator, allMeters]);

  // Building IDs — when a building is selected, just that one
  const operatorBuildingIds = useMemo(() => {
    if (!isFilteredMode || !selectedBuildingId) return null;
    return new Set([selectedBuildingId]);
  }, [isFilteredMode, selectedBuildingId]);

  return {
    isHolding,
    isMultiOp,
    isOperadorMode,
    isTecnico,
    isLocatario,
    isFilteredMode,
    hasBuilding,
    hasOperator,
    needsSelection,
    selectedOperator,
    selectedBuildingId,
    operatorMeterIds,
    operatorBuildingIds,
  };
}
