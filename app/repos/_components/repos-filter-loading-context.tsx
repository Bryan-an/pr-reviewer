"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { REPOS_SECTION_ID } from "@/app/repos/_lib/dom-ids";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type NavigateToReposOptions = Readonly<{
  replace?: boolean;
}>;

type ReposFilterLoadingContextValue = Readonly<{
  isPending: boolean;
  isRefreshing: boolean;
  navigateToRepos: (href: string, options?: NavigateToReposOptions) => void;
  refreshRepos: () => void;
}>;

const ReposFilterLoadingContext = createContext<ReposFilterLoadingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type ReposFilterLoadingProviderProps = Readonly<{
  children: ReactNode;
}>;

export function ReposFilterLoadingProvider({ children }: ReposFilterLoadingProviderProps) {
  const [isNavigating, startNavigationTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const router = useRouter();

  const navigateToRepos = useCallback(
    (href: string, options?: NavigateToReposOptions) => {
      const navigate = options?.replace ? router.replace : router.push;

      startNavigationTransition(() => {
        navigate(href, { scroll: false });
      });

      requestAnimationFrame(() => {
        document
          .getElementById(REPOS_SECTION_ID)
          ?.scrollIntoView({ behavior: "instant", block: "start" });
      });
    },
    [router, startNavigationTransition],
  );

  const refreshRepos = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [router, startRefreshTransition]);

  const value = useMemo<ReposFilterLoadingContextValue>(
    () => ({
      isPending: isNavigating || isRefreshing,
      isRefreshing,
      navigateToRepos,
      refreshRepos,
    }),
    [isNavigating, isRefreshing, navigateToRepos, refreshRepos],
  );

  return (
    <ReposFilterLoadingContext.Provider value={value}>
      {children}
    </ReposFilterLoadingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReposFilterLoading(): ReposFilterLoadingContextValue {
  const ctx = useContext(ReposFilterLoadingContext);

  if (!ctx) {
    throw new Error("useReposFilterLoading must be used within a <ReposFilterLoadingProvider>.");
  }

  return ctx;
}
