import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { NavModuleIcon } from '../../components/layout/sidebar-icons';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAppStore, type ModuloId } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { usePageTitle } from '../../store/usePageTitleStore';
import { inicialesDe } from './format';
import { ADDON_MODULES } from './modules';
import { EMS_SECTION_NAV } from './navigation';
import { PageAction } from './PageAction';
import { EMS_ROLES, type EmsRoleId } from './roles';
import { SEGMENT_TRACK_CLASS, segmentClass } from './segmented';
import { Switch } from './Switch';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  iniciales: string;
  rol: EmsRoleId;
}

type Pestana = 'usuarios' | 'modulos' | 'cuenta';

const PESTANAS: Record<Pestana, string> = { usuarios: 'Usuarios y roles', modulos: 'Módulos', cuenta: 'Cuenta' };

const USUARIOS_INIT: Usuario[] = [
  { id: 'u1', nombre: 'Rocío Mendoza', email: 'rocio@energiaaustral.cl', iniciales: 'RM', rol: 'admin' },
  { id: 'u2', nombre: 'Javier Tapia', email: 'javier@energiaaustral.cl', iniciales: 'JT', rol: 'gestor' },
  { id: 'u3', nombre: 'Carla Soto', email: 'carla@energiaaustral.cl', iniciales: 'CS', rol: 'ejecutivo' },
  { id: 'u4', nombre: 'Pablo Núñez', email: 'pablo@energiaaustral.cl', iniciales: 'PN', rol: 'tecnico' },
  { id: 'u5', nombre: 'Carolina Pérez', email: 'carolina@energiaaustral.cl', iniciales: 'CP', rol: 'backoffice' },
];

const MODULOS = Object.keys(ADDON_MODULES) as ModuloId[];
const ROLES = Object.keys(EMS_ROLES) as EmsRoleId[];
const ROL_NUEVO: EmsRoleId = 'backoffice';
const MODULO_NUEVO: ModuloId = 'facturacion';
const CENTROS_CONTRATADOS = 25;
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';

export function ConfiguracionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pestana = (searchParams.get('tab') as Pestana | null) ?? 'modulos';
  const filtroRol = searchParams.get('rol') as EmsRoleId | null;
  const [usuarios, setUsuarios] = useState(USUARIOS_INIT);
  const [isInviting, setIsInviting] = useState(false);
  const [usuarioPorQuitar, setUsuarioPorQuitar] = useState<Usuario | null>(null);
  const showToast = useToastStore((s) => s.showToast);

  const irA = (tab: Pestana, rol?: EmsRoleId) => setSearchParams(rol ? { tab, rol } : { tab });

  usePageTitle('Configuración', 'Cuenta / Configuración', <PageAction label="Invitar usuario" onClick={() => setIsInviting(true)} />);

  const cambiarRol = (usuario: Usuario, rol: EmsRoleId) => {
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, rol } : u)));
    showToast(`${usuario.nombre} ahora es ${EMS_ROLES[rol].label}`);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <div className={`${SEGMENT_TRACK_CLASS} self-start`} role="tablist" aria-label="Secciones de configuración">
          {(Object.keys(PESTANAS) as Pestana[]).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={pestana === tab} onClick={() => irA(tab)} className={segmentClass(pestana === tab)}>{PESTANAS[tab]}</button>
          ))}
        </div>

        {pestana === 'usuarios' && (
          <UsuariosTab usuarios={filtroRol ? usuarios.filter((u) => u.rol === filtroRol) : usuarios} filtroRol={filtroRol}
            onQuitarFiltro={() => irA('usuarios')} onCambiarRol={cambiarRol} onQuitar={setUsuarioPorQuitar} />
        )}
        {pestana === 'modulos' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <ModulosCard />
            <div className="flex flex-col gap-4">
              <UsuariosPorRolCard usuarios={usuarios} onVerRol={(rol) => irA('usuarios', rol)} />
              <CuentaCard compacta onEditar={() => irA('cuenta')} />
            </div>
          </div>
        )}
        {pestana === 'cuenta' && <CuentaCard usuarios={usuarios.length} />}

        <ConfirmDialog
          open={usuarioPorQuitar !== null}
          onClose={() => setUsuarioPorQuitar(null)}
          onConfirm={() => {
            setUsuarios((prev) => prev.filter((u) => u.id !== usuarioPorQuitar?.id));
            setUsuarioPorQuitar(null);
            showToast('Acceso revocado');
          }}
          title="Quitar acceso"
          message={`${usuarioPorQuitar?.nombre ?? ''} perderá el acceso a la plataforma de inmediato.`}
          confirmLabel="Quitar acceso"
        />
        <InvitarModal open={isInviting} onClose={() => setIsInviting(false)} onInvite={(usuario) => {
          setUsuarios((prev) => [...prev, { ...usuario, id: crypto.randomUUID() }]);
          setIsInviting(false);
          showToast('Invitación enviada');
        }} />
      </div>
    </div>
  );
}

