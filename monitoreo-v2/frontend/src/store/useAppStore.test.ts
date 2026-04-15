import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      sidebarOpen: true,
      selectedBuildingId: null,
    });
  });

  it('initializes with sidebar open and no building selected', () => {
    const state = useAppStore.getState();
    expect(state.sidebarOpen).toBe(true);
    expect(state.selectedBuildingId).toBeNull();
  });

  describe('setSidebarOpen', () => {
    it('sets sidebar state', () => {
      useAppStore.getState().setSidebarOpen(false);
      expect(useAppStore.getState().sidebarOpen).toBe(false);

      useAppStore.getState().setSidebarOpen(true);
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar state', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarOpen).toBe(false);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('setSelectedBuildingId', () => {
    it('sets building id', () => {
      useAppStore.getState().setSelectedBuildingId('b-1');
      expect(useAppStore.getState().selectedBuildingId).toBe('b-1');
    });

    it('clears building id with null', () => {
      useAppStore.getState().setSelectedBuildingId('b-1');
      useAppStore.getState().setSelectedBuildingId(null);
      expect(useAppStore.getState().selectedBuildingId).toBeNull();
    });
  });
});
