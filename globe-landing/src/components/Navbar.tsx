import { useState } from 'react';

const links = [
  { label: 'Inicio', href: '#' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Servicios', href: '#ecosistema' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Contáctanos', href: '#contacto' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gp-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 flex items-center justify-between h-[68px]">
        <a href="#" className="text-xl font-bold tracking-tight text-gp-800">
          Globe Power
        </a>

        <div className="hidden md:flex items-center gap-10 text-sm font-medium text-text-body">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="hover:text-gp-700 transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a href="#contacto" className="hidden md:inline-flex btn-primary !py-2.5 !px-6 !text-sm">
          Contáctanos
        </a>

        <button
          className="md:hidden p-2 text-text-body"
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
        <div className="md:hidden bg-white border-t border-gp-200/60 px-5 pb-5 pt-3 space-y-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block text-sm font-medium text-text-body hover:text-gp-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contacto"
            className="btn-primary w-full text-center !text-sm"
            onClick={() => setOpen(false)}
          >
            Contáctanos
          </a>
        </div>
      )}
    </nav>
  );
}
