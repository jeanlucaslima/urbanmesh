# Project architecture

> The active implementation is Viaduct/Ktor-first. The Apollo prototype is
> archived. Do not let it leak back.

## Active architecture

```
GraphiQL / curl / future UI / future AI client
                       │
                       ▼
                  /graphql  (Ktor)
                       │
                       ▼
                Viaduct runtime
                       │
                       ▼
               tenant resolvers
            (customer, billing,
             support, usage)
                       │
                       ▼
              internal services
              (Express + pg)
                       │
                       ▼
                    Postgres
```

The active GraphQL server is **`viaduct-server`** (Ktor-hosted). It is the
only thing clients should call.

## Archived prototype

`prototype-apollo/` contains the original Apollo + Express prototype that
proved the architectural constraint:

```
agent calls /graphql only — never internal services directly
```

That constraint is the only thing the Viaduct demo inherits from the
prototype. The prototype's gateway, resolvers, internal services,
docker-compose, scripts, and README are reference-only.

## Hard rules

- Do **not** import or copy code from `prototype-apollo/` into active runtime.
- Do **not** add Apollo, Apollo Server, `expressMiddleware`, or
  `graphql-gateway` to active code, config, docs, or scripts.
- Do **not** point clients at internal services. Clients call `/graphql`.
- `scripts/verify.sh` enforces these rules — keep them passing.

## Current phase state

- **PRD A complete** — Viaduct/Ktor baseline, `greeting`, `customer(id:)`
  fixture-then-service, Apollo prototype archived.
- **PRD B complete** — internal-service integration via tenant resolvers
  (customer / billing / support / usage), Postgres seed, full
  customer-context query.
- **PRD C (this PRD)** — agent skills + Apollo containment guardrails.
- **PRD D (future)** — policy enforcement and execution metadata.
- **PRD E (future)** — agent orchestrator and frontend.

When in doubt about what is active, run `./scripts/verify.sh` and read the
top of `README.md`.
