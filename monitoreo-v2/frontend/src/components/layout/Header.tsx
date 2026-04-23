import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

export function Header() {
  const { user } = useAuthStore();
  const { toggleSidebar } = useAppStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200/80 bg-white px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-md p-1.5 text-gray-500 transition-all duration-150 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          {user?.displayName ?? user?.email}
        </span>
        <span className="rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 capitalize">
          {user?.role.name}
        </span>
      </div>
    </header>
  );
}
