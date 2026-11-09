import { useNavigate, useSearchParams } from 'react-router';
import { APP_ROUTES } from '../../app/routes';
import { QueryStateView } from '../../components/ui/QueryStateView';
import { NavModuleIcon } from '../../components/layout/sidebar-icons';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useUsersQuery } from '../../hooks/queries/useUsersQuery';
import { useAppStore, type ModuloId } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import type { UserListItem } from '../../types/user';
import { inicialesDe } from './format';
import { ADDON_MODULES } from './modules';
import { EMS_SECTION_NAV } from './navigation';
import { PageAction } from './PageAction';
import { canEditSection, EMS_ROLE_BY_SLUG, EMS_ROLES, type EmsRoleId } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { Switch } from './Switch';
import { useEmsRole } from './useEmsRole';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  iniciales: string;
  rol: EmsRoleId;
}

type Pestana = 'usuarios' | 'modulos' | 'cuenta';

const PESTANAS: Record<Pestana, string> = { usuarios: 'Usuarios y roles', modulos: 'Módulos', cuenta: 'Cuenta' };

const MODULOS = Object.keys(ADDON_MODULES) as ModuloId[];
const ROLES = Object.keys(EMS_ROLES) as EmsRoleId[];
const ROL_NUEVO: EmsRoleId = 'backoffice';
const MODULO_NUEVO: ModuloId = 'facturacion';

export function ConfiguracionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pestana = (searchParams.get('tab') as Pestana | null) ?? 'modulos';
  const filtroRol = searchParams.get('rol') as EmsRoleId | null;
  const canEdit = canEditSection(useEmsRole(), 'configuracion');
  const usersQuery = useUsersQuery(canEdit);
  const usuarios = (usersQuery.data ?? []).map(toUsuario);

  const irA = (tab: Pestana, rol?: EmsRoleId) => setSearchParams(rol ? { tab, rol } : { tab });

  usePageTitle('Configuración', 'Cuenta / Configuración', canEdit ? <PageAction label="Gestionar usuarios" onClick={() => navigate(APP_ROUTES.admin.users)} /> : undefined);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className={`${SEGMENT_TRACK_CLASS} self-start`} role="tablist" aria-label="Secciones de configuración">
          {(Object.keys(PESTANAS) as Pestana[]).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={pestana === tab} onClick={() => irA(tab)} className={segmentClass(pestana === tab)}>{PESTANAS[tab]}</button>
          ))}
        </div>

        {pestana === 'usuarios' && (
          canEdit
            ? <UsuariosTab usuarios={filtroRol ? usuarios.filter((u) => u.rol === filtroRol) : usuarios} filtroRol={filtroRol} phase={usersQuery.isPending ? 'loading' : usersQuery.isError ? 'error' : 'ready'} onQuitarFiltro={() => irA('usuarios')} />
            : <SinAccesoUsuarios />
        )}
        {pestana === 'modulos' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <ModulosCard canEdit={canEdit} />
            <div className="flex flex-col gap-4">
              {canEdit ? <UsuariosPorRolCard usuarios={usuarios} onVerRol={(rol) => irA('usuarios', rol)} /> : <SinAccesoUsuarios />}
              <CuentaCard compacta onVerTodo={() => irA('cuenta')} />
            </div>
          </div>
        )}
        {pestana === 'cuenta' && <CuentaCard usuarios={canEdit ? usuarios.length : undefined} />}
      </div>
    </div>
  );
}

function toUsuario(user: UserListItem): Usuario {
  const nombre = user.displayName ?? user.email;
  return { id: user.id, nombre, email: user.email, iniciales: inicialesDe(nombre), rol: EMS_ROLE_BY_SLUG[user.role.slug] };
}

function SinAccesoUsuarios() {
  return (
    <section className="rounded-xl bg-card p-5">
      <h2 className="text-sm font-semibold text-card-fg">Usuarios</h2>
      <p className="mt-1 text-xs text-muted">Solo un Administrador con sesión iniciada puede ver y gestionar los usuarios.</p>
    </section>
  );
}

