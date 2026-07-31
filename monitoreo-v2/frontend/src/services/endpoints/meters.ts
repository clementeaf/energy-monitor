import api from '../api';
import { API_ROUTES } from '../routes';
import type { Meter, CreateMeterPayload, UpdateMeterPayload } from '../../types/meter';
import type { IotDevice } from '../../types/iot-device';
import type {
  RegisterMapping,
  ProtocolType,
  RegisterMappingQueryParams,
  CreateRegisterMappingPayload,
  UpdateRegisterMappingPayload,
} from '../../types/register-mapping';

export const metersEndpoints = {
  list: (buildingId?: string) => {
    const params: Record<string, string> = {};
    if (buildingId) params.buildingId = buildingId;
    return api.get<Meter[] | { data: Meter[]; total: number }>(API_ROUTES.meters, Object.keys(params).length > 0 ? { params } : undefined);
  },

  get: (id: string) =>
    api.get<Meter>(`${API_ROUTES.meters}/${id}`),

  create: (payload: CreateMeterPayload) =>
    api.post<Meter>(API_ROUTES.meters, payload),

  update: (id: string, payload: UpdateMeterPayload) =>
    api.patch<Meter>(`${API_ROUTES.meters}/${id}`, payload),

  remove: (id: string) =>
    api.delete(`${API_ROUTES.meters}/${id}`),
};

export const iotDevicesEndpoints = {
  list: () => api.get<IotDevice[]>(API_ROUTES.iotDevices.list),
  get: (id: string) => api.get<IotDevice>(API_ROUTES.iotDevices.get(id)),
  assign: (id: string, meterId: string) => api.patch<IotDevice>(API_ROUTES.iotDevices.assign(id), { meterId }),
  unassign: (id: string) => api.patch<IotDevice>(API_ROUTES.iotDevices.unassign(id), {}),
};

export const registerMappingsEndpoints = {
  list: (params?: RegisterMappingQueryParams) =>
    api.get<RegisterMapping[]>(API_ROUTES.registerMappings, { params }),
  protocolTypes: () =>
    api.get<ProtocolType[]>(`${API_ROUTES.registerMappings}/protocol-types`),
  create: (payload: CreateRegisterMappingPayload) =>
    api.post<RegisterMapping>(API_ROUTES.registerMappings, payload),
  update: (id: string, payload: UpdateRegisterMappingPayload) =>
    api.patch<RegisterMapping>(`${API_ROUTES.registerMappings}/${id}`, payload),
  remove: (id: string) => api.delete(`${API_ROUTES.registerMappings}/${id}`),
  exportCsv: (params?: RegisterMappingQueryParams) =>
    api.get<Blob>(`${API_ROUTES.registerMappings}/export`, {
      params,
      responseType: 'blob',
    }),
};
