type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v || undefined;
}

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

// Builds "/path?a=1&b=2", dropping empty values.
export function href(path: string, query: Record<string, string | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(query).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `${path}?${qs}` : path;
}
