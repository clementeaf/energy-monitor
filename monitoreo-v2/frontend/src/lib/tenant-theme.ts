import type { TenantTheme } from '../types/auth';

/**
 * Applies the tenant title and favicon to the document.
 * Colors come from the design-system tokens, never from the tenant.
 * Called on login, session restore, and tenant switching.
 *
 * @param theme - Branding properties from API
 */
export function applyTenantTheme(theme: TenantTheme): void {
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
