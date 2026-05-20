# urbanmesh-demo

This is the full demo for *Turning San Francisco Into a GraphQL Server*.

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
       (customer · billing · support · usage)
                    │
                    ▼
        internal services + policy-service
                    │
                    ▼
                 Postgres
```

The active GraphQL server is `viaduct-server`. Both the UI client and the
agent client go through the same `/graphql` endpoint. The agent does not
call customer, billing, support, usage, or policy services directly.

The old Apollo prototype is preserved under `prototype-apollo/` for
reference only.

## What PRD D proves

The agent is not special.

- It does not call `customer-service`.
- It does not call `billing-service`.
- It does not call `support-service`.
- It does not call `usage-service`.
- It does not call `policy-service`.

It calls **the graph**. Viaduct coordinates services, enforces policy,
and returns execution metadata. `scripts/verify.sh` grep-fails the
build if the agent or frontend source ever names an internal service.

## Phase status

| PRD | State    | Adds                                              |
| --- | -------- | ------------------------------------------------- |
| A   | done     | Viaduct/Ktor baseline, fixture customer           |
| B   | done     | customer/billing/support/usage tenant resolvers   |
| C-skills | done | agent skills + Apollo containment              |
| C   | done     | role-aware policy + execution metadata            |
| D   | done     | agent orchestrator + frontend                     |

See `PROJECT_STATUS.md` and `docs/prds/PRD_INDEX.md`.

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
| customer-service     | http://localhost:5101              |
| billing-service      | http://localhost:5102              |
| support-service      | http://localhost:5103              |
| usage-service        | http://localhost:5104              |
| policy-service       | http://localhost:5105              |
| Postgres             | postgres://demo:demo@localhost:5432/demo |

## Manual demo

1. Open http://localhost:3000.
2. Default task is **"Explain customer C-1027 risk"**, default role
   **AI_ASSISTANT**.
3. Click **Run through Viaduct**. You should see:
   - an answer that mentions which fields were restricted
   - the GraphQL query the agent issued
   - `servicesTouched` listing five backing services
   - `blockedFields` for `Customer.riskLevel`,
     `BillingAccount.balance`, `BillingAccount.paymentRisk`,
     `SupportSummary.escalationStatus`
   - matching `policyDecisions` rows with DENY reasons
4. Switch the role to **ADMIN** and click run again. The same answer
   panel now shows risk level, balance, payment risk, and escalation
   status. `blockedFields` is empty. `policyDecisions` shows ALLOW
   reasons.

GraphiQL remains available at http://localhost:8080/graphiql for the
same queries.

## Demo customers

| ID      | Name             | Status     | Risk   | Billing  | Trend     |
| ------- | ---------------- | ---------- | ------ | -------- | --------- |
| C-1001  | Northstar Labs   | HEALTHY    | LOW    | current  | growing   |
| C-1027  | AcmeCloud        | RISKY      | HIGH   | overdue  | declining |
| C-2044  | Meridian Finance | RESTRICTED | MEDIUM | current  | flat      |

## Actor roles

Sensitive fields call `policy-service` before returning data. A denied
field becomes `null` in `data` and is listed in
`extensions.executionMetadata.blockedFields`.

| Field                              | AI_ASSISTANT | SUPPORT_AGENT | FINANCE_AGENT | ADMIN |
| ---------------------------------- | :----------: | :-----------: | :-----------: | :---: |
| `Customer.riskLevel`               | denied       | allowed       | allowed       | allowed |
| `BillingAccount.balance`           | denied       | denied        | allowed       | allowed |
| `BillingAccount.paymentRisk`       | denied       | denied        | allowed       | allowed |
| `SupportSummary.escalationStatus`  | denied       | allowed       | denied        | allowed |
| All non-sensitive fields           | allowed      | allowed       | allowed       | allowed |

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
│   ├── customer-service/
│   ├── billing-service/
│   ├── support-service/
│   ├── usage-service/
│   └── policy-service/
├── data/seed.sql
├── scripts/verify.sh       19-stage PRD D verification
├── docker-compose.yml
├── prototype-apollo/       archived Apollo prototype (reference only)
├── PROJECT_STATUS.md
└── docs/prds/PRD_INDEX.md
```

## Verify

```bash
./scripts/verify.sh
```

19 stages cover: compose topology, all health endpoints, Postgres seed,
direct service responses, policy-service, GraphQL across all four roles,
executionMetadata shape, agent `/run` for AI/ADMIN/missing-customer,
frontend HTML, the two architecture grep guardrails (agent and frontend
must not name internal services), Apollo absence, and the
prototype/skills layout.

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

The agent does not call billing.
The agent does not call support.
The agent does not call usage.
The agent does not call policy.

It calls the graph.

The graph coordinates services, enforces policy, and returns evidence
about what happened.
