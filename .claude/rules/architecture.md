# Architecture Standards

## Layering

- **UI**: Next.js App Router pages/layouts/forms
- **Server boundary**: Route Handlers / Server Actions — validate input, call domain, return DTOs
- **Domain** (`server/review`): orchestrates review pipeline, no UI concerns
- **Integrations**: `server/azure-devops`, `server/git`, `server/ai`
- **Persistence**: `server/db` + Prisma/SQLite

## Hard rules

- Server-only modules under `server/` must have `import "server-only"` — never import from Client Components
- Encrypt PATs at rest (AES-256-GCM); never log or send secrets to client
- Validate at boundaries (requests, persistence, AI output) with Zod; prefer `unknown` over `any`
- Use typed domain errors; never swallow external errors; surface safe summaries at the edge

## Naming

- Files/folders: `kebab-case`; React exports: `PascalCase`; values/functions: `camelCase`
- Route-scoped UI in `app/**/_components/`; route-scoped logic in `app/**/_lib/` (routes, search params, constants); shared UI in `components/`; `components/ui/` reserved for shadcn/ui
