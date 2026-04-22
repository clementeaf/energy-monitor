import logo from '../assets/globe-logo.png';
import clcLogo from '../assets/CLC.png';
import googleLogo from '../assets/google.png';
import bboschLogo from '../assets/bbosch.png';
import angloLogo from '../assets/angloAmerican.png';
import roseLogo from '../assets/rose.png';

export function Footer() {
  return (
    <footer className="py-12 px-5 sm:px-10 lg:px-12 bg-white text-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Row 1: Logo + LinkedIn */}
        <div className="flex items-center justify-between pb-10 border-b border-gray-200">
          <img src={logo} alt="Grupo Globe" className="h-12 w-auto" />

          <a
            href="https://www.linkedin.com/company/grupo-globe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="LinkedIn"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>

        {/* Row 2: 3 columns — contact left, business + legal right */}
        <div className="pt-10 flex flex-col lg:flex-row justify-between gap-10">
          {/* Contact — left */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Contáctanos</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>566000061666</li>
              <li>Contacto@grupoglobe.com</li>
              <li>Isidora Goyenechea 3520, Of. 300, Las Condes.</li>
            </ul>
          </div>

          {/* Business + Legal — right grouped */}
          <div className="flex gap-16 sm:gap-20">
            <div>
              <h4 className="text-sm font-semibold mb-4">Nuestras áreas de negocios</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Globe Power</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Globe Services</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Globe Modular</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Globe Lift Parts</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900 transition-colors">Políticas de privacidad</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Canal de denuncias</a></li>
                <li><a href="#" className="hover:text-gray-900 transition-colors">Código de ética</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Row 3: Client logos */}
        <div className="pt-10 mt-10 border-t border-gray-200 flex items-center justify-between flex-wrap gap-y-6">
          <img src={clcLogo} alt="CLC" className="h-8 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={googleLogo} alt="Google" className="h-8 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={bboschLogo} alt="Bosch" className="h-8 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={angloLogo} alt="Anglo American" className="h-8 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
          <img src={roseLogo} alt="Rose" className="h-8 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
        </div>
      </div>
    </footer>
  );
}
