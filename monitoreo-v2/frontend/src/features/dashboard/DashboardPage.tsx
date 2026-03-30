import { useAuthStore } from '../../store/useAuthStore';

export function DashboardPage() {
  const { user, tenant } = useAuthStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Usuario" value={user?.displayName ?? user?.email ?? '—'} />
        <Card title="Rol" value={user?.role.name ?? '—'} />
        <Card title="Color primario" value={tenant?.primaryColor ?? '—'} />
        <Card title="Proveedor" value={user?.authProvider ?? '—'} />
      </div>

      <p className="text-sm text-gray-500">
        Scaffold completado. Las vistas de datos se conectaran en la siguiente fase.
      </p>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{value}</p>
    </div>
  );
}
