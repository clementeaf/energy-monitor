import type { TenantTheme } from '../types/auth';

/** Slugs that have a matching [data-theme="..."] block in index.css */
const KNOWN_THEMES = new Set(['pasa', 'siemens']);

/**
 * Apply all tenant theme properties to the document.
 * Called on login, session restore, and tenant switching.
 *
 * @param theme  Color + branding properties
 * @param slug   Optional tenant slug — activates `[data-theme]` CSS block if known
 */
export function applyTenantTheme(theme: TenantTheme, slug?: string | null): void {
  const root = document.documentElement;

  // CSS custom properties
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-sidebar', theme.sidebarColor);
  root.style.setProperty('--color-accent', theme.accentColor);

  // data-theme attribute for pa-* CSS variable overrides
  if (slug && KNOWN_THEMES.has(slug)) {
    root.setAttribute('data-theme', slug);
  } else {
    root.removeAttribute('data-theme');
  }

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
