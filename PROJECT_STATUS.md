# PROJECT_STATUS

> Last updated: 2026-05-20

| Field               | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| Last completed PRD  | PRD D (agent orchestrator + frontend)                       |
| Current architecture| Full demo stack: Viaduct + policy + agent + frontend        |
| Last verification   | `./scripts/verify.sh` ✅ (19/19)                             |
| Known residuals     | manual browser QA at http://localhost:3000; GraphiQL spot-check |
| Next PRD            | demo polish / rehearsal QA                                  |

## What works today

`docker compose up --build -d` starts nine active services:
`postgres`, `customer-service`, `billing-service`, `support-service`,
`usage-service`, `policy-service`, `viaduct-server`,
`agent-orchestrator`, `frontend`.

- The frontend at http://localhost:3000 lets a user enter a task and
  select an actor role, then runs it through the agent.
- The agent at http://localhost:5005 deterministically plans a
  CustomerContext GraphQL query, calls only `viaduct-server`, and
  returns `{answer, query, variables, data, executionMetadata}`.
- Viaduct enforces field-level policy via `policy-service` and attaches
  `executionMetadata` (servicesTouched / blockedFields / policyDecisions)
  to every GraphQL response in `extensions`.
- All four roles (AI_ASSISTANT / SUPPORT_AGENT / FINANCE_AGENT / ADMIN)
  produce distinct, verified responses.
- The agent and frontend source are grep-clean of internal-service
  names. The verify script enforces this on every run.

## Architecture constraints enforced by `scripts/verify.sh`

- agent and frontend may not reference `customer-service`,
  `billing-service`, `support-service`, `usage-service`,
  or `policy-service` in source.
- active runtime may not reference `@apollo/server`, `ApolloServer`,
  `expressMiddleware`, `graphql-gateway`, or `apollo-server` outside
  `prototype-apollo/`.
- `prototype-apollo/` must be present and marked reference-only.
- `AGENTS.md` and the five core `.skills/*` files must exist.

## What is preserved as reference only

`prototype-apollo/` — original Apollo + Express prototype.
Reference only; not part of the active demo.

## What is not built yet

- No LLM API calls. The agent is deterministic.
- No authentication.
- No persistence of agent runs.
- No streaming responses.
- No browser-automated tests (frontend probe is HTML-level only).
