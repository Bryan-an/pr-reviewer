import "server-only";

import { NextResponse } from "next/server";

import { listAzureDevOpsProjects } from "@/server/azure-devops/projects";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const org = url.searchParams.get("org")?.trim() ?? "";
  const topRaw = url.searchParams.get("top");
  const skipRaw = url.searchParams.get("skip");

  if (!org) {
    return NextResponse.json({ error: "Missing org." }, { status: 400 });
  }

  const top = typeof topRaw === "string" && topRaw.trim() !== "" ? Number(topRaw) : undefined;
  const skip = typeof skipRaw === "string" && skipRaw.trim() !== "" ? Number(skipRaw) : undefined;

  const result = await listAzureDevOpsProjects({
    org,
    ...(Number.isFinite(top) ? { top: Math.max(1, Math.min(200, top!)) } : {}),
    ...(Number.isFinite(skip) ? { skip: Math.max(0, skip!) } : {}),
  });

  return NextResponse.json(result);
}
