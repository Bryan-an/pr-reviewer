---
name: commit
description: Create a conventional commit for staged or all current changes
allowed-tools: Bash, Read, Grep, Glob
---

Create a git commit following the project's Conventional Commits conventions.

## Steps

1. Run `git status` (never use `-uall`) and `git diff --staged` in parallel to see what will be committed.
2. If there are no staged changes, stage the relevant modified/untracked files (prefer specific paths over `git add -A`). Do NOT stage files that likely contain secrets (`.env`, credentials, etc.).
3. Run `git log --oneline -5` to see recent commit style.
4. Analyze the changes and draft a commit message:
   - Format: `{type}: {short description}`
   - Valid types: `feat`, `fix`, `chore`, `docs`
   - Keep the subject line under 72 characters
   - Focus on the "why", not the "what"
   - Add a body (separated by blank line) only if the change is non-trivial
5. Commit using a HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
type: short description
EOF
)"
```

## Rules

- **Do NOT** add a `Co-Authored-By` trailer
- **Do NOT** skip hooks (`--no-verify`)
- **Do NOT** amend previous commits unless the user explicitly asks
- If the commit fails due to a pre-commit hook, fix the issue and create a **new** commit
- After committing, run `git status` to verify success and show the result
