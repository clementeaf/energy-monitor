import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/globe-logo.png';

const links = [
  { label: 'Quiénes somos', href: '#nosotros' },
  { label: 'Valores', href: '#valores' },
  { label: 'Industrias', href: '#industrias', dropdown: [
    { label: 'Globe Services', to: '/globe-services' },
    { label: 'Globe Power', to: '/globe-power', disabled: false },
    { label: 'Globe Modular', to: '/globe-modular', disabled: false },
  ]},
  { label: 'Ecosistema Globe', href: '#ecosistema' },
  { label: 'Cultura e Innovación', href: '#innovacion' },
];

const SWIPE_THRESHOLD = 80;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    setDragY(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    /* Only allow dragging down */
    setDragY(Math.max(0, delta));
  }, []);

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (dragY > SWIPE_THRESHOLD) {
      setOpen(false);
    }
    setDragY(0);
  }, [dragY]);

  /* #4 — Lock body scroll when menu open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      /* iOS Safari: prevent background scroll */
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY, 10) * -1);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [open]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white backdrop-blur-[5px]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-[60px] flex items-center justify-between py-4 lg:py-3">
          {/* Logo — Figma: 245×52, shadow */}
          <Link to="/" className="shrink-0">
            <img
              src={logo}
              alt="Grupo Globe"
              className="h-auto w-[140px] sm:w-[170px] lg:w-[200px] object-contain object-left"
            />
          </Link>

          {/* Desktop links + CTA */}
          <div className="hidden lg:flex items-center gap-8">
            {links.map((l) =>
              l.dropdown ? (
                <div
                  key={l.label}
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button
                    type="button"
                    className="font-body text-[14px] leading-[18px] font-medium text-grey-900 hover:text-grey-600 transition-colors duration-200 whitespace-nowrap inline-flex items-center gap-1"
                  >
                    {l.label}
                    <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute top-full left-0 pt-2">
                    <div className="bg-white rounded-lg shadow-lg border border-grey-200 py-2 min-w-[180px]">
                      {l.dropdown.map((item) =>
                        item.disabled ? (
                          <span
                            key={item.label}
                            className="block px-4 py-2.5 font-body text-[14px] leading-[18px] text-grey-400 cursor-not-allowed"
                          >
                            {item.label}
                          </span>
                        ) : (
                          <Link
                            key={item.label}
                            to={item.to}
                            className="block px-4 py-2.5 font-body text-[14px] leading-[18px] text-grey-900 hover:bg-grey-100 transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            {item.label}
                          </Link>
                        )
                      )}
                    </div>
                    </div>
                  )}
                </div>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  className="font-body text-[14px] leading-[18px] font-medium text-grey-900 hover:text-grey-600 transition-colors duration-200 whitespace-nowrap"
                >
                  {l.label}
                </a>
              )
            )}

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
      </nav>

      {/* #2 — Mobile menu OUTSIDE nav to avoid nested fixed in Safari */}
      {open && (
        <>
          {/* #1 — Backdrop z-[60] above nav z-50 */}
          <div
            className="lg:hidden fixed inset-0 z-[60]"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setOpen(false)}
          />
          {/* #1 — Bottom sheet z-[70] above backdrop, #3 — safe-area padding */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl px-6 pt-6 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
            style={{
              paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
              transform: `translateY(${dragY}px)`,
              transition: isDragging.current ? 'none' : 'transform 0.3s ease-out',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-6">
              <div className="w-10 h-1 rounded-full bg-grey-300" />
            </div>
            <div className="flex flex-col gap-1">
              {links.map((l) =>
                l.dropdown ? (
                  <div key={l.label}>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((v) => !v)}
                      className="w-full flex items-center justify-between font-body text-[16px] leading-[20px] font-medium text-grey-900 hover:bg-grey-100 transition-colors rounded-lg py-4 px-3"
                    >
                      {l.label}
                      <svg className={`w-5 h-5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                    </button>
                    {dropdownOpen && (
                      <div className="flex flex-col pl-4">
                        {l.dropdown.map((item) =>
                          item.disabled ? (
                            <span
                              key={item.label}
                              className="block font-body text-[15px] leading-[20px] text-grey-400 cursor-not-allowed rounded-lg py-3 px-3"
                            >
                              {item.label}
                            </span>
                          ) : (
                            <Link
                              key={item.label}
                              to={item.to}
                              className="block font-body text-[15px] leading-[20px] text-grey-700 hover:bg-grey-100 transition-colors rounded-lg py-3 px-3"
                              onClick={() => { setDropdownOpen(false); setOpen(false); }}
                            >
                              {item.label}
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    className="block font-body text-[16px] leading-[20px] font-medium text-grey-900 hover:bg-grey-100 transition-colors rounded-lg py-4 px-3"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                )
              )}
            </div>
            <a
              href="#contacto"
              className="flex items-center justify-center gap-3.5 rounded-[100px] bg-grey-800 px-[18px] py-4 mt-4 font-body text-[16px] leading-[20px] font-medium text-white hover:bg-grey-900 transition-colors"
              onClick={() => setOpen(false)}
            >
              Contáctanos
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4v3z" />
              </svg>
            </a>
          </div>
        </>
      )}
    </>
  );
}
