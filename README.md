# PR Reviewer (Azure DevOps + AI)

## Overview

This project **automates pull request reviews in Azure DevOps** using AI, generating high-signal review comments while enforcing **team-specific coding standards**.

It is designed for scenarios where a single reviewer (or a small group) receives many PRs and must review them manually, repeatedly checking for the same classes of issues: correctness, maintainability, security, consistency, and adherence to internal conventions.

## How it works

A **web app** that connects to Azure DevOps, fetches the set of changes in a pull request, runs an AI review, and produces **ready-to-post comments** (general, file-scoped, and line-anchored) that you can publish back to the PR.

The reviewer can provide their own standards (architecture rules, naming, error handling, testing expectations, etc.) so the AI review is aligned with the team’s expectations rather than generic advice.

## AI approach (high level)

The review engine is **pluggable**:

- Prefer using **CodeRabbit** (when available) to leverage its review capabilities and standards enforcement.
- Fall back to a direct LLM provider when CodeRabbit is not available or not suitable.

## CodeRabbit

This repository is configured to use CodeRabbit for **automatic PR reviews** via `/.coderabbit.yaml`.

### When reviews run

- CodeRabbit reviews **non-draft PRs** automatically.
- CodeRabbit re-runs reviews on **new commits** pushed to the PR.

### Manual review commands

On a PR, comment:

- `@coderabbitai review` for a standard review
- `@coderabbitai full review` for a more comprehensive review

### How this repo is tuned

- Review guidance is derived from our local standards in `/.cursor/rules/*` (plus `README.md`).
- Noisy files (like `pnpm-lock.yaml` and static assets) are excluded from review commentary via `reviews.path_filters` in `/.coderabbit.yaml`.

## Core capabilities

- Paste a PR URL from Azure DevOps and generate an AI review aligned with your standards
- Preview findings in a structured UI, grouped by file and severity
- Publish findings back to Azure DevOps as line-anchored PR comment threads — individually or in bulk
- Manage per-finding status (pending, published, ignored) with optimistic UI updates
- Define and manage repository-scoped Markdown review rules via `/repos`

## Specification

### Problem statement

Reviewing Azure DevOps pull requests repeatedly for the same classes of issues is time-consuming. This app generates **high-signal, ready-to-post** review comment threads aligned to **team-specific standards**.

### Happy path

- Provide Azure DevOps org + project + repo and a PR identifier (PR id or PR URL).
- Server fetches PR metadata from Azure DevOps.
- Server generates a **unified diff locally** from the PR branches (source of truth for review context).
- Server runs an **AI review engine** (CodeRabbit preferred, LLM fallback) and normalizes results into structured findings.
- UI previews findings grouped by file and severity, with per-finding status tracking (pending/published/ignored).
- User publishes findings back to Azure DevOps as PR comment threads — individually per finding or in bulk.

### Inputs

- **From UI**:
  - Azure DevOps pull request URL
- **Optional review rules**:
  - Repository-scoped Markdown rules are managed in the app (see “Repository rules (Markdown)” below). If a repo has no enabled rules, reviews run with the default/general behavior.
- **Secrets (server-only)**:
  - Azure DevOps PAT (provided via server environment variable; never entered in the browser)

### Outputs

- **Previewable findings** (deterministic schema) grouped by:
  - file path
  - severity (e.g. info/warn/error)
  - category (e.g. correctness/security/maintainability)
- **Publishable PR threads** in Azure DevOps:
  - Line-anchored comments (one thread per finding, positioned at the relevant lines in the diff view)
  - File-scoped and general fallback for findings without line information
- Minimal run metadata:
  - timestamp, PR reference, engine used, counts by severity

### Success criteria (definition of done)

- Can publish at least one generated comment thread to the intended Azure DevOps PR.
- Findings are produced in a **structured, deterministic format** suitable for publishing (not free-form text only).
- PAT is **never sent to the client** and is never logged.
- Local unified diff is the **source of truth** for review context.

