# PRD index

| PRD  | Title                                                        | State        |
| ---  | ------------------------------------------------------------ | ------------ |
| A    | Viaduct Ktor baseline                                        | complete     |
| A-QA | Verify Viaduct Ktor baseline migration                       | complete     |
| B    | Internal service integration for Viaduct tenant modules      | complete     |
| C-skills | Add Viaduct agent skills + remove Apollo leakage         | complete     |
| C    | Policy enforcement + execution metadata                      | complete     |
| D    | Agent orchestrator + frontend                                | complete     |
| D-QA | Verify agent + frontend                                      | complete     |
| E    | Demo polish + talk alignment                                 | complete     |
| E-QA | Verify demo polish                                           | complete     |
| E.5  | Make It UrbanMesh (civic graph domain migration)             | complete     |
| F    | Rehearsal / failure-mode QA                                  | next         |

## Current state

PRD A through PRD E-QA built the Viaduct-backed customer demo. **PRD
E.5** replaces the visible domain with UrbanMesh — city blocks,
zoning, permits, civic cases, transit, census — while preserving the
proven Viaduct + policy + agent + frontend architecture. **PRD F**
(rehearsal / failure-mode QA) is next.

## Verification

```bash
docker compose up --build -d
./scripts/verify.sh
```

`./scripts/verify.sh` covers compose topology, all service healths,
Postgres seed for SF-1001 / SF-1027 / SF-2044, direct city-domain
service responses, policy-service behavior on UrbanMesh fields,
GraphQL `UrbanContext` responses for all four UrbanMesh roles,
executionMetadata in extensions, agent `/run` for Public AI Assistant
/ City Admin / missing-block (with the stable envelope shape),
frontend HTML + React bundle reachability, the agent and frontend
architecture-grep guardrails, Apollo absence, and the prototype/skills
layout.

## On-stage runbook

See [`docs/demo-runbook.md`](../demo-runbook.md) for the pre-talk
warmup, the recommended preset sequence (Block review then Planner
view), the closing line, and the fallback ladder (frontend → curl →
GraphiQL → README).
