import { createContext } from "react";
import type { DiscoveryFilters } from "@shared/discoveryFilters";

export type AuthUser = {
  id: number;
  username: string;
  userType: "local" | "plex";
  permissions: number;
  theme: "light" | "dark" | "system";
  discoveryFilters?: DiscoveryFilters;
  thumb: string | null;
  hasPlexToken: boolean;
};

export type AuthStatus =
  "loading" | "needs-setup" | "unauthenticated" | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  plexLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setup: (username: string, password: string) => Promise<void>;
  plexSetup: () => Promise<void>;
  linkPlex: () => Promise<void>;
  updatePreferences: (prefs: {
    theme?: AuthUser["theme"];
    discoveryFilters?: DiscoveryFilters;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
