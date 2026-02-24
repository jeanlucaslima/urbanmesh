# AGENTS.md

This file provides guidance to AI coding assistants working in this repository.

## Project Overview

Three-tier Viaduct template: **React/Vite** frontend, **Viaduct GraphQL** backend (Kotlin/Ktor), **Supabase PostgreSQL** database.

## Detailed Documentation

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Services, ports, mise, CRaC warp, Podman, migrations, troubleshooting |
| [`docs/IMPLEMENTING_A_RESOURCE.md`](docs/IMPLEMENTING_A_RESOURCE.md) | Complete walkthrough of adding a new resource across all layers |
| [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) | First-time setup with Supabase and Render |
| [`backend/src/main/kotlin/com/viaduct/examples/`](backend/src/main/kotlin/com/viaduct/examples/) | Example resolver implementations (use as templates) |

## Development Commands

### mise (Recommended)

```bash
mise install        # Install all tools (Java 21, Podman, Supabase CLI, Node)
mise run dev        # Start full environment (Podman + Supabase + backend + frontend)
mise run deps-start # Start dependencies only (Podman + Supabase)
mise run backend    # Start backend only (requires deps-start first)
mise run frontend   # Start frontend only
mise run status     # Check service status
mise run stop       # Stop all services
mise run test       # Run backend tests (starts Supabase containers automatically)
```

### Direct commands

```bash
# Frontend
npm install && npm run dev    # Dev server on port 5173
npm run build                 # Production build
npm run lint                  # ESLint

# Backend
cd backend
./gradlew run                 # Server on port 10000
./gradlew test                # Tests (auto-starts Supabase)
./gradlew build               # Full build

# Database
supabase start                # Start local Supabase
supabase db reset             # Reset to migrations
```

## Authentication

Frontend sends `Authorization: Bearer <token>` and `X-User-Id: <id>` headers. Public operations (no auth required): `supabaseConfig` query, `signIn`/`signUp`/`refreshToken` mutations.

## Deployment

Render.com via `render.yaml` blueprint. See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for credentials and setup. Migrations run automatically on every deploy.
