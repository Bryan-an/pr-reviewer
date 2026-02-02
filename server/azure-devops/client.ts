import "server-only";

import * as azdev from "azure-devops-node-api";

import { getEnv } from "@/lib/config/env";

export function createAzureDevOpsClient(org: string): azdev.WebApi {
  const { AZURE_DEVOPS_PAT } = getEnv();

  const encodedOrg = encodeURIComponent(org.trim());
  const orgUrl = `https://dev.azure.com/${encodedOrg}`;
  const authHandler = azdev.getPersonalAccessTokenHandler(AZURE_DEVOPS_PAT);
  return new azdev.WebApi(orgUrl, authHandler);
}
