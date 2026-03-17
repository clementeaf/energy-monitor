import { useState, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
}

export function ContextMenu({ items }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="rounded p-1 text-pa-text-muted hover:bg-gray-100 hover:text-pa-text transition-colors"
        aria-label="Opciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[120px] rounded-lg border border-pa-border bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-pa-text'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
