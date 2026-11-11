import FilterBar from "./FilterBar";
import {
  RELEASE_KINDS,
  type DiscoveryFilters,
  type ReleaseKind,
} from "@shared/discoveryFilters";
import { RELEASE_KIND_LABELS } from "@/utils/releaseFilters";

type Props = {
  filters: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  onSave: () => void;
  changed: boolean;
  saving: boolean;
  error: string | null;
};

export default function DiscoveryControls({
  filters,
  onChange,
  onSave,
  changed,
  saving,
  error,
}: Props) {
  return (
    <div className="mb-5 space-y-2" aria-label="Release filters">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          All releases
        </h2>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Sort{" "}
          <select
            aria-label="Sort releases"
            value={filters.sort}
            onChange={(event) =>
              onChange({
                ...filters,
                sort: event.target.value as DiscoveryFilters["sort"],
              })
            }
            className="rounded border border-gray-400 bg-white px-2 py-1 text-gray-900 dark:bg-gray-800 dark:text-white"
          >
            <option value="popular">Most listened</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        <button
          type="button"
          onClick={onSave}
          disabled={!changed || saving}
          className="rounded-lg border-2 border-black bg-amber-300 px-3 py-1 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save filters"}
        </button>
        <span className="text-xs text-gray-500" role="status">
          {error ?? (changed ? "Unsaved changes" : "Saved for your account")}
        </span>
      </div>
      <FilterBar
        filters={[
          {
            key: "excluded",
            label: "Hide types",
            options: RELEASE_KINDS.map((kind) => ({
              value: kind,
              label: RELEASE_KIND_LABELS[kind],
            })),
          },
        ]}
        values={{ excluded: filters.excluded }}
        onChange={(_key, values) =>
          onChange({
            ...filters,
            excluded: RELEASE_KINDS.filter((kind) =>
              values.includes(kind)
            ) as ReleaseKind[],
          })
        }
      />
    </div>
  );
}
