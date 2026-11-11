import { resilientFetch } from "../resilientFetch";
import { LISTENBRAINZ_API_BASE } from "./config";
import { createLogger } from "../../logger";

export type ReleaseGroupPopularity = {
  listeners: number;
  listens: number;
};

type PopularityRow = {
  release_group_mbid: string;
  total_user_count: number | null;
  total_listen_count: number | null;
};

const log = createLogger("listenbrainz-popularity");
const MBID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;
const cache = new Map<
  string,
  { value: ReleaseGroupPopularity | null; until: number }
>();

/** A public, exact-MBID signal. An outage must never break music discovery. */
export async function getReleaseGroupPopularity(
  mbids: string[]
): Promise<Map<string, ReleaseGroupPopularity>> {
  const now = Date.now();
  const ids = [...new Set(mbids.filter((id) => MBID_PATTERN.test(id)))];
  const result = new Map<string, ReleaseGroupPopularity>();
  const missing: string[] = [];

  for (const id of ids) {
    const entry = cache.get(id);
    if (entry && entry.until > now) {
      if (entry.value) result.set(id, entry.value);
    } else {
      missing.push(id);
    }
  }

  for (let offset = 0; offset < missing.length; offset += BATCH_SIZE) {
    const batch = missing.slice(offset, offset + BATCH_SIZE);
    try {
      const response = await resilientFetch(
        `${LISTENBRAINZ_API_BASE}/1/popularity/release-group`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Tunearr/0.1.0",
          },
          body: JSON.stringify({ release_group_mbids: batch }),
        },
        { timeoutMs: 4000, retry: false }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = (await response.json()) as PopularityRow[];
      if (!Array.isArray(rows)) throw new Error("Invalid response");
      const byId = new Map(rows.map((row) => [row.release_group_mbid, row]));
      for (const id of batch) {
        const row = byId.get(id);
        const listeners = row?.total_user_count;
        const listens = row?.total_listen_count;
        const value =
          typeof listeners === "number" &&
          Number.isFinite(listeners) &&
          listeners >= 0 &&
          typeof listens === "number" &&
          Number.isFinite(listens) &&
          listens >= 0
            ? { listeners, listens }
            : null;
        cache.set(id, { value, until: now + CACHE_TTL_MS });
        if (value) result.set(id, value);
      }
    } catch (error) {
      log.warn("Popularity lookup unavailable", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export function clearPopularityCache(): void {
  cache.clear();
}
