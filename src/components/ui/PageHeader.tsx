import { useNavigate } from 'react-router';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  showBack?: boolean;
}

export function PageHeader({ title, breadcrumbs, showBack }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 text-sm text-[#999]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1">/</span>}
              {crumb.to ? (
                <span
                  className="cursor-pointer hover:text-[#333]"
                  onClick={() => navigate(crumb.to!)}
                >
                  {crumb.label}
                </span>
              ) : (
                <span className="text-[#333]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="border border-[#e0e0e0] bg-white px-3 py-1 text-sm hover:border-[#999]"
          >
            &larr; Volver
          </button>
        )}
        <h1 className="text-2xl font-bold text-black">{title}</h1>
      </div>
    </div>
  );
}
