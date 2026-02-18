import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import {
  repoBasePath,
  repoEditRulePath,
  repoNewRulePath,
  reposListUrl,
} from "@/app/repos/_lib/routes";
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
    const id = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Id);
    const enabled = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Enabled) === "1";

    if (!id) redirect(repoBasePath(org, project, adoRepoId));

    const existing = await getRepoRuleById({ id });

    if (!existing || existing.repositoryId !== storedRepo.id) {
      throw new Error("Rule does not belong to this repository.");
    }

    await toggleRepoRuleEnabled({ id, enabled });
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const id = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Id);

    if (!id) redirect(repoBasePath(org, project, adoRepoId));

    const existing = await getRepoRuleById({ id });

    if (!existing || existing.repositoryId !== storedRepo.id) {
      throw new Error("Rule does not belong to this repository.");
    }

    await deleteRepoRule({ id });
  }

  const rules = await listRepoRules({ repositoryId: storedRepo.id });

  const backHref = reposListUrl({ org, project });
  const newRuleHref = repoNewRulePath(org, project, repo.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{repo.name}</h1>

            <p className="text-muted-foreground text-sm">
              {org} · {project} · <span className="font-mono text-xs">{repo.id}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href={newRuleHref}>New rule</Link>
            </Button>

            <Link className={buttonVariants({ variant: "link" })} href={backHref}>
              Back
            </Link>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">{repo.remoteUrl}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Rules</h2>

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
          <ul className="flex flex-col gap-3">
            {rules.map((r) => {
              const editHref = repoEditRulePath(org, project, repo.id, r.id);

              return (
                <li key={r.id}>
                  <Card>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold">{r.title}</div>

                              {r.enabled ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                                >
                                  enabled
                                </Badge>
                              ) : (
                                <Badge variant="outline">disabled</Badge>
                              )}

                              <span className="text-muted-foreground text-xs">
                                order {r.sortOrder}
                              </span>
                            </div>

                            <div className="text-muted-foreground text-xs">
                              Updated {new Date(r.updatedAt).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <form action={toggleAction}>
                              <input type="hidden" name={RULE_FORM_FIELD.Id} value={r.id} />
                              <input
                                type="hidden"
                                name={RULE_FORM_FIELD.Enabled}
                                value={r.enabled ? "0" : "1"}
                              />

                              <Button type="submit" variant="outline" size="sm">
                                {r.enabled ? "Disable" : "Enable"}
                              </Button>
                            </form>

                            <Link
                              className={buttonVariants({ variant: "link", size: "sm" })}
                              href={editHref}
                            >
                              Edit
                            </Link>

                            <form action={deleteAction}>
                              <input type="hidden" name={RULE_FORM_FIELD.Id} value={r.id} />

                              <ConfirmSubmitButton
                                variant="link"
                                size="sm"
                                confirmText="Delete this rule? This cannot be undone."
                                className="text-destructive hover:text-destructive/80"
                              >
                                Delete
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </div>

                        <details className="bg-muted/50 rounded-lg border p-4">
                          <summary className="cursor-pointer text-sm font-medium">Preview</summary>

                          <div className="mt-3">
                            {r.markdown.trim() ? (
                              <Markdown
                                className="text-muted-foreground text-sm"
                                content={r.markdown}
                              />
                            ) : (
                              <div className="text-muted-foreground text-sm">Empty rule.</div>
                            )}
                          </div>
                        </details>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
