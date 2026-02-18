import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { listAzureDevOpsProjects } from "@/server/azure-devops/projects";

import {
  RepositoriesList,
  type RepositoriesListProps,
} from "@/app/repos/_components/repositories-list";

export type ProjectsAndReposProps = RepositoriesListProps;

export async function ProjectsAndRepos(props: ProjectsAndReposProps) {
  let projects: Awaited<ReturnType<typeof listAzureDevOpsProjects>>["projects"] = [];
  let projectError: string | null = null;

  try {
    ({ projects } = await listAzureDevOpsProjects({ org: props.org, top: 200, skip: 0 }));
  } catch (err) {
    projectError = err instanceof Error ? err.message : "Failed to load projects.";
  }

  const projectSelected = props.project.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Project</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {projectError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>Failed to load projects. {projectError}</AlertDescription>
            </Alert>
          ) : null}

          <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name={REPOS_FORM_FIELD.Org} value={props.decodedOrg} />

            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="project-select">Project</Label>

              <Select
                name={REPOS_FORM_FIELD.Project}
                defaultValue={props.decodedProject || undefined}
                required
              >
                <SelectTrigger id="project-select" className="w-full">
                  <SelectValue placeholder="Select a project…" />
                </SelectTrigger>

                <SelectContent>
                  {projects
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" variant="outline">
              Browse repos
            </Button>
          </form>

          {projectSelected ? null : (
            <p className="text-muted-foreground text-sm">
              Select a project to list its repositories.
            </p>
          )}
        </CardContent>
      </Card>

      {projectSelected ? <RepositoriesList {...props} /> : null}
    </div>
  );
}
