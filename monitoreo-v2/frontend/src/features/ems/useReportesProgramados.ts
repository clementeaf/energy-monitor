import { useState } from 'react';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useCreateScheduledReport, useScheduledReportsQuery, useUpdateScheduledReport } from '../../hooks/queries/useReportsQuery';
import { useAuthStore } from '../../store/useAuthStore';
import type { Building } from '../../types/building';
import type { CreateScheduledReportPayload, PlatformReportType, ReportFormat, ScheduledReport } from '../../types/report';
import { useGuardarConAviso } from './useGuardarConAviso';
import { TODOS_LOS_CENTROS } from './useReglas';

export interface ReporteProgramado {
  id: string;
  nombre: string;
  alcance: string;
  frecuencia: string;
  formato: string;
  activo: boolean;
}

export type NuevoReporteProgramado = Omit<ReporteProgramado, 'id' | 'activo'>;

const TIPOS_REPORTE: Record<string, PlatformReportType> = {
  'Consumo mensual': 'consumption',
  'Márgenes y facturación': 'billing',
  'Picos de demanda': 'demand',
  'Salud de la flota': 'inventory',
  'Resumen ejecutivo': 'executive',
};

const FRECUENCIAS: Record<string, string> = {
  'Diario · 08:00': '0 8 * * *',
  'Semanal · lunes': '0 8 * * 1',
  'Mensual · día 1': '0 8 1 * *',
};

const FORMATOS: Record<string, ReportFormat> = { PDF: 'pdf', Excel: 'excel' };

export const TIPOS_REPORTE_LABELS = Object.keys(TIPOS_REPORTE);
export const FRECUENCIAS_LABELS = Object.keys(FRECUENCIAS);
export const FORMATOS_LABELS = Object.keys(FORMATOS);

const PROGRAMADOS_SIMULADOS: ReporteProgramado[] = [
  { id: 'rp1', nombre: 'Consumo mensual', alcance: TODOS_LOS_CENTROS, frecuencia: 'Mensual · día 1', formato: 'PDF', activo: true },
  { id: 'rp2', nombre: 'Márgenes y facturación', alcance: 'Alto Peñalolén', frecuencia: 'Mensual · día 1', formato: 'Excel', activo: true },
  { id: 'rp3', nombre: 'Salud de la flota', alcance: TODOS_LOS_CENTROS, frecuencia: 'Semanal · lunes', formato: 'PDF', activo: true },
  { id: 'rp4', nombre: 'Picos de demanda', alcance: 'Quilicura', frecuencia: 'Diario · 08:00', formato: 'Excel', activo: false },
];

function findLabel<T>(dictionary: Record<string, T>, value: T): string | undefined {
  return Object.keys(dictionary).find((key) => dictionary[key] === value);
}

export function toReporteProgramado(report: ScheduledReport, buildings: Building[]): ReporteProgramado {
  return {
    id: report.id,
    nombre: findLabel(TIPOS_REPORTE, report.reportType) ?? report.reportType,
    alcance: buildings.find((building) => building.id === report.buildingId)?.name ?? TODOS_LOS_CENTROS,
    frecuencia: findLabel(FRECUENCIAS, report.cronExpression) ?? report.cronExpression,
    formato: findLabel(FORMATOS, report.format) ?? report.format,
    activo: report.isActive,
  };
}

export function toCreateScheduledReportPayload(
  reporte: NuevoReporteProgramado,
  buildings: Building[],
  recipient: string,
): CreateScheduledReportPayload {
  return {
    reportType: TIPOS_REPORTE[reporte.nombre],
    buildingId: buildings.find((building) => building.name === reporte.alcance)?.id ?? null,
    format: FORMATOS[reporte.formato],
    cronExpression: FRECUENCIAS[reporte.frecuencia],
    recipients: [recipient],
    isActive: true,
  };
}

interface ReportesProgramadosApi {
  reportes: ReporteProgramado[];
  crear: (reporte: NuevoReporteProgramado) => Promise<boolean>;
  alternar: (reporte: ReporteProgramado) => Promise<boolean>;
}

export function useReportesProgramados(): ReportesProgramadosApi {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const email = useAuthStore((s) => s.user?.email ?? '');
  const buildings = useBuildingsQuery().data ?? [];
  const scheduledQuery = useScheduledReportsQuery(undefined, { enabled: isAuthenticated });
  const createReport = useCreateScheduledReport();
  const updateReport = useUpdateScheduledReport();
  const guardar = useGuardarConAviso();
  const [simulados, setSimulados] = useState(PROGRAMADOS_SIMULADOS);

  if (!isAuthenticated) {
    return {
      reportes: simulados,
      crear: async (reporte) => {
        setSimulados((prev) => [...prev, { ...reporte, id: crypto.randomUUID(), activo: true }]);
        return true;
      },
      alternar: async (reporte) => {
        setSimulados((prev) => prev.map((r) => (r.id === reporte.id ? { ...r, activo: !r.activo } : r)));
        return true;
      },
    };
  }

  return {
    reportes: (scheduledQuery.data ?? []).map((report) => toReporteProgramado(report, buildings)),
    crear: (reporte) => guardar('programar el reporte', () =>
      createReport.mutateAsync(toCreateScheduledReportPayload(reporte, buildings, email))),
    alternar: (reporte) => guardar('cambiar el reporte', () =>
      updateReport.mutateAsync({ id: reporte.id, payload: { isActive: !reporte.activo } })),
  };
}
