# Commit cadence

> Commit at every milestone, not at the end of the PRD.

## Rules

- Commit after each milestone the PRD calls out (or each logical step
  if the PRD doesn't enumerate them).
- Each commit should be a **working or inspectable state**. Don't commit
  half-broken code unless you explicitly mark it WIP.
- Use descriptive, scoped commit messages. Conventional-commits style
  (`feat:`, `chore:`, `docs:`, `test:`, `fix:`, `refactor:`) is preferred.
- Don't mix unrelated changes in one commit.
- If a milestone needs follow-up fixes, commit the fix separately with a
  clear message — don't amend a previous commit unless the user asks.
- Never skip hooks (`--no-verify`) or bypass signing unless explicitly told.

## Final report template

End every PRD run with:

```
Commits created:
1. <hash> <type>: <message>
2. <hash> <type>: <message>
...

Final verification:
./scripts/verify.sh   ✅ / ❌
docker compose up --build -d   ✅ / ❌
Apollo absence check   ✅ / ❌
```

## When in doubt

- Too many commits is fine. Too few is not.
- A commit per file is wrong. A commit per logical milestone is right.
