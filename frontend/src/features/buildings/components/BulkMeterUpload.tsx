import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { PillButton } from '../../../components/ui/PillButton';
import { useBulkCreateStores } from '../../../hooks/queries/useStores';
import type { BulkCreateResult } from '../../../services/endpoints';

interface Props {
  buildingName: string;
  onDone: () => void;
}

interface CsvRow {
  meter_id?: string;
  store_name?: string;
  store_type?: string;
  operator_name?: string;
}

interface PreviewRow {
  row: number;
  meterId: string;
  storeName: string;
  storeTypeName: string;
  error: string | null;
}

type Phase = 'idle' | 'preview' | 'submitting' | 'result';

export function BulkMeterUpload({ buildingName, onDone }: Readonly<Props>) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mutation = useBulkCreateStores();

  const validate = useCallback((rows: CsvRow[]): PreviewRow[] => {
    const seen = new Set<string>();
    return rows.map((r, i) => {
      const meterId = (r.meter_id ?? '').trim();
      const storeName = (r.operator_name ?? '').trim();
      const storeTypeName = (r.store_type ?? '').trim();

      let error: string | null = null;
      if (!meterId) error = 'meter_id vacío';
      else if (meterId.length > 10) error = 'meter_id > 10 caracteres';
      else if (seen.has(meterId)) error = 'meter_id duplicado';
      else if (!storeName) error = 'operator_name vacío';
      else if (!storeTypeName) error = 'store_type vacío';

      seen.add(meterId);
      return { row: i + 1, meterId, storeName, storeTypeName, error };
    });
  }, []);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors.length > 0) {
          setParseError(res.errors.map((e) => e.message).join(', '));
          return;
        }
        if (res.data.length === 0) {
          setParseError('El archivo no contiene filas');
          return;
        }
        // Validate required columns
        const cols = Object.keys(res.data[0]);
        const required = ['meter_id', 'store_type', 'operator_name'];
        const missing = required.filter((c) => !cols.includes(c));
        if (missing.length > 0) {
          setParseError(`Columnas faltantes: ${missing.join(', ')}`);
          return;
        }
        setPreview(validate(res.data));
        setPhase('preview');
      },
      error: (err) => setParseError(err.message),
    });
  }, [validate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
    else setParseError('Solo se aceptan archivos .csv');
  }, [handleFile]);

  const handleSubmit = () => {
    const valid = preview.filter((r) => !r.error);
    if (valid.length === 0) return;

    setPhase('submitting');
    mutation.mutate(
      valid.map((r) => ({
        meterId: r.meterId,
        storeName: r.storeName,
        storeTypeName: r.storeTypeName,
        buildingName,
      })),
      {
        onSuccess: (data) => {
          setResult(data);
          setPhase('result');
        },
        onError: () => {
          setPhase('preview');
        },
      },
    );
  };

  const reset = () => {
    setPhase('idle');
    setPreview([]);
    setResult(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasErrors = preview.some((r) => r.error);
  const validCount = preview.filter((r) => !r.error).length;

  // --- idle ---
  if (phase === 'idle') {
    return (
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-pa-border p-8 text-center"
        >
          <p className="text-sm text-pa-text-muted">
            Arrastra un archivo CSV o selecciona uno
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <PillButton onClick={() => fileRef.current?.click()}>
            Seleccionar archivo
          </PillButton>
        </div>

        <div className="rounded bg-gray-50 p-3 text-xs text-pa-text-muted">
          <p className="mb-1 font-semibold text-pa-text">Columnas esperadas:</p>
          <code className="text-[11px]">meter_id, operator_name, store_type</code>
          <p className="mt-2">Ejemplo:</p>
          <pre className="mt-1 text-[11px]">
{`meter_id,operator_name,store_type
MG-001,Tienda A,Retail
MG-002,Tienda B,Oficina`}
          </pre>
        </div>

        {parseError && (
          <p className="text-sm text-red-600">{parseError}</p>
        )}
      </div>
    );
  }

  // --- preview ---
  if (phase === 'preview') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-pa-text">
            {preview.length} filas — {validCount} válidas
            {hasErrors && <span className="ml-1 text-red-600">({preview.length - validCount} con errores)</span>}
          </p>
          <div className="flex gap-2">
            <PillButton onClick={reset}>Cancelar</PillButton>
            <PillButton onClick={handleSubmit} disabled={validCount === 0}>
              Crear {validCount} medidores
            </PillButton>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded border border-pa-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-pa-text-muted">
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Medidor</th>
                <th className="px-2 py-1.5">Operador</th>
                <th className="px-2 py-1.5">Tipo</th>
                <th className="px-2 py-1.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr
                  key={r.row}
                  className={r.error ? 'bg-red-50' : ''}
                >
                  <td className="px-2 py-1 text-pa-text-muted">{r.row}</td>
                  <td className="px-2 py-1 font-mono">{r.meterId}</td>
                  <td className="px-2 py-1">{r.storeName}</td>
                  <td className="px-2 py-1">{r.storeTypeName}</td>
                  <td className="px-2 py-1">
                    {r.error
                      ? <span className="text-red-600">{r.error}</span>
                      : <span className="text-green-700">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- submitting ---
  if (phase === 'submitting') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-pa-blue border-t-transparent" />
        <p className="text-sm text-pa-text-muted">Creando medidores...</p>
      </div>
    );
  }

  // --- result ---
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded bg-green-50 p-3 text-sm text-green-800">
        {result!.successCount} medidor(es) creado(s) exitosamente.
      </div>

      {result!.errors.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-red-700">
            {result!.errors.length} error(es):
          </p>
          <div className="max-h-48 overflow-auto rounded border border-red-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-red-50">
                <tr className="text-left text-red-700">
                  <th className="px-2 py-1.5">Fila</th>
                  <th className="px-2 py-1.5">Medidor</th>
                  <th className="px-2 py-1.5">Error</th>
                </tr>
              </thead>
              <tbody>
                {result!.errors.map((e) => (
                  <tr key={e.row}>
                    <td className="px-2 py-1">{e.row}</td>
                    <td className="px-2 py-1 font-mono">{e.meterId}</td>
                    <td className="px-2 py-1 text-red-600">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <PillButton onClick={onDone}>Cerrar</PillButton>
      </div>
    </div>
  );
}
