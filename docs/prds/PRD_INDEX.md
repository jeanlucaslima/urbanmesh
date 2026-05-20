# PRD index

| PRD | Title                                                        | State        |
| --- | ------------------------------------------------------------ | ------------ |
| A   | Viaduct Ktor baseline                                        | complete     |
| A-QA| Verify Viaduct Ktor baseline migration                       | complete     |
| B   | Internal service integration for Viaduct tenant modules      | complete     |
| C-skills | Add Viaduct agent skills + remove Apollo leakage        | complete     |
| C   | Policy enforcement + execution metadata                      | complete     |
| D   | Agent orchestrator + frontend                                | complete     |
| D-QA| Verify agent + frontend (covered by `scripts/verify.sh`)     | covered      |
| E   | Demo polish / rehearsal QA                                   | next         |

## Verification

```bash
docker compose up --build -d
./scripts/verify.sh
```

`./scripts/verify.sh` runs 19 stages covering compose topology, all
service healths, Postgres seed, direct service responses, policy-service
behavior, GraphQL responses for all four roles, executionMetadata in
extensions, agent `/run` for AI / ADMIN / missing-customer, frontend
HTML reachability, the agent and frontend architecture-grep guardrails,
Apollo absence, and the prototype/skills layout.

## Manual residuals after PRD D

- Open http://localhost:3000 in a browser and click **Run through
  Viaduct** with role AI_ASSISTANT, then ADMIN. Confirm the answer,
  query, and metadata panels render as expected.
- Open http://localhost:8080/graphiql and run the AI_ASSISTANT and
  ADMIN versions of `CustomerContext` to confirm the same data
  reaches developers via the same endpoint.
