# PROJECT_STATUS

> Last updated: 2026-05-20

| Field               | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| Last completed PRD  | PRD E.5a — SF 311 civic source                              |
| Current architecture| Full UrbanMesh civic graph: Viaduct + policy + agent + frontend over location / permits / civic / transit / census domains |
| Last verification   | `./scripts/verify.sh` pending re-run with UrbanMesh checks  |
| Known residuals     | manual browser click-through; manual GraphiQL spot-check; no real SF open-data ingestion |
| Next PRD            | PRD F — Rehearsal / Failure-Mode QA                         |

## What works today

`docker compose up --build -d` starts ten active services:
`postgres`, `location-service`, `permits-service`, `civic-service`,
`transit-service`, `census-service`, `policy-service`, `viaduct-server`,
`agent-orchestrator`, `frontend`.

Demo-ready surface:

- Frontend at http://localhost:3000 with header
  *"UrbanMesh — Turning San Francisco into a GraphQL server."*
- Five presets above the task input: **Block review**, **Planner view**,
  **Civic cases**, **Permit review**, **Ordinary block**. Presets set
  task + role but do not auto-run.
- Run button labeled **"Run through Viaduct"**.
- Evidence panel sits next to the Answer panel and shows: a one-line
  count summary, services-touched chips, a sorted `blockedFields`
  list (with **"No blocked fields"** empty state for City Admin), and
  per-decision ALLOW/DENY rows with badges (`✓ ALLOW` / `✗ DENY`).
- Architecture proof line at the top of the evidence panel and again
  in the footer.
- Role-contrast helper line after each run: City Admin gets *"received
  the full sensitive context"*, others get *"received a
  policy-filtered view"*.

Agent envelope is stable across success and error states. The seven
keys are always present: `answer`, `query`, `variables`, `data`,
`executionMetadata`, `validationError`, `graphQLErrors`. Validation
errors set `executionMetadata: null` so observers can tell the agent
never touched Viaduct.

Block ID extraction is case-insensitive (`sf-1027` → `SF-1027`),
resolves common place aliases (16th & Mission, Inner Sunset, Civic
Center), and rejects tasks that name more than one block
(`multiple_block_ids`).

## Architecture constraints enforced by `scripts/verify.sh`

- agent and frontend may not reference any city service name
  (`location-service`, `permits-service`, `civic-service`,
  `transit-service`, `census-service`, `policy-service`) in source.
- active runtime may not reference Apollo tokens outside
  `prototype-apollo/`.
- `prototype-apollo/` must be present and marked reference-only.
- `AGENTS.md` and the five core `.skills/*` files must exist.

## What is preserved as reference only

`prototype-apollo/` — original Apollo + Express prototype.
Reference only; not part of the active demo.

## What is not built yet

- No LLM API calls. The agent is deterministic.
- Civic cases are backed by SF 311 (DataSF / Socrata dataset
  `vw6y-z8j6`) with deterministic fixture fallback. Other domains
  (location, permits, transit, census) are still fixture data only.
- No maps in the UI.
- No authentication.
- No persistence of agent runs.
- No streaming responses.
- No browser-automated tests (the frontend probe is HTML+bundle level
  only).
