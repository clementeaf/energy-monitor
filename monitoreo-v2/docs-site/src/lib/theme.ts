import { useCallback, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

const KEY = 'docs-theme';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  try { return localStorage.getItem(KEY) as Theme | null; } catch { return null; }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

let listeners: (() => void)[] = [];
let currentTheme: Theme = 'light';

function init() {
  currentTheme = getStoredTheme() ?? getSystemTheme();
  applyTheme(currentTheme);
}
init();

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

function getSnapshot() {
  return currentTheme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = useCallback(() => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, currentTheme); } catch {}
    applyTheme(currentTheme);
    listeners.forEach((l) => l());
  }, []);

  return { theme, toggle };
}
