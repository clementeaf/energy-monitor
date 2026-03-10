import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  sidebarOpen: boolean;
  selectedSiteId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedSiteId: (siteId: string | null) => void;
  clearSelectedSiteId: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      selectedSiteId: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSelectedSiteId: (siteId) => set({ selectedSiteId: siteId }),
      clearSelectedSiteId: () => set({ selectedSiteId: null }),
    }),
    {
      name: 'power-digital-app',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ selectedSiteId: state.selectedSiteId }),
    },
  ),
);
