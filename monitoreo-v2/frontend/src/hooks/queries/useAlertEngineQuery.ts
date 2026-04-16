import { useMutation, useQueryClient } from '@tanstack/react-query';
import { alertEngineEndpoints } from '../../services/endpoints';

export function useEvaluateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => alertEngineEndpoints.evaluate().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
