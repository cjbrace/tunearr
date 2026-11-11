import { describe, expect, it } from "vitest";
import {
  compareArtistReleases,
  compareSearchReleases,
} from "../releasePopularity";
import type { ReleaseGroup } from "@/types";

const make = (id: string, score: number, listeners?: number): ReleaseGroup => ({
  id,
  title: id,
  score,
  "primary-type": "Album",
  "first-release-date": "2010",
  "artist-credit": [],
  ...(listeners === undefined
    ? {}
    : { popularity: { listeners, listens: listeners * 10 } }),
});

describe("release popularity", () => {
  it("moves a widely heard soundtrack above exact but obscure title matches", () => {
    const results = [
      make("obscure", 100, 10),
      make("inception-soundtrack", 65, 7429),
      make("unrelated", 20, 10000),
    ].sort(compareSearchReleases);
    expect(results.map((item) => item.id)).toEqual([
      "inception-soundtrack",
      "obscure",
      "unrelated",
    ]);
  });

  it("falls back to MusicBrainz relevance when counts are missing", () => {
    expect(
      [make("lower", 60), make("higher", 100)]
        .sort(compareSearchReleases)
        .map((item) => item.id)
    ).toEqual(["higher", "lower"]);
  });

  it("orders an artist's albums by listeners", () => {
    expect(
      [make("old-popular", 50, 1000), make("new-obscure", 50, 2)]
        .sort(compareArtistReleases)
        .map((item) => item.id)
    ).toEqual(["old-popular", "new-obscure"]);
  });
});
