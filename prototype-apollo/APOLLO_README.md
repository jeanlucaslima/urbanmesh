# Agent-Safe API Access Demo

## Thesis

Agents and applications should not call internal systems directly. They should go through a governed, typed, permission-aware API layer.

## Architecture

```
Browser
  -> React frontend (apps/web)
  -> Agent orchestrator (apps/agent-orchestrator)
  -> GraphQL gateway (services/graphql-gateway)
       -> customer-service
       -> billing-service
       -> support-service
       -> usage-service
       -> policy-service
  -> Postgres (shared demo DB)
```

The agent orchestrator may only call the GraphQL gateway. The gateway composes
data from internal services and asks the policy service before exposing
sensitive fields.

## Run locally

```bash
docker compose up --build
```

| Surface              | URL                                |
| -------------------- | ---------------------------------- |
| Frontend             | http://localhost:3000              |
| Agent orchestrator   | http://localhost:4000              |
| GraphQL gateway      | http://localhost:5000/graphql      |
| Customer service     | http://localhost:5101              |
| Billing service      | http://localhost:5102              |
| Support service      | http://localhost:5103              |
| Usage service        | http://localhost:5104              |
| Policy service       | http://localhost:5105              |
| Postgres             | postgres://demo:demo@localhost:5432/demo |

## Demo task

```
Summarize customer C-1027 and recommend the next support action.
```

Default actor role is `AI_ASSISTANT`. Try toggling to `ADMIN` to see sensitive
billing fields appear.

## What to notice

- The agent only calls GraphQL.
- GraphQL composes data from multiple internal services.
- Policy blocks sensitive fields.
- The final answer remains useful.

## Verify the demo

Start the stack:

```bash
docker compose up --build -d
```

Run verification:

```bash
./scripts/verify.sh
```

Expected output:

```text
==> Checking Docker Compose services
==> Checking health endpoints
==> Checking Postgres seed data
==> Checking internal services
==> Checking policy service
==> Checking GraphQL gateway for AI_ASSISTANT
==> Checking GraphQL gateway for ADMIN
==> Checking agent orchestrator
==> Checking architecture constraint
==> All checks passed
```

The verification script confirms:

- all containers are running;
- services respond to health checks;
- Postgres is seeded;
- internal services return data;
- policy rules work;
- GraphQL composes data and blocks sensitive fields;
- the agent orchestrator calls only GraphQL;
- the demo is ready to run locally.

## Tear down

```bash
docker compose down -v
```

## Layout

```
apps/
  web/                  React + Vite frontend
  agent-orchestrator/   POST /run, calls GraphQL only
services/
  graphql-gateway/      Apollo, composes & enforces policy
  customer-service/     /customers/:id
  billing-service/      /billing/:customerId
  support-service/      /support/customers/:customerId/tickets
  usage-service/        /usage/customers/:customerId
  policy-service/       POST /check
data/
  seed.sql              Demo customers + tables
scripts/
  verify.sh             End-to-end verification
docker-compose.yml
```
