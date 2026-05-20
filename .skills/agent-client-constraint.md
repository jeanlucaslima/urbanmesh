# Agent and frontend client constraints

> **Future-phase guidance.** Do not implement unless a PRD explicitly
> asks for it. This file describes the *target* behavior, not current code.

## Status

Not implemented. Active PRD chain is at PRD C (docs). The agent
orchestrator and frontend land in PRD E.

The original Apollo prototype under `prototype-apollo/` already proved
the constraint described here. PRD E will rebuild it on the Viaduct
stack — do not copy prototype code into active runtime.

## Target rules (for PRD E, not now)

### The agent

- The agent orchestrator calls **only** `http://viaduct-server:8080/graphql`.
- It must **never** call:
  - `customer-service`
  - `billing-service`
  - `support-service`
  - `usage-service`
  - `policy-service` (future)
- Its source must contain no port literals (5101–5105) or service
  hostnames for internal services. `scripts/verify.sh` will grep for this.
- The agent is a normal GraphQL client. It is not special, not privileged,
  not given a back door.

### The frontend

- Same rule: the frontend calls **only** `/graphql` (via the agent
  orchestrator or directly).
- No fetch calls to internal services.

### Agent response shape

```
{
  answer,            # user-facing string
  query,             # the GraphQL document the agent issued
  variables,         # variables used
  metadata           # mirror of executionMetadata from the response
}
```

This shape exists so the UI can show *what the agent actually asked the
graph for* — that visibility is part of the demo.

## Demo line this supports

> "The AI client is not special. It calls the same `/graphql` endpoint
> as the UI."

## Don'ts (for now)

- Don't add `agent-orchestrator/` or `apps/web/` to the active root.
  (They live in `prototype-apollo/` for now.)
- Don't add agent env vars (`AGENT_URL`, `LLM_MODE`, etc.) to the active
  docker-compose.
- Don't wire the future verify-script stages for agent/frontend until
  PRD E asks for them.
