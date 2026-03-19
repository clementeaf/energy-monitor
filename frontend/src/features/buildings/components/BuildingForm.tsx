import { useState } from 'react';

interface BuildingFormProps {
  initial?: { buildingName: string; areaSqm: number | null };
  onSubmit: (data: { buildingName: string; areaSqm: number }) => void;
  loading?: boolean;
}

export function BuildingForm({ initial, onSubmit, loading }: BuildingFormProps) {
  const isEdit = !!initial;
  const [buildingName, setBuildingName] = useState(initial?.buildingName ?? '');
  const [areaSqm, setAreaSqm] = useState(initial?.areaSqm?.toString() ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ buildingName: buildingName.trim(), areaSqm: Number(areaSqm) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-pa-text-muted">Nombre del Activo Inmobiliario</label>
        <input
          type="text"
          value={buildingName}
          onChange={(e) => setBuildingName(e.target.value)}
          disabled={isEdit}
          required
          className="mt-1 w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text disabled:bg-gray-50 disabled:text-pa-text-muted"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-pa-text-muted">Superficie (m²)</label>
        <input
          type="number"
          value={areaSqm}
          onChange={(e) => setAreaSqm(e.target.value)}
          min={0}
          required
          className="mt-1 w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text"
        />
      </div>
      <button
        type="submit"
        disabled={loading || (!isEdit && !buildingName.trim())}
        className="w-full rounded-lg bg-pa-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pa-navy/90 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Activo Inmobiliario'}
      </button>
    </form>
  );
}
