# Demo runbook

> Pre-talk + on-stage steps. Open this in a side tab during rehearsal.

## Before the talk

```bash
docker compose up --build -d
./scripts/verify.sh
```

Open three tabs in advance:

1. http://localhost:3000 — the demo console
2. http://localhost:8080/graphiql — direct fallback
3. A terminal in the repo root — curl fallback

Run a quick warmup so JIT and caches are hot:

```bash
curl -s -X POST http://localhost:5005/run -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening around 16th & Mission","actorRole":"PUBLIC_AI_ASSISTANT"}' >/dev/null
```

## Primary demo path — frontend

The console is the primary surface. Click presets, don't type.

### Run 1 — Public AI Assistant (the policy-filtered view)

1. Click preset **Block review** (Public AI Assistant, 16th & Mission).
2. Click **Run through Viaduct**.
3. Narrate:
   > The agent asks the graph for urban context around this block. The
   > graph calls location, permits, civic, transit, census, and policy
   > services.
4. Point at:
   - the **answer**: notice the "Some sensitive planning fields were restricted" block
   - **services coordinated by the graph**: six chips
   - **blocked fields**: four fields (`CityBlock.planningRisk`,
     `PermitSummary.estimatedProjectValue`,
     `PermitSummary.complianceRisk`,
     `CivicCaseSummary.escalationStatus`)
   - **policy decisions**: four DENY rows with human reasons

### Run 2 — City Admin (the same question, different policy context)

1. Click preset **Planner view** (City Admin, same task).
2. Click **Run through Viaduct**.
3. Narrate:
   > Same task. Same query shape. Different policy context. Now the
   > sensitive planning fields are visible. The agent did not get a
   > side door — it used the graph.
4. Point at:
   - **planning risk, estimated project value, compliance risk,
     civic escalation status** in the answer
   - **blocked fields: No blocked fields**
   - **policy decisions**: ALLOW rows

### Optional run 3 — Civic Operator or Permit Analyst

If you have time and want to show role granularity:

- **Civic cases** preset → civic escalation status visible,
  permit estimated project value and compliance risk blocked
- **Permit review** preset → permit fields visible, civic escalation
  status blocked

The talk does not require these. They reinforce that policy is per
*role*, not per *request*.

## Closing line

The architecture-proof box at the top of the evidence panel and the
footer both restate the demo claim. Use it as your closing line:

> The agent only calls `/graphql`. City services are reached
> through Viaduct tenant resolvers. No direct calls to location,
> permits, civic, transit, census, or policy services.

## Fallback ladder

If something breaks, fall back one rung at a time. Do not try to fix
on stage.

### Rung 1 — frontend fails (white screen, network error)

Use curl against the agent. Open the terminal tab.

```bash
# Public AI Assistant
curl -s -X POST http://localhost:5005/run -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening around 16th & Mission","actorRole":"PUBLIC_AI_ASSISTANT"}' \
  | jq

# City Admin
curl -s -X POST http://localhost:5005/run -H 'Content-Type: application/json' \
  -d '{"task":"Explain what is happening around 16th & Mission","actorRole":"CITY_ADMIN"}' \
  | jq
```

The same envelope (answer, query, variables, data, executionMetadata)
appears in the terminal. Narrate from there.

### Rung 2 — agent fails

Use GraphiQL directly against Viaduct. Open the GraphiQL tab.

Paste:

```graphql
query UrbanContext($id: ID!, $actorRole: ActorRole!) {
  block(id: $id, actorRole: $actorRole) {
    id name neighborhood planningStatus planningRisk
    zoning  { district allowedUses heightLimit specialUseDistrict }
    permits { activePermits recentPermits estimatedProjectValue complianceRisk }
    civic   { openCases latestIssue escalationStatus }
    transit { nearbyStops accessScore ridershipTrend }
    census  { population medianIncome housingDensity }
  }
}
```

Variables:

```json
{ "id": "SF-1027", "actorRole": "PUBLIC_AI_ASSISTANT" }
```

GraphiQL shows the same `extensions.executionMetadata` block. The point
still lands: the graph enforced policy and returned evidence.

### Rung 3 — GraphiQL fails

Read the canonical Public AI Assistant and City Admin responses straight
out of the root `README.md`. They match what the live system produces.

### Rung 4 — Docker itself fails

Show the architecture diagram in `README.md` and tell the story. The
slide deck still anchors the claim.

## Known good curl commands

```bash
# Stack health (should all return ok)
for p in 8080 5101 5102 5103 5104 5105 5106 5005; do
  curl -s http://localhost:$p/health
done
curl -s -o /dev/null -w "frontend HTTP %{http_code}\n" http://localhost:3000

# Direct Viaduct as Public AI Assistant (should null sensitive fields)
curl -s -X POST http://localhost:8080/graphql -H 'Content-Type: application/json' \
  -d '{"query":"query { block(id: \"SF-1027\", actorRole: PUBLIC_AI_ASSISTANT) { id name planningRisk permits { estimatedProjectValue complianceRisk } civic { escalationStatus } } }"}' \
  | jq

# Same query as City Admin
curl -s -X POST http://localhost:8080/graphql -H 'Content-Type: application/json' \
  -d '{"query":"query { block(id: \"SF-1027\", actorRole: CITY_ADMIN) { id name planningRisk permits { estimatedProjectValue complianceRisk } civic { escalationStatus } } }"}' \
  | jq

# Re-run full verification
./scripts/verify.sh

# Tear everything down
docker compose down -v
```

## Tear-down

After the talk:

```bash
docker compose down -v
```
