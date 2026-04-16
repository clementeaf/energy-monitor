import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersEndpoints } from '../../services/endpoints';
import type {
  UserListItem, CreateUserPayload, UpdateUserPayload,
  AssignBuildingsPayload, UserBuildingsResponse,
} from '../../types/user';

const KEYS = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
  buildings: (id: string) => ['users', id, 'buildings'] as const,
};

export function useUsersQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<UserListItem[]> => {
      const { data } = await usersEndpoints.list();
      return data;
    },
  });
}

export function useUserQuery(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async (): Promise<UserListItem> => {
      const { data } = await usersEndpoints.get(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useUserBuildingsQuery(id: string) {
  return useQuery({
    queryKey: KEYS.buildings(id),
    queryFn: async (): Promise<UserBuildingsResponse> => {
      const { data } = await usersEndpoints.getBuildingIds(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) =>
      usersEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersEndpoints.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useAssignBuildings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignBuildingsPayload }) =>
      usersEndpoints.assignBuildings(id, payload).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.buildings(id) });
    },
  });
}
