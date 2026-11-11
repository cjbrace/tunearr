import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "./components/SearchBar";
import ReleaseGroupCard from "@/components/ReleaseGroupCard";
import ArtistCard from "@/pages/DiscoverPage/components/ArtistCard";
import Skeleton from "@/components/Skeleton";
import useSearch from "@/hooks/useSearch";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";
import useLibraryArtists from "@/hooks/useLibraryArtists";
import useDiscoveryFilters from "@/hooks/useDiscoveryFilters";
import DiscoveryControls from "@/components/DiscoveryControls";
import { filterAndSortReleases } from "@/utils/releaseFilters";

const DEAL_ROTATIONS = [-4, 3.5, -3, 4.5, -3.5, 3];

const SECTION_HEADING_CLASS =
  "text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3";
const ALBUM_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4";
const ARTIST_GRID_CLASS =
  "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3 sm:gap-4";

function AlbumSkeletonCard() {
  return (
    <div>
      <div className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden">
        <div className="flex items-center">
          <Skeleton className="w-24 aspect-square flex-shrink-0 rounded-none" />
          <div className="flex-1 min-w-0 px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      </div>
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-sm overflow-hidden">
        <Skeleton className="aspect-square rounded-none" />
        <div className="p-3 border-t-2 border-black space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  );
}

function ArtistSkeletons() {
  return (
    <div className={`${ARTIST_GRID_CLASS} mt-6`} aria-label="Loading artists">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <Skeleton className="w-full aspect-square rounded-full" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function AlbumSkeletons() {
  return (
    <div className={`${ALBUM_GRID_CLASS} mt-6`} aria-label="Loading albums">
      {[...Array(4)].map((_, i) => (
        <AlbumSkeletonCard key={i} />
      ))}
    </div>
  );
}
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    albums,
    artists,
    albumLoading,
    artistLoading,
    loadingMore,
    ranking,
    popularityUnavailable,
    complete,
    loaded,
    total,
    moreAvailable,
    loadMore,
    albumError,
    artistError,
    retryAlbums,
    retryArtists,
    search,
  } = useSearch();
  const discovery = useDiscoveryFilters();
  const { getAlbumLibrary } = useLibraryAlbums();
  const { isArtistInLibrary } = useLibraryArtists();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = searchParams.get("q") ?? "";
  const [visibleState, setVisibleState] = useState({ query, count: 40 });
  const visibleCount = visibleState.query === query ? visibleState.count : 40;

  useEffect(() => {
    search(query);
  }, [query, search]);

  useEffect(() => {
    const handleReset = () => {
      setSearchParams({});
      inputRef.current?.focus();
    };
    window.addEventListener("search:reset", handleReset);
    return () => window.removeEventListener("search:reset", handleReset);
  }, [setSearchParams]);

  const handleSearch = useCallback(
    (newQuery: string) => {
      setSearchParams({ q: newQuery });
    },
    [setSearchParams]
  );

  const hasResults = artists.length > 0 || albums.length > 0;
  const visibleAlbums = useMemo(
    () => filterAndSortReleases(albums, discovery.filters, "search"),
    [albums, discovery.filters]
  );
  const displayedAlbums = visibleAlbums.slice(0, visibleCount);

  const albumSection = (title: string, items: typeof albums) => (
    <section>
      <h2 className={SECTION_HEADING_CLASS}>{title}</h2>
      <div className={ALBUM_GRID_CLASS}>
        {items.map((rg, index) => (
          <div
            key={rg.id}
            className="cascade-deal-in"
            style={
              {
                "--deal-index": index,
                "--deal-rotate": `${DEAL_ROTATIONS[index % DEAL_ROTATIONS.length]}deg`,
              } as React.CSSProperties
            }
          >
            <ReleaseGroupCard
              releaseGroup={rg}
              library={getAlbumLibrary(rg.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>

      <SearchBar
        onSearch={handleSearch}
        initialQuery={query}
        inputRef={inputRef}
      />

      <DiscoveryControls
        {...discovery}
        onChange={discovery.setFilters}
        onSave={discovery.save}
      />
      {query && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 text-sm text-gray-600 dark:text-gray-300"
        >
          {albumError
            ? "Album search unavailable"
            : complete
              ? `Complete · ${loaded} of ${total} releases`
              : moreAvailable
                ? `${loaded} of ${total} releases loaded · Load more to complete`
                : ranking
                  ? `Ranking · ${loaded} of ${total} releases loaded`
                  : albumLoading
                    ? "Loading album matches"
                    : artistLoading
                      ? "Loading artists"
                      : `Loading · ${loaded} of ${total} releases loaded`}
          {popularityUnavailable && " · Listener counts unavailable"}
        </div>
      )}

      {artistLoading && artists.length === 0 && <ArtistSkeletons />}
      {artists.length > 0 && (
        <section className="mt-6">
          <h2 className={SECTION_HEADING_CLASS}>Artists</h2>
          <div className={ARTIST_GRID_CLASS}>
            {artists.map((artist) => (
              <ArtistCard
                key={artist.mbid}
                name={artist.name}
                mbid={artist.mbid}
                imageUrl={artist.imageUrl}
                inLibrary={isArtistInLibrary(artist.mbid, artist.name)}
              />
            ))}
          </div>
        </section>
      )}
      {artistError && (
        <p className="mt-4 text-sm text-rose-500">
          Artist lookup is unavailable.{" "}
          <button
            type="button"
            onClick={() => void retryArtists()}
            className="font-bold underline"
          >
            Retry artists
          </button>
        </p>
      )}

      {albumLoading && albums.length === 0 && <AlbumSkeletons />}
      {albumError && (
        <p className="mt-4 text-sm text-rose-500">
          Album lookup is unavailable.{" "}
          <button
            type="button"
            onClick={() => void retryAlbums()}
            className="font-bold underline"
          >
            Retry albums
          </button>
        </p>
      )}
      {visibleAlbums.length > 0 && (
        <div className="mt-6 space-y-4">
          {visibleAlbums.some((rg) => rg.popularity) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Releases are ranked by title match and ListenBrainz listeners.
            </p>
          )}
          {albumSection("All releases", displayedAlbums)}
          {visibleAlbums.length > visibleCount && (
            <button
              type="button"
              onClick={() =>
                setVisibleState({ query, count: visibleCount + 40 })
              }
              className="rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold shadow-cartoon-sm hover:bg-amber-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              Show more matches
            </button>
          )}
        </div>
      )}
      {moreAvailable && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mt-4 rounded-lg border-2 border-black bg-amber-300 px-4 py-2 text-sm font-semibold shadow-cartoon-sm hover:bg-amber-200 disabled:opacity-50"
        >
          {loadingMore
            ? "Loading..."
            : `Load more (${total - loaded} remaining)`}
        </button>
      )}
      {albums.length > 0 && visibleAlbums.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          No releases match your filters.
        </p>
      )}

      {!artistLoading &&
        !albumLoading &&
        !artistError &&
        !albumError &&
        !hasResults &&
        (!query || complete) && (
          <div className="mt-16 flex flex-col items-center text-gray-400 animate-fade-in">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            {query ? (
              <>
                <p className="text-lg font-medium text-gray-500">
                  No results found
                </p>
                <p className="mt-1 text-center">Try a different search term.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-500">
                  Search for music
                </p>
                <p className="mt-1 text-center">
                  Find albums or artists by name to add to your library.
                </p>
              </>
            )}
          </div>
        )}
    </div>
  );
}
