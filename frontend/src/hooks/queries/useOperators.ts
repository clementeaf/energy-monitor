import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOperators, renameOperator, deleteOperator } from '../../services/endpoints';

export function useOperatorsByBuilding(buildingName: string) {
  return useQuery({
    queryKey: ['operators', buildingName],
    queryFn: () => fetchOperators(buildingName),
    enabled: !!buildingName,
  });
}

export function useRenameOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingName, operatorName, newName }: { buildingName: string; operatorName: string; newName: string }) =>
      renameOperator(buildingName, operatorName, newName),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['operators', vars.buildingName] });
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

export function useDeleteOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ buildingName, operatorName }: { buildingName: string; operatorName: string }) =>
      deleteOperator(buildingName, operatorName),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['operators', vars.buildingName] });
      qc.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}
