# Demo runbook

> Pre-talk + on-stage steps. Open this in a side tab during rehearsal.

## Before the talk

```bash
docker compose up --build -d
./scripts/verify.sh    # must pass 19/19
```

Open three tabs in advance:

1. http://localhost:3000 — the demo console
2. http://localhost:8080/graphiql — direct fallback
3. A terminal in the repo root — curl fallback

Run a quick warmup so JIT and caches are hot:

```bash
curl -s -X POST http://localhost:5005/run -H 'Content-Type: application/json' \
  -d '{"task":"Explain customer C-1027 risk","actorRole":"AI_ASSISTANT"}' >/dev/null
```

## Primary demo path — frontend

The console is the primary surface. Click presets, don't type.

### Run 1 — AI_ASSISTANT (the policy-filtered view)

1. Click preset **Risk review** (AI_ASSISTANT, C-1027).
2. Click **Run through Viaduct**.
3. Narrate:
   > The agent asks the graph for customer context. The graph calls
   > customer, billing, support, usage, and policy services.
4. Point at:
   - the **answer**: notice the "Some sensitive fields were restricted" block
   - **services coordinated by the graph**: 5 chips
   - **blocked fields**: four fields (`Customer.riskLevel`,
     `BillingAccount.balance`, `BillingAccount.paymentRisk`,
     `SupportSummary.escalationStatus`)
   - **policy decisions**: four DENY rows with human reasons

### Run 2 — ADMIN (the same question, different policy context)

1. Click preset **Admin view** (ADMIN, same task).
2. Click **Run through Viaduct**.
3. Narrate:
   > Same task. Same query shape. Different policy context. Now the
   > sensitive fields are visible. The agent did not get a side door —
   > it used the graph.
4. Point at:
   - **risk level, balance, payment risk, escalation status** in the
     answer
   - **blocked fields: No blocked fields**
   - **policy decisions**: four ALLOW rows

### Optional run 3 — SUPPORT_AGENT or FINANCE_AGENT

If you have time and want to show role granularity:

- **Support situation** preset → support escalation visible,
  billing balance/payment risk blocked
- **Billing risk** preset → billing visible, support escalation blocked

The talk does not require these. They reinforce that policy is per
*role*, not per *request*.

## Closing line

The architecture-proof box at the top of the evidence panel and the
footer both restate the demo claim. Use it as your closing line:

> The agent only calls `/graphql`. Internal services are reached
> through Viaduct tenant resolvers. No direct calls to customer,
> billing, support, usage, or policy services.

## Fallback ladder

If something breaks, fall back one rung at a time. Do not try to fix
on stage.

### Rung 1 — frontend fails (white screen, network error)

Use curl against the agent. Open the terminal tab.

```bash
# AI_ASSISTANT
curl -s -X POST http://localhost:5005/run -H 'Content-Type: application/json' \
  -d '{"task":"Explain customer C-1027 risk","actorRole":"AI_ASSISTANT"}' \
  | jq

# ADMIN
curl -s -X POST http://localhost:5005/run -H 'Content-Type: application/json' \
  -d '{"task":"Explain customer C-1027 risk","actorRole":"ADMIN"}' \
  | jq
```

The same envelope (answer, query, variables, data, executionMetadata)
appears in the terminal. Narrate from there.

### Rung 2 — agent fails

Use GraphiQL directly against Viaduct. Open the GraphiQL tab.

Paste:

```graphql
query CustomerContext($id: ID!, $actorRole: ActorRole!) {
  customer(id: $id, actorRole: $actorRole) {
    id name status riskLevel
    billing { balance overdueInvoices paymentRisk }
    support { openTickets latestIssue escalationStatus }
    usage   { activeUsers monthlyEvents usageTrend }
  }
}
```

Variables:

```json
{ "id": "C-1027", "actorRole": "AI_ASSISTANT" }
```

GraphiQL shows the same `extensions.executionMetadata` block. The point
still lands: the graph enforced policy and returned evidence.

### Rung 3 — GraphiQL fails

Read the canonical AI_ASSISTANT and ADMIN responses straight out of
the root `README.md` ("Sample query — AI_ASSISTANT" section). They
match what the live system produces.

### Rung 4 — Docker itself fails

Show the architecture diagram in `README.md` and tell the story. The
slide deck still anchors the claim.

## Known good curl commands

```bash
# Stack health (should all return ok)
for p in 8080 5101 5102 5103 5104 5105 5005; do
  curl -s http://localhost:$p/health
done
curl -s -o /dev/null -w "frontend HTTP %{http_code}\n" http://localhost:3000

# Direct Viaduct as AI_ASSISTANT (should null sensitive fields)
curl -s -X POST http://localhost:8080/graphql -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\", actorRole: AI_ASSISTANT) { id name riskLevel billing { balance paymentRisk } support { escalationStatus } } }"}' \
  | jq

# Same query as ADMIN
curl -s -X POST http://localhost:8080/graphql -H 'Content-Type: application/json' \
  -d '{"query":"query { customer(id: \"C-1027\", actorRole: ADMIN) { id name riskLevel billing { balance paymentRisk } support { escalationStatus } } }"}' \
  | jq

# Re-run full verification (19 stages)
./scripts/verify.sh

# Tear everything down
docker compose down -v
```

## Tear-down

After the talk:

```bash
docker compose down -v
```
