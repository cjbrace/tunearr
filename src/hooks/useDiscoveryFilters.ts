import { useState } from "react";
import {
  DEFAULT_DISCOVERY_FILTERS,
  type DiscoveryFilters,
} from "@shared/discoveryFilters";
import { useAuth } from "@/context/useAuth";

export default function useDiscoveryFilters() {
  const { user, updatePreferences } = useAuth();
  const saved = user?.discoveryFilters ?? DEFAULT_DISCOVERY_FILTERS;
  const [previousSaved, setPreviousSaved] = useState(saved);
  const [filters, setFilters] = useState<DiscoveryFilters>(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (saved !== previousSaved) {
    setPreviousSaved(saved);
    setFilters(saved);
  }

  const changed =
    filters.sort !== saved.sort ||
    filters.excluded.join(",") !== saved.excluded.join(",");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePreferences({ discoveryFilters: filters });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save filters"
      );
    } finally {
      setSaving(false);
    }
  };

  return { filters, setFilters, save, changed, saving, error };
}
