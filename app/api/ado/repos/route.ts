import "server-only";

import { NextResponse } from "next/server";

import { listAzureDevOpsRepositories } from "@/server/azure-devops/repositories";
import { logger } from "@/server/logging/logger";

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

  try {
    const result = await listAzureDevOpsRepositories({ org, project });
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err, org, project }, "Unable to fetch Azure DevOps repositories");

    const statusCode =
      typeof err === "object" &&
      err !== null &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;

    const status = statusCode === 401 || statusCode === 403 ? 401 : 502;
    return NextResponse.json({ error: "Unable to fetch Azure DevOps repositories" }, { status });
  }
}
