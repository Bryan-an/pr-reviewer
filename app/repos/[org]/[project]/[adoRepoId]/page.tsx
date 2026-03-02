import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Markdown } from "@/components/markdown";
import { REPOS_SECTION_ID } from "@/app/repos/_lib/dom-ids";
import { repoNewRulePath, reposListUrl } from "@/app/repos/_lib/routes";
import { RULE_SEARCH_PARAM } from "@/app/repos/_lib/search-params";
import { getFirst } from "@/lib/utils/search-params";
import { safeDecodeURIComponent } from "@/lib/utils/url";
import { getAzureDevOpsRepository } from "@/server/azure-devops/repositories";
import { upsertRepositoryFromAdoRepo } from "@/server/db/repositories";
import { listRepoRules } from "@/server/db/repo-rules";
import { RuleList } from "@/app/repos/[org]/[project]/[adoRepoId]/_components/rule-list";
import { toggleRuleAction } from "@/app/repos/[org]/[project]/[adoRepoId]/_actions/toggle-rule-action";
import { deleteRuleAction } from "@/app/repos/[org]/[project]/[adoRepoId]/_actions/delete-rule-action";

type RepoRulesPageProps = Readonly<{
  params: Promise<{ org: string; project: string; adoRepoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function RepoRulesPage({ params, searchParams }: RepoRulesPageProps) {
  const [p, sp] = await Promise.all([params, searchParams]);
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

  const ruleActionContext = {
    repositoryId: storedRepo.id,
    org,
    project,
    adoRepoId: repo.id,
  };

  const boundToggleAction = toggleRuleAction.bind(null, ruleActionContext);
  const boundDeleteAction = deleteRuleAction.bind(null, ruleActionContext);

  const rules = await listRepoRules({ repositoryId: storedRepo.id });

  const rawFrom = (getFirst(sp[RULE_SEARCH_PARAM.From]) ?? "").split("#")[0];
  const safeFrom = /^\/repos(\?|\/|$)/.test(rawFrom) && !rawFrom.includes("..") ? rawFrom : "";
  const backHref = `${safeFrom || reposListUrl({ org, project })}#${REPOS_SECTION_ID}`;
  const newRuleHref = repoNewRulePath(org, project, repo.id);

  const ruleContent = Object.fromEntries(
    rules.map((r) => [
      r.id,
      r.markdown.trim() ? (
        <Markdown content={r.markdown} />
      ) : (
        <div className="text-muted-foreground text-sm">Empty rule.</div>
      ),
    ]),
  );

  return (
    <>
      <PageHeader
        title={repo.name}
        showScrollToTop
        actions={
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={backHref}>
            Back
          </Link>
        }
      />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-17 pb-12">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">{repo.name}</h1>

              <p className="text-muted-foreground text-sm">
                {org} · {project} · <span className="font-mono text-xs">{repo.id}</span>
              </p>
            </div>

            <Link className={buttonVariants()} href={newRuleHref}>
              New rule
            </Link>
          </div>

          <p className="text-muted-foreground text-xs">{repo.remoteUrl}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Rules</h2>

            <span className="text-muted-foreground text-xs">
              Enabled rules are applied during PR reviews for this repo.
            </span>
          </div>

          {rules.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  No rules yet. Create one to tailor reviews for this repository.
                </p>
              </CardContent>
            </Card>
          ) : (
            <RuleList
              rules={rules}
              ruleContent={ruleContent}
              deleteAction={boundDeleteAction}
              toggleAction={boundToggleAction}
              org={org}
              project={project}
              adoRepoId={repo.id}
            />
          )}
        </div>
      </div>
    </>
  );
}
