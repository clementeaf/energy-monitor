import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

export function Header() {
  const { user } = useAuthStore();
  const { toggleSidebar } = useAppStore();

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-pa-border bg-white px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-pa-text-muted transition-colors hover:bg-raised lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <span className="hidden text-[13px] font-medium text-pa-text sm:inline">
          {user?.displayName ?? user?.email}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pa-navy text-[11px] font-semibold text-white">
          {initials}
        </span>
      </div>
    </header>
  );
}
