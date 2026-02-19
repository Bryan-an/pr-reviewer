"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";

type LoadProjectsFormFieldsProps = Readonly<{
  defaultOrg: string;
}>;

export function LoadProjectsFormFields({ defaultOrg }: LoadProjectsFormFieldsProps) {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="org-input">Organization</Label>
        <Input
          id="org-input"
          name={REPOS_FORM_FIELD.Org}
          defaultValue={defaultOrg}
          placeholder="my-org"
          required
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="grid grid-cols-1 grid-rows-1">
        <span
          className="col-start-1 row-start-1 inline-flex items-center gap-2"
          aria-hidden={pending}
          style={pending ? { visibility: "hidden" } : undefined}
        >
          Load projects
        </span>
        <span
          className="col-start-1 row-start-1 inline-flex items-center gap-2"
          aria-hidden={!pending}
          style={!pending ? { visibility: "hidden" } : undefined}
        >
          <Loader2Icon className="animate-spin" />
          Loading&hellip;
        </span>
      </Button>
    </>
  );
}
