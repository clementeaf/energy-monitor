import { lazy } from 'react';

export const LazyLoginPage = lazy(async () => {
  const m = await import('../features/auth/LoginPage');
  return { default: m.LoginPage };
});

export const LazyDashboardPage = lazy(async () => {
  const m = await import('../features/dashboard/DashboardPage');
  return { default: m.DashboardPage };
});

export const LazyBuildingsPage = lazy(async () => {
  const m = await import('../features/buildings/BuildingsPage');
  return { default: m.BuildingsPage };
});

export const LazyComponentsPage = lazy(async () => {
  const m = await import('../features/components/ComponentsPage');
  return { default: m.ComponentsPage };
});

export const LazyPlaceholderPage = lazy(async () => {
  const m = await import('../features/placeholder/PlaceholderPage');
  return { default: m.PlaceholderPage };
});
