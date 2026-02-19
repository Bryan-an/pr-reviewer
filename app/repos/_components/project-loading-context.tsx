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

type ProjectLoadingContextValue = Readonly<{
  isPending: boolean;
  navigateToProject: (href: string) => void;
}>;

const ProjectLoadingContext = createContext<ProjectLoadingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type ProjectLoadingProviderProps = Readonly<{
  children: ReactNode;
}>;

export function ProjectLoadingProvider({ children }: ProjectLoadingProviderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const navigateToProject = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router, startTransition],
  );

  const value = useMemo<ProjectLoadingContextValue>(
    () => ({ isPending, navigateToProject }),
    [isPending, navigateToProject],
  );

  return <ProjectLoadingContext.Provider value={value}>{children}</ProjectLoadingContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProjectLoading(): ProjectLoadingContextValue {
  const ctx = useContext(ProjectLoadingContext);

  if (!ctx) {
    throw new Error("useProjectLoading must be used within a <ProjectLoadingProvider>.");
  }

  return ctx;
}
