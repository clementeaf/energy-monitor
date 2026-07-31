import api from '../api';
import { API_ROUTES } from '../routes';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../../types/building';
import type {
  HierarchyNode, CreateHierarchyNodePayload, UpdateHierarchyNodePayload,
} from '../../types/hierarchy';
import type { Concentrator } from '../../types/concentrator';
import type { Meter } from '../../types/meter';
import type { Region, CreateRegionPayload, UpdateRegionPayload } from '../../types/region';

export const buildingsEndpoints = {
  list: () =>
    api.get<Building[]>(API_ROUTES.buildings),

  get: (id: string) =>
    api.get<Building>(`${API_ROUTES.buildings}/${id}`),

  create: (payload: CreateBuildingPayload) =>
    api.post<Building>(API_ROUTES.buildings, payload),

  update: (id: string, payload: UpdateBuildingPayload) =>
    api.patch<Building>(`${API_ROUTES.buildings}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.buildings}/${id}`),
};

export const regionsEndpoints = {
  list: () => api.get<Region[]>(API_ROUTES.regions),
  create: (payload: CreateRegionPayload) => api.post<Region>(API_ROUTES.regions, payload),
  update: (id: string, payload: UpdateRegionPayload) =>
    api.patch<Region>(`${API_ROUTES.regions}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.regions}/${id}`),
};

export const hierarchyEndpoints = {
  byBuilding: (buildingId: string) =>
    api.get<HierarchyNode[]>(`${API_ROUTES.hierarchy}/buildings/${buildingId}`),

  get: (id: string) =>
    api.get<HierarchyNode>(`${API_ROUTES.hierarchy}/${id}`),

  meters: (nodeId: string) =>
    api.get<Meter[]>(`${API_ROUTES.hierarchy}/${nodeId}/meters`),

  create: (payload: CreateHierarchyNodePayload) =>
    api.post<HierarchyNode>(API_ROUTES.hierarchy, payload),

  update: (id: string, payload: UpdateHierarchyNodePayload) =>
    api.patch<HierarchyNode>(`${API_ROUTES.hierarchy}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.hierarchy}/${id}`),
};

export const concentratorsEndpoints = {
  list: (buildingId?: string) =>
    api.get<Concentrator[]>(API_ROUTES.concentrators, { params: buildingId ? { buildingId } : undefined }),

  get: (id: string) =>
    api.get<Concentrator>(`${API_ROUTES.concentrators}/${id}`),

  meters: (id: string) =>
    api.get<Meter[]>(`${API_ROUTES.concentrators}/${id}/meters`),
};
