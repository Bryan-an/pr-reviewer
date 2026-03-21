import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { repoBasePath, reposListUrl } from "@/app/repos/_lib/routes";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { getAzureDevOpsRepository } from "@/server/azure-devops/repositories";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import { logger } from "@/lib/logging/logger";
import { MarkdownRuleEditor } from "@/app/repos/_components/markdown-rule-editor";
import { createRuleAction } from "@/app/repos/[org]/[project]/[adoRepoId]/rules/new/_actions/create-rule-action";

type NewRulePageProps = Readonly<{
  params: Promise<{ org: string; project: string; adoRepoId: string }>;
}>;

export default async function NewRulePage({ params }: NewRulePageProps) {
  const p = await params;
  const org = safeDecodeURIComponent(p.org);
  const project = safeDecodeURIComponent(p.project);
  const adoRepoId = safeDecodeURIComponent(p.adoRepoId);

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
      <>
        <PageHeader
          title="New rule"
          showScrollToTop
          actions={
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={backHref}>
              Back
            </Link>
          }
        />

        <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">New rule</h1>

            <p className="text-muted-foreground text-sm">
              {org} · {project} · <span className="font-mono text-xs">{adoRepoId}</span>
            </p>
          </div>

          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              Unable to load repository details. Please verify your Azure DevOps access and try
              again.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  const boundCreateAction = createRuleAction.bind(null, {
    repositoryId: storedRepo.id,
    org,
    project,
    adoRepoId: repo.id,
  });

  const cancelHref = repoBasePath(org, project, repo.id);

  return (
    <>
      <PageHeader
        title="New rule"
        showScrollToTop
        actions={
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={cancelHref}>
            Back
          </Link>
        }
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">New rule</h1>

          <p className="text-muted-foreground text-sm">
            {repo.name} · {org} · {project}
          </p>
        </div>

        <Card>
          <CardContent>
            <MarkdownRuleEditor
              onSave={boundCreateAction}
              initial={{ title: "", markdown: "", enabled: true, sortOrder: 0 }}
              submitLabel="Create rule"
              pendingLabel="Creating…"
              cancelHref={cancelHref}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
