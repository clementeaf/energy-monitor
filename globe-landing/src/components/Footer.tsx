export function Footer() {
  return (
    <footer className="py-12 px-5 sm:px-10 lg:px-12 bg-gp-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div>
            <span className="text-lg font-bold">Globe Power</span>
            <p className="mt-2 text-sm text-gp-300 font-light">Una empresa de Grupo Globe.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Ecosistema</h4>
            <ul className="space-y-2.5 text-sm text-gp-300 font-light">
              <li><a href="#ecosistema" className="hover:text-white transition-colors duration-200">Subdistribución</a></li>
              <li><a href="#ecosistema" className="hover:text-white transition-colors duration-200">Eficiencia Energética</a></li>
              <li><a href="#ecosistema" className="hover:text-white transition-colors duration-200">Software & Reportería</a></li>
              <li><a href="#ecosistema" className="hover:text-white transition-colors duration-200">Mantenimiento</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Grupo Globe</h4>
            <ul className="space-y-2.5 text-sm text-gp-300 font-light">
              <li><a href="#" className="hover:text-white transition-colors duration-200">Inicio</a></li>
              <li><a href="#" className="hover:text-white transition-colors duration-200">Empresas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4">Contacto</h4>
            <ul className="space-y-2.5 text-sm text-gp-300 font-light">
              <li>comercial@globepower.cl</li>
              <li>www.globepower.com</li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10">
          <p className="text-center text-xs text-gp-400 font-light">
            &copy; {new Date().getFullYear()} Grupo Globe. Gestión energética corporativa en Chile. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
