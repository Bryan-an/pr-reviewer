"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type ReviewActionsContextValue = Readonly<{
  isPublishing: boolean;
  isRerunning: boolean;
  isAnyPending: boolean;
  isGlobalOperationPending: boolean;
  startPublishTransition: TransitionStartFunction;
  startRerunTransition: TransitionStartFunction;
  setHasCardPending: (value: boolean) => void;
}>;

const ReviewActionsContext = createContext<ReviewActionsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ReviewActionsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isPublishing, startPublishTransition] = useTransition();
  const [isRerunning, startRerunTransition] = useTransition();
  const [hasCardPending, setHasCardPending] = useState(false);

  const value = useMemo<ReviewActionsContextValue>(
    () => ({
      isPublishing,
      isRerunning,
      isAnyPending: isPublishing || isRerunning || hasCardPending,
      isGlobalOperationPending: isPublishing || isRerunning,
      startPublishTransition,
      startRerunTransition,
      setHasCardPending,
    }),
    [isPublishing, isRerunning, hasCardPending, startPublishTransition, startRerunTransition],
  );

  return <ReviewActionsContext.Provider value={value}>{children}</ReviewActionsContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReviewActions(): ReviewActionsContextValue {
  const ctx = useContext(ReviewActionsContext);

  if (!ctx) {
    throw new Error("useReviewActions must be used within a <ReviewActionsProvider>.");
  }

  return ctx;
}
