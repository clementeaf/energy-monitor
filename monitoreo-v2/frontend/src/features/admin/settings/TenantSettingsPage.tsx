import { useEffect, useState } from 'react';
import { DataWidget } from '../../../components/ui/DataWidget';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';
import { useQueryState } from '../../../hooks/useQueryState';
import { useMyTenantQuery, useUpdateMyTenant } from '../../../hooks/queries/useTenantSettingsQuery';
import { usePermissions } from '../../../hooks/usePermissions';
import { applyTenantTheme } from '../../../lib/tenant-theme';
import { parseTenantSecuritySettings } from '../../../lib/tenant-security-settings';
import { parseTenantOperationalSettings } from '../../../lib/tenant-operational-settings';
import { MfaSection } from './MfaSection';
import { SsoConfigSection } from './SsoConfigSection';
import { Section, Field, ColorField, Swatch } from './settings-helpers';
import type { UpdateTenantPayload } from '../../../types/tenant';
import type { TenantTheme } from '../../../types/auth';
import type { SsoProvider } from '../../../types/sso';
import { PageHeader } from '../../../components/ui/PageHeader';

const TABS = ['General', 'Tema y Marca', 'Operacion', 'Seguridad y SSO'] as const;
type Tab = (typeof TABS)[number];

export function TenantSettingsPage() {
  const query = useMyTenantQuery();
  const qs = useQueryState(query, { isEmpty: (d) => d === undefined });
  const { has } = usePermissions();
  const canWrite = has('admin_tenant_config', 'update');
  const updateMutation = useUpdateMyTenant();

  const [activeTab, setActiveTab] = useState<Tab>('General');

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

  const [ssoProvider, setSsoProvider] = useState<SsoProvider | ''>('');
  const [maxSessionMinutes, setMaxSessionMinutes] = useState('');
  const [blockConcurrentSessions, setBlockConcurrentSessions] = useState(false);
  const [ssoDefaultRoleSlug, setSsoDefaultRoleSlug] = useState('operator');
  const [securitySaved, setSecuritySaved] = useState(false);

  const [defaultCountryCode, setDefaultCountryCode] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [retentionYears, setRetentionYears] = useState('');
  const [staleThresholdHours, setStaleThresholdHours] = useState('');
  const [operationalSaved, setOperationalSaved] = useState(false);

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

    const security = parseTenantSecuritySettings(tenant.settings);
    setSsoProvider(security.ssoProvider ?? '');
    setMaxSessionMinutes(security.maxSessionMinutes != null ? String(security.maxSessionMinutes) : '');
    setBlockConcurrentSessions(security.blockConcurrentSessions);
    setSsoDefaultRoleSlug(security.ssoDefaultRoleSlug);

    setDefaultCountryCode(tenant.defaultCountryCode ?? '');
    setDefaultCurrency(tenant.defaultCurrency ?? '');
    const operational = parseTenantOperationalSettings(tenant.settings);
    setRetentionYears(String(operational.retentionYears));
    setStaleThresholdHours(String(operational.staleThresholdHours));
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

  const handleSaveSecurity = () => {
    if (!tenant) return;

    const settingsPatch: Record<string, unknown> = {
      ...tenant.settings,
      ssoProvider: ssoProvider === '' ? null : ssoProvider,
      blockConcurrentSessions,
      ssoDefaultRoleSlug: ssoDefaultRoleSlug.trim() || 'operator',
    };

    const parsedMinutes = parseInt(maxSessionMinutes, 10);
    if (maxSessionMinutes.trim() === '') {
      settingsPatch.maxSessionMinutes = undefined;
    } else if (!Number.isNaN(parsedMinutes)) {
      settingsPatch.maxSessionMinutes = parsedMinutes;
    }

    const payload: UpdateTenantPayload = { settings: settingsPatch };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setSecuritySaved(true);
        setTimeout(() => { setSecuritySaved(false); }, 2000);
      },
    });
  };

  const handleSaveOperational = () => {
    if (!tenant) return;

    const parsedRetention = parseInt(retentionYears, 10);
    const parsedStale = parseInt(staleThresholdHours, 10);

    const settingsPatch: Record<string, unknown> = {
      ...tenant.settings,
      retentionYears:
        !Number.isNaN(parsedRetention) && parsedRetention >= 1 && parsedRetention <= 10
          ? parsedRetention
          : parseTenantOperationalSettings(tenant.settings).retentionYears,
      staleThresholdHours:
        !Number.isNaN(parsedStale) && parsedStale >= 1 && parsedStale <= 72
          ? parsedStale
          : parseTenantOperationalSettings(tenant.settings).staleThresholdHours,
    };

    const payload: UpdateTenantPayload = {
      defaultCountryCode: defaultCountryCode.trim() || null,
      defaultCurrency: defaultCurrency.trim() || null,
      settings: settingsPatch,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setOperationalSaved(true);
        setTimeout(() => { setOperationalSaved(false); }, 2000);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configuracion del Tenant" eyebrow="Administracion" />

      <MfaSection />

      {qs.phase === 'loading' && (
        <div className="animate-pulse max-w-2xl space-y-6 panel p-6">
          <div className="space-y-3">
            <div className="h-3 w-16 rounded bg-raised" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-28 rounded bg-raised" />
                <div className="h-9 w-full rounded-md bg-raised" />
              </div>
            ))}
          </div>
        </div>
      )}

      {qs.phase !== 'loading' && (
      <DataWidget
        phase={qs.phase}
        error={qs.error}
        onRetry={() => { query.refetch(); }}
        isFetching={query.isFetching && qs.phase === 'ready'}
        emptyTitle="Sin datos"
        emptyDescription="No se pudo cargar la configuracion del tenant."
      >
        <div className="max-w-2xl space-y-6">
          {/* Tab bar */}
          <nav className="flex gap-1 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="panel p-6 space-y-6">
            {/* General */}
            {activeTab === 'General' && (
              <>
                <Section title="General">
                  <Field label="Nombre del Tenant">
                    <input
                      value={name}
                      onChange={(e) => { setName(e.target.value); }}
                      disabled={!canWrite}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>

                  <Field label="Titulo de la App">
                    <input
                      value={appTitle}
                      onChange={(e) => { setAppTitle(e.target.value); }}
                      disabled={!canWrite}
                      placeholder="Energy Monitor"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>

                  <Field label="Zona Horaria">
                    <input
                      value={timezone}
                      onChange={(e) => { setTimezone(e.target.value); }}
                      disabled={!canWrite}
                      placeholder="America/Santiago"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>
                </Section>

                {canWrite && (
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <Button
                      onClick={handleSave}
                      loading={updateMutation.isPending}
                    >
                      Guardar Cambios
                    </Button>
                    {saved && (
                      <span className="text-sm font-medium text-success">Guardado correctamente</span>
                    )}
                    {updateMutation.isError && (
                      <span className="text-sm text-danger">Error al guardar. Intente nuevamente.</span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tema y Marca */}
            {activeTab === 'Tema y Marca' && (
              <>
                <Section title="Colores del Tema">
                  <div className="grid grid-cols-2 gap-4">
                    <ColorField label="Primario" value={primaryColor} onChange={setPrimaryColor} disabled={!canWrite} />
                    <ColorField label="Secundario" value={secondaryColor} onChange={setSecondaryColor} disabled={!canWrite} />
                    <ColorField label="Sidebar" value={sidebarColor} onChange={setSidebarColor} disabled={!canWrite} />
                    <ColorField label="Acento" value={accentColor} onChange={setAccentColor} disabled={!canWrite} />
                  </div>

                  {/* Preview */}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-muted">Vista previa:</span>
                    <div className="flex gap-2">
                      <Swatch color={primaryColor} label="Primario" />
                      <Swatch color={secondaryColor} label="Secundario" />
                      <Swatch color={sidebarColor} label="Sidebar" />
                      <Swatch color={accentColor} label="Acento" />
                    </div>
                  </div>
                </Section>

                <Section title="Branding">
                  <Field label="URL del Logo">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => { setLogoUrl(e.target.value); }}
                      disabled={!canWrite}
                      placeholder="https://ejemplo.com/logo.png"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>

                  <Field label="URL del Favicon">
                    <input
                      type="url"
                      value={faviconUrl}
                      onChange={(e) => { setFaviconUrl(e.target.value); }}
                      disabled={!canWrite}
                      placeholder="https://ejemplo.com/favicon.ico"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>

                  {(logoUrl || faviconUrl) && (
                    <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-3">
                      {logoUrl && (
                        <div className="text-center">
                          <img src={logoUrl} alt="Logo preview" className="mx-auto h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <span className="mt-1 block text-xs text-subtle">Logo</span>
                        </div>
                      )}
                      {faviconUrl && (
                        <div className="text-center">
                          <img src={faviconUrl} alt="Favicon preview" className="mx-auto size-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <span className="mt-1 block text-xs text-subtle">Favicon</span>
                        </div>
                      )}
                    </div>
                  )}
                </Section>

                {canWrite && (
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <Button
                      onClick={handleSave}
                      loading={updateMutation.isPending}
                    >
                      Guardar Cambios
                    </Button>
                    {saved && (
                      <span className="text-sm font-medium text-success">Guardado correctamente</span>
                    )}
                    {updateMutation.isError && (
                      <span className="text-sm text-danger">Error al guardar. Intente nuevamente.</span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Operacion */}
            {activeTab === 'Operacion' && (
              <>
                <Section title="Operacion">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Pais por defecto (ISO 3166-1 alpha-2)">
                      <input
                        value={defaultCountryCode}
                        onChange={(e) => { setDefaultCountryCode(e.target.value.toUpperCase()); }}
                        disabled={!canWrite}
                        maxLength={2}
                        placeholder="CL"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm uppercase disabled:bg-surface"
                      />
                    </Field>

                    <Field label="Moneda por defecto (ISO 4217)">
                      <input
                        value={defaultCurrency}
                        onChange={(e) => { setDefaultCurrency(e.target.value.toUpperCase()); }}
                        disabled={!canWrite}
                        maxLength={3}
                        placeholder="CLP"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm uppercase disabled:bg-surface"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Retencion de datos (anos, 1-10)">
                      <input
                        type="number"
                        value={retentionYears}
                        onChange={(e) => { setRetentionYears(e.target.value); }}
                        disabled={!canWrite}
                        min={1}
                        max={10}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                      />
                    </Field>

                    <Field label="Umbral obsoleto (horas sin lectura, 1-72)">
                      <input
                        type="number"
                        value={staleThresholdHours}
                        onChange={(e) => { setStaleThresholdHours(e.target.value); }}
                        disabled={!canWrite}
                        min={1}
                        max={72}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                      />
                    </Field>
                  </div>

                  {canWrite && (
                    <div className="flex items-center gap-3 pt-2">
                      <Button onClick={handleSaveOperational} loading={updateMutation.isPending} variant="secondary">
                        Guardar Operacion
                      </Button>
                      {operationalSaved && (
                        <span className="text-sm font-medium text-success">Operacion guardada</span>
                      )}
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* Seguridad y SSO */}
            {activeTab === 'Seguridad y SSO' && (
              <>
                <Section title="Seguridad">
                  <Field label="Proveedor SSO">
                    <select
                      value={ssoProvider}
                      onChange={(e) => { setSsoProvider(e.target.value as SsoProvider | ''); }}
                      disabled={!canWrite}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    >
                      <option value="">Desactivado</option>
                      <option value="azure_ad">Azure AD</option>
                      <option value="oidc">OIDC generico</option>
                    </select>
                  </Field>

                  <Field label="Duracion maxima de sesion (minutos, vacio = default del rol)">
                    <input
                      type="number"
                      value={maxSessionMinutes}
                      onChange={(e) => { setMaxSessionMinutes(e.target.value); }}
                      disabled={!canWrite}
                      min={5}
                      max={1440}
                      placeholder="1440"
                      className="w-40 rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>

                  <label className="flex items-center gap-3">
                    <Toggle
                      checked={blockConcurrentSessions}
                      onChange={setBlockConcurrentSessions}
                      disabled={!canWrite}
                    />
                    <span className="text-sm text-foreground">Bloquear sesiones concurrentes</span>
                  </label>

                  <Field label="Rol por defecto (JIT SSO)">
                    <input
                      value={ssoDefaultRoleSlug}
                      onChange={(e) => { setSsoDefaultRoleSlug(e.target.value); }}
                      disabled={!canWrite}
                      placeholder="operator"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm disabled:bg-surface"
                    />
                  </Field>

                  {canWrite && (
                    <div className="flex items-center gap-3 pt-2">
                      <Button onClick={handleSaveSecurity} loading={updateMutation.isPending} variant="secondary">
                        Guardar Seguridad
                      </Button>
                      {securitySaved && (
                        <span className="text-sm font-medium text-success">Seguridad guardada</span>
                      )}
                    </div>
                  )}
                </Section>

                <SsoConfigSection tenantId={tenant?.id} />
              </>
            )}
          </div>
        </div>
      </DataWidget>
      )}

      {/* SsoConfigSection only visible in Seguridad tab — moved inside that conditional above */}
    </div>
  );
}
