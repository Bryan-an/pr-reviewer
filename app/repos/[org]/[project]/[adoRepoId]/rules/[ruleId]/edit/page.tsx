import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { RULE_SEARCH_PARAM } from "@/app/repos/_lib/search-params";
import { repoBasePath, repoEditRuleErrorUrl } from "@/app/repos/_lib/routes";
import { getFirst } from "@/lib/utils/search-params";
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
      redirect(repoEditRuleErrorUrl(org, project, repo.id, ruleId, "title"));
    }

    if (!markdown) {
      redirect(repoEditRuleErrorUrl(org, project, repo.id, ruleId, "markdown"));
    }

    if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0) {
      redirect(repoEditRuleErrorUrl(org, project, repo.id, ruleId, "sortOrder"));
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
        <h1 className="text-2xl font-semibold tracking-tight">Edit rule</h1>

        <p className="text-muted-foreground text-sm">
          {repo.name} · {org} · {project}
        </p>
      </div>

      {errorBannerMessage ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{errorBannerMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent>
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
        </CardContent>
      </Card>

      <div className="text-xs">
        <Link className={buttonVariants({ variant: "link", size: "xs" })} href={cancelHref}>
          Back
        </Link>
      </div>
    </div>
  );
}
