import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { BuildingsPageSkeleton, BuildingDetailSkeleton, MeterDetailSkeleton } from '../components/ui/Skeleton';
// TODO: restore when re-enabling login
// import { ProtectedRoute } from '../components/auth/ProtectedRoute';
// import { Layout } from '../components/ui/Layout';
import { TempLayout } from '../components/ui/TempLayout';
import { appRoutes } from './appRoutes';

// -- Lazy pages (solo las activas) --
const pages = {
  buildings:          lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage }))),
  buildingDetail:     lazy(() => import('../features/buildings/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage }))),
  meterDetail:        lazy(() => import('../features/meters/MeterDetailPage').then((m) => ({ default: m.MeterDetailPage }))),
  monitoringRealtime: lazy(() => import('../features/monitoring/RealtimePage').then((m) => ({ default: m.RealtimePage }))),
  monitoringDevices:  lazy(() => import('../features/iot-devices/IoTDevicesPage').then((m) => ({ default: m.IoTDevicesPage }))),
  alerts:             lazy(() => import('../features/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage }))),
  alertDetail:        lazy(() => import('../features/alerts/AlertDetailPage').then((m) => ({ default: m.AlertDetailPage }))),
};

// -- Skeleton map --
const skeletons: Partial<Record<string, ReactNode>> = {
  buildings:      <BuildingsPageSkeleton />,
  buildingDetail: <BuildingDetailSkeleton />,
  meterDetail:    <MeterDetailSkeleton />,
};

// -- Route config: solo vistas activas --
const routeConfig: { key: keyof typeof pages; routeKey: keyof typeof appRoutes }[] = [
  { key: 'buildings',          routeKey: 'buildings' },
  { key: 'buildingDetail',     routeKey: 'buildingDetail' },
  { key: 'meterDetail',        routeKey: 'meterDetail' },
  { key: 'monitoringRealtime', routeKey: 'monitoringRealtime' },
  { key: 'monitoringDevices',  routeKey: 'monitoringDevices' },
  { key: 'alerts',             routeKey: 'alerts' },
  { key: 'alertDetail',        routeKey: 'alertDetail' },
  // TODO: restore when needed
  // { key: 'drilldown',          routeKey: 'drilldown' },
  // { key: 'adminSites',         routeKey: 'adminSites' },
  // { key: 'adminUsers',         routeKey: 'adminUsers' },
  // { key: 'adminMeters',        routeKey: 'adminMeters' },
  // { key: 'adminHierarchy',     routeKey: 'adminHierarchy' },
  // { key: 'billing',            routeKey: 'billing' },
];

/** Wrap element with auth guard. Comment out body to bypass auth. */
function withAuth(element: ReactNode, _routeKey: keyof typeof appRoutes): ReactNode {
  // TODO: restore when re-enabling login
  // const route = appRoutes[routeKey];
  // return (
  //   <ProtectedRoute allowedRoles={route.allowedRoles ? [...route.allowedRoles] : undefined}>
  //     {element}
  //   </ProtectedRoute>
  // );
  return element;
}

export const router = createBrowserRouter([
  // -- Public routes --
  // TODO: restore when re-enabling login
  // { path: appRoutes.login.path,            element: <ErrorBoundary><Suspense><pages.login /></Suspense></ErrorBoundary> },
  // { path: appRoutes.invitationAccept.path,  element: <ErrorBoundary><Suspense><pages.inviteAccept /></Suspense></ErrorBoundary> },
  // { path: appRoutes.unauthorized.path,      element: <ErrorBoundary><Suspense><pages.unauthorized /></Suspense></ErrorBoundary> },

  // -- Protected routes --
  {
    // TODO: restore when re-enabling login
    // element: <ProtectedRoute><Layout /></ProtectedRoute>,
    element: <TempLayout />,
    errorElement: <ErrorBoundary><></></ErrorBoundary>,
    children: routeConfig.map(({ key, routeKey }) => {
      const Page = pages[key];
      const route = appRoutes[routeKey];
      return {
        path: route.path,
        element: withAuth(
          <ErrorBoundary>
            <Suspense fallback={skeletons[key] ?? <BuildingsPageSkeleton />}>
              <Page />
            </Suspense>
          </ErrorBoundary>,
          routeKey,
        ),
      };
    }),
  },
]);
