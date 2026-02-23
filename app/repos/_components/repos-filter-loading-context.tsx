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

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type ReposFilterLoadingContextValue = Readonly<{
  isPending: boolean;
  navigateToRepos: (href: string) => void;
}>;

const ReposFilterLoadingContext = createContext<ReposFilterLoadingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type ReposFilterLoadingProviderProps = Readonly<{
  children: ReactNode;
}>;

export function ReposFilterLoadingProvider({ children }: ReposFilterLoadingProviderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const navigateToRepos = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router, startTransition],
  );

  const value = useMemo<ReposFilterLoadingContextValue>(
    () => ({ isPending, navigateToRepos }),
    [isPending, navigateToRepos],
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
