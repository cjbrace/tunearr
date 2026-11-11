import { describe, expect, it } from "vitest";
import type { ReleaseGroup } from "@/types";
import { filterAndSortReleases, releaseKind } from "../releaseFilters";

const makeRelease = (
  id: string,
  listeners: number,
  secondary: string[] = []
): ReleaseGroup => ({
  id,
  title: id,
  score: 100,
  "primary-type": "Album",
  "secondary-types": secondary,
  "first-release-date": "2020-01-01",
  "artist-credit": [],
  popularity: { listeners, listens: listeners },
});

describe("release filters", () => {
  it("recognizes live and soundtrack secondary types", () => {
    expect(releaseKind(makeRelease("concert", 0, ["Live"]))).toBe("live");
    expect(releaseKind(makeRelease("film", 0, ["Soundtrack"]))).toBe(
      "soundtrack"
    );
  });

  it("hides saved exclusions and ranks the remaining catalog by listeners", () => {
    const releases = [
      makeRelease("live", 500, ["Live"]),
      makeRelease("quiet", 10),
      makeRelease("popular", 100),
    ];
    expect(
      filterAndSortReleases(
        releases,
        { excluded: ["live"], sort: "popular" },
        "artist"
      ).map((release) => release.id)
    ).toEqual(["popular", "quiet"]);
  });
});
