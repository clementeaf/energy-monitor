import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';

interface PageTitle {
  title: string;
  sub: string;
  action?: ReactNode;
}

interface PageTitleState {
  pageTitle: PageTitle | null;
  setPageTitle: (pageTitle: PageTitle | null) => void;
}

export const usePageTitleStore = create<PageTitleState>()((set) => ({
  pageTitle: null,
  setPageTitle: (pageTitle) => set({ pageTitle }),
}));

export function usePageTitle(title: string, sub: string, action?: ReactNode): void {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  useEffect(() => {
    setPageTitle({ title, sub, action });
    return () => setPageTitle(null);
  }, [title, sub, action, setPageTitle]);
}
