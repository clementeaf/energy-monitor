import { useEffect, useRef, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

type SortValue = string | number;

export function sortRows<T, K extends string>(rows: T[], sort: SortState<K>, getters: Record<K, (row: T) => SortValue>): T[] {
  const getValue = getters[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    const order = typeof va === 'string' ? va.localeCompare(String(vb), 'es') : va - Number(vb);
    return order * sign;
  });
}

export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  return { key, direction: 'desc' };
}

export function useSort<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState(initial);
  return { sort, toggleSort: (key: K) => setSort((current) => nextSort(current, key)) };
}

const ARIA_SORT: Record<SortDirection, 'ascending' | 'descending'> = { asc: 'ascending', desc: 'descending' };

export function SortableTh<K extends string>({ label, sortKey, sort, onToggle, alignRight = false }: Readonly<{
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onToggle: (key: K) => void;
  alignRight?: boolean;
}>) {
  const isActive = sort.key === sortKey;
  return (
    <th aria-sort={isActive ? ARIA_SORT[sort.direction] : 'none'} className={`px-5 py-2.5 text-[11px] font-normal ${alignRight ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => onToggle(sortKey)} title={`Ordenar por ${label}`} className={`hover:text-foreground ${isActive ? 'text-primary' : 'text-muted'}`}>
        {label}{isActive && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
      </button>
    </th>
  );
}

export function SelectAllCheckbox({ selectedCount, totalCount, onToggle }: Readonly<{ selectedCount: number; totalCount: number; onToggle: () => void }>) {
  const ref = useRef<HTMLInputElement>(null);
  const isAll = totalCount > 0 && selectedCount === totalCount;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selectedCount > 0 && !isAll;
  }, [selectedCount, isAll]);
  return <input ref={ref} type="checkbox" aria-label="Seleccionar todo" checked={isAll} onChange={onToggle} className="rounded border-border" />;
}

const PAGER_BUTTON = 'rounded-lg border border-border bg-surface px-3 py-1.5 font-medium text-foreground disabled:opacity-40';

export function TablePager({ pagina, porPagina, total, onChange }: Readonly<{ pagina: number; porPagina: number; total: number; onChange: (pagina: number) => void }>) {
  const mostrando = Math.max(0, Math.min(porPagina, total - pagina * porPagina));
  return (
    <footer className="flex items-center justify-between px-5 py-3 text-xs text-muted">
      <span>Mostrando {mostrando} de {total}</span>
      <div className="flex gap-2">
        <button type="button" disabled={pagina === 0} onClick={() => onChange(pagina - 1)} className={PAGER_BUTTON}>Anterior</button>
        <button type="button" disabled={(pagina + 1) * porPagina >= total} onClick={() => onChange(pagina + 1)} className={PAGER_BUTTON}>Siguiente</button>
      </div>
    </footer>
  );
}

export interface BulkAction {
  label: string;
  onSelect: () => void;
}

export function BulkBar({ count, noun, onClear, actions }: Readonly<{ count: number; noun: string; onClear: () => void; actions: BulkAction[] }>) {
  if (count === 0) return null;
  return (
    <div role="toolbar" aria-label="Acciones en lote" className="fixed inset-x-0 bottom-6 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-primary py-2 pl-4 pr-2 text-sm text-primary-fg shadow-lg">
      <span className="mr-2 whitespace-nowrap">{count} {noun}{count === 1 ? '' : 's'} seleccionado{count === 1 ? '' : 's'}</span>
      {actions.map((action) => (
        <button key={action.label} type="button" onClick={action.onSelect} className="whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-hover">{action.label}</button>
      ))}
      <button type="button" onClick={onClear} aria-label="Quitar selección" className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary-fg/70 hover:text-primary-fg">✕</button>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: Readonly<{ value: string; onChange: (value: string) => void; placeholder: string }>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⊙</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-64 rounded-lg border border-border bg-surface pl-8 pr-8 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground">✕</button>
      )}
    </div>
  );
}

export function EmptyFilterState({ title, text, onReset }: Readonly<{ title: string; text: string; onReset: () => void }>) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted">{text}</p>
      <button type="button" onClick={onReset} className="mt-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-raised">
        Quitar filtros
      </button>
    </div>
  );
}

export function onRowKeyDown(open: () => void) {
  return (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  };
}

export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return {
    selected,
    toggle: (id: string) => setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    }),
    toggleAll: (ids: string[]) => setSelected((current) => (ids.length > 0 && ids.every((id) => current.has(id)) ? new Set() : new Set(ids))),
    clear: () => setSelected(new Set()),
  };
}

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  isDanger?: boolean;
}

export function RowMenu({ label, items }: Readonly<{ label: string; items: RowMenuItem[] }>) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anchor) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setAnchor(null);
    };
    const dismiss = () => setAnchor(null);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [anchor]);
  return (
    <div ref={ref} onClick={(event) => event.stopPropagation()}>
      <button type="button" aria-label={label} aria-expanded={anchor !== null} onClick={(event) => setAnchor(anchor ? null : event.currentTarget.getBoundingClientRect())} className="rounded-md px-2 py-1 text-muted hover:bg-raised hover:text-foreground">⋯</button>
      {anchor && (
        <div role="menu" style={{ top: anchor.bottom + 4, right: window.innerWidth - anchor.right }} className="fixed z-40 min-w-48 rounded-lg border border-border bg-surface py-1 shadow-float">
          {items.map((item) => (
            <button key={item.label} type="button" role="menuitem" onClick={() => { setAnchor(null); item.onSelect(); }}
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-raised ${item.isDanger ? 'text-danger' : 'text-foreground'}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
