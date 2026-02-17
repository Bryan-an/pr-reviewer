# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azure DevOps AI PR Reviewer — a Next.js web app that automates pull request reviews. It connects to Azure DevOps, generates local diffs, runs AI analysis (CodeRabbit CLI or stub engine), and publishes structured findings back as PR comment threads.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build (also runs as pre-push hook)
pnpm lint             # ESLint
pnpm type-check       # TypeScript check (tsc --noEmit)
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check only)
```

Prisma commands:

```bash
pnpm prisma migrate dev    # Apply migrations in dev
pnpm prisma generate       # Regenerate Prisma client (output: prisma/generated/prisma/)
```

No test framework is configured yet (vitest and playwright are planned).

## Git Hooks (Husky)

- **pre-commit**: `lint-staged` (ESLint --fix + Prettier on staged files) + `pnpm type-check`
- **commit-msg**: commitlint enforcing Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **pre-push**: `pnpm build`

Branch prefixes: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`. Squash merge into `main`.

## Architecture

### Layering

```
UI (App Router pages/components)
  → Server boundary (Route Handlers + Server Actions)
    → Domain layer (server/review/)
      → Integrations (server/azure-devops/, server/git/, server/ai/)
      → Persistence (server/db/ + Prisma/SQLite)
```

### Key directories

- `app/` — Next.js App Router routes; route-scoped components in `_components/` subdirs
- `components/ui/` — shadcn/ui components (do not manually edit)
- `lib/` — shared utilities: env config (Zod), validation schemas, URL parsing
- `server/` — all server-only code (`import "server-only"` guardrail); never import from Client Components
- `prisma/` — schema + migrations; generated client at `prisma/generated/prisma/`

### Review pipeline (main data flow)

1. User pastes PR URL on home page → navigates to `/review`
2. `ReviewRunner` (client component) POSTs to `/api/review/run`
3. Route handler checks cache → if miss, runs `runAndPersistReview`:
   - Fetches PR metadata from Azure DevOps SDK
   - Clones/fetches repo locally (cached in `.data/repos/`)
   - Generates unified diff via `git diff` (source of truth, not ADO APIs)
   - Selects AI engine → runs review → normalizes findings via Zod
   - Persists `ReviewRun` + `Finding[]` to SQLite
4. Results displayed in `ReviewResults` → user can publish to Azure DevOps as comment threads

### AI engine interface

Engines implement `ReviewEngine` (defined in `server/ai/engine.ts`). Input: PR metadata + local repo dir + unified diff. Output: structured findings. Implementations: `coderabbit/coderabbit-engine.ts` (preferred), `stub-engine.ts` (testing). Selected via `REVIEW_ENGINE` env var.

### Database models (Prisma/SQLite)

- `ReviewRun` → `Finding[]` (review execution + results)
- `Repository` → `RepoRule[]` (per-repo markdown review rules, managed via `/repos` UI)

## Conventions

- **Enums**: use `as const` object + derived type + values array for Zod. No magic string unions.
  ```ts
  export const SEVERITY = { Info: "info", Warn: "warn" } as const;
  export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];
  ```
- **Naming**: files/folders in `kebab-case`, React exports `PascalCase`, values/functions `camelCase`
- **Validation**: validate at boundaries with Zod; prefer `unknown` + Zod over `any`
- **Server-only**: modules under `server/` must include `import "server-only"` and never be imported by Client Components
- **Package manager**: pnpm only — do not use npm or yarn

## Environment Variables

Required: `AZURE_DEVOPS_PAT`

Optional: `REPOS_DIR`, `CODERABBIT_BIN`, `CODERABBIT_TIMEOUT_MS`, `REVIEW_ENGINE` (`coderabbit` | `stub`), `DATABASE_URL` (default: `file:./pr-reviewer.db`), `LOG_LEVEL`

Env schema defined in `lib/config/env.ts` with Zod validation. `LOG_LEVEL` is read directly via `process.env` in `server/logging/logger.ts` (not in Zod schema).

## Claude Code Tooling

- `.claude/rules/` — project conventions enforced contextually (architecture, enums, naming, git workflow, etc.)
- `.claude/skills/` — auto-invoked skills for Next.js App Router, server/client components, Prisma, shadcn/ui, TDD, and debugging
- `.mcp.json` — MCP server config (shadcn component registry)
