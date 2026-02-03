import Link from "next/link";
import { redirect } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { FindingSchema } from "@/lib/validation/finding";
import { reviewRequestSchema } from "@/lib/validation/review-request";
import { publishFindings } from "@/server/review/publish/publish-review";
import { getCachedReviewRun, runAndPersistReview } from "@/server/review/get-or-run-review";

type ReviewPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function getFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function publishAction(formData: FormData) {
  "use server";
  const value = formData.get("prUrl");
  const prUrl = typeof value === "string" ? value.trim() : "";
  const runIdValue = formData.get("runId");
  const runId = typeof runIdValue === "string" ? runIdValue.trim() : "";

  if (!prUrl) {
    redirect("/review/published?publishError=1");
  }

  const encodedPrUrl = encodeURIComponent(prUrl);
  const engineNameValue = formData.get("engineName");

  const engineName = typeof engineNameValue === "string" ? engineNameValue.trim() : "";
  const encodedEngineName = encodeURIComponent(engineName);

  if (!runId) {
    redirect(`/review/published?prUrl=${encodedPrUrl}&publishError=1`);
  }

  // We now publish from cached run findings (avoid rerunning review and avoid large payloads).
  const cached = await getCachedReviewRun({ prUrl, runId });

  if (!cached) {
    redirect(`/review/published?prUrl=${encodedPrUrl}&publishError=1`);
  }

  const findingsResult = FindingSchema.array().safeParse(cached.result.findings);
  if (!findingsResult.success) redirect(`/review/published?prUrl=${encodedPrUrl}&publishError=1`);

  let result: Awaited<ReturnType<typeof publishFindings>>;

  try {
    result = await publishFindings({ prUrl, engineName, findings: findingsResult.data });
  } catch {
    redirect(`/review/published?prUrl=${encodedPrUrl}&publishError=1`);
  }

  redirect(
    `/review/published?prUrl=${encodedPrUrl}&engineName=${encodedEngineName}&published=1&publishedThreads=${result.publishedThreads}&skippedThreads=${result.skippedThreads}&totalThreads=${result.totalThreads}`,
  );
}

async function rerunAction(formData: FormData) {
  "use server";
  const value = formData.get("prUrl");
  const prUrl = typeof value === "string" ? value.trim() : "";
  if (!prUrl) redirect("/review");

  const parsed = reviewRequestSchema.safeParse({ prUrl });
  if (!parsed.success) redirect("/review");

  const { runId } = await runAndPersistReview(parsed.data);
  redirect(`/review?prUrl=${encodeURIComponent(prUrl)}&runId=${encodeURIComponent(runId)}`);
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const prUrl = getFirst(params.prUrl);
  const runId = getFirst(params.runId);
  const published = getFirst(params.published) === "1";
  const publishError = getFirst(params.publishError) === "1";
  const publishedThreads = Number(getFirst(params.publishedThreads) ?? "0");
  const skippedThreads = Number(getFirst(params.skippedThreads) ?? "0");
  const totalThreads = Number(getFirst(params.totalThreads) ?? "0");
  const publishedThreadsLabel = `thread${publishedThreads === 1 ? "" : "s"}`;
  const skippedThreadsLabel = `thread${skippedThreads === 1 ? "" : "s"}`;

  const skippedMessage =
    skippedThreads > 0
      ? ` (skipped ${skippedThreads} already-posted ${skippedThreadsLabel}).`
      : ".";

  if (!prUrl) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">Missing PR URL.</p>

        <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
          Go back
        </Link>
      </div>
    );
  }

  const parsed = reviewRequestSchema.safeParse({ prUrl });

  if (!parsed.success) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">Invalid input.</p>

        <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
          Go back
        </Link>
      </div>
    );
  }

  const cached = await getCachedReviewRun({ prUrl, runId });

  const { result, effectiveRunId } = cached
    ? { result: cached.result, effectiveRunId: cached.runId }
    : await runAndPersistReview(parsed.data)
        .then((r) => ({ result: r.result, effectiveRunId: r.runId }))
        .catch(() => ({ result: null, effectiveRunId: undefined }));

  if (!result) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Review failed. Ensure the PR URL is correct,{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">AZURE_DEVOPS_PAT</code>{" "}
          is set on the server, and CodeRabbit CLI is installed + authenticated.
        </p>

        <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        {published ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            Published {publishedThreads} {publishedThreadsLabel}
            {skippedMessage} Total threads considered: {totalThreads}.
          </div>
        ) : null}

        {publishError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            Publish failed. Confirm your Azure DevOps permissions and that the PR is accessible.
          </div>
        ) : null}

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">{result.pr.repoName}</span>{" "}
          · PR{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">#{result.pr.prId}</span>
        </p>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">{result.pr.title}</p>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Engine: <span className="font-medium">{result.engine.name}</span> · Findings:{" "}
          <span className="font-medium">{result.summary.totalFindings}</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <form action={publishAction} className="flex items-center gap-3">
            <input type="hidden" name="prUrl" value={prUrl} />
            {effectiveRunId ? <input type="hidden" name="runId" value={effectiveRunId} /> : null}

            <input type="hidden" name="engineName" value={result.engine.name} />

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Publish to Azure DevOps
            </button>
          </form>

          <form action={rerunAction}>
            <input type="hidden" name="prUrl" value={prUrl} />

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Re-run review
            </button>
          </form>
        </div>

        <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
          New review
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Summary</h2>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Errors</div>

            <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {result.summary.bySeverity.error}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Warnings</div>

            <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {result.summary.bySeverity.warn}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Info</div>

            <div className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              {result.summary.bySeverity.info}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Findings</h2>

          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Publishing is file-scoped only (no line anchoring in v1).
          </span>
        </div>

        {result.findings.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            No findings from the stub engine.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.findings.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {f.severity}
                    </span>

                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      {f.category}
                    </span>

                    {f.filePath ? (
                      <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {f.filePath}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {f.title}
                  </div>

                  <Markdown
                    className="text-sm text-zinc-600 dark:text-zinc-300"
                    content={f.message}
                  />

                  {f.recommendation ? (
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        Recommendation:
                      </span>{" "}
                      <div className="mt-1">
                        <Markdown content={f.recommendation} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
