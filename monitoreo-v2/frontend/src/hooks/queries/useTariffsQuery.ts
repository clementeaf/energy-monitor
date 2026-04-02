import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tariffsEndpoints } from '../../services/endpoints';
import type { CreateTariffPayload, UpdateTariffPayload, CreateTariffBlockPayload } from '../../types/tariff';

const TARIFFS_KEY = ['tariffs'] as const;
const blocksKey = (tariffId: string) => ['tariff-blocks', tariffId] as const;

export function useTariffsQuery(buildingId?: string) {
  return useQuery({
    queryKey: [...TARIFFS_KEY, buildingId ?? 'all'],
    queryFn: () => tariffsEndpoints.list(buildingId).then((r) => r.data),
  });
}

export function useTariffBlocksQuery(tariffId: string | null) {
  return useQuery({
    queryKey: blocksKey(tariffId ?? ''),
    queryFn: () => tariffsEndpoints.blocks(tariffId!).then((r) => r.data),
    enabled: !!tariffId,
  });
}

export function useCreateTariff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTariffPayload) =>
      tariffsEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: TARIFFS_KEY }); },
  });
}

export function useUpdateTariff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTariffPayload }) =>
      tariffsEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: TARIFFS_KEY }); },
  });
}

export function useDeleteTariff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tariffsEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: TARIFFS_KEY }); },
  });
}

export function useCreateTariffBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tariffId, payload }: { tariffId: string; payload: CreateTariffBlockPayload }) =>
      tariffsEndpoints.createBlock(tariffId, payload).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: blocksKey(vars.tariffId) });
    },
  });
}

export function useDeleteTariffBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tariffId, blockId }: { tariffId: string; blockId: string }) =>
      tariffsEndpoints.removeBlock(tariffId, blockId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: blocksKey(vars.tariffId) });
    },
  });
}
