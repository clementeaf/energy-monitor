import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/ui/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { BuildingsPageSkeleton, BuildingDetailSkeleton, MeterDetailSkeleton, DrilldownSkeleton } from '../components/ui/Skeleton';
import { appRoutes } from './appRoutes';

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const UnauthorizedPage = lazy(() => import('../features/auth/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })));
const BuildingsPage = lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage })));
const BuildingDetailPage = lazy(() => import('../features/buildings/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage })));
const MeterDetailPage = lazy(() => import('../features/meters/MeterDetailPage').then((m) => ({ default: m.MeterDetailPage })));
const IoTDevicesPage = lazy(() => import('../features/iot-devices/IoTDevicesPage').then((m) => ({ default: m.IoTDevicesPage })));
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const DrilldownPage = lazy(() => import('../features/drilldown/DrilldownPage').then((m) => ({ default: m.DrilldownPage })));

export const router = createBrowserRouter([
  {
    path: appRoutes.login.path,
    element: <ErrorBoundary><Suspense><LoginPage /></Suspense></ErrorBoundary>,
  },
  {
    path: appRoutes.unauthorized.path,
    element: <ErrorBoundary><Suspense><UnauthorizedPage /></Suspense></ErrorBoundary>,
  },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    errorElement: <ErrorBoundary><></></ErrorBoundary>,
    children: [
      {
        path: appRoutes.buildings.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.buildings.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><BuildingsPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.buildingDetail.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.buildingDetail.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingDetailSkeleton />}><BuildingDetailPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.meterDetail.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.meterDetail.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<MeterDetailSkeleton />}><MeterDetailPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.iotDevices.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.iotDevices.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><IoTDevicesPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.alerts.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.alerts.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><AlertsPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.drilldown.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.drilldown.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<DrilldownSkeleton />}><DrilldownPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
