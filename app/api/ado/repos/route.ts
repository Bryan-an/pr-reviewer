import "server-only";

import { NextResponse } from "next/server";

import { listAzureDevOpsRepositories } from "@/server/azure-devops/repositories";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const org = url.searchParams.get("org")?.trim() ?? "";
  const project = url.searchParams.get("project")?.trim() ?? "";

  if (!org) {
    return NextResponse.json({ error: "Missing org." }, { status: 400 });
  }

  if (!project) {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  const result = await listAzureDevOpsRepositories({ org, project });
  return NextResponse.json(result);
}
