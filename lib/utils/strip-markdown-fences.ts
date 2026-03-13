/**
 * Strips leading/trailing markdown code fences from a string.
 *
 * Handles patterns like:
 * - ```json\n...\n```
 * - ```\n...\n```
 * - No fences (returns input trimmed)
 *
 * Uses non-multiline match to anchor at string boundaries, avoiding
 * false positives from fences embedded in the middle of the text.
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n/, "")
    .replace(/\n```\s*$/, "")
    .trim();
}
