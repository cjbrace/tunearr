import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearPopularityCache, getReleaseGroupPopularity } from "./popularity";

const mockFetch = vi.fn();
vi.mock("../resilientFetch", () => ({
  resilientFetch: (...args: unknown[]) => mockFetch(...args),
}));

const A = "cba0c394-1aa2-40e0-8613-a9ead5624c21";
const B = "f5093c06-23e3-404f-aeaa-40f72885ee3a";

beforeEach(() => {
  vi.clearAllMocks();
  clearPopularityCache();
});

describe("getReleaseGroupPopularity", () => {
  it("uses one batch and caches exact MusicBrainz IDs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          release_group_mbid: A,
          total_user_count: 7429,
          total_listen_count: 183093,
        },
        {
          release_group_mbid: B,
          total_user_count: null,
          total_listen_count: null,
        },
      ],
    });

    const first = await getReleaseGroupPopularity([A, B, A, "not-an-mbid"]);
    expect(first.get(A)).toEqual({ listeners: 7429, listens: 183093 });
    expect(first.has(B)).toBe(false);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      release_group_mbids: [A, B],
    });

    const second = await getReleaseGroupPopularity([A, B]);
    expect(second.get(A)?.listeners).toBe(7429);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back without caching an outage", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            release_group_mbid: A,
            total_user_count: 10,
            total_listen_count: 20,
          },
        ],
      });
    expect((await getReleaseGroupPopularity([A])).size).toBe(0);
    expect((await getReleaseGroupPopularity([A])).get(A)?.listeners).toBe(10);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
