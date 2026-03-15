export function sumNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) : null;
}

export function maxNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? Math.max(...valid) : null;
}

export function avgNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

export function sumByKey<T>(data: T[], key: keyof T): number | null {
  const vals = data.map((r) => r[key]).filter((v): v is number => v != null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

export function maxByKey<T>(data: T[], key: keyof T): number | null {
  const vals = data.map((r) => r[key]).filter((v): v is number => v != null);
  return vals.length > 0 ? Math.max(...vals) : null;
}
