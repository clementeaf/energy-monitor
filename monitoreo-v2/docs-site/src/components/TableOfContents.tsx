import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const el = document.querySelector('article');
    if (!el) return;
    const nodes = el.querySelectorAll('h2[id], h3[id]');
    setHeadings(
      Array.from(nodes).map((n) => ({
        id: n.id,
        text: n.textContent ?? '',
        level: n.tagName === 'H2' ? 2 : 3,
      })),
    );
  }, []);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <aside className="hidden xl:block sticky top-14 w-56 shrink-0 py-8 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
        En esta pagina
      </div>
      <nav className="space-y-1">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`block text-[13px] py-0.5 transition-colors ${h.level === 3 ? 'pl-3' : ''} ${
              activeId === h.id
                ? 'text-[var(--color-text)] font-medium'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
