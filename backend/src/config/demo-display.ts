const DEFAULT_PINNED_REST = ['장어르신', '김어르신'];

function parseNameList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

export function getPinnedRestNames(): string[] {
  return parseNameList(process.env.DEMO_PINNED_REST_NAMES, DEFAULT_PINNED_REST);
}

export function isPinnedRestName(name?: string | null): boolean {
  const n = name?.trim();
  return !!n && getPinnedRestNames().includes(n);
}
