import { useEffect, type RefObject } from 'react';

export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onClose: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const refArray = Array.isArray(refs) ? refs : [refs];
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside = refArray.some((r) => r.current?.contains(target));
      if (!inside) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [refs, onClose, active]);
}
