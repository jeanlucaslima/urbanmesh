# urbanmesh-demo

This is the Viaduct-first demo foundation for *Turning San Francisco Into a
GraphQL Server*.

The active demo runs a Ktor-hosted Viaduct server whose tenant resolvers
call internal customer, billing, support, and usage services, **enforce
role-based field policy** via a separate `policy-service`, and emit
**execution metadata** in the GraphQL response `extensions`. The old
Apollo prototype is preserved under `prototype-apollo/` for reference only.

## Architecture

```
GraphiQL / curl / (future) UI / (future) AI client
                       │
                       ▼
                  /graphql  (Ktor)
                       │
                       ▼
                Viaduct runtime
                       │
                       ▼
               tenant resolvers
            ┌─────────┬─────────┬────────┬───────┐
            │customer │ billing │support │ usage │
            └────┬────┴────┬────┴───┬────┴───┬───┘
                 │         │        │        │
                 ▼         ▼        ▼        ▼
         customer-svc  billing-svc  support  usage-svc
                 │         │        │        │
                 └────┬────┴────────┴────────┘
                      ▼                ▲
                  Postgres             │
                                       │
            policy-service ◄───────────┘
            (called by resolvers
             before exposing
             sensitive fields)

GraphQL response = data + extensions.executionMetadata
```

Only the viaduct-server calls the internal services and policy-service.
There is no agent or frontend in the active scope yet (PRD D).

## Phase status

| PRD | State    | Adds                                              |
| --- | -------- | ------------------------------------------------- |
| A   | done     | Viaduct/Ktor baseline, fixture customer           |
| B   | done     | customer/billing/support/usage tenant resolvers   |
| C-skills | done | agent skills (`AGENTS.md`, `.skills/`, `.viaduct/agents/`) + Apollo containment |
| C   | done     | role-aware policy + execution metadata            |
| D   | next     | agent orchestrator + frontend (future)            |

See also `PROJECT_STATUS.md` and `docs/prds/PRD_INDEX.md`.

## Starter provenance

Based on [`viaduct-dev/ktor-starter`](https://github.com/viaduct-dev/ktor-starter).

Starter commit: `282855aaf736348830a43c10bc5a691c13d4ba4e`

## Repo layout

```
urbanmesh-demo/
├── AGENTS.md               coding-agent entry point
├── .skills/                local project skills
├── .viaduct/agents/        vendored Viaduct framework skills
├── viaduct-server/         active Viaduct/Ktor app
│   └── resolvers/          tenant module
│       └── src/main/kotlin/com/example/viadapp/resolvers/
│           ├── customer/   Query.customer + Customer fields
│           ├── billing/    Customer.billing → BillingAccount
│           ├── support/    Customer.support → SupportSummary
│           ├── usage/      Customer.usage   → UsageSummary
│           └── internal/   InternalClient, PolicyClient, RequestState
├── services/
│   ├── customer-service/   /customers/:id
│   ├── billing-service/    /billing/:customerId
│   ├── support-service/    /support/customers/:customerId/tickets
│   ├── usage-service/      /usage/customers/:customerId
│   └── policy-service/     POST /check  -> {allowed, field, actorRole, reason}
├── data/seed.sql
├── scripts/verify.sh       14-stage PRD C verification
├── docker-compose.yml
├── prototype-apollo/       archived Apollo prototype (reference only)
├── PROJECT_STATUS.md
├── docs/prds/PRD_INDEX.md
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
| policy-service       | http://localhost:5105              |
| Postgres             | postgres://demo:demo@localhost:5432/demo |

## Demo customers

| ID      | Name             | Status     | Risk   | Billing  | Trend     |
| ------- | ---------------- | ---------- | ------ | -------- | --------- |
| C-1001  | Northstar Labs   | HEALTHY    | LOW    | current  | growing   |
| C-1027  | AcmeCloud        | RISKY      | HIGH   | overdue  | declining |
| C-2044  | Meridian Finance | RESTRICTED | MEDIUM | current  | flat      |

## Actor roles

The `customer` query requires `actorRole: ActorRole!`. Available values:

```
AI_ASSISTANT    SUPPORT_AGENT    FINANCE_AGENT    ADMIN
```

Sensitive fields call `policy-service` before returning. A denied field
is set to `null` in `data` and recorded in
`extensions.executionMetadata.blockedFields`.

| Field                              | AI_ASSISTANT | SUPPORT_AGENT | FINANCE_AGENT | ADMIN |
| ---------------------------------- | :----------: | :-----------: | :-----------: | :---: |
| `Customer.riskLevel`               | denied       | allowed       | allowed       | allowed |
| `BillingAccount.balance`           | denied       | denied        | allowed       | allowed |
| `BillingAccount.paymentRisk`       | denied       | denied        | allowed       | allowed |
| `SupportSummary.escalationStatus`  | denied       | allowed       | denied        | allowed |
| All non-sensitive fields           | allowed      | allowed       | allowed       | allowed |

## Sample query — AI_ASSISTANT

```graphql
query CustomerContext {
  customer(id: "C-1027", actorRole: AI_ASSISTANT) {
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

Response (abridged):

```json
{
  "data": {
    "customer": {
      "id": "C-1027",
      "name": "AcmeCloud",
      "status": "RISKY",
      "riskLevel": null,
      "billing":  { "balance": null, "overdueInvoices": 3, "paymentRisk": null },
      "support":  { "openTickets": 3,
                    "latestIssue": "API 5xx errors during peak hours",
                    "escalationStatus": null },
      "usage":    { "activeUsers": 38, "monthlyEvents": 210000,
                    "usageTrend": "declining" }
    }
  },
  "extensions": {
    "executionMetadata": {
      "servicesTouched": [
        "billing-service", "customer-service", "policy-service",
        "support-service", "usage-service"
      ],
      "blockedFields": [
        "Customer.riskLevel",
        "BillingAccount.balance",
        "SupportSummary.escalationStatus",
        "BillingAccount.paymentRisk"
      ],
      "policyDecisions": [
        { "field": "Customer.riskLevel",
          "decision": "DENY",
          "reason": "AI assistants cannot access customer risk level.",
          "actorRole": "AI_ASSISTANT" }
        /* ...one per sensitive field... */
      ]
    }
  }
}
```

## Sample query — ADMIN

Same query, `actorRole: ADMIN`. All fields populated, `blockedFields: []`,
all `policyDecisions` are `ALLOW`.

## Verify

```bash
./scripts/verify.sh
```

14 stages check: compose services up, all healths, Postgres seed, direct
service responses (including `policy-service`), all four roles end-to-end,
executionMetadata shape, the Apollo-absence and prototype-preserved
guardrails, and the agent-skills layout.

## Agent workflow

Before coding, read [`AGENTS.md`](AGENTS.md).

This repo uses two layers of agent guidance:

- **Viaduct framework skills** vendored under [`.viaduct/agents/`](.viaduct/agents/)
  from [`viaduct-dev/skills`](https://github.com/viaduct-dev/skills).
- **Local project skills** under [`.skills/`](.skills/) defining this repo's
  architecture, PRD workflow, commit cadence, verification requirements,
  and demo constraints.

When framework and local guidance conflict, local wins.

The Apollo prototype is archived under [`prototype-apollo/`](prototype-apollo/)
and is not part of the active demo.

## Out of scope (deferred to PRD D)

- the agent orchestrator
- the frontend
- AI answer generation
- UI role selector
