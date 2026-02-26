"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { repoBasePath } from "@/app/repos/_lib/routes";
import { getRepoRuleById, toggleRepoRuleEnabled } from "@/server/db/repo-rules";

type ToggleRuleContext = {
  repositoryId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function toggleRuleAction(context: ToggleRuleContext, formData: FormData) {
  const { repositoryId, org, project, adoRepoId } = context;
  const id = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Id);
  const enabled = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Enabled) === "1";

  if (!id) redirect(repoBasePath(org, project, adoRepoId));

  const existing = await getRepoRuleById({ id });

  if (!existing || existing.repositoryId !== repositoryId) {
    throw new Error("Rule does not belong to this repository.");
  }

  await toggleRepoRuleEnabled({ id, enabled });

  revalidatePath(repoBasePath(org, project, adoRepoId));
}
