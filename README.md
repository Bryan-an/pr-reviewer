# PR Reviewer (Azure DevOps + AI)

## Overview

This project aims to **automate pull request reviews in Azure DevOps** using AI, generating high-signal review comments while enforcing **team-specific coding standards**.

It is designed for scenarios where a single reviewer (or a small group) receives many PRs and must review them manually, repeatedly checking for the same classes of issues: correctness, maintainability, security, consistency, and adherence to internal conventions.

## The idea

Build a **web app** that connects to Azure DevOps, fetches the set of changes in a pull request, runs an AI review, and then produces **ready-to-post comments** (general and file-scoped, and later line-scoped) that you can publish back to the PR.

The reviewer should be able to provide their own standards (architecture rules, naming, error handling, testing expectations, etc.) so the AI review is aligned with the team’s expectations rather than generic advice.

## AI approach (high level)

The review engine is intended to be **pluggable**:

- Prefer using **CodeRabbit** (when available) to leverage its review capabilities and standards enforcement.
- Fall back to a direct LLM provider when CodeRabbit is not available or not suitable.

## What “done” looks like for the MVP

- Select a PR from Azure DevOps
- Generate an AI review aligned with your standards
- Preview the findings
- Publish the comments back to Azure DevOps as PR threads

## Status

Early stage: repository scaffolding and documentation in progress.

## Tech stack (recommended)

- **Web app**: Next.js (App Router) + TypeScript
- **Styling/UI**: Tailwind CSS (+ `shadcn/ui` for accessible components)
- **Azure DevOps integration**: **Official SDK** `azure-devops-node-api`
- **Diff generation**: `git` (local clone/fetch) + Node process runner
- **AI review engine**: CodeRabbit (preferred) + direct LLM fallback
- **Storage (local-first)**: SQLite + Prisma
- **Validation**: Zod
- **Package manager**: pnpm

## Tools & dependencies we expect to use

> Exact versions will be added as we implement features. This list captures the intended building blocks.

### Azure DevOps (official SDK)

- **`azure-devops-node-api`**: typed client for Git PR APIs (list PRs, get details, create comment threads).

### Git + diff parsing (required for high-quality reviews)

Azure DevOps APIs are great for PR metadata and commenting. For a reliable **full unified diff**, we generate it locally using `git`:

- **`execa`** (or similar): run `git` and other CLIs safely from Node.
- **`parse-diff`** (or similar): parse unified diffs to map findings to files/hunks/lines.

### AI review engines (pluggable)

- **Preferred: CodeRabbit CLI** (executed via Node):
  - Use it when available to leverage its review capabilities and standards enforcement.
  - Run it via `execa` and translate its output into a structured findings format.
- **Fallback: direct LLM provider**:
  - **OpenAI**: `openai`
  - Output should be **structured JSON** validated with Zod to keep publishing deterministic.

### Standards, validation, and forms

- **`zod`**: schema validation for config, findings, and API boundaries.
- **`react-hook-form`** + **`@hookform/resolvers`**: settings + standards editor forms.
- **`react-markdown`**: render summaries/findings in the UI.

### Persistence (local-first)

- **`prisma`** + **`@prisma/client`**: store settings, standards, and review history.
- **SQLite**: simplest local database for MVP; can migrate to Postgres later if needed.

### Security (secrets)

- Store Azure DevOps PATs **encrypted at rest** (using Node’s `crypto`, e.g. AES-256-GCM) with an `APP_ENCRYPTION_KEY`.
- Never commit secrets; keep them in environment variables and/or encrypted storage.

### Linting & formatting

- **Linting**: ESLint
  - Run: `pnpm lint`
- **Formatting**: Prettier (with Tailwind plugin)
  - Format: `pnpm format`
  - Check (CI): `pnpm format:check`

### Git hooks (code quality)

We use **Husky** to enforce quality checks locally before code reaches the remote:

- **pre-commit**: runs `lint-staged` + `pnpm type-check`
- **commit-msg**: validates commit messages with **commitlint** (Conventional Commits). Max-length rules are disabled to allow AI-generated messages.
- **pre-push**: runs `pnpm build`

### Logging, testing, and quality (planned)

- **Logging**: `pino`
- **Unit tests**: `vitest`
- **E2E tests**: `playwright`
- **Formatting**: `prettier` (+ `prettier-plugin-tailwindcss`)
