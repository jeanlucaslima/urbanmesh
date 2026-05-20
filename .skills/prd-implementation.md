# PRD implementation

> Implement only what the current PRD asks for. Respect non-goals.

## Rules

- Implement only the current PRD. Don't pull future phases forward.
- If a PRD says a feature is out of scope, do **not** add placeholders,
  types, services, env vars, comments, or stubs for it.
  - "We'll need this later" is a trap. Leave it out.
- If you think the PRD is wrong or ambiguous, **ask first**. Don't silently
  rewrite the scope.
- Match exact field/service names from the PRD. Don't rename for taste.
- Report deviations clearly in the final summary. If you skipped or changed
  something, say so.

## Active vs deferred state

The active PRD chain so far:

| PRD | Status   | Adds                                     |
| --- | -------- | ---------------------------------------- |
| A   | done     | Viaduct/Ktor baseline, fixture customer  |
| B   | done     | customer/billing/support/usage tenants   |
| C   | this PRD | agent skills, Apollo containment         |
| D   | future   | policy + execution metadata              |
| E   | future   | agent orchestrator + frontend            |

If the user asks for something that is clearly in PRD D or E, confirm before
implementing.

## Required final report format

Every PRD execution must end with a report containing:

```
Summary
Files changed
Commits created (hash + message per commit)
Verification run
Acceptance criteria status (per-item ✅/❌)
Known residuals (manual steps still needed)
```

The user reads this report to decide whether the PRD is done. Make it easy.
