import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesEndpoints } from '../../services/endpoints';
import type {
  Role, Permission,
  CreateRolePayload, UpdateRolePayload,
} from '../../types/role';

const KEYS = {
  all: ['roles'] as const,
  detail: (id: string) => ['roles', id] as const,
  permissions: (id: string) => ['roles', id, 'permissions'] as const,
  catalog: ['roles', 'permissions-catalog'] as const,
};

export function useRolesQuery() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async (): Promise<Role[]> => {
      const { data } = await rolesEndpoints.list();
      return data;
    },
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) =>
      rolesEndpoints.create(payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      rolesEndpoints.update(id, payload).then((r) => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rolesEndpoints.remove(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.all }); },
  });
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: KEYS.catalog,
    queryFn: async (): Promise<Permission[]> => {
      const { data } = await rolesEndpoints.permissionsCatalog();
      return data;
    },
  });
}

export function useAssignPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      rolesEndpoints.assignPermissions(id, permissionIds).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all });
      void qc.invalidateQueries({ queryKey: KEYS.permissions(id) });
    },
  });
}
