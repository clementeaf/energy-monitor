import { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useBuildingsQuery } from '../../hooks/queries/useBuildingsQuery';
import { useMetersQuery } from '../../hooks/queries/useMetersQuery';
import { useAppStore, type ModuloId } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import { EMS_ROLES } from './roles';
import { ADDON_MODULES } from './modules';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  iniciales: string;
  rol: string;
}

const USUARIOS_INIT: Usuario[] = [
  { id: 'u1', nombre: 'Rocío Mendoza', email: 'rocio@energiaaustral.cl', iniciales: 'RM', rol: 'Administrador' },
  { id: 'u2', nombre: 'Javier Tapia', email: 'javier@energiaaustral.cl', iniciales: 'JT', rol: 'Gestor de Energía' },
  { id: 'u3', nombre: 'Carla Soto', email: 'carla@energiaaustral.cl', iniciales: 'CS', rol: 'Administrador' },
  { id: 'u4', nombre: 'Pablo Núñez', email: 'pablo@energiaaustral.cl', iniciales: 'PN', rol: 'Técnico de Campo' },
];

const MODULOS = (Object.keys(ADDON_MODULES) as ModuloId[]).map((id) => ({ id, nombre: ADDON_MODULES[id].addon }));

const ROLES = Object.values(EMS_ROLES).map((role) => role.label);

const CENTROS_CONTRATADOS = 25;
const FIELD_CLASS = 'h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-accent focus:outline-none';

export function inicialesDe(nombre: string): string {
  const [primero = '', segundo = ''] = nombre.trim().split(/\s+/);
  return `${primero.charAt(0)}${segundo.charAt(0)}`.toUpperCase() || '?';
}

export function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState(USUARIOS_INIT);
  const modulosActivos = useAppStore((s) => s.modulosActivos);
  const toggleModulo = useAppStore((s) => s.toggleModulo);
  const showToast = useToastStore((s) => s.showToast);
  const buildingsQuery = useBuildingsQuery();
  const metersQuery = useMetersQuery();
  const [isInviting, setIsInviting] = useState(false);
  const [usuarioPorQuitar, setUsuarioPorQuitar] = useState<Usuario | null>(null);

  const addonsActivos = MODULOS.filter((m) => modulosActivos[m.id]).length;
  const cuenta = [
    { label: 'Razón social', value: 'Energía Austral SpA' },
    { label: 'Plan', value: `Núcleo + ${addonsActivos} add-ons` },
    { label: 'Centros contratados', value: `${buildingsQuery.data?.length ?? '—'} de ${CENTROS_CONTRATADOS}` },
    { label: 'Remarcadores activos', value: String(metersQuery.data?.length ?? '—') },
    { label: 'Usuarios', value: String(usuarios.length) },
    { label: 'Periodo de facturación', value: 'Mensual · vence el 05' },
  ];

  const cambiarRol = (usuario: Usuario, rol: string) => {
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, rol } : u)));
    showToast(`${usuario.nombre} ahora es ${rol}`);
  };

  const quitarAcceso = () => {
    if (!usuarioPorQuitar) return;
    setUsuarios((prev) => prev.filter((u) => u.id !== usuarioPorQuitar.id));
    setUsuarioPorQuitar(null);
    showToast('Acceso revocado');
  };

  const invitar = (usuario: Omit<Usuario, 'id'>) => {
    setUsuarios((prev) => [...prev, { ...usuario, id: crypto.randomUUID() }]);
    setIsInviting(false);
    showToast('Invitación enviada');
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Configuración</h1>
        <p className="text-xs text-muted">Usuarios, módulos y datos de la cuenta</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 rounded-xl border border-card-border bg-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-fg">Usuarios</h2>
            <button type="button" onClick={() => setIsInviting(true)} className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90">
              + Invitar
            </button>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-card-border">
                <Th>Persona</Th>
                <Th>Rol</Th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-surface">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#083F32] text-xs font-medium text-[#9FD838]">
                        {u.iniciales}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.nombre}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.rol}
                      onChange={(e) => cambiarRol(u, e.target.value)}
                      aria-label={`Rol de ${u.nombre}`}
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setUsuarioPorQuitar(u)} aria-label={`Quitar a ${u.nombre}`} className="text-muted hover:text-danger">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-card-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-card-fg">Módulos habilitados</h2>
          <p className="mb-4 text-xs text-card-muted">El cobro se ajusta a los módulos activos. Al apagar uno, su sección queda con candado.</p>
          <div className="space-y-3">
            {MODULOS.map((m) => {
              const activo = modulosActivos[m.id];
              return (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-sm text-card-fg">{m.nombre}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    aria-label={m.nombre}
                    onClick={() => toggleModulo(m.id)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${activo ? 'bg-accent' : 'bg-raised'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${activo ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-card-border px-3 py-2.5">
            <span className="text-xs text-card-muted">Núcleo (Resumen · Centros · Remarcadores)</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">✓ Incluido</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-card-fg">Cuenta</h2>
        <div className="divide-y divide-card-border">
          {cuenta.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={usuarioPorQuitar !== null}
        onClose={() => setUsuarioPorQuitar(null)}
        onConfirm={quitarAcceso}
        title="Quitar acceso"
        message={`${usuarioPorQuitar?.nombre ?? ''} perderá el acceso a la plataforma de inmediato.`}
        confirmLabel="Quitar acceso"
      />
      <InvitarModal open={isInviting} onClose={() => setIsInviting(false)} onInvite={invitar} />
    </div>
  );
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
      rol: String(form.get('rol')),
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
            {ROLES.map((rol) => <option key={rol}>{rol}</option>)}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-medium text-muted hover:text-foreground">Cancelar</button>
          <button type="submit" className="rounded-lg border border-accent bg-accent px-3 py-2 text-xs font-medium text-accent-ink hover:opacity-90">Enviar invitación</button>
        </div>
      </form>
    </Modal>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
