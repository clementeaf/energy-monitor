import logo from '../assets/globe-logo.png';
import clcLogo from '../assets/CLC.png';
import googleLogo from '../assets/google.png';
import bboschLogo from '../assets/bbosch.png';
import angloLogo from '../assets/angloAmerican.png';
import roseLogo from '../assets/rose.png';

const FOOTER_LOGOS = [
  { src: clcLogo, alt: 'CLC' },
  { src: googleLogo, alt: 'Google' },
  { src: bboschLogo, alt: 'Bosch' },
  { src: angloLogo, alt: 'Anglo American' },
  { src: roseLogo, alt: 'Rose' },
];

export function Footer() {
  return (
    <footer className="bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-10 lg:px-0 py-[52px]">
        {/* Row 1: Logo + LinkedIn icon — pb-40 */}
        <div className="flex items-center justify-between pb-10">
          <img src={logo} alt="Grupo Globe" className="h-[58px] w-[276px] object-contain shrink-0" />

          <a
            href="https://www.linkedin.com/company/grupo-globe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-14 h-14 rounded-full border border-grey-800 text-grey-800 hover:bg-grey-100 transition-colors"
            aria-label="LinkedIn"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>

        {/* Row 2: Content columns — border-t + border-b, py-40, gap-80 */}
        <div className="border-t border-b border-grey-200 py-10 flex flex-col lg:flex-row gap-10 lg:gap-[80px]">
          {/* Left: Contact + Copyright (justify-between) */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <h4 className="font-body text-[14px] leading-[18px] font-bold text-brand-dark">Contáctanos</h4>
              <ul className="flex flex-col gap-3">
                <li className="flex items-center gap-2 font-body text-[14px] leading-[18px] text-grey-700">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  566000061666
                </li>
                <li className="flex items-center gap-2 font-body text-[14px] leading-[18px] text-grey-700">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  Contacto@grupoglobe.com
                </li>
                <li className="flex items-center gap-2 font-body text-[14px] leading-[18px] text-grey-700">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  Isidora Goyenechea 3520, Of. 300, Las Condes.
                </li>
              </ul>
            </div>
            <p className="font-body text-[14px] leading-[18px] font-bold text-grey-700 mt-6">
              Todos los derechos reservados 2026.
            </p>
          </div>

          {/* Right: Areas + Legal columns — gap-80 */}
          <div className="flex gap-10 lg:gap-[80px]">
            {/* Business areas */}
            <div className="flex flex-col gap-4">
              <h4 className="font-body text-[14px] leading-[18px] font-bold text-brand-dark">Nuestras áreas de negocios</h4>
              <ul className="flex flex-col gap-2">
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Globe Power</a></li>
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Globe Services</a></li>
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Globe Modular</a></li>
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Globe Lift Parts</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-4">
              <h4 className="font-body text-[14px] leading-[18px] font-bold text-brand-dark">Legal</h4>
              <ul className="flex flex-col gap-2">
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Políticas de privacidad</a></li>
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Canal de denuncias</a></li>
                <li><a href="#" className="font-body text-[14px] leading-[18px] font-medium text-grey-700 hover:text-grey-900 transition-colors">Código de ética</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Row 3: Client logos carousel — py-40, gap-60 */}
        <div className="py-10 overflow-hidden">
          <div className="flex items-center gap-[60px] w-max animate-scroll-left">
            {[...FOOTER_LOGOS, ...FOOTER_LOGOS].map((l, i) => (
              <img
                key={`${l.alt}-${i}`}
                src={l.src}
                alt={l.alt}
                className="h-10 w-auto object-contain shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
