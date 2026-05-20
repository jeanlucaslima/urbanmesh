# Docker Compose topology

> Active services by phase. Don't add services before the PRD asks for them.

## Phase topology

| Phase | Active services in root `docker-compose.yml`                                                       |
| ----- | -------------------------------------------------------------------------------------------------- |
| PRD A | `viaduct-server`                                                                                   |
| PRD B | `postgres`, `customer-service`, `billing-service`, `support-service`, `usage-service`, `viaduct-server` |
| PRD C | (same as B — this PRD is docs/guardrails only)                                                     |
| PRD D | add `policy-service`                                                                               |
| PRD E | add `agent-orchestrator`, `frontend`                                                               |

Current active topology: **PRD B**.

## Rules

- **Don't** add services before the PRD requests them.
- **Don't** restore `graphql-gateway`. It is gone.
- **Don't** add Apollo (no `@apollo/server`, no `ApolloServer`).
- **Don't** wire frontends or agents at internal services. They call `/graphql`.
- **Do** keep service names stable across PRDs so verify.sh stays predictable.

## Port assignments (do not change)

| Service             | Port |
| ------------------- | ---- |
| `viaduct-server`    | 8080 |
| `customer-service`  | 5101 |
| `billing-service`   | 5102 |
| `support-service`   | 5103 |
| `usage-service`     | 5104 |
| (future) `policy-service` | 5105 |
| (future) `agent-orchestrator` | 4000 |
| (future) `frontend` | 3000 |
| `postgres`          | 5432 |

If you need to change a port, update `scripts/verify.sh` and the relevant
skill at the same time, and call it out in the commit message.
