import type { TenantTheme } from '../types/auth';
import { contrastForeground, deriveBrandTokens } from './color-utils';

/**
 * Sets a CSS custom property on the document root.
 * @param root - Document root element
 * @param name - Property name
 * @param value - Property value
 */
function setVar(root: HTMLElement, name: string, value: string): void {
  root.style.setProperty(name, value);
}

/**
 * Apply all tenant theme properties to the document.
 * Called on login, session restore, and tenant switching.
 *
 * @param theme - Color and branding properties from API
 */
export function applyTenantTheme(theme: TenantTheme): void {
  const root = document.documentElement;
  const brand = deriveBrandTokens(theme.primaryColor);

  Object.entries(brand).forEach(([name, value]) => {
    setVar(root, name, value);
  });

  setVar(root, '--color-secondary', theme.secondaryColor);
  setVar(root, '--color-sidebar', theme.sidebarColor);
  const sidebarFg = contrastForeground(theme.sidebarColor);
  setVar(root, '--color-sidebar-fg', sidebarFg);
  setVar(
    root,
    '--color-sidebar-muted',
    `color-mix(in srgb, ${sidebarFg} 55%, transparent)`,
  );
  setVar(root, '--color-accent', theme.accentColor);
  setVar(root, '--color-chart-3', theme.secondaryColor);
  setVar(root, '--color-chart-4', theme.accentColor);

  document.title = (theme.appTitle ?? '').slice(0, 60);

  if (theme.faviconUrl && /^(https?:\/\/|\/[^/])/.test(theme.faviconUrl)) {
    setFavicon(theme.faviconUrl);
  }
}

/**
 * Updates or creates the favicon link element.
 * @param url - Favicon URL
 */
function setFavicon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}
