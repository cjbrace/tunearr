import type { UserType } from "../db/entity/User";
import type { DiscoveryFilters } from "../../shared/discoveryFilters";

export type AuthUser = {
  id: number;
  username: string;
  userType: UserType;
  permissions: number;
  enabled: boolean;
  theme: "light" | "dark" | "system";
  discoveryFilters?: DiscoveryFilters;
  thumb: string | null;
  hasPlexToken: boolean;
  plexToken: string | null;
};
