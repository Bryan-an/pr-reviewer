"use client";

import { useCallback, useEffect, useId, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { REVIEW_FORM_FIELD } from "../_lib/form-fields";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

const RUNNER_STATUS = {
  Loading: "loading",
  Error: "error",
} as const;

type State =
  | { status: typeof RUNNER_STATUS.Loading; errorMessage: null }
  | { status: typeof RUNNER_STATUS.Error; errorMessage: string };

type Action =
  | { type: typeof RUNNER_STATUS.Loading }
  | { type: typeof RUNNER_STATUS.Error; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case RUNNER_STATUS.Loading:
      return { status: RUNNER_STATUS.Loading, errorMessage: null };
    case RUNNER_STATUS.Error:
      return { status: RUNNER_STATUS.Error, errorMessage: action.message };
    default: {
      return state;
    }
  }
}

const initialState: State = { status: RUNNER_STATUS.Loading, errorMessage: null };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseErrorMessage(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }

  return "An unexpected error occurred. Please try again.";
}

function parseRunId(data: unknown): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "runId" in data &&
    typeof (data as { runId: unknown }).runId === "string"
  ) {
    return (data as { runId: string }).runId;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ReviewRunnerProps = Readonly<{
  prUrl: string;
  cacheLoadError?: string;
}>;

export function ReviewRunner({ prUrl, cacheLoadError }: ReviewRunnerProps) {
  const router = useRouter();
  const statusId = useId();

  const [state, dispatch] = useReducer(reducer, initialState);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const runReview = useCallback(
    async (signal: AbortSignal) => {
      try {
        const response = await fetch("/api/review/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prUrl }),
          signal,
        });

        if (signal.aborted) return;

        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          dispatch({ type: RUNNER_STATUS.Error, message: parseErrorMessage(body) });
          return;
        }

        const body: unknown = await response.json();
        const runId = parseRunId(body);

        if (!runId) {
          dispatch({ type: RUNNER_STATUS.Error, message: "Unexpected response from the server." });
          return;
        }

        router.replace(
          `/review?${REVIEW_FORM_FIELD.PrUrl}=${encodeURIComponent(prUrl)}&${REVIEW_FORM_FIELD.RunId}=${encodeURIComponent(runId)}`,
        );
      } catch (err) {
        if (signal.aborted) return;

        dispatch({
          type: RUNNER_STATUS.Error,
          message: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    },
    [prUrl, router],
  );

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void runReview(controller.signal);

    return () => {
      controller.abort();
    };
  }, [runReview]);

  // Focus the cancel button on initial mount so keyboard users can act immediately.
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    router.push("/");
  };

  const handleRetry = () => {
    abortControllerRef.current?.abort();

    dispatch({ type: RUNNER_STATUS.Loading });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    void runReview(controller.signal);
  };

  if (state.status === RUNNER_STATUS.Error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md text-center" role="alert">
          <CardHeader>
            <div className="text-destructive flex justify-center">
              <AlertCircleIcon className="size-8" />
            </div>

            <CardTitle className="text-xl">Review failed</CardTitle>

            <CardDescription>
              {state.errorMessage ?? "Something went wrong while generating the review."}
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go back
            </Button>

            <Button onClick={handleRetry}>Try again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-md text-center" aria-busy="true">
        <CardHeader>
          <div className="flex justify-center">
            <Spinner className="size-8" aria-describedby={statusId} />
          </div>

          <CardTitle className="text-xl" id={statusId}>
            Generating review&hellip;
          </CardTitle>

          <CardDescription>
            Cloning repository, generating diff, and running AI analysis. This may take a few
            minutes.
          </CardDescription>
        </CardHeader>

        {cacheLoadError ? (
          <CardContent>
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {cacheLoadError}
            </div>
          </CardContent>
        ) : null}

        <CardContent>
          <output className="text-muted-foreground sr-only" aria-live="polite">
            Review in progress. Please wait or cancel to return to the home page.
          </output>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button ref={cancelButtonRef} variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
