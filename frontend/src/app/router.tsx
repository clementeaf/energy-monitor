import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { BuildingsPageSkeleton, BuildingDetailSkeleton, MeterDetailSkeleton, MeterReadingsSkeleton, RealtimeSkeleton, AlertsSkeleton, AlertDetailSkeleton } from '../components/ui/Skeleton';
import { TempLayout } from '../components/ui/TempLayout';
import { appRoutes } from './appRoutes';

const pages = {
  buildings:          lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage }))),
  buildingDetail:     lazy(() => import('../features/buildings/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage }))),
  meterDetail:        lazy(() => import('../features/meters/MeterDetailPage').then((m) => ({ default: m.MeterDetailPage }))),
  meterReadings:      lazy(() => import('../features/meters/MeterReadingsPage').then((m) => ({ default: m.MeterReadingsPage }))),
  monitoringRealtime: lazy(() => import('../features/monitoring/RealtimePage').then((m) => ({ default: m.RealtimePage }))),
  alerts:             lazy(() => import('../features/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage }))),
  alertDetail:        lazy(() => import('../features/alerts/AlertDetailPage').then((m) => ({ default: m.AlertDetailPage }))),
};

const skeletons: Record<string, ReactNode> = {
  buildings:          <BuildingsPageSkeleton />,
  buildingDetail:     <BuildingDetailSkeleton />,
  meterDetail:        <MeterDetailSkeleton />,
  meterReadings:      <MeterReadingsSkeleton />,
  monitoringRealtime: <RealtimeSkeleton />,
  alerts:             <AlertsSkeleton />,
  alertDetail:        <AlertDetailSkeleton />,
};

const routeConfig: { key: keyof typeof pages; routeKey: keyof typeof appRoutes }[] = [
  { key: 'buildings',          routeKey: 'buildings' },
  { key: 'buildingDetail',     routeKey: 'buildingDetail' },
  { key: 'meterDetail',        routeKey: 'meterDetail' },
  { key: 'meterReadings',      routeKey: 'meterReadings' },
  { key: 'monitoringRealtime', routeKey: 'monitoringRealtime' },
  { key: 'alerts',             routeKey: 'alerts' },
  { key: 'alertDetail',        routeKey: 'alertDetail' },
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
