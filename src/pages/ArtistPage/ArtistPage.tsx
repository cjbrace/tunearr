import { useMemo } from "react";
import { useParams } from "react-router-dom";
import useArtistDetails from "@/hooks/useArtistDetails";
import useArtistReleaseGroups from "@/hooks/useArtistReleaseGroups";
import useLibraryAlbums from "@/hooks/useLibraryAlbums";
import useLibraryArtists from "@/hooks/useLibraryArtists";
import useSimilarArtists from "@/hooks/useSimilarArtists";
import useArtistLiveDates from "@/hooks/useArtistLiveDates";
import { filterAndSortReleases } from "@/utils/releaseFilters";
import useDiscoveryFilters from "@/hooks/useDiscoveryFilters";
import DiscoveryControls from "@/components/DiscoveryControls";
import ArtistHeader from "./components/ArtistHeader";
import ArtistDiscography from "./components/ArtistDiscography";
import SimilarArtists from "./components/SimilarArtists";
import ArtistLiveDates from "./components/ArtistLiveDates";
import ArtistPageSkeleton from "./components/ArtistPageSkeleton";

export default function ArtistPage() {
  const { mbid } = useParams<{ mbid: string }>();
  const { artist, loading, error } = useArtistDetails(mbid);
  const {
    releaseGroups,
    loading: releasesLoading,
    loadingMore,
    ranking,
    popularityUnavailable,
    complete,
    loaded,
    total,
    moreAvailable,
    loadMore,
    error: releasesError,
  } = useArtistReleaseGroups(mbid);
  const discovery = useDiscoveryFilters();
  const { getAlbumLibrary } = useLibraryAlbums();
  const { isArtistInLibrary } = useLibraryArtists();
  const { artists: similarArtists, loading: similarLoading } =
    useSimilarArtists(artist?.name, mbid);
  const { dates: liveDates, tracking: liveTracking } = useArtistLiveDates(mbid);

  const sections = useMemo(() => {
    const items = filterAndSortReleases(
      releaseGroups,
      discovery.filters,
      "artist"
    );
    return items.length ? [{ title: "All releases", items }] : [];
  }, [releaseGroups, discovery.filters]);

  if (loading) return <ArtistPageSkeleton />;

  if (error || !artist) {
    return (
      <div className="mt-16 flex flex-col items-center text-gray-400 animate-fade-in">
        <p className="text-lg font-medium text-gray-500">
          {error ?? "Artist not found"}
        </p>
        <p className="mt-1 text-center">
          We couldn&apos;t load this artist. Try again from search.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ArtistHeader
        artist={artist}
        inLibrary={isArtistInLibrary(mbid ?? "", artist.name)}
      />

      <ArtistLiveDates dates={liveDates} tracking={liveTracking} />

      <DiscoveryControls
        {...discovery}
        onChange={discovery.setFilters}
        onSave={discovery.save}
      />
      <div
        role="status"
        aria-live="polite"
        className="mb-3 text-sm text-gray-600 dark:text-gray-300"
      >
        {releasesError
          ? "Catalog interrupted"
          : complete
            ? `Complete · ${loaded} of ${total} releases`
            : moreAvailable
              ? `${loaded} of ${total} releases loaded · Load more to complete`
              : ranking
                ? `Ranking · ${loaded} of ${total} releases loaded`
                : `Loading · ${loaded} of ${total} releases loaded`}
        {popularityUnavailable && " · Listener counts unavailable"}
      </div>

      <ArtistDiscography
        sections={sections}
        loading={releasesLoading}
        error={releasesError}
        getAlbumLibrary={getAlbumLibrary}
      />
      {moreAvailable && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mb-6 rounded-lg border-2 border-black bg-amber-300 px-4 py-2 font-semibold disabled:opacity-50"
        >
          {loadingMore
            ? "Loading..."
            : `Load more (${total - loaded} remaining)`}
        </button>
      )}

      <SimilarArtists
        artists={similarArtists}
        loading={similarLoading}
        isArtistInLibrary={isArtistInLibrary}
      />
    </div>
  );
}
