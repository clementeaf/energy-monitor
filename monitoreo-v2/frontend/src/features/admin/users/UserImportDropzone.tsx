import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { MAX_USER_IMPORT_BYTES } from '../../../hooks/queries/useUserImportQuery';

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];
const ACCEPTED_MIME = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

interface UserImportDropzoneProps {
  onFileSelected: (file: File) => void;
  onReject?: (message: string) => void;
  disabled?: boolean;
}

/**
 * Validates whether a file is an allowed CSV/XLSX import under size limit.
 * @param file - Selected upload file
 * @returns Rejection message or null if valid
 */
export function validateUserImportFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.pdf')) {
    return 'PDF no soportado. Exporte el archivo a CSV o Excel (.xlsx).';
  }
  const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime = ACCEPTED_MIME.includes(file.type);
  if (!hasValidExt && !hasValidMime) {
    return 'Formato no soportado. Use CSV o Excel (.xlsx).';
  }
  if (file.size > MAX_USER_IMPORT_BYTES) {
    return 'El archivo supera el límite de 1 MB.';
  }
  return null;
}

/**
 * Drag-and-drop zone for bulk user import files.
 */
export function UserImportDropzone({
  onFileSelected,
  onReject,
  disabled = false,
}: Readonly<UserImportDropzoneProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const rejection = validateUserImportFile(file);
      if (rejection) {
        setLocalError(rejection);
        onReject?.(rejection);
        return;
      }
      setLocalError(null);
      onFileSelected(file);
    },
    [onFileSelected, onReject],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => { setDragOver(false); }}
        onDrop={onDrop}
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragOver ? 'border-brand bg-brand/5' : 'border-border bg-surface/50 hover:border-brand/60'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <p className="text-sm font-medium text-foreground">Arrastre un archivo CSV o Excel aquí</p>
        <p className="mt-1 text-xs text-muted">Máximo 500 filas · 1 MB · .csv o .xlsx</p>
        <p className="mt-3 text-xs text-brand underline">Seleccionar archivo</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={disabled}
          onChange={onInputChange}
        />
      </div>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">{localError}</p>
      ) : null}
    </div>
  );
}
