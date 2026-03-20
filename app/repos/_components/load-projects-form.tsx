"use client";

import { FolderSyncIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { useOrgLoading } from "./org-loading-context";

type LoadProjectsFormProps = Readonly<{
  defaultOrg: string;
}>;

export function LoadProjectsForm({ defaultOrg }: LoadProjectsFormProps) {
  const { isPending, submitOrgForm } = useOrgLoading();

  return (
    <form action={submitOrgForm} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="org-input">Organization</Label>
        <Input
          id="org-input"
          name={REPOS_FORM_FIELD.Org}
          defaultValue={defaultOrg}
          placeholder="my-org"
          required
          disabled={isPending}
        />
      </div>

      <LoadingButton type="submit" loading={isPending} loadingText="Loading…">
        <FolderSyncIcon className="size-4" />
        Load projects
      </LoadingButton>
    </form>
  );
}
