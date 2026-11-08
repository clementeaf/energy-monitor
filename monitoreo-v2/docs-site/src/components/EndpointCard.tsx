import { Link } from 'react-router';

interface EndpointRow {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  href: string;
}

export function EndpointTable({ title, rows }: { title: string; rows: EndpointRow[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.path} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)] transition-colors">
                <td className="py-2 px-2 w-16">
                  <span className={`api-badge api-badge-${row.method.toLowerCase()}`}>{row.method}</span>
                </td>
                <td className="py-2 px-2 font-mono text-xs">
                  <Link to={row.href} className="text-[var(--color-text)] hover:underline">{row.path}</Link>
                </td>
                <td className="py-2 px-2 text-[var(--color-text-secondary)]">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      to={href}
      className="block rounded-lg border border-[var(--color-border)] p-4 hover:bg-[var(--color-bg-hover)] transition-colors"
    >
      <div className="font-medium text-sm text-[var(--color-text)]">{title}</div>
      <div className="text-sm text-[var(--color-text-muted)] mt-1">{description}</div>
    </Link>
  );
}
