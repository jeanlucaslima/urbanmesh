# urbanmesh-demo

This is the Viaduct-first demo foundation for *Turning San Francisco Into a
GraphQL Server*.

The active GraphQL server is a Ktor-hosted Viaduct service.
The old Apollo prototype is preserved under `prototype-apollo/` for reference only.

## Starter provenance

Based on [`viaduct-dev/ktor-starter`](https://github.com/viaduct-dev/ktor-starter).

Starter commit: `282855aaf736348830a43c10bc5a691c13d4ba4e`

## Repo layout

```
urbanmesh-demo/
├── viaduct-server/         active Viaduct/Ktor app
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── src/main/kotlin/com/example/viadapp/   Ktor host
│   └── resolvers/                              tenant module (schema + resolvers)
├── scripts/
│   └── verify.sh           verification for PRD A baseline
├── docker-compose.yml      runs viaduct-server
├── prototype-apollo/       archived Apollo prototype (reference only)
└── README.md
```

## Run locally

With Docker:

```bash
docker compose up --build -d
```

Or with Gradle directly (requires JDK 21):

```bash
cd viaduct-server
./gradlew run
```

## Manual checks

Open GraphiQL:

```
http://localhost:8080/graphiql
```

Example query:

```graphql
query {
  greeting
  customer(id: "C-1027") {
    id
    name
    status
  }
}
```

Health endpoint:

```bash
curl http://localhost:8080/health
# {"ok":true,"service":"viaduct-server"}
```

## Customer fixtures

PRD A is fixture-backed; no internal service calls yet.

| ID      | Name                       | Status     |
| ------- | -------------------------- | ---------- |
| C-1001  | Northstar Labs             | HEALTHY    |
| C-1027  | Mission Market Collective  | RISKY      |
| C-2044  | Meridian Finance           | RESTRICTED |

Unknown IDs return `null`.

## Verify

```bash
docker compose up --build -d
./scripts/verify.sh
```

The verify script checks:

- viaduct-server container is up
- `/health` returns `{ok:true, service:"viaduct-server"}`
- `/graphql` greeting query returns `Hello, World!`
- `/graphql` customer(id: "C-1027") returns the RISKY fixture
- `/graphiql` returns HTML
- root active runtime contains no Apollo references
- prototype-apollo/ is excluded from verification

## Scope of PRD A (and what is intentionally missing)

Not in this PRD: internal-service integration (customer / billing / support
/ usage), the policy engine, the agent orchestrator, the frontend, execution
metadata (services touched, blocked fields, policy decisions), role-based
access, and Postgres seed data. Those land in PRDs B, C, and D.

## Prototype

See `prototype-apollo/README.md`. The prototype is not part of the active demo.
