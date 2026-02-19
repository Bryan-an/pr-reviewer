"use server";

import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { repoBasePath, repoEditRuleErrorUrl } from "@/app/repos/_lib/routes";
import { getRepoRuleById, updateRepoRule } from "@/server/db/repo-rules";

type UpdateRuleContext = {
  repositoryId: string;
  ruleId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function updateRuleAction(context: UpdateRuleContext, formData: FormData) {
  const { repositoryId, ruleId, org, project, adoRepoId } = context;
  const title = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Title);
  const markdown = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Markdown);
  const enabled = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Enabled) === "1";
  const sortOrderRaw = getTrimmedStringFormField(formData, RULE_FORM_FIELD.SortOrder);
  const sortOrder = Number(sortOrderRaw);

  if (!title) {
    redirect(repoEditRuleErrorUrl(org, project, adoRepoId, ruleId, "title"));
  }

  if (!markdown) {
    redirect(repoEditRuleErrorUrl(org, project, adoRepoId, ruleId, "markdown"));
  }

  if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0) {
    redirect(repoEditRuleErrorUrl(org, project, adoRepoId, ruleId, "sortOrder"));
  }

  const current = await getRepoRuleById({ id: ruleId });

  if (!current || current.repositoryId !== repositoryId) {
    throw new Error("Rule does not belong to this repository.");
  }

  await updateRepoRule({
    id: ruleId,
    title,
    markdown,
    enabled,
    sortOrder: Number.isFinite(sortOrder) && Number.isInteger(sortOrder) ? sortOrder : 0,
  });

  redirect(repoBasePath(org, project, adoRepoId));
}
