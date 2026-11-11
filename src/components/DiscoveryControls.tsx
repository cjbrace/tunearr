import { useState } from "react";
import FilterBar from "./FilterBar";
import FilterDropdown from "./FilterBar/FilterDropdown";
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
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div
      className="my-5 flex flex-wrap items-center gap-3"
      aria-label="Release filters"
    >
      <FilterDropdown
        group={{
          key: "sort",
          label: "Sort",
          options: [
            { value: "popular", label: "Most listened" },
            { value: "newest", label: "Newest" },
          ],
        }}
        selected={[filters.sort]}
        singleSelect
        isOpen={sortOpen}
        onToggleOpen={() => setSortOpen((open) => !open)}
        onChange={(values) => {
          onChange({ ...filters, sort: values[0] as DiscoveryFilters["sort"] });
          setSortOpen(false);
        }}
      />
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
      <button
        type="button"
        onClick={onSave}
        disabled={!changed || saving}
        className="rounded-lg border-2 border-black bg-pink-400 px-3 py-1.5 text-sm font-bold text-black shadow-cartoon-sm transition-all hover:-translate-y-px hover:bg-pink-300 hover:shadow-cartoon-md active:translate-y-px active:shadow-cartoon-pressed disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-cartoon-sm"
      >
        {saving ? "Saving..." : "Save filters"}
      </button>
      {(changed || error) && (
        <span
          className={`text-xs font-medium ${error ? "text-rose-400" : "text-gray-500 dark:text-gray-400"}`}
          role="status"
        >
          {error ?? "Unsaved changes"}
        </span>
      )}
    </div>
  );
}
