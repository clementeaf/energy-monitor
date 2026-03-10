import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUserInvitation, fetchAdminUsers, fetchRoles } from '../../services/endpoints';
import type { CreateUserInvitationInput } from '../../types';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers,
  });
}

export function useRoleOptions() {
  return useQuery({
    queryKey: ['role-options'],
    queryFn: fetchRoles,
    staleTime: Infinity,
  });
}

export function useCreateUserInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserInvitationInput) => createUserInvitation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}