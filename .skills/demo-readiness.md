# Demo readiness

> What each phase must support for the talk. Keep code aligned with the claims.

## Talk thesis

> Turning San Francisco Into a GraphQL Server — one graph, governed
> resolvers, the AI client is just another GraphQL client.

## Per-phase demo claims

### PRD A (done)
- Ktor hosts `/graphql`.
- Viaduct executes GraphQL.
- A tenant module owns schema and resolver code.
- `customer(id: "C-1027")` returns data through the resolver pipeline.

### PRD B (done)
- One GraphQL request composes data from multiple internal services.
- The `CustomerContext` query touches customer / billing / support / usage
  through four owned resolver packages.
- The client sees one response.

### PRD C (this PRD)
- Coding agents have explicit operating rules in `.skills/` and `AGENTS.md`.
- Apollo cannot leak back into active runtime — `verify.sh` enforces it.

### PRD D (future, don't build yet)
- The graph enforces policy on sensitive fields.
- The response exposes execution metadata: services touched, blocked
  fields, policy decisions.
- "A slow query needs a path to a name." — metadata makes the graph
  explainable.

### PRD E (future, don't build yet)
- The AI client is not special. The agent calls the same `/graphql`
  endpoint as the UI.
- The agent's response includes: `answer`, `query`, `variables`, `metadata`.

## Hard rule

**Do not mention Apollo in the active demo path.** The talk says "Ktor +
Viaduct from end to end". The Apollo prototype only exists as
`prototype-apollo/` and only as proof that the constraint (agent → /graphql
only) worked.

## Demo-time sanity check

Before recording or presenting:

```bash
docker compose down -v
docker compose up --build -d
./scripts/verify.sh
```

Open http://localhost:8080/graphiql and run the `CustomerContext` query
from `README.md`. The response should compose data from all four
domains — that is the slide.
