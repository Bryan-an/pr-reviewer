# Tech Stack

Use these by default; don't introduce alternatives without explicit request.

- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Azure DevOps**: `azure-devops-node-api` SDK
- **Diff**: local `git diff` via `execa`, parsed with `parse-diff`
- **AI**: CodeRabbit CLI (preferred), OpenAI fallback with Zod-validated output
- **Validation**: Zod; forms via `react-hook-form` + `@hookform/resolvers`
- **Markdown**: `react-markdown`
- **DB**: Prisma + SQLite (Postgres later)
- **Logging**: `pino`
- **Tests** (planned): `vitest` + `playwright`
