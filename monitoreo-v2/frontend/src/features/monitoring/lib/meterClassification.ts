/**
 * Indica si el tipo de medidor se considera generacion (PV, inversor, etc.).
 * @param meterType - Valor meterType del API
 * @returns true si debe agruparse como generacion
 */
export function isGenerationMeterType(meterType: string): boolean {
  const t = meterType.toLowerCase().trim();
  if (t === 'generation' || t === 'solar' || t === 'pv' || t === 'inverter') return true;
  if (t.includes('generacion') || t.includes('generación')) return true;
  if (t.includes('solar') || t.includes('fotovolta')) return true;
  return false;
}

/**
 * Etiqueta corta en español para un tipo de medidor.
 * @param meterType - Valor crudo
 * @returns Texto para UI
 */
export function formatMeterTypeLabel(meterType: string): string {
  const key = meterType.toLowerCase().trim();
  const map: Record<string, string> = {
    electrical: 'Electrico (carga)',
    generation: 'Generacion',
    solar: 'Solar / PV',
    pv: 'Fotovoltaico',
    inverter: 'Inversor',
    unknown: 'Sin tipo',
  };
  if (map[key]) return map[key];
  if (key.length === 0) return 'Sin tipo';
  return meterType.charAt(0).toUpperCase() + meterType.slice(1);
}
