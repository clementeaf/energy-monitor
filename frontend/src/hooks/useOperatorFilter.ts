import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useStores } from './queries/useStores';
import { useComparisonFilters, useComparisonByStoreName } from './queries/useComparisons';

/**
 * Provides operator-scoped filtering data when userMode is multi_operador.
 * Returns meterIds and building names belonging to the selected operator.
 */
export function useOperatorFilter() {
  const { userMode, selectedOperator } = useAppStore();
  const isMultiOp = userMode === 'multi_operador';
  const hasOperator = isMultiOp && !!selectedOperator;

  // Fetch all stores to get meterId → storeName mapping
  const { data: stores } = useStores();

  // Fetch comparison filters to get latest month
  const { data: compFilters } = useComparisonFilters();
  const latestMonth = compFilters?.months?.[compFilters.months.length - 1];

  // Fetch comparison data for the operator to get building names
  const { data: compRows } = useComparisonByStoreName(
    hasOperator ? [selectedOperator!] : [],
    hasOperator ? latestMonth : undefined,
  );

  // Set of meterIds belonging to the selected operator
  const operatorMeterIds = useMemo(() => {
    if (!hasOperator || !stores) return null;
    const ids = new Set<string>();
    for (const s of stores) {
      if (s.storeName === selectedOperator) ids.add(s.meterId);
    }
    return ids;
  }, [hasOperator, stores, selectedOperator]);

  // Set of building names where the operator has stores
  const operatorBuildings = useMemo(() => {
    if (!hasOperator || !compRows) return null;
    return new Set(compRows.map((r) => r.buildingName));
  }, [hasOperator, compRows]);

  return {
    isMultiOp,
    hasOperator,
    selectedOperator,
    operatorMeterIds,
    operatorBuildings,
  };
}
