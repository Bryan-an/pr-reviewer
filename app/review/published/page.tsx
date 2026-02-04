import Link from "next/link";

import { getFirst, parseNonNegativeIntParam } from "@/lib/search-params";

type PublishedPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ReviewPublishedPage({ searchParams }: PublishedPageProps) {
  const params = await searchParams;
  const prUrl = getFirst(params.prUrl);
  const publishError = getFirst(params.publishError) === "1";
  const publishedThreads = parseNonNegativeIntParam(getFirst(params.publishedThreads), 0);
  const skippedThreads = parseNonNegativeIntParam(getFirst(params.skippedThreads), 0);
  const totalThreads = parseNonNegativeIntParam(getFirst(params.totalThreads), 0);

  const publishedThreadsLabel = `thread${publishedThreads === 1 ? "" : "s"}`;
  const skippedThreadsLabel = `thread${skippedThreads === 1 ? "" : "s"}`;

  const skippedMessage =
    skippedThreads > 0
      ? ` (skipped ${skippedThreads} already-posted ${skippedThreadsLabel}).`
      : ".";

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Publish result
      </h1>

      {publishError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Publish failed. Please generate a preview again and retry.
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          Published {publishedThreads} {publishedThreadsLabel}
          {skippedMessage} Total threads considered: {totalThreads}.
        </div>
      )}

      {prUrl ? (
        <Link
          className="w-fit self-start text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
          href={`/review?prUrl=${encodeURIComponent(prUrl)}`}
        >
          Back to preview
        </Link>
      ) : (
        <Link
          className="w-fit self-start text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
          href="/"
        >
          New review
        </Link>
      )}
    </div>
  );
}
