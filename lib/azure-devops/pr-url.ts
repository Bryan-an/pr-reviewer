import { z } from "zod";

export const azureDevOpsPrUrlPartsSchema = z.object({
  org: z.string().min(1),
  project: z.string().min(1),
  repo: z.string().min(1),
  prId: z.number().int().positive(),
});

export type AzureDevOpsPrUrlParts = z.infer<typeof azureDevOpsPrUrlPartsSchema>;

const httpsUrlSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "URL must be a valid https URL." },
);

/**
 * Parse an Azure DevOps PR URL like:
 * https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{prId}
 */
export function parseAzureDevOpsPrUrl(input: string): AzureDevOpsPrUrlParts {
  const urlString = httpsUrlSchema.parse(input.trim());
  const url = new URL(urlString);

  const hostOk = url.hostname.toLowerCase() === "dev.azure.com";

  if (!hostOk) {
    throw new Error("Invalid Azure DevOps PR URL host.");
  }

  // Expected pathname: /{org}/{project}/_git/{repo}/pullrequest/{prId}
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length < 6) {
    throw new Error("Invalid Azure DevOps PR URL path.");
  }

  const [org, project, gitLiteral, repo, pullRequestLiteral, prIdRaw] = segments.slice(0, 6);

  if (gitLiteral !== "_git") {
    throw new Error("Invalid Azure DevOps PR URL: missing _git segment.");
  }

  if (pullRequestLiteral !== "pullrequest") {
    throw new Error("Invalid Azure DevOps PR URL: missing pullrequest segment.");
  }

  const prId = Number(prIdRaw);
  return azureDevOpsPrUrlPartsSchema.parse({ org, project, repo, prId });
}
