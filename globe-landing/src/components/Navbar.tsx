import { useState } from 'react';

const links = [
  { label: 'Inicio', href: '#' },
  { label: 'Ecosistema', href: '#ecosistema' },
  { label: 'Services', href: '#services' },
  { label: 'Trabaja con Nosotros', href: '#trabaja' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 flex items-center justify-between h-16">
        <span className="text-xl font-bold tracking-tight text-navy">Globe Power</span>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="hover:text-navy transition-colors">{l.label}</a>
          ))}
        </div>

        <a
          href="#contacto"
          className="hidden md:inline-flex px-5 py-2 bg-gray-100 text-navy text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
        >
          Agenda una Consulta
        </a>

        <button
          className="md:hidden p-2 text-gray-500"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 pb-4 pt-2 space-y-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block text-sm font-medium text-gray-500 hover:text-navy"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
