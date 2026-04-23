import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useClickOutside } from '../../hooks/useClickOutside';

const COUNTRIES = [
  { code: 'CL', label: 'CHILE' },
  { code: 'CO', label: 'COLOMBIA' },
  { code: 'PE', label: 'PERU' },
] as const;

function FlagCircle({ code, size = 18 }: Readonly<{ code: string; size?: number }>) {
  const r = size / 2;
  const flags: Record<string, React.ReactNode> = {
    CL: (
      <>
        <rect width={size} height={r} fill="#fff" />
        <rect y={r} width={size} height={r} fill="#D52B1E" />
        <rect width={r} height={size} fill="#0039A6" />
        <circle cx={r / 2} cy={r} r={r * 0.22} fill="#fff" />
      </>
    ),
    CO: (
      <>
        <rect width={size} height={r} fill="#FCD116" />
        <rect y={r} width={size} height={r * 0.5} fill="#003893" />
        <rect y={r * 1.5} width={size} height={r * 0.5} fill="#CE1126" />
      </>
    ),
    PE: (
      <>
        <rect width={size * 0.33} height={size} fill="#D91023" />
        <rect x={size * 0.33} width={size * 0.34} height={size} fill="#fff" />
        <rect x={size * 0.67} width={size * 0.33} height={size} fill="#D91023" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <clipPath id={`flag-${code}`}><circle cx={r} cy={r} r={r} /></clipPath>
      <g clipPath={`url(#flag-${code})`}>{flags[code]}</g>
      <circle cx={r} cy={r} r={r - 0.5} fill="none" stroke="#000" strokeOpacity="0.1" />
    </svg>
  );
}

export function Header() {
  const { user } = useAuthStore();
  const { toggleSidebar } = useAppStore();
  const navigate = useNavigate();
  const [activeCountry, setActiveCountry] = useState<string>('CL');
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside([btnRef, menuRef], () => setMenuOpen(false), menuOpen);

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-pa-border bg-white px-4">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-pa-text-muted transition-colors hover:bg-gray-100 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Country selector */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setActiveCountry(c.code)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              activeCountry === c.code
                ? 'bg-white text-pa-navy shadow-sm'
                : 'text-pa-text-muted hover:text-pa-text'
            }`}
          >
            <FlagCircle code={c.code} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-pa-border" />

      {/* Contact icons */}
      <a
        href="https://wa.me/56221111111"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-pa-text-muted transition-colors hover:bg-gray-100 hover:text-green-600"
        title="WhatsApp"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      <a
        href="mailto:atencion@globepower.cl"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-pa-text-muted transition-colors hover:bg-gray-100 hover:text-pa-blue"
        title="Email"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-10 7L2 7" />
        </svg>
      </a>

      <div className="h-5 w-px bg-pa-border" />

      {/* User menu */}
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-pa-text transition-colors hover:bg-gray-100"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pa-navy text-[11px] font-semibold text-white">
            {initials}
          </span>
          <span className="hidden text-[13px] font-medium sm:inline">{user?.displayName ?? user?.email ?? 'Usuario'}</span>
          <svg className="h-3 w-3 opacity-50" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-pa-border bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-pa-text transition-colors hover:bg-gray-100"
            >
              <svg className="h-4 w-4 text-pa-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Configuración perfil
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
