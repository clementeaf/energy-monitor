import { useEffect, useState } from 'react';
import { DataWidget } from '../../../components/ui/DataWidget';
import { Button } from '../../../components/ui/Button';
import { useQueryState } from '../../../hooks/useQueryState';
import { useMyTenantQuery, useUpdateMyTenant } from '../../../hooks/queries/useTenantSettingsQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import { applyTenantTheme } from '../../../lib/tenant-theme';
import type { UpdateTenantPayload } from '../../../types/tenant';
import type { TenantTheme } from '../../../types/auth';

export function TenantSettingsPage() {
  const query = useMyTenantQuery();
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined });
  const { has } = usePermissions();
  const canWrite = has('admin_settings', 'update');
  const updateMutation = useUpdateMyTenant();

  const [name, setName] = useState('');
  const [appTitle, setAppTitle] = useState('');
  const [timezone, setTimezone] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3D3BF3');
  const [secondaryColor, setSecondaryColor] = useState('#1E1E2F');
  const [sidebarColor, setSidebarColor] = useState('#1E1E2F');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [saved, setSaved] = useState(false);

  const tenant = query.data;

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setAppTitle(tenant.appTitle);
    setTimezone(tenant.timezone);
    setPrimaryColor(tenant.primaryColor);
    setSecondaryColor(tenant.secondaryColor);
    setSidebarColor(tenant.sidebarColor);
    setAccentColor(tenant.accentColor);
    setLogoUrl(tenant.logoUrl ?? '');
    setFaviconUrl(tenant.faviconUrl ?? '');
  }, [tenant]);

  const handleSave = () => {
    const payload: UpdateTenantPayload = {
      name,
      appTitle,
      timezone,
      primaryColor,
      secondaryColor,
      sidebarColor,
      accentColor,
      logoUrl: logoUrl || null,
      faviconUrl: faviconUrl || null,
    };

    updateMutation.mutate(payload, {
      onSuccess: (updated) => {
        const theme: TenantTheme = {
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
          sidebarColor: updated.sidebarColor,
          accentColor: updated.accentColor,
          appTitle: updated.appTitle,
          logoUrl: updated.logoUrl,
          faviconUrl: updated.faviconUrl,
        };
        applyTenantTheme(theme);
        setSaved(true);
        setTimeout(() => { setSaved(false); }, 2000);
      },
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">Configuracion del Tenant</h1>

      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { void query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin datos"
        emptyDescription="No se pudo cargar la configuracion del tenant."
      >
        <div className="max-w-2xl space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          {/* General */}
          <Section title="General">
            <Field label="Nombre del Tenant">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); }}
                disabled={!canWrite}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </Field>

            <Field label="Titulo de la App">
              <input
                value={appTitle}
                onChange={(e) => { setAppTitle(e.target.value); }}
                disabled={!canWrite}
                placeholder="Energy Monitor"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </Field>

            <Field label="Zona Horaria">
              <input
                value={timezone}
                onChange={(e) => { setTimezone(e.target.value); }}
                disabled={!canWrite}
                placeholder="America/Santiago"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </Field>
          </Section>

          {/* Colores */}
          <Section title="Colores del Tema">
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Primario" value={primaryColor} onChange={setPrimaryColor} disabled={!canWrite} />
              <ColorField label="Secundario" value={secondaryColor} onChange={setSecondaryColor} disabled={!canWrite} />
              <ColorField label="Sidebar" value={sidebarColor} onChange={setSidebarColor} disabled={!canWrite} />
              <ColorField label="Acento" value={accentColor} onChange={setAccentColor} disabled={!canWrite} />
            </div>

            {/* Preview */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-gray-500">Vista previa:</span>
              <div className="flex gap-2">
                <Swatch color={primaryColor} label="Primario" />
                <Swatch color={secondaryColor} label="Secundario" />
                <Swatch color={sidebarColor} label="Sidebar" />
                <Swatch color={accentColor} label="Acento" />
              </div>
            </div>
          </Section>

          {/* Branding */}
          <Section title="Branding">
            <Field label="URL del Logo">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => { setLogoUrl(e.target.value); }}
                disabled={!canWrite}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </Field>

            <Field label="URL del Favicon">
              <input
                type="url"
                value={faviconUrl}
                onChange={(e) => { setFaviconUrl(e.target.value); }}
                disabled={!canWrite}
                placeholder="https://ejemplo.com/favicon.ico"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </Field>

            {(logoUrl || faviconUrl) && (
              <div className="flex items-center gap-4 rounded-md border border-gray-100 bg-gray-50 p-3">
                {logoUrl && (
                  <div className="text-center">
                    <img src={logoUrl} alt="Logo preview" className="mx-auto h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="mt-1 block text-xs text-gray-400">Logo</span>
                  </div>
                )}
                {faviconUrl && (
                  <div className="text-center">
                    <img src={faviconUrl} alt="Favicon preview" className="mx-auto size-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="mt-1 block text-xs text-gray-400">Favicon</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Actions */}
          {canWrite && (
            <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
              <Button
                onClick={handleSave}
                loading={updateMutation.isPending}
              >
                Guardar Cambios
              </Button>
              {saved && (
                <span className="text-sm font-medium text-green-600">Guardado correctamente</span>
              )}
              {updateMutation.isError && (
                <span className="text-sm text-red-600">Error al guardar. Intente nuevamente.</span>
              )}
            </div>
          )}
        </div>
      </DataWidget>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          disabled={disabled}
          className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5 disabled:cursor-not-allowed"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          disabled={disabled}
          maxLength={7}
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-mono disabled:bg-gray-50"
        />
      </div>
    </label>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="text-center" title={`${label}: ${color}`}>
      <div
        className="size-6 rounded border border-gray-200"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
