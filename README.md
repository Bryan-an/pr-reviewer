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

## What “done” looks like for the MVP

- Select a PR from Azure DevOps
- Generate an AI review aligned with your standards
- Preview the findings
- Publish the comments back to Azure DevOps as PR threads

## One-page MVP Spec (v1)

### Problem statement

Reviewing Azure DevOps pull requests repeatedly for the same classes of issues is time-consuming. This app generates **high-signal, ready-to-post** review comment threads aligned to **team-specific standards**.

### Happy path (v1) — single PR only

- Provide Azure DevOps org + project + repo and a PR identifier (PR id or PR URL).
- Server fetches PR metadata from Azure DevOps.
- Server generates a **unified diff locally** from the PR branches (source of truth for review context).
- Server runs an **AI review engine** (CodeRabbit preferred, LLM fallback) and normalizes results into structured findings.
- UI previews findings grouped by file and severity.
- User publishes findings back to Azure DevOps as PR comment threads.

### Inputs (v1)

- **From UI**:
  - Azure DevOps organization
  - Azure DevOps project
  - Repository identifier (name or id)
  - Pull request identifier (id or URL)
  - Standards profile selection (optional; default profile if omitted)
- **Secrets (server-only)**:
  - Azure DevOps PAT (provided via server environment variable; never entered in the browser)

### Outputs (v1)

- **Previewable findings** (deterministic schema) grouped by:
  - file path
  - severity (e.g. info/warn/error)
  - category (e.g. correctness/security/maintainability)
- **Publishable PR threads** in Azure DevOps:
  - general comments and file-scoped comments (line anchoring is a non-goal for v1)
- Minimal run metadata:
  - timestamp, PR reference, engine used, counts by severity

### Success criteria (definition of done)

- Can publish at least one generated comment thread to the intended Azure DevOps PR.
- Findings are produced in a **structured, deterministic format** suitable for publishing (not free-form text only).
- PAT is **never sent to the client** and is never logged.
- Local unified diff is the **source of truth** for review context.

### Non-goals (v1)

- Browsing/listing PRs (user supplies a PR id or PR URL).
- Line-level anchoring (file-level only; line anchoring can be added later).
- Persisting PATs in the database (when added later, it must be encrypted at rest with `APP_ENCRYPTION_KEY`).
- Multi-org/multi-repo management UI, teams/roles, SSO, and enterprise policy management.
- Full standards editor UI (v1 may use a default or a small, fixed set).

### Key constraints / assumptions

- **Secrets are server-only**; server modules live under `server/` and must not be imported by Client Components.
- **Pluggable AI engine** behind a stable interface (CodeRabbit preferred, LLM fallback).
- Avoid publishing or logging raw diffs by default (diffs may contain sensitive content).

## Status

MVP is progressing: you can generate a review preview and publish findings back to Azure DevOps as PR comment threads.

AI integration uses the **CodeRabbit CLI** (best-effort normalization into structured findings).

## Publishing (current behavior)

The review preview page can publish findings back to Azure DevOps as **PR comment threads**:

- **One summary thread**: basic run metadata (engine name, counts).
- **File-scoped threads**: one thread per file (no line anchoring in v1).
- **Idempotency**: published threads include hidden markers so re-publishing does not duplicate threads.
- **Fallback**: if Azure DevOps rejects file-scoped context without positions, the app falls back to posting a general thread that includes the file path in the content.

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

## Known limitations (v1)

- Publishing is **file-scoped only** (no line anchoring).
- CodeRabbit CLI output parsing is **best-effort**; some findings may be unscoped or less precise.

## Architecture, strategy, and repository structure

### Architecture goals

- **High-signal, deterministic output**: AI findings must be structured, actionable, and easy to publish back to Azure DevOps as comment threads.
- **Pluggable review engines**: support multiple engines (CodeRabbit preferred, LLM fallback) behind a stable interface.
- **Server-only handling of secrets**: Azure DevOps PATs and encryption keys never reach the browser.
- **Thin UI, strong domain layer**: Next.js routes and UI components orchestrate; the review pipeline owns the business logic.

### High-level component model

- **UI layer (Next.js App Router)**: pages, layouts, forms, and preview screens.
- **Server boundary (Route Handlers / Server Actions)**: validates input, calls domain use-cases, returns DTOs.
- **Domain layer (review pipeline)**: converts PR metadata + diffs into review “findings”, independent of any specific AI provider.
- **Integrations**:
  - **Azure DevOps adapter**: PR metadata, files, and publishing comment threads (via `azure-devops-node-api`).
  - **Git adapter**: clone/fetch and generate unified diffs locally (`git diff ...` via `execa`).
  - **AI engines**: CodeRabbit CLI runner and/or LLM provider runner.
- **Persistence**: Prisma models for settings, standards, credentials metadata, review runs, findings, and publish history.

### Data flow (MVP)

1. **Select PR** (org/project/repo/PR id).
2. **Fetch PR metadata** from Azure DevOps.
3. **Generate unified diff locally** using `git` (source of truth for review context).
4. **Run AI engine** (CodeRabbit first; fallback to LLM) to produce structured findings.
5. **Preview** findings in the UI (grouped by file / severity).
6. **Publish** findings back to Azure DevOps as PR comment threads.

### Repository structure (target)

This is the structure we’ll follow as features land. Not every folder exists yet.

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
│   └── crypto/                   # encryption helpers (server-only)
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
  - stored encrypted at rest (AES-256-GCM) using `APP_ENCRYPTION_KEY`
  - never logged, never sent to the client
- Use environment variables for secrets; never commit `.env*`.

#### Logging and observability

- Prefer structured logging (planned: `pino`) with correlation ids for a review run.
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

### Logging, testing, and quality (planned)

- **Logging**: `pino`
- **Unit tests**: `vitest`
- **E2E tests**: `playwright`
- **Formatting**: `prettier` (+ `prettier-plugin-tailwindcss`)
