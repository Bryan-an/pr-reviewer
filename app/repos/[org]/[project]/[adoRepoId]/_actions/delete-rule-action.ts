"use server";

import { revalidatePath } from "next/cache";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { RULE_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { repoBasePath } from "@/app/repos/_lib/routes";
import { deleteRepoRule, getRepoRuleById } from "@/server/db/repo-rules";

type DeleteRuleContext = {
  repositoryId: string;
  org: string;
  project: string;
  adoRepoId: string;
};

export async function deleteRuleAction(context: DeleteRuleContext, formData: FormData) {
  const { repositoryId, org, project, adoRepoId } = context;
  const id = getTrimmedStringFormField(formData, RULE_FORM_FIELD.Id);

  if (!id) throw new Error("Missing rule id.");

  const existing = await getRepoRuleById({ id });

  if (!existing || existing.repositoryId !== repositoryId) {
    throw new Error("Rule does not belong to this repository.");
  }

  await deleteRepoRule({ id });

  revalidatePath(repoBasePath(org, project, adoRepoId));
}