### Non-goals

- Browsing/listing PRs (user supplies a PR id or PR URL).
- Persisting PATs in the database.
- Multi-org/multi-repo management UI, teams/roles, SSO, and enterprise policy management.
- Organization-wide policy management (beyond repository-scoped Markdown rules).

### Key constraints / assumptions

- **Secrets are server-only**; server modules live under `server/` and must not be imported by Client Components.
- **Pluggable AI engine** behind a stable interface (CodeRabbit preferred, LLM fallback).
- Avoid publishing or logging raw diffs by default (diffs may contain sensitive content).

## Status

The core review workflow is fully implemented:

- Generate a review preview and publish findings back to Azure DevOps as **line-anchored PR comment threads** (with file-scoped and general fallbacks).
- **Individual finding actions**: publish, ignore, or restore each finding independently, with optimistic UI (React 19 `useOptimistic`) and toast feedback.
- **Bulk publish**: publish all pending findings at once; already-published and ignored findings are skipped.
- **Finding status tracking**: each finding persists a status (`pending`/`published`/`ignored`) in the database.
- Manage **repository-scoped Markdown rules** in `/repos` (CRUD, enable/disable, sort order) and have enabled rules automatically applied during PR reviews.
- **Review caching**: completed reviews are cached via URL and can be reloaded without rerunning; rerun is available without leaving the page.
- AI integration uses the **CodeRabbit CLI** (best-effort normalization into structured findings).
- **Structured logging** with `pino` (JSON on server, `pino/browser` on client).

## Publishing (current behavior)

The review preview page supports **two publishing modes**: bulk (all pending findings) and individual (per-finding actions). Findings are published back to Azure DevOps as **PR comment threads**:

- **One thread per finding**: each finding with a file path becomes its own thread. When line numbers are available (parsed from CodeRabbit output or inferred by the stub engine), the thread is **line-anchored** — it appears directly on the relevant lines in the Azure DevOps diff view.
- **Fallback hierarchy**: findings with file + lines → line-anchored thread; findings with file only → file-scoped thread; findings without file → general thread. If Azure DevOps rejects a line-anchored or file-scoped thread, the app falls back to posting a general thread.
- **Idempotency**: published threads include hidden markers so re-publishing does not duplicate threads.
- **Per-finding actions**: each finding card has Publish, Ignore, and Restore buttons. Status changes use `useOptimistic` for instant UI feedback and persist to the database. Bulk publish skips findings that are already published or ignored.

## Repository rules (Markdown)

You can optionally define **repository-scoped review rules** as Markdown documents and have them automatically applied whenever you review a PR for that repo.

### Dashboard

- Open the rules dashboard at `/repos`.
- Enter an Azure DevOps **organization**.
- Select a **project** (required).
- Browse repositories (the list is fetched live from Azure DevOps).

### Managing rules

For a selected repository you can:

- Create, edit, preview, and delete Markdown rules.
- Enable/disable rules.
- Set an order (lower numbers apply first).

### How rules are applied during review

When you run a PR review, the app:

- Detects the repo from PR metadata.
- Loads **enabled** rules for that repo from the local database.
- Writes each enabled rule to a temporary file inside the PR worktree.
- Runs CodeRabbit CLI with those rule files passed via `--config`.

If there are no enabled rules for the repo, the app runs CodeRabbit CLI without `--config` (general review behavior).

## Local setup

### Required

- **`AZURE_DEVOPS_PAT`**: Azure DevOps Personal Access Token available to the server runtime (never sent to the browser).
- **CodeRabbit CLI** installed and authenticated on the machine running the Next.js server:
  - Install: `curl -fsSL https://cli.coderabbit.ai/install.sh | sh`
  - Authenticate: `coderabbit auth login`
  - Docs: `https://docs.coderabbit.ai/cli`

### Optional

