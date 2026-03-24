import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserMode = 'holding' | 'multi_operador' | 'operador' | 'tecnico';
export type AppTheme = 'pasa' | 'siemens';

export const USER_MODE_LABELS: Record<UserMode, string> = {
  holding: 'Holding',
  multi_operador: 'Multi Operador',
  operador: 'Operador',
  tecnico: 'Técnico',
};

interface AppState {
  sidebarOpen: boolean;
  selectedSiteId: string | null;
  userMode: UserMode;
  selectedOperator: string | null;
  selectedBuilding: string | null;
  selectedStoreMeterId: string | null;
  theme: AppTheme;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedSiteId: (siteId: string | null) => void;
  clearSelectedSiteId: () => void;
  setUserMode: (mode: UserMode) => void;
  setSelectedOperator: (name: string | null) => void;
  setSelectedBuilding: (code: string | null) => void;
  setSelectedStoreMeterId: (meterId: string | null) => void;
  setTheme: (theme: AppTheme) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      selectedSiteId: null,
      userMode: 'holding',
      selectedOperator: null,
      selectedBuilding: null,
      selectedStoreMeterId: null,
      theme: 'pasa',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSelectedSiteId: (siteId) => set({ selectedSiteId: siteId }),
      clearSelectedSiteId: () => set({ selectedSiteId: null }),
      setUserMode: (mode) => set({ userMode: mode, selectedOperator: null, selectedBuilding: null, selectedStoreMeterId: null }),
      setSelectedOperator: (name) => set({ selectedOperator: name }),
      setSelectedBuilding: (code) => set({ selectedBuilding: code, selectedStoreMeterId: null }),
      setSelectedStoreMeterId: (meterId) => set({ selectedStoreMeterId: meterId }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme === 'pasa' ? '' : theme);
        set({ theme });
      },
    }),
    {
      name: 'power-digital-app',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ selectedSiteId: state.selectedSiteId, userMode: state.userMode, selectedOperator: state.selectedOperator, selectedBuilding: state.selectedBuilding, selectedStoreMeterId: state.selectedStoreMeterId, theme: state.theme }),
    },
  ),
);
