import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/ui/Layout';
import { BuildingsPage } from '../features/buildings/BuildingsPage';
import { BuildingDetailPage } from '../features/buildings/BuildingDetailPage';
import { LocalDetailPage } from '../features/locals/LocalDetailPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <BuildingsPage /> },
      { path: '/buildings/:id', element: <BuildingDetailPage /> },
      { path: '/buildings/:buildingId/locals/:localId', element: <LocalDetailPage /> },
    ],
  },
]);
