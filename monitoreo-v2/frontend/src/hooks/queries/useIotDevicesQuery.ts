import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iotDevicesEndpoints } from '../../services/endpoints';
import type { IotDevice } from '../../types/iot-device';

const KEYS = {
  all: ['iot-devices'] as const,
};

export function useIotDevicesQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<IotDevice[]> => {
      const { data } = await iotDevicesEndpoints.list();
      return data;
    },
  });
}

export function useAssignIotDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, meterId }: { id: string; meterId: string }) =>
      iotDevicesEndpoints.assign(id, meterId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}

export function useUnassignIotDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      iotDevicesEndpoints.unassign(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}
