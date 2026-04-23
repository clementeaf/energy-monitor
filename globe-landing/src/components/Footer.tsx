import logo from '../assets/globe-logo.png';
import clcLogo from '../assets/CLC.png';
import googleLogo from '../assets/google.png';
import bboschLogo from '../assets/bbosch.png';
import angloLogo from '../assets/angloAmerican.png';
import roseLogo from '../assets/rose.png';

export function Footer() {
  return (
    <footer className="py-12 px-5 sm:px-10 lg:px-12 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Logo + LinkedIn — stacked on mobile, row on desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-10 border-b border-grey-200">
          <img src={logo} alt="Grupo Globe" className="h-[58px] w-auto" />

          <a
            href="https://www.linkedin.com/company/grupo-globe"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn icon-btn-lg text-grey-800 border-grey-300 hover:bg-grey-100 mt-4 lg:mt-0"
            aria-label="LinkedIn"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>

        {/* Content — single column on mobile, 3 columns on desktop */}
        <div className="pt-10 flex flex-col lg:flex-row lg:justify-between gap-10">
          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold text-brand-dark mb-4">Contáctanos</h4>
            <ul className="space-y-3 text-sm text-grey-700">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                566000061666              
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                Contacto@grupoglobe.com
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Isidora Goyenechea 3520, Of. 300, Las Condes.
              </li>
            </ul>
          </div>

          {/* Business areas */}
          <div>
            <h4 className="text-sm font-bold text-brand-dark mb-4">Nuestras áreas de negocios</h4>
            <ul className="space-y-2 text-sm text-grey-700">
              <li><a href="#" className="hover:text-grey-900 transition-colors">Globe Power</a></li>
              <li><a href="#" className="hover:text-grey-900 transition-colors">Globe Services</a></li>
              <li><a href="#" className="hover:text-grey-900 transition-colors">Globe Modular</a></li>
              <li><a href="#" className="hover:text-grey-900 transition-colors">Globe Lift Parts</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-bold text-brand-dark mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-grey-700">
              <li><a href="#" className="hover:text-grey-900 transition-colors">Políticas de privacidad</a></li>
              <li><a href="#" className="hover:text-grey-900 transition-colors">Canal de denuncias</a></li>
              <li><a href="#" className="hover:text-grey-900 transition-colors">Código de ética</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright — desktop only */}
        <p className="hidden lg:block mt-6 text-sm font-bold text-grey-700">
          Todos los derechos reservados 2026.
        </p>

        {/* Client logos */}
        <div className="pt-10 mt-10 border-t border-grey-200 flex items-center gap-8 overflow-x-auto">
          <img src={clcLogo} alt="CLC" className="h-10 w-auto object-contain shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={googleLogo} alt="Google" className="h-10 w-auto object-contain shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={bboschLogo} alt="Bosch" className="h-10 w-auto object-contain shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={angloLogo} alt="Anglo American" className="h-10 w-auto object-contain shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={roseLogo} alt="Rose" className="h-10 w-auto object-contain shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
        </div>
      </div>
    </footer>
  );
}
