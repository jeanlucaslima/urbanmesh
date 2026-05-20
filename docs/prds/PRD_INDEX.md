# PRD index

| PRD | Title                                                        | State        |
| --- | ------------------------------------------------------------ | ------------ |
| A   | Viaduct Ktor baseline                                        | complete     |
| A-QA| Verify Viaduct Ktor baseline migration                       | complete     |
| B   | Internal service integration for Viaduct tenant modules      | complete     |
| C-skills | Add Viaduct agent skills + remove Apollo leakage        | complete     |
| C   | Policy enforcement + execution metadata                      | complete     |
| D   | Agent orchestrator + frontend                                | complete     |
| D-QA| Verify agent + frontend                                      | complete     |
| E   | Demo polish + talk alignment                                 | complete     |
| E-QA| Verify demo polish                                           | pending      |
| F   | Rehearsal / failure-mode QA                                  | next         |

## Current state

PRD A through PRD D are complete and verified. **PRD E** (demo polish
+ talk alignment) is complete. **PRD E-QA** is pending — the verifier
runs the live stack against the polish checklist. **PRD F** (rehearsal
/ failure-mode QA) is next after PRD E-QA.

## Verification

```bash
docker compose up --build -d
./scripts/verify.sh
```

`./scripts/verify.sh` runs 19 stages covering compose topology, all
service healths, Postgres seed, direct service responses, policy-service
behavior, GraphQL responses for all four roles, executionMetadata in
extensions, agent `/run` for AI / ADMIN / missing-customer (with the
stable envelope shape), frontend HTML + React bundle reachability,
the agent and frontend architecture-grep guardrails, Apollo absence,
and the prototype/skills layout.

## On-stage runbook

See [`docs/demo-runbook.md`](../demo-runbook.md) for the pre-talk
warmup, the recommended preset sequence (AI_ASSISTANT then ADMIN),
the closing line, and the fallback ladder (frontend → curl → GraphiQL
→ README).
