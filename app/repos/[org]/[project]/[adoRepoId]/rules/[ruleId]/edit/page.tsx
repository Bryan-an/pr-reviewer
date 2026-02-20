import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RULE_SEARCH_PARAM } from "@/app/repos/_lib/search-params";
import { repoBasePath } from "@/app/repos/_lib/routes";
import { getFirst } from "@/lib/utils/search-params";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { getAzureDevOpsRepository } from "@/server/azure-devops/repositories";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import { getRepoRuleById } from "@/server/db/repo-rules";
import { MarkdownRuleEditor } from "@/app/repos/_components/markdown-rule-editor";
import { updateRuleAction } from "@/app/repos/[org]/[project]/[adoRepoId]/rules/[ruleId]/edit/_actions/update-rule-action";

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

  const boundUpdateAction = updateRuleAction.bind(null, {
    repositoryId: storedRepo.id,
    ruleId,
    org,
    project,
    adoRepoId: repo.id,
  });

  const cancelHref = repoBasePath(org, project, repo.id);

  return (
    <>
      <PageHeader
        title="Edit rule"
        showScrollToTop
        actions={
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={cancelHref}>
            Back
          </Link>
        }
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
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
            <form action={boundUpdateAction}>
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
      </div>
    </>
  );
}
