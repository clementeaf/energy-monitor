import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { DashboardSkeleton, BuildingsPageSkeleton, BuildingDetailSkeleton, MeterDetailSkeleton, MeterReadingsSkeleton, RealtimeSkeleton, AlertsSkeleton, AlertDetailSkeleton, ComparisonsSkeleton } from '../components/ui/Skeleton';
import { TempLayout } from '../components/ui/TempLayout';
import { appRoutes } from './appRoutes';

const pages = {
  dashboard:          lazy(() => import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))),
  buildings:          lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage }))),
  buildingDetail:     lazy(() => import('../features/buildings/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage }))),
  meterDetail:        lazy(() => import('../features/meters/MeterDetailPage').then((m) => ({ default: m.MeterDetailPage }))),
  meterReadings:      lazy(() => import('../features/meters/MeterReadingsPage').then((m) => ({ default: m.MeterReadingsPage }))),
  monitoringRealtime: lazy(() => import('../features/monitoring/RealtimePage').then((m) => ({ default: m.RealtimePage }))),
  alerts:             lazy(() => import('../features/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage }))),
  alertDetail:        lazy(() => import('../features/alerts/AlertDetailPage').then((m) => ({ default: m.AlertDetailPage }))),
  comparisons:        lazy(() => import('../features/comparisons/ComparisonsPage').then((m) => ({ default: m.ComparisonsPage }))),
};

const skeletons: Record<string, ReactNode> = {
  dashboard:          <DashboardSkeleton />,
  buildings:          <BuildingsPageSkeleton />,
  buildingDetail:     <BuildingDetailSkeleton />,
  meterDetail:        <MeterDetailSkeleton />,
  meterReadings:      <MeterReadingsSkeleton />,
  monitoringRealtime: <RealtimeSkeleton />,
  alerts:             <AlertsSkeleton />,
  alertDetail:        <AlertDetailSkeleton />,
  comparisons:        <ComparisonsSkeleton />,
};

const routeConfig: { key: keyof typeof pages; routeKey: keyof typeof appRoutes }[] = [
  { key: 'dashboard',          routeKey: 'dashboard' },
  { key: 'buildings',          routeKey: 'buildings' },
  { key: 'buildingDetail',     routeKey: 'buildingDetail' },
  { key: 'meterDetail',        routeKey: 'meterDetail' },
  { key: 'meterReadings',      routeKey: 'meterReadings' },
  { key: 'monitoringRealtime', routeKey: 'monitoringRealtime' },
  { key: 'alerts',             routeKey: 'alerts' },
  { key: 'alertDetail',        routeKey: 'alertDetail' },
  { key: 'comparisons',        routeKey: 'comparisons' },
];

export const router = createBrowserRouter([
  {
    element: <TempLayout />,
    errorElement: <ErrorBoundary><></></ErrorBoundary>,
    children: routeConfig.map(({ key, routeKey }) => {
      const Page = pages[key];
      const route = appRoutes[routeKey];
      return {
        path: route.path,
        element: (
          <ErrorBoundary>
            <Suspense fallback={skeletons[key] ?? null}>
              <Page />
            </Suspense>
          </ErrorBoundary>
        ),
      };
    }),
  },
]);