- **`REPOS_DIR`**: directory where the server caches cloned Azure DevOps repos (default: `.data/repos`).
- **`CODERABBIT_BIN`**: override the CodeRabbit CLI binary path/name (default: `coderabbit`).
- **`REVIEW_ENGINE`**: choose the engine (`coderabbit` or `stub`). Default: `coderabbit`.

## Known limitations

- CodeRabbit CLI output parsing is **best-effort**; some findings may be unscoped or less precise.
- Line anchoring depends on the AI engine providing line numbers. If the engine does not include line information, the finding falls back to file-scoped or general threading.

## Architecture, strategy, and repository structure

### Architecture goals

- **High-signal, deterministic output**: AI findings must be structured, actionable, and easy to publish back to Azure DevOps as comment threads.
- **Pluggable review engines**: support multiple engines (CodeRabbit preferred, LLM fallback) behind a stable interface.
- **Server-only handling of secrets**: Azure DevOps PATs are provided via environment variables and never reach the browser.
- **Thin UI, strong domain layer**: Next.js routes and UI components orchestrate; the review pipeline owns the business logic.

### High-level component model

- **UI layer (Next.js App Router)**: pages, layouts, forms, and preview screens.
- **Server boundary (Route Handlers / Server Actions)**: validates input, calls domain use-cases, returns DTOs.
- **Domain layer (review pipeline)**: converts PR metadata + diffs into review “findings”, independent of any specific AI provider.
- **Integrations**:
  - **Azure DevOps adapter**: PR metadata, files, and publishing comment threads (via `azure-devops-node-api`).
  - **Git adapter**: clone/fetch and generate unified diffs locally (`git diff ...` via `execa`).
  - **AI engines**: CodeRabbit CLI runner and/or LLM provider runner.
- **Persistence**: Prisma models for review runs, findings, repositories, and review rules.

### Data flow

1. **Select PR** (org/project/repo/PR id).
2. **Fetch PR metadata** from Azure DevOps.
3. **Generate unified diff locally** using `git` (source of truth for review context).
4. **Run AI engine** (CodeRabbit first; fallback to LLM) to produce structured findings.
5. **Preview** findings in the UI (grouped by file / severity) with per-finding status tracking.
6. **Publish** findings back to Azure DevOps as PR comment threads — individually per finding or all pending at once.

### Repository structure

```text
.
├── app/                          # Next.js routes (App Router)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (dashboard)/              # Optional route group (no URL segment)
│   ├── api/                      # Route handlers (server endpoints)
│   │   └── .../route.ts
│   └── _components/              # Route-scoped components (non-routing)
├── components/
│   ├── ui/                       # shadcn/ui components (kebab-case files)
│   └── ...                       # shared, reusable components
├── lib/
│   ├── config/                   # env parsing, feature flags
│   ├── validation/               # zod schemas for inputs/DTOs
│   ├── utils/                    # small pure helpers (no side effects)
│   └── logging/                  # pino logger (client + server)
├── server/                       # server-only modules (no React imports)
│   ├── azure-devops/             # SDK client + publishing threads
│   ├── git/                      # clone/fetch/diff generation
│   ├── ai/                       # engines + normalization to findings
│   ├── review/                   # domain orchestration (use-cases)
│   └── db/                       # prisma client + repositories
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/                      # one-off scripts and maintenance tasks
├── public/
└── ...
```

### Module boundaries (important)

- **Server-only code** goes in `server/` and must never be imported by Client Components.
  - Use `import "server-only";` at the top of server-only modules as a guardrail.
- **React Server Components** may call server-only modules; **Client Components** may not.
- Prefer calling the domain layer directly from Server Components / Server Actions instead of creating “internal-only” HTTP APIs.

### Conventions and best practices

#### Code organization

- **Co-locate feature code** when it improves readability:
  - route-specific UI in `app/**/_components/`
  - shared UI in `components/`
  - domain/integrations always outside `app/` in `server/`
- Keep route handlers and server actions **thin**: validate → call use-case → format response.

