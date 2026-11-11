import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import useArtistReleaseGroups from "../useArtistReleaseGroups";

vi.mock("../useReleaseGroupPopularity", () => ({
  default: (releases: unknown[]) => ({
    releases,
    loading: false,
    unavailable: false,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("useArtistReleaseGroups", () => {
  it("waits for an artist ID", () => {
    const { result } = renderHook(() => useArtistReleaseGroups(null), {
      wrapper,
    });
    expect(result.current.releaseGroups).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads the paged catalog and marks completion", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          "release-groups": [{ id: "album", title: "Album" }],
          "release-group-count": 1,
          "release-group-offset": 0,
        })
      )
    );
    const { result } = renderHook(() => useArtistReleaseGroups("artist"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.complete).toBe(true));
    expect(result.current.releaseGroups[0].title).toBe("Album");
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "/release-groups/page?offset=0"
    );
  });
});
