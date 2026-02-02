import { redirect } from "next/navigation";

async function goToReview(formData: FormData) {
  "use server";
  const value = formData.get("prUrl");
  const prUrl = typeof value === "string" ? value.trim() : "";
  redirect(`/review?prUrl=${encodeURIComponent(prUrl)}`);
}

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Azure DevOps PR Reviewer
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Paste an Azure DevOps pull request URL to generate a local-diff-backed review preview
          using the CodeRabbit CLI.
        </p>

        <form action={goToReview} className="mt-8 flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="prUrl">
            Pull request URL
          </label>

          <input
            id="prUrl"
            name="prUrl"
            placeholder="https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}"
            className="h-11 rounded-lg border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            required
          />

          <button
            type="submit"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Generate preview
          </button>
        </form>

        <p className="mt-6 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Server requires{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">AZURE_DEVOPS_PAT</code>{" "}
          in the environment. Secrets never reach the browser. CodeRabbit CLI must be installed and
          authenticated on the server.
        </p>
      </main>
    </div>
  );
}
