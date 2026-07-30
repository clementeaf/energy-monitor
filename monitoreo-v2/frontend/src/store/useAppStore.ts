import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleSlug } from '../types/auth';

export type ViewAsRole = RoleSlug | null; // null = natural role (no impersonation)

export const VIEW_AS_LABELS: Record<string, string> = {
  super_admin: 'Súper-administrador',
  corp_admin: 'Gerencial',
  site_admin: 'Operacional',
  operator: 'Técnico',
  auditor: 'Auditor',
};

interface AppState {
  sidebarOpen: boolean;
  selectedBuildingId: string | null;
  viewAsRole: ViewAsRole;
  selectedTenantId: string | null;
  selectedOperator: string | null; // store/brand name for Multi Operador mode
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSelectedBuildingId: (id: string | null) => void;
  setViewAsRole: (role: ViewAsRole) => void;
  setSelectedTenantId: (id: string | null) => void;
  setSelectedOperator: (name: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      selectedBuildingId: null,
      viewAsRole: null,
      selectedTenantId: null,
      selectedOperator: null,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId, selectedOperator: null }),
      setViewAsRole: (viewAsRole) => set({ viewAsRole, selectedOperator: null, selectedBuildingId: null }),
      setSelectedTenantId: (selectedTenantId) => set({ selectedTenantId, selectedOperator: null, selectedBuildingId: null }),
      setSelectedOperator: (selectedOperator) => set({ selectedOperator }),
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
      }) as unknown as AppState,
    },
  ),
);
