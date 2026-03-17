import { useState } from 'react';
import { useStores, useStoreTypes } from '../../../hooks/queries/useStores';
import type { StoreItem } from '../../../types';

interface MeterFormProps {
  buildingName: string;
  initial?: { meterId: string; storeName: string; storeTypeId: number };
  onSubmit: (data: { meterId: string; storeName: string; storeTypeId: number; buildingName: string }) => void;
  loading?: boolean;
}

export function MeterForm({ buildingName, initial, onSubmit, loading }: MeterFormProps) {
  const isEdit = !!initial;
  const [meterId, setMeterId] = useState(initial?.meterId ?? '');
  const [storeName, setStoreName] = useState(initial?.storeName ?? '');
  const [storeTypeId, setStoreTypeId] = useState(initial?.storeTypeId?.toString() ?? '');

  const { data: storeTypes } = useStoreTypes();
  const { data: stores } = useStores();

  // Get unique operator names from existing stores for this building
  const operatorNames = [...new Set(
    (stores ?? [])
      .filter((s: StoreItem) => s.buildingName === buildingName)
      .map((s: StoreItem) => s.storeName),
  )].sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      meterId: meterId.trim(),
      storeName: storeName.trim(),
      storeTypeId: Number(storeTypeId),
      buildingName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-pa-text-muted">ID Medidor</label>
        <input
          type="text"
          value={meterId}
          onChange={(e) => setMeterId(e.target.value)}
          disabled={isEdit}
          required
          className="mt-1 w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text disabled:bg-gray-50 disabled:text-pa-text-muted"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-pa-text-muted">Operador (Tienda)</label>
        <input
          type="text"
          list="operator-names"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text"
        />
        <datalist id="operator-names">
          {operatorNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="block text-xs font-medium text-pa-text-muted">Tipo</label>
        <select
          value={storeTypeId}
          onChange={(e) => setStoreTypeId(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text"
        >
          <option value="">Seleccionar tipo...</option>
          {(storeTypes ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !meterId.trim() || !storeName.trim() || !storeTypeId}
        className="w-full rounded-lg bg-pa-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pa-navy/90 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Remarcador'}
      </button>
    </form>
  );
}
