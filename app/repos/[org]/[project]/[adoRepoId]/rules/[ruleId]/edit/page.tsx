import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { RULE_SEARCH_PARAM } from "@/app/repos/_lib/search-params";
import { repoBasePath, repoEditRuleErrorUrl } from "@/app/repos/_lib/routes";
import { getFirst } from "@/lib/search-params";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { getAzureDevOpsRepository } from "@/server/azure-devops/repositories";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import { getRepoRuleById, updateRepoRule } from "@/server/db/repo-rules";
import { MarkdownRuleEditor } from "@/app/repos/_components/markdown-rule-editor";

type EditRulePageProps = Readonly<{
  params: Promise<{ org: string; project: string; adoRepoId: string; ruleId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function EditRulePage({ params, searchParams }: EditRulePageProps) {
  const p = await params;
  const org = safeDecodeURIComponent(p.org);
  const project = safeDecodeURIComponent(p.project);
  const adoRepoId = safeDecodeURIComponent(p.adoRepoId);
  const ruleId = safeDecodeURIComponent(p.ruleId);

  const sp = (await searchParams) ?? {};
  const showErrorBanner = getFirst(sp[RULE_SEARCH_PARAM.Error]) === "1";

  const repo = await getAzureDevOpsRepository({ org, project, repoIdOrName: adoRepoId });

  const storedRepo = await upsertRepositoryFromAdoRepo({
    org,
    project,
    adoRepoId: repo.id,
    name: repo.name,
    remoteUrl: repo.remoteUrl,
  });

  const existing = await getRepoRuleById({ id: ruleId });
  if (!existing || existing.repositoryId !== storedRepo.id) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    const title = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Title);
    const markdown = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Markdown);
    const enabled = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Enabled) === "1";
    const sortOrderRaw = getTrimmedStringFormField(formData, RULE_FORM_FIELD.SortOrder);
    const sortOrder = Number(sortOrderRaw);

    if (!title) {
      redirect(repoEditRuleErrorUrl(org, project, repo.id, ruleId));
    }

    const current = await getRepoRuleById({ id: ruleId });

    if (!current || current.repositoryId !== storedRepo.id) {
      throw new Error("Rule does not belong to this repository.");
    }

    await updateRepoRule({
      id: ruleId,
      title,
      markdown,
      enabled,
      sortOrder: Number.isFinite(sortOrder) && Number.isInteger(sortOrder) ? sortOrder : 0,
    });

    redirect(repoBasePath(org, project, repo.id));
  }

  const cancelHref = repoBasePath(org, project, repo.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Edit rule
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {repo.name} · {org} · {project}
        </p>
      </div>

      {showErrorBanner ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Please provide a title for this rule.
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <form action={updateAction}>
          <MarkdownRuleEditor
            initial={{
              title: existing.title,
              markdown: existing.markdown,
              enabled: existing.enabled,
              sortOrder: existing.sortOrder,
            }}
            submitLabel="Save changes"
            cancelHref={cancelHref}
          />
        </form>
      </div>

      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        <Link className="underline" href={cancelHref}>
          Back
        </Link>
      </div>
    </div>
  );
}
