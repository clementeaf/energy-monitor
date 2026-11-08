import { useState, type ReactNode } from 'react';

export function CodeBlock({ children, title }: { children: ReactNode; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const el = document.querySelector('[data-code-content]');
    if (el) {
      navigator.clipboard.writeText(el.textContent ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group">
      {title && (
        <div className="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-code)] border border-b-0 border-[var(--color-border)] rounded-t-lg px-4 py-1.5">
          {title}
        </div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1"
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
      <div data-code-content>{children}</div>
    </div>
  );
}
