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

export const LazyMetersPage = lazy(async () => {
  const m = await import('../features/meters/MetersPage');
  return { default: m.MetersPage };
});

export const LazyAlertsPage = lazy(async () => {
  const m = await import('../features/alerts/AlertsPage');
  return { default: m.AlertsPage };
});

export const LazyComponentsPage = lazy(async () => {
  const m = await import('../features/components/ComponentsPage');
  return { default: m.ComponentsPage };
});

export const LazyRealtimePage = lazy(async () => {
  const m = await import('../features/monitoring/realtime/RealtimePage');
  return { default: m.RealtimePage };
});

export const LazyDrilldownPage = lazy(async () => {
  const m = await import('../features/monitoring/drilldown/DrilldownPage');
  return { default: m.DrilldownPage };
});

export const LazyDemandPage = lazy(async () => {
  const m = await import('../features/monitoring/demand/DemandPage');
  return { default: m.DemandPage };
});

export const LazyQualityPage = lazy(async () => {
  const m = await import('../features/monitoring/quality/QualityPage');
  return { default: m.QualityPage };
});

export const LazyDevicesPage = lazy(async () => {
  const m = await import('../features/monitoring/devices/DevicesPage');
  return { default: m.DevicesPage };
});

export const LazyFaultHistoryPage = lazy(async () => {
  const m = await import('../features/monitoring/fault-history/FaultHistoryPage');
  return { default: m.FaultHistoryPage };
});

export const LazyPlaceholderPage = lazy(async () => {
  const m = await import('../features/placeholder/PlaceholderPage');
  return { default: m.PlaceholderPage };
});
