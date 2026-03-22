export function Footer() {
  return (
    <footer className="py-10 px-5 sm:px-8 lg:px-10 bg-navy text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <span className="text-lg font-bold">Globe Power</span>
            <p className="mt-2 text-sm text-gray-400">Una empresa de Grupo Globe.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Ecosistema</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#ecosistema" className="hover:text-white transition-colors">Subdistribución</a></li>
              <li><a href="#ecosistema" className="hover:text-white transition-colors">Eficiencia Energética</a></li>
              <li><a href="#ecosistema" className="hover:text-white transition-colors">Software & Reportería</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Mantenimiento</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Grupo Globe</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Empresas</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Contacto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>comercial@globepower.cl</li>
              <li>www.globepower.com</li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 pt-6 border-t border-white/10">
          &copy; {new Date().getFullYear()} Grupo Globe. Gestión energética corporativa en Chile. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
