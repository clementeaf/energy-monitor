import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  selectedBuildingId: string | null; // null = all buildings (portfolio view)
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSelectedBuildingId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  selectedBuildingId: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId }),
}));
