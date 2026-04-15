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

  it('sets CSS custom properties on :root', () => {
    applyTenantTheme(theme);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-primary')).toBe('#FF0000');
    expect(root.style.getPropertyValue('--color-secondary')).toBe('#00FF00');
    expect(root.style.getPropertyValue('--color-sidebar')).toBe('#0000FF');
    expect(root.style.getPropertyValue('--color-accent')).toBe('#FFFF00');
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
    // Create one first
    applyTenantTheme({ ...theme, faviconUrl: 'https://cdn.example.com/old.ico' });
    // Apply again with new URL
    applyTenantTheme({ ...theme, faviconUrl: 'https://cdn.example.com/new.ico' });

    const links = document.querySelectorAll("link[rel='icon']");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toBe('https://cdn.example.com/new.ico');
  });
});
