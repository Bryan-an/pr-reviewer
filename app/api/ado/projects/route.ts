import "server-only";

import { NextResponse } from "next/server";

import { ADO_API_SEARCH_PARAM } from "@/app/api/ado/_lib/search-params";
import { listAzureDevOpsProjects } from "@/server/azure-devops/projects";
import { logger } from "@/lib/logging/logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const org = url.searchParams.get(ADO_API_SEARCH_PARAM.Org)?.trim() ?? "";
  const topRaw = url.searchParams.get(ADO_API_SEARCH_PARAM.Top);
  const skipRaw = url.searchParams.get(ADO_API_SEARCH_PARAM.Skip);

  if (!org) {
    return NextResponse.json({ error: "Missing org." }, { status: 400 });
  }

  const top = typeof topRaw === "string" && topRaw.trim() !== "" ? Number(topRaw) : undefined;
  const skip = typeof skipRaw === "string" && skipRaw.trim() !== "" ? Number(skipRaw) : undefined;

  try {
    const result = await listAzureDevOpsProjects({
      org,
      ...(Number.isFinite(top) ? { top: Math.max(1, Math.min(200, top!)) } : {}),
      ...(Number.isFinite(skip) ? { skip: Math.max(0, skip!) } : {}),
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err, org, top, skip }, "Unable to fetch Azure DevOps projects");

    const statusCode =
      typeof err === "object" &&
      err !== null &&
      typeof (err as { statusCode?: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;

    const status = statusCode === 401 || statusCode === 403 ? 401 : 502;
    return NextResponse.json({ error: "Unable to fetch Azure DevOps projects" }, { status });
  }
}
