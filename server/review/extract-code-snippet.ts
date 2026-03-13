import "server-only";

import type { File as ParsedDiffFile, Change } from "parse-diff";

const CONTEXT_PADDING = 3;
const MAX_SNIPPET_LINES = 100;

/**
 * Returns the new-file line number for a change, or `undefined` for deletions
 * (which have no position in the new file).
 */
function newFileLine(change: Change): number | undefined {
  if (change.type === "add") return change.ln;
  if (change.type === "normal") return change.ln2;
  return undefined;
}

/**
 * Extracts the relevant diff lines for a finding from the parsed diff.
 *
 * Matches `filePath` against `file.to`, then collects changes whose new-file
 * line number falls within `[lineStart - CONTEXT_PADDING, lineEnd + CONTEXT_PADDING]`.
 * Deletion lines between the first and last matched change are included so the
 * snippet shows the full hunk context.
 */
export function extractCodeSnippet(
  parsedDiff: ParsedDiffFile[],
  filePath: string,
  lineStart: number,
  lineEnd: number,
): string | undefined {
  const normalizedPath = filePath.replace(/^\//, "");

  const file = parsedDiff.find((f) => f.to === normalizedPath);

  if (!file) return undefined;

  const rangeStart = lineStart - CONTEXT_PADDING;
  const rangeEnd = lineEnd + CONTEXT_PADDING;

  const collected: string[] = [];

  for (const chunk of file.chunks) {
    // First pass: find indices of changes whose new-file line is in range.
    const inRange: boolean[] = chunk.changes.map((change) => {
      const ln = newFileLine(change);
      return ln !== undefined && ln >= rangeStart && ln <= rangeEnd;
    });

    const firstIdx = inRange.indexOf(true);
    if (firstIdx === -1) continue;
    const lastIdx = inRange.lastIndexOf(true);

    // Second pass: include everything between first and last matched change
    // (captures interleaved del lines that have no new-file line number).
    for (let i = firstIdx; i <= lastIdx; i++) {
      collected.push(chunk.changes[i].content);
    }
  }

  if (collected.length === 0) return undefined;

  if (collected.length > MAX_SNIPPET_LINES) {
    return collected.slice(0, MAX_SNIPPET_LINES).join("\n") + "\n// ... (truncated)";
  }

  return collected.join("\n");
}
