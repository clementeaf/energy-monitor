import { useState } from 'react';

interface OperatorFormProps {
  initial?: { storeName: string };
  onSubmit: (data: { storeName: string }) => void;
  loading?: boolean;
}

export function OperatorForm({ initial, onSubmit, loading }: OperatorFormProps) {
  const [storeName, setStoreName] = useState(initial?.storeName ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ storeName: storeName.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-pa-text-muted">Nombre del Operador</label>
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-pa-border px-3 py-2 text-sm text-pa-text"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !storeName.trim()}
        className="w-full rounded-lg bg-pa-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pa-navy/90 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}
