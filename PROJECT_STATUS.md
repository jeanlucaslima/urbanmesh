# PROJECT_STATUS

> Last updated: 2026-05-20

| Field               | Value                                        |
| ------------------- | -------------------------------------------- |
| Last completed PRD  | PRD C (policy + execution metadata)          |
| Current PRD         | —                                            |
| Next PRD            | PRD D — agent orchestrator + frontend        |
| Last verification   | `./scripts/verify.sh` ✅ (14/14)              |
| Known residuals     | manual GraphiQL check at http://localhost:8080/graphiql |

## What works today

- `docker compose up --build -d` starts seven active services:
  `postgres`, `customer-service`, `billing-service`, `support-service`,
  `usage-service`, `policy-service`, `viaduct-server`.
- `/graphql` accepts `customer(id: ID!, actorRole: ActorRole!)` for all
  four roles (`AI_ASSISTANT`, `SUPPORT_AGENT`, `FINANCE_AGENT`, `ADMIN`).
- Sensitive fields call `policy-service` before exposing data; denied
  fields become `null`.
- `extensions.executionMetadata` exposes `servicesTouched`,
  `blockedFields`, and `policyDecisions` per request.
- Per-request state is isolated; concurrent requests do not share
  accumulators.

## What is not built yet

- No agent orchestrator.
- No frontend.
- No AI answer generation.
- No client-side role selector (queries set `actorRole` directly).
- No automated GraphiQL/browser tests.

## What is preserved as reference only

`prototype-apollo/` — original Apollo + Express prototype. Reference
only; not part of the active demo. Active root remains Apollo-free
(verify.sh enforces).
