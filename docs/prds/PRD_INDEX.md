# PRD index

| PRD | Title                                                        | State        |
| --- | ------------------------------------------------------------ | ------------ |
| A   | Viaduct Ktor baseline                                        | complete     |
| A-QA| Verify Viaduct Ktor baseline migration                       | complete     |
| B   | Internal service integration for Viaduct tenant modules      | complete     |
| C-skills | Add Viaduct agent skills + remove Apollo leakage        | complete     |
| C   | Policy enforcement + execution metadata                      | complete     |
| C-QA| Verify policy + metadata (informal — covered by verify.sh)   | covered      |
| D   | Agent orchestrator + frontend                                | next         |

Reference: each PRD lives in the conversation history. This index tracks
which phases have actually landed in the repo.

The active demo at the repo root reflects PRD C. The `prototype-apollo/`
directory is preserved reference only.

## Verification

```bash
docker compose up --build -d
./scripts/verify.sh
```

`./scripts/verify.sh` runs 14 stages covering compose topology, all
service healths, Postgres seed, direct service responses, policy-service
behavior, GraphQL responses for all four roles, execution metadata in
extensions, Apollo absence in the active runtime, prototype
preservation, and the agent-skills layout.
