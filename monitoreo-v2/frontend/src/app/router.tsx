import { createBrowserRouter } from 'react-router';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { APP_ROUTES } from './routes';

export const router = createBrowserRouter([
  {
    path: APP_ROUTES.login,
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: APP_ROUTES.buildings, element: <Placeholder label="Edificios" /> },
          { path: APP_ROUTES.alerts, element: <Placeholder label="Alertas" /> },
        ],
      },
    ],
  },
]);

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
      {label} — por implementar
    </div>
  );
}
