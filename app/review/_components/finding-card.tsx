"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  EyeOffIcon,
  FileIcon,
  SendIcon,
  UndoIcon,
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Markdown } from "@/components/markdown";
import { type FindingCategory, type Severity } from "@/lib/validation/finding";
import { FINDING_STATUS, type FindingStatus } from "@/lib/validation/finding-status";
import type { ReviewEngineName } from "@/lib/validation/review-engine-name";

// ---------------------------------------------------------------------------
// Severity → badge styling
// ---------------------------------------------------------------------------

const SEVERITY_BADGE_STYLES: Record<Severity, string> = {
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  warn: "border-amber-600/20 bg-amber-600/8 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/8 dark:text-amber-400",
  info: "border-border bg-secondary text-muted-foreground",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FindingWithStatus = Readonly<{
  id: string;
  findingKey: string;
  status: FindingStatus;
  severity: Severity;
  category: FindingCategory;
  title: string;
  message: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  recommendation?: string;
  sourceName?: ReviewEngineName;
  codeSnippet?: string;
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
    <LoadingButton variant="outline" size="sm" loading={isPending} onClick={onRestore}>
      <UndoIcon className="size-3.5" />
      Restore
    </LoadingButton>
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
// Code snippet with collapsible overflow
// ---------------------------------------------------------------------------

const SNIPPET_COLLAPSE_THRESHOLD = 10;
const SNIPPET_COLLAPSED_PX = 144; // ≈ 6 visible lines of text-xs code

function CodeSnippetBlock({ snippet }: Readonly<{ snippet: string }>) {
  const lineCount = snippet.split("\n").length;
  const isLong = lineCount > SNIPPET_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const snippetContentId = useId();
  const collapsed = isLong && !expanded;

  // Measure full content height after mount (scrollHeight includes overflow).
  // Re-measure if the snippet changes.
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [snippet]);

  // Before measurement completes, estimate from line count to avoid jarring first expand.
  const expandedHeight = contentHeight || lineCount * 20 + 32;

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="relative">
        <div
          id={snippetContentId}
          ref={contentRef}
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: collapsed ? SNIPPET_COLLAPSED_PX : expandedHeight }}
        >
          <Markdown
            content={"```diff\n" + snippet + "\n```"}
            className="text-xs [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:border-0"
          />
        </div>

        <div
          className={cn(
            "from-muted pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t to-transparent transition-opacity duration-300",
            collapsed ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {isLong && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={snippetContentId}
          onClick={() => setExpanded((prev) => !prev)}
          className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 border-t py-1.5 text-xs transition-colors"
        >
          <ChevronDownIcon
            className={cn("size-3.5 transition-transform duration-300", expanded && "rotate-180")}
          />
          {expanded ? "Show less" : `Show ${lineCount - 6} more lines`}
        </button>
      )}
    </div>
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
              {finding.codeSnippet && <CodeSnippetBlock snippet={finding.codeSnippet} />}

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
                    <LoadingButton
                      variant="outline"
                      size="sm"
                      loading={isPending}
                      onClick={onPublish}
                    >
                      <SendIcon className="size-3.5" />
                      Publish
                    </LoadingButton>

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
