import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ACCIONES, buildNotasCobro, type AccionDocumento, type FacturaVinculada, type NotaCobro } from './facturacion';
import { useEmsFleet, type EmsPhase } from './useEmsFleet';

export function useNotasCobro(): { phase: EmsPhase; error: unknown; refetch: () => void; notas: NotaCobro[] } {
  const fleet = useEmsFleet();
  const seguimiento = useAppStore((s) => s.seguimientoDocumentos);
  const notas = useMemo(
    () => buildNotasCobro(fleet.centros, fleet.remarcadores, fleet.consumoPorRemarcador, fleet.periodo, new Date(), seguimiento),
    [fleet.centros, fleet.remarcadores, fleet.consumoPorRemarcador, fleet.periodo, seguimiento],
  );
  return { phase: fleet.phase, error: fleet.error, refetch: fleet.refetch, notas };
}

export function useDocumentoActions() {
  const registrar = useAppStore((s) => s.registrarEventoDocumento);
  const autor = useAuthStore((s) => s.user?.displayName ?? s.user?.email ?? 'Usuario');
  const ahora = () => new Date().toISOString();

  return {
    ejecutar: (nota: NotaCobro, accion: AccionDocumento, detalle?: string) => {
      const { evento, siguiente } = ACCIONES[accion];
      registrar(nota.id, { titulo: detalle ? `${evento} · ${detalle}` : evento, fecha: ahora(), autor }, siguiente ? { estado: siguiente } : {});
    },
    vincularFactura: (nota: NotaCobro, factura: FacturaVinculada) => {
      const titulo = factura.motivoDiferencia ? `Factura ${factura.folio} vinculada con diferencia · ${factura.motivoDiferencia}` : `Factura ${factura.folio} vinculada (carga manual)`;
      registrar(nota.id, { titulo, fecha: ahora(), autor }, { factura });
    },
  };
}
