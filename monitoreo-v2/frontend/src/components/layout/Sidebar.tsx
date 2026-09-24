import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import { useAppStore, type ModuloId } from '../../store/useAppStore';
import { NavModuleIcon } from './sidebar-icons';
import { SidebarReveal } from './sidebar-motion';

function SidebarSection({ label, expanded }: { label: string; expanded: boolean }) {
  return (
    <SidebarReveal show={expanded}>
      <div className="mb-1 px-3 uppercase tracking-[0.08em]" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-sidebar-muted)' }}>
        {label}
      </div>
    </SidebarReveal>
  );
}

function NavItem({ label, path, currentPath, onNavigate }: { label: string; path: string; currentPath: string; onNavigate: (to: string) => void }) {
  const isActive = currentPath === path || currentPath.startsWith(path + '/');
  return (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      className="w-full rounded-md py-2 text-left transition-colors block"
      style={{
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--color-sidebar-fg)' : 'var(--color-sidebar-muted)',
        paddingLeft: '1.05rem',
        paddingRight: '0.75rem',
        backgroundColor: isActive ? '#9FD8381F' : 'transparent',
        borderLeft: isActive ? '3px solid #9FD838' : '3px solid transparent',
      }}
    >
      {label}
    </button>
  );
}

export function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const modulosActivos = useAppStore((s) => s.modulosActivos);

  return (
    <aside className="relative flex h-full min-h-0 w-[240px] shrink-0 flex-col bg-[var(--color-sidebar)]">
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <SidebarSection label="Núcleo" expanded />
        <div className="space-y-0.5">
          {[
            { label: 'Resumen', path: '/resumen' },
            { label: 'Centros', path: '/centros' },
            { label: 'Remarcadores', path: '/remarcadores' },
          ].map((item) => (
            <NavItem key={item.path} label={item.label} path={item.path} currentPath={location.pathname} onNavigate={navigate} />
          ))}
        </div>
        <div className="mt-6">
          <SidebarSection label="Add-ons" expanded />
          <div className="space-y-0.5">
            {([
              { label: 'Consumo', path: '/consumo', moduloId: 'consumo' as ModuloId },
              { label: 'Márgenes', path: '/margenes', moduloId: 'margenes' as ModuloId },
              { label: 'Sostenibilidad', path: '/sostenibilidad', moduloId: 'sostenibilidad' as ModuloId },
              { label: 'Alertas', path: '/alertas', moduloId: 'alertas' as ModuloId },
              { label: 'Reportes', path: '/reportes', moduloId: 'reportes' as ModuloId },
            ]).filter((item) => modulosActivos[item.moduloId]).map((item) => (
              <NavItem key={item.path} label={item.label} path={item.path} currentPath={location.pathname} onNavigate={navigate} />
            ))}
          </div>
        </div>
        <div className="mt-6">
          <SidebarSection label="Sistema" expanded />
          <div className="space-y-0.5">
            <NavItem label="Configuración" path="/configuracion" currentPath={location.pathname} onNavigate={navigate} />
          </div>
        </div>
      </nav>

      <div className="shrink-0 border-t border-[var(--color-sidebar-border)] px-3 py-3">
        <button type="button" onClick={logout} title="Cerrar sesión" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-sidebar-fg)]">
          <NavModuleIcon name="logout" className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 text-left text-xs">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
