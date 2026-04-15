import type { TenantTheme } from '../types/auth';

/**
 * Apply all tenant theme properties to the document.
 * Called on login and session restore.
 */
export function applyTenantTheme(theme: TenantTheme): void {
  const root = document.documentElement;

  // CSS custom properties
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-sidebar', theme.sidebarColor);
  root.style.setProperty('--color-accent', theme.accentColor);

  // Browser tab title
  document.title = theme.appTitle;

  // Favicon
  if (theme.faviconUrl) {
    setFavicon(theme.faviconUrl);
  }
}

function setFavicon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}
