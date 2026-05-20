# PROJECT_STATUS

> Last updated: 2026-05-20

| Field               | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| Last completed PRD  | PRD E (demo polish + talk alignment)                        |
| Current architecture| Full demo stack: Viaduct + policy + agent + frontend, with the frontend reframed as a demo console |
| Last verification   | `./scripts/verify.sh` ✅                                     |
| Known residuals     | manual browser click-through; manual GraphiQL spot-check     |
| Next PRD            | PRD F — Rehearsal / Failure-Mode QA                         |

## What works today

`docker compose up --build -d` starts nine active services:
`postgres`, `customer-service`, `billing-service`, `support-service`,
`usage-service`, `policy-service`, `viaduct-server`,
`agent-orchestrator`, `frontend`.

Demo-ready surface:

- Frontend at http://localhost:3000 with header
  *"Viaduct Agent Demo — The agent is just another GraphQL client."*
- Five presets above the task input: **Risk review**, **Admin view**,
  **Support situation**, **Billing risk**, **Healthy customer**.
  Presets set task + role but do not auto-run.
- Run button labeled **"Run through Viaduct"**.
- Evidence panel sits next to the Answer panel and shows: a one-line
  count summary, services-touched chips, a sorted `blockedFields`
  list (with **"No blocked fields"** empty state for ADMIN), and
  per-decision ALLOW/DENY rows with badges (`✓ ALLOW` / `✗ DENY`).
- Architecture proof line at the top of the evidence panel and again
  in the footer.
- Role-contrast helper line after each run: ADMIN gets *"received
  the full sensitive context"*, others get *"received a
  policy-filtered view"*.

Agent envelope is stable across success and error states. The seven
keys are always present: `answer`, `query`, `variables`, `data`,
`executionMetadata`, `validationError`, `graphQLErrors`. Validation
errors set `executionMetadata: null` so observers can tell the agent
never touched Viaduct.

Customer ID extraction is case-insensitive (`c-1027` → `C-1027`) and
rejects tasks that name more than one ID (`multiple_customer_ids`).

## Architecture constraints enforced by `scripts/verify.sh`

- agent and frontend may not reference any internal service name in
  source.
- active runtime may not reference Apollo tokens outside
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
- No browser-automated tests (the frontend probe is HTML+bundle level
  only).
