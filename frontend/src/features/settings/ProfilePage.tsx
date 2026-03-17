import { useAuthStore } from '../../store/useAuthStore';

export function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-lg font-semibold text-pa-text">Configuracion perfil</h1>

      <div className="max-w-lg rounded-xl bg-white p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-pa-text-muted">Nombre</label>
            <p className="text-sm text-pa-text">{user?.name ?? 'Usuario'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-pa-text-muted">Email</label>
            <p className="text-sm text-pa-text">{user?.email ?? '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-pa-text-muted">Rol</label>
            <p className="text-sm text-pa-text">{user?.role ?? 'Sin rol asignado'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
