import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/ui/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { BuildingsPageSkeleton, BuildingDetailSkeleton, MeterDetailSkeleton } from '../components/ui/Skeleton';
import { appRoutes } from './appRoutes';

const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const UnauthorizedPage = lazy(() => import('../features/auth/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })));
const BuildingsPage = lazy(() => import('../features/buildings/BuildingsPage').then((m) => ({ default: m.BuildingsPage })));
const BuildingDetailPage = lazy(() => import('../features/buildings/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage })));
const MeterDetailPage = lazy(() => import('../features/meters/MeterDetailPage').then((m) => ({ default: m.MeterDetailPage })));

export const router = createBrowserRouter([
  {
    path: appRoutes.login.path,
    element: <Suspense><LoginPage /></Suspense>,
  },
  {
    path: appRoutes.unauthorized.path,
    element: <Suspense><UnauthorizedPage /></Suspense>,
  },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      {
        path: appRoutes.buildings.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.buildings.allowedRoles]}>
            <Suspense fallback={<BuildingsPageSkeleton />}><BuildingsPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.buildingDetail.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.buildingDetail.allowedRoles]}>
            <Suspense fallback={<BuildingDetailSkeleton />}><BuildingDetailPage /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: appRoutes.meterDetail.path,
        element: (
          <ProtectedRoute allowedRoles={[...appRoutes.meterDetail.allowedRoles]}>
            <Suspense fallback={<MeterDetailSkeleton />}><MeterDetailPage /></Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
