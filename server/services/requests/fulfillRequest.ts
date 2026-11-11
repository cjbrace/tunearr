import { lidarrPost } from "../../api/lidarr/post";
import { lidarrPut } from "../../api/lidarr/put";
import { clearPromotedAlbumCache } from "../../promotedAlbum/getPromotedAlbum";
import { clearPromotedArtistsCache } from "../../promotedArtists/getPromotedArtists";
import {
  getAlbumByMbid,
  getOrAddArtist,
  getOrAddAlbum,
} from "../lidarr/helpers";
import { invalidateLidarrCaches } from "../lidarr/invalidate";

type FulfillResult =
  | {
      status: "success";
      artistName: string;
      albumTitle: string;
      searchQueued: boolean;
    }
  | {
      status: "already_monitored";
      artistName: string;
      albumTitle: string;
      searchQueued: false;
    };

type FulfillOptions = {
  /** A manual retry may search an existing monitored album with missing files. */
  searchIfMonitored?: boolean;
};

export async function fulfillRequest(
  albumMbid: string,
  options: FulfillOptions = {}
): Promise<FulfillResult> {
  const lookupAlbum = await getAlbumByMbid(albumMbid);
  const artistMbid = lookupAlbum.artist?.foreignArtistId;

  if (!artistMbid) {
    throw new Error("Could not determine artist from album lookup");
  }

  const artistName = lookupAlbum.artist?.artistName ?? "Unknown Artist";
  const albumTitle = lookupAlbum.title ?? "Unknown Album";

  const artist = await getOrAddArtist(artistMbid);
  const { wasAdded, album } = await getOrAddAlbum(albumMbid, artist);

  const stats = album.statistics;
  const expected = stats?.trackCount ?? stats?.totalTrackCount ?? 0;
  const complete =
    !wasAdded && expected > 0 && (stats?.trackFileCount ?? 0) >= expected;

  if (!wasAdded && album.monitored && (!options.searchIfMonitored || complete))
    return {
      status: "already_monitored",
      artistName,
      albumTitle,
      searchQueued: false,
    };

  if (!album.monitored) {
    const monitorResult = await lidarrPut("/album/monitor", {
      albumIds: [album.id],
      monitored: true,
    });

    if (!monitorResult.ok) {
      throw new Error("Failed to monitor album");
    }
  }

  if (!complete) {
    const search = await lidarrPost("/command", {
      name: "AlbumSearch",
      albumIds: [album.id],
    });
    if (!search.ok) throw new Error("Lidarr did not accept the album search");
  }

  invalidateLidarrCaches();
  clearPromotedAlbumCache();
  clearPromotedArtistsCache();

  return { status: "success", artistName, albumTitle, searchQueued: !complete };
}
