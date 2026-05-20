# Verification & QA

> `scripts/verify.sh` is the source of truth. Update it when behavior changes.

## Rules

- Every PRD that changes runtime behavior **must** update `scripts/verify.sh`
  with checks that prove the new behavior.
- The script must be staged, readable, and print clear section headings.
- The script must ignore `prototype-apollo/` unless the PRD is explicitly
  testing archive behavior.
- Verify only what the **current** PRD claims. Don't add checks for features
  that don't exist yet — they'll fail and make the script unusable as a gate.
- Architecture guardrails must fail clearly with a diagnostic message, not a
  silent exit.

## Required active guardrails

These must always pass on a clean active checkout:

```
- No active Apollo:   no @apollo/server, ApolloServer, expressMiddleware,
                      graphql-gateway, apollo-server in active runtime
- prototype-apollo/   present and excluded from active grep
- AGENTS.md           exists
- .skills/            contains core skills (project-architecture,
                      prd-implementation, commit-cadence, verification-qa,
                      viaduct-kotlin-ktor)
```

## Exclusion list for the Apollo absence grep

```
prototype-apollo/   (archive)
.git/               (repo internals)
.gradle/, build/    (Gradle outputs)
node_modules/       (vendored JS)
scripts/verify.sh   (the regex itself appears here)
.viaduct/agents/    (upstream framework docs may mention "apollo" generically)
```

## How to add a new stage

1. Pick a small, deterministic check (HTTP response shape, file present,
   query result contains expected substring).
2. Add a `section "[N/M] ..."` header.
3. Use the existing `require_contains`, `require_url_ok`, `require_no_errors`
   helpers when possible.
4. Renumber the stage labels.
5. Run `./scripts/verify.sh` locally before committing.

## Running verification

```bash
docker compose up --build -d
./scripts/verify.sh
```

Exit zero = PRD claims hold. Exit non-zero = stop and fix.
