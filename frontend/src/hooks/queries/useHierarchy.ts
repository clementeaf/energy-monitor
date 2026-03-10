import { useQuery } from '@tanstack/react-query';
import { fetchHierarchy, fetchHierarchyNode, fetchHierarchyChildren, fetchHierarchyConsumption } from '../../services/endpoints';

export function useHierarchy(buildingId: string) {
  return useQuery({
    queryKey: ['hierarchy', buildingId],
    queryFn: () => fetchHierarchy(buildingId),
    enabled: !!buildingId,
  });
}

export function useHierarchyNode(nodeId: string) {
  return useQuery({
    queryKey: ['hierarchy-node', nodeId],
    queryFn: () => fetchHierarchyNode(nodeId),
    enabled: !!nodeId,
  });
}

export function useHierarchyChildren(nodeId: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['hierarchy-children', nodeId, from, to],
    queryFn: () => fetchHierarchyChildren(nodeId, from, to),
    enabled: !!nodeId,
  });
}

export function useHierarchyConsumption(nodeId: string, resolution: 'hourly' | 'daily' = 'hourly', from?: string, to?: string) {
  return useQuery({
    queryKey: ['hierarchy-consumption', nodeId, resolution, from, to],
    queryFn: () => fetchHierarchyConsumption(nodeId, resolution, from, to),
    enabled: !!nodeId,
  });
}
