import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

export function Header() {
  const { user, buildings } = useAuthStore();
  const { toggleSidebar, selectedBuildingId, setSelectedBuildingId } = useAppStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {buildings.length > 0 && (
          <select
            value={selectedBuildingId ?? ''}
            onChange={(e) => setSelectedBuildingId(e.target.value || null)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-[var(--color-primary,#3D3BF3)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#3D3BF3)]"
          >
            <option value="">Todos los edificios</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {user?.displayName ?? user?.email}
        </span>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">
          {user?.role.name}
        </span>
      </div>
    </header>
  );
}
