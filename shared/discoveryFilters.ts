export const RELEASE_KINDS = [
  "album",
  "soundtrack",
  "live",
  "compilation",
  "ep",
  "single",
  "other",
] as const;

export type ReleaseKind = (typeof RELEASE_KINDS)[number];
export type DiscoverySort = "popular" | "newest";
export type DiscoveryFilters = {
  excluded: ReleaseKind[];
  sort: DiscoverySort;
};

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  excluded: [],
  sort: "popular",
};

export function isDiscoveryFilters(value: unknown): value is DiscoveryFilters {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DiscoveryFilters>;
  return (
    Array.isArray(candidate.excluded) &&
    candidate.excluded.length <= RELEASE_KINDS.length &&
    candidate.excluded.every((kind) => RELEASE_KINDS.includes(kind)) &&
    new Set(candidate.excluded).size === candidate.excluded.length &&
    (candidate.sort === "popular" || candidate.sort === "newest")
  );
}

export function parseDiscoveryFilters(value: string | null): DiscoveryFilters {
  if (!value) return DEFAULT_DISCOVERY_FILTERS;
  try {
    const parsed: unknown = JSON.parse(value);
    return isDiscoveryFilters(parsed) ? parsed : DEFAULT_DISCOVERY_FILTERS;
  } catch {
    return DEFAULT_DISCOVERY_FILTERS;
  }
}
