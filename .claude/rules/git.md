# Git Workflow & Hooks

## Branching (GitHub Flow)

- `main` is the only long-lived branch; keep it working
- Short-lived branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`

## Commits

- Conventional Commits (enforced by commitlint): `feat:`, `fix:`, `chore:`, `docs:`

## PRs & merging

- Open PRs early (draft OK), keep small, squash merge into `main`

## Git hooks (Husky)

- **pre-commit**: `lint-staged` (ESLint --fix + Prettier) + `pnpm type-check`
- **commit-msg**: commitlint (max-length disabled for AI messages)
- **pre-push**: `pnpm build`
