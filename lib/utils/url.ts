export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Build a URL from a base path and optional query parameters.
 *
 * Values are encoded automatically via `URLSearchParams`.
 * Entries whose value is `undefined`, `null`, or `""` are omitted.
 */
export function buildUrl(
  basePath: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return basePath;

  const sp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }

  const query = sp.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Join path segments into a URL path, encoding each segment.
 *
 * The leading `base` is used as-is; every subsequent segment is
 * individually encoded via `encodeURIComponent`.
 */
export function joinPathSegments(base: string, ...segments: string[]): string {
  return [base, ...segments.map((s) => encodeURIComponent(s))].join("/");
}
