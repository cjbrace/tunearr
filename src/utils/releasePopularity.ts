import type { ReleaseGroup } from "@/types";

function listenerCount(release: ReleaseGroup): number {
  return release.popularity?.listeners ?? 0;
}

function byDateDesc(a: ReleaseGroup, b: ReleaseGroup): number {
  return (b["first-release-date"] ?? "").localeCompare(
    a["first-release-date"] ?? ""
  );
}

/** Exact title relevance still matters; audience size breaks through noisy matches. */
export function compareSearchReleases(
  a: ReleaseGroup,
  b: ReleaseGroup
): number {
  const rank = (rg: ReleaseGroup) =>
    (Number(rg.score) || 0) * (1 + Math.log10(1 + listenerCount(rg)));
  return (
    rank(b) - rank(a) ||
    listenerCount(b) - listenerCount(a) ||
    Number(b.score) - Number(a.score)
  );
}

/** Discographies have no text query, so audience size is the primary order. */
export function compareArtistReleases(
  a: ReleaseGroup,
  b: ReleaseGroup
): number {
  return (
    listenerCount(b) - listenerCount(a) ||
    byDateDesc(a, b) ||
    a.title.localeCompare(b.title)
  );
}
