export const READING_QUALITIES = ['measured', 'estimated', 'invalid', 'unknown'] as const;
export type ReadingQuality = (typeof READING_QUALITIES)[number];

export const READING_SOURCES = [
  'modbus',
  'mqtt',
  'api_ingress',
  'backfill',
  'synthetic',
  'drive_pipeline',
  'manual_cnr',
] as const;
export type ReadingSource = (typeof READING_SOURCES)[number];

/**
 * Maps IoT EAV numeric quality (iot_readings.quality) to readings.reading_quality.
 * Apply when promoting iot_readings → readings (not unified yet — mapping documented here).
 *
 * | IoT quality | Typical meaning     | reading_quality |
 * |-------------|---------------------|-----------------|
 * | 0           | Good / measured     | measured        |
 * | 1           | Uncertain           | estimated       |
 * | 2+          | Bad / offline       | invalid         |
 * | null        | Not set             | unknown         |
 */
export function mapIotQualityToReadingQuality(
  iotQuality: number | null | undefined,
): ReadingQuality {
  if (iotQuality == null) return 'unknown';
  if (iotQuality === 0) return 'measured';
  if (iotQuality === 1) return 'estimated';
  return 'invalid';
}
