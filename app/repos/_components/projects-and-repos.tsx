import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAzureDevOpsProjects } from "@/server/azure-devops/projects";
import { reposListUrl } from "@/app/repos/_lib/routes";

import {
  RepositoriesList,
  type RepositoriesListProps,
} from "@/app/repos/_components/repositories-list";
import { ProjectList, type ProjectListItem } from "@/app/repos/_components/project-list";
import { ProjectLoadingGuard } from "@/app/repos/_components/project-loading-guard";
import { ReposFilterLoadingProvider } from "@/app/repos/_components/repos-filter-loading-context";
import { ReposLoadingPlaceholder } from "@/app/repos/_components/repos-loading-placeholder";

export type ProjectsAndReposProps = RepositoriesListProps;

export async function ProjectsAndRepos(props: ProjectsAndReposProps) {
  let projects: Awaited<ReturnType<typeof listAzureDevOpsProjects>>["projects"] = [];
  let projectError: string | null = null;

  try {
    ({ projects } = await listAzureDevOpsProjects({ org: props.org, top: 200, skip: 0 }));
  } catch (err) {
    projectError = err instanceof Error ? err.message : "Failed to load projects.";
  }

  const items: ProjectListItem[] = projects
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.id,
      name: p.name,
      href: reposListUrl({ org: props.decodedOrg, project: p.name }),
    }));

  const projectSelected = props.project.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      <ProjectLoadingGuard>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {projectError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{projectError}</AlertDescription>
              </Alert>
            ) : null}

            {items.length > 0 ? (
              <ProjectList items={items} selectedProject={props.decodedProject} />
            ) : (
              !projectError && (
                <p className="text-muted-foreground text-sm">
                  No projects found in this organization.
                </p>
              )
            )}

            {projectSelected ? null : (
              <p className="text-muted-foreground text-sm">
                Select a project to list its repositories.
              </p>
            )}
          </CardContent>
        </Card>
      </ProjectLoadingGuard>

      {projectSelected ? (
        <ReposFilterLoadingProvider>
          <ProjectLoadingGuard>
            <RepositoriesList {...props} />
          </ProjectLoadingGuard>
        </ReposFilterLoadingProvider>
      ) : (
        <ReposLoadingPlaceholder />
      )}
    </div>
  );
}
