# urbanmesh-demo

This is the Viaduct-first demo foundation for *Turning San Francisco Into a
GraphQL Server*.

The active demo runs a Ktor-hosted Viaduct server whose tenant resolvers
call internal customer, billing, support, and usage services. The old
Apollo prototype is preserved under `prototype-apollo/` for reference only.

## Architecture

```
GraphiQL / curl
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
   ┌────────────────┐
   │ customer-svc   │
   │ billing-svc    │
   │ support-svc    │
   │ usage-svc      │
   └────────────────┘
        │
        ▼
     Postgres
```

Only the viaduct-server calls the internal services. There is no agent
or frontend in the active scope yet (PRDs C and D).

## Starter provenance

Based on [`viaduct-dev/ktor-starter`](https://github.com/viaduct-dev/ktor-starter).

Starter commit: `282855aaf736348830a43c10bc5a691c13d4ba4e`

## Repo layout

```
urbanmesh-demo/
├── viaduct-server/         active Viaduct/Ktor app
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── src/main/kotlin/com/example/viadapp/   Ktor host (routing, /health)
│   └── resolvers/                              tenant module
│       └── src/main/kotlin/com/example/viadapp/resolvers/
│           ├── customer/   Query.customer + Customer fields
│           ├── billing/    Customer.billing → BillingAccount
│           ├── support/    Customer.support → SupportSummary
│           ├── usage/      Customer.usage   → UsageSummary
│           └── internal/   shared HTTP client + service URLs
├── services/
│   ├── customer-service/   /customers/:id          (Express + pg)
│   ├── billing-service/    /billing/:customerId
│   ├── support-service/    /support/customers/:customerId/tickets
│   └── usage-service/      /usage/customers/:customerId
├── data/seed.sql           three demo customers (C-1001, C-1027, C-2044)
├── scripts/verify.sh       11-stage PRD B verification
├── docker-compose.yml
├── prototype-apollo/       archived Apollo prototype (reference only)
└── README.md
```

## Run locally

```bash
docker compose up --build -d
./scripts/verify.sh
```

| Surface              | URL                                |
| -------------------- | ---------------------------------- |
| GraphQL              | http://localhost:8080/graphql      |
| GraphiQL             | http://localhost:8080/graphiql     |
| viaduct-server health| http://localhost:8080/health       |
| customer-service     | http://localhost:5101              |
| billing-service      | http://localhost:5102              |
| support-service      | http://localhost:5103              |
| usage-service        | http://localhost:5104              |
| Postgres             | postgres://demo:demo@localhost:5432/demo |

## Demo customers

| ID      | Name             | Status     | Risk   | Billing  | Trend     |
| ------- | ---------------- | ---------- | ------ | -------- | --------- |
| C-1001  | Northstar Labs   | HEALTHY    | LOW    | current  | growing   |
| C-1027  | AcmeCloud        | RISKY      | HIGH   | overdue  | declining |
| C-2044  | Meridian Finance | RESTRICTED | MEDIUM | current  | flat      |

Unknown customer IDs resolve to `null` from `customer-service`'s 404,
and the resolver returns `null` to GraphQL.

## Sample full query

Open GraphiQL at http://localhost:8080/graphiql and run:

```graphql
query CustomerContext {
  customer(id: "C-1027") {
    id
    name
    status
    riskLevel
    billing {
      balance
      overdueInvoices
      paymentRisk
    }
    support {
      openTickets
      latestIssue
      escalationStatus
    }
    usage {
      activeUsers
      monthlyEvents
      usageTrend
    }
  }
}
```

Expected (abridged):

```json
{
  "customer": {
    "id": "C-1027",
    "name": "AcmeCloud",
    "status": "RISKY",
    "riskLevel": "HIGH",
    "billing":  { "balance": 48250.0, "overdueInvoices": 3, "paymentRisk": "HIGH" },
    "support":  { "openTickets": 3, "latestIssue": "API 5xx errors during peak hours",
                  "escalationStatus": "ESCALATED" },
    "usage":    { "activeUsers": 38, "monthlyEvents": 210000, "usageTrend": "declining" }
  }
}
```

Each subgraph is owned by a different tenant resolver but the client
sees one composed response.

## Verify

```bash
./scripts/verify.sh
```

12 stages check: compose services up, all healths, Postgres seed,
direct service responses, all GraphQL composition queries, the
Apollo-absence guardrail, the prototype-preserved guardrail, and the
agent-skills/architecture guardrail.

## Agent workflow

Before coding, read [`AGENTS.md`](AGENTS.md).

This repo uses two layers of agent guidance:

- **Viaduct framework skills** vendored under [`.viaduct/agents/`](.viaduct/agents/)
  from [`viaduct-dev/skills`](https://github.com/viaduct-dev/skills). They cover
  query resolvers, field resolvers, node types, batching, mutations,
  connections, relationships, and scopes.
- **Local project skills** under [`.skills/`](.skills/) defining this repo's
  architecture, PRD workflow, commit cadence, verification requirements,
  and demo constraints.

When framework and local guidance conflict, local wins.

The Apollo prototype is archived under [`prototype-apollo/`](prototype-apollo/)
and is not part of the active demo.

## Out of scope (deferred to later PRDs)

- the policy engine and role-based access control
- execution metadata (services touched, blocked fields, policy decisions)
- the agent orchestrator
- the frontend
