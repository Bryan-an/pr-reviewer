import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { repoBasePath, reposListUrl } from "@/app/repos/_lib/routes";
import { REPOS_SORT_FIELD, REPOS_SORT_ORDER } from "@/app/repos/_lib/sort";

import { listAzureDevOpsRepositories } from "@/server/azure-devops/repositories";
import { getRepositoryRuleCountsForAdoRepos } from "@/server/db/repositories";

import { ReposFilterForm } from "./repos-filter-form";
import { ReposFilterLoadingGuard } from "./repos-filter-loading-guard";

const PAGE_SIZE = 20;

export type RepositoriesListProps = Readonly<{
  org: string;
  decodedOrg: string;
  project: string;
  decodedProject: string;
  q: string;
  sort: string;
  order: string;
  hasRules: boolean;
  page: number;
}>;

export async function RepositoriesList(props: RepositoriesListProps) {
  let repositories: Awaited<ReturnType<typeof listAzureDevOpsRepositories>>["repositories"] = [];
  let error: string | null = null;

  try {
    ({ repositories } = await listAzureDevOpsRepositories({
      org: props.org,
      project: props.project,
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load repositories.";
  }

  const qLower = props.q.trim().toLowerCase();

  const filteredByName =
    qLower === ""
      ? repositories.slice()
      : repositories.filter((r) => r.name.toLowerCase().includes(qLower));

  const ruleCounts = await getRepositoryRuleCountsForAdoRepos({
    org: props.org,
    project: props.project,
    adoRepoIds: filteredByName.map((r) => r.id),
  });

  const filtered = props.hasRules
    ? filteredByName.filter((r) => (ruleCounts[r.id] ?? 0) > 0)
    : filteredByName;

  const sorted = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));

  if (props.sort === REPOS_SORT_FIELD.Name && props.order === REPOS_SORT_ORDER.Desc)
    sorted.reverse();

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(props.page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = sorted.slice(start, end);

  const baseFilterParams = {
    org: props.decodedOrg,
    project: props.decodedProject,
    q: props.q || undefined,
    sort: props.sort || undefined,
    order: props.order || undefined,
    hasRules: props.hasRules || undefined,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Repositories</h2>
          <div className="text-muted-foreground text-sm">{total} total</div>
        </div>

        <ReposFilterForm
          decodedOrg={props.decodedOrg}
          decodedProject={props.decodedProject}
          initialQ={props.q}
          initialOrder={props.order}
          initialHasRules={props.hasRules}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>Failed to load repositories. {error}</AlertDescription>
        </Alert>
      ) : null}

      <ReposFilterLoadingGuard>
        <div className="rounded-xl border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[55%]">Repository</TableHead>
                <TableHead className="w-[25%]">Rules</TableHead>
                <TableHead className="w-[20%] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-6 text-center">
                    No repositories.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((r) => {
                  const count = ruleCounts[r.id] ?? 0;
                  const href = repoBasePath(props.decodedOrg, props.decodedProject, r.id);

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{r.name}</div>
                        <div className="text-muted-foreground mt-1 max-w-xs truncate text-xs">
                          {r.remoteUrl}
                        </div>
                      </TableCell>

                      <TableCell>
                        {count > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                          >
                            {count} rule{count === 1 ? "" : "s"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No rules</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <Link
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                          href={href}
                        >
                          Manage
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground text-sm">
            Page {safePage + 1} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            {safePage > 0 ? (
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={reposListUrl({ ...baseFilterParams, page: Math.max(0, safePage - 1) })}
              >
                Prev
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Prev
              </Button>
            )}

            {safePage < totalPages - 1 ? (
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href={reposListUrl({
                  ...baseFilterParams,
                  page: Math.min(totalPages - 1, safePage + 1),
                })}
              >
                Next
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      </ReposFilterLoadingGuard>
    </div>
  );
}