#### Naming

- **Routes & folders**: `kebab-case` (URL-friendly).
- **Files**: `kebab-case.ts` / `kebab-case.tsx`.
- **React component exports**: `PascalCase`.
- **Types**: `PascalCase` for interfaces/types; `camelCase` for values and functions.

#### TypeScript and validation

- Keep `strict` mode enabled (already configured).
- Avoid `any`. Prefer `unknown` + Zod parsing at boundaries.
- Validate at boundaries:
  - incoming requests (route handlers / actions)
  - persisted data read/write (repositories)
  - AI engine output (structured JSON → Zod)

#### Error handling

- Prefer **typed domain errors** (e.g. `AuthError`, `NotFoundError`, `ValidationError`) and map them to user-facing messages at the edge.
- Never swallow errors from external systems (Azure DevOps, git, AI). Capture context and surface a safe summary.

#### Security (credentials)

- PATs are treated as secrets:
  - provided via server-only environment variables (`AZURE_DEVOPS_PAT`)
  - never persisted in the database, never logged, never sent to the client
- Never commit environment files (e.g. `.env`) — except for `.env.example`, which is tracked as a setup reference.

#### Logging and observability

- All code imports `logger` from `lib/logging/logger` (shared entrypoint for client + server). Direct `console.log`/`console.error`/`console.warn` calls are prohibited. Pino outputs structured JSON on the server and delegates to `pino/browser` on the client. Use correlation IDs for review runs.
- Log **events**, not raw secrets or full diffs by default (diffs can contain sensitive data).

#### Formatting and linting

- Format with `pnpm format`; enforce with `pnpm format:check`.
- Lint with `pnpm lint`.
- Don’t disable ESLint rules unless there’s a documented reason.

## Tech stack (recommended)

- **Web app**: Next.js (App Router) + TypeScript
- **Styling/UI**: Tailwind CSS (+ `shadcn/ui` for accessible components)
- **Azure DevOps integration**: **Official SDK** `azure-devops-node-api`
- **Diff generation**: `git` (local clone/fetch) + Node process runner
- **AI review engine**: CodeRabbit (preferred) + direct LLM fallback
- **Storage (local-first)**: SQLite + Prisma
- **Validation**: Zod
- **Package manager**: pnpm

## Tools & dependencies

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

- **`prisma`** + **`@prisma/client`**: ORM for review runs, findings, repositories, and review rules.
- **SQLite**: local database for repositories, review rules, review runs, and findings.

### Security (secrets)

- Azure DevOps PATs are provided via server-only environment variables — never persisted in the database, never logged, never sent to the client.
- Never commit secrets; keep them in environment variables.

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

## Git workflow (recommended)

We use **GitHub Flow** (trunk-based development): keep `main` stable and integrate changes via short-lived branches and PRs.

### Branching

- **`main`**: the only long-lived branch; always kept in a working state.
- Create short-lived branches from `main`:
  - `feat/<short-slug>`: new functionality
  - `fix/<short-slug>`: bug fixes
  - `chore/<short-slug>`: maintenance/refactors/tooling
  - `docs/<short-slug>`: documentation-only changes

### Commits

- Use **Conventional Commits** (enforced by commitlint). Examples:
  - `feat: add PR selection UI`
  - `fix: handle missing repo permissions`
  - `chore: refactor review engine interface`

### Pull requests

- Open a PR early (draft is fine) and keep it small and focused.
- Prefer descriptive PR titles and include a brief summary + test notes.

### Merging

- Prefer **squash merge** into `main` (keeps history readable).
- Avoid merging directly to `main` without a PR.

### Releases (optional)

- Tag releases from `main` when you want stable milestones (e.g., `v0.1.0`, `v0.2.0`).

### Logging, testing, and quality

- **Logging**: `pino` (see `lib/logging/logger.ts`)
- **Formatting**: `prettier` (+ `prettier-plugin-tailwindcss`)
