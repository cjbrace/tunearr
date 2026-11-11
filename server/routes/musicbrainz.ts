import type { Request, Response } from "express";
import express from "express";
import {
  searchReleaseGroups,
  fetchReleaseGroupsForArtist,
  getReleaseGroupById,
  getReleaseGroupLabel,
  getReleaseGroupDate,
  getAlbumDetails,
  searchReleaseGroupsPage,
  fetchArtistReleaseGroupsPage,
} from "../api/musicbrainz/releaseGroups";
import {
  getArtistById,
  searchArtists,
  getArtistMbidByName,
} from "../api/musicbrainz/artists";
import { getArtistImage, getArtistsImages } from "../api/deezer/artists";
import type { ArtistInfo } from "../api/musicbrainz/types";
import { getLabelAncestors } from "../api/musicbrainz/labels";
import { getReleaseGroupPopularity } from "../api/listenbrainz/popularity";
import type { MusicBrainzReleaseGroup } from "../api/musicbrainz/types";
import { getReleaseTracks } from "../api/musicbrainz/tracks";
import { enrichTracksWithPreviews } from "../services/musicbrainz";
import { getConfigValue } from "../config";
import { evaluatePurchaseDecision } from "../services/purchaseDecision/evaluatePurchaseDecision";
import { lidarrGet } from "../api/lidarr/get";

const router = express.Router();

const ARTIST_SCORE_THRESHOLD = 85;
const ARTIST_RESULT_LIMIT = 5;
const PAGE_SIZE = 100;

type LookupArtist = {
  artistName?: string;
  foreignArtistId?: string;
  artistType?: string;
  disambiguation?: string;
  remotePoster?: string;
};

function lidarrArtistMatches(
  artists: LookupArtist[],
  query: string
): ArtistInfo[] {
  const needle = query.trim().toLocaleLowerCase();
  return artists
    .map((artist) => {
      const name = artist.artistName?.trim() ?? "";
      const normalized = name.toLocaleLowerCase();
      const score =
        normalized === needle
          ? 100
          : normalized.startsWith(needle)
            ? 95
            : normalized.includes(needle)
              ? 90
              : 0;
      return { artist, name, score };
    })
    .filter(
      ({ artist, score }) =>
        score >= ARTIST_SCORE_THRESHOLD && !!artist.foreignArtistId
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, ARTIST_RESULT_LIMIT)
    .map(({ artist, name, score }) => ({
      mbid: artist.foreignArtistId!,
      name,
      score,
      type: artist.artistType || undefined,
      disambiguation: artist.disambiguation || undefined,
      imageUrl: artist.remotePoster || undefined,
    }));
}

async function quickArtistMatches(query: string): Promise<ArtistInfo[]> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      lidarrGet<LookupArtist[]>("/artist/lookup", { term: query }),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 2500);
      }),
    ]);
    if (result?.ok && Array.isArray(result.data)) {
      const matched = lidarrArtistMatches(result.data, query);
      if (matched.length > 0) return matched;
    }
  } catch {
    // MusicBrainz remains available when Lidarr's metadata lookup fails.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  return topArtists(await searchArtists(query));
}

function pageOffset(value: unknown): number | null {
  const offset = Number(value ?? 0);
  return Number.isInteger(offset) &&
    offset >= 0 &&
    offset <= 10000 &&
    offset % PAGE_SIZE === 0
    ? offset
    : null;
}

/** Keep only the strongest artist matches so they don't bury album results */
function topArtists(artists: ArtistInfo[]): ArtistInfo[] {
  return artists
    .filter((a) => (a.score ?? 0) >= ARTIST_SCORE_THRESHOLD)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, ARTIST_RESULT_LIMIT);
}

async function enrichArtistsWithImages(artists: ArtistInfo[]) {
  const images = await getArtistsImages(artists.map((a) => a.name));
  return artists.map((a) => ({
    ...a,
    imageUrl: images.get(a.name.toLowerCase()) || undefined,
  }));
}

async function withPopularity(releaseGroups: MusicBrainzReleaseGroup[]) {
  const popularity = await getReleaseGroupPopularity(
    releaseGroups.map((rg) => rg.id)
  );
  return releaseGroups.map((rg) => {
    const value = popularity.get(rg.id);
    return value ? { ...rg, popularity: value } : rg;
  });
}

router.get("/search/all", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const [releaseGroups, artists] = await Promise.all([
    searchReleaseGroups(q),
    searchArtists(q),
  ]);

  const [enrichedArtists, albums] = await Promise.all([
    enrichArtistsWithImages(topArtists(artists)),
    withPopularity(releaseGroups["release-groups"]),
  ]);

  res.json({
    "release-groups": albums,
    count: releaseGroups.count,
    artists: enrichedArtists,
  });
});

router.get("/search", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const found = await searchReleaseGroups(q);
  res.json({
    ...found,
    "release-groups": await withPopularity(found["release-groups"]),
  });
});

