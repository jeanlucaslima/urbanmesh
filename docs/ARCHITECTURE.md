# Architecture

## Overview

```
React Frontend (Vite)          Viaduct Backend (Kotlin/Ktor)       Supabase PostgreSQL
port 5173                      port 10000                          port 54321

  GraphQL queries/mutations       Supabase Kotlin Client              RLS policies
  Authorization: Bearer <jwt>     authenticatedClient per request     enforce group membership
  X-User-Id: <uuid>
```

The frontend sends GraphQL requests to the Viaduct backend, which creates an authenticated Supabase client per request using the user's JWT. Supabase row-level security policies enforce access control at the database level.

## Services

### Frontend — React/Vite

- **Local**: http://localhost:5173 (Vite dev server with HMR)
- **Production**: Static site on Render (free tier)
- **Source**: `src/` — components, pages, hooks, GraphQL client
- **Auth**: Stores Supabase JWT in memory, passes it to backend via headers
- **Config**: Fetches Supabase URL and anon key from backend at runtime (`supabaseConfig` query) so no credentials are hardcoded in the frontend build

### Backend — Viaduct GraphQL (Kotlin/Ktor)

- **Local**: http://localhost:10000/graphql (also serves GraphiQL at `/graphiql`)
- **Production**: Docker container on Render with CRaC sub-second restore
- **Source**: `backend/src/main/kotlin/com/viaduct/` (resolvers, services, plugins)
- **Schema**: `backend/src/main/viaduct/schema/*.graphqls`
- **Entry point**: `CracMain.kt` (CRaC path) or standard `embeddedServer` (non-CRaC path)
- **DI**: Koin standalone container (not a Ktor plugin — survives checkpoint/restore)

### Database — Supabase PostgreSQL

- **Local**: Runs in Podman containers via Supabase CLI
  - API: http://127.0.0.1:54321
  - PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  - Studio: http://127.0.0.1:54323
- **Production**: Hosted Supabase project (supabase.com)
- **Migrations**: `schema/migrations/*.sql` — applied automatically on deploy and by `supabase start` locally (via symlink at `supabase/migrations`)
- **Auth**: Supabase Auth with email provider. JWT expiry: 3600s. Email confirmation disabled for local dev.

## Tool Management — mise

[mise](https://mise.jdx.dev/) manages all tools and orchestrates development. Running `mise install` installs:

- **Java JDK 21** — Viaduct/Kotlin backend
- **Podman** — Container runtime for local Supabase
- **Supabase CLI** — Local Supabase management

Environment variables are set automatically in `mise.toml` — no manual exports needed.

Key tasks:

| Task | What it does |
|------|-------------|
| `mise run dev` | Start everything (Podman + Supabase + backend + frontend) |
| `mise run deps-start` | Start Podman + Supabase only |
| `mise run backend` | Build and start backend (starts deps first) |
| `mise run frontend` | Start Vite dev server |
| `mise run test` | Run backend tests (starts Supabase automatically) |
| `mise run status` | Show Podman and Supabase status |
| `mise run stop` | Stop Supabase and Podman |
| `mise run diagnose-podman` | Debug Podman socket issues |

## CRaC (Docker Production Startup)

The production Docker image (`backend/Dockerfile`) uses [CRaC](https://openjdk.org/projects/crac/) with Azul Zulu Warp to snapshot the JVM heap after full initialization. At runtime, the container restores from the snapshot in ~368ms instead of doing a cold JVM start. This is transparent — no application code changes needed for normal development.

## Database Migrations

Migrations live in `schema/migrations/` and are applied in two ways:

- **Locally**: `supabase start` applies them automatically (via symlink `supabase/migrations` -> `../schema/migrations`)
- **Production**: The Docker build's `migrations` stage runs them using `SUPABASE_SERVICE_ROLE_KEY` (passed as a build arg, never baked into the final image)

To reset locally: `supabase db reset`

## Podman

Supabase CLI uses Docker-compatible containers. This project uses Podman instead of Docker. The `DOCKER_HOST` environment variable is auto-detected from the Podman machine socket via `.mise/scripts/get-podman-socket.sh`.

### Troubleshooting

**Podman socket not found:**

```bash
mise run diagnose-podman    # Show socket paths and connectivity
podman machine stop && podman machine start   # Restart
podman machine init && podman machine start   # First time setup
```

**Backend won't start:**

1. `mise install` — ensure Java 21 and tools are installed
2. `supabase status` — ensure Supabase is running
3. Check `java -version` shows 21

**Database needs reset:**

```bash
supabase db reset    # Reapply all migrations from scratch
```

## Deployment — Render.com

Defined in `render.yaml`. Two services:

- **urbanmesh-backend** — Docker web service (CRaC restore, port 10000)
- **urbanmesh-frontend** — Static site (Vite build output from `./dist`)

`ALLOWED_ORIGINS` and `VITE_GRAPHQL_ENDPOINT` are auto-configured via Render service linking. Only three credentials are needed: `SUPABASE_PROJECT_ID`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

See [`SETUP_GUIDE.md`](SETUP_GUIDE.md) for step-by-step deployment instructions.
