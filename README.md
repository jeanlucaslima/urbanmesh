# urbanmesh-demo

UrbanMesh is a Viaduct-powered civic graph demo over San Francisco.

The demo asks about city blocks, not customers. The graph composes
location, permits, civic cases, transit, census, and policy domains.

```
Browser UI                              GraphiQL / curl
     │                                         │
     ▼                                         │
agent-orchestrator                             │
     │                                         │
     └──────────────┬──────────────────────────┘
                    ▼
              Viaduct /graphql  (Ktor)
                    │
                    ▼
             tenant resolvers
       (location · permits · civic · transit · census)
                    │
                    ▼
        internal services + policy-service
                    │
                    ▼
                 Postgres
```

The active GraphQL server is `viaduct-server`. Both the UI client and the
agent client go through the same `/graphql` endpoint. The agent does not
call location, permits, civic, transit, census, or policy services
directly.

The old Apollo prototype is preserved under `prototype-apollo/` for
reference only.

## What the demo proves

The agent is not special.

- It does not call `location-service`.
- It does not call `permits-service`.
- It does not call `civic-service`.
- It does not call `transit-service`.
- It does not call `census-service`.
- It does not call `policy-service`.

It calls **the graph**. Viaduct coordinates services, enforces policy,
and returns execution metadata. `scripts/verify.sh` grep-fails the
build if the agent or frontend source ever names a city service.

## Run locally

```bash
docker compose up --build -d
./scripts/verify.sh
```

| Surface              | URL                                |
| -------------------- | ---------------------------------- |
| Frontend             | http://localhost:3000              |
| Agent (`/run`)       | http://localhost:5005              |
| GraphQL              | http://localhost:8080/graphql      |
| GraphiQL             | http://localhost:8080/graphiql     |
| viaduct-server health| http://localhost:8080/health       |
| location-service     | http://localhost:5101              |
| permits-service      | http://localhost:5102              |
| civic-service        | http://localhost:5103              |
| transit-service      | http://localhost:5104              |
| policy-service       | http://localhost:5105              |
| census-service       | http://localhost:5106              |
| Postgres             | postgres://demo:demo@localhost:5432/demo |

## Manual demo

Open http://localhost:3000. The frontend ships with **demo presets**
above the task box — clicking a preset sets the task and role but does
not auto-run, so the presenter stays in control.

Recommended sequence:

1. Click preset **Block review** (Public AI Assistant, SF-1027), then
   **Run through Viaduct**. You should see:
   - an answer that mentions which fields were restricted
   - the GraphQL query the agent issued (`UrbanContext`)
   - `servicesTouched` listing six backing services as chips
   - `blockedFields` for `CityBlock.planningRisk`,
     `PermitSummary.estimatedProjectValue`,
     `PermitSummary.complianceRisk`,
     `CivicCaseSummary.escalationStatus`
   - matching `policyDecisions` rows with DENY badges and reasons
2. Click preset **Planner view** (City Admin, same task), then run again.
   The answer now shows planning risk, estimated project value,
   compliance risk, and civic escalation status. `blockedFields` reads
   **No blocked fields**. Decisions become ALLOW.
3. Optional: **Civic cases** / **Permit review** / **Ordinary block**
   presets show role and block variations.

What to say while you run it:

> The agent is just another GraphQL client. It asks the graph for
> urban context around a block. The graph calls location, permits,
> civic, transit, census, and policy services. Some fields are
> blocked. Switch the role to City Admin — same task, same query
> shape, different policy context. Now the sensitive fields are
> visible. The agent did not get a side door. It used the graph.

GraphiQL remains available at http://localhost:8080/graphiql for the
same queries.

Full on-stage runbook with fallback paths: [`docs/demo-runbook.md`](docs/demo-runbook.md).

## Demo blocks

| ID      | Name                              | Neighborhood     | Planning status   | Planning risk |
| ------- | --------------------------------- | ---------------- | ----------------- | ------------- |
| SF-1001 | Inner Sunset residential block    | Inner Sunset     | Stable            | LOW           |
| SF-1027 | 16th & Mission                    | Mission District | Elevated review   | HIGH          |
| SF-2044 | Civic Center sensitive corridor   | Civic Center     | Restricted review | RESTRICTED    |

## Actor roles

Sensitive fields call `policy-service` before returning data. A denied
field becomes `null` in `data` and is listed in
`extensions.executionMetadata.blockedFields`.

| Field                                    | Public AI Assistant | Civic Operator | Permit Analyst | City Admin |
| ---------------------------------------- | :-----------------: | :------------: | :------------: | :--------: |
| `CityBlock.planningRisk`                 | denied              | allowed        | allowed        | allowed    |
| `PermitSummary.estimatedProjectValue`    | denied              | denied         | allowed        | allowed    |
| `PermitSummary.complianceRisk`           | denied              | denied         | allowed        | allowed    |
| `CivicCaseSummary.escalationStatus`      | denied              | allowed        | denied         | allowed    |
| All non-sensitive fields                 | allowed             | allowed        | allowed        | allowed    |

## Repo layout

```
urbanmesh-demo/
├── AGENTS.md               coding-agent entry point
├── .skills/                local project skills
├── .viaduct/agents/        vendored Viaduct framework skills
├── apps/
│   ├── web/                React/Vite frontend
│   └── agent-orchestrator/ Express agent, calls Viaduct only
├── viaduct-server/         Ktor + Viaduct tenant resolvers
├── services/
│   ├── location-service/
│   ├── permits-service/
│   ├── civic-service/
│   ├── transit-service/
│   ├── census-service/
│   └── policy-service/
├── data/seed.sql
├── scripts/verify.sh       end-to-end verification
├── docker-compose.yml
├── prototype-apollo/       archived Apollo prototype (reference only)
├── PROJECT_STATUS.md
└── docs/prds/PRD_INDEX.md
```

## Verify

```bash
./scripts/verify.sh
```

Covers: compose topology, all health endpoints, Postgres seed, direct
city-service responses, policy-service, GraphQL across all four roles,
executionMetadata shape, agent `/run` for the public assistant and
city admin plus missing-block validation, frontend HTML, the two
architecture grep guardrails (agent and frontend must not name a
city service), Apollo absence, and the prototype/skills layout.

## Agent workflow

Before coding, read [`AGENTS.md`](AGENTS.md). Local project skills live
under [`.skills/`](.skills/); vendored Viaduct framework skills live
under [`.viaduct/agents/`](.viaduct/agents/). When framework and local
guidance conflict, local wins.

The Apollo prototype is archived under [`prototype-apollo/`](prototype-apollo/)
and is not part of the active demo.

## Spoken demo claim

The UI is a client. The agent is also a client.

Both go through the same Viaduct GraphQL endpoint.

The agent does not call location.
The agent does not call permits.
The agent does not call civic.
The agent does not call transit.
The agent does not call census.
The agent does not call policy.

It calls the graph.

The graph coordinates services, enforces policy, and returns evidence
about what happened.
