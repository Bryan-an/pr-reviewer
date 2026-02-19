"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type OrgLoadingContextValue = Readonly<{
  isPending: boolean;
  submitOrgForm: (formData: FormData) => void;
}>;

const OrgLoadingContext = createContext<OrgLoadingContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type OrgLoadingProviderProps = Readonly<{
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
}>;

export function OrgLoadingProvider({ action, children }: OrgLoadingProviderProps) {
  const [isPending, startTransition] = useTransition();

  const submitOrgForm = useCallback(
    (formData: FormData) => {
      startTransition(() => action(formData));
    },
    [action, startTransition],
  );

  const value = useMemo<OrgLoadingContextValue>(
    () => ({ isPending, submitOrgForm }),
    [isPending, submitOrgForm],
  );

  return <OrgLoadingContext.Provider value={value}>{children}</OrgLoadingContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrgLoading(): OrgLoadingContextValue {
  const ctx = useContext(OrgLoadingContext);

  if (!ctx) {
    throw new Error("useOrgLoading must be used within an <OrgLoadingProvider>.");
  }

  return ctx;
}
