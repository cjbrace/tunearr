import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import {
  getAllAlbums,
  getMonitoredAlbums,
  invalidateMonitoredAlbums,
} from "./albums";

beforeEach(() => {
  vi.clearAllMocks();
  invalidateMonitoredAlbums();
});

describe("getMonitoredAlbums", () => {
  it("keeps cached unmonitored albums available to the request UI", async () => {
    mockLidarrGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        { id: 1, monitored: true },
        {
          id: 2,
          monitored: false,
          statistics: { trackFileCount: 5, trackCount: 5 },
        },
      ],
    });

    const all = await getAllAlbums();
    const monitored = await getMonitoredAlbums();
    expect(all.ok && all.data).toHaveLength(2);
    expect(monitored.ok && monitored.data).toHaveLength(1);
    expect(mockLidarrGet).toHaveBeenCalledTimes(1);
  });
  it("returns only monitored albums", async () => {
    mockLidarrGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: [
        { id: 1, title: "OK Computer", monitored: true },
        { id: 2, title: "Kid A", monitored: false },
      ],
    });

    const result = await getMonitoredAlbums();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("OK Computer");
    }
  });

  it("passes album statistics through untouched", async () => {
    const statistics = {
      trackFileCount: 9,
      totalTrackCount: 12,
      percentOfTracks: 75,
    };
    mockLidarrGet.mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ id: 1, title: "OK Computer", monitored: true, statistics }],
    });

    const result = await getMonitoredAlbums();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].statistics).toEqual(statistics);
    }
  });

  it("returns error when Lidarr API fails", async () => {
    mockLidarrGet.mockResolvedValue({
      ok: false,
      status: 503,
      data: null,
    });

    const result = await getMonitoredAlbums();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
    }
  });
});

describe("getMonitoredAlbums caching", () => {
  const okResponse = {
    ok: true,
    status: 200,
    data: [{ id: 1, title: "OK Computer", monitored: true }],
  };

  it("serves repeat calls from the cached snapshot", async () => {
    mockLidarrGet.mockResolvedValue(okResponse);

    await getMonitoredAlbums();
    await getMonitoredAlbums();

    expect(mockLidarrGet).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed fetch", async () => {
    mockLidarrGet
      .mockResolvedValueOnce({ ok: false, status: 503, data: null })
      .mockResolvedValue(okResponse);

    const first = await getMonitoredAlbums();
    const second = await getMonitoredAlbums();

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
  });

  it("refetches after invalidation", async () => {
    mockLidarrGet.mockResolvedValue(okResponse);

    await getMonitoredAlbums();
    invalidateMonitoredAlbums();
    await getMonitoredAlbums();

    expect(mockLidarrGet).toHaveBeenCalledTimes(2);
  });
});
