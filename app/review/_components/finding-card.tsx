"use client";

import { useState } from "react";
import {
  CheckCircle2Icon,
  EyeOffIcon,
  FileIcon,
  Loader2Icon,
  SendIcon,
  UndoIcon,
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { FINDING_STATUS, type FindingStatus } from "@/lib/validation/finding-status";

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

export type FindingWithStatus = Readonly<{
  dbId: string;
  id: string;
  status: FindingStatus;
  severity: string;
  category: string;
  title: string;
  message: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  recommendation?: string;
  sourceName?: string;
}>;

type FindingCardProps = Readonly<{
  finding: FindingWithStatus;
  isPending: boolean;
  onPublish: () => void;
  onIgnore: () => void;
  onRestore: () => void;
}>;

// ---------------------------------------------------------------------------
// Local button components (deduplicated)
// ---------------------------------------------------------------------------

function RestoreButton({
  isPending,
  onRestore,
}: Readonly<{ isPending: boolean; onRestore: () => void }>) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={onRestore}
      className="grid grid-cols-1 grid-rows-1 justify-items-center"
    >
      <span
        className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
        style={isPending ? { visibility: "hidden" } : undefined}
      >
        <UndoIcon className="size-3.5" />
        Restore
      </span>
      {isPending && (
        <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5">
          <Loader2Icon className="size-3.5 animate-spin" />
        </span>
      )}
    </Button>
  );
}

function IgnoreButton({
  isPending,
  onIgnore,
}: Readonly<{ isPending: boolean; onIgnore: () => void }>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={onIgnore}
      className="text-muted-foreground"
    >
      <EyeOffIcon className="size-3.5" />
      Ignore
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FindingCard({
  finding,
  isPending,
  onPublish,
  onIgnore,
  onRestore,
}: FindingCardProps) {
  const isIgnored = finding.status === FINDING_STATUS.Ignored;
  const isPublished = finding.status === FINDING_STATUS.Published;

  // Sync collapsible open state when status changes (e.g. optimistic ignore/restore).
  // React-recommended pattern: update state during render instead of useEffect.
  const [contentOpen, setContentOpen] = useState(!isIgnored);
  const [prevIsIgnored, setPrevIsIgnored] = useState(isIgnored);

  if (prevIsIgnored !== isIgnored) {
    setPrevIsIgnored(isIgnored);
    setContentOpen(!isIgnored);
  }

  return (
    <Collapsible.Root open={contentOpen} onOpenChange={setContentOpen}>
      <Card className="overflow-hidden">
        {/* ── Header (always visible) ──────────────────────────── */}
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={SEVERITY_BADGE_STYLES[finding.severity]}>
              {finding.severity}
            </Badge>

            <Badge variant="secondary">{finding.category}</Badge>

            {finding.sourceName && (
              <Badge variant="outline" className="text-muted-foreground font-mono text-[10px]">
                {finding.sourceName}
              </Badge>
            )}

            {isPublished && (
              <Badge
                variant="outline"
                className="border-emerald-600/20 bg-emerald-600/8 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/8 dark:text-emerald-400"
              >
                <CheckCircle2Icon className="size-3" />
                Published
              </Badge>
            )}

            {isIgnored && (
              <Badge variant="outline" className="text-muted-foreground">
                <EyeOffIcon className="size-3" />
                Ignored
              </Badge>
            )}
          </div>

          {finding.filePath ? (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <FileIcon className="size-3 shrink-0" />

              <span className="break-all">
                {finding.filePath}
                {finding.lineStart ? (
                  <span className="text-muted-foreground/70">
                    :{finding.lineStart}
                    {finding.lineEnd && finding.lineEnd !== finding.lineStart
                      ? `\u2013${finding.lineEnd}`
                      : ""}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">{finding.title}</CardTitle>

            {/* ── Ignored: collapsed actions ──────────────────── */}
            {isIgnored && !contentOpen && (
              <div className="flex shrink-0 items-center gap-2">
                <Collapsible.Trigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                    Show details
                  </Button>
                </Collapsible.Trigger>

                <RestoreButton isPending={isPending} onRestore={onRestore} />
              </div>
            )}

            {/* ── Ignored: expanded actions ───────────────────── */}
            {isIgnored && contentOpen && (
              <div className="flex shrink-0 items-center gap-2">
                <Collapsible.Trigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                    Hide details
                  </Button>
                </Collapsible.Trigger>
              </div>
            )}
          </div>
        </CardHeader>

        {/* ── Collapsible content ─────────────────────────────── */}
        <Collapsible.Content className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div>
            <CardContent className="flex flex-col gap-3">
              <Markdown content={finding.message} className="text-sm" />

              {finding.recommendation ? (
                <div className="border-muted-foreground/25 border-l-2 pl-3">
                  <p className="mb-2 text-sm font-semibold">Recommendation</p>
                  <Markdown content={finding.recommendation} className="text-sm" />
                </div>
              ) : null}

              {/* ── Action buttons ────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!isPublished && !isIgnored && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={onPublish}
                      className="grid grid-cols-1 grid-rows-1 justify-items-center"
                    >
                      <span
                        className="col-start-1 row-start-1 inline-flex items-center gap-1.5"
                        style={isPending ? { visibility: "hidden" } : undefined}
                      >
                        <SendIcon className="size-3.5" />
                        Publish
                      </span>
                      {isPending && (
                        <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5">
                          <Loader2Icon className="size-3.5 animate-spin" />
                        </span>
                      )}
                    </Button>

                    <IgnoreButton isPending={isPending} onIgnore={onIgnore} />
                  </>
                )}

                {isPublished && <RestoreButton isPending={isPending} onRestore={onRestore} />}

                {isIgnored && <RestoreButton isPending={isPending} onRestore={onRestore} />}
              </div>
            </CardContent>
          </div>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  );
}
