import { useState, useEffect, useRef, useMemo } from 'react';

const PAGE_SIZE = 15;

/**
 * Generic infinite scroll hook for client-side paginated lists.
 * Returns visible slice, sentinel ref, and hasMore flag.
 *
 * @param items Full array of items
 * @param deps Reset visible count when any dep changes (e.g. filters)
 */
export function useInfiniteScroll<T>(items: T[], deps: unknown[] = []) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  // Reset on filter/data change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE); },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  return { visible, hasMore, sentinelRef, total: items.length };
}
