/**
 * Defensive typeguard for query data : ensure the value returned by an API
 * is always an array. Without this, the backend could return a partial
 * response (e.g. { success: true, data: [...] }) and our hooks expect
 * res.data to be the array directly. If the API contract changes or
 * the backend hits an error path, this guard prevents `a.filter is not
 * a function` crashes at runtime.
 */
export function asArray<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  // Some backends wrap the array inside `{ data: [...] }` or `{ items: [...] }`.
  if (data && typeof data === 'object') {
    const obj = data as { data?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

/** Defensive guard for single-object query data. */
export function asObject<T = unknown>(data: unknown): T | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  if (data && Array.isArray((data as any).data)) {
    const first = (data as { data: unknown[] }).data[0];
    return (first ?? null) as T | null;
  }
  return null;
}
