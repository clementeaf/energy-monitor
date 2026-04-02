import { useQuery } from '@tanstack/react-query';
import { hierarchyEndpoints } from '../../services/endpoints';
import type { HierarchyNode } from '../../types/hierarchy';
import type { Meter } from '../../types/meter';

const KEYS = {
  byBuilding: (buildingId: string) => ['hierarchy', 'building', buildingId] as const,
  one: (id: string) => ['hierarchy', id] as const,
  meters: (nodeId: string) => ['hierarchy', nodeId, 'meters'] as const,
};

export function useHierarchyByBuildingQuery(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.byBuilding(buildingId),
    queryFn: async (): Promise<HierarchyNode[]> => {
      const { data } = await hierarchyEndpoints.byBuilding(buildingId);
      return data;
    },
    enabled: enabled && !!buildingId,
  });
}

export function useHierarchyNodeQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn: async (): Promise<HierarchyNode> => {
      const { data } = await hierarchyEndpoints.get(id);
      return data;
    },
    enabled: enabled && !!id,
  });
}

export function useHierarchyNodeMetersQuery(nodeId: string, enabled = true) {
  return useQuery({
    queryKey: KEYS.meters(nodeId),
    queryFn: async (): Promise<Meter[]> => {
      const { data } = await hierarchyEndpoints.meters(nodeId);
      return data;
    },
    enabled: enabled && !!nodeId,
  });
}
