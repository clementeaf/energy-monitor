import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, createInvitation, createDirectUser, deleteUsers, resendInvitation, type CreateInvitationInput } from '../../services/endpoints';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvitationInput) => createInvitation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useCreateDirectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvitationInput) => createDirectUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteUsers(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => resendInvitation(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
