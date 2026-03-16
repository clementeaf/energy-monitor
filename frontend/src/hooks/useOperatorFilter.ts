import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useStores } from './queries/useStores';
import { useComparisonFilters, useComparisonByStoreName } from './queries/useComparisons';

const BUILDING_PREFIX_MAP: Record<string, string> = {
  MG: 'Mallplaza Gestión',
  MM: 'Mallplaza Mirador',
  OT: 'Oficina Transoceánica',
  SC52: 'SC 52',
  SC53: 'SC 53',
};

/** Extract building code prefix from a meter_id (e.g. "MG001" → "MG", "SC52003" → "SC52") */
function meterIdToPrefix(meterId: string): string {
  const match = meterId.match(/^(SC\d+|[A-Z]+)/);
  return match ? match[1] : '';
}

/**
 * Provides operator-scoped filtering data when userMode is multi_operador or operador.
 * Returns meterIds and building names belonging to the selected operator/store.
 */
export function useOperatorFilter() {
  const { userMode, selectedOperator, selectedBuilding, selectedStoreMeterId } = useAppStore();
  const isMultiOp = userMode === 'multi_operador';
  const isOperadorMode = userMode === 'operador';
  const isFilteredMode = isMultiOp || isOperadorMode;
  const hasOperator = isMultiOp && !!selectedOperator;
  const hasStore = isOperadorMode && !!selectedStoreMeterId;

  // Fetch all stores to get meterId → storeName mapping
  const { data: stores } = useStores();

  // Fetch comparison filters to get latest month
  const { data: compFilters } = useComparisonFilters();
  const latestMonth = compFilters?.months?.[compFilters.months.length - 1];

  // Fetch comparison data for the operator to get building names (multi_operador only)
  const { data: compRows } = useComparisonByStoreName(
    hasOperator ? [selectedOperator!] : [],
    hasOperator ? latestMonth : undefined,
  );

  // Set of meterIds belonging to the selected operator (multi_operador)
  const multiOpMeterIds = useMemo(() => {
    if (!hasOperator || !stores) return null;
    const ids = new Set<string>();
    for (const s of stores) {
      if (s.storeName === selectedOperator) ids.add(s.meterId);
    }
    return ids;
  }, [hasOperator, stores, selectedOperator]);

  // Set of building names where the operator has stores (multi_operador)
  const multiOpBuildings = useMemo(() => {
    if (!hasOperator || !compRows) return null;
    return new Set(compRows.map((r) => r.buildingName));
  }, [hasOperator, compRows]);

  // Operador mode: single meter → single building
  const operadorMeterIds = useMemo(() => {
    if (!hasStore) return null;
    return new Set([selectedStoreMeterId!]);
  }, [hasStore, selectedStoreMeterId]);

  const operadorBuildings = useMemo(() => {
    if (!hasStore) return null;
    const prefix = meterIdToPrefix(selectedStoreMeterId!);
    const buildingName = BUILDING_PREFIX_MAP[prefix];
    return buildingName ? new Set([buildingName]) : null;
  }, [hasStore, selectedStoreMeterId]);

  // Lookup store name for the selected meter (operador mode)
  const selectedStoreName = useMemo(() => {
    if (!hasStore || !stores) return null;
    const store = stores.find((s) => s.meterId === selectedStoreMeterId);
    return store?.storeName ?? null;
  }, [hasStore, stores, selectedStoreMeterId]);

  // Unified outputs
  const operatorMeterIds = hasOperator ? multiOpMeterIds : hasStore ? operadorMeterIds : null;
  const operatorBuildings = hasOperator ? multiOpBuildings : hasStore ? operadorBuildings : null;
  const needsSelection = isFilteredMode && !hasOperator && !hasStore;

  return {
    isMultiOp,
    isOperadorMode,
    isFilteredMode,
    hasOperator,
    hasStore,
    needsSelection,
    selectedOperator,
    selectedBuilding,
    selectedStoreMeterId,
    operatorMeterIds,
    operatorBuildings,
    selectedStoreName,
  };
}
