import Link from "next/link";

import { reviewRequestSchema } from "@/lib/validation/review-request";
import { runReview } from "@/server/review/run-review";

type ReviewPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function getFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const prUrl = getFirst(params.prUrl);

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

  const result = await runReview(parsed.data).catch(() => null);

  if (!result) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Review preview
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Review failed. Ensure the PR URL is correct and{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">AZURE_DEVOPS_PAT</code>{" "}
          is set on the server.
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

          <Link className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50" href="/">
            New review
          </Link>
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

                  <div className="text-sm text-zinc-600 dark:text-zinc-300">{f.message}</div>

                  {f.recommendation ? (
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        Recommendation:
                      </span>{" "}
                      {f.recommendation}
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