function ModulosCard({ canEdit }: Readonly<{ canEdit: boolean }>) {
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  const toggleModulo = useAppStore((s) => s.toggleModulo);
  const showToast = useToastStore((s) => s.showToast);
  const activos = MODULOS.filter((id) => modulosActivos[id]).length;

  return (
    <section className="rounded-xl bg-card p-5 lg:col-span-2">
      <h2 className="text-sm font-semibold text-card-fg">Módulos del plan</h2>
      <p className="mb-3 text-xs text-card-muted">Núcleo + {activos} add-ons · al activar un add-on aparece al instante en el menú de los roles con permiso</p>
      <ul className="divide-y divide-card-border">
        <li className="flex items-center gap-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-raised text-foreground"><NavModuleIcon name="gauge" className="h-4 w-4" /></span>
          <div className="flex-1">
            <p className="text-sm text-card-fg">Resumen, Centros y Remarcadores <ModuloTag label="Incluido" cls="text-neutral-ink bg-neutral-bg" /></p>
            <p className="text-xs text-muted">Núcleo del producto · siempre activo</p>
          </div>
          <Switch checked disabled label="Núcleo" onChange={() => undefined} />
        </li>
        {MODULOS.map((id) => {
          const modulo = ADDON_MODULES[id];
          const isActivo = modulosActivos[id];
          return (
            <li key={id} className="flex items-center gap-3 py-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${modulo.colorClass}`}><NavModuleIcon name={EMS_SECTION_NAV[id].icon} className="h-4 w-4" /></span>
              <div className="flex-1">
                <p className="text-sm text-card-fg">
                  {modulo.addon}{' '}
                  {isActivo
                    ? <ModuloTag label={id === MODULO_NUEVO ? 'Nuevo' : 'Add-on'} cls={id === MODULO_NUEVO ? 'text-module-facturacion-ink bg-module-facturacion-bg' : 'text-accent-ink bg-accent-subtle'} />
                    : <ModuloTag label="No contratado" cls="text-danger-ink bg-danger-bg" />}
                </p>
                <p className="text-xs text-muted">{modulo.sub}</p>
              </div>
              {canEdit && (isActivo
                ? <Switch checked label={modulo.addon} onChange={() => { toggleModulo(id); showToast(`${modulo.addon} desactivado`); }} />
                : <button type="button" onClick={() => { toggleModulo(id); showToast(`${modulo.addon} habilitado`); }} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink hover:bg-accent-hover">Contratar</button>)}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function UsuariosPorRolCard({ usuarios, onVerRol }: Readonly<{ usuarios: Usuario[]; onVerRol: (rol: EmsRoleId) => void }>) {
  return (
    <section className="rounded-xl bg-card p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-card-fg">Usuarios por rol</h2>
        <span className="font-mono text-xs text-muted">{usuarios.length} usuarios</span>
      </header>
      <ul className="flex flex-col gap-1.5">
        {ROLES.map((rol) => (
          <li key={rol}>
            <button type="button" onClick={() => onVerRol(rol)} className="flex w-full items-center gap-2.5 rounded-lg bg-raised px-3 py-2 text-left text-sm text-foreground hover:bg-background">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-subtle text-[10px] font-semibold text-accent-ink">{inicialesDe(EMS_ROLES[rol].label)}</span>
              <span className="flex-1">{EMS_ROLES[rol].label}</span>
              {rol === ROL_NUEVO && <ModuloTag label="Nuevo" cls="text-module-facturacion-ink bg-module-facturacion-bg" />}
              <span className="font-mono text-xs">{usuarios.filter((u) => u.rol === rol).length}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CuentaCard({ compacta = false, usuarios, onVerTodo }: Readonly<{ compacta?: boolean; usuarios?: number; onVerTodo?: () => void }>) {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  const datos = [
    { label: 'Razón social', value: 'Globe Power SpA' },
    { label: 'RUT', value: '—' },
    { label: 'Contacto de facturación', value: '—' },
    ...(compacta ? [] : [
      { label: 'Plan', value: `Núcleo + ${MODULOS.filter((id) => modulosActivos[id]).length} add-ons` },
      { label: 'Centros', value: String(buildingsQuery.data?.length ?? '—') },
      { label: 'Remarcadores activos', value: String(metersQuery.data?.length ?? '—') },
      { label: 'Usuarios', value: String(usuarios ?? '—') },
    ]),
  ];
  return (
    <section className="rounded-xl bg-card p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-card-fg">Datos de la cuenta</h2>
        {onVerTodo && <button type="button" onClick={onVerTodo} className="text-xs text-muted underline hover:text-foreground">Ver todo</button>}
      </header>
      <dl className={compacta ? 'flex flex-col gap-3' : 'divide-y divide-card-border'}>
        {datos.map((dato) => (
          <div key={dato.label} className={compacta ? '' : 'flex items-center justify-between py-2.5'}>
            <dt className="text-xs text-muted">{dato.label}</dt>
            <dd className={`text-sm font-medium text-foreground ${dato.label === 'RUT' ? 'font-mono' : ''}`}>{dato.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function UsuariosTab({ usuarios, filtroRol, phase, onQuitarFiltro }: Readonly<{
  usuarios: Usuario[];
  filtroRol: EmsRoleId | null;
  phase: 'loading' | 'error' | 'ready';
  onQuitarFiltro: () => void;
}>) {
  return (
    <section className="rounded-xl bg-card p-5">
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-card-fg">Usuarios</h2>
        {filtroRol && (
          <button type="button" onClick={onQuitarFiltro} className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-foreground hover:bg-background">{EMS_ROLES[filtroRol].label} ✕</button>
        )}
      </header>
      <QueryStateView phase={phase === 'ready' && usuarios.length === 0 ? 'empty' : phase} error={null} variant="widget" emptyTitle="Sin usuarios" emptyDescription={filtroRol ? `Nadie tiene el rol ${EMS_ROLES[filtroRol].label}.` : 'No hay usuarios registrados.'}>
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap">
            <thead>
              <tr className="border-b border-card-border bg-raised">
                <th className="px-4 py-2.5 text-left text-[11px] font-normal text-muted">Persona</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-normal text-muted">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-raised">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-xs font-medium text-accent-ink">{u.iniciales}</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.nombre}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{EMS_ROLES[u.rol].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryStateView>
    </section>
  );
}

function ModuloTag({ label, cls }: Readonly<{ label: string; cls: string }>) {
  return <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}