router.get("/search/page", async (req: Request, res: Response) => {
  const q = req.query.q;
  const offset = pageOffset(req.query.offset);
  if (typeof q !== "string" || !q.trim() || offset === null) {
    return res.status(400).json({ error: "Valid q and offset are required" });
  }
  res.json(await searchReleaseGroupsPage(q.trim(), offset));
});

router.get("/search/artists", async (req: Request, res: Response) => {
  const q = req.query.q;
  if (typeof q !== "string" || !q.trim()) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }
  res.json({ artists: await quickArtistMatches(q.trim()) });
});

router.post("/popularity", async (req: Request, res: Response) => {
  const ids = req.body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length > 500 ||
    !ids.every((id) => typeof id === "string")
  ) {
    return res
      .status(400)
      .json({ error: "Up to 500 release-group IDs are required" });
  }
  const popularity = await getReleaseGroupPopularity(ids);
  res.json(Object.fromEntries(popularity));
});

router.get("/artist/search", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (typeof q !== "string") {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const artists = await searchArtists(q);
  res.json({ artists: await enrichArtistsWithImages(artists) });
});

router.get("/artist/id", async (req: Request, res: Response) => {
  const { name } = req.query;
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Query parameter name is required" });
  }

  res.json({ mbid: await getArtistMbidByName(name) });
});

router.get(
  "/artist/:mbid/release-groups",
  async (req: Request, res: Response) => {
    const { mbid } = req.params;
    const releaseGroups = await fetchReleaseGroupsForArtist(mbid as string);
    res.json({ releaseGroups: await withPopularity(releaseGroups) });
  }
);

router.get(
  "/artist/:mbid/release-groups/page",
  async (req: Request, res: Response) => {
    const offset = pageOffset(req.query.offset);
    if (offset === null) {
      return res.status(400).json({ error: "Valid offset is required" });
    }
    res.json(
      await fetchArtistReleaseGroupsPage(req.params.mbid as string, offset)
    );
  }
);

router.get("/artist/:mbid", async (req: Request, res: Response) => {
  const { mbid } = req.params;
  const artist = await getArtistById(mbid as string);

  if (!artist) {
    return res.status(404).json({ error: "Artist not found" });
  }

  const imageUrl = await getArtistImage(artist.name);

  res.json({ artist: { ...artist, imageUrl: imageUrl || undefined } });
});

router.get("/tracks/:releaseGroupId", async (req: Request, res: Response) => {
  const { releaseGroupId } = req.params;
  const artistName =
    typeof req.query.artistName === "string" ? req.query.artistName : "";
  const media = await getReleaseTracks(releaseGroupId as string);

  const enrichedMedia = artistName
    ? await enrichTracksWithPreviews(media, artistName)
    : media;

  res.json({ media: enrichedMedia });
});

router.get(
  "/release-group/:mbid/label",
  async (req: Request, res: Response) => {
    const { mbid } = req.params;
    res.json({ label: await getReleaseGroupLabel(mbid as string) });
  }
);

router.get("/release-group/:mbid", async (req: Request, res: Response) => {
  const { mbid } = req.params;
  const result = await getReleaseGroupById(mbid as string);

  if (!result) {
    return res.status(404).json({ error: "Release group not found" });
  }

  res.json(result);
});

router.get("/album/:mbid", async (req: Request, res: Response) => {
  const { mbid } = req.params;
  const album = await getAlbumDetails(mbid as string);

  if (!album) {
    return res.status(404).json({ error: "Album not found" });
  }

  res.json({ album });
});

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.get(
  "/purchase-context/:releaseGroupId",
  async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const { releaseGroupId } = req.params;

      sendSSE(res, "progress", { step: "Looking up album details" });
      const [label, firstReleaseDate] = await Promise.all([
        getReleaseGroupLabel(releaseGroupId as string),
        getReleaseGroupDate(releaseGroupId as string),
      ]);

      const config = getConfigValue("purchaseDecision");
      const blocklist = config.labelBlocklist;

      let labelAncestors: { name: string; mbid: string }[] = [];
      if (label) {
        sendSSE(res, "progress", {
          step: "Resolving label ownership",
          detail: label.name,
        });
        labelAncestors = await getLabelAncestors(label.mbid, {
          onAncestorFound: (ancestor) => {
            sendSSE(res, "progress", {
              step: "Resolving label ownership",
              detail: ancestor.name,
            });
          },
          shouldStop: (ancestors) =>
            ancestors.some((a) =>
              blocklist.some((b) =>
                a.name.toLowerCase().includes(b.toLowerCase())
              )
            ),
        });
      }
      const result = evaluatePurchaseDecision(
        { label, labelAncestors, firstReleaseDate },
        config
      );
      sendSSE(res, "result", result);
    } catch {
      sendSSE(res, "result", {
        recommendation: "neutral",
        signals: [],
        label: null,
      });
    } finally {
      res.end();
    }
  }
);

export default router;
