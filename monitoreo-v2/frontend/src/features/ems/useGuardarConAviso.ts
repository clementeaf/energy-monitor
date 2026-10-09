import { useToastStore } from '../../store/useToastStore';

export function useGuardarConAviso() {
  const showToast = useToastStore((s) => s.showToast);
  return async (accion: string, guardar: () => Promise<unknown>): Promise<boolean> => {
    try {
      await guardar();
      return true;
    } catch (error) {
      showToast(`No se pudo ${accion}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };
}
