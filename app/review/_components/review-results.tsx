import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { FINDING_STATUS } from "@/lib/validation/finding-status";
import type { ReviewRunResult } from "@/server/review/types";

import type { FindingActionResult } from "../_actions/finding-actions";
import type { PublishActionResult } from "../_actions/publish-action";
import type { RerunActionResult } from "../_actions/rerun-action";
import type { RestoreAllActionResult } from "../_actions/restore-all-action";
import type { FindingWithStatus } from "./finding-card";
import { FindingsList } from "./findings-list";
import { NewReviewLink } from "./new-review-link";
import { RestoreAllButton } from "./restore-all-button";
import { ReviewActionFooter } from "./review-action-footer";
import { ReviewActionsProvider } from "./review-actions-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewResultsProps = Readonly<{
  result: ReviewRunResult;
  effectiveRunId: string | undefined;
  prUrl: string;
  correlationId: string;
  publishAction: (formData: FormData) => Promise<PublishActionResult>;
  rerunAction: (formData: FormData) => Promise<RerunActionResult>;
  publishFindingAction: (findingDbId: string) => Promise<FindingActionResult>;
  ignoreFindingAction: (findingDbId: string) => Promise<FindingActionResult>;
  restoreFindingAction: (findingDbId: string) => Promise<FindingActionResult>;
  restoreAllAction: (fd: FormData) => Promise<RestoreAllActionResult>;
}>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewResults({
  result,
  effectiveRunId,
  prUrl,
  correlationId,
  publishAction,
  rerunAction,
  publishFindingAction,
  ignoreFindingAction,
  restoreFindingAction,
  restoreAllAction,
}: ReviewResultsProps) {
  const findingsWithStatus: FindingWithStatus[] = result.findings.map((f) => ({
    dbId: f.dbId ?? f.id,
    id: f.id,
    status: f.status ?? FINDING_STATUS.Pending,
    severity: f.severity,
    category: f.category,
    title: f.title,
    message: f.message,
    filePath: f.filePath,
    lineStart: f.lineStart,
    lineEnd: f.lineEnd,
    recommendation: f.recommendation,
    sourceName: f.sourceName,
    codeSnippet: f.codeSnippet,
  }));

  const restorableCount = findingsWithStatus.filter(
    (f) => f.status === FINDING_STATUS.Published || f.status === FINDING_STATUS.Ignored,
  ).length;

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

            {restorableCount > 0 && effectiveRunId && (
              <RestoreAllButton
                effectiveRunId={effectiveRunId}
                restorableCount={restorableCount}
                restoreAllAction={restoreAllAction}
              />
            )}
          </div>

          {findingsWithStatus.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                No findings — the diff looks good.
              </CardContent>
            </Card>
          ) : (
            <FindingsList
              findings={findingsWithStatus}
              publishFindingAction={publishFindingAction}
              ignoreFindingAction={ignoreFindingAction}
              restoreFindingAction={restoreFindingAction}
            />
          )}
        </section>
      </div>
    </ReviewActionsProvider>
  );
}
