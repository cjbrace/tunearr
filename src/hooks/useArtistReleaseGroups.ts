import { useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { ReleaseGroup } from "@/types";
import useReleaseGroupPopularity from "./useReleaseGroupPopularity";

type ArtistPage = {
  "release-groups": ReleaseGroup[];
  "release-group-count": number;
  "release-group-offset": number;
};

export default function useArtistReleaseGroups(
  artistMbid: string | undefined | null
) {
  const pages = useInfiniteQuery({
    queryKey: ["artist-releases", artistMbid],
    enabled: !!artistMbid,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<ArtistPage> => {
      const response = await fetch(
        `/api/musicbrainz/artist/${artistMbid}/release-groups/page?offset=${pageParam}`,
        { signal }
      );
      if (!response.ok) throw new Error("Artist releases failed to load");
      return response.json();
    },
    getNextPageParam: (last) =>
      last["release-group-offset"] + 100 < last["release-group-count"]
        ? last["release-group-offset"] + 100
        : undefined,
  });
  const rawGroups = useMemo(
    () => pages.data?.pages.flatMap((page) => page["release-groups"]) ?? [],
    [pages.data]
  );
  const popularity = useReleaseGroupPopularity(rawGroups);
  const loaded = rawGroups.length;
  const total = pages.data?.pages[0]?.["release-group-count"] ?? 0;
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = pages;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError && loaded < 500)
      void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage, loaded]);
  return {
    releaseGroups: popularity.releases,
    loading: pages.isPending,
    loadingMore: isFetchingNextPage,
    ranking: popularity.loading,
    popularityUnavailable: popularity.unavailable,
    complete:
      !!artistMbid && !hasNextPage && !pages.isFetching && !popularity.loading,
    loaded,
    total,
    moreAvailable: !!hasNextPage && loaded >= 500,
    loadMore: fetchNextPage,
    error: pages.error?.message ?? null,
  };
}
