"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getTrimmedStringFormField } from "@/lib/utils/form-data";
import { REPOS_FORM_FIELD } from "@/app/repos/_lib/form-fields";
import { reposListUrl } from "@/app/repos/_lib/routes";
import { ORG_COOKIE } from "@/app/repos/_lib/cookies";

export async function setOrgAction(formData: FormData) {
  const org = getTrimmedStringFormField(formData, REPOS_FORM_FIELD.Org);
  if (!org) redirect("/repos");

  const jar = await cookies();

  jar.set(ORG_COOKIE, org, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  redirect(reposListUrl({ org }));
}
