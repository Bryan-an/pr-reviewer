import Link from "next/link";
import { redirect } from "next/navigation";

import { Markdown } from "@/components/markdown";
import { getTrimmedStringFormField } from "@/lib/form-data";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { getAzureDevOpsRepository } from "@/server/azure-devops/repositories";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import {
  deleteRepoRule,
  getRepoRuleById,
  listRepoRules,
  toggleRepoRuleEnabled,
} from "@/server/db/repo-rules";
import { ConfirmSubmitButton } from "@/app/repos/_components/confirm-submit-button";

type RepoRulesPageProps = Readonly<{
  params: Promise<{ org: string; project: string; adoRepoId: string }>;
}>;

export default async function RepoRulesPage({ params }: RepoRulesPageProps) {
  const p = await params;
  const org = safeDecodeURIComponent(p.org);
  const project = safeDecodeURIComponent(p.project);
  const adoRepoId = safeDecodeURIComponent(p.adoRepoId);

  const repo = await getAzureDevOpsRepository({ org, project, repoIdOrName: adoRepoId });

  const storedRepo = await upsertRepositoryFromAdoRepo({
    org,
    project,
    adoRepoId: repo.id,
    name: repo.name,
    remoteUrl: repo.remoteUrl,
  });

  async function toggleAction(formData: FormData) {
    "use server";
    const id = getTrimmedStringFormField(formData, "id");
    const enabled = getTrimmedStringFormField(formData, "enabled") === "1";

    if (!id)
      redirect(
        `/repos/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(adoRepoId)}`,
      );

    const existing = await getRepoRuleById({ id });

    if (!existing || existing.repositoryId !== storedRepo.id) {
      throw new Error("Rule does not belong to this repository.");
    }

    await toggleRepoRuleEnabled({ id, enabled });
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const id = getTrimmedStringFormField(formData, "id");

    if (!id)
      redirect(
        `/repos/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(adoRepoId)}`,
      );

    const existing = await getRepoRuleById({ id });

    if (!existing || existing.repositoryId !== storedRepo.id) {
      throw new Error("Rule does not belong to this repository.");
    }

    await deleteRepoRule({ id });
  }

  const rules = await listRepoRules({ repositoryId: storedRepo.id });

  const backHref = `/repos?org=${encodeURIComponent(org)}&project=${encodeURIComponent(project)}`;
  const newRuleHref = `/repos/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(repo.id)}/rules/new`;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {repo.name}
            </h1>

            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {org} · {project} · <span className="font-mono text-xs">{repo.id}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              href={newRuleHref}
            >
              New rule
            </Link>

            <Link
              className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
              href={backHref}
            >
              Back
            </Link>
          </div>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">{repo.remoteUrl}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Rules</h2>

          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Enabled rules are applied during PR reviews for this repo.
          </span>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            No rules yet. Create one to tailor reviews for this repository.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {rules.map((r) => {
              const editHref = `/repos/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(
                repo.id,
              )}/rules/${encodeURIComponent(r.id)}/edit`;

              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            {r.title}
                          </div>

                          {r.enabled ? (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                              enabled
                            </span>
                          ) : (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                              disabled
                            </span>
                          )}

                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            order {r.sortOrder}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Updated {new Date(r.updatedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <form action={toggleAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="enabled" value={r.enabled ? "0" : "1"} />

                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
                          >
                            {r.enabled ? "Disable" : "Enable"}
                          </button>
                        </form>

                        <Link
                          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
                          href={editHref}
                        >
                          Edit
                        </Link>

                        <form action={deleteAction}>
                          <input type="hidden" name="id" value={r.id} />

                          <ConfirmSubmitButton
                            confirmText="Delete this rule? This cannot be undone."
                            className="text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>

                    <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                      <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Preview
                      </summary>

                      <div className="mt-3">
                        {r.markdown.trim() ? (
                          <Markdown
                            className="text-sm text-zinc-700 dark:text-zinc-300"
                            content={r.markdown}
                          />
                        ) : (
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            Empty rule.
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
