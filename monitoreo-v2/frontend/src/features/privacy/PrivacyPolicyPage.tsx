import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface PolicySection {
  title: string;
  content?: string;
  items?: string[];
  contact?: string;
  responseDeadline?: string;
}

interface PolicyResponse {
  version: string;
  effectiveDate: string;
  controller: { name: string; email: string; address: string };
  sections: PolicySection[];
}

export function PrivacyPolicyPage() {
  const query = useQuery({
    queryKey: ['privacy-policy'],
    queryFn: () => api.get<PolicyResponse>('/privacy/policy').then((r) => r.data),
  });

  const policy = query.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Política de Privacidad</h1>
      {policy && (
        <p className="mt-1 text-sm text-gray-500">
          Versión {policy.version} — Vigente desde {policy.effectiveDate}
        </p>
      )}

      {query.isPending && <p className="mt-6 text-sm text-gray-400">Cargando...</p>}

      {policy && (
        <div className="mt-8 space-y-8">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p><strong>Responsable:</strong> {policy.controller.name}</p>
            <p><strong>Contacto:</strong> {policy.controller.email}</p>
            <p><strong>Dirección:</strong> {policy.controller.address}</p>
          </div>

          {policy.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-gray-900">
                {i + 1}. {section.title}
              </h2>
              {section.content && (
                <p className="mt-2 text-sm text-gray-700">{section.content}</p>
              )}
              {section.items && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
              {section.contact && (
                <p className="mt-2 text-sm text-gray-600">
                  Contacto: <strong>{section.contact}</strong>
                  {section.responseDeadline && <> — Plazo: {section.responseDeadline}</>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 border-t border-gray-200 pt-6 text-xs text-gray-400">
        <p>Conforme a la Ley 21.719 de Protección de Datos Personales (Chile).</p>
      </div>
    </div>
  );
}
