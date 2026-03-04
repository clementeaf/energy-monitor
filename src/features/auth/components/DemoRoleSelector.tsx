import { useAuth } from '../../../hooks/auth/useAuth';
import type { Role } from '../../../types/auth';

const roles: { role: Role; label: string; description: string }[] = [
  { role: 'SUPER_ADMIN', label: 'Super Admin', description: 'Acceso total al sistema' },
  { role: 'CORP_ADMIN', label: 'Admin Corporativo', description: 'Gestión multi-edificio' },
  { role: 'SITE_ADMIN', label: 'Admin Edificio', description: 'Gestión de un edificio' },
  { role: 'OPERATOR', label: 'Operador', description: 'Monitoreo técnico' },
  { role: 'ANALYST', label: 'Analista', description: 'Reportes y analítica' },
  { role: 'TENANT_USER', label: 'Locatario', description: 'Consumo propio' },
  { role: 'AUDITOR', label: 'Auditor', description: 'Solo lectura' },
];

export function DemoRoleSelector() {
  const { loginDemo } = useAuth();

  return (
    <div className="grid grid-cols-2 gap-2">
      {roles.map(({ role, label, description }) => (
        <button
          key={role}
          onClick={() => loginDemo(role)}
          className="border border-[#e0e0e0] px-3 py-2 text-left transition-colors hover:bg-[#f5f5f5]"
        >
          <span className="block text-xs font-semibold text-black">{label}</span>
          <span className="block text-[10px] text-[#999]">{description}</span>
        </button>
      ))}
    </div>
  );
}
