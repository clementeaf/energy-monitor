import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/ui/Layout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { BuildingsPage } from '../features/buildings/BuildingsPage';
import { BuildingDetailPage } from '../features/buildings/BuildingDetailPage';
import { LocalDetailPage } from '../features/locals/LocalDetailPage';
import { LoginPage } from '../features/auth/LoginPage';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { path: '/', element: <BuildingsPage /> },
      { path: '/buildings/:id', element: <BuildingDetailPage /> },
      { path: '/buildings/:buildingId/locals/:localId', element: <LocalDetailPage /> },
    ],
  },
]);
