import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ArtistSearchResult, ReleaseGroup } from "@/types";
import useReleaseGroupPopularity from "./useReleaseGroupPopularity";

type SearchPage = {
  "release-groups": ReleaseGroup[];
  count: number;
  offset: number;
};

export default function useSearch() {
  const [query, setQuery] = useState("");
  const pages = useInfiniteQuery({
    queryKey: ["album-search", query],
    enabled: !!query,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<SearchPage> => {
      const params = new URLSearchParams({
        q: query,
        offset: String(pageParam),
      });
      const response = await fetch(`/api/musicbrainz/search/page?${params}`, {
        signal,
      });
      if (!response.ok) throw new Error("Album search failed");
      return response.json();
    },
    getNextPageParam: (last) =>
      last.offset + 100 < last.count ? last.offset + 100 : undefined,
  });
  const artists = useQuery({
    queryKey: ["artist-search", query],
    enabled: !!query,
    queryFn: async ({ signal }): Promise<ArtistSearchResult[]> => {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(
        `/api/musicbrainz/search/artists?${params}`,
        { signal }
      );
      if (!response.ok) throw new Error("Artist search failed");
      const result = await response.json();
      return result.artists ?? [];
    },
  });
  const rawAlbums = useMemo(
    () => pages.data?.pages.flatMap((page) => page["release-groups"]) ?? [],
    [pages.data]
  );
  const popularity = useReleaseGroupPopularity(rawAlbums);
  const loaded = rawAlbums.length;
  const total = pages.data?.pages[0]?.count ?? 0;
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = pages;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError && loaded < 500)
      void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage, loaded]);
  const search = useCallback((value: string) => setQuery(value.trim()), []);
  return {
    albums: popularity.releases,
    artists: artists.data ?? [],
    loading: !!query && pages.isPending,
    loadingMore: isFetchingNextPage,
    ranking: popularity.loading,
    popularityUnavailable: popularity.unavailable,
    complete:
      !!query &&
      !hasNextPage &&
      !pages.isFetching &&
      !artists.isFetching &&
      !popularity.loading,
    loaded,
    total,
    moreAvailable: !!hasNextPage && loaded >= 500,
    loadMore: fetchNextPage,
    error: pages.error?.message ?? artists.error?.message ?? null,
    search,
  };
}
