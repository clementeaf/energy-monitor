import { lazy, Suspense } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import { Layout } from '../components/ui/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { BuildingsPageSkeleton, BuildingDetailSkeleton, MeterDetailSkeleton, DrilldownSkeleton } from '../components/ui/Skeleton';
import { appRoutes } from './appRoutes';

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const InviteAcceptPage = lazy(() => import('../features/auth/InviteAcceptPage').then((m) => ({ default: m.InviteAcceptPage })));
const UnauthorizedPage = lazy(() => import('../features/auth/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })));
const ContextSelectPage = lazy(() => import('../features/auth/ContextSelectPage').then((m) => ({ default: m.ContextSelectPage })));
const BuildingsPage = lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage })));
const BuildingDetailPage = lazy(() => import('../features/buildings/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage })));
const MeterDetailPage = lazy(() => import('../features/meters/MeterDetailPage').then((m) => ({ default: m.MeterDetailPage })));
const RealtimePage = lazy(() => import('../features/monitoring/RealtimePage').then((m) => ({ default: m.RealtimePage })));
const IoTDevicesPage = lazy(() => import('../features/iot-devices/IoTDevicesPage').then((m) => ({ default: m.IoTDevicesPage })));
const AlertsPage = lazy(() => import('../features/alerts/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const AlertDetailPage = lazy(() => import('../features/alerts/AlertDetailPage').then((m) => ({ default: m.AlertDetailPage })));
const DrilldownPage = lazy(() => import('../features/drilldown/DrilldownPage').then((m) => ({ default: m.DrilldownPage })));
const AdminSitesPage = lazy(() => import('../features/admin/AdminSitesPage').then((m) => ({ default: m.AdminSitesPage })));
const AdminUsersPage = lazy(() => import('../features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminMetersPage = lazy(() => import('../features/admin/AdminMetersPage').then((m) => ({ default: m.AdminMetersPage })));
const AdminHierarchyPage = lazy(() => import('../features/admin/AdminHierarchyPage').then((m) => ({ default: m.AdminHierarchyPage })));

export const router = createBrowserRouter([
  {
    path: appRoutes.login.path,
    element: <ErrorBoundary><Suspense><LoginPage /></Suspense></ErrorBoundary>,
  },
  {
    path: appRoutes.invitationAccept.path,
    element: <ErrorBoundary><Suspense><InviteAcceptPage /></Suspense></ErrorBoundary>,
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
        path: appRoutes.contextSelect.path,
        element: (
          <ProtectedRoute enforceSiteContext={false}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><ContextSelectPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
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
        path: appRoutes.monitoringRealtime.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.monitoringRealtime.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><RealtimePage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.monitoringDevices.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.monitoringDevices.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><IoTDevicesPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.iotDevicesLegacy.path,
        element: <Navigate to={appRoutes.monitoringDevices.path} replace />,
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
        path: appRoutes.alertDetail.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.alertDetail.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><AlertDetailPage /></Suspense>
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
      {
        path: appRoutes.adminSites.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.adminSites.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><AdminSitesPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.adminUsers.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.adminUsers.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><AdminUsersPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.adminMeters.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.adminMeters.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<BuildingsPageSkeleton />}><AdminMetersPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.adminHierarchy.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.adminHierarchy.allowedRoles]}>
            <ErrorBoundary>
              <Suspense fallback={<DrilldownSkeleton />}><AdminHierarchyPage /></Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
