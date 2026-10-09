import { create } from 'zustand';

const TOAST_DURATION_MS = 2200;

interface ToastState {
  message: string | null;
  showToast: (message: string) => void;
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  showToast: (message) => {
    clearTimeout(hideTimer);
    set({ message });
    hideTimer = setTimeout(() => set({ message: null }), TOAST_DURATION_MS);
  },
}));
