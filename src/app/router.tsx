import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/ui/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { BuildingsPage } from '../features/buildings/BuildingsPage';
import { BuildingDetailPage } from '../features/buildings/BuildingDetailPage';
import { LocalDetailPage } from '../features/locals/LocalDetailPage';
import { LoginPage } from '../features/auth/LoginPage';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage';
import { appRoutes } from './appRoutes';

export const router = createBrowserRouter([
  {
    path: appRoutes.login.path,
    element: <LoginPage />,
  },
  {
    path: appRoutes.unauthorized.path,
    element: <UnauthorizedPage />,
  },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      {
        path: appRoutes.buildings.path,
        element: <ProtectedRoute allowedRoles={[...appRoutes.buildings.allowedRoles]}><BuildingsPage /></ProtectedRoute>,
      },
      {
        path: appRoutes.buildingDetail.path,
        element: <ProtectedRoute allowedRoles={[...appRoutes.buildingDetail.allowedRoles]}><BuildingDetailPage /></ProtectedRoute>,
      },
      {
        path: appRoutes.localDetail.path,
        element: <ProtectedRoute allowedRoles={[...appRoutes.localDetail.allowedRoles]}><LocalDetailPage /></ProtectedRoute>,
      },
    ],
  },
]);
