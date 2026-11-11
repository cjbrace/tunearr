import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import useSearch from "../useSearch";

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

describe("useSearch", () => {
  it("does not fetch an empty query", () => {
    const { result } = renderHook(() => useSearch(), { wrapper });
    expect(result.current.albums).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the first page while fetching subsequent pages", async () => {
    let finishSecond!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("search/artists"))
        return Promise.resolve(new Response(JSON.stringify({ artists: [] })));
      if (url.includes("offset=100"))
        return new Promise((resolve) => {
          finishSecond = resolve;
        });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            "release-groups": [{ id: "first", title: "First" }],
            count: 101,
            offset: 0,
          })
        )
      );
    });
    const { result } = renderHook(() => useSearch(), { wrapper });
    act(() => result.current.search("music"));
    await waitFor(() => expect(result.current.loaded).toBe(1));
    expect(result.current.complete).toBe(false);
    expect(result.current.albums[0].title).toBe("First");
    act(() =>
      finishSecond(
        new Response(
          JSON.stringify({
            "release-groups": [{ id: "last", title: "Last" }],
            count: 101,
            offset: 100,
          })
        )
      )
    );
    await waitFor(() => expect(result.current.complete).toBe(true));
    expect(result.current.loaded).toBe(2);
  });

  it("reports a failed album page", async () => {
    vi.mocked(fetch).mockImplementation((input) =>
      Promise.resolve(
        String(input).includes("search/artists")
          ? new Response(JSON.stringify({ artists: [] }))
          : new Response("failure", { status: 500 })
      )
    );
    const { result } = renderHook(() => useSearch(), { wrapper });
    act(() => result.current.search("music"));
    await waitFor(() =>
      expect(result.current.error).toBe("Album search failed")
    );
  });
});
