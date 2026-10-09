import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleSlug } from '../types/auth';
import type { RemarcadorOverride } from '../features/ems/fleet';
import { REGLAS_INICIALES, type Regla } from '../features/ems/alerts';

export interface ReporteGenerado {
  id: string;
  nombre: string;
  formato: string;
  hora: string;
}

export interface CentroSimulado {
  id: string;
  name: string;
  address: string;
}

export type ViewAsRole = RoleSlug | null; // null = natural role (no impersonation)

export const VIEW_AS_LABELS: Record<string, string> = {
  super_admin: 'Súper-administrador',
  corp_admin: 'Gerencial',
  site_admin: 'Operacional',
  operator: 'Técnico',
  auditor: 'Auditor',
};

export type ModuloId = 'consumo' | 'margenes' | 'sostenibilidad' | 'alertas' | 'reportes';

const MARGEN_MINIMO_MAX = 60;

interface AppState {
  sidebarOpen: boolean;
  selectedBuildingId: string | null;
  viewAsRole: ViewAsRole;
  selectedTenantId: string | null;
  selectedOperator: string | null;
  workProfile: string;
  modulosActivos: Record<ModuloId, boolean>;
  margenMinimo: number;
  alertasResueltas: string[];
  remarcadorOverrides: Record<string, RemarcadorOverride>;
  reglas: Regla[];
  centrosSimulados: CentroSimulado[];
  reportesGenerados: ReporteGenerado[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSelectedBuildingId: (id: string | null) => void;
  setViewAsRole: (role: ViewAsRole) => void;
  setSelectedTenantId: (id: string | null) => void;
  setSelectedOperator: (name: string | null) => void;
  setWorkProfile: (profile: string) => void;
  toggleModulo: (id: ModuloId) => void;
  setMargenMinimo: (percent: number) => void;
  resolverAlertas: (ids: string[]) => void;
  reabrirAlerta: (id: string) => void;
  eliminarRegla: (id: string) => void;
  overrideRemarcadores: (overrides: Record<string, RemarcadorOverride>) => void;
  agregarRegla: (regla: Omit<Regla, 'id'>) => void;
  toggleRegla: (id: string) => void;
  agregarCentro: (centro: Omit<CentroSimulado, 'id'>) => void;
  agregarReporteGenerado: (reporte: Pick<ReporteGenerado, 'nombre' | 'formato'>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      selectedBuildingId: null,
      viewAsRole: null,
      selectedTenantId: null,
      selectedOperator: null,
      workProfile: 'Auditoría',
      modulosActivos: { consumo: true, margenes: true, sostenibilidad: true, alertas: true, reportes: true },
      margenMinimo: 10,
      alertasResueltas: [],
      remarcadorOverrides: {},
      reglas: REGLAS_INICIALES,
      centrosSimulados: [],
      reportesGenerados: [],
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId, selectedOperator: null }),
      setViewAsRole: (viewAsRole) => set({ viewAsRole, selectedOperator: null, selectedBuildingId: null }),
      setSelectedTenantId: (selectedTenantId) => set({ selectedTenantId, selectedOperator: null, selectedBuildingId: null }),
      setSelectedOperator: (selectedOperator) => set({ selectedOperator }),
      setWorkProfile: (workProfile) => set({ workProfile }),
      toggleModulo: (id) => set((s) => ({ modulosActivos: { ...s.modulosActivos, [id]: !s.modulosActivos[id] } })),
      agregarRegla: (regla) => set((s) => ({ reglas: [...s.reglas, { ...regla, id: crypto.randomUUID() }] })),
      toggleRegla: (id) => set((s) => ({ reglas: s.reglas.map((r) => (r.id === id ? { ...r, activa: !r.activa } : r)) })),
      agregarReporteGenerado: (reporte) => set((s) => ({
        reportesGenerados: [{ ...reporte, id: crypto.randomUUID(), hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) }, ...s.reportesGenerados],
      })),
      agregarCentro: (centro) => set((s) => ({ centrosSimulados: [...s.centrosSimulados, { ...centro, id: `sim-${crypto.randomUUID()}` }] })),
      overrideRemarcadores: (overrides) => set((s) => ({ remarcadorOverrides: { ...s.remarcadorOverrides, ...overrides } })),
      reabrirAlerta: (id) => set((s) => ({ alertasResueltas: s.alertasResueltas.filter((resuelta) => resuelta !== id) })),
      eliminarRegla: (id) => set((s) => ({ reglas: s.reglas.filter((r) => r.id !== id) })),
      resolverAlertas: (ids) => set((s) => ({ alertasResueltas: [...new Set([...s.alertasResueltas, ...ids])] })),
      setMargenMinimo: (percent) => set({ margenMinimo: Math.min(MARGEN_MINIMO_MAX, Math.max(0, percent)) }),
    }),
    {
      name: 'ems-app-state',
      storage: {
        getItem: (name) => {
          const raw = sessionStorage.getItem(name);
          return raw ? JSON.parse(raw) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        viewAsRole: state.viewAsRole,
        selectedTenantId: state.selectedTenantId,
        selectedOperator: state.selectedOperator,
        selectedBuildingId: state.selectedBuildingId,
        modulosActivos: state.modulosActivos,
        margenMinimo: state.margenMinimo,
        alertasResueltas: state.alertasResueltas,
      }) as unknown as AppState,
    },
  ),
);
