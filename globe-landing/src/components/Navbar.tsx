import { useState } from 'react';
import logo from '../assets/globe-logo.png';

const links = [
  { label: 'Quiénes somos', href: '#nosotros' },
  { label: 'Valores', href: '#valores' },
  { label: 'Industrias', href: '#industrias' },
  { label: 'Ecosistema Globe', href: '#ecosistema' },
  { label: 'Cultura e Innovación', href: '#innovacion' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-[5px]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-[60px] flex items-center justify-between py-8">
        {/* Logo — Figma: 245×52, shadow */}
        <a href="#" className="shrink-0">
          <img
            src={logo}
            alt="Grupo Globe"
            className="h-[52px] w-[245px] object-contain drop-shadow-[4px_-8px_26px_rgba(255,255,255,0.2)]"
          />
        </a>

        {/* Desktop links + CTA */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-body text-[14px] leading-[18px] font-medium text-grey-900 hover:text-grey-600 transition-colors duration-200 whitespace-nowrap"
            >
              {l.label}
            </a>
          ))}

          {/* CTA — Figma: solid #3c3c3c pill, white text, arrow icon */}
          <a
            href="#contacto"
            className="inline-flex items-center gap-3.5 rounded-[100px] bg-grey-800 px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-grey-900 transition-colors duration-200 whitespace-nowrap"
          >
            Contáctanos
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
            </svg>
          </a>
        </div>

        {/* Mobile hamburger (dehaze icon) */}
        <button
          className="lg:hidden p-2 text-grey-900"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 15.5v2h20v-2H2zm0-5v2h20v-2H2zm0-5v2h20v-2H2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-grey-200 px-5 pb-6 pt-4 space-y-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block font-body text-[14px] leading-[18px] font-medium text-grey-900 hover:text-grey-600 transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contacto"
            className="flex items-center justify-center gap-3.5 rounded-[100px] bg-grey-800 px-[18px] py-3 font-body text-[14px] leading-[18px] font-medium text-white hover:bg-grey-900 transition-colors"
            onClick={() => setOpen(false)}
          >
            Contáctanos
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
            </svg>
          </a>
        </div>
      )}
    </nav>
  );
}
