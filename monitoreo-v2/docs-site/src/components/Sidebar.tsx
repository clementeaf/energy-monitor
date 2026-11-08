import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { navigation, type NavItem } from '../lib/navigation';

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.items) return false;
    return item.items.some(
      (child) => child.href === pathname || child.items?.some((c) => c.href === pathname),
    );
  });

  const isActive = item.href === pathname;
  const pl = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : 'pl-9';

  if (item.items) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex w-full items-center justify-between py-1.5 ${pl} pr-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors`}
        >
          <span>{item.title}</span>
          <svg
            className={`h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {open && (
          <div className="mt-0.5">
            {item.items.map((child) => (
              <NavLink key={child.title} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (item.badge) {
    return (
      <div className={`flex items-center gap-2 py-1.5 ${pl} text-sm text-[var(--color-text-muted)] cursor-default`}>
        <span>{item.title}</span>
        <span className="text-[10px] font-medium bg-[var(--color-bg-code)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">
          {item.badge}
        </span>
      </div>
    );
  }

  return (
    <Link
      to={item.href!}
      className={`block py-1.5 ${pl} text-sm rounded-md transition-colors ${
        isActive
          ? 'bg-[var(--color-bg-hover)] font-medium text-[var(--color-text)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]'
      }`}
    >
      {item.title}
    </Link>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-14 bottom-0 z-50 w-64 shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-4 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="space-y-6">
          {navigation.map((group, i) => (
            <div key={i}>
              {group.label && (
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.title} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
