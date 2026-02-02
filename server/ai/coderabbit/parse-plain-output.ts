import "server-only";

import crypto from "node:crypto";

import { FINDING_CATEGORY, SEVERITY } from "@/lib/validation/finding";
import type { FindingCategory, Severity } from "@/lib/validation/finding";
import type { Finding } from "@/server/review/types";

function stableId(parts: { filePath?: string; title: string; message: string }): string {
  const seed = JSON.stringify({
    filePath: parts.filePath ?? "",
    title: parts.title,
    message: parts.message,
  });

  const hash = crypto.createHash("sha256").update(seed).digest("base64url");
  return `cr_${hash.slice(0, 24)}`;
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeWhitespace(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function inferSeverity(text: string): Severity {
  const t = text.toLowerCase();

  if (/\b(critical|high risk|high severity|vulnerability|exploit|rce|sql injection)\b/.test(t)) {
    return SEVERITY.Error;
  }

  if (/\b(should|consider|potential|might|warning|race condition|memory leak|unsafe)\b/.test(t)) {
    return SEVERITY.Warn;
  }

  if (/\b(nit|style|minor|typo)\b/.test(t)) {
    return SEVERITY.Info;
  }

  return SEVERITY.Warn;
}

function inferCategory(text: string): FindingCategory {
  const t = text.toLowerCase();

  if (/\b(auth|csrf|xss|injection|vulnerab|secret|token|password|encrypt)\b/.test(t)) {
    return FINDING_CATEGORY.Security;
  }

  if (/\b(perf|performance|slow|alloc|latency|n\\+1|cache)\b/.test(t)) {
    return FINDING_CATEGORY.Performance;
  }

  if (/\b(test|coverage|unit test|e2e)\b/.test(t)) {
    return FINDING_CATEGORY.Testing;
  }

  if (/\b(correct|bug|broken|crash|null|undefined|panic)\b/.test(t)) {
    return FINDING_CATEGORY.Correctness;
  }

  if (/\b(maintain|refactor|complex|readability|duplication)\b/.test(t)) {
    return FINDING_CATEGORY.Maintainability;
  }

  if (/\b(dx|developer experience|lint|format|typescript)\b/.test(t)) {
    return FINDING_CATEGORY.DX;
  }

  if (/\b(style|format|naming|convention)\b/.test(t)) {
    return FINDING_CATEGORY.Style;
  }

  return FINDING_CATEGORY.Maintainability;
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function bestEffortFilePath(text: string, changedFiles: string[]): string | undefined {
  const files = uniqSorted(changedFiles.map((v) => v.trim()).filter(Boolean));

  if (files.length === 0) return undefined;

  // Prefer exact substring match for repo-relative paths.
  for (const f of files) {
    if (text.includes(f)) return f;
  }

  // Fallback: match by basename if unique.
  const basenameToFile = new Map<string, string[]>();

  for (const f of files) {
    const base = f.split("/").at(-1) ?? f;
    const list = basenameToFile.get(base) ?? [];
    list.push(f);
    basenameToFile.set(base, list);
  }

  for (const [base, matches] of basenameToFile.entries()) {
    if (matches.length !== 1) continue;
    if (new RegExp(String.raw`\b${escapeRegExp(base)}\b`).test(text)) return matches[0];
  }

  return undefined;
}

const sectionSeparatorRegex = /^={10,}\s*$/gm;

function normalizeText(text: string): string {
  return text.replaceAll("\r\n", "\n");
}

function hasFindingsSections(text: string): boolean {
  sectionSeparatorRegex.lastIndex = 0;
  return sectionSeparatorRegex.test(text);
}

function splitIntoFindingSections(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized.trim()) return [];

  if (!hasFindingsSections(normalized)) return [];

  // CodeRabbit uses long lines of '=' to separate findings.
  // Everything before the first separator is preamble (status/progress) and should be ignored.
  const parts = normalized.split(sectionSeparatorRegex).map((p) => p.trim());
  return parts.slice(1).filter(Boolean);
}

function parseLabeledBlock(section: string, label: string): string | undefined {
  const normalized = normalizeText(section);
  const escaped = escapeRegExp(label);

  const re = new RegExp(
    String.raw`(?:^|\n)${escaped}\s*\n([\s\S]*?)(?=\n[A-Za-z][A-Za-z _-]*:\s*\n|\nReview completed|\s*$)`,
    "i",
  );

  const match = re.exec(normalized);
  return match?.[1]?.trim() || undefined;
}

function parseSingleLineValue(section: string, label: string): string | undefined {
  const normalized = normalizeText(section);
  const escaped = escapeRegExp(label);
  const re = new RegExp(String.raw`(?:^|\n)${escaped}\s*(.+)\s*$`, "im");
  const match = re.exec(normalized);
  return match?.[1]?.trim() || undefined;
}

function severityFromType(typeValue: string | undefined, fallbackText: string): Severity {
  const t = (typeValue ?? "").toLowerCase();

  if (t.includes("critical") || t.includes("error") || t.includes("security"))
    return SEVERITY.Error;

  if (t.includes("nit") || t.includes("style") || t.includes("info")) return SEVERITY.Info;

  if (t.includes("potential_issue") || t.includes("issue") || t.includes("warning"))
    return SEVERITY.Warn;

  return inferSeverity(fallbackText);
}

function isCleanNoFindingsOutput(text: string): boolean {
  return /review completed/i.test(text) && !/\bFile:\s*/i.test(text) && !hasFindingsSections(text);
}

function parseSectionToFinding(section: string, changedFiles: string[]): Finding | null {
  const fileLine = parseSingleLineValue(section, "File:");
  const typeLine = parseSingleLineValue(section, "Type:");
  const commentBlock = parseLabeledBlock(section, "Comment:");
  const promptBlock = parseLabeledBlock(section, "Prompt for AI Agent:");

  const commentLines = (commentBlock ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");

  const title = normalizeWhitespace(commentLines[0] ?? "").slice(0, 160) || "CodeRabbit finding";

  const message = normalizeWhitespace(
    (commentLines.slice(1).join("\n").trim() || commentLines[0] || "").trim(),
  );

  const combined = [
    fileLine ? `File: ${fileLine}` : "",
    typeLine ? `Type: ${typeLine}` : "",
    commentBlock ?? "",
    promptBlock ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const filePath = fileLine
    ? (bestEffortFilePath(fileLine, changedFiles) ?? fileLine.trim())
    : bestEffortFilePath(combined, changedFiles);

  return {
    id: stableId({ filePath, title, message }),
    severity: severityFromType(typeLine, combined),
    category: inferCategory(combined),
    title,
    message,
    filePath,
    ...(promptBlock ? { recommendation: promptBlock } : {}),
  };
}

export function parseCodeRabbitPlainOutput(params: {
  text: string;
  changedFiles: string[];
}): Finding[] {
  const normalized = normalizeText(params.text);
  const sections = splitIntoFindingSections(normalized);
  const findings: Finding[] = [];

  if (isCleanNoFindingsOutput(normalized)) return [];

  for (const section of sections) {
    const finding = parseSectionToFinding(section, params.changedFiles);
    if (finding) findings.push(finding);
  }

  if (findings.length === 0) {
    const excerpt = params.text.replaceAll(/\s+/g, " ").trim().slice(0, 400);

    const message = excerpt
      ? `CodeRabbit CLI returned output, but it could not be structured into findings. Output excerpt: ${excerpt}`
      : "CodeRabbit CLI returned no structured findings.";

    findings.push({
      id: stableId({ title: "CodeRabbit output could not be parsed", message }),
      severity: SEVERITY.Info,
      category: FINDING_CATEGORY.DX,
      title: "CodeRabbit output could not be parsed",
      message,
    });
  }

  // Keep output deterministic.
  const severityRank: Record<Severity, number> = { error: 0, warn: 1, info: 2 };

  return findings.sort((a, b) => {
    const bySeverity = severityRank[a.severity] - severityRank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return (a.filePath ?? "").localeCompare(b.filePath ?? "") || a.title.localeCompare(b.title);
  });
}
