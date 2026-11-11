import type { DiscoveryFilters, ReleaseKind } from "@shared/discoveryFilters";
import type { ReleaseGroup } from "@/types";
import {
  compareArtistReleases,
  compareSearchReleases,
} from "./releasePopularity";

export const RELEASE_KIND_LABELS: Record<ReleaseKind, string> = {
  album: "Albums",
  soundtrack: "Soundtracks",
  live: "Live",
  compilation: "Compilations",
  ep: "EPs",
  single: "Singles",
  other: "Other",
};

export function releaseKind(release: ReleaseGroup): ReleaseKind {
  const secondary = (release["secondary-types"] ?? []).map((type) =>
    type.toLowerCase()
  );
  if (secondary.includes("live")) return "live";
  if (secondary.includes("soundtrack")) return "soundtrack";
  if (secondary.includes("compilation")) return "compilation";
  const primary = (release["primary-type"] ?? "").toLowerCase();
  if (primary === "album" || primary === "ep" || primary === "single")
    return primary;
  return "other";
}

export function filterAndSortReleases(
  releases: ReleaseGroup[],
  filters: DiscoveryFilters,
  context: "artist" | "search"
): ReleaseGroup[] {
  const visible = releases.filter(
    (release) => !filters.excluded.includes(releaseKind(release))
  );
  if (filters.sort === "newest") {
    return visible.sort(
      (a, b) =>
        (b["first-release-date"] ?? "").localeCompare(
          a["first-release-date"] ?? ""
        ) || a.title.localeCompare(b.title)
    );
  }
  return visible.sort(
    context === "search" ? compareSearchReleases : compareArtistReleases
  );
}
