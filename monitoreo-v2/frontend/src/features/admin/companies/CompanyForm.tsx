import { DropdownSelect } from '../../../components/ui/DropdownSelect';
import { SectionHeader, Field } from './company-helpers';
import type { CreateTenantPayload, UpdateTenantPayload } from '../../../types/tenant';

interface CompanyFormProps {
  mode: 'create' | 'edit';
  values: CreateTenantPayload | UpdateTenantPayload;
  onFieldChange: (key: string, value: string | boolean | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  addressCollision: boolean;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  /** Only for edit mode: the slug is read-only */
  editingSlug?: string;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/Santiago', label: 'America/Santiago' },
  { value: 'America/Bogota', label: 'America/Bogota' },
  { value: 'America/Lima', label: 'America/Lima' },
  { value: 'UTC', label: 'UTC' },
];

const AUTH_PROVIDER_OPTIONS = [
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'google', label: 'Google' },
];

export function CompanyForm({
  mode,
  values,
  onFieldChange,
  onSubmit,
  addressCollision,
  isPending,
  isError,
  errorMessage,
  editingSlug,
}: CompanyFormProps) {
  const isCreate = mode === 'create';
  const createValues = values as CreateTenantPayload;
  const editValues = values as UpdateTenantPayload;

  const isSubmitDisabled = isCreate
    ? isPending || !createValues.name.trim() || !createValues.adminEmail.trim() || (addressCollision && !values.addressDetail?.trim())
    : isPending || !editValues.name?.trim() || (addressCollision && !values.addressDetail?.trim());

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Edit-only: isActive toggle */}
      {!isCreate && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
          <span className="text-[13px] font-medium text-foreground">Estado</span>
          <button
            type="button"
            onClick={() => onFieldChange('isActive', !editValues.isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
              editValues.isActive ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block size-4 transform rounded-full bg-background shadow transition-transform duration-200 ${
              editValues.isActive ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <span className={`text-[12px] font-medium ${editValues.isActive ? 'text-green-700' : 'text-muted'}`}>
            {editValues.isActive ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      )}

      <SectionHeader>Datos empresa</SectionHeader>

      <Field label="Nombre de la empresa *">
        <input
          type="text"
          value={isCreate ? createValues.name : (editValues.name ?? '')}
          onChange={(e) => onFieldChange('name', e.target.value)}
          placeholder="Globe Power S.A."
          required
          className="input-field"
        />
      </Field>

      {isCreate ? (
        <Field label="Slug (opcional)">
          <input
            type="text"
            value={createValues.slug ?? ''}
            onChange={(e) => onFieldChange('slug', e.target.value)}
            placeholder="globe-power (auto-generado si vacío)"
            className="input-field"
          />
        </Field>
      ) : (
        <Field label="Slug">
          <input
            type="text"
            value={editingSlug ?? ''}
            disabled
            className="input-field cursor-not-allowed opacity-60"
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="RUT">
          <input
            type="text"
            value={values.taxId ?? ''}
            onChange={(e) => onFieldChange('taxId', e.target.value)}
            placeholder="76.123.456-7"
            className="input-field"
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="text"
            value={values.phone ?? ''}
            onChange={(e) => onFieldChange('phone', e.target.value)}
            placeholder="+56 9 1234 5678"
            className="input-field"
          />
        </Field>
      </div>

      <Field label="Dirección">
        <input
          type="text"
          value={values.address ?? ''}
          onChange={(e) => onFieldChange('address', e.target.value)}
          placeholder="Av. Providencia 1234, Santiago"
          className="input-field"
        />
      </Field>
      {addressCollision && (
        <p className="text-[12px] text-amber-600">
          Otra empresa usa esta dirección. Especifique piso u oficina.
        </p>
      )}

      <Field label={`Detalle dirección (piso/oficina)${addressCollision ? ' *' : ''}`}>
        <input
          type="text"
          value={values.addressDetail ?? ''}
          onChange={(e) => onFieldChange('addressDetail', e.target.value)}
          placeholder="Piso 5, Oficina 501"
          required={addressCollision}
          className="input-field"
        />
      </Field>

      <Field label={isCreate ? 'Título de la app (opcional)' : 'Título de la app'}>
        <input
          type="text"
          value={values.appTitle ?? ''}
          onChange={(e) => onFieldChange('appTitle', e.target.value)}
          placeholder="Globe Power"
          className="input-field"
        />
      </Field>

      {/* Create-only: admin section */}
      {isCreate && (
        <>
          <SectionHeader>Primer administrador</SectionHeader>

          <Field label="Email del admin *">
            <input
              type="email"
              value={createValues.adminEmail}
              onChange={(e) => onFieldChange('adminEmail', e.target.value)}
              placeholder="admin@empresa.cl"
              required
              className="input-field"
            />
          </Field>

          <Field label="Nombre del admin (opcional)">
            <input
              type="text"
              value={createValues.adminDisplayName ?? ''}
              onChange={(e) => onFieldChange('adminDisplayName', e.target.value)}
              placeholder="Juan Pérez"
              className="input-field"
            />
          </Field>

          <Field label="Proveedor de autenticación *">
            <DropdownSelect
              options={AUTH_PROVIDER_OPTIONS}
              value={createValues.adminAuthProvider}
              onChange={(val) => onFieldChange('adminAuthProvider', val)}
              className="w-full"
            />
          </Field>
        </>
      )}

      <SectionHeader>{isCreate ? 'Tema (opcional)' : 'Tema'}</SectionHeader>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Color primario">
          <input
            type="color"
            value={values.primaryColor ?? '#3a5b1e'}
            onChange={(e) => onFieldChange('primaryColor', e.target.value)}
            className="h-9 w-full cursor-pointer rounded-lg border border-border"
          />
        </Field>
        <Field label="Color secundario">
          <input
            type="color"
            value={values.secondaryColor ?? '#f5f5f5'}
            onChange={(e) => onFieldChange('secondaryColor', e.target.value)}
            className="h-9 w-full cursor-pointer rounded-lg border border-border"
          />
        </Field>
        <Field label="Color sidebar">
          <input
            type="color"
            value={values.sidebarColor ?? '#1e293b'}
            onChange={(e) => onFieldChange('sidebarColor', e.target.value)}
            className="h-9 w-full cursor-pointer rounded-lg border border-border"
          />
        </Field>
        <Field label="Color acento">
          <input
            type="color"
            value={values.accentColor ?? '#ab2f2a'}
            onChange={(e) => onFieldChange('accentColor', e.target.value)}
            className="h-9 w-full cursor-pointer rounded-lg border border-border"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Logo URL">
          <input
            type="text"
            value={values.logoUrl ?? ''}
            onChange={(e) => onFieldChange('logoUrl', isCreate ? e.target.value : (e.target.value || null))}
            placeholder="https://..."
            className="input-field"
          />
        </Field>
        <Field label="Favicon URL">
          <input
            type="text"
            value={values.faviconUrl ?? ''}
            onChange={(e) => onFieldChange('faviconUrl', isCreate ? e.target.value : (e.target.value || null))}
            placeholder="https://..."
            className="input-field"
          />
        </Field>
      </div>

      <SectionHeader>Config</SectionHeader>

      <Field label="Timezone">
        <DropdownSelect
          options={TIMEZONE_OPTIONS}
          value={(values.timezone ?? 'America/Santiago') as string}
          onChange={(val) => onFieldChange('timezone', val)}
          className="w-full"
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="mt-2 w-full rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {isPending
          ? (isCreate ? 'Creando...' : 'Guardando...')
          : (isCreate ? 'Crear empresa' : 'Guardar cambios')}
      </button>

      {isError && (
        <p className="text-[13px] text-red-600">
          {errorMessage ?? (isCreate ? 'Error al crear la empresa' : 'Error al actualizar la empresa')}
        </p>
      )}
    </form>
  );
}
