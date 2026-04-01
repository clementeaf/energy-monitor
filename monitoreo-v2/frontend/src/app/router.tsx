import { createBrowserRouter, Outlet } from 'react-router';
import { SessionGate } from '../components/auth/SessionGate';
import { LayoutShell } from '../components/layout/LayoutShell';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoginRouteShell } from '../components/routing/LoginRouteShell';
import {
  LazyBuildingsPage,
  LazyMetersPage,
  LazyAlertsPage,
  LazyComponentsPage,
  LazyDashboardPage,
  LazyPlaceholderPage,
} from './lazyPages';
import { APP_ROUTES } from './routes';

function RootLayout() {
  return (
    <SessionGate>
      <Outlet />
    </SessionGate>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: APP_ROUTES.login,
        element: <LoginRouteShell />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <LayoutShell />,
            children: [
              { index: true, element: <LazyDashboardPage /> },
              { path: APP_ROUTES.buildings, element: <LazyBuildingsPage /> },
              { path: APP_ROUTES.meters, element: <LazyMetersPage /> },
              { path: APP_ROUTES.alerts, element: <LazyAlertsPage /> },
              { path: APP_ROUTES.billing, element: <LazyPlaceholderPage label="Facturación" /> },
              { path: APP_ROUTES.reports, element: <LazyPlaceholderPage label="Reportes" /> },
              { path: APP_ROUTES.components, element: <LazyComponentsPage /> },
              { path: APP_ROUTES.admin.users, element: <LazyPlaceholderPage label="Usuarios" /> },
              { path: APP_ROUTES.admin.tenants, element: <LazyPlaceholderPage label="Locatarios" /> },
              {
                path: APP_ROUTES.admin.hierarchy,
                element: <LazyPlaceholderPage label="Jerarquía Eléctrica" />,
              },
              { path: APP_ROUTES.admin.audit, element: <LazyPlaceholderPage label="Auditoría" /> },
            ],
          },
        ],
      },
    ],
  },
]);
