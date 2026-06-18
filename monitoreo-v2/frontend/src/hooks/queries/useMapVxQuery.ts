import { useQuery } from '@tanstack/react-query';
import { mapvxEndpoints } from '../../services/endpoints';
import type { MapvxMall, MapvxStore, MapvxGeometry } from '../../types/mapvx';

export function useMapVxMalls() {
  return useQuery<MapvxMall[]>({
    queryKey: ['mapvx-malls'],
    queryFn: async () => (await mapvxEndpoints.malls()).data,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMapVxStoresQuery(mallId: string) {
  return useQuery<MapvxStore[]>({
    queryKey: ['mapvx-stores', mallId],
    queryFn: async () => (await mapvxEndpoints.stores(mallId)).data,
    staleTime: 1000 * 60 * 30,
    enabled: !!mallId,
  });
}

export function useMapVxGeometry(mallId: string, floorKey: string, layer: string) {
  return useQuery<MapvxGeometry>({
    queryKey: ['mapvx-geometry', mallId, floorKey, layer],
    queryFn: async () => (await mapvxEndpoints.geometry(mallId, floorKey, layer)).data,
    staleTime: 1000 * 60 * 60,
    enabled: !!mallId && !!floorKey && !!layer,
  });
}
