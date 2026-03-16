import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserMode = 'holding' | 'multi_operador' | 'operador' | 'tecnico';

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
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedSiteId: (siteId: string | null) => void;
  clearSelectedSiteId: () => void;
  setUserMode: (mode: UserMode) => void;
  setSelectedOperator: (name: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      selectedSiteId: null,
      userMode: 'holding',
      selectedOperator: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSelectedSiteId: (siteId) => set({ selectedSiteId: siteId }),
      clearSelectedSiteId: () => set({ selectedSiteId: null }),
      setUserMode: (mode) => set({ userMode: mode, selectedOperator: null }),
      setSelectedOperator: (name) => set({ selectedOperator: name }),
    }),
    {
      name: 'power-digital-app',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ selectedSiteId: state.selectedSiteId, userMode: state.userMode, selectedOperator: state.selectedOperator }),
    },
  ),
);
