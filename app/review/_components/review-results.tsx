import { AlertCircleIcon, CheckCircle2Icon, FileIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { PageHeader } from "@/components/page-header";
import type { ReviewRunResult } from "@/server/review/types";

import { NewReviewLink } from "./new-review-link";
import { ReviewActionFooter } from "./review-action-footer";
import { ReviewActionsProvider } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Severity → badge styling
// ---------------------------------------------------------------------------

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  warn: "border-amber-600/20 bg-amber-600/8 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/8 dark:text-amber-400",
  info: "border-border bg-secondary text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewResultsProps = Readonly<{
  result: ReviewRunResult;
  effectiveRunId: string | undefined;
  prUrl: string;
  correlationId: string;
  published: boolean;
  publishError: boolean;
  error: string | undefined;
  publishedThreads: number;
  skippedThreads: number;
  totalThreads: number;
  publishAction: (formData: FormData) => void | Promise<void>;
  rerunAction: (formData: FormData) => void | Promise<void>;
}>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewResults({
  result,
  effectiveRunId,
  prUrl,
  correlationId,
  published,
  publishError,
  error,
  publishedThreads,
  skippedThreads,
  totalThreads,
  publishAction,
  rerunAction,
}: ReviewResultsProps) {
  const publishedThreadsLabel = `thread${publishedThreads === 1 ? "" : "s"}`;
  const skippedThreadsLabel = `thread${skippedThreads === 1 ? "" : "s"}`;

  const skippedMessage =
    skippedThreads > 0
      ? ` (skipped ${skippedThreads} already-posted ${skippedThreadsLabel}).`
      : ".";

  return (
    <ReviewActionsProvider>
      <PageHeader
        title="Review preview"
        maxWidth="3xl"
        showScrollToTop
        actions={<NewReviewLink />}
      />

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 pt-17 pb-12">
        {/* ── Page heading ─────────────────────────────────────────────── */}
        <h1 className="text-2xl font-semibold tracking-tight">Review preview</h1>

        {/* ── Status alerts ────────────────────────────────────────────── */}
        {published ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400">
            <CheckCircle2Icon />
            <AlertDescription>
              Published {publishedThreads} {publishedThreadsLabel}
              {skippedMessage} Total threads considered: {totalThreads}.
            </AlertDescription>
          </Alert>
        ) : null}

        {publishError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              Publish failed. Confirm your Azure DevOps permissions and that the PR is accessible.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>Review failed. {error}</AlertDescription>
          </Alert>
        ) : null}

        {/* ── PR info + actions ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {result.pr.repoName}{" "}
              <span className="text-muted-foreground font-normal">#{result.pr.prId}</span>
            </CardTitle>

            <CardDescription>{result.pr.title}</CardDescription>

            <p className="text-muted-foreground text-xs">
              Engine: <span className="font-medium">{result.engine.name}</span> · Findings:{" "}
              <span className="font-medium">{result.summary.totalFindings}</span>
            </p>
          </CardHeader>

          <ReviewActionFooter
            prUrl={prUrl}
            effectiveRunId={effectiveRunId}
            engineName={result.engine.name}
            correlationId={correlationId}
            publishAction={publishAction}
            rerunAction={rerunAction}
          />
        </Card>

        {/* ── Summary ──────────────────────────────────────────────────── */}
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="mb-3 text-sm font-semibold">
            Summary
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <Card className="gap-1 py-4">
              <CardContent>
                <span className="text-muted-foreground text-xs">Errors</span>
                <p className="text-2xl font-semibold tabular-nums">
                  {result.summary.bySeverity.error}
                </p>
              </CardContent>
            </Card>

            <Card className="gap-1 py-4">
              <CardContent>
                <span className="text-muted-foreground text-xs">Warnings</span>
                <p className="text-2xl font-semibold tabular-nums">
                  {result.summary.bySeverity.warn}
                </p>
              </CardContent>
            </Card>

            <Card className="gap-1 py-4">
              <CardContent>
                <span className="text-muted-foreground text-xs">Info</span>
                <p className="text-2xl font-semibold tabular-nums">
                  {result.summary.bySeverity.info}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Findings ─────────────────────────────────────────────────── */}
        <section aria-labelledby="findings-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="findings-heading" className="text-sm font-semibold">
              Findings
            </h2>

            <span className="text-muted-foreground text-xs">
              Publishing is file-scoped only (no line anchoring in v1).
            </span>
          </div>

          {result.findings.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                No findings from the stub engine.
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {result.findings.map((f) => (
                <li key={f.id}>
                  <Card>
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={SEVERITY_BADGE_STYLES[f.severity]}>
                          {f.severity}
                        </Badge>

                        <Badge variant="secondary">{f.category}</Badge>

                        {f.filePath ? (
                          <span className="text-muted-foreground inline-flex items-center gap-1 truncate text-xs">
                            <FileIcon className="size-3 shrink-0" />
                            {f.filePath}
                          </span>
                        ) : null}
                      </div>

                      <CardTitle className="text-sm">{f.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-3">
                      <Markdown content={f.message} />

                      {f.recommendation ? (
                        <div className="border-muted-foreground/25 border-l-2 pl-3">
                          <p className="text-xs font-medium">Recommendation</p>

                          <Markdown content={f.recommendation} />
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ReviewActionsProvider>
  );
}
