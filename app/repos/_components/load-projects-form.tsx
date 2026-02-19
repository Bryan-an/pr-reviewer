"use client";

import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

      <Button
        type="submit"
        disabled={isPending}
        className="grid grid-cols-1 grid-rows-1 justify-items-center"
      >
        <span
          className="col-start-1 row-start-1 inline-flex items-center gap-2"
          aria-hidden={isPending}
          style={isPending ? { visibility: "hidden" } : undefined}
        >
          Load projects
        </span>
        <span
          className="col-start-1 row-start-1 inline-flex items-center gap-2"
          aria-hidden={!isPending}
          style={isPending ? undefined : { visibility: "hidden" }}
        >
          <Loader2Icon className="animate-spin" />
          Loading&hellip;
        </span>
      </Button>
    </form>
  );
}
