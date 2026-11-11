import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReleaseGroup } from "@/types";

type Popularity = Record<string, { listeners: number; listens: number }>;

export default function useReleaseGroupPopularity(releases: ReleaseGroup[]) {
  const ids = useMemo(() => releases.map((release) => release.id), [releases]);
  const query = useQuery({
    queryKey: ["release-popularity", ids],
    enabled: ids.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async ({ signal }) => {
      const batches: Popularity[] = [];
      for (let index = 0; index < ids.length; index += 500) {
        const res = await fetch("/api/musicbrainz/popularity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: ids.slice(index, index + 500) }),
          signal,
        });
        if (!res.ok) throw new Error("Popularity unavailable");
        batches.push((await res.json()) as Popularity);
      }
      return Object.assign({}, ...batches) as Popularity;
    },
  });

  const enriched = useMemo(
    () =>
      releases.map((release) => {
        const popularity = query.data?.[release.id];
        return popularity ? { ...release, popularity } : release;
      }),
    [releases, query.data]
  );

  return {
    releases: enriched,
    loading: ids.length > 0 && query.isFetching,
    unavailable: query.isError,
  };
}
