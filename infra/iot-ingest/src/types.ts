/** Normalized output from any parser — device-agnostic. */
export interface ParsedReading {
  readonly deviceId: string;
  readonly timestamp: string;
  readonly variables: ReadonlyMap<string, number>;
}

/** Resolved identity for DB insert. */
export interface DeviceIdentity {
  readonly tenantId: string;
  readonly meterId: string;
}

/** EAV row ready for INSERT. */
export interface EavRow {
  readonly time: string;
  readonly tenantId: string;
  readonly meterId: string;
  readonly variableName: string;
  readonly value: number;
  readonly quality: number;
}

/** A parser attempts to extract a ParsedReading from raw JSON. Returns null on mismatch. */
export type PayloadParser = (raw: unknown) => ParsedReading | null;
