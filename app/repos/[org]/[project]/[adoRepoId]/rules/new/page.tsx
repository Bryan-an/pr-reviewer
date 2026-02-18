import Link from "next/link";
import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { RULE_SEARCH_PARAM } from "@/app/repos/_lib/search-params";
import { repoBasePath, repoNewRuleErrorUrl, reposListUrl } from "@/app/repos/_lib/routes";
import { getFirst } from "@/lib/utils/search-params";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { getAzureDevOpsRepository } from "@/server/azure-devops/repositories";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import { createRepoRule } from "@/server/db/repo-rules";
import { logger } from "@/server/logging/logger";
import { MarkdownRuleEditor } from "@/app/repos/_components/markdown-rule-editor";

type NewRulePageProps = Readonly<{
  params: Promise<{ org: string; project: string; adoRepoId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function NewRulePage({ params, searchParams }: NewRulePageProps) {
  const p = await params;
  const org = safeDecodeURIComponent(p.org);
  const project = safeDecodeURIComponent(p.project);
  const adoRepoId = safeDecodeURIComponent(p.adoRepoId);

  const sp = (await searchParams) ?? {};
  const errorCode = getFirst(sp[RULE_SEARCH_PARAM.Error]);

  const errorBannerMessage = (() => {
    switch (errorCode) {
      case "title":
        return "Please provide a title for this rule.";
      case "markdown":
        return "Please provide markdown content for this rule.";
      case "sortOrder":
        return "Order must be a non-negative integer.";
      default:
        return undefined;
    }
  })();

  let repo: Awaited<ReturnType<typeof getAzureDevOpsRepository>>;
  let storedRepo: Awaited<ReturnType<typeof upsertRepositoryFromAdoRepo>>;

  try {
    repo = await getAzureDevOpsRepository({ org, project, repoIdOrName: adoRepoId });

    storedRepo = await upsertRepositoryFromAdoRepo({
      org,
      project,
      adoRepoId: repo.id,
      name: repo.name,
      remoteUrl: repo.remoteUrl,
    });
  } catch (err) {
    logger.error(
      { err, org, project, adoRepoId },
      "NewRulePage: getAzureDevOpsRepository/upsertRepositoryFromAdoRepo failed",
    );

    const backHref = reposListUrl({ org, project });

    return (
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            New rule
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {org} · {project} · <span className="font-mono text-xs">{adoRepoId}</span>
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Unable to load repository details. Please verify your Azure DevOps access and try again.
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          <Link className="underline" href={backHref}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  async function createAction(formData: FormData) {
    "use server";
    const title = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Title);
    const markdown = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Markdown);
    const enabled = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Enabled) === "1";
    const sortOrderRaw = getTrimmedStringFormField(formData, RULE_FORM_FIELD.SortOrder);
    const sortOrder = Number(sortOrderRaw);

    if (!title) {
      redirect(repoNewRuleErrorUrl(org, project, repo.id, "title"));
    }

    if (!markdown) {
      redirect(repoNewRuleErrorUrl(org, project, repo.id, "markdown"));
    }

    if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0) {
      redirect(repoNewRuleErrorUrl(org, project, repo.id, "sortOrder"));
    }

    await createRepoRule({
      repositoryId: storedRepo.id,
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
          New rule
        </h1>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {repo.name} · {org} · {project}
        </p>
      </div>

      {errorBannerMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {errorBannerMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <form action={createAction}>
          <MarkdownRuleEditor
            initial={{ title: "", markdown: "", enabled: true, sortOrder: 0 }}
            submitLabel="Create rule"
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
