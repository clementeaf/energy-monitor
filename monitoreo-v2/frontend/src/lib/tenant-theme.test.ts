import { describe, it, expect, beforeEach } from 'vitest';
import { applyTenantTheme } from './tenant-theme';
import type { TenantTheme } from '../types/auth';

const theme: TenantTheme = {
  primaryColor: '#FF0000',
  secondaryColor: '#00FF00',
  sidebarColor: '#0000FF',
  accentColor: '#FFFF00',
  appTitle: 'Test Platform',
  logoUrl: null,
  faviconUrl: null,
};

describe('applyTenantTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.title = '';
    document.querySelectorAll("link[rel='icon']").forEach((el) => el.remove());
  });

  it('leaves design-system color tokens untouched', () => {
    applyTenantTheme(theme);
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });

  it('sets document.title', () => {
    applyTenantTheme(theme);
    expect(document.title).toBe('Test Platform');
  });

  it('does not create favicon link when faviconUrl is null', () => {
    applyTenantTheme(theme);
    expect(document.querySelector("link[rel='icon']")).toBeNull();
  });

  it('creates favicon link when faviconUrl is set', () => {
    applyTenantTheme({ ...theme, faviconUrl: 'https://cdn.example.com/favicon.ico' });
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    expect(link).not.toBeNull();
    expect(link!.href).toBe('https://cdn.example.com/favicon.ico');
  });

  it('reuses existing favicon link element', () => {
    applyTenantTheme({ ...theme, faviconUrl: 'https://cdn.example.com/old.ico' });
    applyTenantTheme({ ...theme, faviconUrl: 'https://cdn.example.com/new.ico' });

    const links = document.querySelectorAll("link[rel='icon']");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toBe('https://cdn.example.com/new.ico');
  });
});