function ModulosCard() {
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
              {isActivo
                ? <Switch checked label={modulo.addon} onChange={() => { toggleModulo(id); showToast(`${modulo.addon} desactivado`); }} />
                : <button type="button" onClick={() => { toggleModulo(id); showToast(`${modulo.addon} habilitado`); }} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink hover:bg-accent-hover">Contratar</button>}
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

function CuentaCard({ compacta = false, usuarios, onEditar }: Readonly<{ compacta?: boolean; usuarios?: number; onEditar?: () => void }>) {
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  const datos = [
    { label: 'Razón social', value: 'Globe Power SpA' },
    { label: 'RUT', value: '—' },
    { label: 'Contacto de facturación', value: '—' },
    ...(compacta ? [] : [
      { label: 'Plan', value: `Núcleo + ${MODULOS.filter((id) => modulosActivos[id]).length} add-ons` },
      { label: 'Centros contratados', value: `${buildingsQuery.data?.length ?? '—'} de ${CENTROS_CONTRATADOS}` },
      { label: 'Remarcadores activos', value: String(metersQuery.data?.length ?? '—') },
      { label: 'Usuarios', value: String(usuarios ?? '—') },
      { label: 'Período de facturación', value: 'Mensual · vence el 05' },
    ]),
  ];
  return (
    <section className="rounded-xl bg-card p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-card-fg">Datos de la cuenta</h2>
        {onEditar && <button type="button" onClick={onEditar} className="text-xs text-muted underline hover:text-foreground">Editar</button>}
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

function UsuariosTab({ usuarios, filtroRol, onQuitarFiltro, onCambiarRol, onQuitar }: Readonly<{
  usuarios: Usuario[];
  filtroRol: EmsRoleId | null;
  onQuitarFiltro: () => void;
  onCambiarRol: (usuario: Usuario, rol: EmsRoleId) => void;
  onQuitar: (usuario: Usuario) => void;
}>) {
  return (
    <section className="rounded-xl bg-card p-5">
      <header className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-card-fg">Usuarios</h2>
        {filtroRol && (
          <button type="button" onClick={onQuitarFiltro} className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-foreground hover:bg-background">{EMS_ROLES[filtroRol].label} ✕</button>
        )}
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-card-border bg-raised">
              <th className="px-4 py-2.5 text-left text-[11px] font-normal text-muted">Persona</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-normal text-muted">Rol</th>
              <th className="w-8" />
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
                <td className="px-4 py-3">
                  <select value={u.rol} onChange={(e) => onCambiarRol(u, e.target.value as EmsRoleId)} aria-label={`Rol de ${u.nombre}`}
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none">
                    {ROLES.map((rol) => <option key={rol} value={rol}>{EMS_ROLES[rol].label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onQuitar(u)} aria-label={`Quitar a ${u.nombre}`} className="text-muted hover:text-danger">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ModuloTag({ label, cls }: Readonly<{ label: string; cls: string }>) {
  return <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}


function InvitarModal({ open, onClose, onInvite }: Readonly<{ open: boolean; onClose: () => void; onInvite: (usuario: Omit<Usuario, 'id'>) => void }>) {
  const enviar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get('nombre')).trim() || 'Persona invitada';
    onInvite({
      nombre,
      email: String(form.get('email')).trim() || 'sin-correo@ejemplo.cl',
      iniciales: inicialesDe(nombre),
      rol: String(form.get('rol')) as EmsRoleId,
    });
    event.currentTarget.reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Invitar a una persona">
      <p className="mb-4 text-sm text-muted">Recibirá un correo para activar su cuenta.</p>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nombre y apellido
          <input name="nombre" placeholder="Ana Ríos" className={FIELD_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Correo
          <input name="email" type="email" placeholder="ana@energiaaustral.cl" className={FIELD_CLASS} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Rol
          <select name="rol" className={FIELD_CLASS}>
            {ROLES.map((rol) => <option key={rol} value={rol}>{EMS_ROLES[rol].label}</option>)}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:text-foreground">Cancelar</button>
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-fg hover:bg-primary-hover">Enviar invitación</button>
        </div>
      </form>
    </Modal>
  );
}
