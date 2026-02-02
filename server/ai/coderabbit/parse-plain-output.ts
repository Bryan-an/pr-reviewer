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

function splitIntoBlocks(text: string): string[] {
  const normalized = text.replaceAll("\r\n", "\n").trim();

  if (!normalized) return [];

  // Split on blank lines or horizontal rule-ish separators.
  return normalized
    .split(/\n{2,}|(?:^|\n)={3,}(?:\n|$)|(?:^|\n)-{3,}(?:\n|$)/g)
    .map((b) => b.trim())
    .filter(Boolean);
}

export function parseCodeRabbitPlainOutput(params: {
  text: string;
  changedFiles: string[];
}): Finding[] {
  const blocks = splitIntoBlocks(params.text);
  const findings: Finding[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    const title = normalizeWhitespace(lines[0]).slice(0, 160) || "CodeRabbit finding";

    const message =
      normalizeWhitespace(lines.slice(1).join(" ").trim()) || normalizeWhitespace(lines[0]);

    const combined = `${title}\n${message}\n${block}`;

    const filePath = bestEffortFilePath(combined, params.changedFiles);
    const severity = inferSeverity(combined);
    const category = inferCategory(combined);

    findings.push({
      id: stableId({ filePath, title, message }),
      severity,
      category,
      title,
      message,
      filePath,
    });
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
