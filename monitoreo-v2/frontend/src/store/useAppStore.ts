import { create } from 'zustand';
import type { RoleSlug } from '../types/auth';

export type ViewAsRole = RoleSlug | null; // null = natural role (no impersonation)

export const VIEW_AS_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  corp_admin: 'Multi Operador',
  site_admin: 'Operador',
  operator: 'Técnico',
  tenant_user: 'Locatario',
  analyst: 'Analista',
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

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  selectedBuildingId: null,
  viewAsRole: null,
  selectedTenantId: null,
  selectedOperator: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId }),
  setViewAsRole: (viewAsRole) => set({ viewAsRole, selectedOperator: null, selectedBuildingId: null }),
  setSelectedTenantId: (selectedTenantId) => set({ selectedTenantId }),
  setSelectedOperator: (selectedOperator) => set({ selectedOperator, selectedBuildingId: null }),
}));
