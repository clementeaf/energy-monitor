import { useState } from 'react';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  iniciales: string;
  rol: string;
}

interface Modulo {
  id: string;
  nombre: string;
  activo: boolean;
}

const USUARIOS_INIT: Usuario[] = [
  { id: 'u1', nombre: 'Rocío Mendoza', email: 'rocio@energiaaustral.cl', iniciales: 'RM', rol: 'Administrador' },
  { id: 'u2', nombre: 'Javier Tapia', email: 'javier@energiaaustral.cl', iniciales: 'JT', rol: 'Gestor de Energía' },
  { id: 'u3', nombre: 'Carla Soto', email: 'carla@energiaaustral.cl', iniciales: 'CS', rol: 'Administrador' },
  { id: 'u4', nombre: 'Pablo Núñez', email: 'pablo@energiaaustral.cl', iniciales: 'PN', rol: 'Técnico de Campo' },
];

const MODULOS_INIT: Modulo[] = [
  { id: 'm1', nombre: 'Analítica de Consumo', activo: true },
  { id: 'm2', nombre: 'Márgenes', activo: true },
  { id: 'm3', nombre: 'Sostenibilidad', activo: true },
  { id: 'm4', nombre: 'Alertas', activo: true },
  { id: 'm5', nombre: 'Reportes', activo: true },
];

const ROLES = ['Administrador', 'Gestor de Energía', 'Técnico de Campo'];

const CUENTA = [
  { label: 'Razón social', value: 'Energía Austral SpA' },
  { label: 'Plan', value: 'Núcleo + 5 add-ons' },
  { label: 'Centros contratados', value: '6 de 25' },
  { label: 'Remarcadores activos', value: '9' },
  { label: 'Usuarios', value: '4' },
  { label: 'Periodo de facturación', value: 'Mensual · vence el 05' },
];

export function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState(USUARIOS_INIT);
  const [modulos, setModulos] = useState(MODULOS_INIT);

  const cambiarRol = (id: string, rol: string) => {
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, rol } : u));
  };

  const eliminarUsuario = (id: string) => {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  };

  const toggleModulo = (id: string) => {
    setModulos((prev) => prev.map((m) => m.id === id ? { ...m, activo: !m.activo } : m));
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Configuración</h1>
        <p className="text-xs text-muted">Usuarios, módulos y datos de la cuenta</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-card-fg">Usuarios</h2>
            <button type="button" className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90">
              + Invitar
            </button>
          </div>
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
                      onChange={(e) => cambiarRol(u.id, e.target.value)}
                      className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => eliminarUsuario(u.id)} className="text-muted hover:text-danger">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-card-fg">Módulos habilitados</h2>
          <p className="mb-4 text-xs text-card-muted">El cobro se ajusta a los módulos activos. Al apagar uno, su sección queda con candado.</p>
          <div className="space-y-3">
            {modulos.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span className="text-sm text-card-fg">{m.nombre}</span>
                <button
                  type="button"
                  onClick={() => toggleModulo(m.id)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${m.activo ? 'bg-accent' : 'bg-raised'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${m.activo ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
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
          {CUENTA.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">{children}</th>;
}
