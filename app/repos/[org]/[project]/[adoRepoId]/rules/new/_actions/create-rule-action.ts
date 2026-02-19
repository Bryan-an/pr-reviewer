"use server";

import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { repoBasePath, repoNewRuleErrorUrl } from "@/app/repos/_lib/routes";
import { createRepoRule } from "@/server/db/repo-rules";

type CreateRuleContext = {
  repositoryId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function createRuleAction(context: CreateRuleContext, formData: FormData) {
  const { repositoryId, org, project, adoRepoId } = context;
  const title = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Title);
  const markdown = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Markdown);
  const enabled = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Enabled) === "1";
  const sortOrderRaw = getTrimmedStringFormField(formData, RULE_FORM_FIELD.SortOrder);
  const sortOrder = Number(sortOrderRaw);

  if (!title) {
    redirect(repoNewRuleErrorUrl(org, project, adoRepoId, "title"));
  }

  if (!markdown) {
    redirect(repoNewRuleErrorUrl(org, project, adoRepoId, "markdown"));
  }

  if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0) {
    redirect(repoNewRuleErrorUrl(org, project, adoRepoId, "sortOrder"));
  }

  await createRepoRule({
    repositoryId,
    title,
    markdown,
    enabled,
    sortOrder: Number.isFinite(sortOrder) && Number.isInteger(sortOrder) ? sortOrder : 0,
  });

  redirect(repoBasePath(org, project, adoRepoId));
}
