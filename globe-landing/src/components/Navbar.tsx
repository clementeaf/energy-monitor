import { useState } from 'react';
import logo from '../assets/globe-logo.png';

const links = [
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Industrias', href: '#industrias' },
  { label: 'Innovación', href: '#innovacion' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-10 lg:px-12 flex items-center justify-between h-[72px]">
        {/* Logo */}
        <a href="#" className="shrink-0">
          <img src={logo} alt="Grupo Globe" className="h-[65px] w-auto" />
        </a>

        {/* Desktop links — right-shifted */}
        <div className="hidden md:flex items-center gap-10 text-sm font-medium text-gray-600 ml-auto mr-10">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="hover:text-gray-900 transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA button */}
        <a
          href="#contacto"
          className="hidden md:inline-flex items-center gap-2 rounded-full border border-gray-900 px-5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white transition-colors duration-200"
        >
          Contáctanos
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-700"
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

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-200/60 px-5 pb-5 pt-3 space-y-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contacto"
            className="flex items-center justify-center gap-2 rounded-full border border-gray-900 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
          >
            Contáctanos
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>
        </div>
      )}
    </nav>
  );
}
