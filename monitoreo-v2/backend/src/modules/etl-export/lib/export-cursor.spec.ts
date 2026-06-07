import { encodeExportCursor, decodeExportCursor, csvRow } from './export-cursor';

describe('export-cursor', () => {
  it('round-trips cursor encoding', () => {
    const token = encodeExportCursor('2026-01-01T12:00:00.000Z', 'abc-123');
    const decoded = decodeExportCursor(token);
    expect(decoded).toEqual({
      timestamp: '2026-01-01T12:00:00.000Z',
      id: 'abc-123',
    });
  });

  it('returns null for invalid cursor', () => {
    expect(decodeExportCursor('not-valid')).toBeNull();
  });

  it('escapes CSV fields with commas', () => {
    expect(csvRow(['a', 'b,c', 'd'])).toBe('a,"b,c",d');
  });
});
