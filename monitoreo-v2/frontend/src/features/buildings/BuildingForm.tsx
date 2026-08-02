import { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { useTenantsAdminQuery } from '../../hooks/queries/useTenantsQuery';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../store/useAppStore';
import { SITE_KIND_OPTIONS } from '../../lib/site-metadata-labels';
import { useRegionsQuery } from '../../hooks/queries/useRegionsQuery';
import type { SiteKind } from '../../types/site-metadata';
import type { Building, CreateBuildingPayload, UpdateBuildingPayload } from '../../types/building';

interface BuildingFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateBuildingPayload | UpdateBuildingPayload) => void;
  isPending: boolean;
  building?: Building | null;
}

/**
 * Create/edit building form with geo and external metadata fields.
 */
export function BuildingForm({ open, onClose, onSubmit, isPending, building }: Readonly<BuildingFormProps>) {
  const isEdit = !!building;
  const { isSuperAdmin } = usePermissions();
  const selectedTenantId = useAppStore((s) => s.selectedTenantId);
  const needsTenantSelect = !isEdit && isSuperAdmin && !selectedTenantId;
  const tenantsQuery = useTenantsAdminQuery();
  const regionsQuery = useRegionsQuery({ enabled: open });

  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [regionId, setRegionId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [externalSiteId, setExternalSiteId] = useState('');
  const [siteKind, setSiteKind] = useState<SiteKind | ''>('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    if (!building) {
      setName('');
      setCode('');
      setAddress('');
      setAreaSqm('');
      setRegionId('');
      setCountryCode('');
      setTimezone('');
      setExternalSiteId('');
      setSiteKind('');
      setLatitude('');
      setLongitude('');
      return;
    }
    setName(building.name);
    setCode(building.code);
    setAddress(building.address ?? '');
    setAreaSqm(building.areaSqm ? String(Number(building.areaSqm)) : '');
    setRegionId(building.regionId ?? '');
    setCountryCode(building.countryCode ?? '');
    setTimezone(building.timezone ?? '');
    setExternalSiteId(building.externalSiteId ?? '');
    setSiteKind(building.siteKind ?? '');
    setLatitude(building.latitude != null ? String(building.latitude) : '');
    setLongitude(building.longitude != null ? String(building.longitude) : '');
  }, [building, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && building) {
      const payload: UpdateBuildingPayload = {};
      if (name !== building.name) payload.name = name;
      if (address !== (building.address ?? '')) payload.address = address || undefined;
      const areaVal = areaSqm ? Number(areaSqm) : undefined;
      if (areaSqm !== (building.areaSqm ? String(Number(building.areaSqm)) : '')) payload.areaSqm = areaVal;
      if (regionId !== (building.regionId ?? '')) payload.regionId = regionId.trim() || null;
      if (countryCode !== (building.countryCode ?? '')) payload.countryCode = countryCode.trim().toUpperCase() || null;
      if (timezone !== (building.timezone ?? '')) payload.timezone = timezone.trim() || null;
      if (externalSiteId !== (building.externalSiteId ?? '')) payload.externalSiteId = externalSiteId.trim() || null;
      if (siteKind !== (building.siteKind ?? '')) payload.siteKind = siteKind || null;
      const latStr = building.latitude != null ? String(building.latitude) : '';
      const lngStr = building.longitude != null ? String(building.longitude) : '';
      if (latitude !== latStr) payload.latitude = latitude ? Number(latitude) : null;
      if (longitude !== lngStr) payload.longitude = longitude ? Number(longitude) : null;
      onSubmit(payload);
    } else {
      onSubmit({
        name,
        code,
        ...(address ? { address } : {}),
        ...(areaSqm ? { areaSqm: Number(areaSqm) } : {}),
        ...(regionId.trim() ? { regionId: regionId.trim() } : {}),
        ...(countryCode.trim() ? { countryCode: countryCode.trim().toUpperCase() } : {}),
        ...(timezone.trim() ? { timezone: timezone.trim() } : {}),
        ...(externalSiteId.trim() ? { externalSiteId: externalSiteId.trim() } : {}),
        ...(siteKind ? { siteKind } : {}),
        ...(latitude ? { latitude: Number(latitude) } : {}),
        ...(longitude ? { longitude: Number(longitude) } : {}),
        ...(needsTenantSelect && tenantId ? { tenantId } : {}),
      });
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Editar Edificio' : 'Nuevo Edificio'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {needsTenantSelect && (
          <Field label="Empresa" required>
            <DropdownSelect
              options={[
                { value: '', label: 'Seleccionar empresa...' },
                ...(tenantsQuery.data?.filter((t) => t.slug !== 'globe-power').map((t) => ({ value: t.id, label: t.name })) ?? []),
              ]}
              value={tenantId}
              onChange={setTenantId}
              className="w-full"
            />
          </Field>
        )}

        <Field label="Nombre" required>
          <input value={name} onChange={(e) => { setName(e.target.value); }} required maxLength={255} className="input-field w-full" />
        </Field>

        {!isEdit && (
          <Field label="Codigo" required>
            <input value={code} onChange={(e) => { setCode(e.target.value); }} required maxLength={50} className="input-field w-full" />
          </Field>
        )}

        <Field label="Direccion" required>
          <input value={address} onChange={(e) => { setAddress(e.target.value); }} required className="input-field w-full" />
        </Field>

        <Field label="Area (m2)">
          <input type="number" value={areaSqm} onChange={(e) => { setAreaSqm(e.target.value); }} min={0} step="0.01" className="input-field w-full" />
        </Field>

        <SectionTitle>Metadata geo / PASA</SectionTitle>

        <Field label="Pais (ISO 3166-1 alpha-2)">
          <input value={countryCode} onChange={(e) => { setCountryCode(e.target.value.toUpperCase().slice(0, 2)); }} maxLength={2} placeholder="CL" className="input-field w-24 font-mono uppercase" />
        </Field>

        <Field label="Zona horaria (IANA)">
          <input value={timezone} onChange={(e) => { setTimezone(e.target.value); }} placeholder="America/Santiago" className="input-field w-full" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud">
            <input type="number" value={latitude} onChange={(e) => { setLatitude(e.target.value); }} min={-90} max={90} step="0.0000001" placeholder="-33.4489" className="input-field w-full font-mono" />
          </Field>
          <Field label="Longitud">
            <input type="number" value={longitude} onChange={(e) => { setLongitude(e.target.value); }} min={-180} max={180} step="0.0000001" placeholder="-70.6693" className="input-field w-full font-mono" />
          </Field>
        </div>

        <Field label="Region">
          <DropdownSelect
            options={[
              { value: '', label: 'Sin region' },
              ...(regionsQuery.data ?? []).map((r) => ({ value: r.id, label: `${r.name} (${r.code})` })),
            ]}
            value={regionId}
            onChange={setRegionId}
            className="w-full"
          />
        </Field>

        <Field label="External Site ID">
          <input value={externalSiteId} onChange={(e) => { setExternalSiteId(e.target.value); }} placeholder="ID sitio en ERP/PASA" className="input-field w-full" />
        </Field>

        <Field label="Tipo de sitio">
          <DropdownSelect
            options={[{ value: '', label: 'Sin clasificar' }, ...SITE_KIND_OPTIONS]}
            value={siteKind}
            onChange={(val) => { setSiteKind(val as SiteKind | ''); }}
            className="w-full"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || !name || (!isEdit && !code) || (needsTenantSelect && !tenantId)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}

function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h3 className="pt-2 text-xs font-semibold text-muted">{children}</h3>;
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <div className="block">
      <span className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
